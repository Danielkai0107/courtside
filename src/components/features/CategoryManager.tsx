import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Input from "../common/Input";
import SelectableCard from "../common/SelectableCard";
import styles from "./CategoryManager.module.scss";
import type { Sport, FormatTemplate } from "../../types";

interface CategoryFormData {
  name: string;
  matchType: "singles" | "doubles";
  maxParticipants: number;
  format: "KNOCKOUT_ONLY" | "GROUP_THEN_KNOCKOUT";
  pointsPerSet: number;
  enableThirdPlaceMatch: boolean;
  rulePresetId?: string; // 選擇的規則預設 ID
  selectedFormat?: FormatTemplate;  // 新增：選擇的模板
  ruleConfig?: {  // 新增：完整規則配置
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
}

interface CategoryManagerProps {
  categories: Omit<CategoryFormData, "status" | "currentParticipants">[];
  onChange: (
    categories: Omit<CategoryFormData, "status" | "currentParticipants">[]
  ) => void;
  sport?: Sport; // 當前選擇的運動項目
  defaultPointsPerSet?: number;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onChange,
  sport,
  defaultPointsPerSet = 21,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    matchType: "singles",
    maxParticipants: 16,
    format: "KNOCKOUT_ONLY",
    pointsPerSet: defaultPointsPerSet,
    enableThirdPlaceMatch: false,
    rulePresetId: sport?.defaultPresetId,
  });

  // 不再需要在創建時載入模板
  // 模板推薦會在賽程管理時根據實際人數顯示

  const handleAdd = () => {
    setEditingIndex(null);
    const defaultPreset = sport?.rulePresets?.find(
      (p) => p.id === sport.defaultPresetId
    );
    
    setFormData({
      name: "",
      matchType: "singles",
      maxParticipants: 16,  // 預設值
      format: "KNOCKOUT_ONLY",  // 預設值，實際賽制在發布時決定
      pointsPerSet: defaultPreset?.config.pointsPerSet || defaultPointsPerSet,
      enableThirdPlaceMatch: false,
      rulePresetId: sport?.defaultPresetId,
      ruleConfig: defaultPreset ? {
        matchType: defaultPreset.config.matchType,
        maxSets: defaultPreset.config.maxSets,
        pointsPerSet: defaultPreset.config.pointsPerSet,
        setsToWin: defaultPreset.config.setsToWin,
        winByTwo: defaultPreset.config.winByTwo,
        cap: defaultPreset.config.cap,
      } : undefined,
    });
    setShowModal(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData(categories[index]);
    setShowModal(true);
  };

  const handleDelete = (index: number) => {
    const newCategories = categories.filter((_, i) => i !== index);
    onChange(newCategories);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert("請輸入分類名稱");
      return;
    }

    if (formData.maxParticipants < 2) {
      alert("參賽者數量至少需要 2");
      return;
    }

    if (!formData.ruleConfig) {
      alert("請選擇比賽規則");
      return;
    }

    if (editingIndex !== null) {
      // 編輯現有分類
      const newCategories = [...categories];
      newCategories[editingIndex] = formData;
      onChange(newCategories);
    } else {
      // 新增分類
      onChange([...categories, formData]);
    }

    setShowModal(false);
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case "KNOCKOUT_ONLY":
        return "純淘汰賽";
      case "GROUP_THEN_KNOCKOUT":
        return "小組賽 + 淘汰賽";
      default:
        return format;
    }
  };

  const getMatchTypeLabel = (matchType: string) => {
    return matchType === "singles" ? "單打" : "雙打";
  };

  const handleRulePresetChange = (presetId: string) => {
    const preset = sport?.rulePresets?.find((p) => p.id === presetId);
    if (preset) {
      setFormData({
        ...formData,
        rulePresetId: presetId,
        pointsPerSet: preset.config.pointsPerSet,
        ruleConfig: {
          matchType: preset.config.matchType,
          maxSets: preset.config.maxSets,
          pointsPerSet: preset.config.pointsPerSet,
          setsToWin: preset.config.setsToWin,
          winByTwo: preset.config.winByTwo,
          cap: preset.config.cap,
        },
      });
    }
  };

  return (
    <div className={styles.categoryManager}>
      <div className={styles.header}>
        <h3 className={styles.title}>賽事分類設定</h3>
        <Button variant="primary" onClick={handleAdd} size="small">
          <Plus size={16} />
          新增分類
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card className={styles.emptyState}>
          <p>尚未設定任何分類</p>
          <p className={styles.hint}>
            點擊「新增分類」來設定男子單打、女子雙打等項目
          </p>
        </Card>
      ) : (
        <div className={styles.categoriesList}>
          {categories.map((category, index) => (
            <Card key={index} className={styles.categoryCard}>
              <div className={styles.categoryInfo}>
                <h4 className={styles.categoryName}>{category.name}</h4>
                <div className={styles.categoryDetails}>
                  <span className={styles.badge}>
                    {getMatchTypeLabel(category.matchType)}
                  </span>
                  <span className={styles.detail}>
                    名額: {category.maxParticipants}{" "}
                    {category.matchType === "singles" ? "人" : "組"}
                  </span>
                  {category.ruleConfig && (
                    <span className={styles.detail}>
                      規則:{" "}
                      {category.ruleConfig.matchType === "set_based"
                        ? `${category.ruleConfig.maxSets}戰${category.ruleConfig.setsToWin}勝`
                        : `${category.ruleConfig.pointsPerSet}分制`}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.categoryActions}>
                <button
                  className={styles.iconButton}
                  onClick={() => handleEdit(index)}
                  title="編輯"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className={styles.iconButton}
                  onClick={() => handleDelete(index)}
                  title="刪除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingIndex !== null ? "編輯分類" : "新增分類"}
      >
        <>
          <div className={styles.modalContent}>
            <Input
              label="分類名稱"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如：男子雙打、女子單打"
              required
            />

            <div className={styles.formGroup}>
              <label className={styles.label}>比賽類型</label>
              <div className={styles.optionsGrid}>
                <SelectableCard
                  title="單打"
                  value=""
                  subtitle=""
                  selected={formData.matchType === "singles"}
                  onClick={() =>
                    setFormData({ ...formData, matchType: "singles" })
                  }
                />
                <SelectableCard
                  title="雙打"
                  value=""
                  subtitle=""
                  selected={formData.matchType === "doubles"}
                  onClick={() =>
                    setFormData({ ...formData, matchType: "doubles" })
                  }
                />
              </div>
            </div>

            <Input
              label={`參賽名額上限（${
                formData.matchType === "singles" ? "人" : "組"
              }）`}
              type="number"
              value={formData.maxParticipants.toString()}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxParticipants: parseInt(e.target.value) || 0,
                })
              }
              min="2"
              required
            />

            {/* 提示文字 */}
            <Card className={styles.infoCard}>
              <p className={styles.infoText}>
                💡 <strong>賽制將在報名截止後推薦</strong>
              </p>
              <p className={styles.infoTextSmall}>
                系統會根據實際報名人數，智能推薦最適合的賽制模板（淘汰賽、小組賽、循環賽等）
              </p>
            </Card>

            {sport?.rulePresets && sport.rulePresets.length > 0 && (
              <div className={styles.formGroup}>
                <label className={styles.label}>比賽規則</label>
                <div className={styles.optionsGrid}>
                  {sport.rulePresets.map((preset) => (
                    <SelectableCard
                      key={preset.id}
                      title={preset.label}
                      value=""
                      subtitle={
                        preset.config.matchType === "set_based"
                          ? `${preset.config.maxSets}戰${preset.config.setsToWin}勝，每局${preset.config.pointsPerSet}分`
                          : `計分制，${preset.config.pointsPerSet}分獲勝`
                      }
                      selected={formData.rulePresetId === preset.id}
                      onClick={() => handleRulePresetChange(preset.id)}
                    />
                  ))}
                </div>

                {/* 規則預覽卡片 */}
                {formData.ruleConfig && (
                  <Card className={styles.rulePreview}>
                    <h4 className={styles.previewTitle}>🏸 規則說明</h4>
                    <div className={styles.ruleDetails}>
                      {formData.ruleConfig.matchType === "set_based" ? (
                        <>
                          <p>
                            • 比賽採{" "}
                            <strong>
                              {formData.ruleConfig.maxSets}戰
                              {formData.ruleConfig.setsToWin}勝
                            </strong>{" "}
                            制
                          </p>
                          <p>
                            • 每局先得{" "}
                            <strong>{formData.ruleConfig.pointsPerSet} 分</strong>{" "}
                            者獲勝
                          </p>
                          {formData.ruleConfig.winByTwo && (
                            <p>
                              • 平分時需 <strong>領先 2 分</strong> 才能獲勝（Deuce）
                            </p>
                          )}
                          {formData.ruleConfig.cap && (
                            <p>
                              • 封頂分數：<strong>{formData.ruleConfig.cap} 分</strong>
                            </p>
                          )}
                        </>
                      ) : (
                        <p>
                          • 計分制，先得{" "}
                          <strong>{formData.ruleConfig.pointsPerSet} 分</strong>{" "}
                          者獲勝
                        </p>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </>
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setShowModal(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editingIndex !== null ? "儲存" : "新增"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryManager;
