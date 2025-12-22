import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Users } from 'lucide-react';
import { getMatch } from '../services/matchService';
import { getTournament } from '../services/tournamentService';
import LiveScoreboard from '../components/features/LiveScoreboard';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import styles from './MatchDetail.module.scss';
import type { Match, Tournament } from '../types';

const MatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        const matchData = await getMatch(id);
        setMatch(matchData);

        if (matchData?.tournamentId) {
          const tournamentData = await getTournament(matchData.tournamentId);
          setTournament(tournamentData);
        }
      } catch (error) {
        console.error('Failed to load match:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!match) {
    return (
      <div className={styles.error}>
        <p>找不到此比賽資料</p>
        <button onClick={() => navigate(-1)}>返回</button>
      </div>
    );
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.matchDetail}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h2 className={styles.headerTitle}>比賽詳情</h2>
      </div>

      <div className={styles.content}>
        {tournament && (
          <Card className={styles.tournamentInfo}>
            <h3 className={styles.tournamentName}>{tournament.name}</h3>
            <div className={styles.infoRow}>
              <MapPin size={16} />
              <span>{tournament.location}</span>
            </div>
            {match.scheduledTime && (
              <div className={styles.infoRow}>
                <Users size={16} />
                <span>比賽時間：{formatTime(match.scheduledTime)}</span>
              </div>
            )}
          </Card>
        )}

        <LiveScoreboard matchId={match.id} readOnly />
      </div>
    </div>
  );
};

export default MatchDetail;
