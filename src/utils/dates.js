/**
 * Utility to handle date formatting without UTC/Local shifting issues.
 * 
 * Standard ISO strings (YYYY-MM-DD) are often parsed as UTC midnight by browsers,
 * which results in them showing as "the previous day" in local timezones.
 */

/**
 * Formats an ISO date string (YYYY-MM-DD) into a localized display string.
 * It ensures the date is treated as a local date, preventing the 1-day shift.
 * 
 * @param {string} dateString - The ISO date string (e.g., "2026-04-01")
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date (e.g., "Apr 1")
 */
export function formatLocalDisplay(dateString, options = { month: 'short', day: 'numeric' }) {
  if (!dateString) return '—';
  
  // If it's already a full ISO string with time, we use it as is
  // But if it's just YYYY-MM-DD, we append local midnight to force local parsing
  const isoMatch = dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  const normalizedString = isoMatch ? `${dateString}T00:00:00` : dateString;
  
  return new Date(normalizedString).toLocaleDateString([], options);
}

/**
 * Parses an ISO date string into a Date object representing local midnight.
 */
export function parseLocal(dateString) {
  if (!dateString) return new Date();
  const isoMatch = dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  const normalizedString = isoMatch ? `${dateString}T00:00:00` : dateString;
  return new Date(normalizedString);
}
