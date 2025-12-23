/**
 * 初始化球類項目資料
 *
 * 使用方式：
 * 1. 在瀏覽器 Console 執行：window.initAllSports()
 * 2. 或建立一個臨時頁面/組件來執行此函數
 */

import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * 初始化羽毛球資料
 */
export const initBadminton = async () => {
  try {
    const docRef = doc(db, "sports", "badminton");

    const badmintonData = {
      name: "羽毛球",
      icon: "",
      isActive: true,
      order: 2,
      defaultPresetId: "bwf_standard",
      modes: ["singles", "doubles"],
      rulePresets: [
        {
          id: "bwf_standard",
          label: "BWF 標準賽制",
          description: "每局21分，3局2勝，30分封頂",
          config: {
            cap: 30,
            matchType: "set_based",
            maxSets: 3,
            pointsPerSet: 21,
            setsToWin: 2,
            winByTwo: true,
          },
        },
        {
          id: "one_set_30",
          label: "單局30分制",
          description: "單局30分，適用於快速比賽",
          config: {
            cap: 30,
            matchType: "point_based",
            maxSets: 1,
            pointsPerSet: 30,
            setsToWin: 1,
            winByTwo: false,
          },
        },
        {
          id: "one_set_21",
          label: "單局21分制",
          description: "單局21分，2分領先獲勝，30分封頂",
          config: {
            cap: 30,
            matchType: "point_based",
            maxSets: 1,
            pointsPerSet: 21,
            setsToWin: 1,
            winByTwo: true,
          },
        },
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(docRef, badmintonData);
    console.log("羽毛球資料已建立");
    return "badminton";
  } catch (error) {
    console.error("建立羽毛球資料失敗:", error);
    throw error;
  }
};

/**
 * 初始化匹克球資料
 */
export const initPickleball = async () => {
  try {
    const docRef = doc(db, "sports", "pickleball");

    const pickleballData = {
      name: "匹克球",
      icon: "🏓",
      isActive: true,
      order: 1,
      defaultPresetId: "standard_11",
      modes: ["singles", "doubles"],
      rulePresets: [
        {
          id: "standard_11",
          label: "標準11分制",
          description: "每局11分，3局2勝，15分封頂",
          config: {
            cap: 15,
            matchType: "set_based",
            maxSets: 3,
            pointsPerSet: 11,
            setsToWin: 2,
            winByTwo: true,
          },
        },
        {
          id: "one_set_21",
          label: "單局21分制",
          description: "單局21分，適用於快速比賽",
          config: {
            cap: 21,
            matchType: "point_based",
            maxSets: 1,
            pointsPerSet: 21,
            setsToWin: 1,
            winByTwo: false,
          },
        },
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(docRef, pickleballData);
    console.log("匹克球資料已建立");
    return "pickleball";
  } catch (error) {
    console.error("建立匹克球資料失敗:", error);
    throw error;
  }
};

/**
 * 初始化桌球資料
 */
export const initTableTennis = async () => {
  try {
    const docRef = doc(db, "sports", "table_tennis");

    const tableTennisData = {
      name: "桌球",
      icon: "🏓",
      isActive: true,
      order: 3,
      defaultPresetId: "standard_11",
      modes: ["singles", "doubles"],
      rulePresets: [
        {
          id: "standard_11",
          label: "標準11分制",
          description: "每局11分，5局3勝",
          config: {
            cap: 11,
            matchType: "set_based",
            maxSets: 5,
            pointsPerSet: 11,
            setsToWin: 3,
            winByTwo: true,
          },
        },
        {
          id: "best_of_7",
          label: "7局4勝制",
          description: "每局11分，7局4勝",
          config: {
            cap: 11,
            matchType: "set_based",
            maxSets: 7,
            pointsPerSet: 11,
            setsToWin: 4,
            winByTwo: true,
          },
        },
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(docRef, tableTennisData);
    console.log("桌球資料已建立");
    return "table_tennis";
  } catch (error) {
    console.error("建立桌球資料失敗:", error);
    throw error;
  }
};

/**
 * 初始化所有球類項目
 */
export const initAllSports = async () => {
  try {
    console.log("開始初始化所有球類項目...");
    await initPickleball();
    await initBadminton();
    await initTableTennis();
    console.log(" 所有球類項目初始化完成！");
  } catch (error) {
    console.error("初始化失敗:", error);
    throw error;
  }
};

// 如果需要在 Console 中執行，可以將函數掛載到 window
if (typeof window !== "undefined") {
  (window as any).initAllSports = initAllSports;
  (window as any).initBadminton = initBadminton;
  (window as any).initPickleball = initPickleball;
  (window as any).initTableTennis = initTableTennis;
}





