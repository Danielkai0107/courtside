import React from 'react';
import { useRoleSwitch } from '../../contexts/RoleSwitchContext';
import styles from './RoleSwitchTransition.module.scss';
import clsx from 'clsx';

const RoleSwitchTransition: React.FC = () => {
  const { isTransitioning, transitionText } = useRoleSwitch();

  if (!isTransitioning) return null;

  return (
    <div className={clsx(styles.overlay, isTransitioning && styles.active)}>
      <div className={styles.content}>
        <div className={styles.spinner}>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerRing}></div>
        </div>
        <p className={styles.text}>{transitionText}</p>
      </div>
    </div>
  );
};

export default RoleSwitchTransition;

