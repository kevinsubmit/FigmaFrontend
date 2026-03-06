import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL =
  import.meta.env.VITE_ADMIN_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000';
const ADMIN_CLIENT_PLATFORM = 'web-admin';
const ADMIN_CLIENT_VERSION =
  (import.meta.env.VITE_ADMIN_APP_VERSION || import.meta.env.VITE_APP_VERSION || 'web-admin').trim();

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
});

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);
let isRedirectingToLogin = false;

const generateRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const extractRequestReferenceFromText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = value.match(/\[Ref:\s*([^\]]+)\]/i);
  const reference = match?.[1]?.trim();
  return reference ? reference : null;
};

const getHeaderValue = (headers: any, headerName: string): string | null => {
  if (!headers) return null;
  const normalizedName = headerName.toLowerCase();
  const direct = headers[headerName] ?? headers[normalizedName];
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }
  if (typeof headers.get === 'function') {
    const fromGetter = headers.get(headerName) ?? headers.get(normalizedName);
    if (typeof fromGetter === 'string' && fromGetter.trim()) {
      return fromGetter.trim();
    }
  }
  return null;
};

const extractRequestReference = (response: any, message: string): string | null => {
  const fromHeader = getHeaderValue(response?.headers, 'x-request-id');
  if (fromHeader) return fromHeader;

  const fromBody = response?.data?.request_id;
  if (typeof fromBody === 'string' && fromBody.trim()) {
    return fromBody.trim();
  }

  return extractRequestReferenceFromText(message);
};

const withRequestReference = (message: string, requestReference: string | null): string => {
  const normalizedMessage = (message || '').trim() || 'Request failed';
  const normalizedReference = (requestReference || '').trim();
  if (!normalizedReference) return normalizedMessage;
  if (normalizedMessage.toLowerCase().includes(normalizedReference.toLowerCase())) {
    return normalizedMessage;
  }
  return `${normalizedMessage} [Ref: ${normalizedReference}]`;
};

const extractBackendMessage = (payload: any): string | null => {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) {
    const parts = payload
      .map((item) => extractBackendMessage(item))
      .filter((item): item is string => Boolean(item && item.trim()));
    return parts.length ? parts.join('; ') : null;
  }
  if (typeof payload === 'object') {
    if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail;
    if (Array.isArray(payload.detail)) {
      const parts = payload.detail
        .map((item: any) =>
          typeof item === 'string'
            ? item
            : item?.msg || item?.message || JSON.stringify(item),
        )
        .filter(Boolean);
      if (parts.length) return parts.join('; ');
    }
    if (payload.detail && typeof payload.detail === 'object') {
      return extractBackendMessage(payload.detail);
    }
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
    return null;
  }
  return null;
};

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers['X-Request-Id'] = generateRequestId();
  config.headers['X-Client-Platform'] = ADMIN_CLIENT_PLATFORM;
  if (ADMIN_CLIENT_VERSION) {
    config.headers['X-Client-Version'] = ADMIN_CLIENT_VERSION;
  }

  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = (response.config.method || 'get').toLowerCase();
    if (MUTATION_METHODS.has(method)) {
      const message = extractBackendMessage(response.data);
      if (message) {
        toast.success(message);
      }
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/register');

    if (status === 401 && !isAuthEndpoint) {
      clearToken();
      if (!isRedirectingToLogin && window.location.pathname !== '/admin/login') {
        isRedirectingToLogin = true;
        toast.error('登录已过期，请重新登录');
        window.location.replace('/admin/login');
      }
      return Promise.reject(error);
    }

    const method = (error?.config?.method || 'get').toLowerCase();
    const baseBackendMessage =
      extractBackendMessage(error?.response?.data) || error?.message || 'Request failed';
    const requestReference = extractRequestReference(error?.response, baseBackendMessage);
    const backendMessage = withRequestReference(baseBackendMessage, requestReference);

    if (error?.response?.data && typeof error.response.data === 'object') {
      error.response.data.detail = backendMessage;
    }

    if (MUTATION_METHODS.has(method)) {
      toast.error(backendMessage);
      (error as any).__api_toast_shown = true;
    }

    return Promise.reject(error);
  },
);

export const setToken = (token: string, refreshToken?: string) => {
  localStorage.setItem('access_token', token);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
};

export const clearToken = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const fetchCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
