/**
 * API Client Configuration
 * Handles all HTTP requests to the backend API
 */
import { forceRelogin, shouldForceRelogin } from '../utils/authGuard';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '../utils/apiErrorMessages';
import { hasMeaningfulValue, shouldAllowEmptyBody, validateRequestPayload } from '../lib/requestValidation';
import { getApiBaseUrl } from '../utils/assetUrl';

// API base URL from Vite env
const API_BASE_URL = getApiBaseUrl();

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  params?: Record<string, any>;
  allowEmptyBody?: boolean;
  cacheTTL?: number;
  skipCache?: boolean;
  dedupe?: boolean;
  cacheKey?: string;
}

type RequestConfig = boolean | RequestOptions;

class APIClient {
  private baseURL: string;
  private readonly getCache = new Map<string, { data: unknown; expiresAt: number }>();
  private readonly inFlightGet = new Map<string, Promise<unknown>>();
  private readonly defaultGetCacheTTL = 10000;
  private readonly maxGetCacheEntries = 200;

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
    this.clearGetCache();
  }

  /**
   * Remove auth token from localStorage
   */
  removeToken(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.clearGetCache();
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      requiresAuth = false,
      headers = {},
      params,
      allowEmptyBody: _allowEmptyBody,
      cacheTTL = this.defaultGetCacheTTL,
      skipCache = false,
      dedupe = true,
      cacheKey,
      ...restOptions
    } = options;

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
    const method = (config.method || 'GET').toUpperCase();

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

    const requestCacheKey =
      method === 'GET'
        ? (cacheKey || this.buildGetCacheKey(endpoint, queryString, token))
        : '';

    if (method === 'GET' && !skipCache) {
      const cached = this.getCache.get(requestCacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return this.cloneData(cached.data as T);
      }
      if (cached) {
        this.getCache.delete(requestCacheKey);
      }
    }

    if (method === 'GET' && dedupe) {
      const inFlight = this.inFlightGet.get(requestCacheKey);
      if (inFlight) {
        return this.cloneData(await inFlight as T);
      }
    }

    const executeRequest = async (): Promise<T> => {
      const response = await fetch(`${this.baseURL}${endpoint}${queryString}`, config);

      if (shouldForceRelogin(response.status)) {
        forceRelogin();
      }

      // Handle non-OK responses
      if (!response.ok) {
        const errorPayload = await this.parseErrorPayload(response);
        if (shouldForceRelogin(response.status, errorPayload?.detail ?? errorPayload)) {
          forceRelogin();
        }
        const message = getApiErrorMessageFromPayload(errorPayload, response.status, 'Request failed');
        throw new Error(message);
      }

      return this.parseSuccessResponse<T>(response);
    };

    try {
      if (method === 'GET' && dedupe) {
        const pending = executeRequest();
        this.inFlightGet.set(requestCacheKey, pending);
        const result = await pending;
        if (!skipCache && cacheTTL > 0) {
          this.writeGetCache(requestCacheKey, result, cacheTTL);
        }
        return this.cloneData(result);
      }

      const result = await executeRequest();
      if (method === 'GET' && !skipCache && cacheTTL > 0) {
        this.writeGetCache(requestCacheKey, result, cacheTTL);
      } else if (method !== 'GET') {
        this.clearGetCache();
      }
      return result;
    } catch (error) {
      console.error('API Request Error:', error);
      throw new Error(getApiErrorMessage(error, 'Request failed'));
    } finally {
      if (method === 'GET' && dedupe) {
        this.inFlightGet.delete(requestCacheKey);
      }
    }
  }

  private buildGetCacheKey(endpoint: string, queryString: string, token: string | null): string {
    return `GET:${endpoint}${queryString}|auth:${token || 'public'}`;
  }

  private writeGetCache(key: string, data: unknown, ttlMs: number) {
    if (this.getCache.size >= this.maxGetCacheEntries) {
      const oldestKey = this.getCache.keys().next().value;
      if (oldestKey) {
        this.getCache.delete(oldestKey);
      }
    }
    this.getCache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private clearGetCache() {
    this.getCache.clear();
  }

  private async parseErrorPayload(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json().catch(() => ({ detail: response.statusText }));
    }
    const text = await response.text().catch(() => '');
    if (!text) {
      return { detail: response.statusText };
    }
    try {
      return JSON.parse(text);
    } catch {
      return { detail: text };
    }
  }

  private async parseSuccessResponse<T>(response: Response): Promise<T> {
    if (response.status === 204 || response.status === 205) {
      return {} as T;
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  private cloneData<T>(value: T): T {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    if (typeof globalThis.structuredClone === 'function') {
      try {
        return globalThis.structuredClone(value);
      } catch {
        // Fallback below.
      }
    }

    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
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
