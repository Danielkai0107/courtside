import { 
  collection,
  collectionGroup, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types';

/**
 * Creates or updates the user profile in 'users' collection.
 */
export const syncUserProfile = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create new user profile
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp() as any,
      currentRole: 'user',
      preferredSportId: '', // 新用戶預設為空，觸發首次選擇彈窗
    };
    await setDoc(userRef, newProfile);
    console.log('✅ [syncUserProfile] 新用戶資料已創建，需要首次選擇運動項目');
  }
};

/**
 * Searches for 'players' documents that match the user's email and are marked as shadow accounts.
 * Updates them with the real User ID and sets isShadow to false.
 * Also checks for pending staff invitations and creates notifications.
 */
export const linkShadowAccounts = async (user: User) => {
  if (!user.email) return;

  try {
    console.log(`🔗 [linkShadowAccounts] 開始同步影子帳號和邀請: ${user.email}`);

    // 1. Link shadow player accounts
    const playersQuery = query(
      collectionGroup(db, 'players'),
      where('email', '==', user.email),
      where('isShadow', '==', true)
    );

    const playersSnapshot = await getDocs(playersQuery);

    if (!playersSnapshot.empty) {
      const batch = writeBatch(db);

      playersSnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          uid: user.uid,
          isShadow: false,
        });
      });

      await batch.commit();
      console.log(`✅ [linkShadowAccounts] 連結了 ${playersSnapshot.size} 個選手影子帳號`);
    }

    // 2. Link staff invitations and create notifications
    const staffQuery = query(
      collectionGroup(db, 'staff'),
      where('email', '==', user.email),
      where('status', '==', 'invited')
    );

    const staffSnapshot = await getDocs(staffQuery);

    if (!staffSnapshot.empty) {
      console.log(`📧 [linkShadowAccounts] 找到 ${staffSnapshot.size} 個待處理的紀錄員邀請`);

      const batch = writeBatch(db);

      // Import necessary functions
      const { getTournament } = await import('./tournamentService');
      const { createNotification } = await import('./notificationService');

      for (const docSnap of staffSnapshot.docs) {
        const staffData = docSnap.data();
        const pathParts = docSnap.ref.path.split('/');
        const tournamentId = pathParts[1];
        const staffId = docSnap.id;

        // Update staff record with uid
        batch.update(docSnap.ref, {
          uid: user.uid,
          updatedAt: serverTimestamp(),
        });

        // 檢查是否已經通知過，避免重複通知
        const alreadyNotified = staffData.notified === true;
        
        if (!alreadyNotified) {
          // Create notification for this invitation
          try {
            const tournament = await getTournament(tournamentId);
            
            if (tournament) {
              await createNotification({
                userId: user.uid,
                type: 'STAFF_INVITATION',
                title: '收到工作邀請',
                message: `您收到【${tournament.name}】的紀錄員邀請`,
                isRead: false,
                relatedData: { tournamentId, staffId },
                actions: [
                  {
                    label: '接受',
                    type: 'primary',
                    action: 'accept',
                  },
                  {
                    label: '拒絕',
                    type: 'secondary',
                    action: 'decline',
                  },
                ],
              });
              
              // 標記為已通知
              batch.update(docSnap.ref, {
                notified: true,
              });
              
              console.log(`✅ [linkShadowAccounts] 為邀請創建通知: ${tournament.name}`);
            }
          } catch (notifError) {
            console.error(`❌ [linkShadowAccounts] 創建通知失敗:`, notifError);
          }
        } else {
          console.log(`⏭️ [linkShadowAccounts] 跳過已通知的邀請: ${tournamentId}`);
        }
      }

      await batch.commit();
      console.log(`✅ [linkShadowAccounts] 更新了 ${staffSnapshot.size} 個紀錄員邀請`);
    }

  } catch (error) {
    console.error("❌ [linkShadowAccounts] 錯誤:", error);
  }
};

/**
 * Search for a user by email
 */
export const searchUserByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    return {
      uid: userDoc.id,
      ...userDoc.data(),
    } as UserProfile;
  } catch (error) {
    console.error('Error searching user by email:', error);
    return null;
  }
};

/**
 * Get user profile by UID
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return {
      uid: userSnap.id,
      ...userSnap.data(),
    } as UserProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};
