import React, { createContext, useContext, useState } from "react";
import type { UserRole } from "../types";

interface RoleSwitchContextType {
  isTransitioning: boolean;
  transitionText: string;
  startTransition: (targetRole: UserRole, onComplete: () => void, customText?: string) => void;
  startGenericTransition: (text: string, onComplete: () => void) => void;
}

const RoleSwitchContext = createContext<RoleSwitchContextType | undefined>(
  undefined
);

export const RoleSwitchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionText, setTransitionText] = useState("切換視角中...");

  const startTransition = (targetRole: UserRole, onComplete: () => void, customText?: string) => {
    setIsTransitioning(true);
    setTransitionText(customText || "切換視角中...");

    // 等待動畫完成後執行回調
    setTimeout(() => {
      onComplete();

      // 再等一下讓新頁面渲染後淡入
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 1200); // 動畫持續時間
  };

  const startGenericTransition = (text: string, onComplete: () => void) => {
    setIsTransitioning(true);
    setTransitionText(text);

    // 等待動畫完成後執行回調
    setTimeout(() => {
      onComplete();

      // 再等一下讓新頁面渲染後淡入
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 1200); // 動畫持續時間
  };

  return (
    <RoleSwitchContext.Provider value={{ isTransitioning, transitionText, startTransition, startGenericTransition }}>
      {children}
    </RoleSwitchContext.Provider>
  );
};

export const useRoleSwitch = () => {
  const context = useContext(RoleSwitchContext);
  if (context === undefined) {
    throw new Error("useRoleSwitch must be used within a RoleSwitchProvider");
  }
  return context;
};
