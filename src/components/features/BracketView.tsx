import React, { useEffect, useState } from "react";
import {
  getMatchesByTournament,
  subscribeMatchesByTournament,
} from "../../services/matchService";
import { getCourts } from "../../services/courtService";
import Loading from "../common/Loading";
import styles from "./BracketView.module.scss";
import type { Match, Court } from "../../types";

export interface BracketViewProps {
  tournamentId: string;
  className?: string;
}

const BracketView: React.FC<BracketViewProps> = ({
  tournamentId,
  className,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [matchData, courtData] = await Promise.all([
          getMatchesByTournament(tournamentId),
          getCourts(tournamentId),
        ]);
        setMatches(matchData);
        setCourts(courtData);
      } catch (error) {
        console.error("Failed to load bracket data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 即時監聽比賽變化
    const unsubscribe = subscribeMatchesByTournament(
      tournamentId,
      (updatedMatches) => {
        setMatches(updatedMatches);
      }
    );

    return () => unsubscribe();
  }, [tournamentId]);

  const getCourtName = (courtId: string | null) => {
    if (!courtId) return null;
    const court = courts.find((c) => c.id === courtId);
    return court?.name || null;
  };

  const getRoundLabel = (round: number, totalRounds: number) => {
    // 季軍賽特殊處理
    if (round === totalRounds + 0.5) {
      return "季軍賽";
    }

    if (round === totalRounds) {
      return "決賽";
    }
    if (round === totalRounds - 1) {
      return "準決賽";
    }
    if (round === totalRounds - 2) {
      return "八強";
    }
    if (round === totalRounds - 3) {
      return "十六強";
    }

    return `第 ${round} 輪`;
  };

  const getStatusLabel = (status: Match["status"]) => {
    switch (status) {
      case "PENDING_PLAYER":
        return { label: "等待選手", color: "gray" };
      case "PENDING_COURT":
        return { label: "等待場地", color: "yellow" };
      case "SCHEDULED":
        return { label: "已排程", color: "blue" };
      case "IN_PROGRESS":
        return { label: "進行中", color: "orange" };
      case "COMPLETED":
        return { label: "已完成", color: "green" };
      default:
        return { label: status, color: "gray" };
    }
  };

  const getPlayerName = (match: Match, slot: "player1" | "player2") => {
    const id = slot === "player1" ? match.player1Id : match.player2Id;
    const name = slot === "player1" ? match.player1Name : match.player2Name;

    // 如果沒有 ID，統一顯示「待晉級」
    // 是否為輪空由 isBye 標記和提示訊息來說明
    if (!id) {
      return "待晉級";
    }

    return name || "待晉級";
  };

  if (loading) {
    return <Loading />;
  }

  if (matches.length === 0) {
    return (
      <div className={styles.empty}>
        <p>尚未產生賽程</p>
      </div>
    );
  }

  // Group matches by round
  const rounds = new Set(matches.map((m) => m.round));
  const sortedRounds = Array.from(rounds).sort((a, b) => a - b);
  const totalRounds = Math.max(...sortedRounds.filter((r) => r % 1 === 0));

  return (
    <div className={`${styles.bracketView} ${className || ""}`}>
      <div className={styles.bracketContainer}>
        {sortedRounds.map((round) => {
          const roundMatches = matches
            .filter((m) => m.round === round)
            .sort((a, b) => a.matchOrder - b.matchOrder);

          return (
            <div key={round} className={styles.round}>
              <h3 className={styles.roundTitle}>
                {getRoundLabel(round, totalRounds)}
              </h3>
              <div className={styles.matchesColumn}>
                {roundMatches.map((match) => {
                  const statusInfo = getStatusLabel(match.status);
                  const courtName = getCourtName(match.courtId);

                  // 真正的輪空：一個有選手，一個沒有（異或邏輯）
                  const isBye =
                    (match.player1Id === null && match.player2Id !== null) ||
                    (match.player1Id !== null && match.player2Id === null);

                  // 等待雙方晉級：兩個都沒有
                  const waitingBoth =
                    match.player1Id === null && match.player2Id === null;

                  return (
                    <div key={match.id} className={styles.matchCard}>
                      {/* 狀態標籤 */}
                      <div
                        className={`${styles.statusBadge} ${
                          styles[statusInfo.color]
                        }`}
                      >
                        {statusInfo.label}
                      </div>

                      {/* 場地資訊 */}
                      {courtName && (
                        <div className={styles.courtName}>{courtName}</div>
                      )}

                      {/* 選手對戰 */}
                      <div className={styles.matchup}>
                        <div
                          className={`${styles.player} ${
                            match.winnerId === match.player1Id
                              ? styles.winner
                              : ""
                          } ${match.player1Id === null ? styles.bye : ""}`}
                        >
                          <span className={styles.playerName}>
                            {getPlayerName(match, "player1")}
                          </span>
                          {match.status === "COMPLETED" && (
                            <span className={styles.score}>
                              {match.score.player1}
                            </span>
                          )}
                        </div>

                        <div className={styles.vs}>vs</div>

                        <div
                          className={`${styles.player} ${
                            match.winnerId === match.player2Id
                              ? styles.winner
                              : ""
                          } ${match.player2Id === null ? styles.bye : ""}`}
                        >
                          <span className={styles.playerName}>
                            {getPlayerName(match, "player2")}
                          </span>
                          {match.status === "COMPLETED" && (
                            <span className={styles.score}>
                              {match.score.player2}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* BYE 輪空提示 */}
                      {isBye && match.status === "COMPLETED" && (
                        <div className={styles.byeNotice}>
                          本場次無對手，已自動晉級下一輪
                        </div>
                      )}

                      {/* 等待晉級提示 */}
                      {waitingBoth && match.status === "PENDING_PLAYER" && (
                        <div className={styles.byeNotice}>
                          等待雙方選手從上一輪晉級
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BracketView;
