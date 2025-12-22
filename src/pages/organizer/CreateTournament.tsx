import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { Timestamp } from "firebase/firestore";
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
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import SelectableCard from "../../components/common/SelectableCard";
import Loading from "../../components/common/Loading";
import CategoryManager from "../../components/features/CategoryManager";
import UniversalCategoryManager from "../../components/features/UniversalCategoryManager";
import type { UniversalCategoryFormData } from "../../components/features/UniversalCategoryManager";
import styles from "./CreateTournament.module.scss";
import type { Sport, Tournament } from "../../types";
import { createCategory, createCategoryUniversal } from "../../services/categoryService";

const CreateTournament: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

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
  const [date, setDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [location, setLocation] = useState("");

  // Step 3: Categories - 支持雙引擎
  const [useUniversalEngine, setUseUniversalEngine] = useState(true); // 默認使用通用引擎
  
  // 傳統引擎分類
  const [legacyCategories, setLegacyCategories] = useState<
    Array<{
      name: string;
      matchType: "singles" | "doubles";
      maxParticipants: number;
      format: "KNOCKOUT_ONLY" | "GROUP_THEN_KNOCKOUT";
      pointsPerSet: number;
      enableThirdPlaceMatch: boolean;
      groupConfig?: {
        totalGroups: number;
        advancePerGroup: number;
        bestThirdPlaces: number;
      };
    }>
  >([]);
  
  // 通用引擎分類
  const [universalCategories, setUniversalCategories] = useState<UniversalCategoryFormData[]>([]);

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

        // 自動選擇第一個球類項目
        if (data.length > 0) {
          setSelectedSport(data[0]);
        }
      } catch (error) {
        console.error("Failed to load sports:", error);
        setError("載入球類項目失敗");
      } finally {
        setLoadingSports(false);
      }
    };

    loadSports();
  }, []);

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
        if (!date) {
          setError("請選擇比賽日期");
          return false;
        }
        if (!registrationDeadline) {
          setError("請選擇報名截止日期");
          return false;
        }
        if (new Date(registrationDeadline) >= new Date(date)) {
          setError("報名截止日期必須早於比賽日期");
          return false;
        }
        if (!location.trim()) {
          setError("請輸入比賽地點");
          return false;
        }
        return true;

      case 3:
        const totalCategories = useUniversalEngine 
          ? universalCategories.length 
          : legacyCategories.length;
        
        if (totalCategories === 0) {
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

      // Build tournament data - simplified for new architecture
      const tournamentData: any = {
        name: name.trim(),
        sportId: selectedSport.id,
        sportType: (selectedSport as any).nameEn?.toLowerCase() || selectedSport.id,
        date: Timestamp.fromDate(new Date(date)),
        registrationDeadline: Timestamp.fromDate(
          new Date(registrationDeadline)
        ),
        location: location.trim(),
        status: "DRAFT",
        organizerId: currentUser.uid,
        organizerName:
          currentUser.displayName || currentUser.email || "匿名主辦方",
        organizerPhotoURL: currentUser.photoURL || undefined,
        stats: {
          totalCategories: useUniversalEngine 
            ? universalCategories.length 
            : legacyCategories.length,
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

      // 3. Create all categories
      if (useUniversalEngine) {
        // 使用通用引擎創建
        console.log("[CreateTournament] 使用通用引擎創建分類");
        for (const category of universalCategories) {
          await createCategoryUniversal(tournamentId, category);
        }
      } else {
        // 使用傳統引擎創建
        console.log("[CreateTournament] 使用傳統引擎創建分類");
        for (const category of legacyCategories) {
          await createCategory(tournamentId, {
            name: category.name,
            matchType: category.matchType,
            maxParticipants: category.maxParticipants,
            format: category.format,
            pointsPerSet: category.pointsPerSet,
            enableThirdPlaceMatch: category.enableThirdPlaceMatch,
            groupConfig: category.groupConfig,
            status: "REGISTRATION_OPEN",
            currentParticipants: 0,
          });
        }
      }

      navigate(`/organizer/tournaments/${tournamentId}`); // 前往控制台
    } catch (err: any) {
      setError(err.message || "建立賽事失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (loadingSports) {
    return <Loading fullScreen />;
  }

  if (sports.length === 0) {
    return (
      <div className={styles.createTournament}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h2 className={styles.headerTitle}>建立賽事</h2>
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
        <h2 className={styles.headerTitle}>{steps[currentStep - 1]}</h2>
      </div>

      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formContent}>
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className={styles.step}>
              <Input
                label="賽事名稱"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：2024 秋季羽球大賽"
                required
              />

              <div className={styles.formGroup}>
                <label className={styles.label}>球類項目</label>
                <div className={styles.optionsGrid}>
                  {sports.map((sport) => (
                    <SelectableCard
                      key={sport.id}
                      title={sport.name}
                      value={sport.icon}
                      subtitle={sport.nameEn}
                      selected={selectedSport?.id === sport.id}
                      onClick={() => {
                        setSelectedSport(sport);
                      }}
                    />
                  ))}
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
              <Input
                label="比賽日期"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                label="報名截止日期"
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                required
              />

              <Input
                label="比賽地點"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：台北市立體育館"
                required
              />
            </div>
          )}

          {/* Step 3: Categories */}
          {currentStep === 3 && (
            <div className={styles.step}>
              <div className={styles.engineSwitch}>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    checked={useUniversalEngine}
                    onChange={(e) => setUseUniversalEngine(e.target.checked)}
                  />
                  <span>使用通用運動引擎（推薦）</span>
                </label>
                <p className={styles.switchHint}>
                  {useUniversalEngine
                    ? "完全配置驅動，支持任何運動和規則"
                    : "傳統模式，手動設定賽制和規則"}
                </p>
              </div>

              {useUniversalEngine ? (
                <UniversalCategoryManager
                  categories={universalCategories}
                  onChange={setUniversalCategories}
                  defaultSportId={selectedSport?.id}
                />
              ) : (
                <CategoryManager
                  categories={legacyCategories}
                  onChange={setLegacyCategories}
                  defaultPointsPerSet={(selectedSport as any)?.defaultPointsPerSet || 21}
                />
              )}
            </div>
          )}

          {/* Step 4: Description */}
          {currentStep === 4 && (
            <div className={styles.step}>
              <div className={styles.formGroup}>
                <label className={styles.label}>賽事說明（選填）</label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="詳細說明賽事規則、獎品、注意事項等..."
                  rows={8}
                />
              </div>
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
