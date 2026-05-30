export const toBigIntMs = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
  return null;
};

export const formatMsToMinutes = (msOrBigInt) => {
  if (msOrBigInt === null || msOrBigInt === undefined) return 'Not set';
  const ms = typeof msOrBigInt === 'bigint' ? Number(msOrBigInt) : Number(msOrBigInt);
  if (Number.isNaN(ms)) return 'Not set';
  const mins = Math.floor(ms / 60000);
  return `${mins} minutes`;
};

export default { toBigIntMs, formatMsToMinutes };
