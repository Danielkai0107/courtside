import React from 'react';
import clsx from 'clsx';
import styles from './Input.module.scss';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = true,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${label?.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className={clsx(styles.inputGroup, fullWidth && styles.fullWidth, className)}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(styles.input, error && styles.error)}
        {...props}
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default Input;

