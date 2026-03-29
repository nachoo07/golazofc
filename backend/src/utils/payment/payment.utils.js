const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
};

export const normalizePaymentMethod = (value) => {
  if (typeof value !== 'string') return null;

  const normalizedValue = value.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[normalizedValue] || null;
};

export const isSupportedPaymentMethod = (value) => Boolean(normalizePaymentMethod(value));

export const normalizeConceptKey = (value) => {
  if (typeof value !== 'string') return '';

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const normalizeConceptName = (value) => {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().trim();
};
