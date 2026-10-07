/**
 * actionAlerts.js — pure logic behind the "Action Required" list.
 *
 * Shared by the Reports overview panel and the Student360 action bar (via
 * composables/useActionAlerts.js) so both always agree on who is flagged and why.
 *
 * Every item carries `kinds` (subset of 'grade' | 'attendance' | 'missing' | 'washroom')
 * so the email modal can preselect the matching report sections.
 */

import { detectClassAttendancePatterns } from './attendancePatterns.js'
import { toMinutes } from './timeUtils.js'

/** Re-surface a handled alert when the situation gets worse after it was handled. */
export const RE_TRIGGER_THRESHOLDS = {
  GRADE_DROP_PCT: 2,
  NEW_ABSENCES_COUNT: 2
}

const SEVERITY_ORDER = { high: 0, danger: 0, medium: 1, warning: 1, low: 2 }

function addKind(item, kind) {
  if (!item.kinds.includes(kind)) item.kinds.push(kind)
}

/**
 * Attendance, low-grade and washroom follow-ups for the selected period.
 * @param {Object} opts
 * @param {Object} opts.students       Active (non-archived) students map { id: student }
 * @param {Array}  opts.periodEvents   Events inside the selected period
 * @param {Array}  opts.assessments    Assessments (for test-day absence detection)
 * @param {Object} opts.classGrades    { studentId: { overallGrade } }
 * @param {Array}  opts.washCodes      Behaviour code keys of toggle (out-of-room) type
 * @param {number} opts.washLimit      Minutes before a trip counts as extended
 */
export function buildFollowUpItems({
  students = {},
  periodEvents = [],
  allEvents = null,
  assessments = [],
  classGrades = {},
  washCodes = [],
  washLimit = 11,
  thresholds = {}
}) {
  const items = []

  const absMap = {}
  const washMap = {}
  periodEvents.forEach(e => {
    if (e.superseded) return
    if (e.code === 'a') {
      absMap[e.studentId] = (absMap[e.studentId] ?? 0) + 1
    }
    if (washCodes.includes(e.code) && e.duration != null) {
      if (!washMap[e.studentId]) washMap[e.studentId] = []
      washMap[e.studentId].push(toMinutes(e.duration))
    }
  })

  const nameFor = id => students[id] ? `${students[id].lastName}, ${students[id].firstName}` : id
  const push = (id, reason, severity, sortVal, kind) =>
    items.push({ studentId: id, name: nameFor(id), reason, severity, sortVal, kinds: [kind] })

  // Run attendance & punctuality pattern detection
  const assessmentDates = (assessments || [])
    .filter(a => a && a.date)
    .map(a => (a.date || '').split('T')[0])
    .filter(Boolean)

  const eventsForPatterns = (allEvents && allEvents.length > 0) ? allEvents : periodEvents
  const patternOptions = {
    assessmentDates,
    enableConsecutiveTier1: thresholds.enableConsecutiveTier1 ?? true,
    consecutiveAbsenceThreshold: thresholds.consecutiveAbsenceTier1 ?? 3,
    consecutiveTier1Label: thresholds.consecutiveTier1Label ?? '',
    enableConsecutiveTier2: thresholds.enableConsecutiveTier2 ?? true,
    consecutiveAbsenceTier2Threshold: thresholds.consecutiveAbsenceTier2 ?? 5,
    consecutiveTier2Label: thresholds.consecutiveTier2Label ?? 'Notify Alpha VP',
    absenceWindowDays: thresholds.absenceWindowDays ?? 15,
    enableWindowTier1: thresholds.enableWindowTier1 ?? true,
    absenceWindowTier1: thresholds.absenceWindowTier1 ?? 5,
    windowTier1Label: thresholds.windowTier1Label ?? 'Contact family',
    enableWindowTier2: thresholds.enableWindowTier2 ?? true,
    absenceWindowTier2: thresholds.absenceWindowTier2 ?? 8,
    windowTier2Label: thresholds.windowTier2Label ?? 'Student Success referral',
    calendarConfig: thresholds.calendarConfig || null
  }

  const detectedPatterns = detectClassAttendancePatterns(eventsForPatterns, students, patternOptions)
  const patternMap = {}
  detectedPatterns.forEach(p => {
    patternMap[p.studentId] = p
  })

  // Set of all student IDs with either period absences or detected attendance patterns
  const candidateStudentIds = new Set([
    ...Object.keys(absMap),
    ...Object.keys(patternMap)
  ])

  // 1. Absences & absence patterns
  candidateStudentIds.forEach(id => {
    if (!students[id]) return
    const pData = patternMap[id]
    const count = absMap[id] ?? pData?.metrics?.totalAbsences ?? 0
    const consec = pData?.patterns?.find(p => p.type === 'consecutive_absences')
    const shortPeriod = pData?.patterns?.find(p => p.type === 'short_period_absences')
    const dow = pData?.patterns?.find(p => p.type === 'day_of_week_cluster')
    const testAbs = pData?.patterns?.find(p => p.type === 'test_day_absence')

    if (consec && shortPeriod) {
      const isVp = consec.isVpAlert
      const isSuccessReferral = shortPeriod.tier === 2
      let combined = ''
      if (isVp) {
        combined = `${consec.reason} · ${shortPeriod.reason}`
      } else {
        combined = `${shortPeriod.reason} · ${consec.reason}`
      }
      push(id, combined, 'high', (isVp ? 270 : (isSuccessReferral ? 250 : 210)) + count, 'attendance')
    } else if (consec) {
      const isVp = consec.isVpAlert
      const reason = count > consec.streak ? `${consec.reason} · ${count} total` : consec.reason
      push(id, reason, 'high', (isVp ? 260 : 200) + count, 'attendance')
    } else if (shortPeriod) {
      const isTier2 = shortPeriod.tier === 2
      const reason = count > shortPeriod.count ? `${shortPeriod.reason} · ${count} total` : shortPeriod.reason
      push(id, reason, 'high', (isTier2 ? 240 : 170) + count, 'attendance')
    } else if (testAbs) {
      push(id, `${testAbs.reason} · ${count} total`, 'high', 180 + count, 'attendance')
    } else if (dow) {
      const reason = count > dow.count ? `${dow.reason} · ${count} total` : dow.reason
      push(id, reason, count >= 5 ? 'high' : 'medium', (count >= 5 ? 150 : 80) + count, 'attendance')
    } else if (count >= 8 && thresholds.enableWindowTier2 !== false) {
      push(id, `${count} absences`, 'high', 120 + count, 'attendance')
    } else if (count >= 5 && thresholds.enableWindowTier1 !== false) {
      push(id, `${count} absences`, 'high', 100 + count, 'attendance')
    } else if (count >= 3 && thresholds.enableConsecutiveTier1 !== false) {
      push(id, `${count} absences`, 'medium', count, 'attendance')
    }
  })

  // 2. Chronic tardiness & consecutive lates
  Object.entries(patternMap).forEach(([id, pData]) => {
    if (!students[id]) return
    const latePatterns = pData.patterns.filter(p => p.type === 'chronic_late' || p.type === 'consecutive_lates')
    if (latePatterns.length === 0) return

    const lateReason = latePatterns.map(p => p.reason).join(' · ')
    const lateSeverity = latePatterns.some(p => p.severity === 'danger') ? 'high' : 'medium'
    const existing = items.find(i => i.studentId === id)

    if (existing) {
      existing.reason += ` · ${lateReason}`
      addKind(existing, 'attendance')
      if (lateSeverity === 'high' && existing.severity !== 'high') {
        existing.severity = 'high'
      }
    } else {
      push(id, lateReason, lateSeverity, (lateSeverity === 'high' ? 70 : 40) + (pData.metrics?.totalLates || 0), 'attendance')
    }
  })

  // 3. Academic follow-up for grades < 60%
  Object.entries(classGrades || {}).forEach(([id, data]) => {
    if (data?.overallGrade != null && data.overallGrade < 60 && students[id]) {
      const alreadyHigh = items.some(i => i.studentId === id && i.severity === 'high')
      if (!alreadyHigh) {
        push(id, `Grade at ${Math.round(data.overallGrade)}%`, 'high', 100 - data.overallGrade, 'grade')
      }
    }
  })

  // 4. Extended washroom excursions
  Object.entries(washMap).forEach(([id, durations]) => {
    if (!students[id]) return
    const extendedTrips = durations.filter(d => d > washLimit)
    const longest = Math.max(...durations)
    if (extendedTrips.length >= 2) {
      push(id, `${extendedTrips.length} extended absences (max ${Math.round(longest)}m)`, 'high', longest + 100, 'washroom')
    } else if (extendedTrips.length === 1) {
      push(id, `${Math.round(longest)}min out of class`, 'medium', longest, 'washroom')
    }
  })

  items.sort((a, b) => {
    const rankA = SEVERITY_ORDER[a.severity] ?? 2
    const rankB = SEVERITY_ORDER[b.severity] ?? 2
    if (rankA !== rankB) return rankA - rankB
    return b.sortVal - a.sortVal
  })
  return items
}

/**
 * Students with explicitly-missing work.
 * @param {Array}  opts.studentList  [{ studentId, firstName, lastName, name? }]
 * @param {Array}  opts.assessments  Subject-filtered assessments
 * @param {Object} opts.gradeMap     { assessmentId: { studentId: gradeRecord } }
 * @param {Object} opts.classGrades  { studentId: { overallGrade } }
 */
export function buildMissingSummary({ studentList = [], assessments = [], gradeMap = null, classGrades = {} }) {
  if (studentList.length === 0 || assessments.length === 0 || !gradeMap) return []

  const result = []
  studentList.forEach(st => {
    const sId = String(st.studentId)
    const stTasks = []

    assessments.forEach(ast => {
      if (ast.excluded) return
      const g = gradeMap[String(ast.assessmentId)]?.[sId]
      if (g && g.excluded) return
      if (g && (g.missing || g.status === 'missing')) {
        stTasks.push({
          assessmentId: ast.assessmentId,
          name: ast.name || ast.title || 'Untitled Assessment',
          category: ast.category || ast.categoryName || '',
          date: ast.date || ast.dueDate || '',
          isExplicit: true
        })
      }
    })

    if (stTasks.length > 0) {
      const gObj = classGrades[sId]
      result.push({
        studentId: sId,
        name: st.name || `${st.firstName} ${st.lastName}`,
        grade: gObj?.overallGrade != null ? Math.round(gObj.overallGrade) : null,
        tasks: stTasks
      })
    }
  })

  // Most missing tasks first
  return result.sort((a, b) => b.tasks.length - a.tasks.length)
}

/**
 * Merges failing grades, follow-ups and missing work into one item per student.
 * @param {Array}   opts.studentList     Active students [{ studentId, firstName, lastName }]
 * @param {Object}  opts.classGrades
 * @param {Array}   opts.followUpItems   From buildFollowUpItems
 * @param {Array}   opts.missingSummary  From buildMissingSummary
 * @param {boolean} opts.isSBAR
 */
export function buildActionItems({ studentList = [], classGrades = {}, followUpItems = [], missingSummary = [], isSBAR = false }) {
  const items = []
  const byId = new Map(studentList.map(s => [String(s.studentId), s]))
  const gradeOf = sId => {
    const g = classGrades[sId]?.overallGrade
    return g !== undefined && g !== null ? Math.round(g) : null
  }

  // 1. Academic risk (failing < 50% or Level 1 / R)
  Object.entries(classGrades).forEach(([sId, gObj]) => {
    const student = byId.get(String(sId))
    if (!student || gObj?.overallGrade == null || gObj.overallGrade >= 50) return
    items.push({
      studentId: String(sId),
      name: student.name || `${student.lastName}, ${student.firstName}`,
      grade: Math.round(gObj.overallGrade),
      reason: isSBAR ? 'Level 1 / Remediation Needed' : 'Failing Grade (<50%)',
      severity: 'danger',
      kinds: ['grade']
    })
  })

  // 2. Attendance, low grade and washroom follow-ups
  followUpItems.forEach(item => {
    const sId = String(item.studentId)
    if (!byId.has(sId)) return
    const existing = items.find(i => i.studentId === sId)
    const isDanger = item.severity === 'danger' || item.severity === 'high'

    // "Grade at 42%" would repeat the failing-grade reason already on this student
    const isOnlyGrade = item.kinds?.length === 1 && item.kinds[0] === 'grade'
    if (existing && isOnlyGrade && existing.kinds.includes('grade')) return

    if (existing) {
      existing.reason += ` · ${item.reason}`
      ;(item.kinds || []).forEach(k => addKind(existing, k))
      if (isDanger) existing.severity = 'danger'
    } else {
      items.push({
        studentId: sId,
        name: item.name,
        grade: gradeOf(sId),
        reason: item.reason,
        severity: isDanger ? 'danger' : (item.severity || 'warning'),
        kinds: [...(item.kinds || [])]
      })
    }
  })

  // 3. Missing work
  missingSummary.forEach(m => {
    const sId = String(m.studentId)
    if (!byId.has(sId)) return
    const existing = items.find(i => i.studentId === sId)
    const taskCount = m.tasks.length
    const taskText = `${taskCount} missing task${taskCount !== 1 ? 's' : ''}`

    if (existing) {
      existing.reason += ` · ${taskText}`
      addKind(existing, 'missing')
      if (taskCount >= 3) existing.severity = 'danger'
    } else {
      items.push({
        studentId: sId,
        name: m.name,
        grade: m.grade,
        reason: `${taskText} overdue`,
        severity: taskCount >= 3 ? 'danger' : 'warning',
        kinds: ['missing']
      })
    }
  })

  return items
}

/**
 * Counts what has happened to a student since a point in time, for re-trigger checks.
 * @returns {{ attendance: number, incidents: number }}
 */
export function countEventsSince(events, studentId, sinceIso, { washCodes = [], washLimit = 11, redirectCodes = [] } = {}) {
  let attendance = 0
  let incidents = 0
  const sId = String(studentId)
  const sinceMs = sinceIso ? new Date(sinceIso).getTime() : null
  for (const e of events || []) {
    if (String(e.studentId) !== sId || e.superseded) continue
    if (sinceMs !== null && !(new Date(e.timestamp).getTime() > sinceMs)) continue
    if (e.code === 'a' || e.code === 'l') attendance++
    else if (e.category === 'redirect' || redirectCodes.includes(e.code)) incidents++
    else if (washCodes.includes(e.code) && toMinutes(e.duration) > washLimit) incidents++
  }
  return { attendance, incidents }
}

/**
 * Splits items into active and handled, re-surfacing handled items that got worse.
 * @param {Array}  items  From buildActionItems
 * @param {Object} acks   { studentId: { acknowledgedAt, gradeAtAck } }
 * @param {Array}  events All class events (active students)
 * @param {Object} codeOpts { washCodes, washLimit, redirectCodes }
 */
export function evaluateActionItems(items, acks = {}, events = [], codeOpts = {}) {
  const active = []
  const handled = []

  items.forEach(item => {
    const ack = acks[item.studentId]
    if (!ack) {
      active.push(item)
      return
    }

    const since = countEventsSince(events, item.studentId, ack.acknowledgedAt, codeOpts)
    let reTriggerReason = ''
    if (item.grade != null && ack.gradeAtAck != null && item.grade <= ack.gradeAtAck - RE_TRIGGER_THRESHOLDS.GRADE_DROP_PCT) {
      reTriggerReason = `Grade dropped further (${item.grade}%)`
    } else if (since.attendance >= RE_TRIGGER_THRESHOLDS.NEW_ABSENCES_COUNT) {
      reTriggerReason = `${RE_TRIGGER_THRESHOLDS.NEW_ABSENCES_COUNT}+ new absences/lates`
    } else if (since.incidents > 0) {
      reTriggerReason = 'New climate incident logged'
    }

    if (reTriggerReason) {
      active.push({ ...item, reason: `${item.reason} · Alert: ${reTriggerReason}`, reTriggered: true })
    } else {
      handled.push({
        ...item,
        ackDate: new Date(ack.acknowledgedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
      })
    }
  })

  return { active, handled }
}

/** Email report sections that match why a student was flagged. */
export function suggestEmailContent(kinds = []) {
  if (!kinds.length) return null
  const has = k => kinds.includes(k)
  return {
    grade: has('grade') || has('missing'),
    assessments: has('grade'),
    missing: has('missing'),
    attendance: has('attendance'),
    washroom: has('washroom')
  }
}

const CONTENT_LABELS = {
  grade: 'grade',
  missing: 'missing work',
  attendance: 'attendance',
  washroom: 'time out of class',
  assessments: 'recent assessments'
}

/** One-line parent-contact log note describing an email that was sent. */
export function buildContactNote({ recipientLabels = [], content = {}, reason = '' }) {
  const to = recipientLabels.length ? recipientLabels.join(', ') : 'home'
  const included = Object.keys(CONTENT_LABELS).filter(k => content[k]).map(k => CONTENT_LABELS[k])
  let note = `Emailed progress report to ${to}.`
  if (reason) note += ` Re: ${reason}.`
  if (included.length) note += ` Included: ${included.join(', ')}.`
  return note
}
