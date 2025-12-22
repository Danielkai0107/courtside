import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import styles from "./Tabs.module.scss";
import { useSwipeableTabs } from "../../hooks/useSwipeableTabs";

export interface Tab {
  id?: string;
  label: string;
  value?: string;
  badge?: number;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  enableSwipe?: boolean; // 啟用滑動切換
  swipeThreshold?: number; // 滑動距離閾值（px）
  nested?: boolean; // 是否為嵌套的 tabs（內層）
  children?: React.ReactNode; // 如果啟用滑動，需要包裹內容
  smoothTransition?: boolean; // 啟用平滑過渡動畫（預設 true）
  centerActiveTab?: boolean; // 自動將選中的 tab 置中（預設 true）
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  enableSwipe = false,
  swipeThreshold = 50,
  nested = false,
  children,
  smoothTransition = true,
  centerActiveTab = true,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const previousTabRef = useRef(activeTab);
  const previousIndexRef = useRef(0);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  
  const { swipeHandlers, swipeState } = useSwipeableTabs({
    tabs,
    activeTab,
    onChange,
    swipeThreshold,
    nested,
  });

  // 計算當前 tab 的索引
  const getCurrentIndex = () => {
    return tabs.findIndex((tab) => {
      const tabId = tab.id || tab.value || tab.label;
      return tabId === activeTab;
    });
  };

  // 將選中的 tab 置中
  const scrollTabIntoView = (tabId: string) => {
    if (!centerActiveTab || !tabsContainerRef.current) return;

    const tabElement = tabRefs.current.get(tabId);
    if (!tabElement) return;

    const container = tabsContainerRef.current;
    const tabRect = tabElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // 計算需要滾動的距離，使 tab 置中
    const tabCenter = tabRect.left + tabRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const scrollOffset = tabCenter - containerCenter;

    container.scrollBy({
      left: scrollOffset,
      behavior: 'smooth',
    });
  };

  // 當 tab 變化時觸發動畫和置中
  useEffect(() => {
    if (previousTabRef.current !== activeTab) {
      // 滾動到選中的 tab
      scrollTabIntoView(activeTab);

      // 觸發過渡動畫
      if (smoothTransition) {
        const currentIndex = getCurrentIndex();
        const prevIndex = previousIndexRef.current;
        
        // 判斷滑動方向
        setDirection(currentIndex > prevIndex ? 'left' : 'right');
        setIsAnimating(true);
        
        const timer = setTimeout(() => {
          setIsAnimating(false);
          setDirection(null);
        }, 300); // 與 CSS transition 時間一致
        
        previousIndexRef.current = currentIndex;
        
        previousTabRef.current = activeTab;
        return () => clearTimeout(timer);
      }
      
      previousTabRef.current = activeTab;
    }
  }, [activeTab, smoothTransition, centerActiveTab]);

  const tabsHeader = (
    <div className={clsx(styles.tabs, className)} ref={tabsContainerRef}>
      {tabs.map((tab) => {
        const tabId = tab.id || tab.value || tab.label;
        const isActive = activeTab === tabId;
        return (
          <button
            key={tabId}
            ref={(el) => {
              if (el) {
                tabRefs.current.set(tabId, el);
              } else {
                tabRefs.current.delete(tabId);
              }
            }}
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
  );

  // 如果啟用滑動且有子元素，包裹內容區域
  if (enableSwipe && children) {
    return (
      <div className={styles.swipeableTabsContainer}>
        {tabsHeader}
        <div
          className={clsx(
            styles.swipeableContent,
            nested && styles.nested,
            swipeState.isSwiping && styles.swiping,
            isAnimating && styles.transitioning,
            direction && styles[`slide-${direction}`]
          )}
          {...swipeHandlers}
          style={{
            touchAction: swipeState.swipeDirection === "horizontal" ? "none" : "auto",
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  // 如果不啟用滑動，只返回 tabs header
  return tabsHeader;
};

export default Tabs;
