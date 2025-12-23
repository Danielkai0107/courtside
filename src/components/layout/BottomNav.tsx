import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { listenToUnreadCount } from "../../services/notificationService";
import styles from "./BottomNav.module.scss";
import clsx from "clsx";

// Material Symbol 組件
const MaterialSymbol: React.FC<{ icon: string; filled?: boolean }> = ({
  icon,
  filled = false,
}) => (
  <span
    className="material-symbols-rounded"
    style={{
      fontVariationSettings: filled
        ? "'FILL' 1, 'wght' 500"
        : "'FILL' 0, 'wght' 300",
    }}
  >
    {icon}
  </span>
);

const BottomNav: React.FC = () => {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // 監聽未讀通知數量
  useEffect(() => {
    if (!currentUser?.uid) {
      setUnreadCount(0);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // 延遲監聽以確保權限已生效
    const timer = setTimeout(() => {
      unsubscribe = listenToUnreadCount(currentUser.uid, (count) => {
        setUnreadCount(count);
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // 統一的導覽列項目
  const navItems = [
    { name: "首頁", path: "/", icon: "home" },
    { name: "我的比賽", path: "/my-games", icon: "sports_tennis" },
    { name: "我的主辦", path: "/my-organizer", icon: "emoji_events" },
    { name: "計分任務", path: "/my-scorer", icon: "scoreboard" },
    { name: "個人", path: "/profile", icon: "person", badge: unreadCount },
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            clsx(styles.navItem, isActive && styles.active)
          }
        >
          {({ isActive }) => (
            <>
              <div className={styles.iconWrapper}>
                <MaterialSymbol icon={item.icon} filled={isActive} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={styles.badge}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className={styles.label}>{item.name}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
