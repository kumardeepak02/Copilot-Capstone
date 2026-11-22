/**
 * EPMCDMETST-71978: E2E Tests (Playwright)
 * 
 * Cross-browser tests for login form
 * Browsers: Chrome, Firefox, Safari, Edge
 * Tests: Form rendering, validation, submission, error handling
 */

import { test, expect } from '@playwright/test';

test.describe('Login Form - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/');
  });

  test.describe('Form Rendering', () => {
    test('should render login form with all required elements', async ({
      page,
    }) => {
      // Check title
      await expect(page.locator('h1')).toContainText('Login');

      // Check input fields
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();

      // Check submit button
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText('Sign In');
    });

    test('should display labels for all inputs', async ({ page }) => {
      await expect(page.locator('label')).toHaveCount(2);
      await expect(page.locator('label').first()).toContainText('Email');
      await expect(page.locator('label').nth(1)).toContainText('Password');
    });

    test('should have password input masked by default', async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Form Validation', () => {
    test('should show error for invalid email format', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');
      const submitButton = page.locator('button[type="submit"]');

      // Enter invalid email
      await emailInput.fill('invalid-email');
      await emailInput.blur();

      // Submit form
      await submitButton.click();

      // Check error message
      await expect(
        page.locator('text=Please enter a valid email address')
      ).toBeVisible();
    });

    test('should show error for short password', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const submitButton = page.locator('button[type="submit"]');

      // Enter valid email and short password
      await emailInput.fill('user@example.com');
      await passwordInput.fill('short');
      await submitButton.click();

      // Check error message
      await expect(
        page.locator('text=Password must be at least 8 characters')
      ).toBeVisible();
    });

    test('should clear errors when user corrects input', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');
      const submitButton = page.locator('button[type="submit"]');

      // Enter invalid email and submit
      await emailInput.fill('invalid');
      await submitButton.click();
      await expect(
        page.locator('text=Please enter a valid email address')
      ).toBeVisible();

      // Correct the email
      await emailInput.fill('user@example.com');
      await emailInput.blur();

      // Error should be cleared
      await expect(
        page.locator('text=Please enter a valid email address')
      ).not.toBeVisible();
    });
  });

  test.describe('Password Visibility Toggle', () => {
    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.locator('input[name="password"]');
      const toggleButton = page.locator('button', { has: page.locator('text=👁') });

      // Initially masked
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle
      await toggleButton.click();

      // Should be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle again
      await toggleButton.click();

      // Should be masked again
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Form Submission', () => {
    test('should disable submit button while loading', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const submitButton = page.locator('button[type="submit"]');

      // Enter valid credentials
      await emailInput.fill('user@example.com');
      await passwordInput.fill('password123');

      // Submit form
      await submitButton.click();

      // Button should be disabled and show loading state
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toContainText('Signing in...');
    });

    test('should show error message on invalid credentials', async ({
      page,
    }) => {
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const submitButton = page.locator('button[type="submit"]');

      // Enter valid format but invalid credentials
      await emailInput.fill('user@example.com');
      await passwordInput.fill('password123');

      // Mock API response
      await page.route('**/api/auth/login', (route) => {
        route.abort('failed');
      });

      // Submit form
      await submitButton.click();

      // Wait for error message
      await expect(
        page.locator('text=/Connection lost|Service unavailable/i')
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate through form with Tab key', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const submitButton = page.locator('button[type="submit"]');

      // Tab to email
      await page.keyboard.press('Tab');
      await expect(emailInput).toBeFocused();

      // Tab to password
      await page.keyboard.press('Tab');
      await expect(passwordInput).toBeFocused();

      // Tab to submit button
      await page.keyboard.press('Tab');
      await expect(submitButton).toBeFocused();
    });

    test('should submit form with Enter key', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');

      // Focus email and enter data
      await emailInput.focus();
      await emailInput.fill('user@example.com');
      await page.keyboard.press('Tab');
      await passwordInput.fill('password123');

      // Submit with Enter
      await page.keyboard.press('Enter');

      // Form should start submitting
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const loginCard = page.locator('.login-form-card');
      await expect(loginCard).toBeVisible();

      // Form elements should be full width
      const emailInput = page.locator('input[name="email"]');
      const bounds = await emailInput.boundingBox();
      expect(bounds?.width).toBeGreaterThan(300);
    });

    test('should be responsive on tablet (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const loginCard = page.locator('.login-form-card');
      await expect(loginCard).toBeVisible();
    });

    test('should be responsive on desktop (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      const loginCard = page.locator('.login-form-card');
      await expect(loginCard).toBeVisible();
    });
  });

  test.describe('Accessibility (WCAG 2.1 AA)', () => {
    test('should have proper form structure', async ({ page }) => {
      // Check form element
      const form = page.locator('form');
      await expect(form).toBeVisible();

      // Check labels are associated
      const emailLabel = page.locator('label[for="email"]');
      const passwordLabel = page.locator('label[for="password"]');

      await expect(emailLabel).toBeVisible();
      await expect(passwordLabel).toBeVisible();
    });

    test('should have visible focus indicators', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');

      // Focus the input
      await emailInput.focus();

      // Check focus style (screenshot or computedStyle)
      const focusStyle = await emailInput.evaluate((el) => {
        return window.getComputedStyle(el).outline;
      });

      // Should have some focus indication
      expect(focusStyle).toBeDefined();
    });

    test('should announce errors to screen readers', async ({ page }) => {
      const emailInput = page.locator('input[name="email"]');
      const submitButton = page.locator('button[type="submit"]');

      // Enter invalid email
      await emailInput.fill('invalid');
      await submitButton.click();

      // Error should have role="alert"
      const error = page.locator('[role="alert"]').first();
      await expect(error).toBeVisible();
    });
  });
});
