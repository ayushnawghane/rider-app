export const normalizePositiveIntegerInput = (value: string): number => {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return 0;

  const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
  return Number(normalized);
};

export const displayPositiveIntegerInput = (value: number): string => {
  return value > 0 ? String(value) : '';
};
