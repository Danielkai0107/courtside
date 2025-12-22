import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getTournament } from "../../services/tournamentService";
import {
  getMatchesByTournament,
  subscribeMatchesByTournament,
} from "../../services/matchService";
import { getCategories } from "../../services/categoryService";
import { getCourts } from "../../services/courtService";
import Card from "../../components/common/Card";
import Loading from "../../components/common/Loading";
import styles from "./TournamentMatches.module.scss";
import type { Tournament, Match, Court, Category } from "../../types";

const TournamentMatches: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [tournamentData, categoriesData, matchesData, courtsData] = await Promise.all([
          getTournament(id),
          getCategories(id),
          getMatchesByTournament(id),
          getCourts(id),
        ]);
        setTournament(tournamentData);
        setCategories(categoriesData);
        setMatches(matchesData);
        setCourts(courtsData);
      } catch (error) {
        console.error("Failed to load tournament matches:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 即時監聽比賽變化
    const unsubscribe = subscribeMatchesByTournament(id, (updatedMatches) => {
      setMatches(updatedMatches);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!tournament) {
    return (
      <div className={styles.error}>
        <p>賽事不存在</p>
      </div>
    );
  }

  // 顯示類別列表（簡化導航）
  return (
    <div className={styles.tournamentMatches}>
      <div className={styles.header}>
        <button onClick={() => navigate("/scorer")} className={styles.backButton}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.headerTitle}>{tournament.name}</h1>
      </div>

      <div className={styles.content}>
        <Card className={styles.infoCard}>
          <h3>賽事資訊</h3>
          <div className={styles.tournamentInfo}>
            <div className={styles.infoRow}>
              <span>日期：</span>
              <span>{tournament.date.toDate().toLocaleDateString("zh-TW")}</span>
            </div>
            <div className={styles.infoRow}>
              <span>地點：</span>
              <span>{tournament.location}</span>
            </div>
            <div className={styles.infoRow}>
              <span>分類數量：</span>
              <span>{categories.length} 個</span>
            </div>
          </div>
        </Card>

        {categories.length === 0 ? (
          <Card>
            <p className={styles.emptyMessage}>此賽事尚未設定分類</p>
          </Card>
        ) : (
          <div className={styles.categoryList}>
            <h3 className={styles.sectionTitle}>比賽分類</h3>
            {categories.map((category) => {
              const categoryMatches = matches.filter(m => m.categoryId === category.id);
              const completedCount = categoryMatches.filter(m => m.status === "COMPLETED").length;
              
              return (
                <Card
                  key={category.id}
                  className={styles.categoryCard}
                  onClick={() => navigate(`/scorer/tournaments/${id}/categories/${category.id}`)}
                >
                  <div className={styles.categoryHeader}>
                    <h4 className={styles.categoryName}>{category.name}</h4>
                    <span className={styles.categoryType}>
                      {category.matchType === "singles" ? "單打" : "雙打"}
                    </span>
                  </div>
                  <div className={styles.categoryStats}>
                    <span>{category.currentParticipants}/{category.maxParticipants} 參賽</span>
                    <span>•</span>
                    <span>{completedCount}/{categoryMatches.length} 場已完成</span>
                  </div>
                  <div className={styles.categoryArrow}>→</div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentMatches;
