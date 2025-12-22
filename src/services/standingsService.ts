/**
 * 小組積分榜計算服務
 */

import type { Match, GroupStanding } from "../types";

/**
 * 計算小組積分榜
 * @param matches 小組內的所有比賽
 * @param participants 參賽者列表
 * @returns 排序後的積分榜
 */
export function calculateGroupStandings(
  matches: Match[],
  participants: Array<{ id: string; name: string }>
): GroupStanding[] {
  // 初始化每個參賽者的統計
  const standings: Record<string, GroupStanding> = {};

  participants.forEach((p) => {
    standings[p.id] = {
      teamId: p.id,
      teamName: p.name,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifference: 0,
    };
  });

  // 計算每場比賽的結果
  matches.forEach((match) => {
    if (match.status !== "COMPLETED" || !match.winnerId) {
      return; // 跳過未完成的比賽
    }

    const player1Id = match.player1Id;
    const player2Id = match.player2Id;
    const score1 = match.score.player1;
    const score2 = match.score.player2;

    if (!player1Id || !player2Id) return;

    // 更新得失分
    if (standings[player1Id]) {
      standings[player1Id].pointsFor += score1;
      standings[player1Id].pointsAgainst += score2;
    }

    if (standings[player2Id]) {
      standings[player2Id].pointsFor += score2;
      standings[player2Id].pointsAgainst += score1;
    }

    // 判定勝負並更新積分
    if (score1 > score2) {
      // player1 勝
      if (standings[player1Id]) {
        standings[player1Id].wins += 1;
        standings[player1Id].points += 3; // 勝得 3 分
      }
      if (standings[player2Id]) {
        standings[player2Id].losses += 1;
        standings[player2Id].points += 0; // 負得 0 分
      }
    } else if (score2 > score1) {
      // player2 勝
      if (standings[player2Id]) {
        standings[player2Id].wins += 1;
        standings[player2Id].points += 3;
      }
      if (standings[player1Id]) {
        standings[player1Id].losses += 1;
        standings[player1Id].points += 0;
      }
    } else {
      // 平手
      if (standings[player1Id]) {
        standings[player1Id].draws += 1;
        standings[player1Id].points += 1; // 平得 1 分
      }
      if (standings[player2Id]) {
        standings[player2Id].draws += 1;
        standings[player2Id].points += 1;
      }
    }
  });

  // 計算淨勝分
  Object.values(standings).forEach((standing) => {
    standing.pointDifference = standing.pointsFor - standing.pointsAgainst;
  });

  // 排序：積分 > 淨勝分 > 得分
  const sortedStandings = Object.values(standings).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points; // 積分高的在前
    if (a.pointDifference !== b.pointDifference)
      return b.pointDifference - a.pointDifference; // 淨勝分高的在前
    return b.pointsFor - a.pointsFor; // 得分高的在前
  });

  return sortedStandings;
}

/**
 * 格式化淨勝分顯示
 */
export function formatPointDifference(pd: number): string {
  if (pd > 0) return `+${pd}`;
  return pd.toString();
}

