import React from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import Card from "../common/Card";
import ImageWithSkeleton from "../common/ImageWithSkeleton";
import AvatarWithSkeleton from "../common/AvatarWithSkeleton";
import { User } from "lucide-react";
import styles from "./TournamentCard.module.scss";
import type { Tournament } from "../../types";
import demoImage from "../../assets/demo.jpg";

export interface TournamentCardProps {
  tournament: Tournament;
  className?: string;
  onClick?: () => void; // 支援自定義點擊行為
}

const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  className,
  onClick,
}) => {
  const navigate = useNavigate();

  const getStatusLabel = (status: Tournament["status"]) => {
    const labels: Record<string, string> = {
      DRAFT: "草稿",
      REGISTRATION_OPEN: "開放報名中",
      REGISTRATION_CLOSED: "報名截止",
      ONGOING: "進行中",
      COMPLETED: "已結束",
      CANCELLED: "已取消",
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: Tournament["status"]) => {
    return status;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString("zh-TW", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
  };

  const handleClick = () => {
    if (onClick) {
      onClick(); // 使用外部傳入的 onClick
    } else {
      navigate(`/events/${tournament.id}`); // 默認導航
    }
  };

  return (
    <Card
      className={clsx(styles.tournamentCard, className)}
      onClick={handleClick}
    >
      <div className={styles.banner}>
        <ImageWithSkeleton
          src={tournament.bannerURL || demoImage}
          alt={tournament.name}
          aspectRatio="3/1"
        />
        <div className={styles.overlay}></div>
      </div>
      <div className={styles.content}>
        <div className={styles.Wrapper}>
          <div className={styles.publisher}>
            <AvatarWithSkeleton
              src={tournament.organizerPhotoURL}
              alt={tournament.organizerName || "匿名主辦方"}
              size={30}
              className={styles.avatar}
              fallbackIcon={<User size={16} />}
            />
            <span className={styles.organizerName}>
              {tournament.organizerName || "匿名主辦方"}
            </span>
          </div>
          <span
            className={clsx(
              styles.status,
              styles[getStatusClass(tournament.status)]
            )}
          >
            {getStatusLabel(tournament.status)}
          </span>
        </div>

        <h3 className={styles.title}>{tournament.name}</h3>

        <div className={styles.info}>
          <div className={styles.infoItem}>
            <span>{formatDate(tournament.date)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TournamentCard;
