const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

const normalizeText = (value: unknown): string => String(value || '').trim();

const extractDetailMessage = (error: any): string => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail.trim();
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (typeof first === 'string') return first.trim();
    if (first?.msg) return String(first.msg).trim();
  }
  if (error?.message) return String(error.message).trim();
  return '';
};

export const getAuthErrorMessage = (error: any): string => {
  const raw = normalizeText(extractDetailMessage(error)).toLowerCase();
  if (!raw) return FALLBACK_MESSAGE;

  if (raw.includes('incorrect phone number or password')) {
    return 'Incorrect phone number or password.';
  }
  if (raw.includes('phone number already registered')) {
    return 'This phone number is already registered. Please log in instead.';
  }
  if (raw.includes('username already taken')) {
    return 'This username is already taken. Please choose another one.';
  }
  if (raw.includes('invalid or expired verification code')) {
    return 'The verification code is invalid or expired. Please request a new code.';
  }
  if (raw.includes('user account is inactive')) {
    return 'Your account is inactive. Please contact support.';
  }
  if (raw.includes('admin or store manager account must sign in from admin portal')) {
    return 'This is an admin/store account. Please sign in from the Admin Portal.';
  }
  if (raw.includes('this account is not allowed to sign in to admin portal')) {
    return 'This account cannot be used in Admin Portal. Please sign in from the H5 app.';
  }
  if (raw.includes('authentication required')) {
    return 'Please log in first.';
  }
  if (raw.includes('could not validate credentials')) {
    return 'Your session has expired. Please log in again.';
  }

  return extractDetailMessage(error) || FALLBACK_MESSAGE;
};
