import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  listenToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
} from "../services/notificationService";
import { acceptInvitation, declineInvitation } from "../services/staffService";
import NotificationCard from "../components/features/NotificationCard";
import Button from "../components/common/Button";
import Tabs from "../components/common/Tabs";
import Loading from "../components/common/Loading";
import styles from "./Notifications.module.scss";
import type { Notification } from "../types";

const Notifications: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // 延遲監聽以確保權限已生效
    const timer = setTimeout(() => {
      unsubscribe = listenToNotifications(
        currentUser.uid,
        (newNotifications) => {
          setNotifications(newNotifications);
          setLoading(false);
        }
      );
    }, 500);

    return () => {
      clearTimeout(timer);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    setProcessing(true);
    try {
      await markAllAsRead(currentUser.uid);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      alert("操作失敗，請稍後再試");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error("Failed to delete notification:", error);
      alert("刪除失敗，請稍後再試");
    }
  };

  const handleClearRead = async () => {
    if (!currentUser) return;

    const confirmed = window.confirm("確定要清除所有已讀通知嗎？");
    if (!confirmed) return;

    setProcessing(true);
    try {
      await deleteReadNotifications(currentUser.uid);
    } catch (error) {
      console.error("Failed to clear read notifications:", error);
      alert("清除失敗，請稍後再試");
    } finally {
      setProcessing(false);
    }
  };

  const handleAction = async (
    action: "accept" | "decline",
    notification: Notification
  ) => {
    const { tournamentId, staffId } = notification.relatedData;

    if (!tournamentId || !staffId || !currentUser) {
      alert("操作失敗：缺少必要資訊");
      return;
    }

    setProcessing(true);
    try {
      if (action === "accept") {
        await acceptInvitation(tournamentId, staffId, currentUser.uid);
        alert("已接受邀請！");
      } else {
        await declineInvitation(tournamentId, staffId);
        alert("已拒絕邀請");
      }

      // 刪除此通知
      await deleteNotification(notification.id);
    } catch (error) {
      console.error("Failed to handle invitation:", error);
      alert("操作失敗，請稍後再試");
    } finally {
      setProcessing(false);
    }
  };

  // 篩選通知
  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return <Loading />;
  }

  return (
    <div className={styles.notifications}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>通知</h1>
      </div>

      <Tabs
        tabs={[
          { label: "全部", value: "all" },
          {
            label: "未讀",
            value: "unread",
            badge: unreadCount > 0 ? -1 : undefined, // -1 表示只顯示紅點
          },
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as "all" | "unread")}
        enableSwipe={true}
        swipeThreshold={60}
      >
        <div className={styles.content}>
          {unreadCount > 0 && (
            <div className={styles.contentActions}>
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
                disabled={processing}
                size="small"
              >
                全部標記已讀
              </Button>
            </div>
          )}
          <div className={styles.list}>
            {filteredNotifications.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyText}>
                  {activeTab === "unread" ? "沒有未讀通知" : "目前沒有通知"}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  onAction={handleAction}
                />
              ))
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default Notifications;
