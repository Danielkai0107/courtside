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
import type { Match, MatchTimelineLog, MatchDoc, MatchScoreSet, CategoryDoc } from "../types";
import type { ScoringConfig } from "../types/universal-config";
import { getCategory } from "./tournamentService";

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

// ============================================
// 通用運動引擎 - 通用計分引擎
// ============================================

/**
 * 檢查分數是否達到該局的獲勝條件
 * 
 * @param score 當前分數
 * @param opponentScore 對手分數
 * @param config 計分配置
 * @returns 是否獲勝
 */
function isSetWon(
  score: number,
  opponentScore: number,
  config: ScoringConfig
): boolean {
  // 首先檢查是否達到目標分數
  if (score < config.pointsPerSet) {
    return false;
  }

  // 檢查是否需要領先2分
  if (config.winByTwo) {
    const lead = score - opponentScore;
    
    // 如果有分數上限，檢查是否達到上限
    if (config.cap && score >= config.cap) {
      return true; // 達到上限，直接獲勝
    }
    
    // 需要領先2分
    return lead >= 2;
  }

  // 不需要領先2分，達到目標分數即獲勝
  return true;
}

/**
 * 通用計分引擎 - 記錄分數
 * 
 * 這是核心函數，完全通用，無任何硬編碼：
 * 1. 讀取 CategoryDoc.scoringConfig
 * 2. 驗證分數是否達到獲勝條件
 * 3. 更新 sets[] 陣列
 * 4. 重新計算 p1Aggregate, p2Aggregate
 * 5. 檢查比賽獲勝條件
 * 6. 觸發自動晉級
 * 
 * @param matchId 比賽ID
 * @param setIndex 局號（0-based）
 * @param p1Points 選手1分數
 * @param p2Points 選手2分數
 */
export async function recordScoreUniversal(
  matchId: string,
  setIndex: number,
  p1Points: number,
  p2Points: number
): Promise<void> {
  try {
    console.log(
      `[MatchService] 記錄分數: Match=${matchId}, Set=${setIndex + 1}, P1=${p1Points}, P2=${p2Points}`
    );

    // 1. 獲取比賽文檔
    const matchRef = doc(db, "matches", matchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
      throw new Error(`比賽不存在: ${matchId}`);
    }

    const match = { id: matchSnap.id, ...matchSnap.data() } as MatchDoc;

    // 2. 獲取分組配置（包含 scoringConfig）
    const category = await getCategory(match.tournamentId, match.categoryId);

    if (!category) {
      throw new Error(`分組不存在: ${match.categoryId}`);
    }

    const config = category.scoringConfig;

    console.log(
      `[MatchService] 使用計分配置: ${config.matchType}, ${config.pointsPerSet}pts, ${config.setsToWin}/${config.maxSets} sets`
    );

    // 3. 驗證分數有效性
    if (p1Points < 0 || p2Points < 0) {
      throw new Error("分數不能為負數");
    }

    // 檢查是否超過上限
    if (config.cap) {
      if (p1Points > config.cap || p2Points > config.cap) {
        throw new Error(`分數不能超過上限 ${config.cap}`);
      }
    }

    // 4. 初始化或更新 sets 陣列
    const sets: MatchScoreSet[] = [...(match.sets || [])];

    // 確保 sets 陣列有足夠的長度
    while (sets.length <= setIndex) {
      sets.push({
        setNumber: sets.length + 1,
        p1Score: 0,
        p2Score: 0,
        winner: null,
        isCompleted: false,
      });
    }

    // 5. 更新該局分數
    sets[setIndex] = {
      setNumber: setIndex + 1,
      p1Score: p1Points,
      p2Score: p2Points,
      winner: null,
      isCompleted: false,
    };

    // 6. 檢查該局是否決出勝負
    if (isSetWon(p1Points, p2Points, config)) {
      sets[setIndex].winner = "p1";
      sets[setIndex].isCompleted = true;
      console.log(`[MatchService] 選手1獲勝第 ${setIndex + 1} 局`);
    } else if (isSetWon(p2Points, p1Points, config)) {
      sets[setIndex].winner = "p2";
      sets[setIndex].isCompleted = true;
      console.log(`[MatchService] 選手2獲勝第 ${setIndex + 1} 局`);
    }

    // 7. 重新計算累計獲勝局數
    const p1Aggregate = sets.filter((s) => s.winner === "p1").length;
    const p2Aggregate = sets.filter((s) => s.winner === "p2").length;

    console.log(
      `[MatchService] 累計局數: P1=${p1Aggregate}, P2=${p2Aggregate} (需要${config.setsToWin}局獲勝)`
    );

    // 8. 檢查比賽是否決出勝負
    let winnerId: string | null = null;
    let matchStatus = match.status;

    if (p1Aggregate >= config.setsToWin) {
      winnerId = match.player1Id;
      matchStatus = "COMPLETED";
      console.log(`[MatchService] 選手1獲勝比賽！`);
    } else if (p2Aggregate >= config.setsToWin) {
      winnerId = match.player2Id;
      matchStatus = "COMPLETED";
      console.log(`[MatchService] 選手2獲勝比賽！`);
    }

    // 9. 更新比賽文檔
    const updates: any = {
      sets,
      p1Aggregate,
      p2Aggregate,
      status: matchStatus,
      updatedAt: serverTimestamp(),
    };

    if (winnerId) {
      updates.winnerId = winnerId;
      updates.endTime = serverTimestamp();
    }

    await updateDoc(matchRef, updates);

    console.log(`[MatchService] 分數記錄成功`);

    // 10. 如果比賽結束，觸發自動晉級
    if (winnerId && match.nextMatchId) {
      console.log(
        `[MatchService] 觸發自動晉級: 勝者進入 Match ${match.nextMatchId} 的 ${match.nextMatchSlot} 位置`
      );
      await propagateWinner(matchId);
    }

    // 11. 如果比賽結束且有場地，釋放場地
    if (winnerId && match.courtId) {
      console.log(`[MatchService] 釋放場地: ${match.courtId}`);
      // 這裡可以調用 courtService 的函數來釋放場地
    }
  } catch (error) {
    console.error("[MatchService] 記錄分數失敗:", error);
    throw error;
  }
}

/**
 * 自動晉級 - 將勝者填入下一場比賽
 * 
 * @param matchId 當前比賽ID
 */
async function propagateWinner(matchId: string): Promise<void> {
  try {
    const matchRef = doc(db, "matches", matchId);
    const matchSnap = await getDoc(matchRef);

    if (!matchSnap.exists()) {
      console.warn(`[MatchService] 比賽不存在: ${matchId}`);
      return;
    }

    const match = { id: matchSnap.id, ...matchSnap.data() } as MatchDoc;

    if (!match.winnerId) {
      console.warn(`[MatchService] 比賽尚未決出勝負: ${matchId}`);
      return;
    }

    if (!match.nextMatchId || !match.nextMatchSlot) {
      console.log(`[MatchService] 沒有下一場比賽，可能是決賽`);
      return;
    }

    // 更新下一場比賽的選手
    const nextMatchRef = doc(db, "matches", match.nextMatchId);
    const updates: any = {};

    if (match.nextMatchSlot === "p1") {
      updates.player1Id = match.winnerId;
      updates.player1Name = 
        match.winnerId === match.player1Id
          ? match.player1Name
          : match.player2Name;
    } else {
      updates.player2Id = match.winnerId;
      updates.player2Name =
        match.winnerId === match.player1Id
          ? match.player1Name
          : match.player2Name;
    }

    // 檢查下一場是否兩位選手都已確定
    const nextMatchSnap = await getDoc(nextMatchRef);
    if (nextMatchSnap.exists()) {
      const nextMatch = nextMatchSnap.data() as MatchDoc;
      
      // 如果兩位選手都已確定，更新狀態為 PENDING_COURT
      const bothPlayersReady =
        (match.nextMatchSlot === "p1"
          ? match.winnerId && nextMatch.player2Id
          : nextMatch.player1Id && match.winnerId);

      if (bothPlayersReady) {
        updates.status = "PENDING_COURT";
        console.log(
          `[MatchService] 下一場比賽 ${match.nextMatchId} 兩位選手已確定，狀態更新為 PENDING_COURT`
        );
      }
    }

    await updateDoc(nextMatchRef, updates);

    console.log(
      `[MatchService] 成功晉級: ${match.winnerId} → Match ${match.nextMatchId} (${match.nextMatchSlot})`
    );
  } catch (error) {
    console.error("[MatchService] 自動晉級失敗:", error);
    throw error;
  }
}
