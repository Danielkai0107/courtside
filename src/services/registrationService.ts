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
import type { Player } from "../types";
import { createNotification } from "./notificationService";

/**
 * 用戶報名賽事
 */
export const registerForTournament = async (
  tournamentId: string,
  userData: {
    uid: string;
    email: string;
    name: string;
    photoURL?: string;
    categoryId?: string; // 添加分類 ID
  }
): Promise<string> => {
  const playersRef = collection(db, "tournaments", tournamentId, "players");

  // 檢查是否已經報名此分類（包括被婉拒的）
  let existingQuery;
  if (userData.categoryId) {
    existingQuery = query(
      playersRef,
      where("uid", "==", userData.uid),
      where("categoryId", "==", userData.categoryId)
    );
  } else {
    existingQuery = query(playersRef, where("uid", "==", userData.uid));
  }

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];
    const existingData = existingDoc.data();

    // 如果是被婉拒的，可以重新報名
    if (existingData.status === "declined") {
      // 更新為 pending 狀態
      const updateData: any = {
        status: "pending",
        name: userData.name, // 更新名稱（可能有改）
        photoURL: userData.photoURL || null,
      };
      if (userData.categoryId) {
        updateData.categoryId = userData.categoryId;
      }
      await updateDoc(
        doc(db, "tournaments", tournamentId, "players", existingDoc.id),
        updateData
      );
      return existingDoc.id;
    }

    // 其他狀態（pending 或 confirmed）不允許重複報名
    throw new Error("您已報名此分類");
  }

  const playerDoc: any = {
    uid: userData.uid,
    email: userData.email,
    name: userData.name,
    status: "pending",
    isShadow: false,
    manualAdded: false,
    createdAt: serverTimestamp(),
  };

  if (userData.photoURL) {
    playerDoc.photoURL = userData.photoURL;
  }

  // 添加分類 ID
  if (userData.categoryId) {
    playerDoc.categoryId = userData.categoryId;
  }

  const docRef = await addDoc(playersRef, playerDoc);
  return docRef.id;
};

/**
 * 主辦方手動新增選手（建立影子帳號）
 */
export const addPlayerManually = async (
  tournamentId: string,
  playerData: {
    email: string;
    name: string;
    uid?: string;
    photoURL?: string;
    categoryId?: string;
  }
): Promise<string> => {
  const playersRef = collection(db, "tournaments", tournamentId, "players");

  // 檢查該 Email 是否已經在此賽事中
  const existingQuery = query(
    playersRef,
    where("email", "==", playerData.email)
  );
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error("Player with this email already exists in tournament");
  }

  const playerDoc: any = {
    email: playerData.email,
    name: playerData.name,
    status: "confirmed", // 主辦方手動新增直接確認
    manualAdded: true,
    createdAt: serverTimestamp(),
  };

  // 添加 categoryId（單打用）
  if (playerData.categoryId) {
    playerDoc.categoryId = playerData.categoryId;
  }

  // 如果是已註冊用戶
  if (playerData.uid) {
    playerDoc.uid = playerData.uid;
    playerDoc.isShadow = false;
    if (playerData.photoURL) {
      playerDoc.photoURL = playerData.photoURL;
    }
  } else {
    // 影子帳號
    playerDoc.uid = null;
    playerDoc.isShadow = true;
  }

  const docRef = await addDoc(playersRef, playerDoc);
  return docRef.id;
};

/**
 * 獲取賽事的所有選手
 */
export const getPlayers = async (
  tournamentId: string,
  status?: Player["status"]
): Promise<Player[]> => {
  const playersRef = collection(db, "tournaments", tournamentId, "players");

  let q;
  if (status) {
    q = query(playersRef, where("status", "==", status));
  } else {
    q = query(playersRef);
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Player[];
};

/**
 * 獲取單一選手資料
 */
export const getPlayer = async (
  tournamentId: string,
  playerId: string
): Promise<Player | null> => {
  const docRef = doc(db, "tournaments", tournamentId, "players", playerId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Player;
};

/**
 * 更新選手狀態（審核報名）
 */
export const updatePlayerStatus = async (
  tournamentId: string,
  playerId: string,
  status: Player["status"]
): Promise<void> => {
  const docRef = doc(db, "tournaments", tournamentId, "players", playerId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  // 發送通知給選手
  try {
    const player = await getPlayer(tournamentId, playerId);
    const { getTournament } = await import("./tournamentService");
    const tournament = await getTournament(tournamentId);

    if (player?.uid && tournament) {
      if (status === "confirmed") {
        // 報名通過通知
        await createNotification({
          userId: player.uid,
          type: "REGISTRATION_APPROVED",
          title: "報名已通過",
          message: `您報名的【${tournament.name}】已被批准！`,
          isRead: false,
          relatedData: { tournamentId },
          actions: [
            {
              label: "查看賽事",
              type: "primary",
              path: `/events/${tournamentId}`,
            },
          ],
        });
      } else if (status === "declined") {
        // 報名被拒通知
        await createNotification({
          userId: player.uid,
          type: "REGISTRATION_REJECTED",
          title: "報名未通過",
          message: `很抱歉，您報名的【${tournament.name}】未通過審核`,
          isRead: false,
          relatedData: { tournamentId },
        });
      }
    }
  } catch (error) {
    console.error("Failed to create notification for player:", error);
    // 不影響狀態更新
  }
};

/**
 * 確認選手（批准報名）
 */
export const confirmPlayer = async (
  tournamentId: string,
  playerId: string
): Promise<void> => {
  await updatePlayerStatus(tournamentId, playerId, "confirmed");
};

/**
 * 批准選手（審核通過）
 */
export const approvePlayer = async (
  tournamentId: string,
  playerId: string
): Promise<void> => {
  await updatePlayerStatus(tournamentId, playerId, "confirmed");
};

/**
 * 婉拒選手（審核拒絕）
 */
export const rejectPlayer = async (
  tournamentId: string,
  playerId: string
): Promise<void> => {
  await updatePlayerStatus(tournamentId, playerId, "declined");
};

/**
 * 獲取已確認的選手列表
 */
export const getConfirmedPlayers = async (
  tournamentId: string
): Promise<Player[]> => {
  return getPlayers(tournamentId, "confirmed");
};

/**
 * 檢查用戶是否已報名某賽事
 */
export const isUserRegistered = async (
  tournamentId: string,
  uid: string
): Promise<boolean> => {
  const playersRef = collection(db, "tournaments", tournamentId, "players");
  const q = query(playersRef, where("uid", "==", uid));
  const querySnapshot = await getDocs(q);

  return !querySnapshot.empty;
};

/**
 * 獲取用戶的報名資料
 */
export const getUserRegistration = async (
  tournamentId: string,
  uid: string
): Promise<Player | null> => {
  const playersRef = collection(db, "tournaments", tournamentId, "players");
  const q = query(playersRef, where("uid", "==", uid));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Player;
};

/**
 * 刪除選手
 */
export const deletePlayer = async (
  tournamentId: string,
  playerId: string
): Promise<void> => {
  const { deleteDoc, doc } = await import("firebase/firestore");
  const docRef = doc(db, "tournaments", tournamentId, "players", playerId);
  await deleteDoc(docRef);
};

/**
 * 按分類獲取選手列表
 */
export const getPlayersByCategory = async (
  tournamentId: string,
  categoryId: string,
  status?: Player["status"]
): Promise<Player[]> => {
  const playersRef = collection(db, "tournaments", tournamentId, "players");

  const constraints: any[] = [where("categoryId", "==", categoryId)];

  if (status) {
    constraints.push(where("status", "==", status));
  }

  const q = query(playersRef, ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Player[];
};

/**
 * 獲取用戶已報名的所有賽事（帶賽事資訊）
 */
export const getUserRegisteredTournaments = async (
  uid: string
): Promise<
  Array<{ player: Player; tournament: any; tournamentId: string }>
> => {
  console.log("🔍 [getUserRegisteredTournaments] 開始查詢:", { uid });

  // 使用 collectionGroup 查詢所有賽事的 players 子集合
  const {
    collectionGroup,
    query: firestoreQuery,
    where: firestoreWhere,
  } = await import("firebase/firestore");
  const { getTournament } = await import("./tournamentService");

  const playersQuery = firestoreQuery(
    collectionGroup(db, "players"),
    firestoreWhere("uid", "==", uid)
  );

  const querySnapshot = await getDocs(playersQuery);

  console.log("📋 [getUserRegisteredTournaments] 找到 player 記錄:", {
    count: querySnapshot.docs.length,
    records: querySnapshot.docs.map((doc) => ({
      path: doc.ref.path,
      data: doc.data(),
    })),
  });

  const registrations = await Promise.all(
    querySnapshot.docs.map(async (doc) => {
      // 從 doc.ref.path 取得 tournamentId
      // Path format: tournaments/{tournamentId}/players/{playerId}
      const pathParts = doc.ref.path.split("/");
      const tournamentId = pathParts[1];

      console.log("🎯 [getUserRegisteredTournaments] 解析路徑:", {
        path: doc.ref.path,
        pathParts,
        tournamentId,
      });

      try {
        const tournament = await getTournament(tournamentId);

        console.log(" [getUserRegisteredTournaments] 載入賽事成功:", {
          tournamentId,
          tournamentName: tournament?.name,
          status: tournament?.status,
        });

        return {
          player: {
            id: doc.id,
            ...doc.data(),
          } as Player,
          tournament,
          tournamentId,
        };
      } catch (error) {
        console.error(
          `[getUserRegisteredTournaments] 載入賽事失敗 ${tournamentId}:`,
          error
        );
        return null;
      }
    })
  );

  // 過濾掉加載失敗的賽事
  const validRegistrations = registrations.filter(
    (r): r is NonNullable<typeof r> => r !== null && r.tournament !== null
  );

  console.log(" [getUserRegisteredTournaments] 最終結果:", {
    total: validRegistrations.length,
    registrations: validRegistrations.map((r) => ({
      tournamentId: r.tournamentId,
      name: r.tournament.name,
      status: r.tournament.status,
      playerStatus: r.player.status,
    })),
  });

  return validRegistrations;
};
