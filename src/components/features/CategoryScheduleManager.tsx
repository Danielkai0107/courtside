import React, { useState, useEffect } from "react";
import { Calendar, Users, AlertTriangle } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import Tabs from "../common/Tabs";
import Modal from "../common/Modal";
import CategoryPublisher from "./CategoryPublisher";
import PlayerSeedingModal from "./PlayerSeedingModal";
import styles from "./CategoryScheduleManager.module.scss";
import type { Category, FormatTemplate } from "../../types";
import { getPlayers } from "../../services/registrationService";
import { getTeamsByCategory } from "../../services/teamService";
import { getCourts } from "../../services/courtService";
import { getMatchesByTournament } from "../../services/matchService";
import { reassignCourtsByCategory } from "../../services/courtService";
import {
  regenerateSchedule,
  getCategoryScheduleStats,
} from "../../services/scheduleRegenerationService";
import { getFormatsByParticipantCount } from "../../services/formatService";

interface CategoryScheduleManagerProps {
  tournamentId: string;
  categories: Category[];
  tournamentStatus: string;
}

const CategoryScheduleManager: React.FC<CategoryScheduleManagerProps> = ({
  tournamentId,
  categories,
  tournamentStatus,
}) => {
  const [activeCategory, setActiveCategory] = useState("");
  const [currentCategoryData, setCurrentCategoryData] =
    useState<Category | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showSeedingModal, setShowSeedingModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [scheduleStats, setScheduleStats] = useState<any>(null);
  const [recommendedFormats, setRecommendedFormats] = useState<FormatTemplate[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<FormatTemplate | null>(null);
  const [adjustedParticipants, setAdjustedParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    if (!activeCategory) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const category = categories.find((c) => c.id === activeCategory);
        setCurrentCategoryData(category || null);

        if (!category) return;

        // Load participants
        let participantsList: any[] = [];
        if (category.matchType === "singles") {
          const playersData = await getPlayers(tournamentId);
          // 過濾該分類的已確認選手
          const confirmed = playersData.filter(
            (p) =>
              p.status === "confirmed" &&
              (p.categoryId === activeCategory || !p.categoryId) // 兼容舊數據
          );
          participantsList = confirmed.map((p) => ({
            id: p.uid || p.id,
            name: p.name,
          }));
        } else {
          const teamsData = await getTeamsByCategory(
            tournamentId,
            activeCategory,
            "confirmed"
          );
          participantsList = teamsData.map((t) => ({
            id: t.id,
            name: `${t.player1Name} / ${t.player2Name}`,
          }));
        }
        setParticipants(participantsList);
        setAdjustedParticipants(participantsList);

        // Load recommended formats
        if (participantsList.length >= 2) {
          const formats = await getFormatsByParticipantCount(participantsList.length);
          setRecommendedFormats(formats);
          
          // 優先使用分類已設定的模板，沒有才用推薦的第一個
          if (category.selectedFormatId) {
            const { getFormat } = await import("../../services/formatService");
            try {
              const existingFormat = await getFormat(category.selectedFormatId);
              if (existingFormat) {
                console.log("✅ 載入分類已設定的模板:", existingFormat.name);
                setSelectedFormat(existingFormat);
              } else if (formats.length > 0) {
                setSelectedFormat(formats[0]);
              }
            } catch (error) {
              console.warn("載入已設定模板失敗，使用推薦模板");
              if (formats.length > 0) {
                setSelectedFormat(formats[0]);
              }
            }
          } else if (formats.length > 0) {
            setSelectedFormat(formats[0]);
          }
        }

        // Load courts
        const courtsData = await getCourts(tournamentId);
        setCourts(courtsData.map((c) => ({ id: c.id, name: c.name })));

        // Load matches for this category
        const allMatches = await getMatchesByTournament(tournamentId);
        const categoryMatches = allMatches.filter(
          (m: any) => m.categoryId === activeCategory
        );
        setMatches(categoryMatches);

        // Load schedule stats
        if (categoryMatches.length > 0) {
          const stats = await getCategoryScheduleStats(tournamentId, activeCategory);
          setScheduleStats(stats);
        }
      } catch (error) {
        console.error("Failed to load schedule data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tournamentId, activeCategory, categories]);

  const handlePublishSuccess = () => {
    alert("賽程發布成功！");
    // Reload matches
    const loadMatches = async () => {
      const allMatches = await getMatchesByTournament(tournamentId);
      const categoryMatches = allMatches.filter(
        (m: any) => m.categoryId === activeCategory
      );
      setMatches(categoryMatches);
    };
    loadMatches();
  };

  const handleReassignCourts = async () => {
    if (courts.length === 0) {
      alert("請先在「場地管理」Tab 新增場地");
      return;
    }

    const confirmed = window.confirm(
      `確定要重新分配場地嗎？\n\n` +
        `這將重新分配此分類（${currentCategoryData?.name}）所有未開始的比賽到 ${courts.length} 個場地。\n\n` +
        `採用智能分配策略：\n` +
        `- 小組賽：按小組固定場地\n` +
        `- 淘汰賽：決賽在主場地\n\n` +
        `進行中和已完成的比賽不受影響。`
    );
    if (!confirmed) return;

    setReassigning(true);
    try {
      const result = await reassignCourtsByCategory(
        tournamentId,
        activeCategory,
        courts
      );
      alert(
        `場地重新分配完成！\n\n` +
          `分類：${currentCategoryData?.name}\n` +
          `成功分配：${result.success} 場比賽\n` +
          `跳過：${result.skipped} 場比賽（已開始或已完成）`
      );

      // Reload matches
      const allMatches = await getMatchesByTournament(tournamentId);
      const categoryMatches = allMatches.filter(
        (m: any) => m.categoryId === activeCategory
      );
      setMatches(categoryMatches);
    } catch (err: any) {
      alert(err.message || "重新分配失敗");
    } finally {
      setReassigning(false);
    }
  };

  const handleOpenSeedingAdjustment = () => {
    // 檢查是否有已開始的比賽
    if (scheduleStats && (scheduleStats.inProgress > 0 || scheduleStats.completed > 0)) {
      setShowWarningModal(true);
    } else {
      setShowSeedingModal(true);
    }
  };

  const handleSaveSeedingAdjustment = (reorderedParticipants: Array<{ id: string; name: string }>) => {
    setAdjustedParticipants(reorderedParticipants);
    setShowSeedingModal(false);
    console.log("✅ 已儲存種子位調整，準備重新生成賽程");
  };

  const handleRegenerateSchedule = async () => {
    if (!currentCategoryData || !selectedFormat) {
      alert("缺少必要資訊");
      return;
    }

    if (courts.length === 0) {
      alert("請先在「場地管理」Tab 新增至少一個場地");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ 確定要重新生成賽程嗎？\n\n` +
        `這將執行以下操作：\n` +
        `1. 刪除所有未開始的比賽（${scheduleStats?.scheduled || 0} 場）\n` +
        `2. 使用調整後的種子位重新生成對戰\n` +
        `3. 已開始或已完成的比賽不受影響\n\n` +
        `此操作無法撤銷，請確認！`
    );
    
    if (!confirmed) return;

    setRegenerating(true);
    try {
      await regenerateSchedule(
        tournamentId,
        currentCategoryData,
        adjustedParticipants,
        selectedFormat,
        courts
      );

      // 保存選擇的模板ID到分類
      if (selectedFormat) {
        const { updateCategory } = await import("../../services/categoryService");
        await updateCategory(tournamentId, activeCategory, {
          selectedFormatId: selectedFormat.id,
        });
        console.log(`✅ 已保存模板選擇: ${selectedFormat.name}`);
      }

      alert("✅ 賽程重新生成成功！");

      // Reload data
      const allMatches = await getMatchesByTournament(tournamentId);
      const categoryMatches = allMatches.filter(
        (m: any) => m.categoryId === activeCategory
      );
      setMatches(categoryMatches);

      const stats = await getCategoryScheduleStats(tournamentId, activeCategory);
      setScheduleStats(stats);
    } catch (err: any) {
      alert(`❌ 重新生成失敗：\n${err.message}`);
    } finally {
      setRegenerating(false);
    }
  };

  if (categories.length === 0) {
    return (
      <Card>
        <p className={styles.emptyMessage}>
          尚未設定分類，請先編輯賽事並新增分類。
        </p>
      </Card>
    );
  }

  if (
    tournamentStatus === "DRAFT" ||
    tournamentStatus === "REGISTRATION_OPEN"
  ) {
    return (
      <Card>
        <p className={styles.emptyMessage}>
          請先完成報名流程並截止報名後，才能設定賽程
        </p>
      </Card>
    );
  }

  const categoryTabs = categories.map((cat) => ({
    id: cat.id,
    label: cat.name,
  }));

  // 只有非佔位符的 Match 才算「已發布」
  const hasPublishedMatches = matches.some((m: any) => !m.isPlaceholder);

  return (
    <div className={styles.categoryScheduleManager}>
      <Tabs
        tabs={categoryTabs}
        activeTab={activeCategory}
        onChange={setActiveCategory}
      />

      <div className={styles.content}>
        {loading ? (
          <Card>
            <p className={styles.loadingMessage}>載入中...</p>
          </Card>
        ) : hasPublishedMatches ? (
          // Already published - show status and reassign option
          <Card className={styles.publishedCard}>
            <div className={styles.publishedHeader}>
              <div className={styles.publishedIcon}>✓</div>
              <div className={styles.publishedText}>
                <h3>賽程已發布</h3>
                <p>此分類的賽程已經生成並發布給選手</p>
              </div>
            </div>

            <div className={styles.publishedStats}>
              <div className={styles.statItem}>
                <Calendar size={20} />
                <span>{matches.length} 場比賽</span>
              </div>
              <div className={styles.statItem}>
                <Users size={20} />
                <span>
                  {participants.length}{" "}
                  {currentCategoryData?.matchType === "singles"
                    ? "位選手"
                    : "支隊伍"}
                </span>
              </div>
            </div>

            <div className={styles.publishedActions}>
              <Button
                variant="secondary"
                onClick={handleReassignCourts}
                loading={reassigning}
                disabled={courts.length === 0}
              >
                重新分配場地
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenSeedingAdjustment}
                disabled={!selectedFormat || participants.length < 2}
              >
                ⚙️ 調整配對並重新生成
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  // Navigate to category detail
                  window.location.href = `/events/${tournamentId}/categories/${activeCategory}`;
                }}
              >
                查看賽程
              </Button>
            </div>
          </Card>
        ) : (
          // Not published - show publisher
          <>
            {currentCategoryData && participants.length >= 2 ? (
              <CategoryPublisher
                tournamentId={tournamentId}
                category={currentCategoryData}
                participants={participants}
                courts={courts}
                onPublishSuccess={handlePublishSuccess}
              />
            ) : (
              <Card>
                <p className={styles.warningMessage}>
                  {participants.length < 2
                    ? `此分類至少需要 2 ${
                        currentCategoryData?.matchType === "singles"
                          ? "位選手"
                          : "支隊伍"
                      }才能發布賽程（目前已確認：${participants.length}）`
                    : "請先審核參賽者"}
                </p>
              </Card>
            )}
          </>
        )}
      </div>

      {/* 選手配對調整彈窗 */}
      {currentCategoryData && (
        <PlayerSeedingModal
          isOpen={showSeedingModal}
          onClose={() => setShowSeedingModal(false)}
          participants={participants}
          selectedFormat={selectedFormat}
          onSave={handleSaveSeedingAdjustment}
          matchType={currentCategoryData.matchType}
        />
      )}

      {/* 警告彈窗：有比賽已開始 */}
      <Modal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="⚠️ 無法重新生成賽程"
        size="md"
      >
        <div className={styles.warningModalContent}>
          <div className={styles.warningIcon}>
            <AlertTriangle size={48} color="#ff6b00" />
          </div>
          <p className={styles.warningMessage}>
            此分類有比賽已經開始或已完成，無法重新生成賽程。
          </p>
          <div className={styles.warningStats}>
            <div className={styles.statRow}>
              <span>進行中：</span>
              <strong>{scheduleStats?.inProgress || 0} 場</strong>
            </div>
            <div className={styles.statRow}>
              <span>已完成：</span>
              <strong>{scheduleStats?.completed || 0} 場</strong>
            </div>
            <div className={styles.statRow}>
              <span>未開始：</span>
              <strong>{scheduleStats?.scheduled || 0} 場</strong>
            </div>
          </div>
          <div className={styles.warningHint}>
            <p>💡 <strong>建議：</strong></p>
            <ul>
              <li>使用「重新分配場地」功能調整未開始的比賽場地</li>
              <li>等待所有比賽完成後再重新生成賽程</li>
            </ul>
          </div>
          <div className={styles.warningActions}>
            <Button variant="primary" onClick={() => setShowWarningModal(false)} fullWidth>
              我知道了
            </Button>
          </div>
        </div>
      </Modal>

      {/* 確認重新生成彈窗 */}
      {adjustedParticipants.length > 0 && 
       adjustedParticipants !== participants && 
       !showSeedingModal && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustedParticipants(participants)}
          title="確認重新生成賽程"
          size="md"
        >
          <div className={styles.confirmModalContent}>
            <p>您已調整種子位，是否要立即重新生成賽程？</p>
            <div className={styles.confirmStats}>
              <div className={styles.statRow}>
                <span>將刪除未開始的比賽：</span>
                <strong>{scheduleStats?.scheduled || 0} 場</strong>
              </div>
              <div className={styles.statRow}>
                <span>將保留已開始/完成的比賽：</span>
                <strong>{(scheduleStats?.inProgress || 0) + (scheduleStats?.completed || 0)} 場</strong>
              </div>
            </div>
            <div className={styles.confirmActions}>
              <Button 
                variant="text" 
                onClick={() => setAdjustedParticipants(participants)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleRegenerateSchedule}
                loading={regenerating}
              >
                確認重新生成
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CategoryScheduleManager;
