import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import Card from "../common/Card";
import styles from "./CategoryPublisher.module.scss";
import type { Category } from "../../types";
import {
  generateScheduleUniversal,
  generateKnockoutOnly,
  generateGroupThenKnockout,
} from "../../services/bracketService";
import { getCategory } from "../../services/tournamentService";
import { findBestFormat } from "../../services/formatService";

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
  const [isUniversalEngine, setIsUniversalEngine] = useState(false);
  const [suggestedFormat, setSuggestedFormat] = useState<string>("");

  useEffect(() => {
    const checkEngineType = async () => {
      try {
        const categoryDoc = await getCategory(tournamentId, category.id);
        if (categoryDoc && categoryDoc.formatConfig) {
          setIsUniversalEngine(true);
        }
      } catch (error) {
        console.error("檢查引擎類型失敗:", error);
      }
    };

    checkEngineType();
  }, [tournamentId, category.id]);

  const handlePublish = async () => {
    if (participants.length < 2) {
      setError("至少需要 2 位參賽者才能發布賽程");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 檢查是否為通用引擎
      const categoryDoc = await getCategory(tournamentId, category.id);
      
      if (categoryDoc && categoryDoc.formatConfig) {
        // 使用通用引擎發布
        console.log("[CategoryPublisher] 使用通用運動引擎發布賽程");
        
        const { formatConfig } = categoryDoc;
        
        // 驗證人數是否符合格式要求
        if (
          participants.length < formatConfig.minParticipants ||
          participants.length > formatConfig.maxParticipants
        ) {
          const errorMsg = `參賽人數 ${participants.length} 不符合格式要求（${formatConfig.minParticipants}-${formatConfig.maxParticipants} 人）`;
          
          // 嘗試找到建議格式
          try {
            const suggested = await findBestFormat(participants.length);
            if (suggested) {
              setError(`${errorMsg}。建議改用：${suggested.name}`);
              setSuggestedFormat(suggested.name);
            } else {
              setError(`${errorMsg}。找不到適合的替代格式`);
            }
          } catch (err) {
            setError(errorMsg);
          }
          
          setLoading(false);
          return;
        }
        
        // 使用通用生成引擎
        await generateScheduleUniversal(tournamentId, category.id);
      } else {
        // 使用舊邏輯（向後兼容）
        console.log("[CategoryPublisher] 使用傳統引擎發布賽程");
        
        if (courts.length === 0) {
          setError("請先在「場地管理」Tab 新增至少一個場地");
          setLoading(false);
          return;
        }
        
        if (category.format === "KNOCKOUT_ONLY") {
          await generateKnockoutOnly(
            tournamentId,
            category.id,
            participants,
            category.enableThirdPlaceMatch,
            courts
          );
        } else {
          // 小組賽邏輯保持不變
          const { suggestGroupConfigs } = await import("../../services/groupingService");
          const configs = suggestGroupConfigs(participants.length);
          
          if (configs.length === 0) {
            await generateKnockoutOnly(
              tournamentId,
              category.id,
              participants,
              category.enableThirdPlaceMatch,
              courts
            );
          } else {
            const selectedConfig = configs[0];
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

        console.log("[CategoryPublisher] 準備發送通知:", {
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
        console.log("[CategoryPublisher] 有 UID 的選手:", {
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
          `[CategoryPublisher] 成功發送 ${notificationPromises.length} 個通知`
        );
      } catch (error) {
        console.error("[CategoryPublisher] 發送通知失敗:", error);
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
          {!isUniversalEngine && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>場地</span>
              <span className={styles.statValue}>{courts.length}</span>
            </div>
          )}
          <div className={styles.stat}>
            <span className={styles.statLabel}>引擎</span>
            <span className={styles.statValue}>
              {isUniversalEngine ? "通用引擎" : "傳統引擎"}
            </span>
          </div>
        </div>
      </Card>

      {isUniversalEngine && suggestedFormat && (
        <Card className={styles.configCard}>
          <h4 className={styles.subtitle}>格式建議</h4>
          <div className={styles.warningBox}>
            <p className={styles.warningText}>
              目前配置不適合 {participants.length} 位參賽者。建議格式：{suggestedFormat}
            </p>
            <p className={styles.warningText}>
              請主辦方重新創建分類，或調整參賽人數。
            </p>
          </div>
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
