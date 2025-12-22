import {
  collection,
  doc,
  writeBatch,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Match, Court } from "../types";

/**
 * Fisher-Yates 洗牌演算法
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 建立 Match 物件的輔助函數
 * 注意：移除所有 undefined 值，Firestore 不接受 undefined
 */
function createMatchNode(data: Partial<Match>): Match {
  const match: any = {
    id: data.id || "",
    tournamentId: data.tournamentId || "",
    categoryId: data.categoryId || "",
    stage: data.stage || "knockout",
    round: data.round || 1,
    matchOrder: data.matchOrder || 1,
    player1Id: data.player1Id || null,
    player2Id: data.player2Id || null,
    winnerId: null,
    nextMatchId: data.nextMatchId || null,
    nextMatchSlot: data.nextMatchSlot || null,
    loserNextMatchId: data.loserNextMatchId || null,
    loserNextMatchSlot: data.loserNextMatchSlot || null,
    courtId: data.courtId || null,
    status: data.status || "PENDING_PLAYER",
    score: {
      player1: 0,
      player2: 0,
    },
    timeline: [],
  };

  // 只有在有值時才加入 optional 欄位
  if (data.player1Name) match.player1Name = data.player1Name;
  if (data.player2Name) match.player2Name = data.player2Name;
  if (data.scorerId) match.scorerId = data.scorerId;
  if (data.groupLabel) match.groupLabel = data.groupLabel;
  if (data.roundLabel) match.roundLabel = data.roundLabel;

  return match as Match;
}

/**
 * Linked List 樹狀結構生成
 */
function buildBracketTree(
  tournamentId: string,
  slots: Array<{ id: string; name: string } | "BYE">,
  bracketSize: number,
  enableThirdPlace: boolean
): Match[] {
  const matches: Match[] = [];
  let matchIdCounter = 1;

  // 計算總輪數
  const totalRounds = Math.log2(bracketSize);

  // Round 1: 初始配對
  for (let i = 0; i < slots.length; i += 2) {
    const player1 = slots[i];
    const player2 = slots[i + 1];
    const hasBye = player1 === "BYE" || player2 === "BYE";

    const match = createMatchNode({
      id: `match-${matchIdCounter++}`,
      tournamentId,
      round: 1,
      matchOrder: i / 2 + 1,
      player1Id: player1 === "BYE" ? null : player1.id,
      player2Id: player2 === "BYE" ? null : player2.id,
      player1Name: player1 === "BYE" ? undefined : player1.name,
      player2Name: player2 === "BYE" ? undefined : player2.name,
      status: hasBye ? "PENDING_PLAYER" : "PENDING_COURT",
    });
    matches.push(match);
  }

  // Round 2 ~ Final: 建立空白晉級場次
  let previousRoundMatches = matches.slice();

  for (let round = 2; round <= totalRounds; round++) {
    const roundMatches: Match[] = [];

    for (let i = 0; i < previousRoundMatches.length; i += 2) {
      const match = createMatchNode({
        id: `match-${matchIdCounter++}`,
        tournamentId,
        round,
        matchOrder: i / 2 + 1,
        player1Id: null,
        player2Id: null,
        status: "PENDING_PLAYER",
      });

      // 設定前一輪的 nextMatchId（檢查邊界）
      if (previousRoundMatches[i]) {
        previousRoundMatches[i].nextMatchId = match.id;
        previousRoundMatches[i].nextMatchSlot = "player1";
      }
      if (previousRoundMatches[i + 1]) {
        previousRoundMatches[i + 1].nextMatchId = match.id;
        previousRoundMatches[i + 1].nextMatchSlot = "player2";
      }

      roundMatches.push(match);
    }

    matches.push(...roundMatches);
    previousRoundMatches = roundMatches;
  }

  // 季軍賽 (可選)
  if (enableThirdPlace && totalRounds >= 2) {
    const semiFinals = matches.filter((m) => m.round === totalRounds - 1);
    const thirdPlaceMatch = createMatchNode({
      id: `match-${matchIdCounter++}`,
      tournamentId,
      round: totalRounds + 0.5, // 特殊標記（在決賽之前）
      matchOrder: 1,
      player1Id: null,
      player2Id: null,
      status: "PENDING_PLAYER",
    });

    // 準決賽的敗者進入季軍賽（檢查是否存在）
    if (semiFinals.length >= 2) {
      if (semiFinals[0]) {
        semiFinals[0].loserNextMatchId = thirdPlaceMatch.id;
        semiFinals[0].loserNextMatchSlot = "player1";
      }
      if (semiFinals[1]) {
        semiFinals[1].loserNextMatchId = thirdPlaceMatch.id;
        semiFinals[1].loserNextMatchSlot = "player2";
      }
    }

    matches.push(thirdPlaceMatch);
  }

  return matches;
}

/**
 * 智能場地分配（按賽制邏輯）
 */
function assignCourtsToMatches(
  matches: Match[],
  courts: { id: string; name: string }[]
): void {
  console.log(`開始場地分配：${matches.length} 場比賽，${courts.length} 個場地`);
  
  if (courts.length === 0) {
    console.warn(`沒有可用的場地，跳過場地分配`);
    return;
  }

  // 過濾需要分配場地的比賽（包含所有輪次）
  const matchesNeedingCourts = matches.filter(
    (m) => m.status === "PENDING_COURT" || m.status === "PENDING_PLAYER"
  );

  console.log(`需要分配場地的比賽：${matchesNeedingCourts.length} 場`);

  if (matchesNeedingCourts.length === 0) {
    console.log(`沒有需要分配場地的比賽`);
    return;
  }

  // 判斷是小組賽還是淘汰賽
  const hasGroupStage = matchesNeedingCourts.some((m) => m.stage === "group");
  const hasKnockoutStage = matchesNeedingCourts.some((m) => m.stage === "knockout");

  console.log(`賽制分析：小組賽=${hasGroupStage}, 淘汰賽=${hasKnockoutStage}`);

  if (hasGroupStage) {
    // 小組賽：按小組固定場地
    assignGroupStageCourts(matchesNeedingCourts, courts);
  }

  if (hasKnockoutStage) {
    // 淘汰賽：按輪次策略分配
    assignKnockoutCourts(matchesNeedingCourts, courts);
  }

  // 驗證分配結果
  const assignedCount = matchesNeedingCourts.filter(m => m.courtId).length;
  console.log(`場地分配完成：${assignedCount}/${matchesNeedingCourts.length} 場比賽已分配`);
}

/**
 * 小組賽場地分配：按小組固定場地
 */
function assignGroupStageCourts(
  matches: Match[],
  courts: { id: string; name: string }[]
): void {
  // 按 groupLabel 分組
  const groups: Record<string, Match[]> = {};
  matches
    .filter((m) => m.stage === "group")
    .forEach((match) => {
      const label = match.groupLabel || "A";
      if (!groups[label]) groups[label] = [];
      groups[label].push(match);
    });

  // 為每個小組分配固定場地
  const groupLabels = Object.keys(groups).sort();
  groupLabels.forEach((label, index) => {
    const court = courts[index % courts.length];
    groups[label].forEach((match) => {
      match.courtId = court.id;
      match.status = "SCHEDULED";
    });
    console.log(`Group ${label} → ${court.name} (${groups[label].length} 場比賽)`);
  });
}

/**
 * 淘汰賽場地分配：按輪次策略
 */
function assignKnockoutCourts(
  matches: Match[],
  courts: { id: string; name: string }[]
): void {
  const knockoutMatches = matches.filter((m) => m.stage === "knockout");

  // 按 roundLabel 分類
  const byRound: Record<string, Match[]> = {
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

  let assignedCount = 0;

  // 決賽和準決賽：使用主場地（Court 01）
  ["FI", "3RD", "SF"].forEach((roundLabel) => {
    byRound[roundLabel]?.forEach((match) => {
      match.courtId = courts[0]?.id;
      match.status = "SCHEDULED";
      assignedCount++;
    });
  });

  // 八強和之前：輪流分配
  ["QF", "R16", "R32"].forEach((roundLabel) => {
    byRound[roundLabel]?.forEach((match, index) => {
      const court = courts[index % courts.length];
      match.courtId = court.id;
      match.status = "SCHEDULED";
      assignedCount++;
    });
  });

  console.log(`淘汰賽場地分配完成：${assignedCount} 場比賽`);
}

/**
 * 批次寫入 Matches 到 Firestore
 * 移除所有 undefined 值以符合 Firestore 要求
 * 返回臨時 ID 到真實 ID 的映射
 */
async function batchWriteMatches(
  matches: Match[]
): Promise<Map<string, string>> {
  const batch = writeBatch(db);
  const idMap = new Map<string, string>(); // tempId -> realId
  const matchRefs: { ref: any; tempId: string; match: Match }[] = [];

  // 第一步：為所有比賽創建 ref 並建立 ID 映射
  matches.forEach((match) => {
    const matchRef = doc(collection(db, "matches"));
    const tempId = match.id;
    const realId = matchRef.id;

    idMap.set(tempId, realId);
    matchRefs.push({ ref: matchRef, tempId, match });
  });

  // 第二步：使用真實 ID 更新所有引用並寫入
  matchRefs.forEach(({ ref, match }) => {
    const { id, ...matchData } = match;

    // 移除 undefined 值
    const cleanData: any = Object.fromEntries(
      Object.entries(matchData).filter(([_, value]) => value !== undefined)
    );

    // 更新 nextMatchId 和 loserNextMatchId 為真實 ID
    if (cleanData.nextMatchId) {
      cleanData.nextMatchId =
        idMap.get(cleanData.nextMatchId) || cleanData.nextMatchId;
    }
    if (cleanData.loserNextMatchId) {
      cleanData.loserNextMatchId =
        idMap.get(cleanData.loserNextMatchId) || cleanData.loserNextMatchId;
    }

    batch.set(ref, {
      ...cleanData,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`Batch wrote ${matches.length} matches to Firestore`);

  return idMap;
}

/**
 * 自動處理 BYE 場次（標記為 COMPLETED，勝者自動晉級）
 */
async function autoProgressByeMatches(
  matches: Match[],
  idMap: Map<string, string>
): Promise<void> {
  const byeMatches = matches.filter(
    (m) => m.player1Id === null || m.player2Id === null
  );

  console.log(`Found ${byeMatches.length} BYE matches to auto-progress`);

  for (const match of byeMatches) {
    try {
      // 判定誰輪空晉級
      const winnerId = match.player1Id || match.player2Id;
      const winnerName = match.player1Name || match.player2Name;

      if (!winnerId) {
        console.warn(`Match ${match.id} has no players (both BYE)`);
        continue;
      }

      console.log(`Processing BYE match ${match.id}, winner: ${winnerId} (${winnerName})`);

      // 使用真實 Firestore ID
      const realMatchId = idMap.get(match.id);
      if (!realMatchId) {
        console.error(`Real ID not found for ${match.id}`);
        continue;
      }

      // 更新當前比賽為已完成
      const matchRef = doc(db, "matches", realMatchId);
      await updateDoc(matchRef, {
        winnerId,
        status: "COMPLETED",
        finishedAt: serverTimestamp(),
      });
      console.log(`BYE match ${realMatchId} marked as COMPLETED`);

      // 自動填入下一場
      if (match.nextMatchId) {
        const realNextMatchId = idMap.get(match.nextMatchId);
        if (!realNextMatchId) {
          console.error(
            `Real next match ID not found for ${match.nextMatchId}`
          );
          continue;
        }

        const nextMatchRef = doc(db, "matches", realNextMatchId);
        const updateField =
          match.nextMatchSlot === "player1" ? "player1Id" : "player2Id";
        const updateNameField =
          match.nextMatchSlot === "player1" ? "player1Name" : "player2Name";

        const updateData: any = {
          [updateField]: winnerId,
        };

        // 只有在有名稱時才更新
        if (winnerName) {
          updateData[updateNameField] = winnerName;
        }

        await updateDoc(nextMatchRef, updateData);

        console.log(
          `Player ${winnerId} (${winnerName}) auto-advanced from BYE to match ${realNextMatchId}`
        );
      }
    } catch (error) {
      console.error(`Failed to process BYE match ${match.id}:`, error);
    }
  }
  
  console.log(`Completed processing ${byeMatches.length} BYE matches`);
}

/**
 * 單淘汰賽制生成器
 * 支援：
 * - 任意人數（自動補位到 2 的次方數）
 * - BYE 輪空機制
 * - 季軍賽（可選）
 */
export const generateSingleElimination = async (
  tournamentId: string,
  players: Array<{ id: string; uid?: string; name: string }>,
  enableThirdPlace: boolean,
  courts: { id: string; name: string }[]
): Promise<void> => {
  const n = players.length;

  if (n < 2) {
    throw new Error("至少需要 2 位選手才能產生單淘汰賽程");
  }

  // 1. 計算最接近的 2 的次方數
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const byeCount = bracketSize - n;

  console.log(`Players: ${n}, Bracket: ${bracketSize}, Byes: ${byeCount}`);

  // 2. 建立選手陣列（真實選手 + BYE 佔位符）
  type PlayerSlot = { id: string; name: string } | "BYE";
  const slots: PlayerSlot[] = [
    ...players.map((p) => ({ id: p.uid || p.id, name: p.name })),
    ...Array(byeCount).fill("BYE"),
  ];

  // 3. 洗牌（Fisher-Yates）
  const shuffledSlots = shuffleArray(slots);

  // 4. 建立完整對戰樹
  const allMatches = buildBracketTree(
    tournamentId,
    shuffledSlots,
    bracketSize,
    enableThirdPlace
  );

  // 5. 分配所有輪次的場地（不只第一輪）
  assignCourtsToMatches(allMatches, courts);

  // 6. Batch Write 到 Firestore（返回 ID 映射）
  const idMap = await batchWriteMatches(allMatches);

  // 7. 自動處理 BYE 場次（標記為 COMPLETED，勝者自動晉級）
  await autoProgressByeMatches(allMatches, idMap);

  console.log(`Single elimination bracket generated successfully`);
};

/**
 * 統一的賽制生成入口（Factory Pattern）
 * @deprecated 使用新的 Category-based 生成器
 */
export const generateBracket = async (
  tournamentId: string,
  players: Array<{ id: string; uid?: string; name: string }>,
  courts: { id: string; name: string }[],
  format: "SINGLE_ELIM" | "DOUBLE_ELIM" | "ROUND_ROBIN",
  config: {
    enableThirdPlaceMatch: boolean;
    pointsPerSet: number;
    groupSize?: number;
  }
): Promise<void> => {
  switch (format) {
    case "SINGLE_ELIM":
      await generateSingleElimination(
        tournamentId,
        players,
        config.enableThirdPlaceMatch,
        courts
      );
      break;

    case "DOUBLE_ELIM":
      throw new Error("雙敗淘汰賽制尚未實現，請選擇單淘汰或循環賽");

    case "ROUND_ROBIN":
      throw new Error("循環賽尚未重構為新架構，請選擇單淘汰賽");

    default:
      throw new Error(`Unknown format: ${format}`);
  }
};

// ==================== 新的三層架構賽制生成器 ====================

/**
 * 生成小組循環賽
 * @param tournamentId 賽事 ID
 * @param categoryId 分類 ID
 * @param teams 參賽隊伍/選手
 * @param groupConfig 分組配置
 * @returns Match 陣列
 */
export const generateGroupStage = async (
  tournamentId: string,
  categoryId: string,
  teams: Array<{ id: string; name: string }>,
  groupConfig: {
    totalGroups: number;
    teamsPerGroup: number[];
  }
): Promise<Match[]> => {
  const matches: Match[] = [];
  let matchIdCounter = 1;
  const groupLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // 洗牌
  const shuffledTeams = shuffleArray(teams);

  // 分配到各組
  let teamIndex = 0;
  for (let groupIndex = 0; groupIndex < groupConfig.totalGroups; groupIndex++) {
    const groupLabel = groupLabels[groupIndex];
    const teamCount = groupConfig.teamsPerGroup[groupIndex];
    const groupTeams = shuffledTeams.slice(teamIndex, teamIndex + teamCount);
    teamIndex += teamCount;

    // 生成組內循環賽（Round Robin）
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        const match = createMatchNode({
          id: `match-${matchIdCounter++}`,
          tournamentId,
          categoryId,
          stage: "group",
          groupLabel,
          round: 1,
          matchOrder: matches.length + 1,
          player1Id: groupTeams[i].id,
          player2Id: groupTeams[j].id,
          player1Name: groupTeams[i].name,
          player2Name: groupTeams[j].name,
          status: "PENDING_COURT",
        });
        matches.push(match);
      }
    }
  }

  return matches;
};

/**
 * 生成淘汰賽樹狀圖（帶 TBC 佔位符）
 * @param tournamentId 賽事 ID
 * @param categoryId 分類 ID
 * @param knockoutSize 淘汰賽規模（8, 16, 32...）
 * @param enableThirdPlace 是否啟用季軍賽
 * @param seedingRules 種子位規則（例如：A1 vs B2）
 * @returns Match 陣列
 */
export const generateKnockoutStage = (
  tournamentId: string,
  categoryId: string,
  knockoutSize: number,
  enableThirdPlace: boolean,
  seedingRules?: Array<{ slot1: string; slot2: string }> // 例如：[{slot1: "A1", slot2: "B2"}]
): Match[] => {
  const matches: Match[] = [];
  let matchIdCounter = 1;

  const totalRounds = Math.log2(knockoutSize);

  // Round 1: 初始配對（全部 TBC）
  for (let i = 0; i < knockoutSize / 2; i++) {
    const roundLabel = getRoundLabel(totalRounds, 1, knockoutSize);

    const match = createMatchNode({
      id: `match-${matchIdCounter++}`,
      tournamentId,
      categoryId,
      stage: "knockout",
      roundLabel,
      round: 1,
      matchOrder: i + 1,
      player1Id: null, // TBC
      player2Id: null, // TBC
      player1Name: seedingRules?.[i]?.slot1 || `位置 ${i * 2 + 1}`,
      player2Name: seedingRules?.[i]?.slot2 || `位置 ${i * 2 + 2}`,
      status: "PENDING_PLAYER",
    });
    matches.push(match);
  }

  // Round 2 ~ Final: 建立空白晉級場次
  let previousRoundMatches = matches.slice();

  for (let round = 2; round <= totalRounds; round++) {
    const roundMatches: Match[] = [];
    const roundLabel = getRoundLabel(totalRounds, round, knockoutSize);

    for (let i = 0; i < previousRoundMatches.length; i += 2) {
      const match = createMatchNode({
        id: `match-${matchIdCounter++}`,
        tournamentId,
        categoryId,
        stage: "knockout",
        roundLabel,
        round,
        matchOrder: i / 2 + 1,
        player1Id: null,
        player2Id: null,
        status: "PENDING_PLAYER",
      });

      // 設定前一輪的 nextMatchId（檢查邊界）
      if (previousRoundMatches[i]) {
        previousRoundMatches[i].nextMatchId = match.id;
        previousRoundMatches[i].nextMatchSlot = "player1";
      }
      if (previousRoundMatches[i + 1]) {
        previousRoundMatches[i + 1].nextMatchId = match.id;
        previousRoundMatches[i + 1].nextMatchSlot = "player2";
      }

      roundMatches.push(match);
    }

    matches.push(...roundMatches);
    previousRoundMatches = roundMatches;
  }

  // 季軍賽 (可選)
  if (enableThirdPlace && totalRounds >= 2) {
    const semiFinals = matches.filter((m) => m.round === totalRounds - 1);
    const thirdPlaceMatch = createMatchNode({
      id: `match-${matchIdCounter++}`,
      tournamentId,
      categoryId,
      stage: "knockout",
      roundLabel: "3RD",
      round: totalRounds,
      matchOrder: 999, // 特殊標記
      player1Id: null,
      player2Id: null,
      status: "PENDING_PLAYER",
    });

    // 準決賽的敗者進入季軍賽（檢查是否存在）
    if (semiFinals.length >= 2) {
      if (semiFinals[0]) {
        semiFinals[0].loserNextMatchId = thirdPlaceMatch.id;
        semiFinals[0].loserNextMatchSlot = "player1";
      }
      if (semiFinals[1]) {
        semiFinals[1].loserNextMatchId = thirdPlaceMatch.id;
        semiFinals[1].loserNextMatchSlot = "player2";
      }
    }

    matches.push(thirdPlaceMatch);
  }

  return matches;
};

/**
 * 生成混合賽制（小組賽 + 淘汰賽）
 */
export const generateGroupThenKnockout = async (
  tournamentId: string,
  categoryId: string,
  teams: Array<{ id: string; name: string }>,
  groupConfig: {
    totalGroups: number;
    teamsPerGroup: number[];
    advancePerGroup: number;
    bestThirdPlaces?: number;
  },
  knockoutSize: number,
  enableThirdPlace: boolean,
  courts: { id: string; name: string }[]
): Promise<void> => {
  // 1. 生成小組賽
  const groupMatches = await generateGroupStage(
    tournamentId,
    categoryId,
    teams,
    groupConfig
  );

  // 2. 生成淘汰賽（帶種子位規則）
  const seedingRules = generateSeedingRules(
    groupConfig.totalGroups,
    groupConfig.advancePerGroup
  );
  const knockoutMatches = generateKnockoutStage(
    tournamentId,
    categoryId,
    knockoutSize,
    enableThirdPlace,
    seedingRules
  );

  // 3. 分配場地給所有比賽（小組賽 + 淘汰賽）
  const allMatches = [...groupMatches, ...knockoutMatches];
  assignCourtsToMatches(allMatches, courts);

  // 4. 批次寫入
  await batchWriteMatches(allMatches);

  console.log(
    `Generated ${groupMatches.length} group matches + ${knockoutMatches.length} knockout matches`
  );
};

/**
 * 純淘汰賽生成（Category 版本）
 */
export const generateKnockoutOnly = async (
  tournamentId: string,
  categoryId: string,
  teams: Array<{ id: string; name: string }>,
  enableThirdPlace: boolean,
  courts: { id: string; name: string }[]
): Promise<void> => {
  const n = teams.length;

  if (n < 2) {
    throw new Error("至少需要 2 位選手才能產生淘汰賽程");
  }

  // 計算最接近的 2 的次方數
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const byeCount = bracketSize - n;

  console.log(`Players: ${n}, Bracket: ${bracketSize}, Byes: ${byeCount}`);

  // 洗牌真實選手（保證公平性）
  const shuffledTeams = shuffleArray(teams);

  // 優化的 BYE 分配策略：優先配對真實選手，最大化第一輪比賽數
  type PlayerSlot = { id: string; name: string } | "BYE";
  const slots: PlayerSlot[] = [];

  // 1. 先配對真實選手（兩兩一組）
  const realMatchCount = Math.floor(n / 2);
  for (let i = 0; i < realMatchCount * 2; i++) {
    slots.push(shuffledTeams[i]);
  }

  // 2. 如果有奇數個選手，最後一個配 BYE
  if (n % 2 === 1) {
    slots.push(shuffledTeams[n - 1]);
    slots.push("BYE");
  }

  // 3. 剩下的位置全是 BYE（這些會自動晉級或跳過）
  const remainingByes = byeCount - (n % 2 === 1 ? 1 : 0);
  for (let i = 0; i < remainingByes; i++) {
    slots.push("BYE");
  }

  console.log(`優化配對：${realMatchCount} 場真實比賽 + ${n % 2} 場輪空`);

  // 建立完整對戰樹
  const matches: Match[] = [];
  let matchIdCounter = 1;
  const totalRounds = Math.log2(bracketSize);

  // Round 1: 初始配對（使用優化後的 slots，不再洗牌）
  for (let i = 0; i < slots.length; i += 2) {
    const player1 = slots[i];
    const player2 = slots[i + 1];
    const hasBye = player1 === "BYE" || player2 === "BYE";
    const bothBye = player1 === "BYE" && player2 === "BYE";
    
    // 跳過 BYE vs BYE 的比賽（不需要創建）
    if (bothBye) {
      console.log(`Skipping BYE vs BYE match at position ${i / 2 + 1}`);
      continue;
    }
    
    const roundLabel = getRoundLabel(totalRounds, 1, bracketSize);

    const match = createMatchNode({
      id: `match-${matchIdCounter++}`,
      tournamentId,
      categoryId,
      stage: "knockout",
      roundLabel,
      round: 1,
      matchOrder: i / 2 + 1,
      player1Id: player1 === "BYE" ? null : player1.id,
      player2Id: player2 === "BYE" ? null : player2.id,
      player1Name: player1 === "BYE" ? undefined : player1.name,
      player2Name: player2 === "BYE" ? undefined : player2.name,
      status: hasBye ? "PENDING_PLAYER" : "PENDING_COURT",
    });
    matches.push(match);
  }

  // Round 2 ~ Final: 建立空白晉級場次
  let previousRoundMatches = matches.slice();

  for (let round = 2; round <= totalRounds; round++) {
    const roundMatches: Match[] = [];
    const roundLabel = getRoundLabel(totalRounds, round, bracketSize);

    for (let i = 0; i < previousRoundMatches.length; i += 2) {
      const match = createMatchNode({
        id: `match-${matchIdCounter++}`,
        tournamentId,
        categoryId,
        stage: "knockout",
        roundLabel,
        round,
        matchOrder: i / 2 + 1,
        player1Id: null,
        player2Id: null,
        status: "PENDING_PLAYER",
      });

      // 設定前一輪的 nextMatchId（檢查邊界）
      if (previousRoundMatches[i]) {
        previousRoundMatches[i].nextMatchId = match.id;
        previousRoundMatches[i].nextMatchSlot = "player1";
      }
      if (previousRoundMatches[i + 1]) {
        previousRoundMatches[i + 1].nextMatchId = match.id;
        previousRoundMatches[i + 1].nextMatchSlot = "player2";
      }

      roundMatches.push(match);
    }

    matches.push(...roundMatches);
    previousRoundMatches = roundMatches;
  }

  // 季軍賽
  if (enableThirdPlace && totalRounds >= 2) {
    const semiFinals = matches.filter((m) => m.round === totalRounds - 1);
    const thirdPlaceMatch = createMatchNode({
      id: `match-${matchIdCounter++}`,
      tournamentId,
      categoryId,
      stage: "knockout",
      roundLabel: "3RD",
      round: totalRounds,
      matchOrder: 999,
      player1Id: null,
      player2Id: null,
      status: "PENDING_PLAYER",
    });

    if (semiFinals.length >= 2) {
      if (semiFinals[0]) {
        semiFinals[0].loserNextMatchId = thirdPlaceMatch.id;
        semiFinals[0].loserNextMatchSlot = "player1";
      }
      if (semiFinals[1]) {
        semiFinals[1].loserNextMatchId = thirdPlaceMatch.id;
        semiFinals[1].loserNextMatchSlot = "player2";
      }
    }

    matches.push(thirdPlaceMatch);
  }

  // 分配所有輪次的場地
  assignCourtsToMatches(matches, courts);

  // Batch Write
  const idMap = await batchWriteMatches(matches);

  // 自動處理 BYE
  await autoProgressByeMatches(matches, idMap);

  console.log(`Knockout bracket generated successfully`);
};

/**
 * 生成種子位規則（交叉賽制）
 * 例如：4 組取前 2 名 -> A1 vs B2, C1 vs D2, B1 vs A2, D1 vs C2
 */
function generateSeedingRules(
  totalGroups: number,
  advancePerGroup: number
): Array<{ slot1: string; slot2: string }> {
  const groupLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").slice(0, totalGroups);
  const rules: Array<{ slot1: string; slot2: string }> = [];

  // 簡化版交叉賽制：A1 vs B2, C1 vs D2...
  for (let rank = 1; rank <= advancePerGroup; rank++) {
    for (let i = 0; i < groupLabels.length; i += 2) {
      if (i + 1 < groupLabels.length) {
        if (rank % 2 === 1) {
          // 奇數排名：A1 vs B2
          rules.push({
            slot1: `${groupLabels[i]}${rank}`,
            slot2: `${groupLabels[i + 1]}${advancePerGroup - rank + 1}`,
          });
        } else {
          // 偶數排名：B1 vs A2
          rules.push({
            slot1: `${groupLabels[i + 1]}${rank}`,
            slot2: `${groupLabels[i]}${advancePerGroup - rank + 1}`,
          });
        }
      }
    }
  }

  return rules;
}

/**
 * 獲取輪次標籤（QF, SF, FI）
 */
function getRoundLabel(
  totalRounds: number,
  currentRound: number,
  bracketSize: number
): string {
  const remainingRounds = totalRounds - currentRound + 1;

  if (currentRound === totalRounds) return "FI"; // Final
  if (currentRound === totalRounds - 1) return "SF"; // Semi-Final
  if (currentRound === totalRounds - 2) return "QF"; // Quarter-Final
  if (currentRound === totalRounds - 3) return "R16"; // Round of 16
  if (currentRound === totalRounds - 4) return "R32"; // Round of 32

  return `R${Math.pow(2, remainingRounds)}`;
}
