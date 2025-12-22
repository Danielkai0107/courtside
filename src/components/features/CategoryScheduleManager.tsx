import React, { useState, useEffect } from "react";
import { Calendar, Users } from "lucide-react";
import Button from "../common/Button";
import Card from "../common/Card";
import Tabs from "../common/Tabs";
import CategoryPublisher from "./CategoryPublisher";
import styles from "./CategoryScheduleManager.module.scss";
import type { Category } from "../../types";
import { getPlayers } from "../../services/registrationService";
import { getTeamsByCategory } from "../../services/teamService";
import { getCourts } from "../../services/courtService";
import { getMatchesByTournament } from "../../services/matchService";
import { reassignCourtsByCategory } from "../../services/courtService";

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
        if (category.matchType === "singles") {
          const playersData = await getPlayers(tournamentId);
          // 過濾該分類的已確認選手
          const confirmed = playersData.filter(
            (p) =>
              p.status === "confirmed" &&
              (p.categoryId === activeCategory || !p.categoryId) // 兼容舊數據
          );
          setParticipants(
            confirmed.map((p) => ({
              id: p.uid || p.id,
              name: p.name,
            }))
          );
        } else {
          const teamsData = await getTeamsByCategory(
            tournamentId,
            activeCategory,
            "confirmed"
          );
          setParticipants(
            teamsData.map((t) => ({
              id: t.id,
              name: `${t.player1Name} / ${t.player2Name}`,
            }))
          );
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

  const hasPublishedMatches = matches.length > 0;

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
    </div>
  );
};

export default CategoryScheduleManager;
