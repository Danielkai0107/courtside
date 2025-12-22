import React from 'react';
import clsx from 'clsx';
import styles from './SelectableCard.module.scss';

export interface SelectableCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const SelectableCard: React.FC<SelectableCardProps> = ({
  title,
  value,
  subtitle,
  selected = false,
  onClick,
  disabled = false,
}) => {
  return (
    <div
      className={clsx(
        styles.card,
        selected && styles.selected,
        disabled && styles.disabled
      )}
      onClick={disabled ? undefined : onClick}
    >
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.value}>{value}</span>
      </div>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </div>
  );
};

export default SelectableCard;

