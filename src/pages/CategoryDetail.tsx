import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, UserRound } from "lucide-react";
import { getTournament } from "../services/tournamentService";
import { getPlayers } from "../services/registrationService";
import { getMatchesByTournament } from "../services/matchService";
import { getCategoryById } from "../services/categoryService";
import { getTeamsByCategory } from "../services/teamService";
import { getCourts } from "../services/courtService";
import { ChevronRight } from "lucide-react";
import {
  calculateGroupStandings,
  formatPointDifference,
} from "../services/standingsService";
import type { Category } from "../types";
import Tabs from "../components/common/Tabs";
import Card from "../components/common/Card";
import Loading from "../components/common/Loading";
import styles from "./CategoryDetail.module.scss";
import type { Tournament } from "../types";

const CategoryDetail: React.FC = () => {
  const { id, categoryId } = useParams<{ id: string; categoryId: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("groups");
  const [bracketTab, setBracketTab] = useState("qf");
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Helper function to get court name
  const getCourtName = (courtId: string | null) => {
    if (!courtId) return "待分配";
    const court = courts.find((c) => c.id === courtId);
    const name = court?.name || courtId;
    console.log(`getCourtName(${courtId}) → ${name}`, {
      court,
      courtsCount: courts.length,
    });
    return name;
  };

  const mainTabs = [
    { id: "groups", label: "小組" },
    { id: "bracket", label: "對陣圖" },
    { id: "players", label: "球員" },
  ];

  // 動態生成對陣圖的 tabs（根據比賽輪次）
  const [bracketTabs, setBracketTabs] = useState<
    { id: string; label: string; round: number }[]
  >([]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        const tournamentData = await getTournament(id);
        setTournament(tournamentData);

        // 載入分類資料
        if (categoryId) {
          const categoryData = await getCategoryById(id, categoryId);
          setCategory(categoryData);

          if (categoryData) {
            // 根據分類類型載入參賽者
            if (categoryData.matchType === "singles") {
              const playersData = await getPlayers(id);
              setPlayers(playersData.filter((p) => p.status === "confirmed"));
            } else {
              const teamsData = await getTeamsByCategory(
                id,
                categoryId,
                "confirmed"
              );
              setTeams(teamsData);
            }
          }
        }

        // 載入比賽數據（過濾該分類）
        const matchesData = await getMatchesByTournament(id);
        const categoryMatches = categoryId
          ? matchesData.filter((m: any) => m.categoryId === categoryId)
          : matchesData;
        setMatches(categoryMatches);

        // 載入場地
        const courtsData = await getCourts(id);
        console.log(`載入場地：${courtsData.length} 個`, courtsData);
        setCourts(courtsData);

        // 根據比賽數據動態生成 bracket tabs（使用 roundLabel）
        if (categoryMatches.length > 0) {
          const knockoutMatches = categoryMatches.filter(
            (m: any) => m.stage === "knockout"
          );

          if (knockoutMatches.length > 0) {
            // 收集所有不同的 roundLabel
            const roundLabels = Array.from(
              new Set(
                knockoutMatches.map((m: any) => m.roundLabel).filter(Boolean)
              )
            );

            const tabs = [];
            const labelOrder = ["R32", "R16", "QF", "SF", "3RD", "FI"];

            // 按標準順序添加 tabs
            for (const label of labelOrder) {
              if (roundLabels.includes(label)) {
                tabs.push({
                  id: label.toLowerCase(),
                  label: label,
                  round: 0, // 不再使用 round 數字
                });
              }
            }

            setBracketTabs(tabs);
            if (tabs.length > 0) {
              setBracketTab(tabs[0].id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load category data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!tournament) {
    return (
      <div className={styles.error}>
        <p>找不到此類別</p>
      </div>
    );
  }

  // 根據選中的 tab 過濾比賽（使用 roundLabel）
  const getFilteredMatches = () => {
    const knockoutMatches = matches.filter((m: any) => m.stage === "knockout");

    if (!bracketTab) return knockoutMatches;

    // 使用 roundLabel 過濾（更準確）
    const selectedRoundLabel = bracketTab.toUpperCase();
    return knockoutMatches.filter(
      (m: any) => m.roundLabel === selectedRoundLabel
    );
  };

  // 獲取小組賽比賽（按 groupLabel 分組）
  const getGroupMatches = () => {
    const groupMatches = matches.filter((m: any) => m.stage === "group");

    // 按 groupLabel 分組
    const groups: Record<string, any[]> = {};
    groupMatches.forEach((match: any) => {
      const label = match.groupLabel || "A";
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(match);
    });

    return groups;
  };

  const filteredMatches = getFilteredMatches();
  const groupedMatches = getGroupMatches();

  return (
    <div className={styles.categoryDetail}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2 className={styles.headerTitle}>錦標賽</h2>
        <div className={styles.headerSpacer} />
      </div>

      <div className={styles.content}>
        <Tabs tabs={mainTabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className={styles.tabContent}>
          {activeTab === "groups" && (
            <div className={styles.groupsTab}>
              {Object.keys(groupedMatches).length > 0 ? (
                Object.keys(groupedMatches)
                  .sort()
                  .map((groupLabel) => {
                    // 獲取該小組的參賽者
                    const groupParticipants = Array.from(
                      new Set(
                        groupedMatches[groupLabel]
                          .flatMap((m: any) => [
                            { id: m.player1Id, name: m.player1Name },
                            { id: m.player2Id, name: m.player2Name },
                          ])
                          .filter((p) => p.id && p.name)
                      )
                    ).map((p) => ({ id: p.id!, name: p.name! }));

                    // 計算積分榜
                    const standings = calculateGroupStandings(
                      groupedMatches[groupLabel],
                      groupParticipants
                    );

                    const isExpanded = expandedGroup === groupLabel;

                    return (
                      <Card key={groupLabel} className={styles.groupCard}>
                        <div className={styles.groupHeader}>
                          <h3 className={styles.groupTitle}>
                            Group {groupLabel}
                          </h3>
                          <button
                            className={styles.viewMatchesButton}
                            onClick={() =>
                              setExpandedGroup(isExpanded ? null : groupLabel)
                            }
                          >
                            {isExpanded ? "收起" : "查看比賽"}
                            <ChevronRight size={18} />
                          </button>
                        </div>

                        {!isExpanded ? (
                          // 顯示積分榜
                          <div className={styles.standingsTable}>
                            <div className={styles.standingsHeader}>
                              <span className={styles.colTeam}>球員/隊伍</span>
                              <span className={styles.colPts}>PTS</span>
                              <span className={styles.colStat}>W</span>
                              <span className={styles.colStat}>L</span>
                              <span className={styles.colPd}>PD</span>
                            </div>
                            {standings.map((standing, index) => (
                              <div
                                key={standing.teamId}
                                className={`${styles.standingsRow} ${
                                  index < 2 ? styles.qualified : ""
                                }`}
                              >
                                <span className={styles.colTeam}>
                                  <span className={styles.teamName}>
                                    {standing.teamName
                                      .split(" / ")
                                      .map((playerName, idx) => (
                                        <span
                                          key={idx}
                                          className={styles.playerLine}
                                        >
                                          {playerName}
                                        </span>
                                      ))}
                                  </span>
                                </span>
                                <span className={styles.colPts}>
                                  {standing.points}
                                </span>
                                <span className={styles.colStat}>
                                  {standing.wins}
                                </span>
                                <span className={styles.colStatlosses}>
                                  {standing.losses}
                                </span>
                                <span
                                  className={`${styles.colPd} ${
                                    standing.pointDifference > 0
                                      ? styles.positive
                                      : standing.pointDifference < 0
                                      ? styles.negative
                                      : ""
                                  }`}
                                >
                                  {formatPointDifference(
                                    standing.pointDifference
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // 顯示比賽列表
                          <div className={styles.groupMatches}>
                            {groupedMatches[groupLabel].map((match: any) => (
                              <div
                                key={match.id}
                                className={styles.groupMatchRow}
                              >
                                <div className={styles.matchInfo}>
                                  <span className={styles.matchDate}>
                                    {match.scheduledTime
                                      ? new Date(
                                          match.scheduledTime.toDate()
                                        ).toLocaleDateString("zh-TW")
                                      : "待排程"}
                                  </span>
                                  <span className={styles.matchCourt}>
                                    {getCourtName(match.courtId)}
                                  </span>
                                </div>
                                <div className={styles.matchPlayers}>
                                  <div className={styles.matchPlayer}>
                                    <span>{match.player1Name}</span>
                                    <span className={styles.matchScore}>
                                      {match.status === "COMPLETED"
                                        ? match.score?.player1 || 0
                                        : "-"}
                                    </span>
                                  </div>
                                  <div className={styles.matchPlayer}>
                                    <span>{match.player2Name}</span>
                                    <span className={styles.matchScore}>
                                      {match.status === "COMPLETED"
                                        ? match.score?.player2 || 0
                                        : "-"}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`${styles.matchStatus} ${
                                    styles[match.status?.toLowerCase() || ""]
                                  }`}
                                >
                                  {match.status === "COMPLETED"
                                    ? "已完成"
                                    : match.status === "IN_PROGRESS"
                                    ? "進行中"
                                    : match.status === "SCHEDULED"
                                    ? "已排程"
                                    : "待開始"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })
              ) : (
                <Card>
                  <p className={styles.emptyMessage}>
                    此分類使用純淘汰賽，無小組賽階段
                  </p>
                </Card>
              )}
            </div>
          )}

          {activeTab === "bracket" && (
            <div className={styles.bracketTab}>
              {bracketTabs.length > 0 ? (
                <Tabs
                  tabs={bracketTabs}
                  activeTab={bracketTab}
                  onChange={setBracketTab}
                  enableSwipe={true}
                  swipeThreshold={60}
                >
                  <div className={styles.bracketContent}>
                    {filteredMatches.length > 0 ? (
                      <div className={styles.matchesList}>
                        {filteredMatches.map((match: any) => (
                          <Card key={match.id} className={styles.matchCard}>
                            <div className={styles.matchHeader}>
                              <span className={styles.courtLabel}>
                                {getCourtName(match.courtId)}
                              </span>
                              <span
                                className={`${styles.matchStatus} ${
                                  styles[match.status?.toLowerCase() || ""]
                                }`}
                              >
                                {match.status === "COMPLETED"
                                  ? "已完成"
                                  : match.status === "IN_PROGRESS"
                                  ? "進行中"
                                  : match.status === "SCHEDULED"
                                  ? "已排程"
                                  : "待開始"}
                              </span>
                            </div>
                            <div className={styles.matchPlayers}>
                              <div className={styles.playerRow}>
                                <span className={styles.playerName}>
                                  {match.player1Name || "待定"}
                                </span>
                                {match.status === "COMPLETED" &&
                                  match.winnerId === match.player1Id && (
                                    <span className={styles.winnerBadge}>
                                      勝
                                    </span>
                                  )}
                                <span className={styles.playerScore}>
                                  {match.score?.player1 || 0}
                                </span>
                              </div>
                              <div className={styles.playerRow}>
                                <span className={styles.playerName}>
                                  {match.player2Name || "待定"}
                                </span>
                                {match.status === "COMPLETED" &&
                                  match.winnerId === match.player2Id && (
                                    <span className={styles.winnerBadge}>
                                      勝
                                    </span>
                                  )}
                                <span className={styles.playerScore}>
                                  {match.score?.player2 || 0}
                                </span>
                              </div>
                            </div>
                            {match.scheduledTime && (
                              <div className={styles.matchTime}>
                                {new Date(
                                  match.scheduledTime.toDate()
                                ).toLocaleString("zh-TW", {
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <p className={styles.emptyMessage}>此輪次暫無比賽</p>
                      </Card>
                    )}
                  </div>
                </Tabs>
              ) : (
                <Card>
                  <p className={styles.emptyMessage}>尚未產生對陣圖</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === "players" && (
            <div className={styles.playersTab}>
              <div className={styles.playersHeader}>
                <span className={styles.playersLabel}>
                  #{" "}
                  {category?.matchType === "doubles" ? "所有隊伍" : "所有選手"}
                </span>
                <span className={styles.playersCount}>
                  {category?.matchType === "doubles"
                    ? `${teams.length} 支隊伍`
                    : `${players.length} 位選手`}
                </span>
              </div>

              <div className={styles.playersList}>
                {category?.matchType === "singles" ? (
                  <>
                    {players.map((player, index) => (
                      <Card key={player.id} className={styles.playerCard}>
                        <div className={styles.playerRank}>{index + 1}.</div>
                        <div className={styles.playerInfo}>
                          <div className={styles.playerAvatar}>
                            {player.photoURL ? (
                              <img src={player.photoURL} alt={player.name} />
                            ) : (
                              <div className={styles.avatarPlaceholder}>
                                <UserRound size={20} color="#ffffff" />
                              </div>
                            )}
                          </div>
                          <div className={styles.playerName}>{player.name}</div>
                        </div>
                      </Card>
                    ))}
                    {players.length === 0 && (
                      <Card>
                        <p className={styles.emptyMessage}>尚無選手報名</p>
                      </Card>
                    )}
                  </>
                ) : (
                  <>
                    {teams.map((team, index) => (
                      <Card key={team.id} className={styles.playerCard}>
                        <div className={styles.playerRank}>{index + 1}.</div>
                        <div className={styles.teamInfoContainer}>
                          <div className={styles.teamInfo}>
                            <div className={styles.teamPlayers}>
                              <div className={styles.playerAvatar}>
                                {team.player1PhotoURL ? (
                                  <img
                                    src={team.player1PhotoURL}
                                    alt={team.player1Name}
                                  />
                                ) : (
                                  <div className={styles.avatarPlaceholder}>
                                    {team.player1Name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className={styles.teamNames}>
                                {team.player1Name}
                              </div>
                            </div>
                          </div>
                          <div className={styles.teamInfo}>
                            <div className={styles.teamPlayers}>
                              <div className={styles.playerAvatar}>
                                {team.player2PhotoURL ? (
                                  <img
                                    src={team.player2PhotoURL}
                                    alt={team.player2Name}
                                  />
                                ) : (
                                  <div className={styles.avatarPlaceholder}>
                                    {team.player2Name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className={styles.teamNames}>
                                {team.player2Name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {teams.length === 0 && (
                      <Card>
                        <p className={styles.emptyMessage}>尚無隊伍報名</p>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryDetail;
