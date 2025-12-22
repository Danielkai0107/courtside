import React, { useEffect, useState } from "react";
import { subscribeTournaments } from "../services/tournamentService";
import { subscribeMatchesByTournament } from "../services/matchService";
import { getCourts } from "../services/courtService";
import { getActiveSports } from "../services/sportService";
import { useSportPreference } from "../hooks/useSportPreference";
import TournamentMatchesCard from "../components/features/TournamentMatchesCard";
import Select from "../components/common/Select";
import Loading from "../components/common/Loading";
import styles from "./Home.module.scss";
import type { Tournament, Match, Sport } from "../types";

const Home: React.FC = () => {
  const {
    preferredSportId,
    updateSportPreference,
    loading: loadingSportPref,
  } = useSportPreference();
  const [liveTournaments, setLiveTournaments] = useState<Tournament[]>([]);
  const [tournamentMatches, setTournamentMatches] = useState<
    Record<string, Match[]>
  >({});
  const [tournamentCourts, setTournamentCourts] = useState<
    Record<string, any[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);

  // Load sports from database
  useEffect(() => {
    const loadSports = async () => {
      try {
        setLoadingSports(true);
        const data = await getActiveSports();
        setSports(data);
      } catch (error) {
        console.error("Failed to load sports:", error);
      } finally {
        setLoadingSports(false);
      }
    };

    loadSports();
  }, []);

  useEffect(() => {
    if (loadingSportPref) return; // 等待偏好設定載入完成

    setLoading(true);
    setTournamentMatches({});
    setLiveTournaments([]);

    let matchUnsubscribers: (() => void)[] = [];
    let tournamentUnsubscriber: (() => void) | null = null;

    try {
      const filters: any = {
        status: [
          "REGISTRATION_CLOSED", // 已截止報名（可能有比賽）
          "ONGOING", // 進行中
        ],
      };

      // 如果選擇特定球類，加入 sportId 篩選
      if (preferredSportId !== "all") {
        filters.sportId = preferredSportId;
      }

      tournamentUnsubscriber = subscribeTournaments(filters, (tournaments) => {
        // Remove duplicates by id
        const uniqueTournaments = Array.from(
          new Map(tournaments.map((t) => [t.id, t])).values()
        );

        setLiveTournaments(uniqueTournaments);
        setLoading(false);

        // Clean up previous match subscriptions
        matchUnsubscribers.forEach((unsub) => unsub());
        matchUnsubscribers = [];

        // Subscribe to live matches for each tournament
        uniqueTournaments.forEach((tournament) => {
          // 載入場地
          getCourts(tournament.id).then((courtsData) => {
            setTournamentCourts((prev) => ({
              ...prev,
              [tournament.id]: courtsData,
            }));
          });

          const matchUnsub = subscribeMatchesByTournament(
            tournament.id,
            (matches) => {
              // 只顯示正在計分的場次（紀錄員已開始）
              const liveMatchesOnly = matches.filter(
                (m) => m.status === "IN_PROGRESS"
              );

              setTournamentMatches((prev) => ({
                ...prev,
                [tournament.id]: liveMatchesOnly,
              }));
            }
          );
          matchUnsubscribers.push(matchUnsub);
        });
      });
    } catch (error: any) {
      console.error("Failed to load tournaments:", error);
      setLoading(false);
      setLiveTournaments([]);

      if (error?.message?.includes("index")) {
        console.log(
          "Firestore 索引正在建立中，請稍候 1-2 分鐘後重新整理頁面"
        );
      }
    }

    return () => {
      // Clean up tournament subscription
      if (tournamentUnsubscriber) {
        tournamentUnsubscriber();
      }
      // Clean up all match subscriptions
      matchUnsubscribers.forEach((unsub) => unsub());
    };
  }, [preferredSportId, loadingSportPref]);

  // 只顯示有進行中場次的賽事
  const tournamentsWithLiveMatches = liveTournaments.filter((tournament) => {
    const matches = tournamentMatches[tournament.id] || [];
    return matches.length > 0;
  });

  const handleSportPreferenceChange = async (sportId: string) => {
    try {
      await updateSportPreference(sportId);
    } catch (error) {
      console.error("Failed to update sport preference:", error);
    }
  };

  const sportOptions = [
    { value: "all", label: "全部項目" },
    ...sports.map((sport) => ({
      value: sport.id,
      label: `${sport.icon} ${sport.name}`,
    })),
  ];

  return (
    <div className={styles.home}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>CourtSide</h1>
        {!loadingSports && !loadingSportPref && sportOptions.length > 0 && (
          <Select
            options={sportOptions}
            value={preferredSportId}
            onChange={handleSportPreferenceChange}
            className={styles.sportSelector}
          />
        )}
      </div>

      {loading || loadingSportPref ? (
        <Loading />
      ) : tournamentsWithLiveMatches.length > 0 ? (
        <div className={styles.tournamentList}>
          {tournamentsWithLiveMatches.map((tournament) => (
            <TournamentMatchesCard
              key={tournament.id}
              tournament={tournament}
              matches={tournamentMatches[tournament.id] || []}
              courts={tournamentCourts[tournament.id] || []}
              showLiveTag={true}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>目前沒有正在計分的比賽</p>
        </div>
      )}
    </div>
  );
};

export default Home;
