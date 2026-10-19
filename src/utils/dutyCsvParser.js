/**
 * src/utils/dutyCsvParser.js
 *
 * Robust CSV parser for past APA and duty tracking spreadsheets.
 * Intelligently extracts duty records, normalizes dates, flags snow days & emergencies,
 * and groups entries by school year.
 */

import Papa from 'papaparse'
import { getSchoolYearFromDate, getSemesterFromDate } from './dates.js'

/**
 * Normalizes varied date formats into ISO 'YYYY-MM-DD'.
 * Handles:
 *   - YYYY-MM-DD (e.g. 2025-10-20)
 *   - YY-MM-DD   (e.g. 25-10-20 -> 2025-10-20)
 *   - MM/DD/YYYY (e.g. 10/20/2025)
 *   - MM/DD/YY   (e.g. 10/20/25 -> 2025-10-20)
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizeDateString(raw) {
  if (!raw) return null
  const str = String(raw).trim()

  // 1. Standard ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (isoMatch) {
    const y = isoMatch[1]
    const m = isoMatch[2].padStart(2, '0')
    const d = isoMatch[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // 2. Short year: YY-MM-DD (e.g. 25-10-20)
  const shortIsoMatch = str.match(/^(\d{2})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (shortIsoMatch) {
    const y = Number(shortIsoMatch[1]) > 50 ? `19${shortIsoMatch[1]}` : `20${shortIsoMatch[1]}`
    const m = shortIsoMatch[2].padStart(2, '0')
    const d = shortIsoMatch[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // 3. Month/Day/Year: MM/DD/YYYY or M/D/YY
  const mdyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)
  if (mdyMatch) {
    let y = mdyMatch[3]
    if (y.length === 2) {
      y = Number(y) > 50 ? `19${y}` : `20${y}`
    }
    const m = mdyMatch[1].padStart(2, '0')
    const d = mdyMatch[2].padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return null
}

/**
 * Parses raw CSV content from duty tracking spreadsheets.
 * 
 * @param {string} csvContent
 * @param {Array<Object>} [dutyCatalog] - Existing duty catalog presets for duration lookups
 * @returns {{ duties: Array<Object>, summaryByYear: Object, totalFound: number }}
 */
export function parseDutiesCsv(csvContent, dutyCatalog = []) {
  if (!csvContent || typeof csvContent !== 'string') {
    return { duties: [], summaryByYear: {}, totalFound: 0 }
  }

  // Parse CSV as raw array of rows to handle varied header placements and comments
  const parsed = Papa.parse(csvContent.trim(), {
    skipEmptyLines: true
  })

  const rows = parsed.data || []
  if (rows.length === 0) {
    return { duties: [], summaryByYear: {}, totalFound: 0 }
  }

  // Map known duty names to catalog defaults
  const catalogMap = new Map()
  if (Array.isArray(dutyCatalog)) {
    for (const d of dutyCatalog) {
      if (d.name) {
        catalogMap.set(d.name.toLowerCase().trim(), d)
      }
    }
  }

  let dateCol = -1
  let dutyCol = -1
  let durationCol = -1
  let notesCol = -1

  const duties = []
  const summaryByYear = {}

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    if (!Array.isArray(row) || row.length < 2) continue

    // Check if this row is a header row
    const lowerCells = row.map(c => String(c || '').toLowerCase().trim())
    const potentialDateIdx = lowerCells.findIndex(c => c.includes('date'))
    const potentialDutyIdx = lowerCells.findIndex(c => c === 'duty' || c.includes('duty options'))

    if (potentialDateIdx !== -1 && potentialDutyIdx !== -1) {
      dateCol = potentialDateIdx
      dutyCol = potentialDutyIdx
      durationCol = lowerCells.findIndex(c => c.includes('duration') || c.includes('durration'))
      notesCol = lowerCells.findIndex(c => c.includes('note') || c.includes('coment') || c.includes('comment'))
      continue // Move to next data row
    }

    // If headers haven't been found yet, try standard 0, 1, 2, 3 positions
    const effectiveDateCol = dateCol !== -1 ? dateCol : 0
    const effectiveDutyCol = dutyCol !== -1 ? dutyCol : 1
    const effectiveDurCol  = durationCol !== -1 ? durationCol : 2
    const effectiveNoteCol = notesCol !== -1 ? notesCol : 3

    const rawDate = row[effectiveDateCol]
    const normalizedDate = normalizeDateString(rawDate)

    // If no valid date was found in the date column, skip row (e.g. instructions, empty rows, grand totals)
    if (!normalizedDate) continue

    const rawDuty = String(row[effectiveDutyCol] || '').trim()
    if (!rawDuty) continue

    // Skip spreadsheet table summaries (e.g. "Total", "Grand Total", "Completed", "Remaining")
    const lowerDuty = rawDuty.toLowerCase()
    if (
      lowerDuty === 'total' ||
      lowerDuty === 'grand total' ||
      lowerDuty === 'completed' ||
      lowerDuty === 'remaining' ||
      lowerDuty === 'allotted minutes' ||
      lowerDuty === 'completed minutes'
    ) {
      continue
    }

    // Parse duration
    let rawDur = row[effectiveDurCol]
    let duration = Number(rawDur)
    if (isNaN(duration) || duration <= 0) {
      // Check if catalog has a default for this duty
      const preset = catalogMap.get(lowerDuty)
      duration = preset ? Number(preset.defaultDuration) || 0 : 0
    }

    // Extract notes
    const rawNotes = effectiveNoteCol !== -1 && row[effectiveNoteCol] ? String(row[effectiveNoteCol]).trim() : ''
    
    // Snow day / inclement weather check
    const lowerNotes = rawNotes.toLowerCase()
    const isSnowDay = (
      lowerNotes.includes('snow day') ||
      lowerNotes.includes('snow') ||
      lowerNotes.includes('ice day') ||
      lowerNotes.includes('cold day') ||
      lowerNotes.includes('strike') ||
      lowerNotes.includes('not needed')
    )

    // Emergency check
    const isEmergency = (
      lowerDuty.includes('emergency') ||
      lowerNotes.includes('emergency')
    )

    // Compute school year & semester
    const schoolYear = getSchoolYearFromDate(normalizedDate)
    const semester = getSemesterFromDate(normalizedDate)

    const dutyRecord = {
      date: normalizedDate,
      dutyName: rawDuty,
      duration,
      startTime: '',
      notes: rawNotes,
      isSnowDay,
      isEmergency,
      schoolYear,
      semester
    }

    duties.push(dutyRecord)

    summaryByYear[schoolYear] = (summaryByYear[schoolYear] || 0) + 1
  }

  // Sort chronologically
  duties.sort((a, b) => a.date.localeCompare(b.date))

  return {
    duties,
    summaryByYear,
    totalFound: duties.length
  }
}
