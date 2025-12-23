import { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useRoleSwitch } from '../contexts/RoleSwitchContext';

/**
 * Hook for managing user's preferred sport selection (global preference)
 * This affects all views including Home, Events, and other tournament listings
 */
export const useSportPreference = () => {
  const { currentUser } = useAuth();
  const { startGenericTransition } = useRoleSwitch();
  const [preferredSportId, setPreferredSportId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [needsFirstSelection, setNeedsFirstSelection] = useState(false);

  // Load and subscribe to user's sport preference
  useEffect(() => {
    if (!currentUser) {
      setPreferredSportId('');
      setLoading(false);
      setNeedsFirstSelection(false);
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    
    // Subscribe to changes in user document
    const unsubscribe = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const sportId = data.preferredSportId || '';
          console.log('🏀 [useSportPreference] 載入用戶偏好:', { sportId, needsSelection: !sportId });
          setPreferredSportId(sportId);
          // 如果沒有選擇過項目，顯示首次選擇彈窗
          setNeedsFirstSelection(!sportId);
        } else {
          // 新用戶，需要首次選擇
          console.log('🏀 [useSportPreference] 新用戶，需要首次選擇');
          setPreferredSportId('');
          setNeedsFirstSelection(true);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load sport preference:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // Update user's sport preference in Firestore with animation
  const updateSportPreference = async (sportId: string, sportName?: string) => {
    if (!currentUser) {
      console.warn('Cannot update sport preference: user not logged in');
      return;
    }

    const displayText = sportName || '運動項目';
    
    console.log('🏀 [useSportPreference] 準備更新偏好:', { sportId, sportName });
    
    startGenericTransition(`切換到 ${displayText}...`, async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          preferredSportId: sportId,
        });
        console.log('✅ [useSportPreference] 偏好已保存到 Firestore:', sportId);
        setPreferredSportId(sportId);
        setNeedsFirstSelection(false);
      } catch (error) {
        console.error('❌ [useSportPreference] 保存失敗:', error);
        throw error;
      }
    });
  };

  return {
    preferredSportId,
    updateSportPreference,
    loading,
    needsFirstSelection,
  };
};

