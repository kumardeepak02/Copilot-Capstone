/**
 * EPMCDMETST-71978: Input Field Component
 * 
 * Reusable input field with validation, error display, and accessibility
 * Supports email and password inputs with optional show/hide toggle
 */

import React, { useState } from 'react';
import { InputFieldProps } from '../../types';
import './InputField.module.scss';

/**
 * InputField Component
 * 
 * @param props - InputFieldProps
 * @returns JSX element
 */
export const InputField: React.FC<InputFieldProps> = ({
  type,
  name,
  label,
  value,
  error,
  helperText,
  onChange,
  onBlur,
  disabled = false,
  required = false,
  placeholder,
  autoComplete,
  showPasswordToggle,
  onShowPasswordChange,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => {
    const newState = !showPassword;
    setShowPassword(newState);
    if (onShowPasswordChange) {
      onShowPasswordChange(newState);
    }
  };

  const inputType =
    type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="input-field">
      <label htmlFor={name} className="input-label">
        {label}
        {required && <span className="required">*</span>}
      </label>

      <div className="input-wrapper">
        <input
          id={name}
          type={inputType}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`input-field-control ${error ? 'is-invalid' : ''}`}
          aria-label={label}
          aria-describedby={error ? `${name}-error` : undefined}
          required={required}
        />

        {type === 'password' && showPasswordToggle !== false && (
          <button
            type="button"
            onClick={handleTogglePassword}
            className="password-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        )}
      </div>

      {error && (
        <div
          id={`${name}-error`}
          className="error-message"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {helperText && !error && (
        <div className="helper-text">{helperText}</div>
      )}
    </div>
  );
};

export default InputField;
