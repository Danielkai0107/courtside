import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  QueryConstraint,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Category } from "../types";

/**
 * Helper function to remove undefined values from object
 */
const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
};

/**
 * 創建新的 Category（分組/項目）
 */
export const createCategory = async (
  tournamentId: string,
  categoryData: Omit<Category, "id" | "createdAt" | "updatedAt" | "tournamentId">
): Promise<string> => {
  const cleanData = removeUndefined({
    ...categoryData,
    tournamentId,
    currentParticipants: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const docRef = await addDoc(
    collection(db, "tournaments", tournamentId, "categories"),
    cleanData
  );
  return docRef.id;
};

/**
 * 獲取單一 Category
 */
export const getCategoryById = async (
  tournamentId: string,
  categoryId: string
): Promise<Category | null> => {
  const docRef = doc(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId
  );
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Category;
};

/**
 * 獲取賽事的所有 Categories
 */
export const getCategories = async (
  tournamentId: string
): Promise<Category[]> => {
  const categoriesRef = collection(
    db,
    "tournaments",
    tournamentId,
    "categories"
  );
  const q = query(categoriesRef, orderBy("createdAt", "asc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Category[];
};

/**
 * 更新 Category 資料
 */
export const updateCategory = async (
  tournamentId: string,
  categoryId: string,
  updates: Partial<Omit<Category, "id" | "createdAt" | "tournamentId">>
): Promise<void> => {
  const docRef = doc(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId
  );

  const cleanUpdates = removeUndefined({
    ...updates,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(docRef, cleanUpdates);
};

/**
 * 更新 Category 狀態
 */
export const updateCategoryStatus = async (
  tournamentId: string,
  categoryId: string,
  status: Category["status"]
): Promise<void> => {
  await updateCategory(tournamentId, categoryId, { status });
};

/**
 * 增加參賽者計數
 */
export const incrementParticipants = async (
  tournamentId: string,
  categoryId: string,
  count: number = 1
): Promise<void> => {
  const category = await getCategoryById(tournamentId, categoryId);
  if (!category) {
    throw new Error("Category not found");
  }

  const newCount = category.currentParticipants + count;
  await updateCategory(tournamentId, categoryId, {
    currentParticipants: newCount,
  });
};

/**
 * 減少參賽者計數
 */
export const decrementParticipants = async (
  tournamentId: string,
  categoryId: string,
  count: number = 1
): Promise<void> => {
  const category = await getCategoryById(tournamentId, categoryId);
  if (!category) {
    throw new Error("Category not found");
  }

  const newCount = Math.max(0, category.currentParticipants - count);
  await updateCategory(tournamentId, categoryId, {
    currentParticipants: newCount,
  });
};

/**
 * 即時監聽 Category 變化
 */
export const subscribeCategory = (
  tournamentId: string,
  categoryId: string,
  callback: (category: Category | null) => void
) => {
  const docRef = doc(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId
  );
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({
        id: docSnap.id,
        ...docSnap.data(),
      } as Category);
    } else {
      callback(null);
    }
  });
};

/**
 * 即時監聽 Categories 列表變化
 */
export const subscribeCategories = (
  tournamentId: string,
  callback: (categories: Category[]) => void
) => {
  const categoriesRef = collection(
    db,
    "tournaments",
    tournamentId,
    "categories"
  );
  const q = query(categoriesRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, (querySnapshot) => {
    const categories = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[];

    callback(categories);
  });
};

/**
 * 檢查 Category 是否已滿額
 */
export const isCategoryFull = async (
  tournamentId: string,
  categoryId: string
): Promise<boolean> => {
  const category = await getCategoryById(tournamentId, categoryId);
  if (!category) {
    throw new Error("Category not found");
  }

  return category.currentParticipants >= category.maxParticipants;
};

/**
 * 獲取 Category 的剩餘名額
 */
export const getRemainingSlots = async (
  tournamentId: string,
  categoryId: string
): Promise<number> => {
  const category = await getCategoryById(tournamentId, categoryId);
  if (!category) {
    throw new Error("Category not found");
  }

  return Math.max(0, category.maxParticipants - category.currentParticipants);
};

