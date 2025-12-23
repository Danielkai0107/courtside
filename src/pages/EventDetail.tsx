import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getTournament } from "../services/tournamentService";
import { getCategories } from "../services/categoryService";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import Loading from "../components/common/Loading";
import ImageWithSkeleton from "../components/common/ImageWithSkeleton";
import AvatarWithSkeleton from "../components/common/AvatarWithSkeleton";
import RegistrationForm from "../components/features/RegistrationForm";
import Tabs from "../components/common/Tabs";
import styles from "./EventDetail.module.scss";
import type { Tournament } from "../types";
import demoBanner from "../assets/demo.jpg";

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [activeTab, setActiveTab] = useState("categories");
  const [staff, setStaff] = useState<any[]>([]);
  const [categoryResults, setCategoryResults] = useState<
    Map<string, { champion: any; runnerUp: any }>
  >(new Map());

  // 根據賽事狀態決定顯示的 tabs
  const isRegistrationOpen = tournament?.status === "REGISTRATION_OPEN";

  const tabs = isRegistrationOpen
    ? [
        { id: "categories", label: "類別" },
        { id: "info", label: "信息" },
      ]
    : [
        { id: "categories", label: "類別" },
        { id: "gallery", label: "圖庫" },
        { id: "results", label: "結果" },
        { id: "info", label: "信息" },
      ];

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        const data = await getTournament(id);
        setTournament(data);

        // 載入分類
        let categoriesData: Category[] = [];
        try {
          categoriesData = await getCategories(id);
          setCategories(categoriesData);
        } catch (categoryError) {
          console.error("Failed to load categories:", categoryError);
          // 分類加載失敗不影響主流程，設為空陣列
          setCategories([]);
        }

        // 檢查用戶是否已報名（未來可能需要）
        // if (currentUser) {
        //   const registered = await isUserRegistered(id, currentUser.uid);
        // }

        // 載入工作人員資料（如果不是報名階段）
        if (data && data.status !== "REGISTRATION_OPEN") {
          try {
            const { getStaff } = await import("../services/staffService");
            const staffData = await getStaff(id);
            setStaff(staffData.filter((s) => s.status === "accepted"));
          } catch (staffError) {
            console.error("Failed to load staff:", staffError);
          }

          // 載入每個分類的冠軍和亞軍信息
          try {
            const { getMatchesByTournament } = await import(
              "../services/matchService"
            );
            const allMatches = await getMatchesByTournament(id);
            const resultsMap = new Map();

            for (const category of categoriesData) {
              // 找到該分類的決賽（roundLabel === "FI"）
              const finalMatch = allMatches.find(
                (m: any) =>
                  m.categoryId === category.id &&
                  m.roundLabel === "FI" &&
                  m.status === "COMPLETED"
              );

              if (finalMatch && finalMatch.winnerId) {
                // 如果是雙打，需要獲取隊伍信息
                let champion, runnerUp;

                if (category.matchType === "doubles") {
                  // 雙打：獲取隊伍信息
                  const { getTeamsByCategory } = await import(
                    "../services/teamService"
                  );
                  const teams = await getTeamsByCategory(
                    id,
                    category.id,
                    "confirmed"
                  );

                  const championTeam = teams.find(
                    (t) => t.id === finalMatch.winnerId
                  );
                  const runnerUpId =
                    finalMatch.winnerId === finalMatch.player1Id
                      ? finalMatch.player2Id
                      : finalMatch.player1Id;
                  const runnerUpTeam = teams.find((t) => t.id === runnerUpId);

                  champion = championTeam
                    ? {
                        id: championTeam.id,
                        name: `${championTeam.player1Name} / ${championTeam.player2Name}`,
                        photoURL: null,
                        isTeam: true,
                        player1Name: championTeam.player1Name,
                        player2Name: championTeam.player2Name,
                        player1PhotoURL: championTeam.player1PhotoURL,
                        player2PhotoURL: championTeam.player2PhotoURL,
                      }
                    : null;

                  runnerUp = runnerUpTeam
                    ? {
                        id: runnerUpTeam.id,
                        name: `${runnerUpTeam.player1Name} / ${runnerUpTeam.player2Name}`,
                        photoURL: null,
                        isTeam: true,
                        player1Name: runnerUpTeam.player1Name,
                        player2Name: runnerUpTeam.player2Name,
                        player1PhotoURL: runnerUpTeam.player1PhotoURL,
                        player2PhotoURL: runnerUpTeam.player2PhotoURL,
                      }
                    : null;
                } else {
                  // 單打
                  champion = {
                    id: finalMatch.winnerId,
                    name:
                      finalMatch.winnerId === finalMatch.player1Id
                        ? finalMatch.player1Name
                        : finalMatch.player2Name,
                    photoURL: null,
                    isTeam: false,
                  };

                  const runnerUpId =
                    finalMatch.winnerId === finalMatch.player1Id
                      ? finalMatch.player2Id
                      : finalMatch.player1Id;
                  runnerUp = {
                    id: runnerUpId,
                    name:
                      finalMatch.winnerId === finalMatch.player1Id
                        ? finalMatch.player2Name
                        : finalMatch.player1Name,
                    photoURL: null,
                    isTeam: false,
                  };
                }

                resultsMap.set(category.id, { champion, runnerUp });
              }
            }

            setCategoryResults(resultsMap);
          } catch (resultsError) {
            console.error("Failed to load results:", resultsError);
          }
        }
      } catch (error) {
        console.error("Failed to load tournament:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, currentUser]);

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!tournament) {
    return (
      <div className={styles.error}>
        <p>找不到此賽事</p>
        <Button onClick={() => navigate("/events")}>返回賽事列表</Button>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  // 新架構下，報名是按 category 的，所以總是顯示報名按鈕（在 Modal 中選擇分類）
  const canRegister = tournament.status === "REGISTRATION_OPEN";

  const handleRegistration = () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setShowRegistrationModal(true);
  };

  const handleRegistrationSuccess = () => {
    setShowRegistrationModal(false);
  };

  return (
    <div className={styles.eventDetail}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2 className={styles.headerTitle}>錦標賽</h2>
        <div className={styles.headerSpacer} />
      </div>

      <div className={styles.banner}>
        <ImageWithSkeleton
          src={tournament.bannerURL || demoBanner}
          alt={tournament.name}
          aspectRatio="16/9"
        />
      </div>

      <div className={styles.content}>
        <div className={styles.basicInfo}>
          <div className={styles.infoContainer}>
            <div className={styles.organizerBadge}>
              <div className={styles.organizerIcon}>
                {tournament.organizerPhotoURL ? (
                  <AvatarWithSkeleton
                    src={tournament.organizerPhotoURL}
                    alt={tournament.organizerName || "主辦方"}
                    size={48}
                    fallbackIcon={
                      <span>{tournament.organizerName?.charAt(0) || "主"}</span>
                    }
                  />
                ) : (
                  <span>{tournament.organizerName?.charAt(0) || "主"}</span>
                )}
              </div>
            </div>
            <div className={styles.titleContainer}>
              <h1 className={styles.title}>{tournament.name}</h1>
              <p className={styles.organizer}>
                {tournament.organizerName || "主辦方"}
              </p>
              <p className={styles.date}>{formatDate(tournament.date)}</p>
            </div>
          </div>
          {canRegister && (
            <div className={styles.registerButtonWrapper}>
              <Button
                onClick={handleRegistration}
                className={styles.registerButton}
              >
                報名
              </Button>
            </div>
          )}
        </div>

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          enableSwipe={true}
          swipeThreshold={60}
        >
          <div className={styles.tabContent}>
            {activeTab === "categories" && (
              <div className={styles.categoriesTab}>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <Card
                      key={category.id}
                      className={styles.categoryCard}
                      onClick={() =>
                        navigate(
                          `/events/${tournament.id}/categories/${category.id}`
                        )
                      }
                    >
                      <div className={styles.categoryHeader}>
                        <span className={styles.categoryTitle}>
                          {category.name}
                        </span>
                        <div className={styles.categoryInfo}>
                          <span className={styles.categoryName}>
                            {category.matchType === "singles" ? "單打" : "雙打"}
                          </span>
                          <div className={styles.categoryStats}>
                            <span>
                              {category.currentParticipants}/
                              {category.maxParticipants} 已報名
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={24} color="#475467" />
                    </Card>
                  ))
                ) : (
                  <Card>
                    <p className={styles.emptyMessage}>尚未設定分類</p>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "gallery" && (
              <div className={styles.galleryTab}>
                <Card>
                  <p className={styles.emptyMessage}>暫無圖片</p>
                </Card>
              </div>
            )}

            {activeTab === "results" && (
              <div className={styles.resultsTab}>
                {categories.length > 0 ? (
                  categories.map((category) => {
                    const result = categoryResults.get(category.id);
                    const champion = result?.champion;
                    const runnerUp = result?.runnerUp;

                    return (
                      <div
                        key={category.id}
                        className={styles.categoryResultSection}
                      >
                        <h3 className={styles.sectionTitle}>{category.name}</h3>
                        <Card className={styles.resultCard}>
                          <div className={styles.championSection}>
                            <div className={styles.medalIcon}>🥇</div>
                            <div className={styles.championTitle}>冠軍</div>
                            <div className={styles.winnerInfo}>
                              {champion?.isTeam ? (
                                <div className={styles.teamAvatars}>
                                  <AvatarWithSkeleton
                                    src={champion.player1PhotoURL}
                                    alt={champion.player1Name}
                                    size={60}
                                    className={styles.winnerAvatar}
                                    fallbackIcon={
                                      <span>
                                        {champion.player1Name?.charAt(0) || "?"}
                                      </span>
                                    }
                                  />
                                  <AvatarWithSkeleton
                                    src={champion.player2PhotoURL}
                                    alt={champion.player2Name}
                                    size={60}
                                    className={styles.winnerAvatar}
                                    fallbackIcon={
                                      <span>
                                        {champion.player2Name?.charAt(0) || "?"}
                                      </span>
                                    }
                                  />
                                </div>
                              ) : (
                                <AvatarWithSkeleton
                                  src={champion?.photoURL}
                                  alt={champion?.name || "冠軍"}
                                  size={60}
                                  className={styles.winnerAvatar}
                                  fallbackIcon={
                                    <span>
                                      {champion?.name?.charAt(0) || "🏆"}
                                    </span>
                                  }
                                />
                              )}
                              <div className={styles.winnerDetails}>
                                <div className={styles.winnerName}>
                                  {champion?.name || "待定"}
                                </div>
                                <div className={styles.winnerTeam}>
                                  {category.name}
                                </div>
                              </div>
                            </div>
                            {champion && (
                              <div className={styles.actionButtons}>
                                <button className={styles.replayButton}>
                                  ▶ 觀看回放
                                </button>
                                <button className={styles.shareButton}>
                                  ↗ 分享
                                </button>
                              </div>
                            )}
                          </div>
                        </Card>

                        <Card className={styles.resultCard}>
                          <div className={styles.championSection}>
                            <div className={styles.medalIcon}>🥈</div>
                            <div className={styles.championTitle}>亞軍</div>
                            <div className={styles.winnerInfo}>
                              {runnerUp?.isTeam ? (
                                <div className={styles.teamAvatars}>
                                  <AvatarWithSkeleton
                                    src={runnerUp.player1PhotoURL}
                                    alt={runnerUp.player1Name}
                                    size={60}
                                    className={styles.winnerAvatar}
                                    fallbackIcon={
                                      <span>
                                        {runnerUp.player1Name?.charAt(0) || "?"}
                                      </span>
                                    }
                                  />
                                  <AvatarWithSkeleton
                                    src={runnerUp.player2PhotoURL}
                                    alt={runnerUp.player2Name}
                                    size={60}
                                    className={styles.winnerAvatar}
                                    fallbackIcon={
                                      <span>
                                        {runnerUp.player2Name?.charAt(0) || "?"}
                                      </span>
                                    }
                                  />
                                </div>
                              ) : (
                                <AvatarWithSkeleton
                                  src={runnerUp?.photoURL}
                                  alt={runnerUp?.name || "亞軍"}
                                  size={60}
                                  className={styles.winnerAvatar}
                                  fallbackIcon={
                                    <span>
                                      {runnerUp?.name?.charAt(0) || "🥈"}
                                    </span>
                                  }
                                />
                              )}
                              <div className={styles.winnerDetails}>
                                <div className={styles.winnerName}>
                                  {runnerUp?.name || "待定"}
                                </div>
                                <div className={styles.winnerTeam}>
                                  {category.name}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    );
                  })
                ) : (
                  <Card>
                    <p className={styles.emptyMessage}>尚無比賽結果</p>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "info" && (
              <div className={styles.infoTab}>
                <Card>
                  <h3 className={styles.sectionTitle}>錦標賽信息</h3>
                  <div className={styles.infoList}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>錦標賽日期</span>
                      <span className={styles.infoValue}>
                        {formatDate(tournament.date)}
                      </span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>位置</span>
                      <span className={styles.infoValue}>
                        {tournament.location}
                      </span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>類別數量</span>
                      <span className={styles.infoValue}>
                        {categories.length} 個
                      </span>
                    </div>
                  </div>
                </Card>

                {categories.length > 0 && (
                  <Card>
                    <h3 className={styles.sectionTitle}>賽制與規則</h3>
                    {categories.map((category, index) => (
                      <div
                        key={category.id}
                        className={styles.categoryRuleSection}
                      >
                        {index > 0 && <div className={styles.ruleDivider} />}
                        <div className={styles.categoryRuleHeader}>
                          <span className={styles.categoryRuleTitle}>
                            {category.name}
                          </span>
                          <span className={styles.categoryRuleType}>
                            {category.matchType === "singles" ? "單打" : "雙打"}
                          </span>
                        </div>

                        <div className={styles.ruleDetails}>
                          <div className={styles.ruleItem}>
                            <span className={styles.ruleLabel}>賽制</span>
                            <span className={styles.ruleValue}>
                              {category.format === "KNOCKOUT_ONLY"
                                ? "淘汰賽"
                                : "小組賽 + 淘汰賽"}
                            </span>
                          </div>

                          {category.ruleConfig && (
                            <>
                              <div className={styles.ruleItem}>
                                <span className={styles.ruleLabel}>
                                  比賽類型
                                </span>
                                <span className={styles.ruleValue}>
                                  {category.ruleConfig.matchType === "set_based"
                                    ? "局數制"
                                    : "積分制"}
                                </span>
                              </div>

                              {category.ruleConfig.matchType ===
                                "set_based" && (
                                <>
                                  <div className={styles.ruleItem}>
                                    <span className={styles.ruleLabel}>
                                      最多局數
                                    </span>
                                    <span className={styles.ruleValue}>
                                      {category.ruleConfig.maxSets} 局
                                    </span>
                                  </div>
                                  <div className={styles.ruleItem}>
                                    <span className={styles.ruleLabel}>
                                      每局得分
                                    </span>
                                    <span className={styles.ruleValue}>
                                      {category.ruleConfig.pointsPerSet} 分
                                    </span>
                                  </div>
                                  <div className={styles.ruleItem}>
                                    <span className={styles.ruleLabel}>
                                      獲勝局數
                                    </span>
                                    <span className={styles.ruleValue}>
                                      先贏 {category.ruleConfig.setsToWin} 局
                                    </span>
                                  </div>
                                  {category.ruleConfig.winByTwo && (
                                    <div className={styles.ruleItem}>
                                      <span className={styles.ruleLabel}>
                                        淨勝規則
                                      </span>
                                      <span className={styles.ruleValue}>
                                        需淨勝 2 分
                                        {category.ruleConfig.cap &&
                                          ` (上限 ${category.ruleConfig.cap} 分)`}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}

                          <div className={styles.ruleItem}>
                            <span className={styles.ruleLabel}>參賽名額</span>
                            <span className={styles.ruleValue}>
                              {category.currentParticipants}/
                              {category.maxParticipants}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </Card>
                )}

                {!isRegistrationOpen && staff.length > 0 && (
                  <Card>
                    <h3 className={styles.sectionTitle}>紀錄組</h3>
                    <div className={styles.staffList}>
                      {staff.map((member) => (
                        <div key={member.id} className={styles.staffItem}>
                          <AvatarWithSkeleton
                            src={member.photoURL || undefined}
                            alt={member.name || "工作人員"}
                            size={40}
                            className={styles.staffAvatar}
                            fallbackIcon={
                              <span>{member.name?.charAt(0) || "?"}</span>
                            }
                          />
                          <span className={styles.staffName}>
                            {member.name}
                          </span>
                          <div className={styles.verifiedBadge}>✓</div>
                        </div>
                      ))}
                    </div>
                    {staff.length > 3 && (
                      <button className={styles.viewAllButton}>
                        查看所有裁判 →
                      </button>
                    )}
                  </Card>
                )}

                {tournament.description && (
                  <Card>
                    <h3 className={styles.sectionTitle}>賽事資訊</h3>
                    <div className={styles.descriptionContent}>
                      <p>{tournament.description}</p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </div>

      <Modal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        title="報名賽事"
      >
        <RegistrationForm
          tournamentId={tournament.id}
          onSuccess={handleRegistrationSuccess}
          onCancel={() => setShowRegistrationModal(false)}
        />
      </Modal>
    </div>
  );
};

export default EventDetail;
