import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import clsx from "clsx";
import Card from "../common/Card";
import styles from "./MatchCard.module.scss";
import type { Match } from "../../types";

export interface MatchCardProps {
  match: Match;
  className?: string;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, className }) => {
  const navigate = useNavigate();

  const getStatusLabel = (status: Match["status"]) => {
    const labels: Record<string, string> = {
      PENDING_PLAYER: "等待選手",
      PENDING_COURT: "等待場地",
      SCHEDULED: "即將開始",
      IN_PROGRESS: "進行中",
      COMPLETED: "已結束",
    };
    return labels[status] || status;
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card
      className={clsx(styles.matchCard, className)}
      onClick={() => navigate(`/matches/${match.id}`)}
    >
      <div className={styles.header}>
        <span className={clsx(styles.status, styles[match.status])}>
          {getStatusLabel(match.status)}
        </span>
        {match.scheduledTime && (
          <span className={styles.time}>
            <Clock size={14} />
            {formatTime(match.scheduledTime)}
          </span>
        )}
      </div>

      <div className={styles.matchup}>
        <div className={styles.player}>
          <span className={styles.playerName}>
            {match.player1Name || match.playerA_Name || "選手 1"}
          </span>
          {match.status === "COMPLETED" && (
            <span className={styles.score}>
              {match.score.player1 !== undefined
                ? match.score.player1
                : match.score.A}
            </span>
          )}
        </div>

        <div className={styles.vs}>VS</div>

        <div className={styles.player}>
          <span className={styles.playerName}>
            {match.player2Name || match.playerB_Name || "選手 2"}
          </span>
          {match.status === "COMPLETED" && (
            <span className={styles.score}>
              {match.score.player2 !== undefined
                ? match.score.player2
                : match.score.B}
            </span>
          )}
        </div>
      </div>

      {match.status === "IN_PROGRESS" && (
        <div className={styles.liveIndicator}>
          <span className={styles.liveDot}></span>
          即時直播中
        </div>
      )}
    </Card>
  );
};

export default MatchCard;
