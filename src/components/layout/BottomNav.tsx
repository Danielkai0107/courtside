import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { listenToUnreadCount } from "../../services/notificationService";
import styles from "./BottomNav.module.scss";
import clsx from "clsx";
import type { UserRole } from "../../types";

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
  const location = useLocation();
  const [currentRole, setCurrentRole] = useState<UserRole>("user");
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const loadUserRole = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setCurrentRole(userDoc.data().currentRole || "user");
        }
      } catch (error) {
        console.error("Failed to load user role:", error);
      }
    };

    loadUserRole();
  }, [currentUser, location.pathname]); // Reload when location changes

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

  // User navigation items
  const userNavItems = [
    { name: "首頁", path: "/", icon: "home" },
    { name: "我的比賽", path: "/my-games", icon: "editor_choice" },
    { name: "錦標賽", path: "/events", icon: "emoji_events" },
    {
      name: "通知",
      path: "/notifications",
      icon: "notifications",
      badge: unreadCount,
    },
    { name: "個人", path: "/profile", icon: "person" },
  ];

  // Organizer navigation items
  const organizerNavItems = [
    { name: "我的主辦", path: "/organizer", icon: "handshake" },
    {
      name: "通知",
      path: "/notifications",
      icon: "notifications",
      badge: unreadCount,
    },
    { name: "個人", path: "/profile", icon: "person" },
  ];

  // Scorer navigation items
  const scorerNavItems = [
    { name: "我的任務", path: "/scorer", icon: "ballot" },
    {
      name: "通知",
      path: "/notifications",
      icon: "notifications",
      badge: unreadCount,
    },
    { name: "個人", path: "/profile", icon: "person" },
  ];

  const getNavItems = () => {
    switch (currentRole) {
      case "organizer":
        return organizerNavItems;
      case "scorer":
        return scorerNavItems;
      default:
        return userNavItems;
    }
  };

  const navItems = getNavItems();

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
