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
import type { Sport } from "../types";

/**
 * 獲取所有啟用的球類項目
 */
export const getActiveSports = async (): Promise<Sport[]> => {
  const q = query(
    collection(db, "sports"),
    where("isActive", "==", true),
    orderBy("order", "asc")
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Sport[];
};

/**
 * 獲取單一球類項目
 */
export const getSport = async (sportId: string): Promise<Sport | null> => {
  const docRef = doc(db, "sports", sportId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Sport;
};





