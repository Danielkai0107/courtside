import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Court } from "../types";

/**
 * 新增場地
 */
export const createCourt = async (
  tournamentId: string,
  courtData: {
    name: string;
    order: number;
  },
  organizerId?: string
): Promise<string> => {
  // 獲取 tournament 的 organizerId（用於權限）
  let orgId = organizerId;
  if (!orgId) {
    const { getTournament } = await import("./tournamentService");
    const tournament = await getTournament(tournamentId);
    orgId = tournament?.organizerId;
  }

  const docRef = await addDoc(collection(db, "courts"), {
    tournamentId,
    organizerId: orgId,  // 添加 organizerId 用於刪除權限
    name: courtData.name,
    order: courtData.order,
    status: "IDLE",
    currentMatchId: null,
    createdAt: serverTimestamp(),
  });
  console.log(`Court created: ${docRef.id} - ${courtData.name}`);
  return docRef.id;
};

/**
 * 獲取賽事的所有場地
 */
export const getCourts = async (tournamentId: string): Promise<Court[]> => {
  const q = query(
    collection(db, "courts"),
    where("tournamentId", "==", tournamentId),
    orderBy("order", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as Court)
  );
};

/**
 * 刪除場地
 */
export const deleteCourt = async (
  tournamentId: string,
  courtId: string
): Promise<void> => {
  await deleteDoc(doc(db, "courts", courtId));
  console.log(`Court deleted: ${courtId}`);
};

/**
 * 即時監聽場地狀態
 */
export const subscribeCourts = (
  tournamentId: string,
  callback: (courts: Court[]) => void
) => {
  const q = query(
    collection(db, "courts"),
    where("tournamentId", "==", tournamentId),
    orderBy("order", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const courts = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Court)
    );
    callback(courts);
  });
};

/**
 * 智能重新分配場地給未開始的比賽（按賽制邏輯）
 */
export const reassignCourts = async (
  tournamentId: string,
  courts: Court[]
): Promise<{ success: number; skipped: number }> => {
  if (courts.length === 0) {
    throw new Error("沒有可用的場地");
  }

  // 獲取所有比賽
  const matchesQuery = query(
    collection(db, "matches"),
    where("tournamentId", "==", tournamentId)
  );
  const matchesSnapshot = await getDocs(matchesQuery);
  const allMatches = matchesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  // 過濾出可以重新分配的比賽（包含所有未開始的，即使選手還沒確定）
  const matchesNeedingCourts = allMatches.filter(
    (m) =>
      m.status === "PENDING_COURT" ||
      m.status === "PENDING_PLAYER" ||
      m.status === "SCHEDULED"
  );

  if (matchesNeedingCourts.length === 0) {
    return { success: 0, skipped: allMatches.length };
  }

  // 使用 batch 更新
  const batch = writeBatch(db);
  let successCount = 0;

  // 按賽制邏輯分配
  const groupMatches = matchesNeedingCourts.filter((m) => m.stage === "group");
  const knockoutMatches = matchesNeedingCourts.filter(
    (m) => m.stage === "knockout"
  );

  // 小組賽：按小組固定場地
  if (groupMatches.length > 0) {
    const groups: Record<string, any[]> = {};
    groupMatches.forEach((match) => {
      const label = match.groupLabel || "A";
      if (!groups[label]) groups[label] = [];
      groups[label].push(match);
    });

    const groupLabels = Object.keys(groups).sort();
    groupLabels.forEach((label, index) => {
      const court = courts[index % courts.length];
      groups[label].forEach((match) => {
        const matchRef = doc(db, "matches", match.id);
        batch.update(matchRef, {
          courtId: court.id,
          status: "SCHEDULED",
          updatedAt: serverTimestamp(),
        });
        successCount++;
      });
    });
  }

  // 淘汰賽：按輪次策略分配
  if (knockoutMatches.length > 0) {
    const byRound: Record<string, any[]> = {
      R32: [],
      R16: [],
      QF: [],
      SF: [],
      FI: [],
      "3RD": [],
    };

    knockoutMatches.forEach((match) => {
      const label = match.roundLabel || "R16";
      if (byRound[label]) {
        byRound[label].push(match);
      }
    });

    // 決賽和準決賽：主場地
    ["FI", "3RD", "SF"].forEach((roundLabel) => {
      byRound[roundLabel]?.forEach((match) => {
        const matchRef = doc(db, "matches", match.id);
        batch.update(matchRef, {
          courtId: courts[0].id,
          status: "SCHEDULED",
          updatedAt: serverTimestamp(),
        });
        successCount++;
      });
    });

    // 八強和之前：輪流分配
    ["QF", "R16", "R32"].forEach((roundLabel) => {
      byRound[roundLabel]?.forEach((match, index) => {
        const court = courts[index % courts.length];
        const matchRef = doc(db, "matches", match.id);
        batch.update(matchRef, {
          courtId: court.id,
          status: "SCHEDULED",
          updatedAt: serverTimestamp(),
        });
        successCount++;
      });
    });
  }

  await batch.commit();

  console.log(
    `Reassigned ${successCount} matches to ${courts.length} courts (智能分配)`
  );

  return {
    success: successCount,
    skipped: allMatches.length - successCount,
  };
};

/**
 * 按分類重新分配場地
 */
export const reassignCourtsByCategory = async (
  tournamentId: string,
  categoryId: string,
  courts: Court[]
): Promise<{ success: number; skipped: number }> => {
  if (courts.length === 0) {
    throw new Error("沒有可用的場地");
  }

  // 獲取該分類的所有比賽
  const matchesQuery = query(
    collection(db, "matches"),
    where("tournamentId", "==", tournamentId),
    where("categoryId", "==", categoryId)
  );
  const matchesSnapshot = await getDocs(matchesQuery);
  const allMatches = matchesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  // 過濾出可以重新分配的比賽（包含所有未開始的）
  const matchesNeedingCourts = allMatches.filter(
    (m) =>
      m.status === "PENDING_COURT" ||
      m.status === "PENDING_PLAYER" ||
      m.status === "SCHEDULED"
  );

  if (matchesNeedingCourts.length === 0) {
    return { success: 0, skipped: allMatches.length };
  }

  // 使用相同的智能分配邏輯
  const batch = writeBatch(db);
  let successCount = 0;

  const groupMatches = matchesNeedingCourts.filter((m) => m.stage === "group");
  const knockoutMatches = matchesNeedingCourts.filter(
    (m) => m.stage === "knockout"
  );

  // 小組賽：按小組固定場地
  if (groupMatches.length > 0) {
    const groups: Record<string, any[]> = {};
    groupMatches.forEach((match) => {
      const label = match.groupLabel || "A";
      if (!groups[label]) groups[label] = [];
      groups[label].push(match);
    });

    const groupLabels = Object.keys(groups).sort();
    groupLabels.forEach((label, index) => {
      const court = courts[index % courts.length];
      groups[label].forEach((match) => {
        const matchRef = doc(db, "matches", match.id);
        batch.update(matchRef, {
          courtId: court.id,
          status: "SCHEDULED",
          updatedAt: serverTimestamp(),
        });
        successCount++;
      });
    });
  }

  // 淘汰賽：按輪次策略
  if (knockoutMatches.length > 0) {
    const byRound: Record<string, any[]> = {
      R32: [],
      R16: [],
      QF: [],
      SF: [],
      FI: [],
      "3RD": [],
    };

    knockoutMatches.forEach((match) => {
      const label = match.roundLabel || "R16";
      if (byRound[label]) {
        byRound[label].push(match);
      }
    });

    // 決賽系列：主場地
    ["FI", "3RD", "SF"].forEach((roundLabel) => {
      byRound[roundLabel]?.forEach((match) => {
        const matchRef = doc(db, "matches", match.id);
        batch.update(matchRef, {
          courtId: courts[0].id,
          status: "SCHEDULED",
          updatedAt: serverTimestamp(),
        });
        successCount++;
      });
    });

    // 其他輪次：輪流分配
    ["QF", "R16", "R32"].forEach((roundLabel) => {
      byRound[roundLabel]?.forEach((match, index) => {
        const court = courts[index % courts.length];
        const matchRef = doc(db, "matches", match.id);
        batch.update(matchRef, {
          courtId: court.id,
          status: "SCHEDULED",
          updatedAt: serverTimestamp(),
        });
        successCount++;
      });
    });
  }

  await batch.commit();

  console.log(
    `Reassigned ${successCount} matches for category ${categoryId} to ${courts.length} courts`
  );

  return {
    success: successCount,
    skipped: allMatches.length - successCount,
  };
};
