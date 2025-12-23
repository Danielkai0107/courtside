import React, { useState, useEffect } from "react";
import { Select, MenuItem, FormControl } from "@mui/material";
import Modal from "../common/Modal";
import Button from "../common/Button";
import styles from "./PlayerSeedingModal.module.scss";
import type { FormatTemplate } from "../../types";

interface PlayerSeedingModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Array<{ id: string; name: string }>;
  selectedFormat: FormatTemplate | null;
  onSave: (reorderedParticipants: Array<{ id: string; name: string }>) => void;
  matchType: "singles" | "doubles";
}

const PlayerSeedingModal: React.FC<PlayerSeedingModalProps> = ({
  isOpen,
  onClose,
  participants,
  selectedFormat,
  onSave,
  matchType,
}) => {
  const [orderedParticipants, setOrderedParticipants] = useState(participants);
  const [previewPairs, setPreviewPairs] = useState<Array<[number, number]>>([]);
  const [previewGroups, setPreviewGroups] = useState<number[][]>([]);
  // formatType 對應 Match.stage 的類型："group" | "knockout" | "round_robin"
  const [formatType, setFormatType] = useState<
    "knockout" | "group" | "round_robin"
  >("knockout");

  useEffect(() => {
    setOrderedParticipants([...participants]);
  }, [participants]);

  useEffect(() => {
    if (!selectedFormat) return;

    // 判斷賽制類型
    const hasGroupStage = selectedFormat.stages.some(
      (s) => s.type === "group_stage"
    );
    const hasRoundRobin = selectedFormat.stages.some(
      (s) => s.type === "round_robin"
    );

    if (hasRoundRobin) {
      setFormatType("round_robin");
      // 循環賽：顯示所有配對
      const pairs: Array<[number, number]> = [];
      for (let i = 0; i < orderedParticipants.length; i++) {
        for (let j = i + 1; j < orderedParticipants.length; j++) {
          pairs.push([i, j]);
        }
      }
      setPreviewPairs(pairs);
    } else if (hasGroupStage) {
      setFormatType("group");
      // 小組賽：顯示分組
      const groupStage = selectedFormat.stages.find(
        (s) => s.type === "group_stage"
      );
      const totalGroups = groupStage?.count || 4;

      const groups: number[][] = Array.from({ length: totalGroups }, () => []);
      orderedParticipants.forEach((_, index) => {
        const groupIndex = index % totalGroups;
        groups[groupIndex].push(index);
      });

      setPreviewGroups(groups);
    } else {
      setFormatType("knockout");
      // 淘汰賽：顯示第一輪配對
      const pairs: Array<[number, number]> = [];
      const bracketSize = Math.pow(
        2,
        Math.ceil(Math.log2(orderedParticipants.length))
      );
      const byeCount = bracketSize - orderedParticipants.length;

      // 簡化版：只顯示前幾組配對
      const pairCount = Math.floor(orderedParticipants.length / 2);
      for (let i = 0; i < pairCount; i++) {
        pairs.push([i, orderedParticipants.length - 1 - i]);
      }

      setPreviewPairs(pairs);
    }
  }, [selectedFormat, orderedParticipants]);

  const handleSwap = (index1: number, index2: number) => {
    if (index1 === index2) return;

    const newOrder = [...orderedParticipants];
    [newOrder[index1], newOrder[index2]] = [newOrder[index2], newOrder[index1]];
    setOrderedParticipants(newOrder);
  };

  const handleSave = () => {
    onSave(orderedParticipants);
    onClose();
  };

  const handleReset = () => {
    setOrderedParticipants([...participants]);
  };

  const renderKnockoutPreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>第一輪對戰預覽</h4>
      <div className={styles.matchupsList}>
        {previewPairs.map(([index1, index2], pairIndex) => (
          <div key={pairIndex} className={styles.matchup}>
            <div className={styles.matchupHeader}>第 {pairIndex + 1} 場</div>
            <div className={styles.vsContainer}>
              <div className={styles.playerSelect}>
                <span className={styles.seed}>#{index1 + 1}</span>
                <FormControl size="small" fullWidth>
                  <Select
                    value={index1}
                    onChange={(e) => handleSwap(index1, e.target.value as number)}
                    className={styles.dropdown}
                  >
                    {orderedParticipants.map((p, idx) => (
                      <MenuItem key={idx} value={idx}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              <div className={styles.vsText}>VS</div>
              <div className={styles.playerSelect}>
                <span className={styles.seed}>#{index2 + 1}</span>
                <FormControl size="small" fullWidth>
                  <Select
                    value={index2}
                    onChange={(e) => handleSwap(index2, e.target.value as number)}
                    className={styles.dropdown}
                  >
                    {orderedParticipants.map((p, idx) => (
                      <MenuItem key={idx} value={idx}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </div>
          </div>
        ))}

        {/* 顯示輪空 */}
        {orderedParticipants.length % 2 !== 0 && (
          <div className={styles.matchup}>
            <div className={styles.matchupHeader}>輪空</div>
            <div className={styles.byePlayer}>
              <span className={styles.seed}>#{orderedParticipants.length}</span>
              <FormControl size="small" fullWidth>
                <Select
                  value={orderedParticipants.length - 1}
                  onChange={(e) =>
                    handleSwap(
                      orderedParticipants.length - 1,
                      e.target.value as number
                    )
                  }
                  className={styles.dropdown}
                >
                  {orderedParticipants.map((p, idx) => (
                    <MenuItem key={idx} value={idx}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderGroupPreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>小組分組預覽</h4>
      <div className={styles.groupsList}>
        {previewGroups.map((group, groupIndex) => (
          <div key={groupIndex} className={styles.group}>
            <div className={styles.groupHeader}>
              {String.fromCharCode(65 + groupIndex)} 組
            </div>
            <div className={styles.groupMembers}>
              {group.map((playerIndex) => (
                <div key={playerIndex} className={styles.groupMember}>
                  <span className={styles.seed}>#{playerIndex + 1}</span>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={playerIndex}
                      onChange={(e) =>
                        handleSwap(playerIndex, e.target.value as number)
                      }
                      className={styles.dropdown}
                    >
                      {orderedParticipants.map((p, idx) => (
                        <MenuItem key={idx} value={idx}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRoundRobinPreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>🔄 循環賽種子序列</h4>
      <p className={styles.infoText}>
        調整種子順序會影響對戰順序（高種子 vs 低種子優先進行）
      </p>
      <div className={styles.seedList}>
        {orderedParticipants.map((participant, index) => (
          <div key={index} className={styles.seedItem}>
            <span className={styles.seed}>#{index + 1}</span>
            <FormControl size="small" fullWidth>
              <Select
                value={index}
                onChange={(e) => handleSwap(index, e.target.value as number)}
                className={styles.dropdown}
              >
                {orderedParticipants.map((p, idx) => (
                  <MenuItem key={idx} value={idx}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="選手配對調整" size="lg">
      <div className={styles.container}>
        <div className={styles.description}>
          <p>調整選手的種子順序，以改變對戰配對。選擇選手後會自動交換位置。</p>
          <p>提示：這不會影響晉級流向和積分算法，僅調整初始配對。</p>
        </div>

        {formatType === "knockout" && renderKnockoutPreview()}
        {formatType === "group" && renderGroupPreview()}
        {formatType === "round_robin" && renderRoundRobinPreview()}

        <div className={styles.actions}>
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <div className={styles.rightActions}>
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSave}>
              儲存調整
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PlayerSeedingModal;
