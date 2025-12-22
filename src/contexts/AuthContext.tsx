import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { syncUserProfile, linkShadowAccounts } from '../services/userService';

// 檢測是否為移動設備
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    let unsubscribeAuth: (() => void) | null = null;

    const initAuth = async () => {
      try {
        // 1. 先處理重定向結果（移動設備）
        const result = await getRedirectResult(auth);
        
        if (result?.user) {
          try {
            await syncUserProfile(result.user);
            await linkShadowAccounts(result.user);
          } catch (syncError) {
            console.error("Error syncing user data:", syncError);
            // 即使同步失敗，也繼續登入流程
          }
        }
      } catch (error: any) {
        console.error("Redirect login error:", error?.code, error?.message);
      }

      // 2. 設置 auth 狀態監聽器
      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!isSubscribed) return;
        
        if (user) {
          try {
            // 確保用戶資料已同步
            await syncUserProfile(user);
            await linkShadowAccounts(user);
          } catch (error) {
            console.error("Error syncing user data:", error);
            // 不影響登入狀態
          }
        }
        
        setCurrentUser(user);
        setLoading(false);
      });
    };

    initAuth();

    return () => {
      isSubscribed = false;
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);

  const login = async () => {
    try {
      // 確保持久化設置為 LOCAL
      await setPersistence(auth, browserLocalPersistence);
      
      // 優先嘗試 popup 方式（更可靠，適用於所有現代瀏覽器）
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (popupError: any) {
        // 如果 popup 被阻擋或失敗，回退到 redirect 方式
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("Login failed", error?.code, error?.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
