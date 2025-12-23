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
  Timestamp,
  serverTimestamp,
  onSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Tournament } from "../types";
import { generateBracket } from "./bracketService";
import { createNotification } from "./notificationService";

/**
 * Helper function to remove undefined values from object
 */
const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
};

/**
 * Helper function to remove duplicate tournaments by id
 */
const uniqueTournaments = (tournaments: Tournament[]): Tournament[] => {
  const tournamentMap = new Map<string, Tournament>();

    tournaments.forEach((tournament) => {
    if (tournamentMap.has(tournament.id)) {
      console.warn(
        `Duplicate tournament detected and removed: ${tournament.id} - ${tournament.name}`
      );
    } else {
      tournamentMap.set(tournament.id, tournament);
    }
  });

  return Array.from(tournamentMap.values());
};

/**
 * 建立新賽事
 */
export const createTournament = async (
  tournamentData: Omit<Tournament, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  // Remove undefined values to avoid Firestore error
  const cleanData = removeUndefined({
    ...tournamentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const docRef = await addDoc(collection(db, "tournaments"), cleanData);
  return docRef.id;
};

/**
 * 補充賽事的發布者資訊（從 users 集合查詢）
 */
const enrichTournamentWithOrganizerInfo = async (
  tournament: Tournament
): Promise<Tournament> => {
  // 如果已經有發布者資訊，直接返回
  if (tournament.organizerName && tournament.organizerPhotoURL) {
    return tournament;
  }

  // 如果沒有發布者資訊，從 users 集合查詢
  try {
    const userRef = doc(db, "users", tournament.organizerId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        ...tournament,
        organizerName: userData.displayName || userData.email || "匿名主辦方",
        organizerPhotoURL: userData.photoURL || undefined,
      };
    }
  } catch (error) {
    console.error("Failed to fetch organizer info:", error);
  }

  return tournament;
};

/**
 * 獲取單一賽事
 */
export const getTournament = async (
  tournamentId: string
): Promise<Tournament | null> => {
  const docRef = doc(db, "tournaments", tournamentId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const tournament = {
    id: docSnap.id,
    ...docSnap.data(),
  } as Tournament;

  // 補充發布者資訊
  return await enrichTournamentWithOrganizerInfo(tournament);
};

/**
 * 更新賽事資料
 */
export const updateTournament = async (
  tournamentId: string,
  updates: Partial<Omit<Tournament, "id" | "createdAt">>
): Promise<void> => {
  const docRef = doc(db, "tournaments", tournamentId);

  // Remove undefined values
  const cleanUpdates = removeUndefined({
    ...updates,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(docRef, cleanUpdates);
};

/**
 * 批量補充賽事的發布者資訊
 */
const enrichTournamentsWithOrganizerInfo = async (
  tournaments: Tournament[]
): Promise<Tournament[]> => {
  // 找出需要補充資訊的賽事及其 organizerId
  const tournamentsNeedingInfo = tournaments.filter(
    (t) => !t.organizerName || !t.organizerPhotoURL
  );
  
  if (tournamentsNeedingInfo.length === 0) {
    return tournaments;
  }

  // 獲取所有唯一的 organizerId
  const organizerIds = Array.from(
    new Set(tournamentsNeedingInfo.map((t) => t.organizerId))
  );

  // 批量查詢 users
  const organizerMap = new Map<string, { name: string; photoURL?: string }>();
  
  for (const organizerId of organizerIds) {
    try {
      const userRef = doc(db, "users", organizerId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        organizerMap.set(organizerId, {
          name: userData.displayName || userData.email || "匿名主辦方",
          photoURL: userData.photoURL || undefined,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch organizer info for ${organizerId}:`, error);
    }
  }

  // 補充資訊到賽事中
  return tournaments.map((tournament) => {
    if (tournament.organizerName && tournament.organizerPhotoURL) {
      return tournament;
    }

    const organizerInfo = organizerMap.get(tournament.organizerId);
    if (organizerInfo) {
      return {
        ...tournament,
        organizerName: organizerInfo.name,
        organizerPhotoURL: organizerInfo.photoURL,
      };
    }

    return tournament;
  });
};

/**
 * 獲取賽事列表（帶篩選）
 */
export const getTournaments = async (filters?: {
  sportType?: string;
  sportId?: string;
  status?: string[];
  organizerId?: string;
}): Promise<Tournament[]> => {
  const constraints: QueryConstraint[] = [];

  if (filters?.sportId) {
    constraints.push(where("sportId", "==", filters.sportId));
  } else if (filters?.sportType) {
    // 向下相容舊的 sportType 篩選
    constraints.push(where("sportType", "==", filters.sportType));
  }

  if (filters?.status && filters.status.length > 0) {
    constraints.push(where("status", "in", filters.status));
  }

  if (filters?.organizerId) {
    constraints.push(where("organizerId", "==", filters.organizerId));
  }

  constraints.push(orderBy("date", "desc"));

  const q = query(collection(db, "tournaments"), ...constraints);
  const querySnapshot = await getDocs(q);

  const tournaments = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Tournament[];

  // Ensure no duplicates
  const uniqueTourns = uniqueTournaments(tournaments);
  
  // 補充發布者資訊
  return await enrichTournamentsWithOrganizerInfo(uniqueTourns);
};

/**
 * 即時監聽賽事變化
 */
export const subscribeTournament = (
  tournamentId: string,
  callback: (tournament: Tournament | null) => void
) => {
  const docRef = doc(db, "tournaments", tournamentId);
  return onSnapshot(docRef, async (docSnap) => {
    if (docSnap.exists()) {
      const tournament = {
        id: docSnap.id,
        ...docSnap.data(),
      } as Tournament;
      
      // 補充發布者資訊
      const enrichedTournament = await enrichTournamentWithOrganizerInfo(tournament);
      callback(enrichedTournament);
    } else {
      callback(null);
    }
  });
};

/**
 * 即時監聽賽事列表變化
 */
export const subscribeTournaments = (
  filters: {
    sportType?: string;
    sportId?: string;
    status?: string[];
    organizerId?: string;
  },
  callback: (tournaments: Tournament[]) => void
) => {
  const constraints: QueryConstraint[] = [];

  if (filters.sportId) {
    constraints.push(where("sportId", "==", filters.sportId));
  } else if (filters.sportType) {
    // 向下相容舊的 sportType 篩選
    constraints.push(where("sportType", "==", filters.sportType));
  }

  if (filters.status && filters.status.length > 0) {
    constraints.push(where("status", "in", filters.status));
  }

  if (filters.organizerId) {
    constraints.push(where("organizerId", "==", filters.organizerId));
  }

  constraints.push(orderBy("date", "desc"));

  const q = query(collection(db, "tournaments"), ...constraints);

  return onSnapshot(q, async (querySnapshot) => {
    const tournaments = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Tournament[];

    // Ensure no duplicates
    const uniqueTourns = uniqueTournaments(tournaments);
    
    // 補充發布者資訊
    const enrichedTournaments = await enrichTournamentsWithOrganizerInfo(uniqueTourns);
    
    callback(enrichedTournaments);
  });
};

/**
 * 更新賽事狀態
 */
export const updateTournamentStatus = async (
  tournamentId: string,
  status: Tournament["status"]
): Promise<void> => {
  await updateTournament(tournamentId, { status });
};

/**
 * 判斷賽事狀態（根據報名截止日期和其他條件）
 * @deprecated 請使用新的五階段狀態機
 */
export const calculateTournamentStatus = (
  tournament: Tournament
): Tournament["status"] => {
  const now = Timestamp.now();

  // 如果已經是結束狀態，保持不變
  if (tournament.status === "COMPLETED") {
    return "COMPLETED";
  }

  // 如果正在直播，保持狀態
  if (tournament.status === "ONGOING") {
    return "ONGOING";
  }

  // 如果已經截止報名
  if (tournament.status === "REGISTRATION_CLOSED") {
    return "REGISTRATION_CLOSED";
  }

  // 向下相容：如果有舊的 registrationDeadline，使用它
  if (tournament.registrationDeadline) {
    if (now.toMillis() < tournament.registrationDeadline.toMillis()) {
      return "REGISTRATION_OPEN";
    }
    return "REGISTRATION_CLOSED";
  }

  // 新架構：沒有報名截止日期，由主辦方手動控制狀態
  return tournament.status;
};

/**
 * 狀態轉換函數 - 驗證狀態轉換合法性
 */
export const transitionTournamentStatus = async (
  tournamentId: string,
  fromStatus: Tournament["status"],
  toStatus: Tournament["status"]
): Promise<void> => {
  // 定義合法的狀態轉換
  const validTransitions: Record<string, string[]> = {
    DRAFT: ["REGISTRATION_OPEN", "CANCELLED"],
    REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "DRAFT", "CANCELLED"],
    REGISTRATION_CLOSED: ["ONGOING", "REGISTRATION_OPEN", "CANCELLED"],
    ONGOING: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };

  if (!validTransitions[fromStatus]?.includes(toStatus)) {
    throw new Error(`Invalid state transition: ${fromStatus} -> ${toStatus}`);
  }

  await updateTournament(tournamentId, { status: toStatus });
};

/**
 * 開放報名
 */
export const openRegistration = async (tournamentId: string): Promise<void> => {
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  await transitionTournamentStatus(
    tournamentId,
    tournament.status,
    "REGISTRATION_OPEN"
  );
};

/**
 * 截止報名
 */
export const closeRegistration = async (
  tournamentId: string
): Promise<void> => {
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  await transitionTournamentStatus(
    tournamentId,
    tournament.status,
    "REGISTRATION_CLOSED"
  );
};

/**
 * 檢查分類狀態並自動轉換賽事為 ONGOING
 * 當任何一個分類發布賽程後，自動將賽事狀態設為進行中
 */
export const checkAndTransitionToOngoing = async (
  tournamentId: string
): Promise<void> => {
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  // 只有在 REGISTRATION_CLOSED 狀態才能轉換為 ONGOING
  if (tournament.status === "REGISTRATION_CLOSED") {
    await transitionTournamentStatus(
      tournamentId,
      tournament.status,
      "ONGOING"
    );
    console.log(`Tournament ${tournamentId} status changed to ONGOING`);
  }
};

/**
 * 結束賽事
 */
export const completeTournament = async (
  tournamentId: string
): Promise<void> => {
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (tournament.status !== "ONGOING") {
    throw new Error("只有進行中的賽事可以結束");
  }

  await transitionTournamentStatus(
    tournamentId,
    tournament.status,
    "COMPLETED"
  );
};

/**
 * 取消賽事
 */
export const cancelTournament = async (
  tournamentId: string
): Promise<void> => {
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (tournament.status === "COMPLETED" || tournament.status === "CANCELLED") {
    throw new Error("已結束或已取消的賽事無法再次取消");
  }

  await transitionTournamentStatus(
    tournamentId,
    tournament.status,
    "CANCELLED"
  );

  // 發送取消通知給所有已確認且有 uid 的選手
  try {
    const { getConfirmedPlayers } = await import("./registrationService");
    const confirmedPlayers = await getConfirmedPlayers(tournamentId);

    const notificationPromises = confirmedPlayers
      .filter((player) => player.uid) // 只通知有 uid 的選手（排除影子帳號）
      .map((player) =>
        createNotification({
          userId: player.uid!,
          type: "TOURNAMENT_CANCELLED",
          title: "賽事已取消",
          message: `很抱歉，【${tournament.name}】已被主辦方取消`,
          isRead: false,
          relatedData: { tournamentId },
          actions: [
            {
              label: "查看詳情",
              type: "secondary",
              path: `/events/${tournamentId}`,
            },
          ],
        })
      );

    await Promise.all(notificationPromises);
    console.log(`Sent ${notificationPromises.length} tournament cancelled notifications`);
  } catch (error) {
    console.error("Failed to send cancellation notifications:", error);
    // 不影響取消流程
  }
};

/**
 * 發布賽程 (關鍵函數)
 * 執行二階段發布機制：更新參賽者名單、執行抽籤算法、狀態轉換
 * @deprecated 使用新的 Category-based 發布流程。此函數僅保留向下兼容。
 */
export const publishTournament = async (
  tournamentId: string,
  selectedPlayers: Array<{ id: string; uid?: string; name: string }>,
  courts: { id: string; name: string }[]
): Promise<void> => {
  const tournament = await getTournament(tournamentId);
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  if (selectedPlayers.length < 2) {
    throw new Error("至少需要 2 位參賽者才能發布賽程");
  }

  // 檢查是否為新架構（有 stats.totalCategories）
  if (tournament.stats?.totalCategories && tournament.stats.totalCategories > 0) {
    throw new Error(
      "此賽事使用新的三層架構，請到各個分類中分別發布賽程。舊的統一發布功能不適用於新架構。"
    );
  }

  // 舊架構向下兼容邏輯
  const selectedPlayerIds = selectedPlayers.map((p) => p.uid || p.id);

  // 1. 更新 selectedPlayerIds
  await updateTournament(tournamentId, { selectedPlayerIds });

  // 2. 執行抽籤算法（傳入完整選手資料）
  // 注意：這裡需要 format 和 config，但新架構的 tournament 沒有這些欄位
  // 如果是舊賽事才會有，新賽事會在上面的檢查中被阻止
  const format = (tournament as any).format || "SINGLE_ELIM";
  const config = (tournament as any).config || {
    enableThirdPlaceMatch: false,
    pointsPerSet: 21,
  };

  await generateBracket(
    tournamentId,
    selectedPlayers,
    courts,
    format,
    config
  );

  // 3. 狀態轉換
  await transitionTournamentStatus(tournamentId, tournament.status, "ONGOING");

  // 4. 發送賽程發布通知給所有已確認選手
  try {
    const { getConfirmedPlayers } = await import("./registrationService");
    const confirmedPlayers = await getConfirmedPlayers(tournamentId);

    const notificationPromises = confirmedPlayers
      .filter((player) => player.uid) // 只通知有 uid 的選手
      .map((player) =>
        createNotification({
          userId: player.uid!,
          type: "SCHEDULE_PUBLISHED",
          title: "賽程已發布",
          message: `【${tournament.name}】的賽程已發布，快來查看你的比賽時間！`,
          isRead: false,
          relatedData: { tournamentId },
          actions: [
            {
              label: "查看賽程",
              type: "primary",
              path: `/events/${tournamentId}`,
            },
          ],
        })
      );

    await Promise.all(notificationPromises);
    console.log(
      `Tournament ${tournamentId} published and ${notificationPromises.length} notifications sent`
    );
  } catch (error) {
    console.error("Failed to send schedule notifications:", error);
    // 不影響發布流程
  }
};
