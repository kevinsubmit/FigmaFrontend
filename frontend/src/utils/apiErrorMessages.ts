const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
};

const toSentence = (value: string): string => {
  const text = value.trim();
  if (!text) return '';
  const normalized = text.replace(/\s+/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatFieldName = (field: string): string => {
  const normalized = field.replace(/\[(\d+)\]/g, '').replace(/_/g, ' ').trim();
  if (!normalized) return 'Field';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const extractFieldFromLoc = (loc: unknown): string => {
  if (!Array.isArray(loc)) return '';
  const blacklist = new Set(['body', 'query', 'path', 'header', 'cookie']);
  for (let index = loc.length - 1; index >= 0; index -= 1) {
    const value = loc[index];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || blacklist.has(trimmed.toLowerCase())) continue;
    return trimmed;
  }
  return '';
};

const extractValidationMessage = (item: RecordValue): string => {
  const rawMessage = toText(item.msg);
  const field = formatFieldName(extractFieldFromLoc(item.loc));
  const lower = rawMessage.toLowerCase();

  if (!rawMessage) return '';

  if (lower.includes('field required')) {
    return `${field} is required.`;
  }

  const lessEqualMatch = rawMessage.match(/less than or equal to\s+([0-9.]+)/i);
  if (lessEqualMatch) {
    return `${field} must be less than or equal to ${lessEqualMatch[1]}.`;
  }

  const greaterEqualMatch = rawMessage.match(/greater than or equal to\s+([0-9.]+)/i);
  if (greaterEqualMatch) {
    return `${field} must be greater than or equal to ${greaterEqualMatch[1]}.`;
  }

  const atMostMatch = rawMessage.match(/at most\s+([0-9]+)/i);
  if (atMostMatch) {
    return `${field} must be at most ${atMostMatch[1]} characters.`;
  }

  const atLeastMatch = rawMessage.match(/at least\s+([0-9]+)/i);
  if (atLeastMatch) {
    return `${field} must be at least ${atLeastMatch[1]} characters.`;
  }

  if (lower.includes('valid integer') || lower.includes('unable to parse string as an integer')) {
    return `${field} must be a valid integer.`;
  }

  if (lower.includes('valid number')) {
    return `${field} must be a valid number.`;
  }

  if (lower.includes('valid date')) {
    return `${field} must be a valid date.`;
  }

  if (lower.includes('valid time')) {
    return `${field} must be a valid time.`;
  }

  if (lower.includes('valid email')) {
    return `${field} must be a valid email address.`;
  }

  return toSentence(rawMessage);
};

const mapKnownMessage = (raw: string, status?: number): string | null => {
  const text = raw.trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  if (lower === 'failed to fetch' || lower.includes('network error') || lower.includes('network request failed')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (lower.includes('not authenticated') || lower.includes('authentication required')) {
    return 'Please sign in to continue.';
  }
  if (lower.includes('could not validate credentials') || lower.includes('token has expired') || lower.includes('session expired')) {
    return 'Session expired. Please sign in again.';
  }
  if (lower.includes('forbidden') || lower.includes('permission denied') || lower.includes('not enough permissions')) {
    return 'You do not have permission to perform this action.';
  }
  if (lower.includes('too many booking requests') || lower.includes('too many requests')) {
    return 'Too many requests. Please try again in a few minutes.';
  }
  if (lower.includes('request payload cannot be empty')) {
    return 'Please complete the required fields before submitting.';
  }
  if (lower.includes('must be a valid us phone number')) {
    return 'Please enter a valid US phone number.';
  }
  if (lower.includes('must be a 6-digit code') || lower.includes('verification code')) {
    return 'Please enter a valid 6-digit verification code.';
  }
  if (lower.includes('incorrect phone number or password')) {
    return 'Incorrect phone number or password.';
  }
  if (lower.includes('phone number already registered')) {
    return 'This phone number is already registered. Please sign in instead.';
  }
  if (lower.includes('username already taken')) {
    return 'This username is already taken. Please choose another one.';
  }
  if (lower.includes('invalid or expired verification code')) {
    return 'The verification code is invalid or expired. Please request a new code.';
  }

  if (status === 401) return 'Session expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';

  return toSentence(text);
};

const fallbackByStatus = (status?: number): string => {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Session expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'Requested resource was not found.';
    case 409:
      return 'This action conflicts with existing data.';
    case 422:
      return 'Please check your input and try again.';
    case 429:
      return 'Too many requests. Please try again in a few minutes.';
    default:
      if (typeof status === 'number' && status >= 500) {
        return 'Server is busy. Please try again later.';
      }
      return DEFAULT_ERROR_MESSAGE;
  }
};

const messageFromDetail = (detail: unknown, status?: number): string => {
  if (typeof detail === 'string') {
    return mapKnownMessage(detail, status) || '';
  }

  if (Array.isArray(detail)) {
    for (const item of detail) {
      if (typeof item === 'string') {
        const fromText = mapKnownMessage(item, status);
        if (fromText) return fromText;
      }
      if (isRecord(item)) {
        const fromValidation = extractValidationMessage(item);
        if (fromValidation) return fromValidation;
      }
    }
    return '';
  }

  if (isRecord(detail)) {
    const fromValidation = extractValidationMessage(detail);
    if (fromValidation) return fromValidation;
    const nestedDetail = detail.detail;
    if (nestedDetail !== undefined) {
      return messageFromDetail(nestedDetail, status);
    }
  }

  return '';
};

export const getApiErrorMessageFromPayload = (
  payload: unknown,
  status?: number,
  fallback: string = DEFAULT_ERROR_MESSAGE,
): string => {
  if (isRecord(payload)) {
    const fromDetail = messageFromDetail(payload.detail, status);
    if (fromDetail) return fromDetail;

    const fromMessage = mapKnownMessage(toText(payload.message), status);
    if (fromMessage) return fromMessage;
  }

  if (Array.isArray(payload)) {
    const fromArray = messageFromDetail(payload, status);
    if (fromArray) return fromArray;
  }

  const direct = mapKnownMessage(toText(payload), status);
  if (direct) return direct;

  return fallback || fallbackByStatus(status);
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string = DEFAULT_ERROR_MESSAGE,
): string => {
  if (isRecord(error)) {
    const status = typeof error.response === 'object' && error.response !== null && 'status' in error.response
      ? Number((error.response as RecordValue).status)
      : typeof error.status === 'number'
        ? error.status
        : undefined;

    const responseData = isRecord(error.response) ? (error.response as RecordValue).data : undefined;
    const candidatePayload = responseData ?? error.data ?? error.detail ?? error;
    const fromPayload = getApiErrorMessageFromPayload(candidatePayload, status, '');
    if (fromPayload) return fromPayload;

    const fromMessage = mapKnownMessage(toText(error.message), status);
    if (fromMessage) return fromMessage;

    if (status !== undefined) {
      return fallbackByStatus(status);
    }
  }

  if (error instanceof Error) {
    const fromMessage = mapKnownMessage(error.message);
    if (fromMessage) return fromMessage;
  }

  return fallback || DEFAULT_ERROR_MESSAGE;
};
