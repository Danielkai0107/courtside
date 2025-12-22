import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Notification } from "../types";

/**
 * 創建新通知
 */
export const createNotification = async (
  notification: Omit<Notification, "id" | "createdAt">
): Promise<string> => {
  const notificationsRef = collection(db, "notifications");

  const notificationDoc = {
    ...notification,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(notificationsRef, notificationDoc);
  return docRef.id;
};

/**
 * 獲取用戶的所有通知
 */
export const getUserNotifications = async (
  userId: string,
  unreadOnly: boolean = false
): Promise<Notification[]> => {
  const notificationsRef = collection(db, "notifications");

  let q;
  if (unreadOnly) {
    q = query(
      notificationsRef,
      where("userId", "==", userId),
      where("isRead", "==", false),
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(
      notificationsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Notification[];
};

/**
 * 標記為已讀
 */
export const markAsRead = async (notificationId: string): Promise<void> => {
  const docRef = doc(db, "notifications", notificationId);
  await updateDoc(docRef, {
    isRead: true,
  });
};

/**
 * 全部標記已讀
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("isRead", "==", false)
  );

  const querySnapshot = await getDocs(q);

  // 使用批次更新提高效率
  const batch = writeBatch(db);
  querySnapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { isRead: true });
  });

  await batch.commit();
};

/**
 * 刪除通知
 */
export const deleteNotification = async (
  notificationId: string
): Promise<void> => {
  const docRef = doc(db, "notifications", notificationId);
  await deleteDoc(docRef);
};

/**
 * 批量刪除已讀通知
 */
export const deleteReadNotifications = async (
  userId: string
): Promise<void> => {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("isRead", "==", true)
  );

  const querySnapshot = await getDocs(q);

  // 使用批次刪除
  const batch = writeBatch(db);
  querySnapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  await batch.commit();
};

/**
 * 獲取未讀數量
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("isRead", "==", false)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.size;
};

/**
 * 即時監聽通知變化
 */
export const listenToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
): (() => void) => {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const notifications = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];

    callback(notifications);
  });
};

/**
 * 即時監聽未讀數量
 */
export const listenToUnreadCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("isRead", "==", false)
  );

  return onSnapshot(q, (querySnapshot) => {
    callback(querySnapshot.size);
  });
};

/**
 * 獲取單個通知
 */
export const getNotification = async (
  notificationId: string
): Promise<Notification | null> => {
  const docRef = doc(db, "notifications", notificationId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Notification;
};
