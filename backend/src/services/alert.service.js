/**
 * Alert Service
 * Calculates alert flags for bills based on age and status.
 *
 * Flag levels:
 *   DONE  - bill is PAID or CANCELLED
 *   OK    - 0-6 days old
 *   WARN  - 7-14 days old
 *   CRIT  - 15+ days old
 */

/**
 * @param {string|Date} generatedDate  - The bill's generated_date
 * @param {string}      billStatus     - 'ACTIVE' | 'PAID' | 'CANCELLED'
 * @returns {'DONE'|'OK'|'WARN'|'CRIT'}
 */
function getAlertFlag(generatedDate, billStatus) {
  if (billStatus === 'PAID' || billStatus === 'CANCELLED') return 'DONE';

  const days = Math.floor(
    (new Date() - new Date(generatedDate)) / (1000 * 60 * 60 * 24)
  );

  if (days <= 6) return 'OK';
  if (days <= 14) return 'WARN';
  return 'CRIT';
}

/**
 * Returns the number of days since the generated date (regardless of status).
 * @param {string|Date} generatedDate
 * @returns {number}
 */
function getDaysPending(generatedDate) {
  return Math.floor(
    (new Date() - new Date(generatedDate)) / (1000 * 60 * 60 * 24)
  );
}

module.exports = { getAlertFlag, getDaysPending };
