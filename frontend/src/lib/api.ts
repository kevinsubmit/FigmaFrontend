import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { forceRelogin, shouldForceRelogin } from '../utils/authGuard';
import { getApiErrorMessage } from '../utils/apiErrorMessages';
import { getApiBaseUrl } from '../utils/assetUrl';
import {
  hasMeaningfulValue,
  isBodyMethod,
  shouldAllowEmptyBody,
  validateRequestPayload,
} from './requestValidation';

// API Base URL - 根据环境变量配置
const API_BASE_URL = getApiBaseUrl();
const READ_REQUEST_TIMEOUT_MS = 15000;
const WRITE_REQUEST_TIMEOUT_MS = 20000;
const UPLOAD_REQUEST_TIMEOUT_MS = 120000;
const REFRESH_REQUEST_TIMEOUT_MS = 15000;

// 创建axios实例
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: READ_REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

type GetRequestConfig<D = any> = AxiosRequestConfig<D> & {
  skipCache?: boolean;
  dedupe?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
};

interface CachedGetResponse {
  expiresAt: number;
  status: number;
  statusText: string;
  headers: AxiosResponse['headers'];
  data: unknown;
}

const DEFAULT_GET_CACHE_TTL = 10000;
const MAX_GET_CACHE_ENTRIES = 200;
const getResponseCache = new Map<string, CachedGetResponse>();
const inFlightGetRequests = new Map<string, Promise<AxiosResponse<any>>>();
let lastAuthToken: string | null = null;
let refreshRequestPromise: Promise<string | null> | null = null;

type RetryableAxiosRequestConfig = AxiosRequestConfig & {
  _retryAfterRefresh?: boolean;
};

const AUTH_ENTRY_PATTERNS = [
  /^\/auth\/login$/i,
  /^\/auth\/register$/i,
  /^\/auth\/send-verification-code$/i,
  /^\/auth\/verify-code$/i,
  /^\/auth\/reset-password$/i,
  /^\/auth\/refresh$/i,
];

const normalizePath = (rawUrl?: string) => {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl, apiClient.defaults.baseURL);
    const path = parsed.pathname.replace(/^\/api\/v1/, '');
    return path.startsWith('/') ? path : `/${path}`;
  } catch {
    const noQuery = rawUrl.split('?')[0].split('#')[0] || rawUrl;
    const path = noQuery.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/api\/v1/, '');
    return path.startsWith('/') ? path : `/${path}`;
  }
};

const isAuthEntryRequest = (config?: AxiosRequestConfig) => {
  const path = normalizePath(config?.url);
  return AUTH_ENTRY_PATTERNS.some((pattern) => pattern.test(path));
};

const isUploadPath = (rawUrl?: string) => {
  const path = normalizePath(rawUrl).toLowerCase();
  return path.includes('/upload/')
    || path.endsWith('/upload')
    || path.includes('/avatar')
    || path.includes('/portfolio');
};

const resolveRequestTimeout = (
  rawUrl: string | undefined,
  method: string | undefined,
  explicitTimeout: number | undefined,
) => {
  if (typeof explicitTimeout === 'number' && Number.isFinite(explicitTimeout) && explicitTimeout > 0) {
    return explicitTimeout;
  }
  if (isUploadPath(rawUrl)) {
    return UPLOAD_REQUEST_TIMEOUT_MS;
  }
  return (method || 'GET').toUpperCase() === 'GET'
    ? READ_REQUEST_TIMEOUT_MS
    : WRITE_REQUEST_TIMEOUT_MS;
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshRequestPromise) {
    return refreshRequestPromise;
  }

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    return null;
  }

  const refreshURL = `${apiClient.defaults.baseURL}/auth/refresh`;
  refreshRequestPromise = (async () => {
    try {
      const response = await axios.post<{
        access_token?: string;
        refresh_token?: string;
      }>(
        refreshURL,
        { refresh_token: refreshToken },
        {
          timeout: REFRESH_REQUEST_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const nextAccessToken = response.data?.access_token ?? null;
      const nextRefreshToken = response.data?.refresh_token ?? null;
      if (!nextAccessToken || !nextRefreshToken) {
        return null;
      }

      localStorage.setItem('access_token', nextAccessToken);
      localStorage.setItem('refresh_token', nextRefreshToken);
      lastAuthToken = nextAccessToken;
      clearGetCache();
      inFlightGetRequests.clear();
      return nextAccessToken;
    } catch {
      return null;
    } finally {
      refreshRequestPromise = null;
    }
  })();

  return refreshRequestPromise;
};

const cloneData = <T>(value: T): T => {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value);
    } catch {
      // fallback below
    }
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

const clearGetCache = () => {
  getResponseCache.clear();
};

const buildGetCacheKey = (url: string, config?: GetRequestConfig) => {
  if (config?.cacheKey) return config.cacheKey;
  const { skipCache, dedupe, cacheTTL, cacheKey, ...axiosConfig } = config || {};
  return apiClient.getUri({
    ...axiosConfig,
    method: 'get',
    url,
  });
};

const writeGetCache = (key: string, response: AxiosResponse, ttlMs: number) => {
  if (getResponseCache.size >= MAX_GET_CACHE_ENTRIES) {
    const oldestKey = getResponseCache.keys().next().value as string | undefined;
    if (oldestKey) {
      getResponseCache.delete(oldestKey);
    }
  }
  getResponseCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: cloneData(response.data),
  });
};

const readGetCache = <T, R>(key: string, url: string, config?: GetRequestConfig): R | null => {
  const cached = getResponseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    getResponseCache.delete(key);
    return null;
  }
  const response = {
    data: cloneData(cached.data) as T,
    status: cached.status,
    statusText: cached.statusText,
    headers: cached.headers,
    config: {
      ...(config || {}),
      method: 'get',
      url,
    },
    request: undefined,
  } as R;
  return response;
};

const originalGet = apiClient.get.bind(apiClient);
apiClient.get = (async <T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  config?: GetRequestConfig<D>,
): Promise<R> => {
  const {
    skipCache = false,
    dedupe = true,
    cacheTTL = DEFAULT_GET_CACHE_TTL,
    cacheKey: _cacheKey,
    ...axiosConfig
  } = config || {};
  const requestConfig = axiosConfig as AxiosRequestConfig<D>;
  const key = buildGetCacheKey(url, config);

  if (!skipCache && cacheTTL > 0) {
    const cachedResponse = readGetCache<T, R>(key, url, config);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  if (dedupe) {
    const inFlight = inFlightGetRequests.get(key);
    if (inFlight) {
      const shared = (await inFlight) as R;
      return {
        ...shared,
        data: cloneData(shared.data),
      };
    }
  }

  const requestPromise = originalGet<T, R, D>(url, requestConfig)
    .then((response) => {
      if (!skipCache && cacheTTL > 0) {
        writeGetCache(key, response, cacheTTL);
      }
      return response;
    })
    .finally(() => {
      inFlightGetRequests.delete(key);
    });

  if (dedupe) {
    inFlightGetRequests.set(key, requestPromise as unknown as Promise<AxiosResponse<any>>);
  }

  const response = await requestPromise;
  return {
    ...response,
    data: cloneData(response.data),
  };
}) as typeof apiClient.get;

// 请求拦截器 - 添加Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token !== lastAuthToken) {
      clearGetCache();
      inFlightGetRequests.clear();
      lastAuthToken = token;
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = (config.method || 'GET').toUpperCase();
    config.timeout = resolveRequestTimeout(config.url, config.method, config.timeout);
    if (isBodyMethod(method)) {
      const allowEmptyByRoute = shouldAllowEmptyBody(method, config.url);
      const allowEmptyBody = allowEmptyByRoute
        || ((config.data === undefined || config.data === null) && hasMeaningfulValue(config.params));
      validateRequestPayload(config.data, {
        context: `${method} ${config.url || ''}`.trim(),
        allowEmptyBody,
        method,
        path: config.url,
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理Token过期
apiClient.interceptors.response.use(
  (response) => {
    const method = (response?.config?.method || 'GET').toUpperCase();
    if (method !== 'GET') {
      clearGetCache();
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail ?? error?.response?.data;
    const originalRequest = error?.config as RetryableAxiosRequestConfig | undefined;
    const userMessage = getApiErrorMessage(error);

    if (
      status === 401
      && originalRequest
      && !originalRequest._retryAfterRefresh
      && !isAuthEntryRequest(originalRequest)
    ) {
      originalRequest._retryAfterRefresh = true;
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${nextToken}`,
        };
        return apiClient.request(originalRequest);
      }
    }

    if (!isAuthEntryRequest(originalRequest) && shouldForceRelogin(status, detail)) {
      clearGetCache();
      inFlightGetRequests.clear();
      forceRelogin(userMessage, true);
      error.message = userMessage;
      return Promise.reject(error);
    }

    if (error?.response?.data && typeof error.response.data === 'object') {
      error.response.data = {
        ...error.response.data,
        detail: userMessage,
      };
    }
    error.message = userMessage;

    return Promise.reject(error);
  }
);

export default apiClient;
