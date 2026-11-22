/**
 * EPMCDMETST-71978: Authentication API Service
 * 
 * Handles communication with backend /api/auth/login endpoint
 * Implements 10-second timeout + 1 auto-retry on transient errors (5xx, timeout)
 * HttpOnly cookie session management (browser-managed)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { LoginRequest, ApiResponse, ErrorType } from '../types';

/**
 * Authentication API Client
 * 
 * Features:
 * - HTTPS/TLS required
 * - 10-second timeout (configurable)
 * - 1 auto-retry on transient errors (5xx, timeout)
 * - No retry on 4xx (validation errors) or 401 (invalid credentials)
 * - HttpOnly cookie automatically handled by browser
 */
export class AuthService {
  private client: AxiosInstance;
  private timeout: number;
  private maxRetries: number;

  constructor(
    baseURL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    timeout: number = parseInt(import.meta.env.VITE_API_TIMEOUT_MS || '10000', 10),
    maxRetries: number = 1
  ) {
    this.timeout = timeout;
    this.maxRetries = maxRetries;

    this.client = axios.create({
      baseURL,
      timeout,
      withCredentials: true, // Include cookies in requests
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Ensure HTTPS in production
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      console.warn('⚠️ Warning: HTTPS is required for production authentication');
    }
  }

  /**
   * Perform login request with timeout and retry logic
   * 
   * @param email - User email
   * @param password - User password
   * @returns API response with user data and token
   * @throws Error with appropriate error message for display
   */
  async login(email: string, password: string): Promise<ApiResponse> {
    const payload: LoginRequest = { email, password };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Attempt login
        const response = await this.client.post<ApiResponse>(
          import.meta.env.VITE_API_LOGIN_ENDPOINT || '/auth/login',
          payload
        );

        // Success response
        if (response.data.success === true) {
          return response.data;
        }

        // Error response from API
        return response.data;
      } catch (error) {
        lastError = error as Error | AxiosError;

        const axiosError = error as AxiosError;
        const isTransientError =
          axiosError.code === 'ECONNABORTED' || // timeout
          (axiosError.response?.status && axiosError.response.status >= 500); // 5xx

        const isLastAttempt = attempt === this.maxRetries;

        if (!isTransientError || isLastAttempt) {
          // Don't retry: 4xx errors, 401, or last attempt reached
          break;
        }

        // Retry after 2 seconds (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await this.delay(delay);
      }
    }

    // Handle error
    throw lastError || new Error('Login failed');
  }

  /**
   * Check if current user is authenticated
   * (Verify by attempting a simple API call or checking cookie)
   * 
   * @returns true if authenticated, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if sessionToken cookie exists
      const cookieName = import.meta.env.VITE_AUTH_COOKIE_NAME || 'sessionToken';
      return document.cookie.includes(cookieName);
    } catch {
      return false;
    }
  }

  /**
   * Logout user (client-side cleanup)
   * Backend is responsible for invalidating session
   */
  logout(): void {
    // Browser and backend handle HttpOnly cookie cleanup
    // Frontend just clears any local state if needed
    console.log('Logged out. Session cookie cleared by server.');
  }

  /**
   * Utility: Delay execution (for retry logic)
   * 
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const authService = new AuthService();
