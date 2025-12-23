import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import Card from "../common/Card";
import SelectableCard from "../common/SelectableCard";
import PlayerSeedingModal from "./PlayerSeedingModal";
import styles from "./CategoryPublisher.module.scss";
import type { Category, FormatTemplate } from "../../types";
import {
  generateKnockoutOnly,
  generateGroupThenKnockout,
  generateRoundRobin,
} from "../../services/bracketService";
import {
  getFormatsByParticipantCount,
  calculateFormatTotalMatches,
} from "../../services/formatService";

interface CategoryPublisherProps {
  tournamentId: string;
  category: Category;
  participants: Array<{ id: string; name: string }>;
  courts: Array<{ id: string; name: string }>;
  onPublishSuccess: () => void;
}

const CategoryPublisher: React.FC<CategoryPublisherProps> = ({
  tournamentId,
  category,
  participants,
  courts,
  onPublishSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recommendedFormats, setRecommendedFormats] = useState<
    FormatTemplate[]
  >([]);
  const [selectedFormat, setSelectedFormat] = useState<FormatTemplate | null>(
    null
  );
  const [isSeedingModalOpen, setIsSeedingModalOpen] = useState(false);
  const [adjustedParticipants, setAdjustedParticipants] =
    useState(participants);

  useEffect(() => {
    setAdjustedParticipants(participants);
  }, [participants]);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const formats = await getFormatsByParticipantCount(participants.length);
        setRecommendedFormats(formats);

        // 優先使用分類已設定的模板，沒有才用推薦的第一個
        if (category.selectedFormatId) {
          const { getFormat } = await import("../../services/formatService");
          try {
            const existingFormat = await getFormat(category.selectedFormatId);
            if (existingFormat) {
              console.log(" 載入分類已設定的模板:", existingFormat.name);
              setSelectedFormat(existingFormat);
            } else if (formats.length > 0) {
              setSelectedFormat(formats[0]);
            }
          } catch (error) {
            console.warn("載入已設定模板失敗，使用推薦模板");
            if (formats.length > 0) {
              setSelectedFormat(formats[0]);
            }
          }
        } else if (formats.length > 0) {
          // 沒有設定模板，使用推薦的第一個
          setSelectedFormat(formats[0]);
        }
      } catch (error) {
        console.error("Failed to load format recommendations:", error);
      }
    };

    loadRecommendations();
  }, [participants.length, category.selectedFormatId]);

  const handleSaveSeedingAdjustment = (
    reorderedParticipants: Array<{ id: string; name: string }>
  ) => {
    setAdjustedParticipants(reorderedParticipants);
    console.log(" [CategoryPublisher] 已儲存種子位調整");
  };

  const handlePublish = async () => {
    if (participants.length < 2) {
      setError("至少需要 2 位參賽者才能發布賽程");
      return;
    }

    if (courts.length === 0) {
      setError("請先在「場地管理」Tab 新增至少一個場地");
      return;
    }

    if (!selectedFormat) {
      setError("請選擇賽制模板");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🎯 [CategoryPublisher] 開始發布賽程:", {
        formatId: selectedFormat.id,
        formatName: selectedFormat.name,
        participantsCount: adjustedParticipants.length,
        isAdjusted: adjustedParticipants !== participants,
      });

      // 根據模板類型生成 Match（使用調整後的參賽者順序）
      const hasGroupStage = selectedFormat.stages.some(
        (s) => s.type === "group_stage"
      );
      const hasRoundRobin = selectedFormat.stages.some(
        (s) => s.type === "round_robin"
      );

      if (hasRoundRobin) {
        // 循環賽
        console.log("🔄 生成循環賽");
        await generateRoundRobin(
          tournamentId,
          category.id,
          adjustedParticipants,
          category.ruleConfig || {
            matchType: "point_based",
            maxSets: 1,
            pointsPerSet: category.pointsPerSet || 21,
            setsToWin: 1,
            winByTwo: false,
          },
          courts
        );
      } else if (hasGroupStage) {
        // 小組賽 + 淘汰賽
        console.log("🏆 生成小組賽+淘汰賽");

        const groupStage = selectedFormat.stages.find(
          (s) => s.type === "group_stage"
        );
        const knockoutStage = selectedFormat.stages.find(
          (s) => s.type === "knockout"
        );

        if (!groupStage || !knockoutStage) {
          throw new Error("模板配置錯誤");
        }

        // 計算分組
        const totalGroups = groupStage.count || 4;
        const advancePerGroup = groupStage.advance || 2;
        const knockoutSize = knockoutStage.size || 8;

        // 計算每組人數
        const teamsPerGroup = Math.floor(
          adjustedParticipants.length / totalGroups
        );
        const remainder = adjustedParticipants.length % totalGroups;
        const teamsPerGroupArray = Array(totalGroups)
          .fill(teamsPerGroup)
          .map((count, i) => (i < remainder ? count + 1 : count));

        await generateGroupThenKnockout(
          tournamentId,
          category.id,
          adjustedParticipants,
          {
            totalGroups,
            teamsPerGroup: teamsPerGroupArray,
            advancePerGroup,
            bestThirdPlaces: 0,
          },
          knockoutSize,
          category.enableThirdPlaceMatch,
          courts
        );
      } else {
        // 純淘汰賽
        console.log("⚡ 生成純淘汰賽");

        // 檢查是否需要自動計算規模（size: 0）
        const knockoutStage = selectedFormat.stages.find(
          (s) => s.type === "knockout"
        );
        if (knockoutStage && knockoutStage.size === 0) {
          // 通用模板：自動計算最接近的 2^n
          const autoSize = Math.pow(
            2,
            Math.ceil(Math.log2(adjustedParticipants.length))
          );
          console.log(
            `📐 自動計算淘汰賽規模: ${adjustedParticipants.length}人 → ${autoSize}強`
          );
        }

        await generateKnockoutOnly(
          tournamentId,
          category.id,
          adjustedParticipants,
          category.enableThirdPlaceMatch,
          courts
        );
      }

      // 發布成功後，將選擇的模板ID保存到分類
      if (selectedFormat) {
        const { updateCategory } = await import(
          "../../services/categoryService"
        );
        await updateCategory(tournamentId, category.id, {
          selectedFormatId: selectedFormat.id,
        });
        console.log(` 已保存模板選擇: ${selectedFormat.name}`);
      }

      // 發布成功後，自動檢查並轉換賽事狀態為 ONGOING
      const { checkAndTransitionToOngoing, getTournament } = await import(
        "../../services/tournamentService"
      );
      await checkAndTransitionToOngoing(tournamentId);

      // 發送通知
      try {
        const { getConfirmedPlayers } = await import(
          "../../services/registrationService"
        );
        const { createNotification } = await import(
          "../../services/notificationService"
        );
        const tournament = await getTournament(tournamentId);
        const confirmedPlayers = await getConfirmedPlayers(tournamentId);

        const playersWithUid = confirmedPlayers.filter((player) => player.uid);
        const notificationPromises = playersWithUid.map((player) =>
          createNotification({
            userId: player.uid!,
            type: "SCHEDULE_PUBLISHED",
            title: "賽程已發布",
            message: `【${tournament?.name}】的賽程已發布，快來查看你的比賽時間！`,
            isRead: false,
            relatedData: { tournamentId },
            actions: [
              {
                label: "查看賽程",
                type: "primary",
                path: `/events/${tournamentId}`,
              },
            ],
          })
        );

        await Promise.all(notificationPromises);
        console.log(
          ` [CategoryPublisher] 成功發送 ${notificationPromises.length} 個通知`
        );
      } catch (error) {
        console.error("[CategoryPublisher] 發送通知失敗:", error);
      }

      onPublishSuccess();
    } catch (err: any) {
      setError(err.message || "發布失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.publisher}>
      <Card className={styles.infoCard}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>參賽者</span>
            <span className={styles.statValue}>{participants.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>場地</span>
            <span className={styles.statValue}>{courts.length}</span>
          </div>
        </div>
      </Card>

      {/* 模板推薦 */}
      {recommendedFormats.length > 0 ? (
        <Card className={styles.formatSelectionCard}>
          <h4 className={styles.subtitle}>選擇賽制</h4>
          <p className={styles.infoText}>
            根據報名人數（{participants.length}{" "}
            {category.matchType === "singles" ? "人" : "組"}
            ），為您推薦以下賽制：
          </p>

          <div className={styles.formatOptions}>
            {recommendedFormats.map((format) => (
              <div
                key={format.id}
                className={`${styles.formatOption} ${
                  selectedFormat?.id === format.id ? styles.selected : ""
                }`}
                onClick={() => setSelectedFormat(format)}
              >
                <div className={styles.formatHeader}>
                  <strong>{format.name}</strong>
                  <span className={styles.formatRange}>
                    {format.minParticipants}-{format.maxParticipants}{" "}
                    {category.matchType === "singles" ? "人" : "組"}
                  </span>
                </div>
                {format.description && (
                  <p className={styles.formatDesc}>{format.description}</p>
                )}
                <div className={styles.formatStages}>
                  {format.stages.map((stage, i) => (
                    <span key={i} className={styles.stageBadge}>
                      {stage.name}
                    </span>
                  ))}
                </div>
                <div className={styles.formatStats}>
                  <span>
                    預估場次：
                    {calculateFormatTotalMatches(
                      format,
                      participants.length
                    )}{" "}
                    場
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className={styles.warningText}>
            沒有找到適合的賽制模板，系統將使用智能算法生成賽程。
          </p>
        </Card>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <Button
          variant="outline"
          onClick={() => setIsSeedingModalOpen(true)}
          fullWidth
          disabled={!selectedFormat || participants.length < 2}
        >
          ⚙️ 選手配對調整
        </Button>
        <Button
          variant="primary"
          onClick={handlePublish}
          loading={loading}
          fullWidth
          disabled={!selectedFormat && recommendedFormats.length > 0}
        >
          發布賽程
        </Button>
      </div>

      {/* 選手配對調整彈窗 */}
      <PlayerSeedingModal
        isOpen={isSeedingModalOpen}
        onClose={() => setIsSeedingModalOpen(false)}
        participants={participants}
        selectedFormat={selectedFormat}
        onSave={handleSaveSeedingAdjustment}
        matchType={category.matchType}
      />
    </div>
  );
};

export default CategoryPublisher;
