/**
 * API Client Configuration
 * Handles all HTTP requests to the backend API
 */

// API base URL from Vite env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  params?: Record<string, any>;
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
    options: RequestOptions = {},
    allowRetry: boolean = true
  ): Promise<T> {
    const { requiresAuth = false, headers = {}, params, ...restOptions } = options;

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
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}${queryString}`, config);

      if (response.status === 401 && requiresAuth && allowRetry) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          (config.headers as Record<string, string>)['Authorization'] = `Bearer ${refreshed}`;
          return this.request<T>(endpoint, options, false);
        }
        this.removeToken();
      }

      // Handle non-OK responses
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: response.statusText,
        }));
        throw new Error(error.detail || 'Request failed');
      }

      // Return JSON response
      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        return data.access_token as string;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return null;
  }

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
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...normalized,
    });
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
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...normalized,
    });
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
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...normalized,
    });
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
