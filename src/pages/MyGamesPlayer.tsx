import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserRegisteredTournaments } from "../services/registrationService";
import { getActiveSports } from "../services/sportService";
import { useSportPreference } from "../hooks/useSportPreference";
import { useAuth } from "../contexts/AuthContext";
import TournamentCard from "../components/features/TournamentCard";
import Loading from "../components/common/Loading";
import Button from "../components/common/Button";
import SportSelectionModal from "../components/common/SportSelectionModal";
import styles from "./MyGamesPlayer.module.scss";
import type { Tournament, Sport } from "../types";

// Material Symbol 組件
const MaterialSymbol: React.FC<{ icon: string; filled?: boolean }> = ({
  icon,
  filled = false,
}) => (
  <span
    className="material-symbols-rounded"
    style={{
      fontVariationSettings: filled
        ? "'FILL' 1, 'wght' 500"
        : "'FILL' 0, 'wght' 300",
    }}
  >
    {icon}
  </span>
);

const MyGamesPlayer: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    preferredSportId,
    updateSportPreference,
    loading: loadingSportPref,
  } = useSportPreference();
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [sports, setSports] = useState<Sport[]>([]);
  const [showSportModal, setShowSportModal] = useState(false);

  // 載入運動項目資料
  useEffect(() => {
    const loadSports = async () => {
      try {
        const data = await getActiveSports();
        setSports(data);
      } catch (error) {
        console.error("Failed to load sports:", error);
      }
    };

    loadSports();
  }, []);

  // 取得當前運動項目名稱
  const currentSportName = () => {
    if (preferredSportId === "all") return " ";
    const sport = sports.find((s) => s.id === preferredSportId);
    return sport ? `${sport.icon} ${sport.name}` : " ";
  };

  // 載入我的比賽
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // 等待運動偏好載入完成
    if (loadingSportPref) {
      return;
    }

    const loadMyGames = async () => {
      setLoading(true);
      try {
        // 載入所有已報名的賽事
        const registrations = await getUserRegisteredTournaments(
          currentUser.uid
        );

        console.log("📊 [MyGamesPlayer] 用戶報名資料:", {
          uid: currentUser.uid,
          totalRegistrations: registrations.length,
        });

        const allTournaments = registrations
          .map((r) => r.tournament)
          .filter((t): t is Tournament => t !== null);

        // 我的比賽：包含報名中、進行中的賽事（不含已完成）
        let filteredTournaments = allTournaments.filter((t) =>
          [
            "DRAFT",
            "REGISTRATION_OPEN",
            "REGISTRATION_CLOSED",
            "ONGOING",
          ].includes(t.status)
        );

        // 根據運動項目偏好過濾
        if (preferredSportId !== "all") {
          filteredTournaments = filteredTournaments.filter(
            (t) => t.sportId === preferredSportId
          );
        }

        console.log(" [MyGamesPlayer] 我的比賽:", filteredTournaments.length);
        setTournaments(filteredTournaments);
      } catch (error) {
        console.error("[MyGamesPlayer] 載入失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMyGames();
  }, [currentUser, preferredSportId, loadingSportPref]);

  const handleSportPreferenceChange = async (
    sportId: string,
    sportName: string
  ) => {
    try {
      await updateSportPreference(sportId, sportName);
      setShowSportModal(false);
    } catch (error) {
      console.error("Failed to update sport preference:", error);
      alert("更新項目偏好失敗，請稍後再試");
    }
  };

  if (!currentUser) {
    return (
      <div className={styles.notLoggedIn}>
        <p>登入後即可查看您的比賽資訊</p>
        <Button onClick={() => navigate("/login")}>前往登入</Button>
      </div>
    );
  }

  return (
    <div className={styles.myGamesPlayer}>
      {/* 切換項目彈窗 */}
      <SportSelectionModal
        isOpen={showSportModal}
        onSelect={handleSportPreferenceChange}
        currentSportId={preferredSportId}
        title="切換運動項目"
      />

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>我的比賽</h1>
        {!loadingSportPref && preferredSportId && (
          <button
            className={styles.sportButton}
            onClick={() => setShowSportModal(true)}
          >
            {currentSportName()}
            <span
              className="material-symbols-rounded"
              style={{
                fontVariationSettings:
                  '"FILL" 0, "wght" 300, "GRAD" 0, "opsz" 20',
              }}
            >
              arrow_drop_down
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading || loadingSportPref ? (
          <Loading />
        ) : tournaments.length > 0 ? (
          <div className={styles.tournamentList}>
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onClick={() =>
                  navigate(`/my-games/tournament/${tournament.id}`)
                }
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p>目前沒有參加中的賽事</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGamesPlayer;
