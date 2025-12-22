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
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Team } from "../types";
import { incrementParticipants, decrementParticipants } from "./categoryService";

/**
 * Helper function to remove undefined values from object
 */
const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
};

/**
 * 創建雙打隊伍
 */
export const createTeam = async (
  tournamentId: string,
  categoryId: string,
  teamData: {
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    player1Email?: string;
    player2Email?: string;
    player1PhotoURL?: string;
    player2PhotoURL?: string;
  }
): Promise<string> => {
  // 檢查是否將自己加為隊友
  if (teamData.player1Id === teamData.player2Id || 
      (teamData.player1Email && teamData.player2Email && 
       teamData.player1Email.toLowerCase() === teamData.player2Email.toLowerCase())) {
    throw new Error("不能將自己加為隊友");
  }

  // 檢查是否已存在相同的隊伍
  const teamsRef = collection(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId,
    "teams"
  );

  const existingQuery = query(
    teamsRef,
    where("player1Id", "==", teamData.player1Id),
    where("player2Id", "==", teamData.player2Id)
  );
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error("此隊伍已報名");
  }

  // 檢查選手是否已在其他隊伍中
  const player1Query = query(
    teamsRef,
    where("player1Id", "==", teamData.player1Id)
  );
  const player2Query = query(
    teamsRef,
    where("player2Id", "==", teamData.player2Id)
  );

  const [player1Snapshot, player2Snapshot] = await Promise.all([
    getDocs(player1Query),
    getDocs(player2Query),
  ]);

  if (!player1Snapshot.empty) {
    throw new Error(`${teamData.player1Name} 已在其他隊伍中`);
  }

  if (!player2Snapshot.empty) {
    throw new Error(`${teamData.player2Name} 已在其他隊伍中`);
  }

  const cleanData = removeUndefined({
    ...teamData,
    tournamentId,
    categoryId,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  const docRef = await addDoc(teamsRef, cleanData);

  // 增加參賽者計數（雙打算 1 組）
  await incrementParticipants(tournamentId, categoryId, 1);

  return docRef.id;
};

/**
 * 獲取單一隊伍
 */
export const getTeam = async (
  tournamentId: string,
  categoryId: string,
  teamId: string
): Promise<Team | null> => {
  const docRef = doc(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId,
    "teams",
    teamId
  );
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Team;
};

/**
 * 獲取 Category 的所有隊伍
 */
export const getTeamsByCategory = async (
  tournamentId: string,
  categoryId: string,
  status?: Team["status"]
): Promise<Team[]> => {
  const teamsRef = collection(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId,
    "teams"
  );

  let q;
  if (status) {
    q = query(teamsRef, where("status", "==", status), orderBy("createdAt", "asc"));
  } else {
    q = query(teamsRef, orderBy("createdAt", "asc"));
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Team[];
};

/**
 * 更新隊伍狀態
 */
export const updateTeamStatus = async (
  tournamentId: string,
  categoryId: string,
  teamId: string,
  status: Team["status"]
): Promise<void> => {
  const docRef = doc(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId,
    "teams",
    teamId
  );

  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 批准隊伍（審核通過）
 */
export const approveTeam = async (
  tournamentId: string,
  categoryId: string,
  teamId: string
): Promise<void> => {
  await updateTeamStatus(tournamentId, categoryId, teamId, "confirmed");
};

/**
 * 拒絕隊伍（審核拒絕）
 */
export const rejectTeam = async (
  tournamentId: string,
  categoryId: string,
  teamId: string
): Promise<void> => {
  await updateTeamStatus(tournamentId, categoryId, teamId, "declined");

  // 減少參賽者計數
  await decrementParticipants(tournamentId, categoryId, 1);
};

/**
 * 刪除隊伍
 */
export const deleteTeam = async (
  tournamentId: string,
  categoryId: string,
  teamId: string
): Promise<void> => {
  const docRef = doc(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId,
    "teams",
    teamId
  );

  await deleteDoc(docRef);

  // 減少參賽者計數
  await decrementParticipants(tournamentId, categoryId, 1);
};

/**
 * 獲取已確認的隊伍列表
 */
export const getConfirmedTeams = async (
  tournamentId: string,
  categoryId: string
): Promise<Team[]> => {
  return getTeamsByCategory(tournamentId, categoryId, "confirmed");
};

/**
 * 檢查用戶是否已在某個 Category 的隊伍中
 */
export const isUserInTeam = async (
  tournamentId: string,
  categoryId: string,
  userId: string
): Promise<boolean> => {
  const teamsRef = collection(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId,
    "teams"
  );

  // 檢查是否為 player1 或 player2
  const player1Query = query(teamsRef, where("player1Id", "==", userId));
  const player2Query = query(teamsRef, where("player2Id", "==", userId));

  const [player1Snapshot, player2Snapshot] = await Promise.all([
    getDocs(player1Query),
    getDocs(player2Query),
  ]);

  return !player1Snapshot.empty || !player2Snapshot.empty;
};

/**
 * 獲取用戶所在的隊伍
 */
export const getUserTeam = async (
  tournamentId: string,
  categoryId: string,
  userId: string
): Promise<Team | null> => {
  const teamsRef = collection(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId,
    "teams"
  );

  // 先查 player1
  const player1Query = query(teamsRef, where("player1Id", "==", userId));
  const player1Snapshot = await getDocs(player1Query);

  if (!player1Snapshot.empty) {
    const doc = player1Snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Team;
  }

  // 再查 player2
  const player2Query = query(teamsRef, where("player2Id", "==", userId));
  const player2Snapshot = await getDocs(player2Query);

  if (!player2Snapshot.empty) {
    const doc = player2Snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Team;
  }

  return null;
};

/**
 * 即時監聽隊伍列表變化
 */
export const subscribeTeams = (
  tournamentId: string,
  categoryId: string,
  callback: (teams: Team[]) => void
) => {
  const teamsRef = collection(
    db,
    "tournaments",
    tournamentId,
    "categories",
    categoryId,
    "teams"
  );
  const q = query(teamsRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, (querySnapshot) => {
    const teams = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Team[];

    callback(teams);
  });
};

/**
 * 獲取隊伍顯示名稱
 */
export const getTeamDisplayName = (team: Team): string => {
  return `${team.player1Name} / ${team.player2Name}`;
};

