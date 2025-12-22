import { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for managing user's preferred sport selection (global preference)
 * This affects all views including Home, Events, and other tournament listings
 */
export const useSportPreference = () => {
  const { currentUser } = useAuth();
  const [preferredSportId, setPreferredSportId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Load and subscribe to user's sport preference
  useEffect(() => {
    if (!currentUser) {
      setPreferredSportId('all');
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    
    // Subscribe to changes in user document
    const unsubscribe = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setPreferredSportId(data.preferredSportId || 'all');
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

  // Update user's sport preference in Firestore
  const updateSportPreference = async (sportId: string) => {
    if (!currentUser) {
      console.warn('Cannot update sport preference: user not logged in');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        preferredSportId: sportId,
      });
      setPreferredSportId(sportId);
    } catch (error) {
      console.error('Failed to update sport preference:', error);
      throw error;
    }
  };

  return {
    preferredSportId,
    updateSportPreference,
    loading,
  };
};

