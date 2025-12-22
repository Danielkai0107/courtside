import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import styles from './AppLayout.module.scss';

const AppLayout: React.FC = () => {
  return (
    <div className={styles.container}>
      {/* Top Bar can go here */}
      <main className={styles.content}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
