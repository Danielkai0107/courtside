import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import Card from "../common/Card";
import styles from "./CategoryPublisher.module.scss";
import type { Category } from "../../types";
import {
  suggestGroupConfigs,
  calculateTotalMatches,
  type GroupConfig,
} from "../../services/groupingService";
import {
  generateKnockoutOnly,
  generateGroupThenKnockout,
} from "../../services/bracketService";

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
  const [selectedConfig, setSelectedConfig] = useState<GroupConfig | null>(
    null
  );
  const [suggestedConfigs, setSuggestedConfigs] = useState<GroupConfig[]>([]);

  useEffect(() => {
    if (category.format === "GROUP_THEN_KNOCKOUT" && participants.length >= 4) {
      const configs = suggestGroupConfigs(participants.length);
      setSuggestedConfigs(configs);
      if (configs.length > 0) {
        setSelectedConfig(configs[0]);
      }
    }
  }, [category, participants.length]);

  const handlePublish = async () => {
    if (participants.length < 2) {
      setError("至少需要 2 位參賽者才能發布賽程");
      return;
    }

    if (courts.length === 0) {
      setError("請先在「場地管理」Tab 新增至少一個場地");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (category.format === "KNOCKOUT_ONLY") {
        // 純淘汰賽
        await generateKnockoutOnly(
          tournamentId,
          category.id,
          participants,
          category.enableThirdPlaceMatch,
          courts
        );
      } else {
        // 小組賽 + 淘汰賽
        // 檢查是否有推薦方案
        if (suggestedConfigs.length === 0) {
          // 人數不足，降級為純淘汰賽
          console.log(
            `參賽者不足 (${participants.length})，自動降級為純淘汰賽`
          );
          await generateKnockoutOnly(
            tournamentId,
            category.id,
            participants,
            category.enableThirdPlaceMatch,
            courts
          );
        } else {
          // 有推薦方案，檢查是否已選擇
          if (!selectedConfig) {
            setError("請選擇分組方案");
            return;
          }

          await generateGroupThenKnockout(
            tournamentId,
            category.id,
            participants,
            {
              totalGroups: selectedConfig.totalGroups,
              teamsPerGroup: selectedConfig.teamsPerGroup,
              advancePerGroup: selectedConfig.advancePerGroup,
              bestThirdPlaces: selectedConfig.bestThirdPlaces,
            },
            selectedConfig.knockoutSize,
            category.enableThirdPlaceMatch,
            courts
          );
        }
      }

      // 發布成功後，自動檢查並轉換賽事狀態為 ONGOING
      const { checkAndTransitionToOngoing, getTournament } = await import(
        "../../services/tournamentService"
      );
      await checkAndTransitionToOngoing(tournamentId);

      // 發送通知給所有已確認且有 uid 的選手
      try {
        const { getConfirmedPlayers } = await import(
          "../../services/registrationService"
        );
        const { createNotification } = await import(
          "../../services/notificationService"
        );
        const tournament = await getTournament(tournamentId);
        const confirmedPlayers = await getConfirmedPlayers(tournamentId);

        console.log("📢 [CategoryPublisher] 準備發送通知:", {
          tournamentId,
          tournamentName: tournament?.name,
          totalPlayers: confirmedPlayers.length,
          players: confirmedPlayers.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            uid: p.uid,
            status: p.status,
            hasUid: !!p.uid,
          })),
        });

        const playersWithUid = confirmedPlayers.filter((player) => player.uid);
        console.log("✅ [CategoryPublisher] 有 UID 的選手:", {
          count: playersWithUid.length,
          uids: playersWithUid.map((p) => p.uid),
        });

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
        // 不影響發布流程
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
          <div className={styles.stat}>
            <span className={styles.statLabel}>賽制</span>
            <span className={styles.statValue}>
              {category.format === "KNOCKOUT_ONLY"
                ? "純淘汰賽"
                : "小組賽+淘汰賽"}
            </span>
          </div>
        </div>
      </Card>

      {category.format === "GROUP_THEN_KNOCKOUT" && (
        <Card className={styles.configCard}>
          <h4 className={styles.subtitle}>分組方案</h4>

          {participants.length < 4 ? (
            <div className={styles.warningBox}>
              <p className={styles.warningTitle}>參賽者人數不足</p>
              <p className={styles.warningText}>
                小組賽至少需要 4 位參賽者，目前僅有 {participants.length} 位。
              </p>
              <p className={styles.warningText}>
                點擊「發布賽程」時，系統將自動改用<strong>純淘汰賽</strong>。
              </p>
              <div className={styles.warningStats}>
                <span>預計賽制：{participants.length} 人純淘汰賽</span>
                <span>預計場次：{participants.length - 1} 場</span>
              </div>
            </div>
          ) : (
            <>
              {/* 推薦方案 */}
              {suggestedConfigs.length > 0 && (
                <div className={styles.configsList}>
                  {suggestedConfigs.map((config, index) => (
                    <div
                      key={index}
                      className={`${styles.configOption} ${
                        selectedConfig === config ? styles.selected : ""
                      }`}
                      onClick={() => setSelectedConfig(config)}
                    >
                      <div className={styles.configHeader}>
                        <span className={styles.configLabel}>
                          方案 {String.fromCharCode(65 + index)}
                          {config.isRecommended && (
                            <span className={styles.recommendedBadge}>
                              推薦
                            </span>
                          )}
                        </span>
                      </div>
                      <p className={styles.configDescription}>
                        {config.description}
                      </p>
                      <div className={styles.configStats}>
                        <span>
                          總場次: {calculateTotalMatches(config).total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={handlePublish}
          loading={loading}
          fullWidth
        >
          發布賽程
        </Button>
      </div>
    </div>
  );
};

export default CategoryPublisher;
