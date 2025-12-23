import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import Card from "../common/Card";
import SelectableCard from "../common/SelectableCard";
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
  const [recommendedFormats, setRecommendedFormats] = useState<FormatTemplate[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<FormatTemplate | null>(null);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const formats = await getFormatsByParticipantCount(participants.length);
        setRecommendedFormats(formats);
        
        // 自動選擇第一個推薦模板
        if (formats.length > 0) {
          setSelectedFormat(formats[0]);
        }
      } catch (error) {
        console.error("Failed to load format recommendations:", error);
      }
    };

    loadRecommendations();
  }, [participants.length]);

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
        participantsCount: participants.length,
      });

      // 根據模板類型生成 Match
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
          participants,
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
        const teamsPerGroup = Math.floor(participants.length / totalGroups);
        const remainder = participants.length % totalGroups;
        const teamsPerGroupArray = Array(totalGroups)
          .fill(teamsPerGroup)
          .map((count, i) => (i < remainder ? count + 1 : count));

        await generateGroupThenKnockout(
          tournamentId,
          category.id,
          participants,
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
        await generateKnockoutOnly(
          tournamentId,
          category.id,
          participants,
          category.enableThirdPlaceMatch,
          courts
        );
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
          `✅ [CategoryPublisher] 成功發送 ${notificationPromises.length} 個通知`
        );
      } catch (error) {
        console.error("❌ [CategoryPublisher] 發送通知失敗:", error);
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
          <h4 className={styles.subtitle}>📋 選擇賽制模板</h4>
          <p className={styles.infoText}>
            根據報名人數（{participants.length} {category.matchType === "singles" ? "人" : "組"}），為您推薦以下賽制：
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
                    {calculateFormatTotalMatches(format, participants.length)} 場
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
          variant="primary"
          onClick={handlePublish}
          loading={loading}
          fullWidth
          disabled={!selectedFormat && recommendedFormats.length > 0}
        >
          發布賽程
        </Button>
      </div>
    </div>
  );
};

export default CategoryPublisher;

