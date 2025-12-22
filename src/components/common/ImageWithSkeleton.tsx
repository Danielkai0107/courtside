import React, { useState } from 'react';
import clsx from 'clsx';
import styles from './ImageWithSkeleton.module.scss';

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  aspectRatio?: string; // e.g., "16/9", "1/1", "3/2"
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 帶有骨架加載動畫的圖片組件
 * 在圖片加載完成前顯示骨架動畫
 */
const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
  src,
  alt,
  className,
  skeletonClassName,
  aspectRatio,
  objectFit = 'cover',
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <div
      className={clsx(styles.imageContainer, className)}
      style={{
        aspectRatio: aspectRatio,
      }}
    >
      {/* 骨架加載動畫 */}
      {isLoading && !hasError && (
        <div className={clsx(styles.skeleton, skeletonClassName)} />
      )}

      {/* 錯誤狀態 */}
      {hasError && (
        <div className={styles.errorPlaceholder}>
          <span>無法載入圖片</span>
        </div>
      )}

      {/* 實際圖片 */}
      <img
        src={src}
        alt={alt}
        className={clsx(styles.image, {
          [styles.loaded]: !isLoading,
          [styles.hidden]: hasError,
        })}
        style={{
          objectFit: objectFit,
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

export default ImageWithSkeleton;

