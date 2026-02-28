const ACCOUNT_RESTRICT_KEYWORDS = [
  'temporarily restricted',
  'restricted until',
  'account restricted',
  'temporarily restricted from booking',
  'account is inactive',
  'user account is inactive',
  'account disabled',
  'account suspended',
  'suspended',
  'account locked',
  'locked',
  'blocked',
  'account banned',
  'permanently banned',
  'permanent ban',
  'permanently_banned',
  'forbidden login',
  'login forbidden',
  'access denied',
  'risk',
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
  if (status === 403 || status === 423 || status === 429) {
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
