import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getUserRegisteredTournaments } from "../services/registrationService";
import { getTournaments, getTournament } from "../services/tournamentService";
import { getActiveSports } from "../services/sportService";
import { getUserAcceptedInvitations } from "../services/staffService";
import { useSportPreference } from "../hooks/useSportPreference";
import { useAuth } from "../contexts/AuthContext";
import Tabs from "../components/common/Tabs";
import TournamentCard from "../components/features/TournamentCard";
import Loading from "../components/common/Loading";
import Button from "../components/common/Button";
import IndexBuildingNotice from "../components/common/IndexBuildingNotice";
import styles from "./MyGames.module.scss";
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
      fontSize: "32px",
    }}
  >
    {icon}
  </span>
);

const MyGames: React.FC = () => {
  const { currentUser } = useAuth();
  const { preferredSportId, loading: loadingSportPref } = useSportPreference();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 從 URL 參數讀取初始 tab（支持從外部導航指定 tab）
  const initialTab = searchParams.get("tab") || "myGames";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [myGamesTournaments, setMyGamesTournaments] = useState<Tournament[]>(
    []
  );
  const [organizerTournaments, setOrganizerTournaments] = useState<
    Tournament[]
  >([]);
  const [scorerTournaments, setScorerTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexBuilding, setIndexBuilding] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);

  const tabs = [
    { id: "myGames", label: "我的比賽" },
    { id: "organizer", label: "我的主辦" },
    { id: "scorer", label: "計分任務" },
  ];

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
    if (!currentUser || activeTab !== "myGames") {
      if (activeTab === "myGames") {
        setLoading(false);
      }
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

        console.log("📊 [MyGames] 用戶報名資料:", {
          uid: currentUser.uid,
          totalRegistrations: registrations.length,
        });

        const allTournaments = registrations
          .map((r) => r.tournament)
          .filter((t): t is Tournament => t !== null);

        // 我的比賽：包含報名中、進行中的賽事（不含已完成）
        let tournaments = allTournaments.filter((t) =>
          [
            "DRAFT",
            "REGISTRATION_OPEN",
            "REGISTRATION_CLOSED",
            "ONGOING",
          ].includes(t.status)
        );

        // 根據運動項目偏好過濾
        if (preferredSportId !== "all") {
          tournaments = tournaments.filter(
            (t) => t.sportId === preferredSportId
          );
        }

        console.log(" [MyGames] 我的比賽:", tournaments.length);
        setMyGamesTournaments(tournaments);
      } catch (error) {
        console.error("[MyGames] 載入失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMyGames();
  }, [currentUser, activeTab, preferredSportId, loadingSportPref]);

  // 載入我的主辦
  useEffect(() => {
    if (!currentUser || activeTab !== "organizer") {
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
          "[MyGames] Loading organizer tournaments with filters:",
          filters
        );
        const data = await getTournaments(filters);

        console.log(`[MyGames] Loaded ${data.length} organizer tournaments`);

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
            `[MyGames] After dedup: ${uniqueTournaments.length} tournaments`
          );
          setOrganizerTournaments(uniqueTournaments);
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
          setOrganizerTournaments([]);
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
  }, [currentUser?.uid, activeTab, preferredSportId, loadingSportPref]);

  // 載入計分版任務
  useEffect(() => {
    if (!currentUser || !currentUser.email || activeTab !== "scorer") {
      return;
    }

    // 等待運動偏好載入完成
    if (loadingSportPref) {
      return;
    }

    const userEmail = currentUser.email;
    let isMounted = true;

    const loadScorerTournaments = async () => {
      setLoading(true);
      try {
        const acceptedData = await getUserAcceptedInvitations(userEmail);

        // Load tournament details
        const tournamentsData = await Promise.all(
          acceptedData.map(async (inv) => {
            try {
              const tournament = await getTournament(inv.tournamentId);
              return tournament;
            } catch (error) {
              return null;
            }
          })
        );

        if (isMounted) {
          const validTournaments = tournamentsData.filter(
            (t): t is Tournament => t !== null
          );

          // 根據偏好項目過濾
          const filteredTournaments =
            preferredSportId === "all"
              ? validTournaments
              : validTournaments.filter((t) => t.sportId === preferredSportId);

          // 只顯示正在進行的賽事
          const activeTournaments = filteredTournaments.filter(
            (t) =>
              t.status === "ONGOING" ||
              t.status === "REGISTRATION_CLOSED" ||
              t.status === "REGISTRATION_OPEN"
          );

          setScorerTournaments(activeTournaments);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load scorer tournaments:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadScorerTournaments();

    return () => {
      isMounted = false;
    };
  }, [currentUser, activeTab, preferredSportId, loadingSportPref]);

  if (!currentUser) {
    return (
      <div className={styles.notLoggedIn}>
        <p>登入後即可查看您的比賽資訊</p>
        <Button onClick={() => navigate("/login")}>前往登入</Button>
      </div>
    );
  }

  return (
    <div className={styles.myGames}>
      {/* 只在我的主辦 tab 顯示建立按鈕 */}
      {activeTab === "organizer" && (
        <Button
          variant="primary"
          onClick={() => navigate("/organizer/create")}
          className={styles.createButton}
        >
          <MaterialSymbol icon="add" />
        </Button>
      )}

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        enableSwipe={true}
        swipeThreshold={60}
      >
        {/* 運動項目資訊條 */}
        {!loadingSportPref && (
          <div className={styles.sportInfo}>
            <span className={styles.sportInfoLabel}>目前運動項目：</span>
            <span className={styles.sportInfoValue}>{currentSportName()}</span>
          </div>
        )}

        <div className={styles.content}>
          {loading || loadingSportPref ? (
            <Loading />
          ) : activeTab === "myGames" ? (
            myGamesTournaments.length > 0 ? (
              <div className={styles.tournamentList}>
                {myGamesTournaments.map((tournament) => (
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
            )
          ) : activeTab === "organizer" ? (
            indexBuilding ? (
              <IndexBuildingNotice />
            ) : organizerTournaments.length > 0 ? (
              <div className={styles.tournamentList}>
                {organizerTournaments.map((tournament) => (
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
            )
          ) : scorerTournaments.length > 0 ? (
            <div className={styles.tournamentList}>
              {scorerTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onClick={() =>
                    navigate(`/scorer/tournaments/${tournament.id}`)
                  }
                />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>目前沒有正在進行的賽事</p>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default MyGames;
