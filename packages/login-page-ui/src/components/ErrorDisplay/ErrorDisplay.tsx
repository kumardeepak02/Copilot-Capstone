/**
 * EPMCDMETST-71978: Error Display Component
 * 
 * Displays validation and API errors with accessibility support
 * Supports multiple simultaneous errors
 */

import React from 'react';
import { ErrorDisplayProps } from '../../types';
import './ErrorDisplay.module.scss';

/**
 * ErrorDisplay Component
 * 
 * @param props - ErrorDisplayProps
 * @returns JSX element
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors,
  visible = true,
  onDismiss,
}) => {
  if (!visible || errors.length === 0) {
    return null;
  }

  return (
    <div
      className="error-display"
      role="region"
      aria-label="Error messages"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="error-container">
        {errors.map((error, index) => (
          <div
            key={index}
            className="error-item"
            role="alert"
            aria-live="assertive"
          >
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        ))}

        {onDismiss && (
          <button
            type="button"
            className="error-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss error messages"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;
