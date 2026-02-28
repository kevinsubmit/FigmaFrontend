const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const SUSPICIOUS_CONTENT_REGEX = /<\s*\/?\s*script\b|javascript:|data:text\/html/i;
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,100}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const VERIFY_CODE_REGEX = /^\d{6}$/;
const AUTH_PURPOSES = new Set(['register', 'login', 'reset_password']);
const PROFILE_GENDERS = new Set(['male', 'female', 'other']);

type Method = 'POST' | 'PUT' | 'PATCH';

interface EndpointRule {
  method: Method;
  path: RegExp;
  validate: (payload: unknown) => void;
}

interface EmptyBodyRule {
  method: Method;
  path: RegExp;
}

const EMPTY_BODY_RULES: EmptyBodyRule[] = [
  { method: 'POST', path: /^\/(?:api\/v1\/)?stores\/\d+\/favorite$/i },
  { method: 'POST', path: /^\/(?:api\/v1\/)?pins\/\d+\/favorite$/i },
  { method: 'PATCH', path: /^\/(?:api\/v1\/)?notifications\/\d+\/read$/i },
  { method: 'POST', path: /^\/(?:api\/v1\/)?notifications\/mark-all-read$/i },
];

const ENDPOINT_RULES: EndpointRule[] = [
  {
    method: 'POST',
    path: /^\/(?:api\/v1\/)?auth\/send-verification-code$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Verification request payload');
      assertUSPhone(record.phone, 'phone');
      assertPurpose(record.purpose, 'purpose');
    },
  },
  {
    method: 'POST',
    path: /^\/(?:api\/v1\/)?auth\/verify-code$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Verification confirm payload');
      assertUSPhone(record.phone, 'phone');
      assertVerificationCode(record.code, 'code');
      assertPurpose(record.purpose, 'purpose');
    },
  },
  {
    method: 'POST',
    path: /^\/(?:api\/v1\/)?auth\/register$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Register payload');
      assertUSPhone(record.phone, 'phone');
      assertVerificationCode(record.verification_code, 'verification_code');
      assertUsername(record.username, 'username');
      assertPassword(record.password, 'password', 8);
      assertOptionalEmail(record.email, 'email');
      assertOptionalName(record.full_name, 'full_name');
    },
  },
  {
    method: 'POST',
    path: /^\/(?:api\/v1\/)?auth\/login$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Login payload');
      assertUSPhone(record.phone, 'phone');
      assertPassword(record.password, 'password', 1);
    },
  },
  {
    method: 'POST',
    path: /^\/(?:api\/v1\/)?users\/phone$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Bind phone payload');
      assertUSPhone(record.phone, 'phone');
      assertVerificationCode(record.verification_code, 'verification_code');
    },
  },
  {
    method: 'PUT',
    path: /^\/(?:api\/v1\/)?users\/phone$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Update phone payload');
      assertUSPhone(record.new_phone, 'new_phone');
      assertVerificationCode(record.verification_code, 'verification_code');
      assertPassword(record.current_password, 'current_password', 1);
    },
  },
  {
    method: 'PUT',
    path: /^\/(?:api\/v1\/)?users\/password$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Update password payload');
      assertPassword(record.current_password, 'current_password', 1);
      assertPassword(record.new_password, 'new_password', 8);
      if (toTrimmedString(record.current_password) === toTrimmedString(record.new_password)) {
        throw new Error('new_password must be different from current_password.');
      }
    },
  },
  {
    method: 'PUT',
    path: /^\/(?:api\/v1\/)?users\/profile$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Update profile payload');
      if (Object.prototype.hasOwnProperty.call(record, 'full_name')) {
        assertOptionalName(record.full_name, 'full_name');
      }
      if (Object.prototype.hasOwnProperty.call(record, 'email')) {
        assertOptionalEmail(record.email, 'email');
      }
      if (Object.prototype.hasOwnProperty.call(record, 'gender')) {
        assertOptionalGender(record.gender, 'gender');
      }
      if (Object.prototype.hasOwnProperty.call(record, 'birthday')) {
        assertOptionalDate(record.birthday, 'birthday');
      }
      if (Object.prototype.hasOwnProperty.call(record, 'date_of_birth')) {
        assertOptionalDate(record.date_of_birth, 'date_of_birth');
      }
    },
  },
  {
    method: 'POST',
    path: /^\/(?:api\/v1\/)?appointments\/?$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Create appointment payload');
      assertDateString(record.appointment_date, 'appointment_date');
      assertTimeString(record.appointment_time, 'appointment_time');
      assertOptionalText(record.notes, 'notes', 2000);
    },
  },
  {
    method: 'POST',
    path: /^\/(?:api\/v1\/)?appointments\/groups$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Create appointment group payload');
      assertDateString(record.appointment_date, 'appointment_date');
      assertTimeString(record.appointment_time, 'appointment_time');
      assertPositiveInt(record.host_service_id, 'host_service_id');
      assertOptionalText(record.host_notes, 'host_notes', 2000);

      if (!Array.isArray(record.guests) || record.guests.length === 0) {
        throw new Error('guests must include at least one guest item.');
      }
      record.guests.forEach((guest, index) => {
        const guestRecord = asRecord(guest, `guests[${index}]`);
        assertPositiveInt(guestRecord.service_id, `guests[${index}].service_id`);
        assertOptionalText(guestRecord.notes, `guests[${index}].notes`, 2000);
        assertOptionalName(guestRecord.guest_name, `guests[${index}].guest_name`);
        if (Object.prototype.hasOwnProperty.call(guestRecord, 'guest_phone')) {
          assertOptionalUSPhone(guestRecord.guest_phone, `guests[${index}].guest_phone`);
        }
      });
    },
  },
  {
    method: 'POST',
    path: /^\/(?:api\/v1\/)?appointments\/\d+\/reschedule$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Reschedule payload');
      assertDateString(record.new_date, 'new_date');
      assertTimeString(record.new_time, 'new_time');
    },
  },
  {
    method: 'PATCH',
    path: /^\/(?:api\/v1\/)?appointments\/\d+\/notes$/i,
    validate: (payload) => {
      const record = asRecord(payload, 'Appointment notes payload');
      assertRequiredText(record.notes, 'notes', 2000);
    },
  },
];

export interface RequestValidationOptions {
  context?: string;
  allowEmptyBody?: boolean;
  method?: string;
  path?: string;
}

export function isBodyMethod(method?: string): boolean {
  return !!method && BODY_METHODS.has(method.toUpperCase());
}

export function normalizeRequestPath(path?: string): string {
  if (!path) return '';
  const withoutHash = path.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  const absoluteMatch = withoutQuery.match(/^https?:\/\/[^/]+(\/.*)?$/i);
  if (absoluteMatch) {
    return (absoluteMatch[1] || '/').trim();
  }
  const normalized = withoutQuery.trim();
  if (!normalized) return '';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function shouldAllowEmptyBody(method?: string, path?: string): boolean {
  if (!method || !path) return false;
  const normalizedMethod = method.toUpperCase() as Method;
  const normalizedPath = normalizeRequestPath(path);
  return EMPTY_BODY_RULES.some(
    (rule) => rule.method === normalizedMethod && rule.path.test(normalizedPath),
  );
}

function isFileLike(value: unknown): value is File | Blob {
  if (typeof File !== 'undefined' && value instanceof File) return true;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  return false;
}

export function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'boolean') {
    return true;
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (isFileLike(value)) {
    return value.size > 0;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulValue(item));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) => hasMeaningfulValue(item));
  }

  return true;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${context} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertPositiveInt(value: unknown, field: string): void {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }
}

function assertRequiredText(value: unknown, field: string, maxLength: number): void {
  const text = toTrimmedString(value);
  if (!text) {
    throw new Error(`${field} cannot be empty.`);
  }
  if (text.length > maxLength) {
    throw new Error(`${field} cannot exceed ${maxLength} characters.`);
  }
}

function assertOptionalText(value: unknown, field: string, maxLength: number): void {
  if (value === undefined || value === null) return;
  const text = toTrimmedString(value);
  if (!text) return;
  if (text.length > maxLength) {
    throw new Error(`${field} cannot exceed ${maxLength} characters.`);
  }
}

function isValidUSPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

function assertUSPhone(value: unknown, field: string): void {
  const text = toTrimmedString(value);
  if (!text) {
    throw new Error(`${field} is required.`);
  }
  if (!isValidUSPhone(text)) {
    throw new Error(`${field} must be a valid US phone number.`);
  }
}

function assertOptionalUSPhone(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  const text = toTrimmedString(value);
  if (!text) return;
  if (!isValidUSPhone(text)) {
    throw new Error(`${field} must be a valid US phone number.`);
  }
}

function assertVerificationCode(value: unknown, field: string): void {
  const text = toTrimmedString(value);
  if (!text) {
    throw new Error(`${field} is required.`);
  }
  if (!VERIFY_CODE_REGEX.test(text)) {
    throw new Error(`${field} must be a 6-digit code.`);
  }
}

function assertPurpose(value: unknown, field: string): void {
  const text = toTrimmedString(value);
  if (!text || !AUTH_PURPOSES.has(text)) {
    throw new Error(`${field} must be one of: register, login, reset_password.`);
  }
}

function assertUsername(value: unknown, field: string): void {
  const text = toTrimmedString(value);
  if (!text) {
    throw new Error(`${field} is required.`);
  }
  if (!USERNAME_REGEX.test(text)) {
    throw new Error(`${field} must be 3-100 chars and only include letters, numbers, dot, underscore, or dash.`);
  }
}

function assertPassword(value: unknown, field: string, minLength: number): void {
  const text = toTrimmedString(value);
  if (!text) {
    throw new Error(`${field} is required.`);
  }
  if (text.length < minLength || text.length > 100) {
    throw new Error(`${field} must be ${minLength}-100 characters.`);
  }
}

function assertOptionalEmail(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  const text = toTrimmedString(value);
  if (!text) return;
  if (!EMAIL_REGEX.test(text)) {
    throw new Error(`${field} must be a valid email.`);
  }
}

function assertOptionalName(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  const text = toTrimmedString(value);
  if (!text) return;
  if (text.length < 2 || text.length > 200) {
    throw new Error(`${field} must be 2-200 characters.`);
  }
}

function assertOptionalGender(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  const text = toTrimmedString(value);
  if (!text) return;
  if (!PROFILE_GENDERS.has(text.toLowerCase())) {
    throw new Error(`${field} must be male, female, or other.`);
  }
}

function assertDateString(value: unknown, field: string): void {
  const text = toTrimmedString(value);
  if (!text) {
    throw new Error(`${field} is required.`);
  }
  if (!DATE_REGEX.test(text) || Number.isNaN(new Date(`${text}T00:00:00Z`).getTime())) {
    throw new Error(`${field} must be in YYYY-MM-DD format.`);
  }
}

function assertOptionalDate(value: unknown, field: string): void {
  if (value === undefined || value === null) return;
  const text = toTrimmedString(value);
  if (!text) return;
  if (!DATE_REGEX.test(text) || Number.isNaN(new Date(`${text}T00:00:00Z`).getTime())) {
    throw new Error(`${field} must be in YYYY-MM-DD format.`);
  }
}

function assertTimeString(value: unknown, field: string): void {
  const text = toTrimmedString(value);
  if (!text) {
    throw new Error(`${field} is required.`);
  }
  if (!TIME_REGEX.test(text)) {
    throw new Error(`${field} must be in HH:MM or HH:MM:SS format.`);
  }
}

function getLeafKey(path: string): string {
  const cleanPath = path.replace(/\[\d+]/g, '');
  const last = cleanPath.split('.').pop() || '';
  return last.toLowerCase();
}

function validateStringValue(value: string, path: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (CONTROL_CHAR_REGEX.test(value)) {
    return `Invalid control characters in field "${path}".`;
  }

  if (SUSPICIOUS_CONTENT_REGEX.test(value)) {
    return `Invalid characters in field "${path}".`;
  }

  const field = getLeafKey(path);
  if (field === 'phone' || field === 'new_phone' || field === 'guest_phone' || field === 'recipient_phone') {
    if (!isValidUSPhone(trimmed)) {
      return `Field "${path}" must be a valid US phone number.`;
    }
  }
  if (field === 'email' && !EMAIL_REGEX.test(trimmed)) {
    return `Field "${path}" must be a valid email.`;
  }
  if (field === 'username' && !USERNAME_REGEX.test(trimmed)) {
    return `Field "${path}" must be 3-100 chars and only include letters, numbers, dot, underscore, or dash.`;
  }
  if ((field === 'verification_code' || field === 'code') && !VERIFY_CODE_REGEX.test(trimmed)) {
    return `Field "${path}" must be a 6-digit code.`;
  }
  if ((field === 'appointment_date' || field === 'new_date' || field === 'birthday' || field === 'date_of_birth') && !DATE_REGEX.test(trimmed)) {
    return `Field "${path}" must be in YYYY-MM-DD format.`;
  }
  if ((field === 'appointment_time' || field === 'new_time') && !TIME_REGEX.test(trimmed)) {
    return `Field "${path}" must be in HH:MM or HH:MM:SS format.`;
  }
  if (field === 'purpose' && !AUTH_PURPOSES.has(trimmed)) {
    return `Field "${path}" must be one of: register, login, reset_password.`;
  }
  if ((field === 'notes' || field === 'host_notes') && trimmed.length > 2000) {
    return `Field "${path}" cannot exceed 2000 characters.`;
  }
  if ((field === 'reason' || field === 'cancel_reason' || field === 'description' || field === 'message') && trimmed.length > 255) {
    return `Field "${path}" cannot exceed 255 characters.`;
  }

  return null;
}

function findInvalidString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    return validateStringValue(value, path);
  }

  if (value instanceof Date || isFileLike(value)) {
    return null;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nestedError = findInvalidString(value[index], `${path}[${index}]`);
      if (nestedError) return nestedError;
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      const nestedError = findInvalidString(nestedValue, `${path}.${key}`);
      if (nestedError) return nestedError;
    }
  }

  return null;
}

function validateFormData(formData: FormData): string | null {
  let hasPayload = false;

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        hasPayload = true;
      }
      const invalid = validateStringValue(value, key);
      if (invalid) return invalid;
      continue;
    }

    if (isFileLike(value) && value.size > 0) {
      hasPayload = true;
    }
  }

  if (!hasPayload) {
    return 'Cannot submit empty data.';
  }

  return null;
}

function runEndpointRules(payload: unknown, method?: string, path?: string): void {
  if (!method || !path) return;
  const normalizedMethod = method.toUpperCase() as Method;
  const normalizedPath = normalizeRequestPath(path);
  for (const rule of ENDPOINT_RULES) {
    if (rule.method === normalizedMethod && rule.path.test(normalizedPath)) {
      rule.validate(payload);
      return;
    }
  }
}

export function validateRequestPayload(
  payload: unknown,
  options: RequestValidationOptions = {},
): void {
  const { context = 'Request', allowEmptyBody = false, method, path } = options;
  const autoAllowEmptyBody = shouldAllowEmptyBody(method, path);
  const finalAllowEmptyBody = allowEmptyBody || autoAllowEmptyBody;

  if (payload instanceof FormData) {
    const error = validateFormData(payload);
    if (error) throw new Error(error);
    return;
  }

  if (!finalAllowEmptyBody && !hasMeaningfulValue(payload)) {
    throw new Error(`${context}: cannot submit empty data.`);
  }

  if (payload === null || payload === undefined) {
    return;
  }

  const invalid = findInvalidString(payload, 'payload');
  if (invalid) {
    throw new Error(invalid);
  }

  runEndpointRules(payload, method, path);
}
