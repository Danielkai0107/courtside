/**
 * 初始化球類項目資料
 *
 * 使用方式：
 * 1. 在瀏覽器 Console 執行
 * 2. 或建立一個臨時頁面/組件來執行此函數
 */

import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";

export const initPickleball = async () => {
  try {
    const sportsRef = collection(db, "sports");

    // 匹克球資料
    const pickleballData = {
      name: "匹克球",
      nameEn: "Pickleball",
      icon: "P",
      availableFormats: [
        {
          id: "knockout",
          name: "單淘汰賽",
          description: "選手兩兩對戰，輸者淘汰，贏者晉級下一輪",
        },
      ],
      defaultPointsPerSet: 11,
      isActive: true,
      order: 1,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(sportsRef, pickleballData);
    console.log("匹克球資料已建立，ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("建立匹克球資料失敗:", error);
    throw error;
  }
};

// 如果需要在 Console 中執行，可以將函數掛載到 window
if (typeof window !== "undefined") {
  (window as any).initPickleball = initPickleball;
}





