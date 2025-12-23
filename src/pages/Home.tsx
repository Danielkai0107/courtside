import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import clsx from "clsx";
import {
  subscribeTournaments,
  getTournaments,
} from "../services/tournamentService";
import { subscribeMatchesByTournament } from "../services/matchService";
import { getCourts } from "../services/courtService";
import { getActiveSports } from "../services/sportService";
import { useSportPreference } from "../hooks/useSportPreference";
import TournamentMatchesCard from "../components/features/TournamentMatchesCard";
import TournamentBanner from "../components/features/TournamentBanner";
import Tabs from "../components/common/Tabs";
import Loading from "../components/common/Loading";
import IndexBuildingNotice from "../components/common/IndexBuildingNotice";
import SportSelectionModal from "../components/common/SportSelectionModal";
import styles from "./Home.module.scss";
import type { Tournament, Match, Sport } from "../types";

const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    preferredSportId,
    updateSportPreference,
    loading: loadingSportPref,
    needsFirstSelection,
  } = useSportPreference();
  // 從 URL 參數讀取頁籤狀態，如果沒有則默認為 "live"
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "live");
  const [liveTournaments, setLiveTournaments] = useState<Tournament[]>([]);
  const [exploreTournaments, setExploreTournaments] = useState<Tournament[]>(
    []
  );
  const [tournamentMatches, setTournamentMatches] = useState<
    Record<string, Match[]>
  >({});
  const [tournamentCourts, setTournamentCourts] = useState<
    Record<string, any[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [indexBuilding, setIndexBuilding] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [showSportModal, setShowSportModal] = useState(false);

  const tabs = [
    { id: "live", label: "直播中" },
    { id: "explore", label: "探索賽事" },
  ];

  // 切換頁籤時更新 URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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

  // 載入直播中的賽事
  useEffect(() => {
    if (loadingSportPref || activeTab !== "live") return;

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

      // 加入 sportId 篩選
      if (preferredSportId) {
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
              // 只顯示正在計分的場次（紀錄員已開始），且不是佔位符
              const liveMatchesOnly = matches.filter(
                (m) => m.status === "IN_PROGRESS" && !m.isPlaceholder
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
        console.log("Firestore 索引正在建立中，請稍候 1-2 分鐘後重新整理頁面");
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
  }, [preferredSportId, loadingSportPref, activeTab]);

  // 載入探索賽事
  useEffect(() => {
    if (loadingSportPref || activeTab !== "explore") return;

    let isMounted = true;

    const loadExploreTournaments = async () => {
      setLoading(true);
      try {
        const filters: any = {
          status: [
            "REGISTRATION_OPEN",
            "REGISTRATION_CLOSED",
            "ONGOING",
            "COMPLETED",
          ],
        };

        if (preferredSportId) {
          filters.sportId = preferredSportId;
        }

        const data = await getTournaments(filters);

        if (isMounted) {
          // Remove duplicates by id
          const tournamentMap = new Map<string, Tournament>();
          data.forEach((t) => {
            if (!tournamentMap.has(t.id)) {
              tournamentMap.set(t.id, t);
            }
          });
          const uniqueTournaments = Array.from(tournamentMap.values());

          setExploreTournaments(uniqueTournaments);
          setIndexBuilding(false);
        }
      } catch (error: any) {
        console.error("Failed to load tournaments:", error);

        if (isMounted) {
          if (error?.message?.includes("index")) {
            console.log(
              "Firestore 索引正在建立中，請稍候 1-2 分鐘後重新整理頁面"
            );
            setIndexBuilding(true);
          }
          setExploreTournaments([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadExploreTournaments();

    return () => {
      isMounted = false;
    };
  }, [preferredSportId, loadingSportPref, activeTab]);

  // 只顯示有進行中場次的賽事
  const tournamentsWithLiveMatches = liveTournaments.filter((tournament) => {
    const matches = tournamentMatches[tournament.id] || [];
    return matches.length > 0;
  });

  const handleSportPreferenceChange = async (
    sportId: string,
    sportName: string
  ) => {
    try {
      await updateSportPreference(sportId, sportName);
      setShowSportModal(false);
    } catch (error) {
      console.error("Failed to update sport preference:", error);
    }
  };

  // 按日期分組賽事
  const getTournamentsByDate = () => {
    const groups = new Map<string, Tournament[]>();

    exploreTournaments.forEach((tournament) => {
      // 優先使用 startDate，向下相容 date
      const tournamentDate = tournament.startDate || tournament.date;
      if (!tournamentDate) return;

      const date = tournamentDate.toDate();
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(tournament);
    });

    // 排序並轉換為陣列
    return Array.from(groups.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([dateKey, tournaments]) => {
        const date = new Date(dateKey);
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const dateOnly = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );

        return {
          dateKey,
          displayDate: `${date.getMonth() + 1}/${date.getDate()}`,
          isPast: dateOnly < today,
          isToday: dateOnly.getTime() === today.getTime(),
          tournaments,
        };
      });
  };

  // 檢查賽事是否已結束或過期
  const isTournamentExpired = (tournament: Tournament) => {
    // 優先使用 endDate，向下相容 date
    const tournamentEndDate = tournament.endDate || tournament.date;
    if (!tournamentEndDate) return false;
    const now = new Date();
    const tournamentDate = tournamentEndDate.toDate();
    const tournamentEndOfDay = new Date(
      tournamentDate.getFullYear(),
      tournamentDate.getMonth(),
      tournamentDate.getDate(),
      23,
      59,
      59
    );
    return (
      tournamentEndOfDay < now ||
      tournament.status === "COMPLETED" ||
      tournament.status === "CANCELLED"
    );
  };

  // 獲取當前選擇的運動項目顯示文字
  const getCurrentSportDisplay = () => {
    if (!preferredSportId) return "";
    const sport = sports.find((s) => s.id === preferredSportId);
    return sport ? `${sport.icon} ${sport.name}` : "";
  };

  return (
    <div className={styles.home}>
      {/* 首次選擇項目彈窗 */}
      <SportSelectionModal
        isOpen={needsFirstSelection && !loadingSportPref}
        onSelect={updateSportPreference}
        title="選擇你的運動項目"
      />

      {/* 切換項目彈窗 */}
      <SportSelectionModal
        isOpen={showSportModal}
        onSelect={handleSportPreferenceChange}
        currentSportId={preferredSportId}
        title="切換運動項目"
      />

      <div className={styles.header}>
        <h1 className={styles.headerTitle}>CourtSide</h1>
        {!loadingSports && !loadingSportPref && preferredSportId && (
          <button
            className={styles.sportButton}
            onClick={() => setShowSportModal(true)}
          >
            {getCurrentSportDisplay()}
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

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        enableSwipe={true}
        swipeThreshold={60}
      >
        <div className={styles.content}>
          {loading || loadingSportPref ? (
            <Loading />
          ) : activeTab === "live" ? (
            tournamentsWithLiveMatches.length > 0 ? (
              <div className={styles.liveTournamentList}>
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
            )
          ) : indexBuilding ? (
            <IndexBuildingNotice />
          ) : exploreTournaments.length > 0 ? (
            <div className={styles.exploreTournamentList}>
              {getTournamentsByDate().map((dateGroup, index) => (
                <div key={dateGroup.dateKey} className={styles.dateGroup}>
                  <div className={styles.dateColumn}>
                    <div
                      className={clsx(styles.dateText, {
                        [styles.past]: dateGroup.isPast,
                        [styles.today]: dateGroup.isToday,
                      })}
                    >
                      {dateGroup.displayDate}
                    </div>
                    <div className={styles.timeline}>
                      <div className={styles.dot}></div>
                      {index < getTournamentsByDate().length - 1 && (
                        <div className={styles.line}></div>
                      )}
                    </div>
                  </div>
                  <div className={styles.tournamentsColumn}>
                    {dateGroup.tournaments.map((tournament) => (
                      <TournamentBanner
                        key={tournament.id}
                        tournament={tournament}
                        fromTab={activeTab}
                        className={
                          isTournamentExpired(tournament)
                            ? styles.expiredTournament
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>目前沒有賽事</p>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default Home;
