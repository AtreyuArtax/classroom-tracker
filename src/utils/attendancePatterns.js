/**
 * src/utils/attendancePatterns.js
 *
 * Intelligent, read-only pattern detection for attendance and punctuality:
 * - Consecutive school-day absences (acute runs / streaks)
 * - Day-of-week clustering (e.g. "Monday effect" or "Friday effect")
 * - Chronic tardiness & cumulative instructional time lost
 * - Consecutive class lateness streaks
 * - Test/assessment day absenteeism
 *
 * Respects class activity ground truth so calendar note dates
 * (like "Term 1 cut off") never break or falsify calculations.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Converts milliseconds to minutes rounded to 0.5.
 * Pure functional, standalone equivalent of eventService.toMinutes.
 *
 * @param {number|null|undefined} ms 
 * @returns {number}
 */
export function toMinutes(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return 0
  return Math.round((Number(ms) / 60000) * 2) / 2
}

/**
 * Extracts a normalized "YYYY-MM-DD" string from a date or timestamp
 * using local components to avoid UTC 1-day shifting.
 *
 * @param {string|Date} timestamp 
 * @returns {string}
 */
export function normalizeDate(timestamp) {
  if (!timestamp) return ''
  if (typeof timestamp === 'string') {
    const isoMatch = timestamp.match(/^\d{4}-\d{2}-\d{2}/)
    if (isoMatch) return isoMatch[0]
  }
  const d = new Date(timestamp)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * from a date string, guaranteed local-safe.
 *
 * @param {string} dateStr YYYY-MM-DD or ISO timestamp
 * @returns {number} 0-6
 */
export function getDayOfWeek(dateStr) {
  const norm = normalizeDate(dateStr)
  if (!norm) return 0
  const parts = norm.split('-').map(Number)
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]).getDay()
  }
  return new Date(dateStr).getDay()
}

/**
 * Derives the unique, chronologically-sorted list of dates on which
 * active class meetings occurred based on logged event ground truth.
 *
 * @param {Array<Object>} allClassEvents
 * @returns {Array<string>} Array of "YYYY-MM-DD"
 */
export function getActiveClassDates(allClassEvents = []) {
  const dateSet = new Set()
  for (const e of allClassEvents) {
    if (!e || e.superseded) continue
    const d = normalizeDate(e.timestamp)
    if (d) dateSet.add(d)
  }
  return Array.from(dateSet).sort()
}

/**
 * Evaluates attendance patterns for a single student against the class meeting timeline.
 *
 * @param {string} studentId 
 * @param {Array<Object>} studentEvents 
 * @param {Array<string>} activeClassDates Chronologically sorted YYYY-MM-DD strings
 * @param {Object} options Threshold overrides
 * @returns {Object} Detected patterns and summary
 */
export function detectStudentAttendancePatterns(studentId, studentEvents = [], activeClassDates = [], options = {}) {
  const opts = {
    consecutiveAbsenceThreshold: 3,
    dayOfWeekClusterMinCount: 3,
    dayOfWeekClusterRatio: 0.4,
    chronicLateCountThreshold: 4,
    chronicLateMinutesThreshold: 45,
    consecutiveLateThreshold: 3,
    testDayAbsenceThreshold: 2,
    ...options
  }

  const sId = String(studentId)
  // Operate strictly on valid, non-superseded events for this student
  const validEvents = studentEvents.filter(e => String(e.studentId) === sId && !e.superseded)

  // Map absence and late dates
  const absenceEvents = validEvents.filter(e => e.code === 'a')
  const lateEvents = validEvents.filter(e => e.code === 'l')

  const absentDates = new Set(absenceEvents.map(e => normalizeDate(e.timestamp)).filter(Boolean))
  const lateDates = new Set(lateEvents.map(e => normalizeDate(e.timestamp)).filter(Boolean))

  const patterns = []

  // ── 1. Consecutive Absences (Across Active Class Meetings) ───────────────
  let maxAbsenceStreak = 0
  let currentAbsenceStreak = 0

  for (const dateStr of activeClassDates) {
    if (absentDates.has(dateStr)) {
      currentAbsenceStreak++
      if (currentAbsenceStreak > maxAbsenceStreak) {
        maxAbsenceStreak = currentAbsenceStreak
      }
    } else {
      currentAbsenceStreak = 0
    }
  }

  if (maxAbsenceStreak >= opts.consecutiveAbsenceThreshold) {
    const isCurrent = currentAbsenceStreak >= opts.consecutiveAbsenceThreshold
    patterns.push({
      type: 'consecutive_absences',
      streak: maxAbsenceStreak,
      isCurrent,
      severity: 'danger',
      reason: `${maxAbsenceStreak} consecutive absences${isCurrent ? ' (Active)' : ''}`,
      sortVal: 200 + maxAbsenceStreak
    })
  }

  // ── 2. Consecutive Lates ──────────────────────────────────────────────────
  let maxLateStreak = 0
  let currentLateStreak = 0

  for (const dateStr of activeClassDates) {
    if (lateDates.has(dateStr)) {
      currentLateStreak++
      if (currentLateStreak > maxLateStreak) {
        maxLateStreak = currentLateStreak
      }
    } else {
      currentLateStreak = 0
    }
  }

  if (maxLateStreak >= opts.consecutiveLateThreshold) {
    patterns.push({
      type: 'consecutive_lates',
      streak: maxLateStreak,
      severity: 'warning',
      reason: `Late ${maxLateStreak} consecutive classes`,
      sortVal: 100 + maxLateStreak
    })
  }

  // ── 3. Day-of-Week Clustering (Monday / Friday Effect) ───────────────────
  const dowCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const d of absentDates) {
    const dow = getDayOfWeek(d)
    if (dow >= 1 && dow <= 5) {
      dowCounts[dow] = (dowCounts[dow] || 0) + 1
    }
  }

  const totalWeekdayAbsences = Object.values(dowCounts).reduce((a, b) => a + b, 0)

  if (totalWeekdayAbsences >= opts.dayOfWeekClusterMinCount) {
    for (let dow = 1; dow <= 5; dow++) {
      const count = dowCounts[dow]
      const ratio = totalWeekdayAbsences > 0 ? (count / totalWeekdayAbsences) : 0

      if (count >= opts.dayOfWeekClusterMinCount && (ratio >= opts.dayOfWeekClusterRatio || count >= 4)) {
        const pct = Math.round(ratio * 100)
        patterns.push({
          type: 'day_of_week_cluster',
          dayOfWeek: dow,
          dayName: DAY_NAMES[dow],
          count,
          total: totalWeekdayAbsences,
          percentage: pct,
          severity: 'warning',
          reason: `Recurring ${DAY_NAMES[dow]} absences (${count} missed · ${pct}%)`,
          sortVal: 80 + count
        })
      }
    }
  }

  // ── 4. Chronic Tardiness & Time Lost ─────────────────────────────────────
  const totalLateCount = lateEvents.length
  const totalLateMinutes = Math.round(lateEvents.reduce((sum, e) => sum + toMinutes(e.duration), 0))

  if (totalLateCount >= opts.chronicLateCountThreshold || totalLateMinutes >= opts.chronicLateMinutesThreshold) {
    const isSevere = totalLateCount >= 8 || totalLateMinutes >= 90
    patterns.push({
      type: 'chronic_late',
      lateCount: totalLateCount,
      lateMinutes: totalLateMinutes,
      severity: isSevere ? 'danger' : 'warning',
      reason: totalLateMinutes > 0
        ? `Frequent lates (${totalLateCount} lates · ${totalLateMinutes}m lost)`
        : `Frequent lates (${totalLateCount} lates)`,
      sortVal: 60 + totalLateCount
    })
  }

  // ── 5. Assessment / Test Day Absences ────────────────────────────────────
  const assessmentDateSet = new Set((opts.assessmentDates || []).map(normalizeDate).filter(Boolean))
  const testAbsences = absenceEvents.filter(e => {
    if (Boolean(e.testDay)) return true
    const d = normalizeDate(e.timestamp)
    return assessmentDateSet.has(d)
  })
  if (testAbsences.length >= opts.testDayAbsenceThreshold) {
    patterns.push({
      type: 'test_day_absence',
      count: testAbsences.length,
      severity: 'danger',
      reason: `Absent on ${testAbsences.length} test days`,
      sortVal: 150 + testAbsences.length
    })
  }

  const hasPatterns = patterns.length > 0
  const highestSeverity = patterns.some(p => p.severity === 'danger') ? 'danger' : 'warning'
  const primaryReason = patterns.length > 0 ? patterns[0].reason : ''
  const combinedReason = patterns.map(p => p.reason).join(' · ')
  const highestSortVal = patterns.reduce((max, p) => Math.max(max, p.sortVal || 0), 0)

  return {
    studentId: sId,
    hasPatterns,
    patterns,
    highestSeverity,
    primaryReason,
    combinedReason,
    sortVal: highestSortVal,
    metrics: {
      totalAbsences: absentDates.size,
      maxAbsenceStreak,
      currentAbsenceStreak,
      totalLates: totalLateCount,
      totalLateMinutes,
      maxLateStreak,
      testDayAbsences: testAbsences.length
    }
  }
}

/**
 * Detects patterns for all students in a class.
 *
 * @param {Array<Object>} allClassEvents 
 * @param {Array<Object>|Object} studentRoster Student map or array of students
 * @param {Object} options Threshold overrides
 * @returns {Array<Object>} Flagged student pattern items sorted by severity
 */
export function detectClassAttendancePatterns(allClassEvents = [], studentRoster = [], options = {}) {
  const activeDates = getActiveClassDates(allClassEvents)
  if (activeDates.length === 0) return []

  // Resolve student IDs to check
  const studentIds = new Set()
  if (Array.isArray(studentRoster)) {
    studentRoster.forEach(s => {
      const id = s?.studentId || s?.id
      if (id) studentIds.add(String(id))
    })
  } else if (studentRoster && typeof studentRoster === 'object') {
    Object.keys(studentRoster).forEach(id => studentIds.add(String(id)))
  }

  // Also include any students with events in the period
  for (const e of allClassEvents) {
    if (e && e.studentId) studentIds.add(String(e.studentId))
  }

  const results = []

  for (const sId of studentIds) {
    const sEvents = allClassEvents.filter(e => String(e.studentId) === sId)
    const analysis = detectStudentAttendancePatterns(sId, sEvents, activeDates, options)
    if (analysis.hasPatterns) {
      results.push(analysis)
    }
  }

  // Sort results: danger first, then highest sortVal descending
  const severityRank = { danger: 0, warning: 1 }
  results.sort((a, b) => {
    const rA = severityRank[a.highestSeverity] ?? 2
    const rB = severityRank[b.highestSeverity] ?? 2
    if (rA !== rB) return rA - rB
    return b.sortVal - a.sortVal
  })

  return results
}
