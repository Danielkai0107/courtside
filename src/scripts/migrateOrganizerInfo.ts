import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * 遷移腳本：將所有現有賽事的發布者資訊從 users 集合補充到 tournaments 集合
 *
 * 使用方法：
 * 1. 在瀏覽器控制台中引入此腳本
 * 2. 運行 migrateOrganizerInfo()
 */

export const migrateOrganizerInfo = async (): Promise<void> => {
  console.log("開始遷移賽事發布者資訊...");

  try {
    // 1. 獲取所有賽事
    const tournamentsRef = collection(db, "tournaments");
    const tournamentsSnapshot = await getDocs(tournamentsRef);

    console.log(`找到 ${tournamentsSnapshot.size} 個賽事`);

    // 2. 篩選出需要更新的賽事（沒有 organizerName 或 organizerPhotoURL）
    const tournamentsNeedingUpdate: Array<{
      id: string;
      organizerId: string;
    }> = [];

    tournamentsSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.organizerName || !data.organizerPhotoURL) {
        tournamentsNeedingUpdate.push({
          id: docSnap.id,
          organizerId: data.organizerId,
        });
      }
    });

    console.log(`需要更新 ${tournamentsNeedingUpdate.length} 個賽事`);

    if (tournamentsNeedingUpdate.length === 0) {
      console.log("所有賽事都已有發布者資訊！");
      return;
    }

    // 3. 獲取所有唯一的 organizerId
    const organizerIds = Array.from(
      new Set(tournamentsNeedingUpdate.map((t) => t.organizerId))
    );

    console.log(`需要查詢 ${organizerIds.length} 個發布者資料`);

    // 4. 批量查詢 users
    const organizerMap = new Map<string, { name: string; photoURL?: string }>();

    for (const organizerId of organizerIds) {
      try {
        const userRef = doc(db, "users", organizerId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          organizerMap.set(organizerId, {
            name: userData.displayName || userData.email || "匿名主辦方",
            photoURL: userData.photoURL || undefined,
          });
          console.log(
            `  找到發布者：${userData.displayName || userData.email}`
          );
        } else {
          console.warn(`  找不到用戶：${organizerId}`);
        }
      } catch (error) {
        console.error(`  查詢用戶失敗 ${organizerId}:`, error);
      }
    }

    // 5. 批量更新賽事（使用 batch 提高效率）
    const batchSize = 500; // Firestore batch 上限
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < tournamentsNeedingUpdate.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchTournaments = tournamentsNeedingUpdate.slice(
        i,
        Math.min(i + batchSize, tournamentsNeedingUpdate.length)
      );

      for (const tournament of batchTournaments) {
        const organizerInfo = organizerMap.get(tournament.organizerId);

        if (organizerInfo) {
          const tournamentRef = doc(db, "tournaments", tournament.id);
          batch.update(tournamentRef, {
            organizerName: organizerInfo.name,
            organizerPhotoURL: organizerInfo.photoURL || null,
          });
          updatedCount++;
        } else {
          errorCount++;
          console.warn(`  無法更新賽事 ${tournament.id}：找不到發布者資料`);
        }
      }

      try {
        await batch.commit();
        console.log(
          `  批次更新完成 (${i + 1}-${Math.min(
            i + batchSize,
            tournamentsNeedingUpdate.length
          )})`
        );
      } catch (error) {
        console.error(`  批次更新失敗:`, error);
        errorCount += batchTournaments.length;
      }
    }

    // 6. 輸出結果
    console.log("\n" + "=".repeat(50));
    console.log("遷移完成！");
    console.log(`統計：`);
    console.log(`  - 總賽事數：${tournamentsSnapshot.size}`);
    console.log(`  - 需要更新：${tournamentsNeedingUpdate.length}`);
    console.log(`  - 成功更新：${updatedCount}`);
    console.log(`  - 更新失敗：${errorCount}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("遷移過程發生錯誤:", error);
    throw error;
  }
};

// 如果直接運行此腳本
if (typeof window !== "undefined") {
  (window as any).migrateOrganizerInfo = migrateOrganizerInfo;
  console.log("遷移腳本已載入！在控制台執行 migrateOrganizerInfo() 開始遷移");
}
