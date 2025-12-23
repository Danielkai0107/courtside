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
import { useSportPreference } from "../hooks/useSportPreference";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import AvatarWithSkeleton from "../components/common/AvatarWithSkeleton";
import SportSelectionModal from "../components/common/SportSelectionModal";
import styles from "./Profile.module.scss";
import type { Sport } from "../types";

const Profile: React.FC = () => {
  const { currentUser, logout, loading } = useAuth();
  const {
    preferredSportId,
    updateSportPreference,
    loading: loadingSportPref,
    needsFirstSelection,
  } = useSportPreference();
  const navigate = useNavigate();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);

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

  const handleSportPreferenceChange = async (
    sportId: string,
    sportName: string
  ) => {
    try {
      await updateSportPreference(sportId, sportName);
      setShowSportModal(false);
    } catch (error) {
      console.error("Failed to update sport preference:", error);
      alert("更新項目偏好失敗，請稍後再試");
    }
  };

  // 獲取當前選擇的運動項目顯示文字
  const getCurrentSportDisplay = () => {
    if (!preferredSportId) return "";
    const sport = sports.find((s) => s.id === preferredSportId);
    return sport ? `${sport.icon} ${sport.name}` : "";
  };

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
              swap_horiz
            </span>
          </button>
        )}
      </div>

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
