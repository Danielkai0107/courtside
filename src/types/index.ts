/**
 * 通用運動引擎 - 主類型導出文件
 * 
 * 這個文件整合並導出所有類型定義：
 * - 通用配置類型（universal-config.ts）
 * - Firestore Schema 類型（schema.ts）
 * - 其他輔助類型
 */

import { Timestamp } from "firebase/firestore";

// ============================================
// 通用運動引擎核心類型
// ============================================

// 導出通用配置類型
export type {
  ScoringConfig,
  RulePreset,
  SportDefinition,
  StageType,
  FormatStage,
  FormatDefinition,
} from "./universal-config";

// 導出 Firestore Schema 類型
export type {
  TournamentDoc,
  CategoryDoc,
  MatchDoc,
  MatchScoreSet,
  PlayerDoc,
  TeamDoc,
  CourtDoc,
  StaffDoc,
  SportDoc,
  FormatDoc,
} from "./schema";

// ============================================
// 向後兼容的別名（便於逐步遷移）
// ============================================

// 主要文檔類型別名
export type { TournamentDoc as Tournament } from "./schema";
export type { CategoryDoc as Category } from "./schema";
export type { MatchDoc as Match } from "./schema";
export type { PlayerDoc as Player } from "./schema";
export type { TeamDoc as Team } from "./schema";
export type { CourtDoc as Court } from "./schema";
export type { StaffDoc as Staff } from "./schema";
export type { SportDoc as Sport } from "./schema";

// ============================================
// 用戶與權限類型（保持不變）
// ============================================

export type UserRole = "user" | "organizer" | "scorer";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  currentRole: UserRole; // UI preference
}

// ============================================
// 小組賽相關類型（保持不變）
// ============================================

export interface GroupStanding {
  teamId: string;
  teamName: string;
  points: number; // 積分（勝3分、平1分、負0分）
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number; // 得分
  pointsAgainst: number; // 失分
  pointDifference: number; // 淨勝分
}

// ============================================
// 通知系統類型（保持不變）
// ============================================

export type NotificationType =
  // 運動員通知
  | "REGISTRATION_APPROVED"
  | "REGISTRATION_REJECTED"
  | "SCHEDULE_PUBLISHED"
  | "MATCH_STARTING_SOON"
  | "MATCH_COMPLETED"
  | "TOURNAMENT_CANCELLED"
  // 主辦方通知
  | "NEW_REGISTRATION"
  | "STAFF_ACCEPTED"
  | "STAFF_DECLINED"
  | "MATCH_IN_PROGRESS"
  // 紀錄員通知
  | "STAFF_INVITATION"
  | "MATCH_ASSIGNED"
  | "MATCH_STARTING_STAFF";

export interface Notification {
  id: string;
  userId: string; // 接收者的 uid
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;

  // 關聯資料（用於快速操作）
  relatedData: {
    tournamentId?: string;
    matchId?: string;
    playerId?: string;
    staffId?: string;
  };

  // 快速操作按鈕配置
  actions?: Array<{
    label: string;
    type: "primary" | "secondary";
    path?: string; // 導航路徑
    action?: "accept" | "decline"; // 特殊操作（如接受/拒絕邀請）
  }>;

  createdAt: Timestamp;
}

// ============================================
// 輔助類型
// ============================================

/**
 * 比賽時間軸日誌（舊版計分系統，逐步淘汰）
 * @deprecated 使用新的 MatchScoreSet 結構
 */
export interface MatchTimelineLog {
  time: Timestamp;
  team: "A" | "B";
  action: "score" | "undo";
  val: number;
}
