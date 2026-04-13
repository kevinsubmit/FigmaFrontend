const DEFAULT_API_BASE_URL = 'http://localhost:8000';

const normalizeBaseUrl = (value?: string | null) => `${value || ''}`.trim().replace(/\/$/, '');

const isLoopbackHost = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

const isPrivateIpv4Host = (hostname: string) =>
  /^10\./.test(hostname)
  || /^192\.168\./.test(hostname)
  || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

const isRuntimeHostReplaceable = (hostname: string) =>
  isLoopbackHost(hostname) || isPrivateIpv4Host(hostname);

const resolveApiBaseUrl = () => {
  const configured = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL);
  if (typeof window === 'undefined') return configured;

  const runtimeHost = window.location.hostname.trim();
  const runtimeProtocol = window.location.protocol || 'http:';
  if (!runtimeHost) return configured;

  try {
    const parsed = new URL(configured);
    if (!isRuntimeHostReplaceable(parsed.hostname)) {
      return configured;
    }
    parsed.hostname = runtimeHost;
    if (!parsed.port) {
      parsed.port = '8000';
    }
    if (runtimeProtocol === 'http:' || runtimeProtocol === 'https:') {
      parsed.protocol = runtimeProtocol;
    }
    return parsed.origin;
  } catch {
    return `${runtimeProtocol}//${runtimeHost}:8000`;
  }
};

const API_BASE_URL = resolveApiBaseUrl();
const RESOLVED_URL_CACHE = new Map<string, string>();
const MAX_CACHE_ENTRIES = 4000;

const normalizeValue = (url?: string | null): string => `${url || ''}`.trim();

const setCache = (key: string, value: string) => {
  if (RESOLVED_URL_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = RESOLVED_URL_CACHE.keys().next().value;
    if (oldestKey) {
      RESOLVED_URL_CACHE.delete(oldestKey);
    }
  }
  RESOLVED_URL_CACHE.set(key, value);
};

export const getApiBaseUrl = () => API_BASE_URL;

export const resolveAssetUrl = (url?: string | null) => {
  const value = normalizeValue(url);
  if (!value) return '';

  const cached = RESOLVED_URL_CACHE.get(value);
  if (cached !== undefined) {
    return cached;
  }

  let resolved = value;
  if (!value.startsWith('data:') && !value.startsWith('http://') && !value.startsWith('https://')) {
    resolved = `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  setCache(value, resolved);
  return resolved;
};

export const appendVersionParam = (url: string, version?: string | null) => {
  const v = normalizeValue(version);
  if (!url || !v) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}`;
};

export const isPersistedAssetPath = (url?: string | null) => {
  const value = normalizeValue(url);
  if (!value) return false;
  if (value.startsWith('data:')) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
};

export const clearAssetUrlCache = () => {
  RESOLVED_URL_CACHE.clear();
};
