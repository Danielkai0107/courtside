/**
 * 智能分組推薦算法
 * 根據參賽者數量，自動推薦最佳的小組賽+淘汰賽分組方案
 */

export interface GroupConfig {
  totalGroups: number;
  teamsPerGroup: number[]; // 每組的隊伍數量
  advancePerGroup: number; // 每組晉級人數
  bestThirdPlaces: number; // 最佳第N名晉級數
  knockoutSize: number; // 淘汰賽規模（8, 16, 32...）
  description: string;
  isRecommended?: boolean; // 是否為推薦方案
}

/**
 * 計算最接近的 2 的次方數（向上取整）
 */
function nextPowerOfTwo(n: number): number {
  if (n <= 2) return 2;
  if (n <= 4) return 4;
  if (n <= 8) return 8;
  if (n <= 16) return 16;
  if (n <= 32) return 32;
  if (n <= 64) return 64;
  return 128;
}

/**
 * 計算最接近的 2 的次方數（向下取整）
 */
function prevPowerOfTwo(n: number): number {
  if (n < 2) return 2;
  if (n < 4) return 2;
  if (n < 8) return 4;
  if (n < 16) return 8;
  if (n < 32) return 16;
  if (n < 64) return 32;
  return 64;
}

/**
 * 將總數分配到各組（盡量平均）
 */
function distributeTeams(totalTeams: number, groups: number): number[] {
  const baseSize = Math.floor(totalTeams / groups);
  const remainder = totalTeams % groups;

  const distribution: number[] = [];
  for (let i = 0; i < groups; i++) {
    // 前 remainder 組多分配一個
    distribution.push(baseSize + (i < remainder ? 1 : 0));
  }

  return distribution;
}

/**
 * 生成單一分組方案
 */
function generateConfig(
  participantCount: number,
  totalGroups: number,
  knockoutSize: number
): GroupConfig | null {
  const teamsPerGroup = distributeTeams(participantCount, totalGroups);

  // 檢查每組人數是否合理（3-8人為佳）
  const minTeamSize = Math.min(...teamsPerGroup);
  const maxTeamSize = Math.max(...teamsPerGroup);

  if (minTeamSize < 3 || maxTeamSize > 8) {
    return null; // 不合理的分組
  }

  // 計算晉級規則
  const totalAdvanced = knockoutSize;
  const advancePerGroup = Math.floor(totalAdvanced / totalGroups);
  const bestThirdPlaces = totalAdvanced - advancePerGroup * totalGroups;

  // 檢查晉級規則是否合理
  if (advancePerGroup === 0 || advancePerGroup > minTeamSize - 1) {
    return null; // 不合理的晉級規則
  }

  // 生成描述
  let description = `${totalGroups} 組循環賽（`;
  const uniqueSizes = Array.from(new Set(teamsPerGroup)).sort((a, b) => a - b);
  if (uniqueSizes.length === 1) {
    description += `每組 ${uniqueSizes[0]} 隊`;
  } else {
    description += teamsPerGroup.join(",") + " 隊";
  }
  description += `），各取前 ${advancePerGroup} 名`;

  if (bestThirdPlaces > 0) {
    const rankLabel =
      advancePerGroup === 1 ? "第 2 名" : `第 ${advancePerGroup + 1} 名`;
    description += ` + ${bestThirdPlaces} 個最佳${rankLabel}`;
  }

  description += ` 晉級 ${knockoutSize} 強`;

  return {
    totalGroups,
    teamsPerGroup,
    advancePerGroup,
    bestThirdPlaces,
    knockoutSize,
    description,
  };
}

/**
 * 核心函數：根據參賽者數量推薦分組方案
 * @param participantCount 參賽者數量
 * @returns 2-3 個推薦方案，按推薦度排序
 */
export function suggestGroupConfigs(
  participantCount: number
): GroupConfig[] {
  if (participantCount < 4) {
    // 人數太少，不適合小組賽
    return [];
  }

  const configs: GroupConfig[] = [];

  // 1. 計算目標淘汰賽規模
  const targetKnockout = nextPowerOfTwo(participantCount / 2); // 目標約一半人晉級
  const minKnockout = prevPowerOfTwo(participantCount / 3); // 最少約1/3人晉級
  const maxKnockout = Math.min(
    nextPowerOfTwo(participantCount * 0.7),
    participantCount
  ); // 最多約70%晉級

  const knockoutSizes = Array.from(
    new Set([minKnockout, targetKnockout, maxKnockout])
  ).filter((size) => size < participantCount);

  // 2. 對每個淘汰賽規模，嘗試不同的分組數
  for (const knockoutSize of knockoutSizes) {
    // 嘗試 3-6 組
    for (let groups = 3; groups <= 6; groups++) {
      const config = generateConfig(participantCount, groups, knockoutSize);
      if (config) {
        configs.push(config);
      }
    }
  }

  // 3. 過濾並排序方案
  const validConfigs = configs
    .filter((config) => {
      // 過濾掉不合理的方案
      const avgTeamSize =
        config.teamsPerGroup.reduce((a, b) => a + b, 0) /
        config.teamsPerGroup.length;
      return avgTeamSize >= 4 && avgTeamSize <= 6; // 優先每組 4-6 隊
    })
    .sort((a, b) => {
      // 排序規則：
      // 1. 優先淘汰賽規模接近目標
      const aKnockoutScore = Math.abs(a.knockoutSize - targetKnockout);
      const bKnockoutScore = Math.abs(b.knockoutSize - targetKnockout);
      if (aKnockoutScore !== bKnockoutScore) {
        return aKnockoutScore - bKnockoutScore;
      }

      // 2. 優先整數晉級（不需要最佳第N名）
      if (a.bestThirdPlaces !== b.bestThirdPlaces) {
        return a.bestThirdPlaces - b.bestThirdPlaces;
      }

      // 3. 優先分組數適中（4組最佳）
      const aGroupScore = Math.abs(a.totalGroups - 4);
      const bGroupScore = Math.abs(b.totalGroups - 4);
      return aGroupScore - bGroupScore;
    });

  // 4. 取前 3 個方案
  const topConfigs = validConfigs.slice(0, 3);

  // 標記推薦方案
  if (topConfigs.length > 0) {
    topConfigs[0].isRecommended = true;
  }

  return topConfigs;
}

/**
 * 純淘汰賽推薦（不需要小組賽）
 * @param participantCount 參賽者數量
 * @returns 淘汰賽規模
 */
export function suggestKnockoutOnly(participantCount: number): number {
  return nextPowerOfTwo(participantCount);
}

/**
 * 驗證自訂分組配置是否合理
 */
export function validateGroupConfig(
  participantCount: number,
  totalGroups: number,
  advancePerGroup: number,
  bestThirdPlaces: number = 0
): { valid: boolean; error?: string; knockoutSize?: number } {
  if (totalGroups < 2) {
    return { valid: false, error: "至少需要 2 組" };
  }

  if (totalGroups > participantCount / 2) {
    return { valid: false, error: "分組數過多" };
  }

  const teamsPerGroup = distributeTeams(participantCount, totalGroups);
  const minTeamSize = Math.min(...teamsPerGroup);

  if (minTeamSize < 3) {
    return { valid: false, error: "每組至少需要 3 支隊伍" };
  }

  if (advancePerGroup >= minTeamSize) {
    return { valid: false, error: "晉級人數不能大於等於最小組人數" };
  }

  const knockoutSize = advancePerGroup * totalGroups + bestThirdPlaces;

  // 檢查淘汰賽規模是否為 2 的次方
  if (!isPowerOfTwo(knockoutSize)) {
    return {
      valid: false,
      error: `晉級總數 (${knockoutSize}) 必須為 2 的次方 (4, 8, 16, 32...)`,
    };
  }

  return { valid: true, knockoutSize };
}

/**
 * 判斷是否為 2 的次方
 */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * 計算小組循環賽的比賽場次
 */
export function calculateGroupMatches(teamsInGroup: number): number {
  // 組合數：C(n, 2) = n * (n - 1) / 2
  return (teamsInGroup * (teamsInGroup - 1)) / 2;
}

/**
 * 計算總比賽場次（小組賽 + 淘汰賽）
 */
export function calculateTotalMatches(config: GroupConfig): {
  groupStageMatches: number;
  knockoutMatches: number;
  total: number;
} {
  // 小組賽場次
  const groupStageMatches = config.teamsPerGroup.reduce(
    (sum, teamCount) => sum + calculateGroupMatches(teamCount),
    0
  );

  // 淘汰賽場次（包含季軍賽）
  const knockoutMatches = config.knockoutSize - 1;

  return {
    groupStageMatches,
    knockoutMatches,
    total: groupStageMatches + knockoutMatches,
  };
}

