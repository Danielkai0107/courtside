import React from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import Card from "../common/Card";
import ImageWithSkeleton from "../common/ImageWithSkeleton";
import styles from "./TournamentBanner.module.scss";
import type { Tournament } from "../../types";
import demoImage from "../../assets/demo.jpg";

export interface TournamentBannerProps {
  tournament: Tournament;
  className?: string;
  onClick?: () => void;
  fromTab?: string;
}

const TournamentBanner: React.FC<TournamentBannerProps> = ({
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

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return null;
    const date = timestamp.toDate();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const time = date.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return { month, day, time, fullDate: `${month}/${day}` };
  };

  const getTimeRange = () => {
    // 優先使用新的 startDate/endDate
    const start = tournament.startDate || tournament.date;
    const end = tournament.endDate;

    if (!start) return "";

    const startInfo = formatDateTime(start);
    if (!startInfo) return "";

    if (!end) {
      // 如果沒有結束時間，只顯示開始時間
      return `${startInfo.fullDate} ${startInfo.time}`;
    }

    const endInfo = formatDateTime(end);
    if (!endInfo) return "";

    // 判斷是否為同一天
    if (startInfo.month === endInfo.month && startInfo.day === endInfo.day) {
      return `${startInfo.fullDate} ${startInfo.time} - ${endInfo.time}`;
    } else {
      return `${startInfo.fullDate} ${startInfo.time} - ${endInfo.fullDate} ${endInfo.time}`;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      const params = fromTab ? `?from=home&tab=${fromTab}` : "";
      navigate(`/events/${tournament.id}${params}`);
    }
  };

  return (
    <Card
      className={clsx(styles.tournamentBanner, className)}
      onClick={handleClick}
    >
      <div className={styles.thumbnailWrapper}>
        <ImageWithSkeleton
          src={tournament.bannerURL || demoImage}
          alt={tournament.name}
          aspectRatio="1/1"
          className={styles.thumbnail}
        />
      </div>

      <div className={styles.content}>
        {(tournament.startDate || tournament.date) && (
          <div className={styles.timeRange}>{getTimeRange()}</div>
        )}

        <h3 className={styles.title}>{tournament.name}</h3>

        <div className={styles.footer}>
          {tournament.location && (
            <div className={styles.location}>
              <span>{tournament.location}</span>
            </div>
          )}
          <span
            className={clsx(
              styles.tag,
              styles[getStatusClass(tournament.status)]
            )}
          >
            {getStatusLabel(tournament.status)}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default TournamentBanner;
