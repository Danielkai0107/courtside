/**
 * 格式服務 - 格式引擎
 * 
 * 提供賽制格式的查詢和驗證功能，包括：
 * - 根據參賽人數自動匹配最佳格式
 * - 驗證選擇的格式是否適用於當前人數
 * - 獲取所有可用格式
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FormatDefinition } from "../types/universal-config";
import type { FormatDoc } from "../types/schema";

/**
 * 根據參賽人數查找最佳匹配的格式
 * 
 * @param participantCount 參賽人數
 * @returns 最佳格式定義，如果沒有找到則返回 null
 */
export async function findBestFormat(
  participantCount: number
): Promise<FormatDefinition | null> {
  try {
    console.log(`[FormatService] 查找適合 ${participantCount} 人的賽制格式...`);

    // 查詢所有符合人數範圍的格式
    const formatsRef = collection(db, "formats");
    const q = query(
      formatsRef,
      where("minParticipants", "<=", participantCount),
      where("maxParticipants", ">=", participantCount),
      orderBy("minParticipants", "asc")
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`[FormatService] 找不到適合 ${participantCount} 人的賽制格式`);
      return null;
    }

    // 返回第一個匹配的格式（已按 minParticipants 排序）
    const formatDoc = querySnapshot.docs[0];
    const formatData = formatDoc.data() as FormatDoc;

    console.log(`[FormatService] 找到最佳格式: ${formatData.name} (${formatData.id})`);

    return {
      id: formatData.id,
      name: formatData.name,
      description: formatData.description,
      minParticipants: formatData.minParticipants,
      maxParticipants: formatData.maxParticipants,
      stages: formatData.stages,
      supportSeeding: formatData.supportSeeding,
    };
  } catch (error) {
    console.error("[FormatService] 查找格式失敗:", error);
    throw error;
  }
}

/**
 * 驗證指定格式是否適用於當前參賽人數
 * 
 * @param formatId 格式ID
 * @param participantCount 參賽人數
 * @returns 是否有效
 */
export async function validateFormat(
  formatId: string,
  participantCount: number
): Promise<boolean> {
  try {
    const format = await getFormat(formatId);
    
    if (!format) {
      console.warn(`[FormatService] 格式不存在: ${formatId}`);
      return false;
    }

    const isValid =
      participantCount >= format.minParticipants &&
      participantCount <= format.maxParticipants;

    if (!isValid) {
      console.warn(
        `[FormatService] 格式 ${format.name} 不適用於 ${participantCount} 人（範圍: ${format.minParticipants}-${format.maxParticipants}）`
      );
    }

    return isValid;
  } catch (error) {
    console.error("[FormatService] 驗證格式失敗:", error);
    return false;
  }
}

/**
 * 獲取指定ID的格式
 * 
 * @param formatId 格式ID
 * @returns 格式定義，如果不存在則返回 null
 */
export async function getFormat(
  formatId: string
): Promise<FormatDefinition | null> {
  try {
    const docRef = doc(db, "formats", formatId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn(`[FormatService] 格式不存在: ${formatId}`);
      return null;
    }

    const formatData = docSnap.data() as FormatDoc;

    return {
      id: formatData.id,
      name: formatData.name,
      description: formatData.description,
      minParticipants: formatData.minParticipants,
      maxParticipants: formatData.maxParticipants,
      stages: formatData.stages,
      supportSeeding: formatData.supportSeeding,
    };
  } catch (error) {
    console.error(`[FormatService] 獲取格式失敗 (${formatId}):`, error);
    throw error;
  }
}

/**
 * 獲取所有可用格式
 * 
 * @returns 所有格式定義的陣列
 */
export async function getAllFormats(): Promise<FormatDefinition[]> {
  try {
    const formatsRef = collection(db, "formats");
    const q = query(formatsRef, orderBy("minParticipants", "asc"));
    const querySnapshot = await getDocs(q);

    const formats: FormatDefinition[] = querySnapshot.docs.map((doc) => {
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

    console.log(`[FormatService] 獲取到 ${formats.length} 個格式`);

    return formats;
  } catch (error) {
    console.error("[FormatService] 獲取所有格式失敗:", error);
    throw error;
  }
}

/**
 * 根據參賽人數獲取可用格式列表
 * 
 * @param participantCount 參賽人數
 * @returns 適用的格式列表
 */
export async function getAvailableFormats(
  participantCount: number
): Promise<FormatDefinition[]> {
  try {
    console.log(`[FormatService] 查找適合 ${participantCount} 人的所有賽制格式...`);

    const formatsRef = collection(db, "formats");
    const q = query(
      formatsRef,
      where("minParticipants", "<=", participantCount),
      where("maxParticipants", ">=", participantCount),
      orderBy("minParticipants", "asc")
    );

    const querySnapshot = await getDocs(q);

    const formats: FormatDefinition[] = querySnapshot.docs.map((doc) => {
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

    console.log(`[FormatService] 找到 ${formats.length} 個適用的格式`);

    return formats;
  } catch (error) {
    console.error("[FormatService] 獲取可用格式失敗:", error);
    throw error;
  }
}

/**
 * 自動回退引擎 - 檢查並建議替代格式
 * 
 * 當參賽人數變更時，檢查原格式是否仍然適用
 * 如果不適用，建議最佳替代格式
 * 
 * @param currentFormatId 當前選擇的格式ID
 * @param participantCount 新的參賽人數
 * @returns 建議結果
 */
export async function checkAndSuggestFormat(
  currentFormatId: string,
  participantCount: number
): Promise<{
  isValid: boolean;
  currentFormat: FormatDefinition | null;
  suggestedFormat: FormatDefinition | null;
  message: string;
}> {
  try {
    console.log(
      `[FormatService] 檢查格式 ${currentFormatId} 是否適用於 ${participantCount} 人...`
    );

    const currentFormat = await getFormat(currentFormatId);

    if (!currentFormat) {
      return {
        isValid: false,
        currentFormat: null,
        suggestedFormat: null,
        message: "當前格式不存在",
      };
    }

    // 檢查當前格式是否有效
    const isValid =
      participantCount >= currentFormat.minParticipants &&
      participantCount <= currentFormat.maxParticipants;

    if (isValid) {
      return {
        isValid: true,
        currentFormat,
        suggestedFormat: null,
        message: "當前格式適用",
      };
    }

    // 查找替代格式
    const suggestedFormat = await findBestFormat(participantCount);

    if (!suggestedFormat) {
      return {
        isValid: false,
        currentFormat,
        suggestedFormat: null,
        message: `當前格式 ${currentFormat.name} 不適用於 ${participantCount} 人（範圍: ${currentFormat.minParticipants}-${currentFormat.maxParticipants}），且找不到替代格式`,
      };
    }

    return {
      isValid: false,
      currentFormat,
      suggestedFormat,
      message: `當前格式 ${currentFormat.name} 不適用於 ${participantCount} 人（範圍: ${currentFormat.minParticipants}-${currentFormat.maxParticipants}），建議使用 ${suggestedFormat.name}（範圍: ${suggestedFormat.minParticipants}-${suggestedFormat.maxParticipants}）`,
    };
  } catch (error) {
    console.error("[FormatService] 檢查並建議格式失敗:", error);
    throw error;
  }
}

