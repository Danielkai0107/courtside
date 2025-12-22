/**
 * 通用引擎分類管理器
 * 
 * 用於 CreateTournament 的 Step 3
 * 收集通用引擎所需的配置：sportId, rulePresetId, selectedFormatId
 */

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Select from "../common/Select";
import styles from "./CategoryManager.module.scss";
import {
  getActiveSportsUniversal,
  getAvailableFormatsUniversal,
  getRulePresetDisplayLabel,
  getFormatDisplayLabel,
} from "../../services/universalEngineService";
import type {
  SportDefinition,
  RulePreset,
  FormatDefinition,
} from "../../types/universal-config";

export interface UniversalCategoryFormData {
  name: string;
  matchType: "singles" | "doubles";
  sportId: string;
  rulePresetId: string;
  selectedFormatId: string;
}

interface UniversalCategoryManagerProps {
  categories: UniversalCategoryFormData[];
  onChange: (categories: UniversalCategoryFormData[]) => void;
  defaultSportId?: string;
}

const UniversalCategoryManager: React.FC<UniversalCategoryManagerProps> = ({
  categories,
  onChange,
  defaultSportId,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 數據
  const [sports, setSports] = useState<SportDefinition[]>([]);
  const [formats, setFormats] = useState<FormatDefinition[]>([]);

  // 表單資料
  const [formData, setFormData] = useState<UniversalCategoryFormData>({
    name: "",
    matchType: "singles",
    sportId: "",
    rulePresetId: "",
    selectedFormatId: "",
  });

  // 派生數據
  const [rulePresets, setRulePresets] = useState<RulePreset[]>([]);
  const [availableFormats, setAvailableFormats] = useState<FormatDefinition[]>(
    []
  );
  const [estimatedParticipants, setEstimatedParticipants] = useState(8);

  // 初始化：載入運動和格式
  useEffect(() => {
    const loadData = async () => {
      try {
        const sportsData = await getActiveSportsUniversal();
        setSports(sportsData);

        const formatsData = await getAvailableFormatsUniversal();
        setFormats(formatsData);

        // 設置默認運動
        if (sportsData.length > 0) {
          const defaultSport = defaultSportId
            ? sportsData.find((s) => s.id === defaultSportId) || sportsData[0]
            : sportsData[0];
          
          setFormData((prev) => ({
            ...prev,
            sportId: defaultSport.id,
          }));
        }
      } catch (err) {
        console.error("載入數據失敗:", err);
        setError("載入數據失敗");
      }
    };

    loadData();
  }, [defaultSportId]);

  // 當選擇運動時，更新規則預設
  useEffect(() => {
    if (!formData.sportId) {
      setRulePresets([]);
      return;
    }

    const sport = sports.find((s) => s.id === formData.sportId);
    if (sport) {
      setRulePresets(sport.rulePresets);
      setFormData((prev) => ({
        ...prev,
        rulePresetId: sport.defaultPresetId,
      }));
    }
  }, [formData.sportId, sports]);

  // 當預估人數變更時，篩選可用格式
  useEffect(() => {
    const filtered = formats.filter(
      (format) =>
        estimatedParticipants >= format.minParticipants &&
        estimatedParticipants <= format.maxParticipants
    );

    setAvailableFormats(filtered);

    // 設置默認格式
    if (filtered.length > 0 && !formData.selectedFormatId) {
      setFormData((prev) => ({
        ...prev,
        selectedFormatId: filtered[0].id,
      }));
    }
  }, [estimatedParticipants, formats]);

  const handleAdd = () => {
    setEditingIndex(null);
    const defaultSport = sports[0];
    setFormData({
      name: "",
      matchType: "singles",
      sportId: defaultSport?.id || "",
      rulePresetId: defaultSport?.defaultPresetId || "",
      selectedFormatId: availableFormats[0]?.id || "",
    });
    setEstimatedParticipants(8);
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
      setError("請輸入分類名稱");
      return;
    }

    if (!formData.sportId || !formData.rulePresetId || !formData.selectedFormatId) {
      setError("請完整設定配置");
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
    setError("");
  };

  // 獲取格式顯示名稱
  const getFormatName = (formatId: string) => {
    const format = formats.find((f) => f.id === formatId);
    return format ? format.name : formatId;
  };

  // 獲取運動顯示名稱
  const getSportName = (sportId: string) => {
    const sport = sports.find((s) => s.id === sportId);
    return sport ? sport.name : sportId;
  };

  return (
    <div className={styles.categoryManager}>
      <div className={styles.categoriesList}>
        {categories.map((category, index) => (
          <Card key={index} className={styles.categoryCard}>
            <div className={styles.categoryInfo}>
              <h4>{category.name}</h4>
              <div className={styles.categoryDetails}>
                <span>
                  {category.matchType === "singles" ? "單打" : "雙打"}
                </span>
                <span>{getSportName(category.sportId)}</span>
                <span>{getFormatName(category.selectedFormatId)}</span>
              </div>
            </div>
            <div className={styles.actions}>
              <Button
                variant="ghost"
                onClick={() => handleEdit(index)}
                className={styles.iconButton}
              >
                <Edit2 size={18} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleDelete(index)}
                className={styles.iconButton}
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </Card>
        ))}

        <Button
          variant="outline"
          onClick={handleAdd}
          fullWidth
          className={styles.addButton}
        >
          <Plus size={20} />
          新增分類
        </Button>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className={styles.modalContent}>
            <h3>{editingIndex !== null ? "編輯分類" : "新增分類"}</h3>

            {error && <div className={styles.error}>{error}</div>}

            <Input
              label="分類名稱"
              placeholder="例如：男子單打、女子雙打"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <Select
              label="比賽類型"
              value={formData.matchType}
              onChange={(value) =>
                setFormData({ ...formData, matchType: value as "singles" | "doubles" })
              }
              options={[
                { value: "singles", label: "單打" },
                { value: "doubles", label: "雙打" },
              ]}
              required
            />

            <Select
              label="運動項目"
              value={formData.sportId}
              onChange={(value) =>
                setFormData({ ...formData, sportId: value })
              }
              options={sports.map((sport) => ({
                value: sport.id,
                label: `${sport.icon || ""} ${sport.name}`,
              }))}
              required
            />

            {rulePresets.length > 0 && (
              <Select
                label="計分規則"
                value={formData.rulePresetId}
                onChange={(value) =>
                  setFormData({ ...formData, rulePresetId: value })
                }
                options={rulePresets.map((preset) => ({
                  value: preset.id,
                  label: getRulePresetDisplayLabel(preset),
                }))}
                required
              />
            )}

            <Input
              type="number"
              label="預估參賽人數"
              value={estimatedParticipants}
              onChange={(e) => setEstimatedParticipants(Number(e.target.value))}
              min={2}
              max={32}
              required
            />

            {availableFormats.length > 0 ? (
              <Select
                label="賽制格式"
                value={formData.selectedFormatId}
                onChange={(value) =>
                  setFormData({ ...formData, selectedFormatId: value })
                }
                options={availableFormats.map((format) => ({
                  value: format.id,
                  label: getFormatDisplayLabel(format),
                }))}
                required
              />
            ) : (
              <div className={styles.warning}>
                找不到適合 {estimatedParticipants} 人的賽制格式
              </div>
            )}

            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingIndex !== null ? "更新" : "新增"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UniversalCategoryManager;

