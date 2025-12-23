import React, { useState, useEffect } from "react";
import { getActiveSports } from "../../services/sportService";
import Button from "./Button";
import styles from "./SportSelectionModal.module.scss";
import type { Sport } from "../../types";

interface SportSelectionModalProps {
  isOpen: boolean;
  onSelect: (sportId: string, sportName: string) => void;
  currentSportId?: string; // 當前選擇的項目，用於重複開啟時預選
  title?: string; // 自訂標題
}

const SportSelectionModal: React.FC<SportSelectionModalProps> = ({
  isOpen,
  onSelect,
  currentSportId = "",
  title = "選擇你的運動項目",
}) => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSportId, setSelectedSportId] = useState<string>(currentSportId);

  useEffect(() => {
    console.log('🎯 [SportSelectionModal] isOpen changed:', isOpen);
    
    const loadSports = async () => {
      try {
        setLoading(true);
        const data = await getActiveSports();
        setSports(data);
        console.log('🎯 [SportSelectionModal] 載入了', data.length, '個運動項目');
      } catch (error) {
        console.error("Failed to load sports:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      // 重置為當前項目或空
      setSelectedSportId(currentSportId);
      loadSports();
    }
  }, [isOpen, currentSportId]);

  const handleConfirm = () => {
    if (!selectedSportId) return;
    const sport = sports.find((s) => s.id === selectedSportId);
    if (sport) {
      console.log('🎯 [SportSelectionModal] 用戶選擇了:', `${sport.icon} ${sport.name}`);
      onSelect(selectedSportId, `${sport.icon} ${sport.name}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.content}>
          <h2 className={styles.title}>{title}</h2>
          {title === "選擇你的運動項目" && (
            <p className={styles.description}>選擇你最常參與的運動項目</p>
          )}

          {loading ? (
            <div className={styles.loading}>載入中...</div>
          ) : (
            <div className={styles.sportList}>
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  className={`${styles.sportCard} ${
                    selectedSportId === sport.id ? styles.selected : ""
                  }`}
                  onClick={() => setSelectedSportId(sport.id)}
                >
                  <span className={styles.icon}>{sport.icon}</span>
                  <span className={styles.name}>{sport.name}</span>
                  {selectedSportId === sport.id && (
                    <span className={styles.checkmark}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className={styles.footer}>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!selectedSportId || loading}
              fullWidth
            >
              確認
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportSelectionModal;

