const ET_TIMEZONE = 'America/New_York';

const hasTimezoneInfo = (value: string) => /[zZ]|[+-]\d{2}:\d{2}$/.test(value);

export const parseApiDateTimeAsUTC = (value?: string | null): Date | null => {
  if (!value) return null;
  const normalized = hasTimezoneInfo(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const formatApiDateTimeET = (value?: string | null, withSuffix = false): string => {
  const date = parseApiDateTimeAsUTC(value);
  if (!date) return value || '-';
  const text = date.toLocaleString('en-US', { timeZone: ET_TIMEZONE });
  return withSuffix ? `${text} ET` : text;
};

export const getTodayYmdET = (): string => {
  const now = new Date();
  const y = new Intl.DateTimeFormat('en-US', { timeZone: ET_TIMEZONE, year: 'numeric' }).format(now);
  const m = new Intl.DateTimeFormat('en-US', { timeZone: ET_TIMEZONE, month: '2-digit' }).format(now);
  const d = new Intl.DateTimeFormat('en-US', { timeZone: ET_TIMEZONE, day: '2-digit' }).format(now);
  return `${y}-${m}-${d}`;
};

export const formatYmdAsETDate = (
  ymd: string,
  options: Intl.DateTimeFormatOptions,
): string => {
  const date = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString('en-US', { ...options, timeZone: ET_TIMEZONE });
};

export const isFutureThanNowByApiTimestamp = (value?: string | null): boolean => {
  const date = parseApiDateTimeAsUTC(value);
  if (!date) return false;
  return date.getTime() > Date.now();
};
