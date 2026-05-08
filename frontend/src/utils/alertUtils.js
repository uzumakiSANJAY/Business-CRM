export function getAlertFlag(generatedDate, billStatus) {
  if (!generatedDate) return 'OK';
  if (billStatus === 'PAID' || billStatus === 'CANCELLED') return 'DONE';
  const days = Math.floor((new Date() - new Date(generatedDate)) / (1000 * 60 * 60 * 24));
  if (days <= 6) return 'OK';
  if (days <= 14) return 'WARN';
  return 'CRIT';
}
