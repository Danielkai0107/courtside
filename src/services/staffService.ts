import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Staff } from "../types";
import { createNotification } from "./notificationService";

/**
 * 邀請工作人員
 */
export const inviteStaff = async (
  tournamentId: string,
  staffData: {
    email: string;
    name: string;
    role: Staff["role"];
    uid?: string;
    photoURL?: string;
  }
): Promise<string> => {
  console.log("[inviteStaff] 邀請紀錄員:", {
    email: staffData.email,
    name: staffData.name,
    hasUid: !!staffData.uid,
    uid: staffData.uid,
  });

  const staffRef = collection(db, "tournaments", tournamentId, "staff");

  // 檢查是否已經邀請過此 Email
  const existingQuery = query(staffRef, where("email", "==", staffData.email));
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error("Staff member already invited");
  }

  const staffDoc: any = {
    email: staffData.email,
    name: staffData.name,
    role: staffData.role,
    status: "invited",
    invitedAt: serverTimestamp(),
    notified: false, // 新增：標記是否已發送通知
  };

  // 如果是已註冊用戶
  if (staffData.uid) {
    staffDoc.uid = staffData.uid;
    if (staffData.photoURL) {
      staffDoc.photoURL = staffData.photoURL;
    }
    console.log("✅ [inviteStaff] 已註冊用戶，將立即創建通知");
  } else {
    staffDoc.uid = null;
    console.log(
      "⏳ [inviteStaff] 未註冊用戶，創建影子帳號，等待用戶註冊後會自動創建通知"
    );
  }

  const docRef = await addDoc(staffRef, staffDoc);
  console.log("✅ [inviteStaff] 邀請記錄已創建:", docRef.id);

  // 如果是已註冊用戶，立即發送通知
  if (staffData.uid) {
    try {
      const { getTournament } = await import("./tournamentService");
      const tournament = await getTournament(tournamentId);

      if (tournament) {
        await createNotification({
          userId: staffData.uid,
          type: "STAFF_INVITATION",
          title: "收到工作邀請",
          message: `您收到【${tournament.name}】的紀錄員邀請`,
          isRead: false,
          relatedData: { tournamentId, staffId: docRef.id },
          actions: [
            {
              label: "接受",
              type: "primary",
              action: "accept",
            },
            {
              label: "拒絕",
              type: "secondary",
              action: "decline",
            },
          ],
        });
        
        // 標記為已通知，防止重複創建
        await updateDoc(doc(db, "tournaments", tournamentId, "staff", docRef.id), {
          notified: true,
        });
        
        console.log("✅ [inviteStaff] 通知已創建並標記為已通知");
      }
    } catch (error) {
      console.error("❌ [inviteStaff] 創建通知失敗:", error);
      // 不影響邀請流程
    }
  }

  return docRef.id;
};

/**
 * 獲取賽事的所有工作人員
 */
export const getStaff = async (
  tournamentId: string,
  role?: Staff["role"]
): Promise<Staff[]> => {
  const staffRef = collection(db, "tournaments", tournamentId, "staff");

  let q;
  if (role) {
    q = query(staffRef, where("role", "==", role));
  } else {
    q = query(staffRef);
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Staff[];
};

/**
 * 獲取單一工作人員資料
 */
export const getStaffMember = async (
  tournamentId: string,
  staffId: string
): Promise<Staff | null> => {
  const docRef = doc(db, "tournaments", tournamentId, "staff", staffId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Staff;
};

/**
 * 更新工作人員狀態
 */
export const updateStaffStatus = async (
  tournamentId: string,
  staffId: string,
  status: Staff["status"]
): Promise<void> => {
  const docRef = doc(db, "tournaments", tournamentId, "staff", staffId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 接受邀請
 */
export const acceptInvitation = async (
  tournamentId: string,
  staffId: string,
  uid: string
): Promise<void> => {
  const docRef = doc(db, "tournaments", tournamentId, "staff", staffId);
  await updateDoc(docRef, {
    uid,
    status: "accepted",
    acceptedAt: serverTimestamp(),
  });

  // 通知主辦方
  try {
    const { getTournament } = await import("./tournamentService");
    const tournament = await getTournament(tournamentId);
    const staff = await getStaffMember(tournamentId, staffId);

    if (tournament?.organizerId && staff) {
      await createNotification({
        userId: tournament.organizerId,
        type: "STAFF_ACCEPTED",
        title: "工作人員已接受",
        message: `${staff.name} 已接受擔任【${tournament.name}】的紀錄員`,
        isRead: false,
        relatedData: { tournamentId, staffId },
        actions: [
          {
            label: "查看工作人員",
            type: "primary",
            path: `/organizer/tournaments/${tournamentId}`,
          },
        ],
      });
    }
  } catch (error) {
    console.error("Failed to create acceptance notification:", error);
    // 不影響接受流程
  }
};

/**
 * 拒絕邀請
 */
export const declineInvitation = async (
  tournamentId: string,
  staffId: string
): Promise<void> => {
  await updateStaffStatus(tournamentId, staffId, "declined");

  // 通知主辦方
  try {
    const { getTournament } = await import("./tournamentService");
    const tournament = await getTournament(tournamentId);
    const staff = await getStaffMember(tournamentId, staffId);

    if (tournament?.organizerId && staff) {
      await createNotification({
        userId: tournament.organizerId,
        type: "STAFF_DECLINED",
        title: "工作人員已拒絕",
        message: `${staff.name} 婉拒了【${tournament.name}】的紀錄員邀請`,
        isRead: false,
        relatedData: { tournamentId, staffId },
        actions: [
          {
            label: "重新邀請",
            type: "primary",
            path: `/organizer/tournaments/${tournamentId}`,
          },
        ],
      });
    }
  } catch (error) {
    console.error("Failed to create decline notification:", error);
    // 不影響拒絕流程
  }
};

/**
 * 獲取用戶的工作人員邀請
 */
export const getUserStaffInvitations = async (
  email: string
): Promise<Array<Staff & { tournamentId: string }>> => {
  // 需要使用 collectionGroup 查詢所有賽事的 staff 子集合
  const {
    collectionGroup,
    query: firestoreQuery,
    where: firestoreWhere,
  } = await import("firebase/firestore");

  const staffQuery = firestoreQuery(
    collectionGroup(db, "staff"),
    firestoreWhere("email", "==", email),
    firestoreWhere("status", "==", "invited")
  );

  const querySnapshot = await getDocs(staffQuery);

  return querySnapshot.docs.map((doc) => {
    // 從 doc.ref.path 取得 tournamentId
    // Path format: tournaments/{tournamentId}/staff/{staffId}
    const pathParts = doc.ref.path.split("/");
    const tournamentId = pathParts[1];

    return {
      id: doc.id,
      tournamentId,
      ...doc.data(),
    } as Staff & { tournamentId: string };
  });
};

/**
 * 獲取已接受的工作人員（紀錄員）
 */
export const getAcceptedScorers = async (
  tournamentId: string
): Promise<Staff[]> => {
  const staffRef = collection(db, "tournaments", tournamentId, "staff");
  const q = query(
    staffRef,
    where("role", "==", "scorer"),
    where("status", "==", "accepted")
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Staff[];
};

/**
 * 檢查用戶是否為賽事工作人員
 */
export const isUserStaff = async (
  tournamentId: string,
  uid: string
): Promise<boolean> => {
  const staffRef = collection(db, "tournaments", tournamentId, "staff");
  const q = query(
    staffRef,
    where("uid", "==", uid),
    where("status", "==", "accepted")
  );
  const querySnapshot = await getDocs(q);

  return !querySnapshot.empty;
};

/**
 * 刪除工作人員（取消邀請）
 */
export const removeStaff = async (
  tournamentId: string,
  staffId: string
): Promise<void> => {
  const { deleteDoc, doc } = await import("firebase/firestore");
  const docRef = doc(db, "tournaments", tournamentId, "staff", staffId);
  await deleteDoc(docRef);
};

/**
 * 獲取用戶已接受的工作人員邀請（賽事列表）
 */
export const getUserAcceptedInvitations = async (
  email: string
): Promise<Array<Staff & { tournamentId: string }>> => {
  // 使用 collectionGroup 查詢所有賽事的 staff 子集合
  const {
    collectionGroup,
    query: firestoreQuery,
    where: firestoreWhere,
  } = await import("firebase/firestore");

  const staffQuery = firestoreQuery(
    collectionGroup(db, "staff"),
    firestoreWhere("email", "==", email),
    firestoreWhere("status", "==", "accepted")
  );

  const querySnapshot = await getDocs(staffQuery);

  return querySnapshot.docs.map((doc) => {
    // 從 doc.ref.path 取得 tournamentId
    // Path format: tournaments/{tournamentId}/staff/{staffId}
    const pathParts = doc.ref.path.split("/");
    const tournamentId = pathParts[1];

    return {
      id: doc.id,
      tournamentId,
      ...doc.data(),
    } as Staff & { tournamentId: string };
  });
};
