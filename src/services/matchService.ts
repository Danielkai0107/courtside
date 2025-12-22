import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Match, MatchTimelineLog } from "../types";

/**
 * Helper function to remove undefined values from object
 */
const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
};

/**
 * Helper function to remove duplicate matches by id
 */
const uniqueMatches = (matches: Match[]): Match[] => {
  const seen = new Set<string>();
  return matches.filter((match) => {
    if (seen.has(match.id)) {
      console.warn(`Duplicate match found: ${match.id}`);
      return false;
    }
    seen.add(match.id);
    return true;
  });
};

/**
 * 建立比賽場次
 */
export const createMatch = async (
  matchData: Omit<Match, "id" | "score" | "timeline" | "status">
): Promise<string> => {
  const cleanData = removeUndefined({
    ...matchData,
    score: { A: 0, B: 0 },
    status: "SCHEDULED",
    timeline: [],
  });

  const docRef = await addDoc(collection(db, "matches"), cleanData);
  return docRef.id;
};

/**
 * 獲取單一場次
 */
export const getMatch = async (matchId: string): Promise<Match | null> => {
  const docRef = doc(db, "matches", matchId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Match;
};

/**
 * 獲取賽事的所有場次
 */
export const getMatchesByTournament = async (
  tournamentId: string
): Promise<Match[]> => {
  // 先嘗試使用新的排序（round + matchOrder）
  try {
    const q = query(
      collection(db, "matches"),
      where("tournamentId", "==", tournamentId),
      orderBy("round", "asc"),
      orderBy("matchOrder", "asc")
    );
    const querySnapshot = await getDocs(q);

    const matches = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Match[];

    return uniqueMatches(matches);
  } catch (error: any) {
    // 如果索引還在建立中，降級為不排序
    console.log("使用備用查詢方式（索引建立中）");
    const q = query(
      collection(db, "matches"),
      where("tournamentId", "==", tournamentId)
    );
    const querySnapshot = await getDocs(q);

    const matches = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Match[];

    // 手動排序
    return uniqueMatches(matches).sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.matchOrder - b.matchOrder;
    });
  }
};

/**
 * 獲取選手的所有場次
 */
export const getMatchesByPlayer = async (
  playerId: string,
  status?: Match["status"][]
): Promise<Match[]> => {
  // 查詢 player1Id 或 player2Id 匹配的比賽
  const constraints1 = [where("player1Id", "==", playerId)];
  const constraints2 = [where("player2Id", "==", playerId)];

  if (status && status.length > 0) {
    constraints1.push(where("status", "in", status));
    constraints2.push(where("status", "in", status));
  }

  const qA = query(collection(db, "matches"), ...constraints1);
  const qB = query(collection(db, "matches"), ...constraints2);

  const [snapshotA, snapshotB] = await Promise.all([getDocs(qA), getDocs(qB)]);

  const matchesA = snapshotA.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];

  const matchesB = snapshotB.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];

  // 合併並按 round 和 matchOrder 排序
  return [...matchesA, ...matchesB].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.matchOrder - b.matchOrder;
  });
};

/**
 * 獲取紀錄員的場次
 */
export const getMatchesByScorer = async (
  scorerId: string
): Promise<Match[]> => {
  const q = query(
    collection(db, "matches"),
    where("scorerId", "==", scorerId),
    orderBy("scheduledTime", "desc")
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];
};

/**
 * 開始比賽
 */
export const startMatch = async (matchId: string): Promise<void> => {
  const docRef = doc(db, "matches", matchId);
  await updateDoc(docRef, {
    status: "IN_PROGRESS",
    startedAt: serverTimestamp(),
  });
};

/**
 * 記錄得分
 */
export const recordScore = async (
  matchId: string,
  player: "player1" | "player2",
  points: number = 1
): Promise<void> => {
  const matchDoc = await getMatch(matchId);
  if (!matchDoc) throw new Error("Match not found");

  const newScore = {
    ...matchDoc.score,
    [player]: matchDoc.score[player] + points,
  };

  const logEntry: MatchTimelineLog = {
    time: Timestamp.now(),
    team: player === "player1" ? "A" : "B", // 保留舊的 timeline 格式
    action: "score",
    val: points,
  };

  const docRef = doc(db, "matches", matchId);
  await updateDoc(docRef, {
    score: newScore,
    timeline: [...matchDoc.timeline, logEntry],
  });
};

/**
 * 復原最後一次操作
 */
export const undoLastAction = async (matchId: string): Promise<void> => {
  const matchDoc = await getMatch(matchId);
  if (!matchDoc || matchDoc.timeline.length === 0) {
    throw new Error("No action to undo");
  }

  const timeline = [...matchDoc.timeline];
  const lastAction = timeline.pop();

  if (!lastAction || lastAction.action !== "score") {
    throw new Error("Cannot undo this action");
  }

  const newScore = {
    ...matchDoc.score,
    [lastAction.team]: matchDoc.score[lastAction.team] - lastAction.val,
  };

  const undoLog: MatchTimelineLog = {
    time: Timestamp.now(),
    team: lastAction.team,
    action: "undo",
    val: lastAction.val,
  };

  const docRef = doc(db, "matches", matchId);
  await updateDoc(docRef, {
    score: newScore,
    timeline: [...timeline, undoLog],
  });
};

/**
 * 結束比賽
 */
export const finishMatch = async (matchId: string): Promise<void> => {
  const docRef = doc(db, "matches", matchId);
  await updateDoc(docRef, {
    status: "COMPLETED",
    finishedAt: serverTimestamp(),
  });
};

/**
 * 即時監聽場次變化
 */
export const subscribeMatch = (
  matchId: string,
  callback: (match: Match | null) => void
) => {
  const docRef = doc(db, "matches", matchId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({
        id: docSnap.id,
        ...docSnap.data(),
      } as Match);
    } else {
      callback(null);
    }
  });
};

/**
 * 即時監聽賽事的所有場次
 */
export const subscribeMatchesByTournament = (
  tournamentId: string,
  callback: (matches: Match[]) => void
) => {
  const q = query(
    collection(db, "matches"),
    where("tournamentId", "==", tournamentId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const matches = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Match[];

    // Ensure no duplicates before callback
    callback(uniqueMatches(matches));
  });
};

/**
 * 指派紀錄員
 */
export const assignScorer = async (
  matchId: string,
  scorerId: string
): Promise<void> => {
  const docRef = doc(db, "matches", matchId);
  await updateDoc(docRef, {
    scorerId,
  });
};

/**
 * 刪除賽事的所有比賽（用於重新抽籤）
 */
export const deleteMatchesByTournament = async (
  tournamentId: string
): Promise<void> => {
  const q = query(
    collection(db, "matches"),
    where("tournamentId", "==", tournamentId)
  );
  const querySnapshot = await getDocs(q);

  const deletePromises = querySnapshot.docs.map((docSnapshot) =>
    deleteDoc(doc(db, "matches", docSnapshot.id))
  );

  await Promise.all(deletePromises);
  console.log(
    `Deleted ${querySnapshot.docs.length} matches for tournament ${tournamentId}`
  );
};

/**
 * 場地自動調度 - 分配空閒場地給等待中的比賽
 */
async function dispatchCourtToWaitingMatch(
  tournamentId: string,
  availableCourtId: string
): Promise<void> {
  // 搜尋 status='PENDING_COURT' 且 matchOrder 最小的比賽
  const waitingMatches = await getDocs(
    query(
      collection(db, "matches"),
      where("tournamentId", "==", tournamentId),
      where("status", "==", "PENDING_COURT"),
      orderBy("matchOrder", "asc"),
      limit(1)
    )
  );

  if (waitingMatches.empty) {
    console.log("No matches waiting for court");
    return;
  }

  const nextMatch = waitingMatches.docs[0];

  // Transaction 分配場地
  await runTransaction(db, async (transaction) => {
    const matchRef = doc(db, "matches", nextMatch.id);
    const courtRef = doc(db, "courts", availableCourtId);

    transaction.update(matchRef, {
      courtId: availableCourtId,
      status: "SCHEDULED",
      scheduledTime: serverTimestamp(),
    });

    transaction.update(courtRef, {
      status: "IN_USE",
      currentMatchId: nextMatch.id,
    });
  });

  console.log(`Court ${availableCourtId} assigned to match ${nextMatch.id}`);
}

/**
 * 完成比賽並觸發自動化流程
 * 1. 判定勝負
 * 2. 釋放場地
 * 3. 推進下一場 (Linked List)
 * 4. 分配空閒場地給等待中的比賽
 */
export const completeMatch = async (
  matchId: string,
  finalScore: { player1: number; player2: number }
): Promise<void> => {
  const match = await getMatch(matchId);
  if (!match) throw new Error("Match not found");

  // 判定勝者
  const winnerId =
    finalScore.player1 > finalScore.player2 ? match.player1Id : match.player2Id;
  const loserId =
    winnerId === match.player1Id ? match.player2Id : match.player1Id;

  // Firestore Transaction 確保原子性
  // 重要：所有 read 必須在任何 write 之前完成
  await runTransaction(db, async (transaction) => {
    // === 階段 1: 所有讀取操作 ===

    // 讀取下一場比賽（如果有）
    let nextMatchData: Match | null = null;
    if (match.nextMatchId) {
      const nextMatchRef = doc(db, "matches", match.nextMatchId);
      const nextMatchSnap = await transaction.get(nextMatchRef);
      nextMatchData = nextMatchSnap.data() as Match;
    }

    // 讀取敗部下一場（雙敗淘汰專用）
    let loserNextMatchData: Match | null = null;
    if (match.loserNextMatchId) {
      const loserNextMatchRef = doc(db, "matches", match.loserNextMatchId);
      const loserNextMatchSnap = await transaction.get(loserNextMatchRef);
      loserNextMatchData = loserNextMatchSnap.data() as Match;
    }

    // === 階段 2: 所有寫入操作 ===

    // 1. 更新當前比賽
    const matchRef = doc(db, "matches", matchId);
    transaction.update(matchRef, {
      winnerId,
      score: finalScore,
      status: "COMPLETED",
      finishedAt: serverTimestamp(),
    });

    // 2. 釋放場地
    if (match.courtId) {
      const courtRef = doc(db, "courts", match.courtId);
      transaction.update(courtRef, {
        status: "IDLE",
        currentMatchId: null,
      });
    }

    // 3. 推進勝者到下一場
    if (match.nextMatchId && winnerId && nextMatchData) {
      const nextMatchRef = doc(db, "matches", match.nextMatchId);
      const updateField =
        match.nextMatchSlot === "player1" ? "player1Id" : "player2Id";
      const updateNameField =
        match.nextMatchSlot === "player1" ? "player1Name" : "player2Name";

      // 獲取勝者名稱
      const winnerName =
        winnerId === match.player1Id ? match.player1Name : match.player2Name;

      const updateData: any = {
        [updateField]: winnerId,
      };

      // 如果有名稱，也更新名稱
      if (winnerName) {
        updateData[updateNameField] = winnerName;
      }

      transaction.update(nextMatchRef, updateData);

      // 檢查下一場是否兩位選手都到齊
      const otherPlayerField =
        match.nextMatchSlot === "player1" ? "player2Id" : "player1Id";
      if (nextMatchData[otherPlayerField]) {
        transaction.update(nextMatchRef, {
          status: "PENDING_COURT",
        });
      }

      console.log(
        `Winner ${winnerId} (${winnerName}) advanced to match ${match.nextMatchId}`
      );
    }

    // 4. 推進敗者（雙敗淘汰專用）
    if (match.loserNextMatchId && loserId && loserNextMatchData) {
      const loserNextMatchRef = doc(db, "matches", match.loserNextMatchId);
      const loserUpdateField =
        match.loserNextMatchSlot === "player1" ? "player1Id" : "player2Id";
      const loserUpdateNameField =
        match.loserNextMatchSlot === "player1" ? "player1Name" : "player2Name";

      // 獲取敗者名稱
      const loserName =
        loserId === match.player1Id ? match.player1Name : match.player2Name;

      const loserUpdateData: any = {
        [loserUpdateField]: loserId,
      };

      // 如果有名稱，也更新名稱
      if (loserName) {
        loserUpdateData[loserUpdateNameField] = loserName;
      }

      transaction.update(loserNextMatchRef, loserUpdateData);

      // 檢查敗部下一場是否兩位選手都到齊
      const otherLoserField =
        match.loserNextMatchSlot === "player1" ? "player2Id" : "player1Id";
      if (loserNextMatchData[otherLoserField]) {
        transaction.update(loserNextMatchRef, {
          status: "PENDING_COURT",
        });
      }

      console.log(
        `Loser ${loserId} (${loserName}) advanced to loser bracket match ${match.loserNextMatchId}`
      );
    }
  });

  // 5. 場地補位調度（Transaction 外執行）
  if (match.courtId) {
    try {
      await dispatchCourtToWaitingMatch(match.tournamentId, match.courtId);
    } catch (error) {
      console.error("Failed to dispatch court:", error);
      // 不影響比賽完成，只記錄錯誤
    }
  }

  console.log(`Match ${matchId} completed successfully`);
};
