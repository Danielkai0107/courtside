import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import Modal from "../common/Modal";
import Input from "../common/Input";
import SelectableCard from "../common/SelectableCard";
import styles from "./CategoryManager.module.scss";

interface CategoryFormData {
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
}

interface CategoryManagerProps {
  categories: Omit<CategoryFormData, "status" | "currentParticipants">[];
  onChange: (
    categories: Omit<CategoryFormData, "status" | "currentParticipants">[]
  ) => void;
  defaultPointsPerSet?: number;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onChange,
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
  });

  const handleAdd = () => {
    setEditingIndex(null);
    setFormData({
      name: "",
      matchType: "singles",
      maxParticipants: 16,
      format: "KNOCKOUT_ONLY",
      pointsPerSet: defaultPointsPerSet,
      enableThirdPlaceMatch: false,
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
                  <span className={styles.detail}>
                    賽制: {getFormatLabel(category.format)}
                  </span>
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

            <div className={styles.formGroup}>
              <label className={styles.label}>賽制類型</label>
              <div className={styles.optionsGrid}>
                <SelectableCard
                  title="純淘汰賽"
                  value=""
                  subtitle="直接進入淘汰賽"
                  selected={formData.format === "KNOCKOUT_ONLY"}
                  onClick={() =>
                    setFormData({ ...formData, format: "KNOCKOUT_ONLY" })
                  }
                />
                <SelectableCard
                  title="小組賽 + 淘汰賽"
                  value=""
                  subtitle="先分組循環，再淘汰"
                  selected={formData.format === "GROUP_THEN_KNOCKOUT"}
                  onClick={() =>
                    setFormData({ ...formData, format: "GROUP_THEN_KNOCKOUT" })
                  }
                />
              </div>
            </div>

            {formData.format === "KNOCKOUT_ONLY" && (
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.enableThirdPlaceMatch}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        enableThirdPlaceMatch: e.target.checked,
                      })
                    }
                  />
                  <span>啟用季軍賽（準決賽敗者爭奪季軍）</span>
                </label>
              </div>
            )}

            <Input
              label="每局得分"
              type="number"
              value={formData.pointsPerSet.toString()}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  pointsPerSet: parseInt(e.target.value) || 21,
                })
              }
              min="1"
              required
            />
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
