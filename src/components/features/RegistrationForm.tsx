import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { registerForTournament } from "../../services/registrationService";
import {
  getCategories,
  incrementParticipants,
} from "../../services/categoryService";
import { createTeam } from "../../services/teamService";
import { searchUserByEmail } from "../../services/userService";
import Button from "../common/Button";
import Input from "../common/Input";
import Card from "../common/Card";
import styles from "./RegistrationForm.module.scss";
import type { Category } from "../../types";

export interface RegistrationFormProps {
  tournamentId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  tournamentId,
  onSuccess,
  onCancel,
}) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState(currentUser?.displayName || "");
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState("");

  // Category selection
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [registrationStatus, setRegistrationStatus] = useState<
    "none" | "pending" | "confirmed" | "declined"
  >("none");

  // Doubles partner
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [searchingPartner, setSearchingPartner] = useState(false);
  const [partnerFound, setPartnerFound] = useState<{
    uid: string;
    name: string;
    photoURL?: string;
  } | null>(null);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const data = await getCategories(tournamentId);
        setCategories(data.filter((c) => c.status === "REGISTRATION_OPEN"));

        if (data.length > 0) {
          setSelectedCategoryId(data[0].id);
          setSelectedCategory(data[0]);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        setError("載入分類失敗");
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [tournamentId]);

  // Update selected category and check registration status
  useEffect(() => {
    const category = categories.find((c) => c.id === selectedCategoryId);
    setSelectedCategory(category || null);

    // Reset partner info when switching categories
    setPartnerEmail("");
    setPartnerName("");
    setPartnerFound(null);
    setError("");

    // Check if already registered in this category
    if (category && currentUser) {
      checkCategoryRegistration(category);
    }
  }, [selectedCategoryId, categories, currentUser]);

  const checkCategoryRegistration = async (category: Category) => {
    if (!currentUser) return;

    try {
      if (category.matchType === "singles") {
        // Check players - 需要按照 categoryId 篩選
        const { getPlayersByCategory } = await import(
          "../../services/registrationService"
        );
        const players = await getPlayersByCategory(tournamentId, category.id);
        const myRegistration = players.find(
          (p) => p.uid === currentUser.uid || p.email === currentUser.email
        );

        if (myRegistration) {
          setRegistrationStatus(myRegistration.status);
        } else {
          setRegistrationStatus("none");
        }
      } else {
        // Check teams
        const { getUserTeam } = await import("../../services/teamService");
        const myTeam = await getUserTeam(
          tournamentId,
          category.id,
          currentUser.uid
        );

        if (myTeam) {
          setRegistrationStatus(myTeam.status);
        } else {
          setRegistrationStatus("none");
        }
      }
    } catch (error) {
      console.error("Failed to check registration:", error);
      setRegistrationStatus("none");
    }
  };

  const handleSearchPartner = async () => {
    if (!partnerEmail.trim()) {
      setError("請輸入隊友 Email");
      return;
    }

    setSearchingPartner(true);
    setError("");

    try {
      const user = await searchUserByEmail(partnerEmail.trim());
      if (user) {
        setPartnerFound({
          uid: user.uid,
          name: user.displayName || user.email || "未知用戶",
          photoURL: user.photoURL || undefined,
        });
        setPartnerName(user.displayName || "");
      } else {
        setPartnerFound(null);
        setError("找不到此用戶，您可以手動輸入隊友姓名");
      }
    } catch (err: any) {
      setError(err.message || "搜尋失敗");
      setPartnerFound(null);
    } finally {
      setSearchingPartner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !currentUser.email) {
      setError("請先登入");
      return;
    }

    if (!name.trim()) {
      setError("請輸入姓名");
      return;
    }

    if (!selectedCategoryId || !selectedCategory) {
      setError("請選擇分類");
      return;
    }

    // 檢查報名狀態
    if (registrationStatus === "pending") {
      setError("您已報名此分類，正在等待主辦方確認中");
      return;
    }
    
    // 驗證分類配置（通用引擎）
    try {
      const { canRegisterForCategory } = await import(
        "../../services/registrationService"
      );
      const validation = await canRegisterForCategory(
        tournamentId,
        selectedCategoryId
      );
      
      if (!validation.canRegister) {
        setError(validation.reason || "無法報名此分類");
        return;
      }
    } catch (err) {
      console.error("驗證報名資格失敗:", err);
      // 繼續執行，不阻止報名
    }

    if (registrationStatus === "confirmed") {
      setError("您已成功報名此分類");
      return;
    }

    // Doubles validation
    if (selectedCategory.matchType === "doubles") {
      if (!partnerName.trim()) {
        setError("請輸入隊友姓名或搜尋隊友");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      if (selectedCategory.matchType === "singles") {
        // Singles registration
        await registerForTournament(tournamentId, {
          uid: currentUser.uid,
          email: currentUser.email,
          name: name.trim(),
          photoURL: currentUser.photoURL || undefined,
          categoryId: selectedCategoryId, // 添加分類 ID
        });

        // 只有新增時才增加計數（重新報名不增加）
        try {
          await incrementParticipants(tournamentId, selectedCategoryId, 1);
        } catch (incrementError) {
          console.error("Failed to increment participants:", incrementError);
          // 不影響報名流程
        }
        
        // 報名成功，顯示成功訊息
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Doubles registration - create team
        // 檢查是否將自己加為隊友
        if (partnerFound?.uid === currentUser.uid || partnerEmail.trim() === currentUser.email) {
          setError("不能將自己加為隊友");
          setLoading(false);
          return;
        }
        
        await createTeam(tournamentId, selectedCategoryId, {
          player1Id: currentUser.uid,
          player2Id: partnerFound?.uid || `shadow-${Date.now()}`,
          player1Name: name.trim(),
          player2Name: partnerName.trim(),
          player1Email: currentUser.email,
          player2Email: partnerEmail.trim() || undefined,
          player1PhotoURL: currentUser.photoURL || undefined,
          player2PhotoURL: partnerFound?.photoURL,
        });
        
        // 報名成功，顯示成功訊息
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || "報名失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (loadingCategories) {
    return (
      <div className={styles.form}>
        <p>載入中...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={styles.form}>
        <p className={styles.error}>目前沒有開放報名的分類</p>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            關閉
          </Button>
        )}
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formContent}>
        <h3 className={styles.title}>報名賽事</h3>

        <div className={styles.formGroup}>
          <label className={styles.label}>選擇分類</label>
          <select
            className={styles.select}
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} (
                {category.matchType === "singles" ? "單打" : "雙打"}) -
                {category.currentParticipants}/{category.maxParticipants} 已報名
              </option>
            ))}
          </select>
        </div>

        {/* 顯示報名狀態 */}
        {registrationStatus === "pending" && (
          <div
            className={styles.statusBadge}
            style={{ background: "rgba(255, 193, 7, 0.1)", color: "#f57c00" }}
          >
            您已報名此分類，等待主辦方確認中
          </div>
        )}

        {registrationStatus === "confirmed" && (
          <div
            className={styles.statusBadge}
            style={{ background: "rgba(0, 230, 118, 0.1)", color: "#00e676" }}
          >
            ✓ 您已成功報名此分類
          </div>
        )}

        {registrationStatus === "declined" && (
          <div
            className={styles.statusBadge}
            style={{ background: "rgba(255, 82, 82, 0.1)", color: "#ff5252" }}
          >
            ✗ 您的報名已被婉拒，可以重新報名
          </div>
        )}

        <Input
          label="您的姓名"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="請輸入您的姓名"
          required
        />

        {selectedCategory?.matchType === "doubles" && (
          <>
            <div className={styles.divider}>
              <span>隊友資訊</span>
            </div>

            <div className={styles.partnerSearch}>
              <Input
                label="隊友 Email（選填）"
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="搜尋已註冊的用戶"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSearchPartner}
                loading={searchingPartner}
                size="small"
              >
                搜尋
              </Button>
            </div>

            {partnerFound && (
              <Card className={styles.partnerCard}>
                <div className={styles.partnerInfo}>
                  {partnerFound.photoURL && (
                    <img
                      src={partnerFound.photoURL}
                      alt={partnerFound.name}
                      className={styles.partnerAvatar}
                    />
                  )}
                  <div>
                    <div className={styles.partnerName}>
                      {partnerFound.name}
                    </div>
                    <div className={styles.partnerStatus}>✓ 已找到用戶</div>
                  </div>
                </div>
              </Card>
            )}

            <Input
              label="隊友姓名"
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="請輸入隊友姓名"
              required
            />

            <p className={styles.hint}>
              如果您的隊友尚未註冊，請直接輸入姓名。系統會為其建立臨時帳號。
            </p>
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
      <div className={styles.formFooter}>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} type="button">
            取消
          </Button>
        )}
        <Button
          variant="primary"
          type="submit"
          loading={loading}
          disabled={
            registrationStatus === "pending" ||
            registrationStatus === "confirmed"
          }
        >
          {registrationStatus === "declined" ? "重新報名" : "確認報名"}
        </Button>
      </div>
    </form>
  );
};

export default RegistrationForm;
