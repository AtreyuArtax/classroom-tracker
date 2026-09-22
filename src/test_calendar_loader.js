/**
 * src/test_calendar_loader.js
 *
 * Verifies that the official board calendar files in `src/data/calendar/`
 * are valid JSON and contain well-formed holiday and semester objects.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('Testing Board Calendar JSON Files...');

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const calendarDir = path.resolve(currentDir, 'data/calendar');

if (!fs.existsSync(calendarDir)) {
  throw new Error('src/data/calendar directory does not exist');
}

const file2026 = path.join(calendarDir, '2026-2027.json');
if (!fs.existsSync(file2026)) {
  throw new Error('2026-2027.json does not exist');
}

const content = JSON.parse(fs.readFileSync(file2026, 'utf8'));

const holidays = Array.isArray(content) ? content : (content.holidays || []);
const semesters = Array.isArray(content) ? null : (content.semesters || null);

if (!Array.isArray(holidays) || holidays.length === 0) {
  throw new Error('2026-2027.json must contain a non-empty holidays array');
}

console.log(`✅ 2026-2027.json is valid with ${holidays.length} holidays/PD days!`);

for (const entry of holidays) {
  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    throw new Error(`Invalid date format in entry: ${JSON.stringify(entry)}`);
  }
  if (!entry.label) {
    throw new Error(`Missing label in entry: ${JSON.stringify(entry)}`);
  }
}
console.log('✅ All holiday dates and labels validated!');

if (semesters) {
  if (!Array.isArray(semesters) || semesters.length === 0) {
    throw new Error('Semesters must be a non-empty array when present');
  }
  for (const sem of semesters) {
    if (!sem.semester || !sem.startDate || !sem.endDate) {
      throw new Error(`Invalid semester entry: ${JSON.stringify(sem)}`);
    }
  }
  console.log(`✅ ${semesters.length} semester boundaries validated (Sem 1: ${semesters[0].startDate} to ${semesters[0].endDate}, Sem 2: ${semesters[1].startDate} to ${semesters[1].endDate})!`);
}
