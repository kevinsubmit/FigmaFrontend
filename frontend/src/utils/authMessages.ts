import { getApiErrorMessage } from './apiErrorMessages';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

const normalizeText = (value: unknown): string => String(value || '').trim().toLowerCase();

const extractRaw = (error: any): string => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (typeof first === 'string') return first;
    if (first?.msg) return String(first.msg);
  }
  return error?.message || '';
};

export const getAuthErrorMessage = (error: any): string => {
  const raw = normalizeText(extractRaw(error));

  if (raw.includes('admin or store manager account must sign in from admin portal')) {
    return 'This is an admin/store account. Please sign in from the Admin Portal.';
  }
  if (raw.includes('this account is not allowed to sign in to admin portal')) {
    return 'This account cannot be used in Admin Portal. Please sign in from the H5 app.';
  }
  if (raw.includes('user account is inactive')) {
    return 'Your account is inactive. Please contact support.';
  }

  return getApiErrorMessage(error, FALLBACK_MESSAGE);
};
