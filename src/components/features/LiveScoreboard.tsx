import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { subscribeMatch } from '../../services/matchService';
import Card from '../common/Card';
import Loading from '../common/Loading';
import styles from './LiveScoreboard.module.scss';
import type { Match } from '../../types';

export interface LiveScoreboardProps {
  matchId: string;
  readOnly?: boolean;
  className?: string;
}

const LiveScoreboard: React.FC<LiveScoreboardProps> = ({
  matchId,
  readOnly = true,
  className,
}) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeMatch(matchId, (data) => {
      setMatch(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [matchId]);

  if (loading) {
    return <Loading />;
  }

  if (!match) {
    return <div className={styles.error}>找不到比賽資料</div>;
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
    <Card className={clsx(styles.scoreboard, className)} padding="lg">
      {match.status === 'IN_PROGRESS' && (
        <div className={styles.liveTag}>
          <span className={styles.liveDot}></span>
          LIVE
        </div>
      )}

      <div className={styles.scores}>
        <div className={styles.playerSection}>
          <span className={styles.playerName}>{match.playerA_Name || '選手 A'}</span>
          <span className={clsx(styles.score, match.score.A > match.score.B && styles.winning)}>
            {match.score.A}
          </span>
        </div>

        <div className={styles.divider}>VS</div>

        <div className={styles.playerSection}>
          <span className={styles.playerName}>{match.playerB_Name || '選手 B'}</span>
          <span className={clsx(styles.score, match.score.B > match.score.A && styles.winning)}>
            {match.score.B}
          </span>
        </div>
      </div>

      {match.timeline && match.timeline.length > 0 && (
        <div className={styles.timeline}>
          <h4 className={styles.timelineTitle}>比分歷程</h4>
          <div className={styles.timelineList}>
            {[...match.timeline].reverse().map((log, index) => (
              <div key={index} className={styles.timelineItem}>
                <span className={styles.timelineTime}>
                  {formatTime(log.time)}
                </span>
                <span className={styles.timelineAction}>
                  {log.action === 'score' 
                    ? `${log.team === 'A' ? match.playerA_Name : match.playerB_Name} 得分 +${log.val}`
                    : `復原 ${log.team} 隊 ${log.val} 分`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {match.status === 'COMPLETED' && match.finishedAt && (
        <div className={styles.finishedInfo}>
          比賽已於 {formatTime(match.finishedAt)} 結束
        </div>
      )}
    </Card>
  );
};

export default LiveScoreboard;

