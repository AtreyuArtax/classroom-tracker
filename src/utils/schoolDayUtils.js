/**
 * src/utils/schoolDayUtils.js
 *
 * Core engine for school day and instructional day calculations.
 * 
 * Determines whether calendar days count as instructional school days
 * for classroom attendance, reports, and streak tracking.
 */

import { formatLocalDate, parseLocal } from './dates.js'

/**
 * Regex patterns for auto-classifying calendar entry labels.
 */
const INSTRUCTIONAL_MILESTONE_REGEX = /\b(mid[- ]?semester|mid[- ]?term|reporting|report\s*card|progress\s*report|cutoff)\b/i

const NON_INSTRUCTIONAL_REGEXES = [
  // Statutory / Board Holidays
  /\b(holiday|break|thanksgiving|christmas|winter\s*break|march\s*break|good\s*friday|easter|victoria\s*day|family\s*day|labour\s*day|labor\s*day|civic\s*holiday)\b/i,
  // Professional Activity / Turn Around / School Closure
  /\b(pa\s*day|p\.a\.\s*day|pd\s*day|turn\s*around|turnaround|no\s*school|school\s*closed|day\s*off)\b/i,
  // Secondary Exams
  /\b(exam|exams|exam\s*period)\b/i,
  // Feedback, Recovery and Improvement (F.R.I. / FRI Day)
  /\bf\.r\.i\./i,
  /\bfri\s+days?\b/i,
  /\bfeedback\s*,\s*recovery\b/i,
  /\brecovery\s*(?:and|&)\s*improvement\b/i,
  /\bfeedback\b/i,
  // Standalone acronym FRI (case-sensitive word boundary)
  /\bFRI\b/
]

/**
 * Automatically classifies a calendar label as non-instructional (true) or
 * an instructional milestone (false).
 *
 * @param {string} label 
 * @returns {boolean} true if non-instructional (no classes), false if instructional school day
 */
export function autoClassifyCalendarLabel(label) {
  if (!label || typeof label !== 'string') return false
  const trimmed = label.trim()
  if (!trimmed) return false

  // 1. Check if explicitly an instructional milestone (classes meet as normal)
  if (INSTRUCTIONAL_MILESTONE_REGEX.test(trimmed)) {
    return false
  }

  // 2. Check if matching non-instructional keywords (school closed, exams, FRI days, PA days)
  for (const regex of NON_INSTRUCTIONAL_REGEXES) {
    if (regex.test(trimmed)) {
      return true
    }
  }

  // 3. If unrecognized, treat as instructional (classes meet)
  return false
}

/**
 * Builds a Map of all date strings ("YYYY-MM-DD") that are flagged as non-instructional.
 * Handles single dates and date ranges (e.g. Winter Break).
 *
 * @param {Array<Object>} nonSchoolDays Array of { date, endDate, label, nonInstructional }
 * @returns {Map<string, { label: string, nonInstructional: boolean }>}
 */
export function buildNonInstructionalDateMap(nonSchoolDays = []) {
  const map = new Map()
  if (!Array.isArray(nonSchoolDays)) return map

  for (const entry of nonSchoolDays) {
    if (!entry || !entry.date) continue

    // Determine nonInstructional flag (respect explicit boolean, fallback to auto-classification)
    const isNonInst = entry.nonInstructional !== undefined
      ? Boolean(entry.nonInstructional)
      : autoClassifyCalendarLabel(entry.label)

    if (!isNonInst) continue

    const startStr = entry.date.slice(0, 10)
    const endStr = entry.endDate ? entry.endDate.slice(0, 10) : startStr

    if (startStr <= endStr) {
      let cur = parseLocal(startStr)
      const end = parseLocal(endStr)
      while (cur <= end) {
        const dStr = formatLocalDate(cur)
        map.set(dStr, {
          label: entry.label || 'Non-Instructional Day',
          nonInstructional: true
        })
        cur.setDate(cur.getDate() + 1)
      }
    } else {
      map.set(startStr, {
        label: entry.label || 'Non-Instructional Day',
        nonInstructional: true
      })
    }
  }

  return map
}

/**
 * Checks if a specific date is a non-instructional day (weekend or non-instructional holiday/PA/exam day).
 * Checks whether a given calendar date is non-instructional (weekend or scheduled holiday/PA day).
 *
 * @param {string|Date} date YYYY-MM-DD or Date object
 * @param {Array<Object>|Map} nonSchoolDays Array of holidays or pre-built Map
 * @returns {boolean} True if non-instructional (weekend or holiday)
 */
export function isNonInstructionalDay(date, nonSchoolDays = []) {
  const dateObj = typeof date === 'string' ? parseLocal(date) : date
  const dayOfWeek = dateObj.getDay()

  // Weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true
  }

  const dateStr = typeof date === 'string' && date.length === 10 ? date : formatLocalDate(dateObj)
  const map = nonSchoolDays instanceof Map ? nonSchoolDays : buildNonInstructionalDateMap(nonSchoolDays)
  return map.has(dateStr)
}

/**
 * Returns detailed classification info for a date (isNonInstructional + reason).
 *
 * @param {string|Date} date YYYY-MM-DD or Date object
 * @param {Array<Object>|Map} nonSchoolDays 
 * @returns {{ isNonInstructional: boolean, reason: string|null }}
 */
export function getNonInstructionalDayInfo(date, nonSchoolDays = []) {
  const dateObj = typeof date === 'string' ? parseLocal(date) : date
  const dayOfWeek = dateObj.getDay()

  // Weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isNonInstructional: true, reason: 'Weekend' }
  }

  const dateStr = typeof date === 'string' && date.length === 10 ? date : formatLocalDate(dateObj)
  const map = nonSchoolDays instanceof Map ? nonSchoolDays : buildNonInstructionalDateMap(nonSchoolDays)
  const match = map.get(dateStr)

  if (match) {
    return { isNonInstructional: true, reason: match.label }
  }

  return { isNonInstructional: false, reason: null }
}

/**
 * Calculates the exact school days (instructional weekdays) in a date range.
 * Automatically excludes weekends and non-instructional calendar dates.
 *
 * @param {string} fromStr Start date (YYYY-MM-DD)
 * @param {string} toStr End date (YYYY-MM-DD)
 * @param {Array<Object>} nonSchoolDays 
 * @param {Object} [options]
 * @param {boolean} [options.capToday=true] When true, caps the end date at today's date
 * @param {string} [options.todayStr] Override today's date (YYYY-MM-DD) for deterministic testing
 * @returns {{ count: number, dates: Array<string> }}
 */
export function getSchoolDaysInRange(fromStr, toStr, nonSchoolDays = [], options = {}) {
  const { capToday = true, todayStr } = options
  if (!fromStr) return { count: 0, dates: [] }

  const today = todayStr || formatLocalDate(new Date())
  let effectiveTo = toStr || today

  if (capToday && effectiveTo > today) {
    effectiveTo = today
  }

  if (fromStr > effectiveTo) {
    return { count: 0, dates: [] }
  }

  const nonInstMap = buildNonInstructionalDateMap(nonSchoolDays)
  const dates = []

  let cur = parseLocal(fromStr)
  const end = parseLocal(effectiveTo)

  while (cur <= end) {
    const dayOfWeek = cur.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dStr = formatLocalDate(cur)
      if (!nonInstMap.has(dStr)) {
        dates.push(dStr)
      }
    }
    cur.setDate(cur.getDate() + 1)
  }

  return {
    count: dates.length,
    dates
  }
}

/**
 * Merges active class event dates with calendar-driven school days up to today.
 * Guarantees that quiet class days with zero absences/events are recognized
 * as active meeting days, while preserving any special off-grid/event dates.
 *
 * @param {Array<Object>} classEvents Logged events for the class
 * @param {Object} [calendarConfig]
 * @param {string} [calendarConfig.fromStr]
 * @param {string} [calendarConfig.toStr]
 * @param {Array<Object>} [calendarConfig.nonSchoolDays]
 * @param {boolean} [calendarConfig.capToday=true]
 * @param {string} [calendarConfig.todayStr]
 * @returns {Array<string>} Chronologically sorted YYYY-MM-DD strings
 */
export function getActiveClassMeetingDates(classEvents = [], calendarConfig = null) {
  const dateSet = new Set()

  // 1. Add any dates where events were actually logged (ground truth)
  for (const e of classEvents) {
    if (!e || e.superseded) continue
    const d = e.timestamp ? e.timestamp.slice(0, 10) : ''
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      dateSet.add(d)
    }
  }

  // 2. Add calendar school days if range provided
  if (calendarConfig && calendarConfig.fromStr) {
    const { dates } = getSchoolDaysInRange(
      calendarConfig.fromStr,
      calendarConfig.toStr,
      calendarConfig.nonSchoolDays || [],
      {
        capToday: calendarConfig.capToday ?? true,
        todayStr: calendarConfig.todayStr
      }
    )
    for (const d of dates) {
      dateSet.add(d)
    }
  }

  return Array.from(dateSet).sort()
}
