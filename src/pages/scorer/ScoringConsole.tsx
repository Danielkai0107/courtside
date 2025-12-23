import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, RotateCcw } from "lucide-react";
import {
  getMatch,
  subscribeMatch,
  startMatch,
  recordScore,
  undoLastAction,
  finishMatch,
  completeMatch,
} from "../../services/matchService";
import { getCourts } from "../../services/courtService";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Loading from "../../components/common/Loading";
import styles from "./ScoringConsole.module.scss";
import type { Match } from "../../types";

const ScoringConsole: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<Match | null>(null);
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeMatch(id, (data) => {
      setMatch(data);
      setLoading(false);

      // 載入場地
      if (data?.tournamentId) {
        getCourts(data.tournamentId).then(courtsData => {
          setCourts(courtsData);
        });
      }
    });

    return () => unsubscribe();
  }, [id]);

  // Helper function to get court name
  const getCourtName = (courtId: string | null) => {
    if (!courtId) return "待分配";
    const court = courts.find(c => c.id === courtId);
    return court?.name || courtId;
  };

  const handleStart = async () => {
    if (!id || !match) return;

    // 檢查是否有雙方選手
    if (!match.player1Name || !match.player2Name) {
      alert("無法開始比賽：場次尚未產出選手");
      return;
    }

    setProcessing(true);
    try {
      await startMatch(id);
    } catch (error) {
      console.error("Failed to start match:", error);
      alert("開始比賽失敗");
    } finally {
      setProcessing(false);
    }
  };

  const handleScore = async (player: "player1" | "player2") => {
    if (!id) return;

    setProcessing(true);
    try {
      await recordScore(id, player, 1);
    } catch (error) {
      console.error("Failed to record score:", error);
      alert("記錄得分失敗");
    } finally {
      setProcessing(false);
    }
  };

  const handleUndo = async () => {
    if (!id) return;

    const confirmed = window.confirm("確定要復原最後一次操作嗎？");
    if (!confirmed) return;

    setProcessing(true);
    try {
      await undoLastAction(id);
    } catch (error: any) {
      console.error("Failed to undo:", error);
      alert(error.message || "復原失敗");
    } finally {
      setProcessing(false);
    }
  };

  const handleFinish = async () => {
    if (!id || !match) return;

    const confirmed = window.confirm(
      "確定要結束比賽嗎？系統將自動判定勝負並晉級。"
    );
    if (!confirmed) return;

    setProcessing(true);
    try {
      // 使用新的 completeMatch 觸發自動晉級
      await completeMatch(id, {
        player1:
          match.score.player1 !== undefined
            ? match.score.player1
            : match.score.A,
        player2:
          match.score.player2 !== undefined
            ? match.score.player2
            : match.score.B,
      });
      alert("比賽已結束！勝者已自動晉級下一輪");
      navigate(-1);  // 返回上一頁（分類詳情）
    } catch (error) {
      console.error("Failed to finish match:", error);
      alert("結束比賽失敗");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!match) {
    return (
      <div className={styles.error}>
        <p>找不到此場次</p>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  return (
    <div className={styles.scoringConsole}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className={styles.headerTitle}>計分板</h2>
        {match.status === "IN_PROGRESS" && (
          <span className={styles.liveTag}>
            <span className={styles.liveDot}></span>
            LIVE
          </span>
        )}
      </div>

      <div className={styles.content}>
        {/* 比賽信息卡片（總是顯示）*/}
        <Card className={styles.matchInfoCard}>
          <div className={styles.matchInfo}>
            <span className={styles.infoLabel}>比賽狀態</span>
            <span className={styles.infoValue}>
              {match.status === "PENDING_PLAYER" && "等待選手"}
              {match.status === "PENDING_COURT" && "等待場地"}
              {match.status === "SCHEDULED" && "已排程"}
              {match.status === "IN_PROGRESS" && "進行中"}
              {match.status === "COMPLETED" && "已結束"}
            </span>
          </div>
          {match.courtId && (
            <div className={styles.matchInfo}>
              <span className={styles.infoLabel}>場地</span>
              <span className={styles.infoValue}>{getCourtName(match.courtId)}</span>
            </div>
          )}
        </Card>

        {/* 等待選手狀態 */}
        {match.status === "PENDING_PLAYER" && (
          <Card className={styles.startCard}>
            <p>等待選手從上一輪晉級</p>
            <p className={styles.pendingInfo}>
              {!match.player1Name && "等待選手 1 晉級"}
              {!match.player1Name && !match.player2Name && " • "}
              {!match.player2Name && "等待選手 2 晉級"}
            </p>
          </Card>
        )}

        {/* 等待場地狀態 */}
        {match.status === "PENDING_COURT" && (
          <Card className={styles.startCard}>
            <p>等待主辦方分配場地</p>
            <div className={styles.playerPreview}>
              <span>{match.player1Name || "選手 1"}</span>
              <span>vs</span>
              <span>{match.player2Name || "選手 2"}</span>
            </div>
          </Card>
        )}

        {/* 已排程狀態 */}
        {match.status === "SCHEDULED" && (
          <Card className={styles.startCard}>
            {match.player1Name && match.player2Name ? (
              <>
                <p>確認雙方選手到場後，點擊下方按鈕開始比賽</p>
                <div className={styles.playerPreview}>
                  <span>{match.player1Name}</span>
                  <span>vs</span>
                  <span>{match.player2Name}</span>
                </div>
                <Button onClick={handleStart} loading={processing} fullWidth>
                  開始比賽
                </Button>
              </>
            ) : (
              <>
                <p>場次尚未產出選手</p>
                <div className={styles.playerPreview}>
                  <span>{match.player1Name || "等待選手 1"}</span>
                  <span>vs</span>
                  <span>{match.player2Name || "等待選手 2"}</span>
                </div>
                <Button disabled fullWidth>
                  無法開始計分
                </Button>
              </>
            )}
          </Card>
        )}

        {/* 進行中或已完成狀態 */}
        {(match.status === "IN_PROGRESS" ||
          match.status === "COMPLETED") && (
          <>
            {/* 局數制計分板 */}
            {match.ruleConfig?.matchType === "set_based" && match.sets && match.currentSet !== undefined ? (
              <div className={styles.setsScoreboard}>
                {/* 規則說明 */}
                <div className={styles.ruleInfo}>
                  {match.ruleConfig.maxSets}戰{match.ruleConfig.setsToWin}勝 • 每局
                  {match.ruleConfig.pointsPerSet}分
                  {match.ruleConfig.winByTwo && " • 領先2分"}
                  {match.ruleConfig.cap && ` • 封頂${match.ruleConfig.cap}分`}
                </div>

                {/* 選手名稱 */}
                <div className={styles.playersRow}>
                  <div className={styles.playerName}>
                    {match.player1Name || "選手 1"}
                  </div>
                  <div className={styles.playerName}>
                    {match.player2Name || "選手 2"}
                  </div>
                </div>

                {/* 局數分數表格 */}
                <div className={styles.setsGrid}>
                  {match.sets.player1.map((score1, setIndex) => {
                    const score2 = match.sets!.player2[setIndex];
                    const isCurrentSet = setIndex === match.currentSet;
                    const p1Won =
                      score1 > score2 &&
                      score1 >= match.ruleConfig!.pointsPerSet;
                    const p2Won =
                      score2 > score1 &&
                      score2 >= match.ruleConfig!.pointsPerSet;

                    return (
                      <div key={setIndex} className={styles.setColumn}>
                        <div className={styles.setHeader}>
                          第 {setIndex + 1} 局
                          {isCurrentSet && (
                            <span className={styles.liveDot}>●</span>
                          )}
                        </div>
                        <div
                          className={`${styles.setScore} ${
                            p1Won ? styles.winner : ""
                          }`}
                        >
                          {score1}
                        </div>
                        <div
                          className={`${styles.setScore} ${
                            p2Won ? styles.winner : ""
                          }`}
                        >
                          {score2}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 總局數統計 */}
                <div className={styles.totalSets}>
                  <div className={styles.totalCell}>
                    {match.sets.player1.filter(
                      (s, i) => s > match.sets!.player2[i]
                    ).length}
                  </div>
                  <div className={styles.totalLabel}>局</div>
                  <div className={styles.totalCell}>
                    {match.sets.player2.filter(
                      (s, i) => s > match.sets!.player1[i]
                    ).length}
                  </div>
                </div>
              </div>
            ) : (
              /* 原有的單一分數顯示（向下相容）*/
              <div className={styles.scoreboard}>
                <div className={styles.playerSection}>
                  <span className={styles.playerName}>
                    {match.player1Name || match.playerA_Name || "選手 1"}
                  </span>
                  <span className={styles.score}>
                    {match.score.player1 !== undefined
                      ? match.score.player1
                      : match.score.A}
                  </span>
                </div>

                <div className={styles.vs}>VS</div>

                <div className={styles.playerSection}>
                  <span className={styles.playerName}>
                    {match.player2Name || match.playerB_Name || "選手 2"}
                  </span>
                  <span className={styles.score}>
                    {match.score.player2 !== undefined
                      ? match.score.player2
                      : match.score.B}
                  </span>
                </div>
              </div>
            )}

            {match.status === "IN_PROGRESS" && (
              <div className={styles.controls}>
                <div className={styles.scoreButtons}>
                  <button
                    className={styles.scoreButtonA}
                    onClick={() => handleScore("player1")}
                    disabled={processing}
                  >
                    <Plus size={32} />
                    <span>
                      {match.player1Name || match.playerA_Name || "選手 1"} 得分
                    </span>
                  </button>

                  <button
                    className={styles.scoreButtonB}
                    onClick={() => handleScore("player2")}
                    disabled={processing}
                  >
                    <Plus size={32} />
                    <span>
                      {match.player2Name || match.playerB_Name || "選手 2"} 得分
                    </span>
                  </button>
                </div>

                <div className={styles.actionButtons}>
                  <Button
                    variant="ghost"
                    onClick={handleUndo}
                    disabled={processing || match.timeline.length === 0}
                    className={styles.undoButton}
                  >
                    <RotateCcw size={20} />
                    復原
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={handleFinish}
                    disabled={processing}
                  >
                    結束比賽
                  </Button>
                </div>
              </div>
            )}

            {match.status === "COMPLETED" && (
              <Card className={styles.finishedCard}>
                <p>比賽已結束</p>
                <p className={styles.winner}>
                  {(() => {
                    const score1 =
                      match.score.player1 !== undefined
                        ? match.score.player1
                        : match.score.A;
                    const score2 =
                      match.score.player2 !== undefined
                        ? match.score.player2
                        : match.score.B;
                    const player1 =
                      match.player1Name || match.playerA_Name || "選手 1";
                    const player2 =
                      match.player2Name || match.playerB_Name || "選手 2";

                    if (score1 > score2) return `${player1} 獲勝`;
                    if (score2 > score1) return `${player2} 獲勝`;
                    return "平局";
                  })()}
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScoringConsole;
