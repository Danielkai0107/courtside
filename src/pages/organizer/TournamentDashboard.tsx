import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import {
  getTournament,
  openRegistration,
  closeRegistration,
  completeTournament,
  cancelTournament,
} from "../../services/tournamentService";
import { addPlayerManually } from "../../services/registrationService";
import { searchUserByEmail } from "../../services/userService";
import { getCategories } from "../../services/categoryService";
import { uploadImage, validateImageFile } from "../../services/storageService";
import { useAuth } from "../../contexts/AuthContext";
import { debounce } from "../../utils/debounce";
import Button from "../../components/common/Button";
import Tabs from "../../components/common/Tabs";
import Card from "../../components/common/Card";
import Modal from "../../components/common/Modal";
import Input from "../../components/common/Input";
import Loading from "../../components/common/Loading";
import CategoryPlayersManager from "../../components/features/CategoryPlayersManager";
import CategoryStaffManager from "../../components/features/CategoryStaffManager";
import CategoryScheduleManager from "../../components/features/CategoryScheduleManager";
import CourtManager from "../../components/features/CourtManager";
import styles from "./TournamentDashboard.module.scss";
import type { Tournament, Category } from "../../types";

const TournamentDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  // Modals
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  // Add Player Form
  const [playerEmail, setPlayerEmail] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerPhotoFile, setPlayerPhotoFile] = useState<File | null>(null);
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState<string | null>(
    null
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<{
    uid: string;
    name: string;
    photoURL?: string;
  } | null>(null);

  // Tabs
  const tabs = [
    { id: "info", label: "賽事資訊" },
    { id: "players", label: "選手管理" },
    { id: "scorers", label: "紀錄員管理" },
    { id: "courts", label: "場地管理" },
    { id: "schedule", label: "賽程管理" },
  ];

  const getStatusLabel = (status: Tournament["status"]) => {
    switch (status) {
      case "DRAFT":
        return "草稿";
      case "REGISTRATION_OPEN":
        return "開放報名中";
      case "REGISTRATION_CLOSED":
        return "截止報名/籌備中";
      case "ONGOING":
        return "進行中";
      case "COMPLETED":
        return "已結束";
      case "CANCELLED":
        return "已取消";
      default:
        return status;
    }
  };

  const loadCategoriesData = async () => {
    if (!id) return;
    try {
      const categoriesData = await getCategories(id);
      setCategories(categoriesData);
    } catch (catError) {
      console.error("Failed to load categories:", catError);
      setCategories([]);
    }
  };

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const data = await getTournament(id);
        if (data) {
          // Check if user is organizer
          if (currentUser && data.organizerId !== currentUser.uid) {
            navigate("/");
            return;
          }
          setTournament(data);

          // Load categories
          await loadCategoriesData();
        }
      } catch (error) {
        console.error("Failed to load tournament:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, currentUser]);

  const searchUser = async (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFoundUser(null);
      return;
    }

    setSearchingUser(true);
    try {
      const user = await searchUserByEmail(email.trim());
      if (user) {
        setFoundUser({
          uid: user.uid,
          name: user.displayName || "",
          photoURL: user.photoURL || undefined,
        });
        setPlayerName(user.displayName || "");
        console.log(`找到已註冊用戶：${user.displayName}`);
      } else {
        setFoundUser(null);
        console.log("此 Email 尚未註冊，將建立影子帳號");
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setFoundUser(null);
    } finally {
      setSearchingUser(false);
    }
  };

  // Debounce search to avoid excessive calls
  const debouncedSearch = React.useMemo(() => debounce(searchUser, 500), []);

  const handleEmailChange = (email: string) => {
    setPlayerEmail(email);
    debouncedSearch(email);
  };

  const handlePlayerPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 驗證檔案
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setPlayerPhotoFile(file);

    // 產生預覽
    const reader = new FileReader();
    reader.onloadend = () => {
      setPlayerPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPlayer = async () => {
    if (!id || !playerEmail || !playerName) return;

    setAddingPlayer(true);
    try {
      const playerData: any = {
        email: playerEmail.trim(),
        name: playerName.trim(),
      };

      // 如果找到已註冊用戶，帶入資料
      if (foundUser) {
        playerData.uid = foundUser.uid;
        // 如果用戶沒有上傳自訂照片，使用已註冊用戶的照片
        if (!playerPhotoFile && foundUser.photoURL) {
          playerData.photoURL = foundUser.photoURL;
        }
      }

      // 如果有上傳自訂照片，先上傳圖片
      if (playerPhotoFile) {
        setUploadingPhoto(true);
        try {
          const photoURL = await uploadImage(
            playerPhotoFile,
            `tournaments/${id}/players`
          );
          playerData.photoURL = photoURL;
        } catch (error) {
          console.error("Failed to upload photo:", error);
          alert("上傳照片失敗，但會繼續新增選手");
        } finally {
          setUploadingPhoto(false);
        }
      }

      await addPlayerManually(id, playerData);

      setShowAddPlayerModal(false);
      setPlayerEmail("");
      setPlayerName("");
      setPlayerPhotoFile(null);
      setPlayerPhotoPreview(null);
      setFoundUser(null);

      alert("選手新增成功！請至「選手管理」Tab 查看");
    } catch (err: any) {
      alert(err.message || "新增選手失敗");
    } finally {
      setAddingPlayer(false);
    }
  };


  if (loading) {
    return <Loading fullScreen />;
  }

  if (!tournament) {
    return <div className={styles.error}>找不到賽事</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate("/my-games")}
          aria-label="返回"
        >
          <ArrowLeft size={24} />
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>{tournament.name}</h1>
        </div>
      </div>

      <div className={styles.content}>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          enableSwipe={true}
          swipeThreshold={60}
        >
          {/* 賽事狀態資訊條 */}
          <div className={styles.statusInfo}>
            <span className={styles.statusInfoLabel}>賽事狀態：</span>
            <span className={styles.statusInfoValue}>
              {getStatusLabel(tournament.status)}
            </span>
          </div>

          {activeTab === "info" && (
            <div className={styles.tabContent}>
              <Card className={styles.infoCard}>
                <div className={styles.infoContent}>
                  <div className={styles.infoDisplay}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>賽事狀態</span>
                      <span className={styles.infoValue}>
                        <span className={styles.statusBadge}>
                          {getStatusLabel(tournament.status)}
                        </span>
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>賽事名稱</span>
                      <span className={styles.infoValue}>
                        {tournament.name}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>賽事地點</span>
                      <span className={styles.infoValue}>
                        {tournament.location}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>運動類型</span>
                      <span className={styles.infoValue}>
                        {tournament.sportType === "basketball"
                          ? "籃球"
                          : tournament.sportType === "badminton"
                          ? "羽球"
                          : "排球"}
                      </span>
                    </div>
                    {tournament.stats?.totalCategories && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>賽事分類</span>
                        <span className={styles.infoValue}>
                          {tournament.stats.totalCategories} 個
                        </span>
                      </div>
                    )}
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>賽事日期</span>
                      <span className={styles.infoValue}>
                        {tournament.date.toDate().toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>報名截止</span>
                      <span className={styles.infoValue}>
                        {tournament.registrationDeadline
                          .toDate()
                          .toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                    {tournament.description && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>賽事說明</span>
                        <span className={styles.infoValue}>
                          {tournament.description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 狀態轉換按鈕 */}
                <div className={styles.statusActionsWrapper}>
                  <div className={styles.statusActions}>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/organizer/tournaments/${id}/edit`)
                      }
                    >
                      編輯
                    </Button>
                    {tournament.status === "DRAFT" && (
                      <Button
                        variant="primary"
                        onClick={async () => {
                          try {
                            await openRegistration(id!);
                            const updated = await getTournament(id!);
                            setTournament(updated);
                            alert("報名已開放！");
                          } catch (err: any) {
                            alert(err.message || "開放報名失敗");
                          }
                        }}
                      >
                        開放報名
                      </Button>
                    )}

                    {tournament.status === "REGISTRATION_OPEN" && (
                      <Button
                        variant="primary"
                        className={styles.cancelButton}
                        onClick={async () => {
                          try {
                            await closeRegistration(id!);
                            const updated = await getTournament(id!);
                            setTournament(updated);
                            alert(
                              "報名已截止！請至「賽程管理」Tab 為各分類發布賽程"
                            );
                          } catch (err: any) {
                            alert(err.message || "截止報名失敗");
                          }
                        }}
                      >
                        截止報名
                      </Button>
                    )}

                    {tournament.status === "REGISTRATION_CLOSED" && (
                      <div className={styles.statusHint}>
                        請至「賽程管理」Tab 為各個分類發布賽程
                      </div>
                    )}

                    {tournament.status === "ONGOING" && (
                      <Button
                        variant="primary"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            "確定要結束此賽事嗎？結束後將無法再修改。"
                          );
                          if (!confirmed) return;

                          try {
                            await completeTournament(id!);
                            const updated = await getTournament(id!);
                            setTournament(updated);
                            alert("賽事已結束！");
                          } catch (err: any) {
                            alert(err.message || "結束賽事失敗");
                          }
                        }}
                      >
                        結束賽事
                      </Button>
                    )}
                  </div>
                </div>

                {tournament.status !== "COMPLETED" &&
                  tournament.status !== "CANCELLED" && (
                    <div className={styles.cancelSection}>
                      <Button
                        variant="outline"
                        className={styles.dangerButton}
                        onClick={async () => {
                          const confirmed = window.confirm(
                            "確定要取消此賽事嗎？取消後將無法恢復。"
                          );
                          if (!confirmed) return;

                          try {
                            await cancelTournament(id!);
                            alert("賽事已取消，即將返回我的主辦頁面");
                            // 自動返回到我的主辦頁面
                            navigate("/my-games?tab=organizer");
                          } catch (err: any) {
                            alert(err.message || "取消賽事失敗");
                          }
                        }}
                      >
                        取消賽事
                      </Button>
                    </div>
                  )}
              </Card>
            </div>
          )}

          {activeTab === "players" && (
            <div className={styles.tabContent}>
              <CategoryPlayersManager
                tournamentId={id!}
                categories={categories}
                onCategoriesUpdate={loadCategoriesData}
              />
            </div>
          )}

          {activeTab === "scorers" && (
            <div className={styles.tabContent}>
              <CategoryStaffManager
                tournamentId={id!}
                categories={categories}
              />
            </div>
          )}

          {activeTab === "courts" && (
            <div className={styles.tabContent}>
              <CourtManager tournamentId={id!} />
            </div>
          )}

          {activeTab === "schedule" && (
            <div className={styles.tabContent}>
              <CategoryScheduleManager
                tournamentId={id!}
                categories={categories}
                tournamentStatus={tournament.status}
              />
            </div>
          )}
        </Tabs>
      </div>

      <Modal
        isOpen={showAddPlayerModal}
        onClose={() => {
          setShowAddPlayerModal(false);
          setPlayerEmail("");
          setPlayerName("");
          setPlayerPhotoFile(null);
          setPlayerPhotoPreview(null);
          setFoundUser(null);
        }}
        title="手動新增"
      >
        <div className={styles.modalForm}>
          {/* 照片上傳區域 */}
          <div className={styles.photoUploadSection}>
            <label className={styles.photoLabel}>選手照片（選填）</label>
            <div className={styles.photoUploadArea}>
              <input
                type="file"
                accept="image/*"
                onChange={handlePlayerPhotoSelect}
                className={styles.fileInput}
                id="player-photo-upload"
              />
              <label
                htmlFor="player-photo-upload"
                className={styles.photoPreview}
              >
                {playerPhotoPreview ? (
                  <img
                    src={playerPhotoPreview}
                    alt="預覽"
                    className={styles.previewImage}
                  />
                ) : foundUser?.photoURL ? (
                  <img
                    src={foundUser.photoURL}
                    alt={foundUser.name}
                    className={styles.previewImage}
                  />
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    <User size={40} />
                    <span>點擊上傳照片</span>
                  </div>
                )}
              </label>
            </div>
            {playerPhotoFile && (
              <div className={styles.photoHint}>
                已選擇：{playerPhotoFile.name}
              </div>
            )}
          </div>

          <Input
            label="Email"
            type="email"
            value={playerEmail}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="player@example.com"
          />
          {searchingUser && (
            <div className={styles.searchingHint}>搜尋中...</div>
          )}
          {foundUser && (
            <div className={styles.userPreview}>
              <div className={styles.userAvatar}>
                {foundUser.photoURL ? (
                  <img src={foundUser.photoURL} alt={foundUser.name} />
                ) : (
                  <User size={32} />
                )}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{foundUser.name}</span>
                <span className={styles.userBadge}>已註冊用戶</span>
              </div>
            </div>
          )}
          {playerEmail &&
            !foundUser &&
            !searchingUser &&
            playerEmail.includes("@") && (
              <div className={styles.shadowHint}>
                此 Email 尚未註冊，將建立影子帳號
              </div>
            )}
          <Input
            label="姓名"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="選手姓名"
          />
          <div className={styles.modalActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddPlayerModal(false);
                setPlayerEmail("");
                setPlayerName("");
                setPlayerPhotoFile(null);
                setPlayerPhotoPreview(null);
                setFoundUser(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleAddPlayer}
              loading={addingPlayer || uploadingPhoto}
            >
              {uploadingPhoto ? "上傳中..." : "新增"}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default TournamentDashboard;
