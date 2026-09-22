/**
 * src/utils/calendarLoader.js
 *
 * Automatically discovers and loads official school board calendar schedules
 * from the `src/data/calendar/` repository folder using Vite's eager glob import.
 */

const calendarFiles = import.meta.glob('../data/calendar/**/*.json', { eager: true });

export function getAvailableBoardCalendars() {
  const result = [];
  for (const [filePath, module] of Object.entries(calendarFiles)) {
    const parts = filePath.replace(/\\/g, '/').split('/');
    const fileName = parts.pop() || '';
    const levelDir = parts.pop() || '';
    const data = module.default !== undefined ? module.default : module;
    const isArray = Array.isArray(data);
    const year = (!isArray && data?.year) ? data.year : fileName.replace(/\.json$/i, '');
    const level = (levelDir === 'elementary' || levelDir === 'secondary') ? levelDir : 'all';
    const holidays = isArray ? data : (data?.holidays || []);
    const semesters = isArray ? null : (data?.semesters || null);

    result.push({
      path: filePath,
      year,
      level,
      holidays,
      semesters
    });
  }
  return result;
}

/**
 * Retrieves the official board calendar (holidays and semesters) for a given school year.
 * Matches exact year or normalized variations (e.g. 2026-27 or 2026-2027).
 * 
 * Returns an Array of holidays augmented with `.semesters`, `.holidays`, and `.year`
 * for 100% backward compatibility with existing code.
 * 
 * @param {string} year
 * @param {'secondary'|'elementary'|'all'} [level]
 * @returns {Array<{ date: string, endDate?: string, label: string }> & { semesters: Array|null, holidays: Array, year: string } | null}
 */
export function getBoardCalendar(year, level = 'all') {
  if (!year) return null;
  const cleanYear = String(year).trim().toLowerCase();
  const all = getAvailableBoardCalendars();

  // Helper to extract the 4-digit start year, e.g. "2026" from "2026-2027" or "2026-27"
  const startYearMatch = cleanYear.match(/\b(20\d\d)\b/);
  const startYear = startYearMatch ? startYearMatch[1] : cleanYear;

  // 1. Exact match on year
  let match = all.find(c => (level === 'all' || c.level === 'all' || c.level === level) && c.year.toLowerCase() === cleanYear);
  
  // 2. Match by starting year (e.g. "2026" matches "2026-2027")
  if (!match) {
    match = all.find(c => {
      if (level !== 'all' && c.level !== 'all' && c.level !== level) return false;
      return c.year.startsWith(startYear);
    });
  }

  if (!match) return null;

  // Return holidays array augmented with semesters and metadata
  const res = [...match.holidays];
  res.year = match.year;
  res.level = match.level;
  res.holidays = match.holidays;
  res.semesters = match.semesters;
  return res;
}
