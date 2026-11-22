/**
 * EPMCDMETST-71978: Type Definitions
 * 
 * Complete TypeScript interface definitions for the Login Form application
 */

// Form state
export interface FormState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
}

// Validation
export interface ValidationError {
  field: 'email' | 'password';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
    };
  };
}

export interface LoginErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse = LoginResponse | LoginErrorResponse;

// Error Types (8 types per PENDING-4)
export enum ErrorType {
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NETWORK_TIMEOUT_RETRY = 'NETWORK_TIMEOUT_RETRY',
  NETWORK_TIMEOUT_FAILED = 'NETWORK_TIMEOUT_FAILED',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

// User
export interface User {
  id: string;
  email: string;
}

// Component Props
export interface InputFieldProps {
  type: 'email' | 'password' | 'text';
  name: string;
  label: string;
  value: string;
  error?: string;
  helperText?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  showPasswordToggle?: boolean;
  onShowPasswordChange?: (show: boolean) => void;
}

export interface ErrorDisplayProps {
  errors: string[];
  visible?: boolean;
  onDismiss?: () => void;
}

export interface LoginFormProps {
  onSubmit?: (user: User) => void;
  onError?: (error: string) => void;
  redirectUrl?: string;
  apiBaseUrl?: string;
}

// Configuration
export interface TimeoutConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
}

export interface RequestContext {
  signal?: AbortSignal;
  timeout?: number;
}

// API Client
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
}
