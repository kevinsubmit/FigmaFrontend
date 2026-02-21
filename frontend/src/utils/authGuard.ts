const ACCOUNT_RESTRICT_KEYWORDS = [
  'temporarily restricted',
  'account is inactive',
  'account disabled',
  'account banned',
  'permanently banned',
  'forbidden login',
];

const normalizeDetail = (detail?: unknown): string => {
  if (typeof detail === 'string') return detail.toLowerCase();
  if (detail && typeof detail === 'object') {
    try {
      return JSON.stringify(detail).toLowerCase();
    } catch {
      return '';
    }
  }
  return '';
};

export const shouldForceRelogin = (status?: number, detail?: unknown): boolean => {
  if (status === 401) return true;
  const normalized = normalizeDetail(detail);
  if (!normalized) return false;
  if (status === 403 || status === 429) {
    return ACCOUNT_RESTRICT_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }
  return false;
};

export const forceRelogin = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

