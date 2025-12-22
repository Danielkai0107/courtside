/**
 * 通用計分板組件
 * 
 * 根據 ScoringConfig 動態渲染計分界面：
 * - 動態局數框（根據 maxSets）
 * - Deuce 顯示
 * - 分數上限提示
 * - 整合 recordScoreUniversal()
 */

import React, { useState, useEffect } from "react";
import { recordScoreUniversal } from "../../services/matchService";
import { getCategory } from "../../services/tournamentService";
import type { MatchDoc, CategoryDoc } from "../../types/schema";
import type { ScoringConfig } from "../../types/universal-config";
import Button from "../common/Button";
import styles from "./UniversalScoreboard.module.scss";

interface Props {
  match: MatchDoc;
  onScoreUpdate?: () => void;
}

const UniversalScoreboard: React.FC<Props> = ({ match, onScoreUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [category, setCategory] = useState<CategoryDoc | null>(null);

  // 當前正在編輯的局
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // 載入分組配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const cat = await getCategory(match.tournamentId, match.categoryId);
        if (cat) {
          setCategory(cat);
          setConfig(cat.scoringConfig);

          // 設置當前局為第一個未完成的局
          for (let i = 0; i < cat.scoringConfig.maxSets; i++) {
            if (!match.sets[i] || !match.sets[i].isCompleted) {
              setCurrentSetIndex(i);
              setP1Score(match.sets[i]?.p1Score || 0);
              setP2Score(match.sets[i]?.p2Score || 0);
              break;
            }
          }
        }
      } catch (err) {
        console.error("載入配置失敗:", err);
        setError("載入配置失敗");
      }
    };

    loadConfig();
  }, [match]);

  if (!config || !category) {
    return <div>載入中...</div>;
  }

  // 增加分數
  const handleScoreChange = (player: "p1" | "p2", delta: number) => {
    if (player === "p1") {
      const newScore = Math.max(0, p1Score + delta);
      setP1Score(newScore);
    } else {
      const newScore = Math.max(0, p2Score + delta);
      setP2Score(newScore);
    }
  };

  // 提交分數
  const handleSubmitScore = async () => {
    try {
      setLoading(true);
      setError("");

      await recordScoreUniversal(match.id, currentSetIndex, p1Score, p2Score);

      console.log("分數提交成功");

      if (onScoreUpdate) {
        onScoreUpdate();
      }

      // 檢查該局是否完成
      const currentSet = match.sets[currentSetIndex];
      if (currentSet && currentSet.isCompleted) {
        // 移動到下一局
        if (currentSetIndex < config.maxSets - 1) {
          setCurrentSetIndex(currentSetIndex + 1);
          setP1Score(0);
          setP2Score(0);
        }
      }
    } catch (err) {
      console.error("提交分數失敗:", err);
      setError("提交分數失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  // 檢查是否接近獲勝
  const isNearWin = (score: number): boolean => {
    if (score < config.pointsPerSet - 2) {
      return false;
    }

    if (config.winByTwo) {
      return score >= config.pointsPerSet - 2;
    }

    return score >= config.pointsPerSet - 1;
  };

  // 檢查是否 Deuce
  const isDeuce = (): boolean => {
    if (!config.winByTwo) {
      return false;
    }

    return (
      p1Score >= config.pointsPerSet &&
      p2Score >= config.pointsPerSet &&
      Math.abs(p1Score - p2Score) < 2
    );
  };

  return (
    <div className={styles.container}>
      {/* 比賽資訊 */}
      <div className={styles.matchInfo}>
        <div className={styles.sportInfo}>
          {category.sportId === "table_tennis" && "🏓"}
          {category.sportId === "badminton" && "🏸"}
          {category.sportId === "pickleball" && "🥒"}
          <span>{category.name}</span>
        </div>
        <div className={styles.configInfo}>
          {config.matchType === "set_based"
            ? `${config.pointsPerSet}分/${config.setsToWin}勝${config.maxSets}局`
            : `${config.pointsPerSet}分制`}
          {config.winByTwo && " (Deuce)"}
          {config.cap && ` 上限${config.cap}`}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* 累計局數顯示 */}
      <div className={styles.aggregateScore}>
        <div className={styles.playerName}>{match.player1Name || "選手1"}</div>
        <div className={styles.setScore}>
          <span className={styles.score}>{match.p1Aggregate}</span>
          <span className={styles.separator}>-</span>
          <span className={styles.score}>{match.p2Aggregate}</span>
        </div>
        <div className={styles.playerName}>{match.player2Name || "選手2"}</div>
      </div>

      {/* 所有局數框 */}
      <div className={styles.setsContainer}>
        {Array.from({ length: config.maxSets }).map((_, index) => {
          const set = match.sets[index];
          const isActive = index === currentSetIndex;

          return (
            <div
              key={index}
              className={`${styles.setBox} ${
                isActive ? styles.active : ""
              } ${set?.isCompleted ? styles.completed : ""}`}
              onClick={() => {
                if (!set?.isCompleted) {
                  setCurrentSetIndex(index);
                  setP1Score(set?.p1Score || 0);
                  setP2Score(set?.p2Score || 0);
                }
              }}
            >
              <div className={styles.setNumber}>第 {index + 1} 局</div>
              <div className={styles.setScores}>
                <span
                  className={`${styles.setScore} ${
                    set?.winner === "p1" ? styles.winner : ""
                  }`}
                >
                  {set?.p1Score || 0}
                </span>
                <span className={styles.separator}>:</span>
                <span
                  className={`${styles.setScore} ${
                    set?.winner === "p2" ? styles.winner : ""
                  }`}
                >
                  {set?.p2Score || 0}
                </span>
              </div>
              {set?.isCompleted && (
                <div className={styles.setStatus}>✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 當前局計分器 */}
      {match.status !== "COMPLETED" && (
        <div className={styles.currentSet}>
          <h3 className={styles.currentSetTitle}>
            第 {currentSetIndex + 1} 局計分
            {isDeuce() && <span className={styles.deuce}>Deuce!</span>}
          </h3>

          <div className={styles.scoreControls}>
            {/* 選手1 */}
            <div className={styles.playerControl}>
              <div className={styles.playerName}>
                {match.player1Name || "選手1"}
              </div>
              <div
                className={`${styles.scoreDisplay} ${
                  isNearWin(p1Score) ? styles.nearWin : ""
                }`}
              >
                {p1Score}
                {config.cap && p1Score >= config.cap && (
                  <span className={styles.capReached}>上限</span>
                )}
              </div>
              <div className={styles.buttons}>
                <Button
                  variant="secondary"
                  onClick={() => handleScoreChange("p1", -1)}
                  disabled={p1Score === 0 || loading}
                >
                  -1
                </Button>
                <Button
                  onClick={() => handleScoreChange("p1", 1)}
                  disabled={loading || (config.cap ? p1Score >= config.cap : false)}
                >
                  +1
                </Button>
              </div>
            </div>

            {/* 選手2 */}
            <div className={styles.playerControl}>
              <div className={styles.playerName}>
                {match.player2Name || "選手2"}
              </div>
              <div
                className={`${styles.scoreDisplay} ${
                  isNearWin(p2Score) ? styles.nearWin : ""
                }`}
              >
                {p2Score}
                {config.cap && p2Score >= config.cap && (
                  <span className={styles.capReached}>上限</span>
                )}
              </div>
              <div className={styles.buttons}>
                <Button
                  variant="secondary"
                  onClick={() => handleScoreChange("p2", -1)}
                  disabled={p2Score === 0 || loading}
                >
                  -1
                </Button>
                <Button
                  onClick={() => handleScoreChange("p2", 1)}
                  disabled={loading || (config.cap ? p2Score >= config.cap : false)}
                >
                  +1
                </Button>
              </div>
            </div>
          </div>

          {/* 提交按鈕 */}
          <div className={styles.submitSection}>
            <Button
              onClick={handleSubmitScore}
              disabled={loading}
              fullWidth
            >
              {loading ? "提交中..." : "確認分數"}
            </Button>
          </div>
        </div>
      )}

      {/* 比賽已完成 */}
      {match.status === "COMPLETED" && (
        <div className={styles.matchCompleted}>
          <h3>🎉 比賽已完成</h3>
          <p>
            勝者：
            {match.winnerId === match.player1Id
              ? match.player1Name
              : match.player2Name}
          </p>
        </div>
      )}
    </div>
  );
};

export default UniversalScoreboard;

