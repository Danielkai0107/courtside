import React, { useState, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './AvatarWithSkeleton.module.scss';

interface AvatarWithSkeletonProps {
  src?: string;
  alt: string;
  size?: number; // 尺寸（像素）
  className?: string;
  fallbackIcon?: ReactNode; // 當沒有圖片時顯示的圖標
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 帶有骨架加載動畫的頭像組件
 * 支援圓形頭像的骨架加載
 */
const AvatarWithSkeleton: React.FC<AvatarWithSkeletonProps> = ({
  src,
  alt,
  size = 44,
  className,
  fallbackIcon,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // 如果沒有 src 或者有錯誤，顯示 fallback
  const showFallback = !src || hasError;

  return (
    <div
      className={clsx(styles.avatarContainer, className)}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* 骨架加載動畫 */}
      {isLoading && src && !hasError && (
        <div className={styles.skeleton} />
      )}

      {/* Fallback 圖標或文字 */}
      {showFallback && (
        <div className={styles.fallback}>
          {fallbackIcon}
        </div>
      )}

      {/* 實際圖片 */}
      {src && !showFallback && (
        <img
          src={src}
          alt={alt}
          className={clsx(styles.image, {
            [styles.loaded]: !isLoading,
          })}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default AvatarWithSkeleton;

