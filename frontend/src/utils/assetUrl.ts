const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export const resolveAssetUrl = (url?: string | null) => {
  const value = `${url || ''}`.trim();
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

export const appendVersionParam = (url: string, version?: string | null) => {
  const v = `${version || ''}`.trim();
  if (!url || !v) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}`;
};

export const isPersistedAssetPath = (url?: string | null) => {
  const value = `${url || ''}`.trim();
  if (!value) return false;
  if (value.startsWith('data:')) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
};
