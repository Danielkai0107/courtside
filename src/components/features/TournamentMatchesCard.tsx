import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Clock, Workflow } from "lucide-react";
import clsx from "clsx";
import Card from "../common/Card";
import styles from "./TournamentMatchesCard.module.scss";
import type { Tournament, Match } from "../../types";
import defaultBanner from "../../assets/demo.jpg";

export interface TournamentMatchesCardProps {
  tournament: Tournament;
  matches: Match[];
  courts?: any[];
  showLiveTag?: boolean;
  className?: string;
}

const TournamentMatchesCard: React.FC<TournamentMatchesCardProps> = ({
  tournament,
  matches,
  courts = [],
  showLiveTag = false,
  className,
}) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 預加載圖片
  useEffect(() => {
    const imageUrl = tournament.bannerURL || defaultBanner;
    setImageLoaded(false);
    setImageError(false);

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
  }, [tournament.bannerURL]);

  // Helper function to get court name
  const getCourtName = (courtId: string | null) => {
    if (!courtId) return "未分配場地";
    const court = courts.find((c) => c.id === courtId);
    return court?.name || courtId;
  };

  // Helper function to get match stage name
  const getMatchStageName = (match: Match) => {
    if (match.stage === "group") {
      return `Group ${match.groupLabel || ""}`;
    }
    
    // Knockout stage
    switch (match.roundLabel) {
      case "FI":
        return "決賽";
      case "3RD":
        return "季軍賽";
      case "SF":
        return "準決賽";
      case "QF":
        return "8 強";
      case "R16":
        return "16 強";
      default:
        return `第 ${match.round} 輪`;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString("zh-TW", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/events/${tournament.id}`);
  };

  const handleMatchClick = (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/matches/${matchId}`);
  };

  const handleCategoryClick = (
    tournamentId: string,
    categoryId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    navigate(`/events/${tournamentId}/categories/${categoryId}`);
  };

  return (
    <Card className={clsx(styles.tournamentMatchesCard, className)}>
      {/* Tournament Header - 點擊進入賽事詳情 */}
      <div
        className={clsx(
          styles.header,
          !imageLoaded && !imageError && styles.loading
        )}
        onClick={handleHeaderClick}
        style={
          imageLoaded
            ? {
                backgroundImage: `url(${tournament.bannerURL || defaultBanner})`,
              }
            : undefined
        }
      >
        <div className={styles.headerContent}>
          <div className={styles.headerTop}>
            <h3 className={styles.tournamentName}>{tournament.name}</h3>
            {showLiveTag && (
              <span className={styles.liveTag}>
                <span className={styles.liveDot}></span>
                Live
              </span>
            )}
          </div>
          <div className={styles.headerInfo}>
            <span className={styles.infoItem}>
              <Calendar size={14} />
              {formatDate(tournament.date)}
            </span>
            <span className={styles.infoItem}>
              <MapPin size={14} />
              {tournament.location}
            </span>
          </div>
        </div>
      </div>

      {/* Matches List - 點擊進入場次詳情（計分板） */}
      <div className={styles.matchesList}>
        {matches.length > 0 ? (
          matches.map((match) => (
            <div
              key={match.id}
              className={styles.matchItem}
              onClick={(e) => handleMatchClick(match.id, e)}
            >
              <div className={styles.matchInfo}>
                <div className={styles.matchStageWrapper}>
                  <button
                    className={styles.bracketButton}
                    onClick={(e) =>
                      handleCategoryClick(match.tournamentId, match.categoryId, e)
                    }
                    aria-label="查看對陣圖"
                  >
                    <Workflow size={16} />
                  </button>
                  <span className={styles.matchStage}>
                    {getMatchStageName(match)}
                  </span>
                </div>
                <span className={styles.courtInfo}>
                  {getCourtName(match.courtId)}
                </span>
              </div>

              <div className={styles.matchup}>
                <div className={styles.player}>
                  <span className={styles.playerName}>
                    {match.player1Name || "選手 1"}
                  </span>
                  {(match.status === "IN_PROGRESS" ||
                    match.status === "COMPLETED") && (
                    <span className={styles.score}>{match.score.player1}</span>
                  )}
                </div>

                <div className={styles.player}>
                  <span className={styles.playerName}>
                    {match.player2Name || "選手 2"}
                  </span>
                  {(match.status === "IN_PROGRESS" ||
                    match.status === "COMPLETED") && (
                    <span className={styles.score}>{match.score.player2}</span>
                  )}
                </div>
              </div>

              <div className={styles.matchFooter}>
                {match.scheduledTime && (
                  <span className={styles.matchTime}>
                    <Clock size={12} />
                    {formatTime(match.scheduledTime)}
                  </span>
                )}
                {match.status === "IN_PROGRESS" && (
                  <div className={styles.liveIndicator}>
                    <span className={styles.liveDot}></span>
                    進行中
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noMatches}>尚無場次資訊</div>
        )}
      </div>
    </Card>
  );
};

export default TournamentMatchesCard;
