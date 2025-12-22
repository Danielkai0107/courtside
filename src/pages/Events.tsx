import React, { useEffect, useState } from "react";
import { getTournaments } from "../services/tournamentService";
import { useSportPreference } from "../hooks/useSportPreference";
import Tabs from "../components/common/Tabs";
import TournamentCard from "../components/features/TournamentCard";
import Loading from "../components/common/Loading";
import IndexBuildingNotice from "../components/common/IndexBuildingNotice";
import styles from "./Events.module.scss";
import type { Tournament } from "../types";

const Events: React.FC = () => {
  const { preferredSportId, loading: loadingSportPref } = useSportPreference();
  const [activeTab, setActiveTab] = useState<string>("ongoing");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexBuilding, setIndexBuilding] = useState(false);

  const tabs = [
    { id: "ongoing", label: "公開報名中" },
    { id: "schedule", label: "錦標賽" },
  ];

  useEffect(() => {
    if (loadingSportPref) return; // 等待偏好設定載入完成

    let isMounted = true;

    const loadTournaments = async () => {
      setLoading(true);
      try {
        const filters: any = {};

        // 根據 tab 過濾狀態
        if (activeTab === "ongoing") {
          // 正在進行：顯示還在開放報名中的活動
          filters.status = ["REGISTRATION_OPEN"];
        } else if (activeTab === "schedule") {
          // 賽程：顯示已報名截止的所有活動（包含進行中和已完成）
          filters.status = ["REGISTRATION_CLOSED", "ONGOING", "COMPLETED"];
        }

        if (preferredSportId !== "all") {
          filters.sportId = preferredSportId;
        }

        const data = await getTournaments(filters);

        console.log(
          `Events: Loaded ${data.length} tournaments for tab: ${activeTab}`
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
            `Events: After dedup ${uniqueTournaments.length} tournaments`
          );
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
  }, [preferredSportId, loadingSportPref, activeTab]);

  return (
    <div className={styles.events}>
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
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>
                {activeTab === "ongoing"
                  ? "目前沒有開放報名中的賽事"
                  : "目前沒有進行中或已完成的賽事"}
              </p>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default Events;
