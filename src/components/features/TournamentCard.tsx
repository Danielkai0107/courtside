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
  fromTab?: string; // 來源頁籤，用於返回時恢復狀態
}

const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  className,
  onClick,
  fromTab,
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

  const formatDateRange = () => {
    // 優先使用新的 startDate/endDate
    const start = tournament.startDate || tournament.date;
    const end = tournament.endDate;

    if (!start) return "";

    const startDate = start.toDate();
    const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`;
    const startTime = startDate.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (!end) {
      return `${startStr} ${startTime}`;
    }

    const endDate = end.toDate();
    const endTime = endDate.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    
    // 判斷是否為同一天
    if (
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate()
    ) {
      return `${startStr} ${startTime} - ${endTime}`;
    } else {
      const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`;
      return `${startStr} ${startTime} - ${endStr} ${endTime}`;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(); // 使用外部傳入的 onClick
    } else {
      // 導航時帶上來源頁籤參數
      const params = fromTab ? `?from=home&tab=${fromTab}` : '';
      navigate(`/events/${tournament.id}${params}`);
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
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{tournament.name}</h3>

        <div className={styles.info}>
          <div className={styles.infoItem}>
            <span className={styles.dateText}>{formatDateRange()}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.locationText}>{tournament.location}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TournamentCard;
