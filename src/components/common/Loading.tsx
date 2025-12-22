import React from 'react';
import clsx from 'clsx';
import styles from './Loading.module.scss';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  fullScreen = false,
  text,
  className,
}) => {
  const content = (
    <div className={styles.loadingContent}>
      <div className={clsx(styles.spinner, styles[size])} />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={clsx(styles.fullScreen, className)}>
        {content}
      </div>
    );
  }

  return <div className={clsx(styles.loading, className)}>{content}</div>;
};

export default Loading;

