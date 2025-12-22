import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserRegisteredTournaments } from "../services/registrationService";
import { useAuth } from "../contexts/AuthContext";
import Tabs from "../components/common/Tabs";
import TournamentCard from "../components/features/TournamentCard";
import Loading from "../components/common/Loading";
import Button from "../components/common/Button";
import styles from "./MyGames.module.scss";
import type { Tournament } from "../types";

const MyGames: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: "active", label: "我的比賽" },
    { id: "history", label: "參加紀錄" },
  ];

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // 載入所有已報名的賽事
        const registrations = await getUserRegisteredTournaments(
          currentUser.uid
        );

        console.log("📊 [MyGames] 用戶報名資料:", {
          uid: currentUser.uid,
          totalRegistrations: registrations.length,
          registrations: registrations.map((r) => ({
            tournamentId: r.tournamentId,
            tournamentName: r.tournament?.name,
            status: r.tournament?.status,
            playerStatus: r.player.status,
            playerUid: r.player.uid,
          })),
        });

        const allTournaments = registrations
          .map((r) => r.tournament)
          .filter((t): t is Tournament => t !== null);

        console.log("🎯 [MyGames] 所有賽事:", {
          total: allTournaments.length,
          tournaments: allTournaments.map((t) => ({
            id: t.id,
            name: t.name,
            status: t.status,
          })),
        });

        if (activeTab === "active") {
          // 我的比賽：包含報名中、進行中的賽事
          const tournaments = allTournaments.filter((t) =>
            [
              "DRAFT",
              "REGISTRATION_OPEN",
              "REGISTRATION_CLOSED",
              "ONGOING",
            ].includes(t.status)
          );
          console.log("✅ [MyGames] 我的比賽:", tournaments.length);
          setActiveTournaments(tournaments);
        } else {
          // 參加紀錄：已完成的賽事
          const tournaments = allTournaments.filter(
            (t) => t.status === "COMPLETED"
          );
          console.log("📖 [MyGames] 參加紀錄:", tournaments.length);
          setPastTournaments(tournaments);
        }
      } catch (error) {
        console.error("❌ [MyGames] 載入失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, activeTab]);

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
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        enableSwipe={true}
        swipeThreshold={60}
      >
        <div className={styles.content}>
          {loading ? (
            <Loading />
          ) : activeTab === "active" ? (
            activeTournaments.length > 0 ? (
              <div className={styles.tournamentList}>
                {activeTournaments.map((tournament) => (
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
          ) : pastTournaments.length > 0 ? (
            <div className={styles.tournamentList}>
              {pastTournaments.map((tournament) => (
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
              <p>目前沒有參加紀錄</p>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default MyGames;
