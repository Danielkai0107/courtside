import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTournaments } from "../services/tournamentService";
import { getActiveSports } from "../services/sportService";
import { useSportPreference } from "../hooks/useSportPreference";
import { useAuth } from "../contexts/AuthContext";
import TournamentCard from "../components/features/TournamentCard";
import Loading from "../components/common/Loading";
import Button from "../components/common/Button";
import IndexBuildingNotice from "../components/common/IndexBuildingNotice";
import SportSelectionModal from "../components/common/SportSelectionModal";
import styles from "./MyGamesOrganizer.module.scss";
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

const MyGamesOrganizer: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    preferredSportId,
    updateSportPreference,
    loading: loadingSportPref,
  } = useSportPreference();
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexBuilding, setIndexBuilding] = useState(false);
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

  // 載入我的主辦
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // 等待運動偏好載入完成
    if (loadingSportPref) {
      return;
    }

    let isMounted = true;

    const loadOrganizerTournaments = async () => {
      setLoading(true);

      try {
        // 載入我主辦的賽事（不含已完成）
        const statusFilters = [
          "DRAFT",
          "REGISTRATION_OPEN",
          "REGISTRATION_CLOSED",
          "ONGOING",
        ];

        const filters: any = {
          organizerId: currentUser.uid,
          status: statusFilters,
        };

        // 如果選擇特定球類，加入 sportId 篩選
        if (preferredSportId !== "all") {
          filters.sportId = preferredSportId;
        }

        console.log(
          "[MyGamesOrganizer] Loading organizer tournaments with filters:",
          filters
        );
        const data = await getTournaments(filters);

        console.log(
          `[MyGamesOrganizer] Loaded ${data.length} organizer tournaments`
        );

        if (isMounted) {
          // Remove duplicates by id
          const tournamentMap = new Map<string, Tournament>();
          data.forEach((t) => {
            if (!tournamentMap.has(t.id)) {
              tournamentMap.set(t.id, t);
            }
          });
          const uniqueTournaments = Array.from(tournamentMap.values());

          console.log(
            `[MyGamesOrganizer] After dedup: ${uniqueTournaments.length} tournaments`
          );
          setTournaments(uniqueTournaments);
          setIndexBuilding(false);
        }
      } catch (error: any) {
        console.error("Failed to load organizer tournaments:", error);

        if (isMounted) {
          if (error?.message?.includes("index")) {
            console.log(
              "Firestore 索引正在建立中，請稍候 1-2 分鐘後重新整理頁面"
            );
            setIndexBuilding(true);
          }
          setTournaments([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrganizerTournaments();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, preferredSportId, loadingSportPref]);

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
    <div className={styles.myGamesOrganizer}>
      {/* 切換項目彈窗 */}
      <SportSelectionModal
        isOpen={showSportModal}
        onSelect={handleSportPreferenceChange}
        currentSportId={preferredSportId}
        title="切換運動項目"
      />

      {/* 建立賽事按鈕 */}
      <Button
        variant="primary"
        onClick={() => navigate("/organizer/create")}
        className={styles.createButton}
      >
        <span className="material-symbols-rounded">add</span>
      </Button>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>我的主辦</h1>
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
        ) : indexBuilding ? (
          <IndexBuildingNotice />
        ) : tournaments.length > 0 ? (
          <div className={styles.tournamentList}>
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                onClick={() =>
                  navigate(`/organizer/tournaments/${tournament.id}`)
                }
              >
                <TournamentCard tournament={tournament} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p>您還沒有進行中的賽事</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGamesOrganizer;
