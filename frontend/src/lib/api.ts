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

// 创建axios实例
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
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
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail ?? error?.response?.data;

    if (shouldForceRelogin(status, detail)) {
      clearGetCache();
      inFlightGetRequests.clear();
      forceRelogin();
      return Promise.reject(error);
    }

    const userMessage = getApiErrorMessage(error);
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
