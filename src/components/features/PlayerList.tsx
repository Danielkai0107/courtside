import React, { useEffect, useState } from 'react';
import { Check, X, User } from 'lucide-react';
import { getPlayers, updatePlayerStatus } from '../../services/registrationService';
import Card from '../common/Card';
import Button from '../common/Button';
import Loading from '../common/Loading';
import AvatarWithSkeleton from '../common/AvatarWithSkeleton';
import styles from './PlayerList.module.scss';
import type { Player } from '../../types';

export interface PlayerListProps {
  tournamentId: string;
  canManage?: boolean;
  filterStatus?: Player['status'];
  className?: string;
}

const PlayerList: React.FC<PlayerListProps> = ({
  tournamentId,
  canManage = false,
  filterStatus,
  className,
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPlayers = async () => {
    try {
      const data = await getPlayers(tournamentId, filterStatus);
      setPlayers(data);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, [tournamentId, filterStatus]);

  const handleStatusChange = async (playerId: string, status: Player['status']) => {
    setProcessingId(playerId);
    try {
      await updatePlayerStatus(tournamentId, playerId, status);
      await loadPlayers(); // Reload list
    } catch (error) {
      console.error('Failed to update player status:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (players.length === 0) {
    return (
      <div className={styles.empty}>
        <User size={48} />
        <p>目前沒有選手</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {players.map((player) => (
        <Card key={player.id} className={styles.playerCard}>
          <div className={styles.playerInfo}>
            <AvatarWithSkeleton
              src={player.photoURL}
              alt={player.name}
              size={44}
              className={styles.avatar}
              fallbackIcon={<User size={24} />}
            />
            <div className={styles.details}>
              <span className={styles.name}>
                {player.name}
                {player.isShadow && <span className={styles.shadowBadge}>待註冊</span>}
              </span>
              <span className={styles.email}>{player.email}</span>
            </div>
            <span className={styles.status}>
              {player.status === 'confirmed' ? '✓ 已確認' : '待審核'}
            </span>
          </div>

          {canManage && player.status === 'pending' && (
            <div className={styles.actions}>
              <Button
                variant="secondary"
                onClick={() => handleStatusChange(player.id, 'confirmed')}
                loading={processingId === player.id}
                disabled={processingId !== null}
              >
                <Check size={16} />
                批准
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default PlayerList;

