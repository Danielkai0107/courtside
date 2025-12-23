import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import type { Category } from "../types";
import {
  generateKnockoutOnly,
  generateGroupThenKnockout,
  generateRoundRobin,
} from "./bracketService";
import type { FormatTemplate } from "../types";

/**
 * 刪除指定分類的所有未開始比賽
 * @returns 刪除的比賽數量
 */
export async function deleteUnstartedMatchesByCategory(
  tournamentId: string,
  categoryId: string
): Promise<number> {
  const matchesRef = collection(db, "matches");
  const q = query(
    matchesRef,
    where("tournamentId", "==", tournamentId),
    where("categoryId", "==", categoryId),
    where("status", "==", "SCHEDULED")
  );

  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return 0;
  }

  // 使用 batch 批量刪除
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  await batch.commit();
  
  console.log(`✅ 已刪除 ${snapshot.size} 場未開始的比賽`);
  return snapshot.size;
}

/**
 * 檢查分類是否有正在進行或已完成的比賽
 */
export async function hasStartedMatches(
  tournamentId: string,
  categoryId: string
): Promise<{ hasStarted: boolean; count: number }> {
  const matchesRef = collection(db, "matches");
  const q = query(
    matchesRef,
    where("tournamentId", "==", tournamentId),
    where("categoryId", "==", categoryId),
    where("status", "in", ["IN_PROGRESS", "COMPLETED"])
  );

  const snapshot = await getDocs(q);
  
  return {
    hasStarted: !snapshot.empty,
    count: snapshot.size,
  };
}

/**
 * 重新生成賽程（保留已開始的比賽）
 */
export async function regenerateSchedule(
  tournamentId: string,
  category: Category,
  reorderedParticipants: Array<{ id: string; name: string }>,
  selectedFormat: FormatTemplate,
  courts: Array<{ id: string; name: string }>
): Promise<void> {
  // 1. 檢查是否有已開始的比賽
  const { hasStarted, count } = await hasStartedMatches(
    tournamentId,
    category.id
  );

  if (hasStarted) {
    throw new Error(
      `此分類有 ${count} 場比賽已開始或已完成，無法重新生成賽程。\n` +
      `建議：僅重新分配場地，或完成所有比賽後再重新生成。`
    );
  }

  // 2. 刪除所有未開始的比賽
  const deletedCount = await deleteUnstartedMatchesByCategory(
    tournamentId,
    category.id
  );
  console.log(`🗑️ 已刪除 ${deletedCount} 場未開始的比賽`);

  // 3. 根據賽制重新生成
  const hasGroupStage = selectedFormat.stages.some(
    (s) => s.type === "group_stage"
  );
  const hasRoundRobin = selectedFormat.stages.some(
    (s) => s.type === "round_robin"
  );

  console.log(`🔄 開始重新生成賽程（使用調整後的種子位）`);

  if (hasRoundRobin) {
    // 循環賽
    await generateRoundRobin(
      tournamentId,
      category.id,
      reorderedParticipants,
      category.ruleConfig || {
        matchType: "point_based",
        maxSets: 1,
        pointsPerSet: category.pointsPerSet || 21,
        setsToWin: 1,
        winByTwo: false,
      },
      courts
    );
  } else if (hasGroupStage) {
    // 小組賽 + 淘汰賽
    const groupStage = selectedFormat.stages.find(
      (s) => s.type === "group_stage"
    );
    const knockoutStage = selectedFormat.stages.find(
      (s) => s.type === "knockout"
    );

    if (!groupStage || !knockoutStage) {
      throw new Error("模板配置錯誤");
    }

    const totalGroups = groupStage.count || 4;
    const advancePerGroup = groupStage.advance || 2;
    const knockoutSize = knockoutStage.size || 8;

    const teamsPerGroup = Math.floor(reorderedParticipants.length / totalGroups);
    const remainder = reorderedParticipants.length % totalGroups;
    const teamsPerGroupArray = Array(totalGroups)
      .fill(teamsPerGroup)
      .map((count, i) => (i < remainder ? count + 1 : count));

    await generateGroupThenKnockout(
      tournamentId,
      category.id,
      reorderedParticipants,
      {
        totalGroups,
        teamsPerGroup: teamsPerGroupArray,
        advancePerGroup,
        bestThirdPlaces: 0,
      },
      knockoutSize,
      category.enableThirdPlaceMatch,
      courts
    );
  } else {
    // 純淘汰賽
    await generateKnockoutOnly(
      tournamentId,
      category.id,
      reorderedParticipants,
      category.enableThirdPlaceMatch,
      courts
    );
  }

  console.log(`✅ 賽程重新生成完成`);
}

/**
 * 獲取分類的賽程統計資訊
 */
export async function getCategoryScheduleStats(
  tournamentId: string,
  categoryId: string
): Promise<{
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
}> {
  const matchesRef = collection(db, "matches");
  const q = query(
    matchesRef,
    where("tournamentId", "==", tournamentId),
    where("categoryId", "==", categoryId)
  );

  const snapshot = await getDocs(q);
  
  const stats = {
    total: snapshot.size,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
  };

  snapshot.docs.forEach((doc) => {
    const status = doc.data().status;
    if (status === "SCHEDULED") stats.scheduled++;
    else if (status === "IN_PROGRESS") stats.inProgress++;
    else if (status === "COMPLETED") stats.completed++;
  });

  return stats;
}

