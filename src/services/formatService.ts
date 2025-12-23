import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FormatTemplate } from "../types";

/**
 * 獲取所有賽制模板
 */
export const getAllFormats = async (): Promise<FormatTemplate[]> => {
  const q = query(
    collection(db, "formats"),
    orderBy("minParticipants", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FormatTemplate[];
};

/**
 * 根據人數範圍獲取適合的模板
 */
export const getFormatsByParticipantCount = async (
  count: number
): Promise<FormatTemplate[]> => {
  const allFormats = await getAllFormats();
  return allFormats.filter(
    (f) => count >= f.minParticipants && count <= f.maxParticipants
  );
};

/**
 * 獲取單一模板
 */
export const getFormat = async (
  formatId: string
): Promise<FormatTemplate | null> => {
  const docRef = doc(db, "formats", formatId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as FormatTemplate;
};

/**
 * 計算模板的總比賽場次
 */
export const calculateFormatTotalMatches = (
  format: FormatTemplate,
  actualParticipants: number
): number => {
  let totalMatches = 0;

  for (const stage of format.stages) {
    if (stage.type === "knockout" && stage.size) {
      // 淘汰賽場次 = size - 1
      totalMatches += stage.size - 1;
    } else if (stage.type === "group_stage" && stage.count) {
      // 小組賽場次 = 每組循環賽場次總和
      const teamsPerGroup = Math.floor(actualParticipants / stage.count);
      const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
      totalMatches += matchesPerGroup * stage.count;
    } else if (stage.type === "round_robin") {
      // 循環賽場次 = n * (n - 1) / 2
      totalMatches += (actualParticipants * (actualParticipants - 1)) / 2;
    }
  }

  return totalMatches;
};

