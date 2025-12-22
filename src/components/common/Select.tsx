import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.scss';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  fullWidth = true,
  className,
  id,
  onChange,
  ...props
}) => {
  const selectId = id || `select-${label?.replace(/\s/g, '-').toLowerCase()}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={clsx(styles.selectGroup, fullWidth && styles.fullWidth, className)}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select
          id={selectId}
          className={clsx(styles.select, error && styles.error)}
          onChange={handleChange}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className={styles.icon} size={20} />
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default Select;

