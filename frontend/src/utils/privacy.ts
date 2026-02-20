export const maskPhone = (phone?: string | null): string => {
  if (!phone) return '-';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '-';
  if (digits.length >= 11 && digits.startsWith('1')) {
    return `+1******${digits.slice(-4)}`;
  }
  if (digits.length >= 10) {
    return `******${digits.slice(-4)}`;
  }
  if (digits.length >= 4) {
    return `***${digits.slice(-4)}`;
  }
  return '***';
};
