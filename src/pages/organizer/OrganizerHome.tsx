import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { getTournaments } from "../../services/tournamentService";
import { useAuth } from "../../contexts/AuthContext";
import { useSportPreference } from "../../hooks/useSportPreference";
import Button from "../../components/common/Button";
import Tabs from "../../components/common/Tabs";
import TournamentCard from "../../components/features/TournamentCard";
import Loading from "../../components/common/Loading";
import IndexBuildingNotice from "../../components/common/IndexBuildingNotice";
import styles from "./OrganizerHome.module.scss";
import type { Tournament } from "../../types";

const OrganizerHome: React.FC = () => {
  const { currentUser } = useAuth();
  const { preferredSportId, loading: loadingSportPref } = useSportPreference();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexBuilding, setIndexBuilding] = useState(false);

  const tabs = [
    { id: "active", label: "我的主辦" },
    { id: "history", label: "歷史紀錄" },
  ];

  useEffect(() => {
    if (!currentUser || loadingSportPref) {
      if (!currentUser) {
        navigate("/profile");
      }
      return;
    }

    let isMounted = true;

    const loadTournaments = async () => {
      setLoading(true);

      try {
        // 根據 tab 決定要載入的狀態
        const statusFilters =
          activeTab === "active"
            ? [
                "DRAFT",
                "REGISTRATION_OPEN",
                "REGISTRATION_CLOSED",
                "ONGOING",
              ] // 進行中
            : ["COMPLETED"]; // 已結束

        const filters: any = {
          organizerId: currentUser.uid,
          status: statusFilters,
        };

        // 如果選擇特定球類，加入 sportId 篩選
        if (preferredSportId !== "all") {
          filters.sportId = preferredSportId;
        }

        const data = await getTournaments(filters);

        console.log(`Loaded ${data.length} tournaments for tab: ${activeTab}`);

        if (isMounted) {
          // Remove duplicates by id
          const tournamentMap = new Map<string, Tournament>();
          data.forEach((t) => {
            if (!tournamentMap.has(t.id)) {
              tournamentMap.set(t.id, t);
            }
          });
          const uniqueTournaments = Array.from(tournamentMap.values());

          console.log(`After dedup: ${uniqueTournaments.length} tournaments`);
          setTournaments(uniqueTournaments);
          setIndexBuilding(false);
        }
      } catch (error: any) {
        console.error("Failed to load tournaments:", error);

        if (isMounted) {
          // If index is still building, show friendly notice
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

    loadTournaments();

    return () => {
      isMounted = false;
    };
  }, [
    currentUser?.uid,
    activeTab,
    preferredSportId,
    loadingSportPref,
    navigate,
  ]);

  // 根據 tab 篩選賽事
  const getEmptyMessage = () => {
    if (activeTab === "active") {
      return "您還沒有進行中的賽事";
    }
    return "還沒有已結束或已取消的賽事";
  };

  return (
    <div className={styles.organizerHome}>
      <Button
        variant="primary"
        onClick={() => navigate("/organizer/create")}
        className={styles.createButton}
      >
        <Plus size={20} />
      </Button>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        enableSwipe={true}
        swipeThreshold={60}
      >
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
              <p>{getEmptyMessage()}</p>
              {/* {activeTab === "active" && (
                <Button
                  variant="secondary"
                  onClick={() => navigate("/organizer/create")}
                >
                  <Plus size={20} />
                  開始建立
                </Button>
              )} */}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default OrganizerHome;
