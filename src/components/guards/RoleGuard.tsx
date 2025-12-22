import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../common/Loading';
import type { UserRole } from '../../types';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, requiredRole }) => {
  const { currentUser } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().currentRole as UserRole;
          setCurrentRole(role);
        }
      } catch (error) {
        console.error('Failed to check user role:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [currentUser]);

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentRole !== requiredRole) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
