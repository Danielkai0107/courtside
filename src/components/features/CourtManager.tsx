import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TextField } from "@mui/material";
import Button from "../common/Button";
import Card from "../common/Card";
import Modal from "../common/Modal";
import styles from "./CourtManager.module.scss";
import {
  getCourts,
  createCourt,
  deleteCourt,
} from "../../services/courtService";
import type { Court } from "../../types";

interface CourtManagerProps {
  tournamentId: string;
}

const CourtManager: React.FC<CourtManagerProps> = ({ tournamentId }) => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [courtName, setCourtName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadCourts();
  }, [tournamentId]);

  const loadCourts = async () => {
    setLoading(true);
    try {
      const data = await getCourts(tournamentId);
      setCourts(data);
    } catch (error) {
      console.error("Failed to load courts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!courtName.trim()) {
      alert("請輸入場地名稱");
      return;
    }

    setAdding(true);
    try {
      await createCourt(tournamentId, {
        name: courtName.trim(),
        order: courts.length + 1,
      });

      await loadCourts();
      setShowAddModal(false);
      setCourtName("");
    } catch (err: any) {
      alert(err.message || "新增場地失敗");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (courtId: string, courtName: string) => {
    const confirmed = window.confirm(`確定要刪除場地「${courtName}」嗎？`);
    if (!confirmed) return;

    setDeletingId(courtId);
    try {
      await deleteCourt(tournamentId, courtId);
      await loadCourts();
    } catch (err: any) {
      alert(err.message || "刪除場地失敗");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.courtManager}>
      <Card>
        <div className={styles.header}>
          <h3 className={styles.title}>場地管理</h3>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            新增場地
          </Button>
        </div>

        {loading ? (
          <p className={styles.loadingMessage}>載入中...</p>
        ) : courts.length === 0 ? (
          <p className={styles.emptyMessage}>尚未新增場地</p>
        ) : (
          <div className={styles.courtList}>
            {courts.map((court) => (
              <div key={court.id} className={styles.courtItem}>
                <div className={styles.courtInfo}>
                  <span className={styles.courtName}>{court.name}</span>
                  <span
                    className={`${styles.courtStatus} ${
                      styles[court.status.toLowerCase()]
                    }`}
                  >
                    {court.status === "IDLE" ? "空閒" : "使用中"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => handleDelete(court.id, court.name)}
                  loading={deletingId === court.id}
                  disabled={deletingId !== null}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.summary}>共 {courts.length} 個場地</div>
      </Card>

      {/* Add Court Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setCourtName("");
        }}
        title="新增場地"
      >
        <div className={styles.modalContent}>
          <TextField
            label="場地名稱"
            value={courtName}
            onChange={(e) => setCourtName(e.target.value)}
            placeholder="例如：Court 01, 中央球場"
            required
            fullWidth
            variant="outlined"
            size="medium"
          />

          <div className={styles.modalActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setCourtName("");
              }}
            >
              取消
            </Button>
            <Button variant="primary" onClick={handleAdd} loading={adding}>
              新增
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CourtManager;
