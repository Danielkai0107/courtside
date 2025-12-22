/**
 * 通用運動引擎前端服務
 * 
 * 提供前端組件所需的數據獲取和驗證功能
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  SportDefinition,
  RulePreset,
  FormatDefinition,
} from "../types/universal-config";
import type { SportDoc, FormatDoc } from "../types/schema";

/**
 * 獲取所有啟用的運動
 * 
 * @returns 運動列表
 */
export async function getActiveSportsUniversal(): Promise<SportDefinition[]> {
  try {
    const sportsRef = collection(db, "sports");
    const q = query(
      sportsRef,
      where("isActive", "==", true),
      orderBy("order", "asc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as SportDoc;
      return {
        id: data.id,
        name: data.name,
        icon: data.icon,
        modes: data.modes,
        defaultPresetId: data.defaultPresetId,
        rulePresets: data.rulePresets,
        isActive: data.isActive,
        order: data.order,
      };
    });
  } catch (error) {
    console.error("[UniversalEngineService] 獲取運動列表失敗:", error);
    throw error;
  }
}

/**
 * 獲取指定運動的規則預設列表
 * 
 * @param sportId 運動ID
 * @returns 規則預設列表
 */
export async function getRulePresets(
  sportId: string
): Promise<RulePreset[]> {
  try {
    const sports = await getActiveSportsUniversal();
    const sport = sports.find((s) => s.id === sportId);

    if (!sport) {
      throw new Error(`運動不存在: ${sportId}`);
    }

    return sport.rulePresets;
  } catch (error) {
    console.error(
      `[UniversalEngineService] 獲取規則預設失敗 (${sportId}):`,
      error
    );
    throw error;
  }
}

/**
 * 根據參賽人數範圍獲取可用格式
 * 
 * @param minCount 最小人數（可選）
 * @param maxCount 最大人數（可選）
 * @returns 格式列表
 */
export async function getAvailableFormatsUniversal(
  minCount?: number,
  maxCount?: number
): Promise<FormatDefinition[]> {
  try {
    const formatsRef = collection(db, "formats");
    const q = query(formatsRef, orderBy("minParticipants", "asc"));

    const querySnapshot = await getDocs(q);

    let formats: FormatDefinition[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as FormatDoc;
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        minParticipants: data.minParticipants,
        maxParticipants: data.maxParticipants,
        stages: data.stages,
        supportSeeding: data.supportSeeding,
      };
    });

    // 如果提供了人數範圍，進行篩選
    if (minCount !== undefined || maxCount !== undefined) {
      formats = formats.filter((format) => {
        const minMatch =
          minCount === undefined || format.maxParticipants >= minCount;
        const maxMatch =
          maxCount === undefined || format.minParticipants <= maxCount;
        return minMatch && maxMatch;
      });
    }

    return formats;
  } catch (error) {
    console.error("[UniversalEngineService] 獲取格式列表失敗:", error);
    throw error;
  }
}

/**
 * 獲取格式的顯示標籤
 * 
 * @param format 格式定義
 * @returns 顯示標籤
 */
export function getFormatDisplayLabel(format: FormatDefinition): string {
  const stageLabels = format.stages
    .map((stage) => {
      switch (stage.type) {
        case "round_robin":
          return "循環賽";
        case "knockout":
          return "淘汰賽";
        case "group_stage":
          return `${stage.count}組循環`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join(" → ");

  return `${format.name} (${format.minParticipants}-${format.maxParticipants}人) ${stageLabels}`;
}

/**
 * 獲取規則預設的顯示標籤
 * 
 * @param preset 規則預設
 * @returns 顯示標籤
 */
export function getRulePresetDisplayLabel(preset: RulePreset): string {
  const config = preset.config;

  if (config.matchType === "set_based") {
    return `${preset.label} - ${config.pointsPerSet}分/${config.setsToWin}勝${config.maxSets}局${config.winByTwo ? " (Deuce)" : ""}`;
  } else {
    return `${preset.label} - ${config.pointsPerSet}分制${config.winByTwo ? " (Deuce)" : ""}`;
  }
}

/**
 * 驗證賽事配置的完整性
 * 
 * @param sportId 運動ID
 * @param rulePresetId 規則預設ID
 * @param formatId 格式ID
 * @returns 驗證結果
 */
export async function validateTournamentConfig(
  sportId: string,
  rulePresetId: string,
  formatId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // 驗證運動和規則預設
    const sports = await getActiveSportsUniversal();
    const sport = sports.find((s) => s.id === sportId);

    if (!sport) {
      return { valid: false, error: "運動不存在" };
    }

    const preset = sport.rulePresets.find((p) => p.id === rulePresetId);

    if (!preset) {
      return { valid: false, error: "規則預設不存在" };
    }

    // 驗證格式
    const formats = await getAvailableFormatsUniversal();
    const format = formats.find((f) => f.id === formatId);

    if (!format) {
      return { valid: false, error: "賽制格式不存在" };
    }

    return { valid: true };
  } catch (error) {
    console.error("[UniversalEngineService] 驗證配置失敗:", error);
    return { valid: false, error: "驗證失敗，請稍後再試" };
  }
}

