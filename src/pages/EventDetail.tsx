import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getTournament } from "../services/tournamentService";
import { isUserRegistered } from "../services/registrationService";
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
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [activeTab, setActiveTab] = useState("categories");
  const [staff, setStaff] = useState<any[]>([]);

  // 根據賽事狀態決定顯示的 tabs
  const isRegistrationOpen = tournament?.status === "REGISTRATION_OPEN";
  const isCompleted = tournament?.status === "COMPLETED";

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
        try {
          const categoriesData = await getCategories(id);
          setCategories(categoriesData);
        } catch (categoryError) {
          console.error("Failed to load categories:", categoryError);
          // 分類加載失敗不影響主流程，設為空陣列
          setCategories([]);
        }

        if (currentUser) {
          const registered = await isUserRegistered(id, currentUser.uid);
          setIsRegistered(registered);
        }

        // 載入工作人員資料（如果不是報名階段）
        if (data && data.status !== "REGISTRATION_OPEN") {
          try {
            const { getStaff } = await import("../services/staffService");
            const staffData = await getStaff(id);
            setStaff(staffData.filter((s) => s.status === "accepted"));
          } catch (staffError) {
            console.error("Failed to load staff:", staffError);
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
    setIsRegistered(true);
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
                {isCompleted ? (
                  <>
                    <Card className={styles.resultCard}>
                      <div className={styles.resultHeader}>
                        <span className={styles.resultTitle}>
                          {tournament.name}
                        </span>
                      </div>
                      <div className={styles.championSection}>
                        <div className={styles.medalIcon}>🥇</div>
                        <div className={styles.championTitle}>冠軍</div>
                        <div className={styles.winnerInfo}>
                          <AvatarWithSkeleton
                            src={undefined}
                            alt="Winner"
                            size={60}
                            className={styles.winnerAvatar}
                            fallbackIcon={<span>🏆</span>}
                          />
                          <div className={styles.winnerDetails}>
                            <div className={styles.winnerName}>待定</div>
                            <div className={styles.winnerTeam}>-</div>
                          </div>
                        </div>
                        <div className={styles.actionButtons}>
                          <button className={styles.replayButton}>
                            ▶ 觀看回放
                          </button>
                          <button className={styles.shareButton}>↗ 分享</button>
                        </div>
                      </div>
                    </Card>

                    <Card className={styles.resultCard}>
                      <div className={styles.championSection}>
                        <div className={styles.medalIcon}>🥈</div>
                        <div className={styles.championTitle}>亞軍</div>
                        <div className={styles.winnerInfo}>
                          <AvatarWithSkeleton
                            src={undefined}
                            alt="Runner-up"
                            size={60}
                            className={styles.winnerAvatar}
                            fallbackIcon={<span>🥈</span>}
                          />
                          <div className={styles.winnerDetails}>
                            <div className={styles.winnerName}>待定</div>
                            <div className={styles.winnerTeam}>-</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <p className={styles.emptyMessage}>比賽尚未完成</p>
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
                      <span className={styles.infoLabel}>類別</span>
                      <span className={styles.infoValue}>
                        {categories.length || 1}
                      </span>
                    </div>
                  </div>
                </Card>

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
                  <Card className={styles.descriptionCard}>
                    <h3 className={styles.sectionTitle}>組織者通知</h3>
                    <p>{tournament.description}</p>
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
