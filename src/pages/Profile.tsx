import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Camera } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "../services/firebase";
import {
  uploadUserAvatar,
  validateImageFile,
} from "../services/storageService";
import { getActiveSports } from "../services/sportService";
import { useAuth } from "../contexts/AuthContext";
import { useRoleSwitch } from "../contexts/RoleSwitchContext";
import { useSportPreference } from "../hooks/useSportPreference";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Select from "../components/common/Select";
import SelectableCard from "../components/common/SelectableCard";
import AvatarWithSkeleton from "../components/common/AvatarWithSkeleton";
import styles from "./Profile.module.scss";
import type { UserRole, Sport } from "../types";

const Profile: React.FC = () => {
  const { currentUser, logout, loading } = useAuth();
  const { startTransition } = useRoleSwitch();
  const {
    preferredSportId,
    updateSportPreference,
    loading: loadingSportPref,
  } = useSportPreference();
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState<UserRole>("user");
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 只在 Auth 完全加載後才檢查登入狀態
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login", { replace: true });
    }
  }, [currentUser, loading, navigate]);

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
    // Load current role from Firestore
    if (currentUser) {
      const loadUserRole = async () => {
        try {
          const userDoc = await import("firebase/firestore").then(
            ({ getDoc, doc }) => getDoc(doc(db, "users", currentUser.uid))
          );
          if (userDoc.exists()) {
            setCurrentRole(userDoc.data().currentRole || "user");
          }
        } catch (error) {
          console.error("Failed to load user role:", error);
        }
      };
      loadUserRole();
    }
  }, [currentUser]);

  const handleRoleChange = async (role: UserRole) => {
    if (!currentUser) return;

    setUpdating(true);

    // 啟動切換動畫
    startTransition(role, async () => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
          currentRole: role,
        });
        setCurrentRole(role);

        // Navigate based on role
        if (role === "organizer") {
          navigate("/organizer");
        } else if (role === "scorer") {
          navigate("/scorer");
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Failed to update role:", error);
      } finally {
        setUpdating(false);
      }
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingAvatar(true);
    try {
      // Upload to Storage
      const photoURL = await uploadUserAvatar(currentUser.uid, file);

      // Update Firebase Auth profile
      await updateProfile(currentUser, { photoURL });

      // Update Firestore user document
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { photoURL });

      // Force reload
      window.location.reload();
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      alert("上傳頭像失敗，請稍後再試");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSportPreferenceChange = async (sportId: string) => {
    try {
      await updateSportPreference(sportId);
    } catch (error) {
      console.error("Failed to update sport preference:", error);
      alert("更新項目偏好失敗，請稍後再試");
    }
  };

  const sportOptions = [
    { value: "all", label: "全部項目" },
    ...sports.map((sport) => ({
      value: sport.id,
      label: `${sport.icon} ${sport.name}`,
    })),
  ];

  if (!currentUser) {
    return (
      <div className={styles.notLoggedIn}>
        <p>登入後即可查看您的個人資料</p>
        <Button onClick={() => navigate("/login")}>前往登入</Button>
      </div>
    );
  }

  return (
    <div className={styles.profile}>
      <div className={styles.content}>
        <Card className={styles.userInfo}>
          <label className={styles.avatarContainer}>
            <AvatarWithSkeleton
              src={currentUser.photoURL || undefined}
              alt={currentUser.displayName || "用戶"}
              size={44}
              className={styles.avatar}
              fallbackIcon={<User size={24} />}
            />
            <div className={styles.avatarOverlay}>
              {uploadingAvatar ? (
                <span className={styles.uploading}>上傳中...</span>
              ) : (
                <>
                  <Camera size={20} />
                  <span>更換</span>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
              disabled={uploadingAvatar}
            />
          </label>
          <div className={styles.userInfoContent}>
            <h3 className={styles.name}>{currentUser.displayName || "用戶"}</h3>
            <p className={styles.email}>{currentUser.email}</p>
          </div>
        </Card>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>運動項目</h3>
          <p className={styles.sectionDescription}>選擇您感興趣的運動項目</p>

          <div className={styles.globalNotice}>
            <span>
              此設定會影響所有視角的賽事顯示，包含「賽事直播」、「賽事列表」、「主辦方」及「紀錄員」頁面
            </span>
          </div>

          {!loadingSports && !loadingSportPref && sportOptions.length > 0 && (
            <Select
              options={sportOptions}
              value={preferredSportId}
              onChange={handleSportPreferenceChange}
              fullWidth={true}
              className={styles.sportSelector}
            />
          )}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>目前角色</h3>
          <p className={styles.sectionDescription}>切換角色以存取不同功能</p>

          <div className={styles.roleCards}>
            <SelectableCard
              title="選手、觀眾"
              value=""
              subtitle="報名、瀏覽"
              selected={currentRole === "user"}
              onClick={() => handleRoleChange("user")}
              disabled={updating}
            />

            <SelectableCard
              title="主辦方"
              value=""
              subtitle="建立賽事"
              selected={currentRole === "organizer"}
              onClick={() => handleRoleChange("organizer")}
              disabled={updating}
            />

            <SelectableCard
              title="紀錄員"
              value=""
              subtitle="記錄比分"
              selected={currentRole === "scorer"}
              onClick={() => handleRoleChange("scorer")}
              disabled={updating}
            />
          </div>
        </div>

        <Button
          variant="ghost"
          fullWidth={false}
          onClick={async () => {
            await logout();
            navigate("/");
          }}
          className={styles.logoutButton}
        >
          <LogOut size={20} />
          登出
        </Button>
      </div>
    </div>
  );
};

export default Profile;
