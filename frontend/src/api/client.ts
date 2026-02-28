/**
 * API Client Configuration
 * Handles all HTTP requests to the backend API
 */
import { forceRelogin, shouldForceRelogin } from '../utils/authGuard';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '../utils/apiErrorMessages';
import { hasMeaningfulValue, shouldAllowEmptyBody, validateRequestPayload } from '../lib/requestValidation';

// API base URL from Vite env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  params?: Record<string, any>;
  allowEmptyBody?: boolean;
}

type RequestConfig = boolean | RequestOptions;

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get auth token from localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Set auth token to localStorage
   */
  setToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  /**
   * Remove auth token from localStorage
   */
  removeToken(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = false, headers = {}, params, allowEmptyBody: _allowEmptyBody, ...restOptions } = options;

    const queryString = params
      ? `?${new URLSearchParams(
          Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => [key, String(value)]),
        ).toString()}`
      : '';

    const config: RequestInit = {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    // If local token exists and caller did not provide Authorization, attach it.
    // This keeps public endpoints public while allowing backend logs to resolve operator.
    const token = this.getToken();
    const hasAuthorization = Boolean((config.headers as Record<string, string>)['Authorization']);
    if (token && !hasAuthorization) {
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // For explicitly protected routes, no token means request should fail as before.
    if (requiresAuth && !token) {
      forceRelogin();
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}${queryString}`, config);

      if (shouldForceRelogin(response.status)) {
        forceRelogin();
      }

      // Handle non-OK responses
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({
          detail: response.statusText,
        }));
        if (shouldForceRelogin(response.status, errorPayload?.detail ?? errorPayload)) {
          forceRelogin();
        }
        const message = getApiErrorMessageFromPayload(errorPayload, response.status, 'Request failed');
        throw new Error(message);
      }

      // Return JSON response
      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw new Error(getApiErrorMessage(error, 'Request failed'));
    }
  }

  /**
   * Refresh access token
   */
  /**
   * GET request
   */
  async get<T>(endpoint: string, config: RequestConfig = false): Promise<T> {
    const normalized: RequestOptions = typeof config === 'boolean' ? { requiresAuth: config } : config;
    return this.request<T>(endpoint, {
      method: 'GET',
      ...normalized,
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    config: RequestConfig = false
  ): Promise<T> {
    const normalized: RequestOptions = typeof config === 'boolean' ? { requiresAuth: config } : config;
    const allowEmptyBody = Boolean(normalized.allowEmptyBody)
      || shouldAllowEmptyBody('POST', endpoint)
      || ((data === undefined || data === null) && hasMeaningfulValue(normalized.params));
    validateRequestPayload(data, {
      context: `POST ${endpoint}`,
      allowEmptyBody,
      method: 'POST',
      path: endpoint,
    });

    const requestOptions: RequestOptions = {
      method: 'POST',
      ...normalized,
    };

    if (data !== undefined && data !== null) {
      requestOptions.body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, requestOptions);
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    config: RequestConfig = false
  ): Promise<T> {
    const normalized: RequestOptions = typeof config === 'boolean' ? { requiresAuth: config } : config;
    const allowEmptyBody = Boolean(normalized.allowEmptyBody)
      || shouldAllowEmptyBody('PUT', endpoint)
      || ((data === undefined || data === null) && hasMeaningfulValue(normalized.params));
    validateRequestPayload(data, {
      context: `PUT ${endpoint}`,
      allowEmptyBody,
      method: 'PUT',
      path: endpoint,
    });

    const requestOptions: RequestOptions = {
      method: 'PUT',
      ...normalized,
    };

    if (data !== undefined && data !== null) {
      requestOptions.body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, requestOptions);
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    config: RequestConfig = false
  ): Promise<T> {
    const normalized: RequestOptions = typeof config === 'boolean' ? { requiresAuth: config } : config;
    const allowEmptyBody = Boolean(normalized.allowEmptyBody)
      || shouldAllowEmptyBody('PATCH', endpoint)
      || ((data === undefined || data === null) && hasMeaningfulValue(normalized.params));
    validateRequestPayload(data, {
      context: `PATCH ${endpoint}`,
      allowEmptyBody,
      method: 'PATCH',
      path: endpoint,
    });

    const requestOptions: RequestOptions = {
      method: 'PATCH',
      ...normalized,
    };

    if (data !== undefined && data !== null) {
      requestOptions.body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, requestOptions);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config: RequestConfig = false): Promise<T> {
    const normalized: RequestOptions = typeof config === 'boolean' ? { requiresAuth: config } : config;
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...normalized,
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient(API_BASE_URL);
export default apiClient;
