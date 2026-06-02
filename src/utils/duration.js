export const parseDurationSeconds = (value) => {
  if (!value) return null;

  const match = /^([0-9]+)(s|m|h|d)?$/i.exec(value);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      return amount;
  }
};

export default { parseDurationSeconds };
