/**
 * EPMCDMETST-71978: Error Message Service
 * 
 * Maps API and validation errors to user-friendly messages
 * Implements 8 error types per PENDING-4 specification
 * 
 * Security: No system details, no user enumeration
 */

import { ErrorType, ApiResponse } from '../types';

/**
 * Error message taxonomy (8 types per PENDING-4)
 */
const errorMessages: Record<ErrorType, string> = {
  [ErrorType.INVALID_EMAIL_FORMAT]:
    'Please enter a valid email address (e.g., user@example.com)',
  
  [ErrorType.PASSWORD_TOO_SHORT]:
    'Password must be at least 8 characters',
  
  [ErrorType.INVALID_CREDENTIALS]:
    'Invalid email or password', // No user enumeration
  
  [ErrorType.NETWORK_TIMEOUT_RETRY]:
    'Connection lost. Retrying your request...',
  
  [ErrorType.NETWORK_TIMEOUT_FAILED]:
    'Connection lost. Please check your internet and try again.',
  
  [ErrorType.SERVER_ERROR]:
    'Service temporarily unavailable. Please try again later.',
  
  [ErrorType.RATE_LIMIT]:
    'Too many login attempts. Please try again in a few minutes.',
  
  [ErrorType.VALIDATION_ERROR]:
    'Please check your email and password and try again.',
};

/**
 * Get user-friendly error message for error type
 * 
 * @param errorType - ErrorType enum value
 * @returns User-friendly error message
 */
export const getErrorMessage = (errorType: ErrorType): string => {
  return errorMessages[errorType] || 'An error occurred. Please try again.';
};

/**
 * Map API response to error type
 * 
 * @param response - API response
 * @returns ErrorType or null if successful
 */
export const mapApiResponseToErrorType = (response: ApiResponse): ErrorType | null => {
  if (response.success === true) {
    return null; // No error
  }

  const errorResponse = response;
  if (errorResponse.code === 'RATE_LIMIT_EXCEEDED') {
    return ErrorType.RATE_LIMIT;
  }

  if (errorResponse.code === 'INVALID_CREDENTIALS') {
    return ErrorType.INVALID_CREDENTIALS;
  }

  if (errorResponse.code === 'VALIDATION_ERROR') {
    return ErrorType.VALIDATION_ERROR;
  }

  // Default to generic error
  return ErrorType.SERVER_ERROR;
};

/**
 * Map HTTP error status to error type
 * 
 * @param status - HTTP status code
 * @param message - Error message
 * @returns ErrorType
 */
export const mapHttpStatusToErrorType = (status: number, message?: string): ErrorType => {
  if (status === 401 || status === 403) {
    return ErrorType.INVALID_CREDENTIALS;
  }

  if (status === 422 || status === 400) {
    return ErrorType.VALIDATION_ERROR;
  }

  if (status === 429) {
    return ErrorType.RATE_LIMIT;
  }

  if (status >= 500) {
    return ErrorType.SERVER_ERROR;
  }

  if (message?.includes('timeout')) {
    return ErrorType.NETWORK_TIMEOUT_FAILED;
  }

  return ErrorType.SERVER_ERROR;
};

/**
 * Map validation error field to error type
 * 
 * @param field - Field name
 * @returns ErrorType
 */
export const mapValidationErrorToType = (field: string): ErrorType => {
  if (field === 'email') {
    return ErrorType.INVALID_EMAIL_FORMAT;
  }

  if (field === 'password') {
    return ErrorType.PASSWORD_TOO_SHORT;
  }

  return ErrorType.VALIDATION_ERROR;
};

/**
 * Format error message for display
 * Combines error type with additional context if available
 * 
 * @param errorType - ErrorType enum
 * @param details - Additional error details (optional)
 * @returns Formatted error message for user
 */
export const formatErrorMessage = (
  errorType: ErrorType,
  details?: string
): string => {
  const baseMessage = getErrorMessage(errorType);

  if (details && errorType === ErrorType.VALIDATION_ERROR) {
    // Add helpful context for validation errors only
    return `${baseMessage} ${details}`;
  }

  return baseMessage;
};

/**
 * Extract error message from Error object
 * 
 * @param error - Error object
 * @returns ErrorType
 */
export const extractErrorType = (error: any): ErrorType => {
  // Timeout error
  if (error.code === 'ECONNABORTED') {
    return ErrorType.NETWORK_TIMEOUT_FAILED;
  }

  // Network error
  if (error.message && error.message.includes('Network')) {
    return ErrorType.NETWORK_TIMEOUT_FAILED;
  }

  // HTTP status
  if (error.response?.status) {
    return mapHttpStatusToErrorType(error.response.status, error.message);
  }

  return ErrorType.SERVER_ERROR;
};

/**
 * Error service for component usage
 */
export const errorService = {
  getErrorMessage,
  mapApiResponseToErrorType,
  mapHttpStatusToErrorType,
  mapValidationErrorToType,
  formatErrorMessage,
  extractErrorType,
};
