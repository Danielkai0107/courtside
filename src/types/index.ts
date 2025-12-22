import { Timestamp } from "firebase/firestore";

export type UserRole = "user" | "organizer" | "scorer";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  currentRole: UserRole; // UI preference
}

export interface Tournament {
  id: string; // Document ID
  name: string;
  date: Timestamp;
  registrationDeadline: Timestamp;
  location: string;
  description?: string;
  bannerURL?: string;

  // 六階段狀態機
  status:
    | "DRAFT"
    | "REGISTRATION_OPEN"
    | "REGISTRATION_CLOSED"
    | "ONGOING"
    | "COMPLETED"
    | "CANCELLED";

  organizerId: string;
  organizerName?: string; // 發布者名稱
  organizerPhotoURL?: string; // 發布者頭像
  sportId: string; // 關聯到 Sport 資料
  sportType: "basketball" | "badminton" | "volleyball" | "pickleball"; // 向下相容，可能之後移除

  // 賽事統計（用於即時預覽）
  stats?: {
    totalCategories: number;
    totalMatches: number;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 三層架構：Category（分組/項目）
export interface Category {
  id: string;
  tournamentId: string;
  name: string; // "男子雙打", "女子單打"
  matchType: "singles" | "doubles";
  maxParticipants: number; // 名額上限
  currentParticipants: number;

  // 賽制設定
  format: "KNOCKOUT_ONLY" | "GROUP_THEN_KNOCKOUT";
  groupConfig?: {
    totalGroups: number; // 分幾組
    advancePerGroup: number; // 每組取幾名
    bestThirdPlaces?: number; // 最佳第三名晉級數
  };

  // 比賽設定
  pointsPerSet: number; // 每局得分
  enableThirdPlaceMatch: boolean; // 季軍賽（僅淘汰賽）

  status: "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "ONGOING" | "COMPLETED";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 雙打隊伍
export interface Team {
  id: string;
  tournamentId: string;
  categoryId: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1Email?: string;
  player2Email?: string;
  player1PhotoURL?: string;
  player2PhotoURL?: string;
  status: "pending" | "confirmed" | "declined";
  createdAt: Timestamp;
}

export interface Player {
  id: string; // Document ID
  uid?: string; // Nullable if still a shadow account
  email: string;
  name: string;
  photoURL?: string; // User avatar
  status: "pending" | "confirmed" | "declined";
  isShadow: boolean;
  manualAdded: boolean;
  categoryId?: string; // 新增：關聯到 Category（單打用）
}

export interface MatchTimelineLog {
  time: Timestamp;
  team: "A" | "B";
  action: "score" | "undo";
  val: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  categoryId: string; // 新增：關聯到 Category

  // 階段與輪次資訊
  stage: "group" | "knockout"; // 新增：小組賽或淘汰賽
  groupLabel?: string; // 新增：A, B, C... (僅小組賽使用)
  roundLabel?: string; // 新增：QF, SF, FI, 3RD (僅淘汰賽使用)
  round: number; // 第幾輪 (1, 2, 3...)
  matchOrder: number; // 場次優先級

  // 選手（初始可能為 null，代表等待晉級或 BYE）
  player1Id: string | null;
  player2Id: string | null;
  player1Name?: string;
  player2Name?: string;
  winnerId: string | null;

  // Linked List 自動晉級鏈結
  nextMatchId: string | null; // 勝者下一場
  nextMatchSlot: "player1" | "player2" | null; // 填入下一場的哪個位置
  loserNextMatchId?: string | null; // 敗者下一場（雙敗淘汰專用）
  loserNextMatchSlot?: "player1" | "player2" | null;

  // 場地連結
  courtId: string | null;

  // 比賽狀態（擴充為 5 種）
  status:
    | "PENDING_PLAYER"
    | "PENDING_COURT"
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED";

  // 比分與時間
  score: {
    player1: number;
    player2: number;
  };
  scorerId?: string;
  timeline: MatchTimelineLog[];
  scheduledTime?: Timestamp;
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
}

// 小組賽積分榜項目
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

export interface Court {
  id: string;
  tournamentId: string;
  name: string; // 例如：場地 A、中央球場
  order: number; // 顯示順序
  status: "IDLE" | "IN_USE";
  currentMatchId: string | null; // 當前進行的比賽
  createdAt: Timestamp;
}

export interface Staff {
  id: string;
  uid?: string;
  email: string;
  name: string;
  photoURL?: string; // User avatar
  role: "scorer" | "referee" | "volunteer";
  status: "invited" | "accepted" | "declined";
  invitedAt: Timestamp;
}

export interface Sport {
  id: string; // Document ID
  name: string; // 運動名稱（如：匹克球）
  nameEn: string; // 英文名稱（如：Pickleball）
  icon: string; // 圖示 emoji
  availableFormats: Array<{
    id: "knockout" | "round-robin" | "group-stage";
    name: string;
    description: string;
  }>;
  defaultPointsPerSet: number; // 預設每局得分
  isActive: boolean; // 是否啟用
  order: number; // 排序
  createdAt: Timestamp;
}

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
