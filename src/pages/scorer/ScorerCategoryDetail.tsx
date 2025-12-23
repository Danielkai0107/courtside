// 紀錄員分類詳情頁面
// 複用 CategoryDetail 的 UI，但點擊比賽導航到計分頁面

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, UserRound } from "lucide-react";
import { getTournament } from "../../services/tournamentService";
import { getPlayers } from "../../services/registrationService";
import { getMatchesByTournament } from "../../services/matchService";
import { getCategoryById } from "../../services/categoryService";
import { getTeamsByCategory } from "../../services/teamService";
import { getCourts } from "../../services/courtService";
import {
  calculateGroupStandings,
  formatPointDifference,
} from "../../services/standingsService";
import type { Category } from "../../types";
import Tabs from "../../components/common/Tabs";
import Card from "../../components/common/Card";
import Loading from "../../components/common/Loading";
import styles from "../CategoryDetail.module.scss"; // 複用樣式
import type { Tournament } from "../../types";

const ScorerCategoryDetail: React.FC = () => {
  const { id, categoryId } = useParams<{ id: string; categoryId: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("groups");
  const [bracketTab, setBracketTab] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Helper function to get court name
  const getCourtName = (courtId: string | null) => {
    if (!courtId) return "待分配";
    const court = courts.find((c) => c.id === courtId);
    return court?.name || courtId;
  };

  const mainTabs = [
    { id: "groups", label: "小組" },
    { id: "bracket", label: "對陣圖" },
    { id: "players", label: "球員" },
  ];

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        const tournamentData = await getTournament(id);
        setTournament(tournamentData);

        if (categoryId) {
          const categoryData = await getCategoryById(id, categoryId);
          setCategory(categoryData);

          if (categoryData) {
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

        const matchesData = await getMatchesByTournament(id);
        const categoryMatches = categoryId
          ? matchesData.filter((m: any) => m.categoryId === categoryId && !m.isPlaceholder)
          : matchesData.filter((m: any) => !m.isPlaceholder);
        setMatches(categoryMatches);

        // 載入場地
        const courtsData = await getCourts(id);
        setCourts(courtsData);

        // 生成對陣圖 tabs
        if (categoryMatches.length > 0) {
          const knockoutMatches = categoryMatches.filter(
            (m: any) => m.stage === "knockout"
          );

          if (knockoutMatches.length > 0) {
            const roundLabels = Array.from(
              new Set(
                knockoutMatches.map((m: any) => m.roundLabel).filter(Boolean)
              )
            );

            const labelOrder = ["R32", "R16", "QF", "SF", "3RD", "FI"];
            const tabs = labelOrder
              .filter((label) => roundLabels.includes(label))
              .map((label) => label.toLowerCase());

            if (tabs.length > 0) {
              setBracketTab(tabs[0]);
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
  }, [id, categoryId]);

  const getGroupMatches = () => {
    const groupMatches = matches.filter((m: any) => m.stage === "group");
    const groups: Record<string, any[]> = {};
    groupMatches.forEach((match: any) => {
      const label = match.groupLabel || "A";
      if (!groups[label]) groups[label] = [];
      groups[label].push(match);
    });
    return groups;
  };

  const knockoutMatches = matches.filter((m: any) => m.stage === "knockout");
  const bracketTabs = (() => {
    if (knockoutMatches.length === 0) return [];
    const roundLabels = Array.from(
      new Set(knockoutMatches.map((m: any) => m.roundLabel).filter(Boolean))
    );
    const labelOrder = ["R32", "R16", "QF", "SF", "3RD", "FI"];
    return labelOrder
      .filter((label) => roundLabels.includes(label))
      .map((label) => ({ id: label.toLowerCase(), label: label }));
  })();

  const filteredKnockoutMatches = bracketTab
    ? knockoutMatches.filter(
        (m: any) => m.roundLabel === bracketTab.toUpperCase()
      )
    : knockoutMatches;

  const groupedMatches = getGroupMatches();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!tournament || !category) {
    return (
      <div className={styles.error}>
        <p>找不到此類別</p>
      </div>
    );
  }

  return (
    <div className={styles.categoryDetail}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(`/scorer/tournaments/${id}`)}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className={styles.headerTitle}>{category.name}</h2>
        <div className={styles.headerSpacer} />
      </div>

      <div className={styles.content}>
        <Tabs tabs={mainTabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className={styles.tabContent}>
          {/* 小組 Tab */}
          {activeTab === "groups" && (
            <div className={styles.groupsTab}>
              {Object.keys(groupedMatches).length > 0 ? (
                Object.keys(groupedMatches)
                  .sort()
                  .map((groupLabel) => {
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
                          // 積分榜
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
                          // 顯示比賽列表（點擊進入計分）
                          <div className={styles.groupMatches}>
                            {groupedMatches[groupLabel].map((match: any) => {
                              // 檢查是否有雙方選手
                              const hasPlayers =
                                match.player1Name && match.player2Name;
                              const isPendingPlayer =
                                match.status === "PENDING_PLAYER";
                              const isClickable =
                                hasPlayers && !isPendingPlayer;

                              return (
                                <div
                                  key={match.id}
                                  className={styles.groupMatchRow}
                                  onClick={() =>
                                    isClickable &&
                                    navigate(`/scorer/matches/${match.id}`)
                                  }
                                  style={{
                                    cursor: isClickable
                                      ? "pointer"
                                      : "not-allowed",
                                    opacity: isClickable ? 1 : 0.6,
                                  }}
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
                                      <span>{match.player1Name || "待定"}</span>
                                      <span className={styles.matchScore}>
                                        {match.status === "COMPLETED"
                                          ? match.score?.player1 || 0
                                          : "-"}
                                      </span>
                                    </div>
                                    <div className={styles.matchPlayer}>
                                      <span>{match.player2Name || "待定"}</span>
                                      <span className={styles.matchScore}>
                                        {match.status === "COMPLETED"
                                          ? match.score?.player2 || 0
                                          : "-"}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className={`${styles.matchStatus} ${
                                      styles[(match.status || "").toLowerCase()]
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
                              );
                            })}
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

          {/* 對陣圖 Tab */}
          {activeTab === "bracket" && (
            <div className={styles.bracketTab}>
              {bracketTabs.length > 0 ? (
                <>
                  <Tabs
                    tabs={bracketTabs}
                    activeTab={bracketTab}
                    onChange={setBracketTab}
                    enableSwipe={true}
                    swipeThreshold={60}
                  >
                    <div className={styles.bracketContent}>
                      {filteredKnockoutMatches.length > 0 ? (
                        <div className={styles.matchesList}>
                          {filteredKnockoutMatches.map((match: any) => {
                            // 檢查是否有雙方選手
                            const hasPlayers =
                              match.player1Name && match.player2Name;
                            const isPendingPlayer =
                              match.status === "PENDING_PLAYER";
                            const isClickable = hasPlayers && !isPendingPlayer;

                            return (
                              <div
                                key={match.id}
                                onClick={() =>
                                  isClickable &&
                                  navigate(`/scorer/matches/${match.id}`)
                                }
                                style={{
                                  cursor: isClickable
                                    ? "pointer"
                                    : "not-allowed",
                                  opacity: isClickable ? 1 : 0.6,
                                }}
                              >
                                <Card className={styles.matchCard}>
                                  <div className={styles.matchHeader}>
                                    <span className={styles.courtLabel}>
                                      {getCourtName(match.courtId)}
                                    </span>
                                    <span
                                      className={`${styles.matchStatus} ${
                                        styles[
                                          (match.status || "").toLowerCase()
                                        ]
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
                                            ✓
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
                                            ✓
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
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <Card>
                          <p className={styles.emptyMessage}>此輪次暫無比賽</p>
                        </Card>
                      )}
                    </div>
                  </Tabs>
                </>
              ) : (
                <Card>
                  <p className={styles.emptyMessage}>尚未產生對陣圖</p>
                </Card>
              )}
            </div>
          )}

          {/* 球員 Tab */}
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

export default ScorerCategoryDetail;
