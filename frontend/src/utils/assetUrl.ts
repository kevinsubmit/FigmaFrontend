const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
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
