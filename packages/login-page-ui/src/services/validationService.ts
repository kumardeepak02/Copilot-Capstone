/**
 * EPMCDMETST-71978: Email & Password Validation Service
 * 
 * Implements RFC 5322 basic email format validation
 * and NIST SP 800-63B password requirements (8-char minimum)
 */

import { ValidationError, ValidationResult, ErrorType } from '../types';

/**
 * Email validation using RFC 5322 basic format
 * Pattern: local@domain
 * 
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  // RFC 5322 basic pattern: local-part@domain
  const rfc5322Pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return rfc5322Pattern.test(email.trim());
};

/**
 * Email validation with error message
 * 
 * @param email - Email address to validate
 * @returns ValidationError or null if valid
 */
export const validateEmailField = (email: string): ValidationError | null => {
  const trimmed = email.trim();
  
  if (!trimmed) {
    return {
      field: 'email',
      message: 'Email is required',
    };
  }
  
  if (!validateEmail(trimmed)) {
    return {
      field: 'email',
      message: 'Please enter a valid email address (e.g., user@example.com)',
    };
  }
  
  return null;
};

/**
 * Password validation - minimum 8 characters (NIST SP 800-63B)
 * 
 * @param password - Password to validate
 * @returns true if valid, false otherwise
 */
export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

/**
 * Password validation with error message
 * 
 * @param password - Password to validate
 * @returns ValidationError or null if valid
 */
export const validatePasswordField = (password: string): ValidationError | null => {
  if (!password) {
    return {
      field: 'password',
      message: 'Password is required',
    };
  }
  
  if (!validatePassword(password)) {
    return {
      field: 'password',
      message: 'Password must be at least 8 characters',
    };
  }
  
  return null;
};

/**
 * Validate entire form (both email and password)
 * 
 * @param email - Email address
 * @param password - Password
 * @returns ValidationResult with errors array
 */
export const validateLoginForm = (
  email: string,
  password: string
): ValidationResult => {
  const errors: ValidationError[] = [];
  
  const emailError = validateEmailField(email);
  if (emailError) {
    errors.push(emailError);
  }
  
  const passwordError = validatePasswordField(password);
  if (passwordError) {
    errors.push(passwordError);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Get password strength indicator (optional feature)
 * 
 * @param password - Password to check
 * @returns Strength level: 'weak' | 'fair' | 'good' | 'strong'
 */
export const getPasswordStrength = (
  password: string
): 'weak' | 'fair' | 'good' | 'strong' => {
  if (!password) return 'weak';
  if (password.length < 8) return 'weak';
  if (password.length < 12) return 'fair';
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  const strengthScore = [
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
  ].filter(Boolean).length;
  
  if (strengthScore <= 2) return 'good';
  if (strengthScore === 3) return 'strong';
  return 'strong';
};
