/**
 * EPMCDMETST-71978: Validation Service Tests
 * 
 * Unit tests for email (RFC 5322) and password (8-char) validation
 * Target: >80% code coverage
 */

import {
  validateEmail,
  validateEmailField,
  validatePassword,
  validatePasswordField,
  validateLoginForm,
  getPasswordStrength,
} from '../validationService';

describe('ValidationService', () => {
  describe('validateEmail', () => {
    it('should validate valid email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@example.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user space@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(validateEmail('  user@example.com  ')).toBe(true);
    });
  });

  describe('validateEmailField', () => {
    it('should return null for valid email', () => {
      const result = validateEmailField('user@example.com');
      expect(result).toBeNull();
    });

    it('should return error for empty email', () => {
      const result = validateEmailField('');
      expect(result).toEqual({
        field: 'email',
        message: 'Email is required',
      });
    });

    it('should return error for invalid email format', () => {
      const result = validateEmailField('invalid-email');
      expect(result).toEqual({
        field: 'email',
        message: expect.stringContaining('valid email address'),
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate passwords with 8+ characters', () => {
      expect(validatePassword('password')).toBe(true);
      expect(validatePassword('longerpassword')).toBe(true);
      expect(validatePassword('12345678')).toBe(true);
    });

    it('should reject passwords with less than 8 characters', () => {
      expect(validatePassword('pass')).toBe(false);
      expect(validatePassword('1234567')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('validatePasswordField', () => {
    it('should return null for valid password (8+ chars)', () => {
      const result = validatePasswordField('password123');
      expect(result).toBeNull();
    });

    it('should return error for empty password', () => {
      const result = validatePasswordField('');
      expect(result).toEqual({
        field: 'password',
        message: 'Password is required',
      });
    });

    it('should return error for short password', () => {
      const result = validatePasswordField('short');
      expect(result).toEqual({
        field: 'password',
        message: 'Password must be at least 8 characters',
      });
    });
  });

  describe('validateLoginForm', () => {
    it('should return valid=true with no errors when both fields are valid', () => {
      const result = validateLoginForm('user@example.com', 'password123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect multiple errors', () => {
      const result = validateLoginForm('invalid-email', 'short');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.map((e) => e.field)).toContain('email');
      expect(result.errors.map((e) => e.field)).toContain('password');
    });

    it('should return error only for invalid email', () => {
      const result = validateLoginForm('invalid-email', 'password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
    });

    it('should return error only for invalid password', () => {
      const result = validateLoginForm('user@example.com', 'short');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('password');
    });
  });

  describe('getPasswordStrength', () => {
    it('should return weak for empty or short passwords', () => {
      expect(getPasswordStrength('')).toBe('weak');
      expect(getPasswordStrength('short')).toBe('weak');
    });

    it('should return fair for 8-11 character passwords', () => {
      expect(getPasswordStrength('password')).toBe('fair');
    });

    it('should return good for 12+ characters with 2 character types', () => {
      expect(getPasswordStrength('Password123')).toBe('good');
    });

    it('should return strong for 12+ characters with 3+ character types', () => {
      expect(getPasswordStrength('MyP@ssw0rd')).toBe('strong');
    });
  });
});
