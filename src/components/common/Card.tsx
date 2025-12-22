import React from 'react';
import clsx from 'clsx';
import styles from './Card.module.scss';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  selectable = false,
  selected = false,
  onClick,
  padding = 'md',
}) => {
  return (
    <div
      className={clsx(
        styles.card,
        selectable && styles.selectable,
        selected && styles.selected,
        styles[`padding-${padding}`],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;

