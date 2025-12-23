import React, { useState, useEffect } from "react";
import { User, Plus } from "lucide-react";
import { TextField } from "@mui/material";
import Button from "../common/Button";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Tabs from "../common/Tabs";
import styles from "./CategoryPlayersManager.module.scss";
import type { Category } from "../../types";
import {
  getPlayers,
  getPlayersByCategory,
  addPlayerManually,
  approvePlayer,
  rejectPlayer,
  deletePlayer,
} from "../../services/registrationService";
import {
  getTeamsByCategory,
  approveTeam,
  rejectTeam,
  deleteTeam,
} from "../../services/teamService";
import { getCategoryById } from "../../services/categoryService";
import { searchUserByEmail } from "../../services/userService";

interface CategoryPlayersManagerProps {
  tournamentId: string;
  categories: Category[];
  onCategoriesUpdate?: () => void;
}

const CategoryPlayersManager: React.FC<CategoryPlayersManagerProps> = ({
  tournamentId,
  categories,
  onCategoriesUpdate,
}) => {
  const [activeCategory, setActiveCategory] = useState("");
  const [currentCategoryData, setCurrentCategoryData] =
    useState<Category | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Add player/team modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [playerEmail, setPlayerEmail] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [adding, setAdding] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);

  // Test data generation
  const [showTestModal, setShowTestModal] = useState(false);
  const [testCount, setTestCount] = useState("10");
  const [generating, setGenerating] = useState(false);

  // Approval/rejection loading states
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    if (!activeCategory) return;

    const loadParticipants = async () => {
      setLoading(true);
      try {
        // Load category data to get latest stats
        const categoryData = await getCategoryById(
          tournamentId,
          activeCategory
        );
        setCurrentCategoryData(categoryData);

        if (categoryData) {
          if (categoryData.matchType === "singles") {
            // 使用按分類查詢
            const playersData = await getPlayersByCategory(
              tournamentId,
              activeCategory
            );
            setPlayers(playersData);
          } else {
            const teamsData = await getTeamsByCategory(
              tournamentId,
              activeCategory
            );
            setTeams(teamsData);
          }
        }
      } catch (error) {
        console.error("Failed to load participants:", error);
      } finally {
        setLoading(false);
      }
    };

    loadParticipants();
  }, [tournamentId, activeCategory]);

  const handleSearchUser = async () => {
    if (!playerEmail.trim()) return;

    setSearchingUser(true);
    try {
      const user = await searchUserByEmail(playerEmail.trim());
      if (user) {
        setFoundUser({
          uid: user.uid,
          name: user.displayName || "",
          photoURL: user.photoURL || undefined,
        });
        setPlayerName(user.displayName || "");
      } else {
        setFoundUser(null);
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setFoundUser(null);
    } finally {
      setSearchingUser(false);
    }
  };

  const handleAdd = async () => {
    if (!currentCategoryData || !playerName.trim()) {
      alert("請填寫必要資訊");
      return;
    }

    // 檢查是否超過名額
    if (
      currentCategoryData.currentParticipants >=
      currentCategoryData.maxParticipants
    ) {
      alert(
        `已達名額上限（${currentCategoryData.maxParticipants} ${
          currentCategoryData.matchType === "singles" ? "人" : "組"
        }）`
      );
      return;
    }

    setAdding(true);
    try {
      if (currentCategoryData.matchType === "singles") {
        // Add single player with categoryId
        await addPlayerManually(tournamentId, {
          email: playerEmail.trim(),
          name: playerName.trim(),
          uid: foundUser?.uid,
          photoURL: foundUser?.photoURL,
          categoryId: activeCategory, // 添加 categoryId
        });

        // 手動增加單打計數
        const { incrementParticipants } = await import(
          "../../services/categoryService"
        );
        await incrementParticipants(tournamentId, activeCategory, 1);
      } else {
        // Add doubles team - use teamService
        const { createTeam } = await import("../../services/teamService");
        await createTeam(tournamentId, activeCategory, {
          player1Id: foundUser?.uid || `shadow-${Date.now()}-1`,
          player2Id: `shadow-${Date.now()}-2`,
          player1Name: playerName.trim(),
          player2Name: partnerName.trim(),
          player1Email: playerEmail.trim(),
          player2Email: partnerEmail.trim(),
        });
      }

      // Reload data
      const categoryData = await getCategoryById(tournamentId, activeCategory);
      setCurrentCategoryData(categoryData);

      if (currentCategoryData.matchType === "singles") {
        const playersData = await getPlayersByCategory(
          tournamentId,
          activeCategory
        );
        setPlayers(playersData);
      } else {
        const teamsData = await getTeamsByCategory(
          tournamentId,
          activeCategory
        );
        setTeams(teamsData);
      }

      // Notify parent to update categories
      if (onCategoriesUpdate) {
        onCategoriesUpdate();
      }

      // Reset form
      setShowAddModal(false);
      setPlayerEmail("");
      setPlayerName("");
      setPartnerEmail("");
      setPartnerName("");
      setFoundUser(null);
    } catch (err: any) {
      alert(err.message || "新增失敗");
    } finally {
      setAdding(false);
    }
  };

  const handleApprove = async (id: string, isSingles: boolean) => {
    setApprovingId(id);
    try {
      if (isSingles) {
        await approvePlayer(tournamentId, id);
        const playersData = await getPlayersByCategory(
          tournamentId,
          activeCategory
        );
        setPlayers(playersData);
      } else {
        await approveTeam(tournamentId, activeCategory, id);
        const teamsData = await getTeamsByCategory(
          tournamentId,
          activeCategory
        );
        setTeams(teamsData);
      }
    } catch (err: any) {
      alert(err.message || "批准失敗");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string, isSingles: boolean) => {
    setRejectingId(id);
    try {
      if (isSingles) {
        await rejectPlayer(tournamentId, id);
        const playersData = await getPlayersByCategory(
          tournamentId,
          activeCategory
        );
        setPlayers(playersData);
      } else {
        await rejectTeam(tournamentId, activeCategory, id);
        const teamsData = await getTeamsByCategory(
          tournamentId,
          activeCategory
        );
        setTeams(teamsData);
      }
    } catch (err: any) {
      alert(err.message || "婉拒失敗");
    } finally {
      setRejectingId(null);
    }
  };

  const handleDelete = async (id: string, name: string, isSingles: boolean) => {
    const confirmed = window.confirm(
      `確定要刪除 ${name} 嗎？\n\n此操作無法復原，選手/隊伍將從名單中永久移除。`
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      if (isSingles) {
        await deletePlayer(tournamentId, id);

        // 更新計數
        const { decrementParticipants } = await import(
          "../../services/categoryService"
        );
        await decrementParticipants(tournamentId, activeCategory, 1);

        // Reload players
        const playersData = await getPlayersByCategory(
          tournamentId,
          activeCategory
        );
        setPlayers(playersData);
      } else {
        await deleteTeam(tournamentId, activeCategory, id);

        // 更新計數
        const { decrementParticipants } = await import(
          "../../services/categoryService"
        );
        await decrementParticipants(tournamentId, activeCategory, 1);

        // Reload teams
        const teamsData = await getTeamsByCategory(
          tournamentId,
          activeCategory
        );
        setTeams(teamsData);
      }

      // Reload category data
      const categoryData = await getCategoryById(tournamentId, activeCategory);
      setCurrentCategoryData(categoryData);

      // Notify parent to update categories
      if (onCategoriesUpdate) {
        onCategoriesUpdate();
      }
    } catch (err: any) {
      alert(err.message || "刪除失敗");
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateTestData = async () => {
    if (!currentCategoryData) return;

    const count = parseInt(testCount) || 10;
    if (count < 1 || count > 50) {
      alert("請輸入 1-50 之間的數量");
      return;
    }

    // 檢查是否超過名額
    const remainingSlots =
      currentCategoryData.maxParticipants -
      currentCategoryData.currentParticipants;
    if (count > remainingSlots) {
      alert(
        `剩餘名額不足！\n目前：${currentCategoryData.currentParticipants}/${
          currentCategoryData.maxParticipants
        }\n剩餘：${remainingSlots} ${
          currentCategoryData.matchType === "singles" ? "人" : "組"
        }\n您想新增：${count} ${
          currentCategoryData.matchType === "singles" ? "人" : "組"
        }`
      );
      return;
    }

    setGenerating(true);
    try {
      const timestamp = Date.now();
      const names = [
        "Alice",
        "Bob",
        "Carol",
        "Dave",
        "Eve",
        "Frank",
        "Grace",
        "Henry",
        "Ivy",
        "Jack",
        "Kate",
        "Leo",
        "Mary",
        "Nick",
        "Olivia",
        "Peter",
        "Quinn",
        "Rose",
        "Sam",
        "Tom",
        "Uma",
        "Victor",
        "Wendy",
        "Xavier",
        "Yuki",
        "Zack",
        "Amy",
        "Ben",
        "Chloe",
        "Dan",
        "Emma",
        "Felix",
        "Gina",
        "Hugo",
        "Iris",
        "Jake",
        "Kelly",
        "Luke",
        "Mia",
        "Noah",
        "Owen",
        "Pam",
        "Roy",
        "Sue",
        "Tim",
        "Val",
        "Will",
        "Xena",
        "Yan",
        "Zoe",
      ];

      let successCount = 0;

      if (currentCategoryData.matchType === "singles") {
        // Generate singles
        for (let i = 0; i < count; i++) {
          try {
            const name1 = names[i % names.length];
            await addPlayerManually(tournamentId, {
              email: `test${timestamp}-${i}@example.com`,
              name: `測試選手 ${name1} ${i + 1}`,
              categoryId: activeCategory, // 添加 categoryId
            });
            successCount++;
          } catch (itemError) {
            console.error(`Failed to create player ${i}:`, itemError);
          }
        }

        // 批量更新單打計數
        if (successCount > 0) {
          try {
            const { updateCategory } = await import(
              "../../services/categoryService"
            );
            const category = await getCategoryById(
              tournamentId,
              activeCategory
            );
            if (category) {
              await updateCategory(tournamentId, activeCategory, {
                currentParticipants:
                  category.currentParticipants + successCount,
              });
            }
          } catch (updateError) {
            console.error("Failed to update participant count:", updateError);
          }
        }
      } else {
        // Generate doubles teams - 批量創建，避免並發更新 category
        const { addDoc, collection, serverTimestamp } = await import(
          "firebase/firestore"
        );
        const { db } = await import("../../services/firebase");

        const teamsRef = collection(
          db,
          "tournaments",
          tournamentId,
          "categories",
          activeCategory,
          "teams"
        );

        for (let i = 0; i < count; i++) {
          try {
            const name1 = names[i % names.length];
            const name2 = names[(i + 1) % names.length];

            await addDoc(teamsRef, {
              tournamentId,
              categoryId: activeCategory,
              player1Id: `shadow-${timestamp}-${i}-1`,
              player2Id: `shadow-${timestamp}-${i}-2`,
              player1Name: `測試選手 ${name1} ${i + 1}`,
              player2Name: `測試選手 ${name2} ${i + 1}`,
              player1Email: `test${timestamp}-${i}-1@example.com`,
              player2Email: `test${timestamp}-${i}-2@example.com`,
              status: "confirmed",
              createdAt: serverTimestamp(),
            });
            successCount++;
          } catch (itemError) {
            console.error(`Failed to create team ${i}:`, itemError);
          }
        }

        // 批量更新計數（一次性更新）
        if (successCount > 0) {
          try {
            const { updateCategory } = await import(
              "../../services/categoryService"
            );
            const category = await getCategoryById(
              tournamentId,
              activeCategory
            );
            if (category) {
              await updateCategory(tournamentId, activeCategory, {
                currentParticipants:
                  category.currentParticipants + successCount,
              });
            }
          } catch (updateError) {
            console.error("Failed to update participant count:", updateError);
          }
        }
      }

      // Reload data
      if (currentCategoryData.matchType === "singles") {
        const playersData = await getPlayersByCategory(
          tournamentId,
          activeCategory
        );
        setPlayers(playersData);
      } else {
        const teamsData = await getTeamsByCategory(
          tournamentId,
          activeCategory
        );
        setTeams(teamsData);
      }

      // Reload category data
      const categoryData = await getCategoryById(tournamentId, activeCategory);
      setCurrentCategoryData(categoryData);

      // Notify parent to update categories
      if (onCategoriesUpdate) {
        onCategoriesUpdate();
      }

      setShowTestModal(false);

      if (successCount === count) {
        alert(
          `成功新增 ${successCount} 個測試${
            currentCategoryData.matchType === "singles" ? "選手" : "隊伍"
          }！`
        );
      } else if (successCount > 0) {
        alert(
          `部分成功：新增了 ${successCount} 個，${count - successCount} 個失敗`
        );
      } else {
        alert(`生成失敗，請檢查權限或稍後再試`);
      }
    } catch (err: any) {
      console.error("Generate test data error:", err);
      alert(err.message || "生成測試資料失敗");
    } finally {
      setGenerating(false);
    }
  };

  if (categories.length === 0) {
    return (
      <Card>
        <p className={styles.emptyMessage}>
          尚未設定分類，請先編輯賽事並新增分類。
        </p>
      </Card>
    );
  }

  const categoryTabs = categories.map((cat) => ({
    id: cat.id,
    label: `${cat.name} (${cat.currentParticipants}/${cat.maxParticipants})`,
  }));

  return (
    <div className={styles.categoryPlayersManager}>
      <Tabs
        tabs={categoryTabs}
        activeTab={activeCategory}
        onChange={setActiveCategory}
      />

      <div className={styles.content}>
        {/* Statistics Card */}
        <Card className={styles.statsCard}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>總報名</span>
              <span className={styles.statValue}>
                {currentCategoryData?.matchType === "singles"
                  ? players.filter((p) => p.status !== "declined").length
                  : teams.filter((t) => t.status !== "declined").length}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>已確認</span>
              <span className={styles.statValue}>
                {currentCategoryData?.matchType === "singles"
                  ? players.filter((p) => p.status === "confirmed").length
                  : teams.filter((t) => t.status === "confirmed").length}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>待審核</span>
              <span className={styles.statValue}>
                {currentCategoryData?.matchType === "singles"
                  ? players.filter((p) => p.status === "pending").length
                  : teams.filter((t) => t.status === "pending").length}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>名額上限</span>
              <span className={styles.statValue}>
                {currentCategoryData?.maxParticipants}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>剩餘名額</span>
              <span
                className={`${styles.statValue} ${
                  (currentCategoryData?.maxParticipants || 0) -
                    (currentCategoryData?.currentParticipants || 0) <=
                  0
                    ? styles.statDanger
                    : (currentCategoryData?.maxParticipants || 0) -
                        (currentCategoryData?.currentParticipants || 0) <=
                      3
                    ? styles.statWarning
                    : styles.statSuccess
                }`}
              >
                {(currentCategoryData?.maxParticipants || 0) -
                  (currentCategoryData?.currentParticipants || 0)}
              </span>
            </div>
          </div>
        </Card>

        <div className={styles.titleContainer}>
          <h3>
            {currentCategoryData?.matchType === "singles"
              ? "報名選手列表"
              : "報名隊伍列表"}
          </h3>

          <div className={styles.actions}>
            <Button
              variant="outline"
              onClick={() => setShowTestModal(true)}
              size="small"
            >
              測試數據
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              新增
              {currentCategoryData?.matchType === "singles" ? "選手" : "隊伍"}
            </Button>
          </div>
        </div>

        <Card>
          {loading ? (
            <p className={styles.loadingMessage}>載入中...</p>
          ) : currentCategoryData?.matchType === "singles" ? (
            // Singles display
            players.filter((p) => p.status !== "declined").length === 0 ? (
              <p className={styles.emptyMessage}>尚無選手報名</p>
            ) : (
              <div className={styles.participantsList}>
                {players
                  .filter((p) => p.status !== "declined")
                  .map((player) => (
                    <div key={player.id} className={styles.participantCard}>
                      <div className={styles.participantItem}>
                        <div className={styles.participantAvatar}>
                          {player.photoURL ? (
                            <img src={player.photoURL} alt={player.name} />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div className={styles.participantDetails}>
                          <span className={styles.participantName}>
                            {player.name}
                          </span>
                          <span className={styles.participantEmail}>
                            {player.email}
                          </span>
                        </div>
                        <div className={styles.participantMeta}>
                          {player.manualAdded && (
                            <span className={styles.badge}>手動新增</span>
                          )}
                          {player.status === "confirmed" && (
                            <span className={styles.badgeSuccess}>已確認</span>
                          )}
                        </div>
                      </div>
                      {player.status === "pending" ? (
                        <div className={styles.participantActions}>
                          <Button
                            variant="primary"
                            onClick={() => handleApprove(player.id, true)}
                            loading={approvingId === player.id}
                            disabled={
                              approvingId !== null ||
                              rejectingId !== null ||
                              deletingId !== null
                            }
                            size="small"
                          >
                            批准
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleReject(player.id, true)}
                            loading={rejectingId === player.id}
                            disabled={
                              approvingId !== null ||
                              rejectingId !== null ||
                              deletingId !== null
                            }
                            size="small"
                          >
                            婉拒
                          </Button>
                        </div>
                      ) : (
                        player.status === "confirmed" && (
                          <div className={styles.participantActions}>
                            <Button
                              variant="outline"
                              onClick={() =>
                                handleDelete(player.id, player.name, true)
                              }
                              loading={deletingId === player.id}
                              disabled={deletingId !== null}
                              size="small"
                            >
                              刪除
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  ))}
              </div>
            )
          ) : // Doubles display
          teams.filter((t) => t.status !== "declined").length === 0 ? (
            <p className={styles.emptyMessage}>尚無隊伍報名</p>
          ) : (
            <div className={styles.participantsList}>
              {teams
                .filter((t) => t.status !== "declined")
                .map((team) => (
                  <div key={team.id} className={styles.participantCard}>
                    <div className={styles.participantItem}>
                      <div className={styles.teamAvatars}>
                        <div className={styles.participantAvatar}>
                          {team.player1PhotoURL ? (
                            <img
                              src={team.player1PhotoURL}
                              alt={team.player1Name}
                            />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div className={styles.participantAvatar}>
                          {team.player2PhotoURL ? (
                            <img
                              src={team.player2PhotoURL}
                              alt={team.player2Name}
                            />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                      </div>
                      <div className={styles.participantDetails}>
                        <div className={styles.playerInfo}>
                          <span className={styles.participantName}>
                            {team.player1Name}
                          </span>
                          <span className={styles.participantEmail}>
                            {team.player1Email || ""}
                          </span>
                        </div>
                        <div className={styles.playerInfo}>
                          <span className={styles.participantName}>
                            {team.player2Name}
                          </span>
                          <span className={styles.participantEmail}>
                            {team.player2Email || ""}
                          </span>
                        </div>
                      </div>
                      <div className={styles.participantMeta}>
                        {team.status === "confirmed" && (
                          <span className={styles.badgeSuccess}>已確認</span>
                        )}
                      </div>
                    </div>
                    {team.status === "pending" ? (
                      <div className={styles.participantActions}>
                        <Button
                          variant="primary"
                          onClick={() => handleApprove(team.id, false)}
                          loading={approvingId === team.id}
                          disabled={
                            approvingId !== null ||
                            rejectingId !== null ||
                            deletingId !== null
                          }
                          size="small"
                        >
                          批准
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReject(team.id, false)}
                          loading={rejectingId === team.id}
                          disabled={
                            approvingId !== null ||
                            rejectingId !== null ||
                            deletingId !== null
                          }
                          size="small"
                        >
                          婉拒
                        </Button>
                      </div>
                    ) : (
                      team.status === "confirmed" && (
                        <div className={styles.participantActions}>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleDelete(
                                team.id,
                                `${team.player1Name} / ${team.player2Name}`,
                                false
                              )
                            }
                            loading={deletingId === team.id}
                            disabled={deletingId !== null}
                            size="small"
                          >
                            刪除
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      {/* Test Data Generation Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false);
          setTestCount("10");
        }}
        title={`生成測試數據 - ${currentCategoryData?.name}`}
      >
        <div className={styles.modalContent}>
          <div className={styles.testInfo}>
            <p>此功能僅供測試使用</p>
            <p>
              將自動生成指定數量的測試
              {currentCategoryData?.matchType === "singles" ? "選手" : "隊伍"}
              ，所有狀態為「已確認」。
            </p>
          </div>

          <TextField
            label={`生成數量（${
              currentCategoryData?.matchType === "singles" ? "選手" : "隊伍"
            }）`}
            type="number"
            value={testCount}
            onChange={(e) => setTestCount(e.target.value)}
            placeholder="1-50"
            inputProps={{ min: 1, max: 50 }}
            required
            fullWidth
            variant="outlined"
            size="medium"
          />

          <div className={styles.modalActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowTestModal(false);
                setTestCount("10");
              }}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateTestData}
              loading={generating}
            >
              生成測試數據
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Player/Team Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setPlayerEmail("");
          setPlayerName("");
          setPartnerEmail("");
          setPartnerName("");
          setFoundUser(null);
        }}
        title={`手動新增${
          currentCategoryData?.matchType === "singles" ? "選手" : "隊伍"
        } - ${currentCategoryData?.name}`}
      >
        <div className={styles.modalContent}>
          <div className={styles.searchSection}>
            <TextField
              label={
                currentCategoryData?.matchType === "singles"
                  ? "選手 Email"
                  : "選手1 Email"
              }
              type="email"
              value={playerEmail}
              onChange={(e) => setPlayerEmail(e.target.value)}
              placeholder="輸入 Email 搜尋已註冊用戶"
              fullWidth
              variant="outlined"
              size="medium"
            />
            <Button
              variant="secondary"
              onClick={handleSearchUser}
              loading={searchingUser}
              size="small"
            >
              搜尋
            </Button>
          </div>

          {foundUser && (
            <div className={styles.foundUser}>
              <User size={20} />
              <span>找到用戶：{foundUser.name}</span>
            </div>
          )}

          <TextField
            label={
              currentCategoryData?.matchType === "singles"
                ? "選手姓名"
                : "選手1 姓名"
            }
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="請輸入姓名"
            required
            fullWidth
            variant="outlined"
            size="medium"
          />

          {currentCategoryData?.matchType === "doubles" && (
            <>
              <div className={styles.divider}>雙打隊友</div>

              <TextField
                label="選手2 Email（選填）"
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="隊友 Email"
                fullWidth
                variant="outlined"
                size="medium"
              />

              <TextField
                label="選手2 姓名"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="請輸入隊友姓名"
                required
                fullWidth
                variant="outlined"
                size="medium"
              />
            </>
          )}

          <div className={styles.modalActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setPlayerEmail("");
                setPlayerName("");
                setPartnerEmail("");
                setPartnerName("");
                setFoundUser(null);
              }}
            >
              取消
            </Button>
            <Button variant="primary" onClick={handleAdd} loading={adding}>
              新增
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryPlayersManager;
