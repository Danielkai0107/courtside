/**
 * 通用運動引擎 - Firestore Schema 定義
 * 
 * 這個文件定義實際存儲在 Firestore 中的文檔結構。
 * 核心理念：快照配置（Snapshot Configuration）
 * - 創建賽事時，完整拷貝規則和格式配置
 * - 確保賽事規則凍結，不受全局配置變更影響
 */

import { Timestamp } from "firebase/firestore";
import type { ScoringConfig, FormatDefinition } from "./universal-config";

/**
 * 賽事文檔 (tournaments 集合)
 */
export interface TournamentDoc {
  id: string;
  name: string;
  date: Timestamp;
  registrationDeadline: Timestamp;
  location: string;
  description?: string;
  bannerURL?: string;
  
  /**
   * 六階段狀態機
   */
  status:
    | "DRAFT"
    | "REGISTRATION_OPEN"
    | "REGISTRATION_CLOSED"
    | "ONGOING"
    | "COMPLETED"
    | "CANCELLED";
  
  /**
   * 主辦方資訊
   */
  organizerId: string;
  organizerName?: string;
  organizerPhotoURL?: string;
  
  /**
   * 運動ID（引用 sports 集合）
   */
  sportId: string;
  
  /**
   * 賽事統計（用於即時預覽）
   */
  stats?: {
    totalCategories: number;
    totalMatches: number;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 分組/項目文檔 (tournaments/{tournamentId}/categories 子集合)
 * 
 * 這是"規則持有者"，儲存了完整的配置快照
 */
export interface CategoryDoc {
  id: string;
  tournamentId: string;
  name: string; // 例如："男子單打"、"女子雙打"
  
  /**
   * === 引擎配置（快照） ===
   * 以下配置在創建時完整拷貝，與全局配置解耦
   */
  
  /**
   * 運動ID（例如："table_tennis"）
   */
  sportId: string;
  
  /**
   * 規則預設ID（例如："tt_bo5"）
   */
  rulePresetId: string;
  
  /**
   * 計分配置（完整拷貝）
   * 這是規則引擎的核心配置
   */
  scoringConfig: ScoringConfig;
  
  /**
   * === 賽制配置（快照） ===
   */
  
  /**
   * 選擇的賽制格式ID（例如："knockout_16"）
   */
  selectedFormatId: string;
  
  /**
   * 賽制格式配置（完整拷貝）
   * 這是格式引擎的核心配置
   */
  formatConfig: FormatDefinition;
  
  /**
   * === 狀態 ===
   */
  
  /**
   * 分組狀態
   */
  status: "REGISTRATION" | "PROCESSING" | "ONGOING" | "COMPLETED";
  
  /**
   * 當前參賽人數
   */
  currentParticipants: number;
  
  /**
   * 最大參賽人數（從 formatConfig.maxParticipants 派生）
   */
  maxParticipants: number;
  
  /**
   * 比賽類型（用於UI顯示）
   */
  matchType: "singles" | "doubles";
  
  /**
   * === 時間戳記 ===
   */
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 局分結構
 * 儲存單局的詳細分數
 */
export interface MatchScoreSet {
  /**
   * 局號（1, 2, 3...）
   */
  setNumber: number;
  
  /**
   * 選手1分數
   */
  p1Score: number;
  
  /**
   * 選手2分數
   */
  p2Score: number;
  
  /**
   * 該局勝者
   * - "p1" 或 "p2"：已決出勝負
   * - null：進行中或尚未開始
   */
  winner: "p1" | "p2" | null;
  
  /**
   * 該局是否已完成
   */
  isCompleted: boolean;
}

/**
 * 比賽文檔 (matches 集合)
 * 
 * 這是通用的比賽引擎，支持任何運動和規則
 */
export interface MatchDoc {
  id: string;
  categoryId: string;
  tournamentId: string;
  
  /**
   * === 結構資訊（Linked List） ===
   * 這些欄位來自格式模板，用於自動晉級
   */
  
  /**
   * 輪次（1 = 第一輪, 2 = 四分之一決賽, 等等）
   */
  round: number;
  
  /**
   * 場次順序（用於排序）
   */
  matchOrder: number;
  
  /**
   * 階段（小組賽或淘汰賽）
   */
  stage: "group" | "knockout";
  
  /**
   * 小組標籤（僅小組賽使用，例如："A", "B", "C"）
   */
  groupLabel?: string;
  
  /**
   * 輪次標籤（僅淘汰賽使用，例如："QF", "SF", "FI"）
   */
  roundLabel?: string;
  
  /**
   * 勝者下一場比賽ID（Linked List 指針）
   */
  nextMatchId: string | null;
  
  /**
   * 勝者在下一場的位置（"p1" 或 "p2"）
   */
  nextMatchSlot: "p1" | "p2" | null;
  
  /**
   * 敗者下一場比賽ID（雙敗淘汰或季軍賽使用）
   */
  loserNextMatchId?: string | null;
  
  /**
   * 敗者在下一場的位置
   */
  loserNextMatchSlot?: "p1" | "p2" | null;
  
  /**
   * === 參賽者資訊 ===
   */
  
  /**
   * 選手1 ID（null = 待定或輪空）
   */
  player1Id: string | null;
  
  /**
   * 選手2 ID
   */
  player2Id: string | null;
  
  /**
   * 選手1名稱（快取，用於顯示）
   */
  player1Name?: string;
  
  /**
   * 選手2名稱（快取，用於顯示）
   */
  player2Name?: string;
  
  /**
   * === 通用計分板 ===
   * UI 根據 scoringConfig.maxSets 渲染對應數量的局數框
   * 這個陣列儲存實際數據
   */
  
  /**
   * 局分陣列（動態長度，支持任意局數）
   */
  sets: MatchScoreSet[];
  
  /**
   * 選手1累計獲勝局數（或總分，取決於 matchType）
   */
  p1Aggregate: number;
  
  /**
   * 選手2累計獲勝局數（或總分，取決於 matchType）
   */
  p2Aggregate: number;
  
  /**
   * === 狀態機 ===
   */
  
  /**
   * 比賽狀態
   * - PENDING_PLAYER: 等待選手確定（如輪空或晉級）
   * - PENDING_COURT: 等待分配場地
   * - IN_PROGRESS: 比賽進行中
   * - COMPLETED: 比賽已完成
   */
  status: "PENDING_PLAYER" | "PENDING_COURT" | "IN_PROGRESS" | "COMPLETED";
  
  /**
   * 勝者ID
   */
  winnerId: string | null;
  
  /**
   * === 場地與時間 ===
   */
  
  /**
   * 分配的場地ID
   */
  courtId: string | null;
  
  /**
   * 開始時間
   */
  startTime?: Timestamp;
  
  /**
   * 結束時間
   */
  endTime?: Timestamp;
  
  /**
   * 預計開始時間
   */
  scheduledTime?: Timestamp;
  
  /**
   * 記分員ID（可選）
   */
  scorerId?: string;
}

/**
 * 選手文檔 (tournaments/{tournamentId}/players 子集合)
 * 
 * 簡化版本，專注於分配邏輯
 */
export interface PlayerDoc {
  id: string;
  
  /**
   * 用戶UID（null 表示影子帳號）
   */
  uid?: string | null;
  
  /**
   * 選手名稱
   */
  name: string;
  
  /**
   * 電子郵件
   */
  email?: string;
  
  /**
   * 選手狀態
   */
  status: "confirmed" | "pending" | "declined";
  
  /**
   * 種子序號（可選，用於初始分配邏輯）
   */
  seed?: number;
  
  /**
   * 所屬分組ID（用於單打）
   */
  categoryId?: string;
  
  /**
   * 是否為影子帳號（手動添加）
   */
  isShadow?: boolean;
  
  /**
   * 大頭照URL
   */
  photoURL?: string;
}

/**
 * 隊伍文檔 (tournaments/{tournamentId}/teams 子集合)
 * 
 * 用於雙打比賽
 */
export interface TeamDoc {
  id: string;
  tournamentId: string;
  categoryId: string;
  
  /**
   * 選手1資訊
   */
  player1Id: string;
  player1Name: string;
  player1Email?: string;
  player1PhotoURL?: string;
  
  /**
   * 選手2資訊
   */
  player2Id: string;
  player2Name: string;
  player2Email?: string;
  player2PhotoURL?: string;
  
  /**
   * 隊伍狀態
   */
  status: "pending" | "confirmed" | "declined";
  
  createdAt: Timestamp;
}

/**
 * 場地文檔 (tournaments/{tournamentId}/courts 子集合)
 */
export interface CourtDoc {
  id: string;
  tournamentId: string;
  name: string;
  order: number;
  status: "IDLE" | "IN_USE";
  currentMatchId: string | null;
  createdAt: Timestamp;
}

/**
 * 工作人員文檔 (tournaments/{tournamentId}/staff 子集合)
 */
export interface StaffDoc {
  id: string;
  uid?: string;
  email: string;
  name: string;
  photoURL?: string;
  role: "scorer" | "referee" | "volunteer";
  status: "invited" | "accepted" | "declined";
  invitedAt: Timestamp;
}

/**
 * 運動文檔 (sports 集合 - 全局配置)
 */
export interface SportDoc {
  id: string;
  name: string;
  icon?: string;
  modes: Array<"singles" | "doubles" | "team">;
  defaultPresetId: string;
  rulePresets: Array<{
    id: string;
    label: string;
    description?: string;
    config: ScoringConfig;
  }>;
  isActive?: boolean;
  order?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 賽制格式文檔 (formats 集合 - 全局配置)
 */
export interface FormatDoc {
  id: string;
  name: string;
  description?: string;
  minParticipants: number;
  maxParticipants: number;
  stages: Array<{
    type: "round_robin" | "knockout" | "group_stage";
    count?: number;
    advance?: number;
    size?: number;
    name?: string;
  }>;
  supportSeeding?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

