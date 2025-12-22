import React from "react";
import { Clock, X } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import Button from "../common/Button";
import styles from "./NotificationCard.module.scss";
import type { Notification } from "../../types";

interface NotificationCardProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (action: "accept" | "decline", notification: Notification) => void;
}

// 格式化時間
const formatTime = (timestamp: Timestamp | null | undefined): string => {
  if (!timestamp) {
    return "時間未知";
  }

  try {
    const now = new Date();
    const time = timestamp.toDate();
    const diffInMs = now.getTime() - time.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);

    if (diffInMinutes < 1) {
      return "剛剛";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} 分鐘前`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} 小時前`;
    } else {
      // 超過 24 小時顯示日期
      const month = time.getMonth() + 1;
      const day = time.getDate();
      const hours = time.getHours().toString().padStart(2, "0");
      const minutes = time.getMinutes().toString().padStart(2, "0");
      return `${month}/${day} ${hours}:${minutes}`;
    }
  } catch (error) {
    console.error("格式化時間錯誤:", error);
    return "時間未知";
  }
};

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onRead,
  onDelete,
  onAction,
}) => {
  const handleCardClick = () => {
    // 只標記為已讀，不跳轉
    if (!notification.isRead) {
      onRead(notification.id);
    }
  };

  const handleActionClick = (
    e: React.MouseEvent,
    action: "accept" | "decline"
  ) => {
    e.stopPropagation();
    if (!notification.isRead) {
      onRead(notification.id);
    }
    onAction?.(action, notification);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={`${styles.notificationCard} ${
        !notification.isRead ? styles.unread : styles.read
      }`}
      onClick={handleCardClick}
      style={{ cursor: "pointer" }}
    >
      {!notification.isRead && <div className={styles.unreadIndicator} />}

      <div className={styles.content}>
        <h4 className={styles.title}>{notification.title}</h4>
        <p className={styles.message}>{notification.message}</p>

        <div className={styles.meta}>
          <Clock size={14} />
          <span className={styles.time}>
            {formatTime(notification.createdAt)}
          </span>
        </div>

        {notification.actions && notification.actions.length > 0 && (
          <div className={styles.actions}>
            {notification.actions
              .filter((action) => action.action) // 只顯示有 action 的按鈕（接受/拒絕）
              .map((action, index) => (
                <Button
                  key={index}
                  variant={action.type === "primary" ? "primary" : "outline"}
                  onClick={(e) =>
                    handleActionClick(e, action.action as "accept" | "decline")
                  }
                  size="small"
                >
                  {action.label}
                </Button>
              ))}
          </div>
        )}
      </div>

      <button
        className={styles.deleteButton}
        onClick={handleDelete}
        aria-label="刪除通知"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default NotificationCard;
