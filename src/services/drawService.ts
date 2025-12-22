import { Timestamp } from "firebase/firestore";
import { createMatch } from "./matchService";
import type { Player, Tournament, Staff } from "../types";

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
 * 循環賽抽籤（Round-Robin）
 * 每個選手與其他所有選手各比賽一次
 */
export const drawRoundRobin = async (
  tournamentId: string,
  players: Player[],
  scorers: Staff[] = []
): Promise<void> => {
  if (players.length < 2) {
    throw new Error("Need at least 2 players for round-robin");
  }

  // 隨機排序選手
  const shuffledPlayers = shuffleArray(players);

  // 生成所有配對
  const matches: Array<{ playerA: Player; playerB: Player }> = [];

  for (let i = 0; i < shuffledPlayers.length; i++) {
    for (let j = i + 1; j < shuffledPlayers.length; j++) {
      matches.push({
        playerA: shuffledPlayers[i],
        playerB: shuffledPlayers[j],
      });
    }
  }

  // 隨機排序場次順序
  const shuffledMatches = shuffleArray(matches);

  // 建立所有場次並分配紀錄員
  for (let i = 0; i < shuffledMatches.length; i++) {
    const match = shuffledMatches[i];
    const scorer = scorers.length > 0 ? scorers[i % scorers.length] : null;

    await createMatch({
      tournamentId,
      playerA_Id: match.playerA.uid || match.playerA.id, // 優先使用 uid，沒有則用 document ID
      playerB_Id: match.playerB.uid || match.playerB.id,
      playerA_Name: match.playerA.name,
      playerB_Name: match.playerB.name,
      scorerId: scorer?.uid || scorer?.id, // 分配紀錄員
    });
  }

  console.log(`Created ${shuffledMatches.length} round-robin matches`);
};

/**
 * 單淘汰賽抽籤（Single Elimination / Knockout）
 * 自動產生對戰樹
 */
export const drawKnockout = async (
  tournamentId: string,
  players: Player[],
  scorers: Staff[] = []
): Promise<void> => {
  if (players.length < 2) {
    throw new Error("Need at least 2 players for knockout");
  }

  // 隨機排序選手
  const shuffledPlayers = shuffleArray(players);

  // 計算需要的場次數（第一輪）
  // 如果選手數不是 2 的次方，部分選手會輪空
  const firstRoundMatches = Math.floor(shuffledPlayers.length / 2);

  // 建立第一輪場次並分配紀錄員
  for (let i = 0; i < firstRoundMatches; i++) {
    const playerA = shuffledPlayers[i * 2];
    const playerB = shuffledPlayers[i * 2 + 1];
    const scorer = scorers.length > 0 ? scorers[i % scorers.length] : null;

    await createMatch({
      tournamentId,
      playerA_Id: playerA.uid || playerA.id, // 優先使用 uid，沒有則用 document ID
      playerB_Id: playerB.uid || playerB.id,
      playerA_Name: playerA.name,
      playerB_Name: playerB.name,
      scorerId: scorer?.uid || scorer?.id, // 分配紀錄員
    });
  }

  console.log(`Created ${firstRoundMatches} knockout matches (first round)`);

  // 注意：後續輪次的場次需要在前一輪結束後動態建立
  // 這裡只建立第一輪
};

/**
 * 自動抽籤（根據賽制）
 */
export const autoDraw = async (
  tournament: Tournament,
  players: Player[],
  scorers: Staff[] = []
): Promise<void> => {
  const confirmedPlayers = players.filter((p) => p.status === "confirmed");
  const acceptedScorers = scorers.filter((s) => s.status === "accepted");

  if (confirmedPlayers.length < 2) {
    throw new Error("Need at least 2 confirmed players to draw");
  }

  // 隨機排序紀錄員
  const shuffledScorers =
    acceptedScorers.length > 0 ? shuffleArray(acceptedScorers) : [];

  switch (tournament.rules.format) {
    case "round-robin":
      await drawRoundRobin(tournament.id, confirmedPlayers, shuffledScorers);
      break;
    case "knockout":
      await drawKnockout(tournament.id, confirmedPlayers, shuffledScorers);
      break;
    default:
      throw new Error("Unknown tournament format");
  }
};

/**
 * 生成下一輪淘汰賽場次（用於淘汰賽晉級）
 */
export const generateNextRound = async (
  tournamentId: string,
  winners: Player[]
): Promise<void> => {
  if (winners.length < 2) {
    console.log("Tournament finished - we have a champion!");
    return;
  }

  const nextRoundMatches = Math.floor(winners.length / 2);

  for (let i = 0; i < nextRoundMatches; i++) {
    const playerA = winners[i * 2];
    const playerB = winners[i * 2 + 1];

    await createMatch({
      tournamentId,
      playerA_Id: playerA.uid || playerA.id, // 優先使用 uid，沒有則用 document ID
      playerB_Id: playerB.uid || playerB.id,
      playerA_Name: playerA.name,
      playerB_Name: playerB.name,
    });
  }

  console.log(`Created ${nextRoundMatches} matches for next round`);
};
