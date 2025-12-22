import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserAcceptedInvitations } from "../../services/staffService";
import { getTournament } from "../../services/tournamentService";
import { useAuth } from "../../contexts/AuthContext";
import { useSportPreference } from "../../hooks/useSportPreference";
import Tabs from "../../components/common/Tabs";
import TournamentCard from "../../components/features/TournamentCard";
import Loading from "../../components/common/Loading";
import styles from "./ScorerHome.module.scss";
import type { Tournament } from "../../types";

const ScorerHome: React.FC = () => {
  const { currentUser } = useAuth();
  const { preferredSportId, loading: loadingSportPref } = useSportPreference();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ongoing");
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  const tabs = [
    { id: "ongoing", label: "我的任務" },
    { id: "history", label: "過去記錄" },
  ];

  useEffect(() => {
    if (!currentUser || !currentUser.email || loadingSportPref) {
      if (!currentUser || !currentUser.email) {
        navigate("/profile");
      }
      return;
    }

    const userEmail = currentUser.email;
    let isMounted = true;

    const loadData = async () => {
      // Load accepted tournaments
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

          setMyTournaments(filteredTournaments);
          setLoadingTournaments(false);
        }
      } catch (error) {
        console.error("Failed to load tournaments:", error);
        if (isMounted) {
          setLoadingTournaments(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, navigate, preferredSportId, loadingSportPref]);

  return (
    <div className={styles.scorerHome}>
      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        enableSwipe={true}
        swipeThreshold={60}
      >
        {loadingTournaments || loadingSportPref ? (
          <Loading />
        ) : (
          (() => {
            const filteredTournaments = myTournaments.filter((t) => {
              if (activeTab === "ongoing") {
                return (
                  t.status === "ONGOING" ||
                  t.status === "REGISTRATION_CLOSED" ||
                  t.status === "REGISTRATION_OPEN"
                );
              } else {
                return t.status === "COMPLETED";
              }
            });

            return filteredTournaments.length > 0 ? (
              <div className={styles.tournamentList}>
                {filteredTournaments.map((tournament) => (
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
                <p>
                  {activeTab === "ongoing"
                    ? "目前沒有正在進行的賽事"
                    : "目前沒有過去的賽事記錄"}
                </p>
              </div>
            );
          })()
        )}
      </Tabs>
    </div>
  );
};

export default ScorerHome;
