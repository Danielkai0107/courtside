import React from "react";
import clsx from "clsx";
import styles from "./Button.module.scss";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  fullWidth?: boolean;
  loading?: boolean;
  size?: "small" | "medium" | "large";
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  fullWidth = false,
  loading = false,
  size = "medium",
  disabled,
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={clsx(
        styles.button,
        styles[variant],
        size && styles[size],
        fullWidth && styles.fullWidth,
        loading && styles.loading,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className={styles.spinner}></span> : children}
    </button>
  );
};

export default Button;
