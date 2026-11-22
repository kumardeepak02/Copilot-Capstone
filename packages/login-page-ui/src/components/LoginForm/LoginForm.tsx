/**
 * EPMCDMETST-71978: Login Form Component
 * 
 * Main authentication form with email/password inputs
 * Implements client-side validation, API integration, timeout/retry, and error handling
 * 
 * Features:
 * - Email validation (RFC 5322)
 * - Password validation (8-char minimum)
 * - 10-second timeout + 1 auto-retry
 * - HttpOnly cookie session management
 * - 8 error message types (no system details, no user enumeration)
 * - Full keyboard navigation and WCAG 2.1 AA accessibility
 * - Loading states and error recovery
 */

import React, { useState, useCallback } from 'react';
import { LoginFormProps, FormState, User } from '../../types';
import { validateLoginForm } from '../../services/validationService';
import { authService } from '../../services/authService';
import { errorService, ErrorType } from '../../services/errorService';
import { InputField } from '../InputField/InputField';
import { ErrorDisplay } from '../ErrorDisplay/ErrorDisplay';
import './LoginForm.module.scss';

/**
 * LoginForm Component
 * 
 * @param props - LoginFormProps
 * @returns JSX element
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onError,
  redirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL || '/dashboard',
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
}) => {
  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    isLoading: false,
    error: null,
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPasswordToggle] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Validate form on blur
   */
  const handleBlur = useCallback(
    (field: 'email' | 'password') => {
      const validation = validateLoginForm(formState.email, formState.password);
      const fieldErrors = validation.errors
        .filter((e) => e.field === field)
        .map((e) => e.message);

      if (fieldErrors.length === 0) {
        setValidationErrors((prev) =>
          prev.filter((e) => !e.includes('email') && !e.includes('password'))
        );
      }
    },
    [formState.email, formState.password]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side validation
    const validation = validateLoginForm(formState.email, formState.password);
    if (!validation.valid) {
      setValidationErrors(validation.errors.map((e) => e.message));
      return;
    }

    // Clear previous errors
    setValidationErrors([]);
    setFormState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Attempt login with timeout and retry
      const response = await authService.login(formState.email, formState.password);

      if (response.success === true) {
        // Success
        const user: User = response.data.user;
        
        // Notify parent component
        if (onSubmit) {
          onSubmit(user);
        }

        // Redirect to dashboard
        window.location.href = redirectUrl;
      } else {
        // API error response
        const errorType = errorService.mapApiResponseToErrorType(response);
        const errorMessage = errorService.getErrorMessage(errorType);
        
        setValidationErrors([errorMessage]);
        setFormState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));

        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (error: any) {
      // Network or timeout error
      let errorMessage = 'An error occurred. Please try again.';
      const isTimeout = error.code === 'ECONNABORTED';
      const isRetryableError = error.response?.status >= 500 || isTimeout;

      if (isRetryableError && retryCount < 1) {
        // Show retry message
        errorMessage = errorService.getErrorMessage(
          ErrorType.NETWORK_TIMEOUT_RETRY
        );
        setRetryCount((prev) => prev + 1);

        // Auto-retry after 2 seconds
        setTimeout(() => {
          handleSubmit(e);
        }, 2000);
      } else {
        // Final error after retries
        if (isTimeout) {
          errorMessage = errorService.getErrorMessage(
            ErrorType.NETWORK_TIMEOUT_FAILED
          );
        } else if (error.response?.status >= 500) {
          errorMessage = errorService.getErrorMessage(ErrorType.SERVER_ERROR);
        } else {
          const errorType = errorService.extractErrorType(error);
          errorMessage = errorService.getErrorMessage(errorType);
        }

        setValidationErrors([errorMessage]);
        setFormState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));

        if (onError) {
          onError(errorMessage);
        }
      }
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
      setRetryCount(0);
    }
  };

  return (
    <div className="login-form-container">
      <div className="login-form-card">
        <h1 className="login-form-title">Login</h1>

        {validationErrors.length > 0 && (
          <ErrorDisplay
            errors={validationErrors}
            visible={true}
            onDismiss={() => setValidationErrors([])}
          />
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <InputField
            type="email"
            name="email"
            label="Email Address"
            value={formState.email}
            error={
              validationErrors.find((e) => e.includes('email')) || undefined
            }
            onChange={(value) =>
              setFormState((prev) => ({ ...prev, email: value }))
            }
            onBlur={() => handleBlur('email')}
            disabled={formState.isLoading}
            required={true}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <InputField
            type="password"
            name="password"
            label="Password"
            value={formState.password}
            error={
              validationErrors.find((e) => e.includes('password')) || undefined
            }
            onChange={(value) =>
              setFormState((prev) => ({ ...prev, password: value }))
            }
            onBlur={() => handleBlur('password')}
            disabled={formState.isLoading}
            required={true}
            placeholder="••••••••"
            autoComplete="current-password"
            showPasswordToggle={showPasswordToggle}
          />

          <button
            type="submit"
            className="submit-button"
            disabled={formState.isLoading}
            aria-busy={formState.isLoading}
          >
            {formState.isLoading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-help-text">
            Secure login • HTTPS encrypted • No password stored locally
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
