import { useRef, useState, useCallback } from "react";

export interface UseSwipeableTabsOptions {
  tabs: Array<{ id?: string; label: string; value?: string }>;
  activeTab: string;
  onChange: (tabId: string) => void;
  swipeThreshold?: number;
  nested?: boolean;
}

export const useSwipeableTabs = ({
  tabs,
  activeTab,
  onChange,
  swipeThreshold = 50,
  nested = false,
}: UseSwipeableTabsOptions) => {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"horizontal" | "vertical" | null>(null);

  const getCurrentIndex = useCallback(() => {
    return tabs.findIndex((tab) => {
      const tabId = tab.id || tab.value || tab.label;
      return tabId === activeTab;
    });
  }, [tabs, activeTab]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(false);
    setSwipeDirection(null);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
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
  }, [isSwiping, swipeDirection]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
  }, [swipeDirection, swipeThreshold, getCurrentIndex, onChange, tabs]);

  return {
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swipeState: {
      isSwiping,
      swipeDirection,
    },
  };
};

