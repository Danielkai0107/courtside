import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { TextField } from "@mui/material";
import {
  createTournament,
  updateTournament,
} from "../../services/tournamentService";
import {
  uploadTournamentBanner,
  validateImageFile,
} from "../../services/storageService";
import { getActiveSports } from "../../services/sportService";
import { useAuth } from "../../contexts/AuthContext";
import { useSportPreference } from "../../hooks/useSportPreference";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import CategoryManager from "../../components/features/CategoryManager";
import styles from "./CreateTournament.module.scss";
import type { Sport, Tournament } from "../../types";
import { createCategory } from "../../services/categoryService";

const CreateTournament: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { preferredSportId, loading: loadingSportPref } = useSportPreference();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingSports, setLoadingSports] = useState(true);
  const [error, setError] = useState("");

  // Sports from database
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);

  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");

  // Step 2: Time & Location
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");

  // Step 3: Categories
  const [categories, setCategories] = useState<
    Array<{
      name: string;
      matchType: "singles" | "doubles";
      maxParticipants: number;
      format: "KNOCKOUT_ONLY" | "GROUP_THEN_KNOCKOUT";
      pointsPerSet: number;
      enableThirdPlaceMatch: boolean;
      selectedFormat?: any; // FormatTemplate
      ruleConfig?: {
        matchType: "set_based" | "point_based";
        maxSets: number;
        pointsPerSet: number;
        setsToWin: number;
        winByTwo: boolean;
        cap?: number;
      };
      groupConfig?: {
        totalGroups: number;
        advancePerGroup: number;
        bestThirdPlaces: number;
      };
    }>
  >([]);

  // Step 4: Description
  const [description, setDescription] = useState("");

  const steps = ["基本資訊", "時間地點", "分類設定", "文宣說明"];

  // Load sports from database and auto-select based on user preference
  useEffect(() => {
    const loadSports = async () => {
      try {
        setLoadingSports(true);
        const data = await getActiveSports();
        setSports(data);

        // 根據全局設定自動選擇球類項目
        if (preferredSportId) {
          const sport = data.find((s) => s.id === preferredSportId);
          if (sport) {
            setSelectedSport(sport);
          }
        }
      } catch (error) {
        console.error("Failed to load sports:", error);
        setError("載入球類項目失敗");
      } finally {
        setLoadingSports(false);
      }
    };

    if (!loadingSportPref) {
      loadSports();
    }
  }, [preferredSportId, loadingSportPref]);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "");
      return;
    }

    setBannerFile(file);
    setError("");

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateStep = (step: number): boolean => {
    setError("");

    switch (step) {
      case 1:
        if (!name.trim()) {
          setError("請輸入賽事名稱");
          return false;
        }
        return true;

      case 2:
        if (!startDate) {
          setError("請選擇開始日期");
          return false;
        }
        if (!startTime) {
          setError("請選擇開始時間");
          return false;
        }
        if (!endDate) {
          setError("請選擇結束日期");
          return false;
        }
        if (!endTime) {
          setError("請選擇結束時間");
          return false;
        }
        // 組合日期和時間進行比較
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);
        if (endDateTime <= startDateTime) {
          setError("結束時間必須晚於開始時間");
          return false;
        }
        if (!location.trim()) {
          setError("請輸入比賽地點");
          return false;
        }
        return true;

      case 3:
        if (categories.length === 0) {
          setError("請至少新增一個賽事分類");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const handleBack = () => {
    setError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError("");

    try {
      if (!selectedSport) {
        setError("請選擇球類項目");
        return;
      }

      // 組合日期和時間
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);

      // Build tournament data - simplified for new architecture
      const tournamentData: any = {
        name: name.trim(),
        sportId: selectedSport.id,
        sportType: selectedSport.id as Tournament["sportType"],
        startDate: Timestamp.fromDate(startDateTime),
        endDate: Timestamp.fromDate(endDateTime),
        date: Timestamp.fromDate(startDateTime), // 向下相容，用於排序
        location: location.trim(),
        status: "DRAFT",
        organizerId: currentUser.uid,
        organizerName:
          currentUser.displayName || currentUser.email || "匿名主辦方",
        organizerPhotoURL: currentUser.photoURL || undefined,
        stats: {
          totalCategories: categories.length,
          totalMatches: 0,
        },
      };

      // Only add optional fields if they have values
      if (description.trim()) {
        tournamentData.description = description.trim();
      }

      // 1. Create tournament
      const tournamentId = await createTournament(tournamentData);

      // 2. Upload banner if exists
      if (bannerFile) {
        const uploadedURL = await uploadTournamentBanner(
          tournamentId,
          bannerFile
        );
        await updateTournament(tournamentId, { bannerURL: uploadedURL });
      }

      // 3. Create all categories（不再生成佔位符，等到賽程管理時才根據實際人數決定）
      for (const category of categories) {
        console.log("📦 [CreateTournament] 準備創建分類:", {
          name: category.name,
          hasRuleConfig: !!category.ruleConfig,
          ruleConfig: category.ruleConfig,
        });

        await createCategory(tournamentId, {
          name: category.name,
          matchType: category.matchType,
          maxParticipants: category.maxParticipants,
          format: category.format,
          pointsPerSet: category.pointsPerSet,
          enableThirdPlaceMatch: category.enableThirdPlaceMatch,
          ruleConfig: category.ruleConfig,
          groupConfig: category.groupConfig,
          status: "REGISTRATION_OPEN",
          currentParticipants: 0,
        });

        console.log(` [CreateTournament] 分類已創建`);
      }

      console.log(
        "ℹ️ [CreateTournament] 賽制模板將在報名截止後，根據實際人數推薦"
      );

      navigate(`/organizer/tournaments/${tournamentId}`); // 前往控制台
    } catch (err: any) {
      setError(err.message || "建立賽事失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (loadingSports || loadingSportPref) {
    return <Loading fullScreen />;
  }

  if (!selectedSport) {
    return (
      <div className={styles.createTournament}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h2 className={styles.headerTitle}>建立賽事</h2>
        </div>
        <div className={styles.content}>
          <div className={styles.error}>請先在首頁選擇您的運動項目偏好</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.createTournament}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2 className={styles.headerTitle}>{steps[currentStep - 1]}</h2>
      </div>

      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formContent}>
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className={styles.step}>
              <TextField
                label="賽事名稱"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：2024 秋季羽球大賽"
                required
                fullWidth
                variant="outlined"
                size="medium"
              />

              <div className={styles.formGroup}>
                <label className={styles.label}>球類項目</label>
                <div className={styles.sportDisplay}>
                  <div className={styles.sportIcon}>{selectedSport.icon}</div>
                  <div className={styles.sportInfo}>
                    <div className={styles.sportName}>{selectedSport.name}</div>
                    <div className={styles.sportHint}>
                      已根據您的偏好設定自動選擇
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>賽事Banner（選填）</label>
                {bannerPreview && (
                  <div className={styles.bannerPreview}>
                    <img src={bannerPreview} alt="Preview" />
                  </div>
                )}
                <label className={styles.uploadButton}>
                  <Upload size={20} />
                  選擇圖片
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    style={{ display: "none" }}
                  />
                </label>
                <span className={styles.hint}>支援 JPG、PNG，最大 5MB</span>
              </div>
            </div>
          )}

          {/* Step 2: Time & Location */}
          {currentStep === 2 && (
            <div className={styles.step}>
              <div className={styles.formGroup}>
                <label className={styles.label}>開始日期與時間</label>
                <div className={styles.dateTimeRow}>
                  <TextField
                    label="開始日期"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      // 自動帶入相同值到結束日期
                      if (!endDate) {
                        setEndDate(e.target.value);
                      }
                    }}
                    required
                    fullWidth
                    variant="outlined"
                    size="medium"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="開始時間"
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      // 自動帶入相同值到結束時間
                      if (!endTime) {
                        setEndTime(e.target.value);
                      }
                    }}
                    required
                    fullWidth
                    variant="outlined"
                    size="medium"
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>結束日期與時間</label>
                <div className={styles.dateTimeRow}>
                  <TextField
                    label="結束日期"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    fullWidth
                    variant="outlined"
                    size="medium"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="結束時間"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    fullWidth
                    variant="outlined"
                    size="medium"
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </div>

              <TextField
                label="比賽地點"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：台北市立體育館"
                required
                fullWidth
                variant="outlined"
                size="medium"
              />
            </div>
          )}

          {/* Step 3: Categories */}
          {currentStep === 3 && (
            <div className={styles.step}>
              <CategoryManager
                categories={categories}
                onChange={setCategories}
                sport={selectedSport || undefined}
                defaultPointsPerSet={
                  selectedSport?.rulePresets?.find(
                    (p) => p.id === selectedSport.defaultPresetId
                  )?.config.pointsPerSet || 21
                }
              />
            </div>
          )}

          {/* Step 4: Description */}
          {currentStep === 4 && (
            <div className={styles.step}>
              <TextField
                label="賽事說明（選填）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="詳細說明賽事規則、獎品、注意事項等..."
                multiline
                rows={8}
                fullWidth
                variant="outlined"
                size="medium"
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        {/* Progress Bar */}
        <div className={styles.progressBar}>
          {steps.map((_, index) => (
            <div
              key={index}
              className={`${styles.progressSegment} ${
                index < currentStep ? styles.completed : ""
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className={styles.footerButtons}>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              上一步
            </Button>
          )}
          {currentStep < steps.length ? (
            <Button variant="primary" onClick={handleNext} disabled={loading}>
              下一步
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} loading={loading}>
              建立賽事
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTournament;
