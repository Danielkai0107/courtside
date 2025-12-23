import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, MapPin, Clock, Workflow, ArrowLeft } from "lucide-react";
import clsx from "clsx";
import { getTournament } from "../services/tournamentService";
import { getMatchesByPlayer } from "../services/matchService";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../components/common/Loading";
import Card from "../components/common/Card";
import styles from "./MyTournamentMatches.module.scss";
import type { Tournament, Match } from "../types";
import defaultBanner from "../assets/demo.jpg";

const MyTournamentMatches: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!currentUser || !tournamentId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // 載入賽事資料
        const tournamentData = await getTournament(tournamentId);
        setTournament(tournamentData);

        // 載入用戶的所有場次
        const allMatches = await getMatchesByPlayer(currentUser.uid);
        const tournamentMatches = allMatches.filter(
          (m) => m.tournamentId === tournamentId
        );
        setMatches(tournamentMatches);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, tournamentId]);

  // 預加載圖片
  useEffect(() => {
    if (!tournament) return;
    const imageUrl = tournament.bannerURL || defaultBanner;
    setImageLoaded(false);
    setImageError(false);

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
  }, [tournament?.bannerURL]);

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

  const formatDateRange = () => {
    if (!tournament) return "";
    
    // 優先使用新的 startDate/endDate
    const start = tournament.startDate || tournament.date;
    const end = tournament.endDate;

    if (!start) return "";
    return formatDate(start);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleMatchClick = (matchId: string) => {
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

  if (loading) {
    return <Loading />;
  }

  if (!tournament) {
    return (
      <div className={styles.error}>
        <p>找不到賽事資料</p>
      </div>
    );
  }

  return (
    <div className={styles.myTournamentMatches}>
      <div className={styles.headerNav}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.title}>我的場次</h1>
      </div>

      <Card className={styles.tournamentCard}>
        {/* Tournament Header */}
        <div
          className={clsx(
            styles.header,
            !imageLoaded && !imageError && styles.loading
          )}
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
            </div>
            <div className={styles.headerInfo}>
              <span className={styles.infoItem}>
                <Calendar size={14} />
                {formatDateRange()}
              </span>
              <span className={styles.infoItem}>
                <MapPin size={14} />
                {tournament.location}
              </span>
            </div>
          </div>
        </div>

        {/* Matches List */}
        <div className={styles.matchesList}>
          {matches.length > 0 ? (
            matches.map((match) => (
              <div
                key={match.id}
                className={styles.matchItem}
                onClick={() => handleMatchClick(match.id)}
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
                    {match.courtId || "未分配場地"}
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
    </div>
  );
};

export default MyTournamentMatches;

