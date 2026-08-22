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

/**
 * Returns the current school year string (e.g., "2025-26").
 * Academic year flips on August 1st.
 */
export function getCurrentSchoolYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  if (month < 7) { // Jan - July: we are in the second half of the year
    const start = year - 1
    const end = String(year).slice(-2)
    return `${start}-${end}`
  } else { // Aug - Dec: we are in the first half of the new year
    const start = year
    const end = String(year + 1).slice(-2)
    return `${start}-${end}`
  }
}

/**
 * Returns a YYYY-MM-DD date string using local timezone components
 * to prevent the 1-day backward shift caused by .toISOString().
 * 
 * @param {Date|string} date
 * @returns {string} - "YYYY-MM-DD"
 */
export function formatLocalDate(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseLocal(date) : new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns the current semester ("1" or "2") based on a best-guess threshold.
 * Semester 2 is assumed to start around February 1st.
 */
export function getCurrentSemester() {
  const now = new Date()
  const month = now.getMonth() // 0-indexed

  // Feb (1) through July (6) is usually Semester 2
  if (month >= 1 && month <= 6) {
    return '2'
  }
  return '1'
}
