/**
 * 通用運動引擎 - 配置類型定義
 * 
 * 這個文件定義了配置驅動的核心接口，支持"一切都是配置"的理念。
 * 運動、規則和格式都通過配置而非硬編碼來定義。
 */

/**
 * 計分配置 - 定義"如何獲勝"的規則引擎
 */
export interface ScoringConfig {
  /**
   * 比賽類型
   * - set_based: 基於局數（如桌球、羽毛球）
   * - point_based: 基於總分（如某些變體規則）
   */
  matchType: "set_based" | "point_based";
  
  /**
   * 每局得分目標（例如：11分或21分）
   */
  pointsPerSet: number;
  
  /**
   * 需要贏幾局才算獲勝（例如：Best of 5 則需贏3局）
   */
  setsToWin: number;
  
  /**
   * 最大局數（用於UI渲染，例如：Best of 5 = 5局）
   */
  maxSets: number;
  
  /**
   * 是否需要淨勝2分（Deuce規則）
   */
  winByTwo: boolean;
  
  /**
   * 分數上限（例如：羽毛球30分封頂）
   * null 表示無上限
   */
  cap?: number | null;
  
  /**
   * 搶七局開始分數（例如：網球的搶七局）
   * 可選，僅部分運動使用
   */
  tieBreakAt?: number;
}

/**
 * 規則預設 - 可選擇的規則配置菜單項
 */
export interface RulePreset {
  /**
   * 預設ID（例如："tt_bo5", "badminton_bwf"）
   */
  id: string;
  
  /**
   * 顯示名稱（例如："標準賽制 (Best of 5)"）
   */
  label: string;
  
  /**
   * 詳細說明（可選）
   */
  description?: string;
  
  /**
   * 實際的計分配置邏輯
   */
  config: ScoringConfig;
}

/**
 * 運動定義 - "運動菜單"的配置
 */
export interface SportDefinition {
  /**
   * 運動ID（例如："table_tennis", "badminton"）
   */
  id: string;
  
  /**
   * 運動名稱（例如："桌球", "羽毛球"）
   */
  name: string;
  
  /**
   * 支持的比賽模式
   */
  modes: Array<"singles" | "doubles" | "team">;
  
  /**
   * 默認規則預設ID
   */
  defaultPresetId: string;
  
  /**
   * 可用的規則預設列表
   */
  rulePresets: RulePreset[];
  
  /**
   * 運動圖標（emoji或URL）
   */
  icon?: string;
  
  /**
   * 是否啟用
   */
  isActive?: boolean;
  
  /**
   * 顯示順序
   */
  order?: number;
}

/**
 * 賽制階段類型
 */
export type StageType = "round_robin" | "knockout" | "group_stage";

/**
 * 賽制階段配置
 */
export interface FormatStage {
  /**
   * 階段類型
   */
  type: StageType;
  
  /**
   * 小組數量（僅 group_stage 使用）
   */
  count?: number;
  
  /**
   * 每組晉級人數（僅 group_stage 使用）
   */
  advance?: number;
  
  /**
   * 淘汰賽規模（例如：Round of 16）
   */
  size?: number;
  
  /**
   * 階段名稱（用於顯示）
   */
  name?: string;
}

/**
 * 賽制格式定義 - "賽制模板"的配置
 */
export interface FormatDefinition {
  /**
   * 格式ID（例如："group_4_to_qf", "knockout_16"）
   */
  id: string;
  
  /**
   * 格式名稱（例如："4組循環後八強淘汰賽"）
   */
  name: string;
  
  /**
   * 最少參賽人數
   */
  minParticipants: number;
  
  /**
   * 最多參賽人數
   */
  maxParticipants: number;
  
  /**
   * 賽制階段配置
   */
  stages: FormatStage[];
  
  /**
   * 格式說明（可選）
   */
  description?: string;
  
  /**
   * 是否支持種子排序
   */
  supportSeeding?: boolean;
}

