import React from 'react';
import { ButtonProps } from './Button.types';
import styles from './Button.module.css';

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  'aria-label': ariaLabel,
  'aria-disabled': ariaDisabled,
  className,
}) => {
  const isDisabledOrLoading = disabled || isLoading;
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabledOrLoading) {
      onClick();
    }
  };

  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    isDisabledOrLoading ? styles.loading : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      disabled={isDisabledOrLoading}
      aria-label={ariaLabel}
      aria-disabled={isDisabledOrLoading}
      aria-busy={isLoading}
    >
      {isLoading && <span className={styles.spinner} aria-hidden="true" />}
      {children || label}
    </button>
  );
};

export default Button;
