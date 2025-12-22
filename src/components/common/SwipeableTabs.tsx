import React, { useRef, useState, useEffect } from "react";
import clsx from "clsx";
import styles from "./Tabs.module.scss";

export interface Tab {
  id?: string;
  label: string;
  value?: string;
  badge?: number;
}

export interface SwipeableTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  children: React.ReactNode;
  swipeThreshold?: number; // 滑動距離閾值（px），默認 50
  nested?: boolean; // 是否為嵌套的 tabs（內層）
}

const SwipeableTabs: React.FC<SwipeableTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  children,
  swipeThreshold = 50,
  nested = false,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"horizontal" | "vertical" | null>(null);

  const getCurrentIndex = () => {
    return tabs.findIndex((tab) => {
      const tabId = tab.id || tab.value || tab.label;
      return tabId === activeTab;
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(false);
    setSwipeDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping && swipeDirection === null) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);

      // 判斷滑動方向（橫向或縱向）
      if (deltaX > 10 || deltaY > 10) {
        if (deltaX > deltaY) {
          setSwipeDirection("horizontal");
          setIsSwiping(true);
        } else {
          setSwipeDirection("vertical");
        }
      }
    }

    // 如果是橫向滑動，阻止默認行為（避免頁面左右滑動）
    if (swipeDirection === "horizontal") {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // 只處理橫向滑動
    if (swipeDirection !== "horizontal") {
      setIsSwiping(false);
      setSwipeDirection(null);
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    const currentIndex = getCurrentIndex();

    // 向左滑（切換到下一個 tab）
    if (deltaX < -swipeThreshold && currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1];
      const nextTabId = nextTab.id || nextTab.value || nextTab.label;
      onChange(nextTabId);
    }
    // 向右滑（切換到上一個 tab）
    else if (deltaX > swipeThreshold && currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1];
      const prevTabId = prevTab.id || prevTab.value || prevTab.label;
      onChange(prevTabId);
    }

    setIsSwiping(false);
    setSwipeDirection(null);
  };

  return (
    <div className={clsx(styles.swipeableTabsContainer, className)}>
      {/* Tabs Header */}
      <div className={styles.tabs}>
        {tabs.map((tab) => {
          const tabId = tab.id || tab.value || tab.label;
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              className={clsx(styles.tab, isActive && styles.active)}
              onClick={() => onChange(tabId)}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={styles.badge}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Swipeable Content */}
      <div
        ref={contentRef}
        className={clsx(
          styles.swipeableContent,
          nested && styles.nested,
          isSwiping && styles.swiping
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction: swipeDirection === "horizontal" ? "none" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableTabs;

