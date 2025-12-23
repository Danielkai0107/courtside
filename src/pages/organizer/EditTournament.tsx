import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { TextField } from "@mui/material";
import {
  getTournament,
  updateTournament,
} from "../../services/tournamentService";
import {
  uploadTournamentBanner,
  validateImageFile,
} from "../../services/storageService";
import { getActiveSports } from "../../services/sportService";
import {
  getCategories,
  updateCategory,
  createCategory,
} from "../../services/categoryService";
import { getFormat } from "../../services/formatService";
import { useAuth } from "../../contexts/AuthContext";
import { useSportPreference } from "../../hooks/useSportPreference";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import CategoryManager from "../../components/features/CategoryManager";
import styles from "./CreateTournament.module.scss";
import type { Sport, Tournament, Category } from "../../types";

const EditTournament: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { preferredSportId, loading: loadingSportPref } = useSportPreference();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSports, setLoadingSports] = useState(true);
  const [error, setError] = useState("");

  // Original data
  const [originalTournament, setOriginalTournament] = useState<Tournament | null>(null);
  const [originalCategories, setOriginalCategories] = useState<Category[]>([]);

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
      id?: string; // 用於更新現有分類
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

  // Load sports from database
  useEffect(() => {
    const loadSports = async () => {
      try {
        setLoadingSports(true);
        const data = await getActiveSports();
        setSports(data);
      } catch (error) {
        console.error("Failed to load sports:", error);
        setError("載入球類項目失敗");
      } finally {
        setLoadingSports(false);
      }
    };

    loadSports();
  }, []);

  // Load tournament data
  useEffect(() => {
    const loadTournamentData = async () => {
      if (!id) return;

      try {
        setLoadingData(true);

        // Load tournament
        const tournamentData = await getTournament(id);
        if (!tournamentData) {
          setError("找不到此賽事");
          return;
        }

        // Check permission
        if (currentUser && tournamentData.organizerId !== currentUser.uid) {
          setError("您沒有權限編輯此賽事");
          return;
        }

        setOriginalTournament(tournamentData);

        // Load categories
        const categoriesData = await getCategories(id);
        setOriginalCategories(categoriesData);

        // Populate form fields
        setName(tournamentData.name);
        setLocation(tournamentData.location);
        setDescription(tournamentData.description || "");
        setBannerPreview(tournamentData.bannerURL || "");

        // Convert timestamps to date and time format
        const startDateObj = (tournamentData.startDate || tournamentData.date).toDate();
        const endDateObj = tournamentData.endDate 
          ? tournamentData.endDate.toDate() 
          : startDateObj;

        setStartDate(formatDate(startDateObj));
        setStartTime(formatTime(startDateObj));
        setEndDate(formatDate(endDateObj));
        setEndTime(formatTime(endDateObj));

        // Set sport
        const sport = sports.find((s) => s.id === tournamentData.sportId);
        if (sport) {
          setSelectedSport(sport);
        }

        // Convert categories - 載入完整的模板資料
        const categoriesForm = await Promise.all(
          categoriesData.map(async (cat) => {
            let selectedFormat = undefined;
            
            // 如果有 selectedFormatId，載入完整的模板資料
            if (cat.selectedFormatId) {
              try {
                selectedFormat = await getFormat(cat.selectedFormatId);
              } catch (error) {
                console.warn(`Failed to load format ${cat.selectedFormatId}:`, error);
              }
            }

            return {
              id: cat.id,
              name: cat.name,
              matchType: cat.matchType,
              maxParticipants: cat.maxParticipants,
              format: cat.format,
              pointsPerSet: cat.pointsPerSet,
              enableThirdPlaceMatch: cat.enableThirdPlaceMatch,
              selectedFormat,
              ruleConfig: cat.ruleConfig || undefined,
              groupConfig: cat.groupConfig || undefined,
            };
          })
        );
        setCategories(categoriesForm as any);
      } catch (error) {
        console.error("Failed to load tournament data:", error);
        setError("載入賽事資料失敗");
      } finally {
        setLoadingData(false);
      }
    };

    if (!loadingSports) {
      loadTournamentData();
    }
  }, [id, currentUser, loadingSports, sports]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

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
    if (!currentUser || !id) return;
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

      // 1. Update tournament basic info
      const tournamentData: any = {
        name: name.trim(),
        sportId: selectedSport.id,
        sportType: selectedSport.id as Tournament["sportType"],
        startDate: Timestamp.fromDate(startDateTime),
        endDate: Timestamp.fromDate(endDateTime),
        location: location.trim(),
        stats: {
          totalCategories: categories.length,
          totalMatches: originalTournament?.stats?.totalMatches || 0,
        },
      };

      if (description.trim()) {
        tournamentData.description = description.trim();
      }

      await updateTournament(id, tournamentData);

      // 2. Upload banner if changed
      if (bannerFile) {
        const uploadedURL = await uploadTournamentBanner(id, bannerFile);
        await updateTournament(id, { bannerURL: uploadedURL });
      }

      // 3. Update or create categories
      const existingCategoryIds = originalCategories.map((c) => c.id);
      const updatedCategoryIds: string[] = [];

      for (const category of categories) {
        if (category.id && existingCategoryIds.includes(category.id)) {
          // Update existing category
          const updateData: any = {
            name: category.name,
            matchType: category.matchType,
            maxParticipants: category.maxParticipants,
            format: category.format,
            pointsPerSet: category.pointsPerSet,
            enableThirdPlaceMatch: category.enableThirdPlaceMatch,
            groupConfig: category.groupConfig,
          };

          // 包含賽制模板和規則配置
          if (category.selectedFormat?.id) {
            updateData.selectedFormatId = category.selectedFormat.id;
          }
          if (category.ruleConfig) {
            updateData.ruleConfig = category.ruleConfig;
          }

          await updateCategory(id, category.id, updateData);
          updatedCategoryIds.push(category.id);
        } else {
          // Create new category
          const createData: any = {
            name: category.name,
            matchType: category.matchType,
            maxParticipants: category.maxParticipants,
            format: category.format,
            pointsPerSet: category.pointsPerSet,
            enableThirdPlaceMatch: category.enableThirdPlaceMatch,
            groupConfig: category.groupConfig,
            status: "REGISTRATION_OPEN",
            currentParticipants: 0,
          };

          // 包含賽制模板和規則配置
          if (category.selectedFormat?.id) {
            createData.selectedFormatId = category.selectedFormat.id;
          }
          if (category.ruleConfig) {
            createData.ruleConfig = category.ruleConfig;
          }

          const newCategoryId = await createCategory(id, createData);
          updatedCategoryIds.push(newCategoryId);
        }
      }

      // Note: 暫不刪除已移除的 categories，因為可能有報名資料
      // 未來可以添加警告或軟刪除機制

      navigate(`/organizer/tournaments/${id}`);  // 返回控制台
    } catch (err: any) {
      setError(err.message || "更新賽事失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (loadingSports || loadingData || loadingSportPref) {
    return <Loading fullScreen />;
  }

  if (error && !originalTournament) {
    return (
      <div className={styles.createTournament}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h2 className={styles.headerTitle}>編輯賽事</h2>
        </div>
        <div className={styles.content}>
          <div className={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  if (sports.length === 0) {
    return (
      <div className={styles.createTournament}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h2 className={styles.headerTitle}>編輯賽事</h2>
        </div>
        <div className={styles.content}>
          <div className={styles.error}>
            目前沒有可用的球類項目，請聯繫管理員設定。
          </div>
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
        <h2 className={styles.headerTitle}>編輯賽事 - {steps[currentStep - 1]}</h2>
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
                {selectedSport && (
                  <div className={styles.sportDisplay}>
                    <div className={styles.sportIcon}>{selectedSport.icon}</div>
                    <div className={styles.sportInfo}>
                      <div className={styles.sportName}>{selectedSport.name}</div>
                      <div className={styles.sportHint}>
                        球類項目無法修改
                      </div>
                    </div>
                  </div>
                )}
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
                  {bannerFile ? "更換圖片" : "選擇圖片"}
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
                    onChange={(e) => setStartDate(e.target.value)}
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
                    onChange={(e) => setStartTime(e.target.value)}
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
              <p className={styles.warningText}>
                注意：修改已有報名的分類可能影響參賽者。建議僅在報名開始前修改。
              </p>
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
            <Button variant="ghost" onClick={handleBack} disabled={loading}>
              上一步
            </Button>
          )}
          {currentStep < steps.length ? (
            <Button variant="primary" onClick={handleNext} disabled={loading}>
              下一步
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              fullWidth
            >
              儲存變更
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditTournament;

