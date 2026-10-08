/**
 * src/utils/studentRiskMath.js
 *
 * Pure mathematical algorithms and coordinate projection for the
 * Student Risk & Engagement Matrix (StudentRiskScatterPlot.vue).
 *
 * Evaluates student "Time in Class (%)" across scheduled instructional minutes,
 * incorporating full 75m absences, late arrivals, and out-of-class/washroom
 * departures with daily safety clamping and interactive factor toggles.
 *
 * Follows CLAUDE.md:
 * - Pure calculations in src/utils/
 * - Zero IndexedDB dependencies
 * - Fully testable via standalone Node scripts
 */

import { toMinutes } from './timeUtils.js'
import { getSBARLevelBadge } from './gradeCalcSBAR.js'

/**
 * Extracts student initials (2 uppercase characters).
 *
 * @param {string} [name] Full name string
 * @param {string} [firstName]
 * @param {string} [lastName]
 * @returns {string}
 */
export function getInitials(name, firstName, lastName) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }
  return 'ST'
}

/**
 * Builds the dynamic descriptive subtitle based on active loss factors.
 *
 * @param {Object} filters
 * @param {boolean} filters.absences
 * @param {boolean} filters.lates
 * @param {boolean} filters.washroom
 * @param {boolean} isSbar
 * @returns {string}
 */
export function getMetricSubtitle(filters = {}, isSbar = false) {
  const academicLabel = isSbar ? 'Academic Level' : 'Academic Mark'
  const { absences = true, lates = true, washroom = true } = filters

  if (absences && lates && washroom) {
    return `Comparing ${academicLabel} vs. Time in Class (All Factors)`
  }
  if (!absences && lates && washroom) {
    return `Comparing ${academicLabel} vs. Time in Class (Lates & Hallway)`
  }
  if (absences && !lates && !washroom) {
    return `Comparing ${academicLabel} vs. Time in Class (Absences Only)`
  }
  if (!absences && lates && !washroom) {
    return `Comparing ${academicLabel} vs. Time in Class (Lates Only)`
  }
  if (!absences && !lates && washroom) {
    return `Comparing ${academicLabel} vs. Time in Class (Hallway Only)`
  }
  if (absences && lates && !washroom) {
    return `Comparing ${academicLabel} vs. Time in Class (Absences & Lates)`
  }
  if (absences && !lates && washroom) {
    return `Comparing ${academicLabel} vs. Time in Class (Absences & Hallway)`
  }
  return `Comparing ${academicLabel} vs. Time in Class`
}

/**
 * Primary calculation engine for the Student Risk & Engagement Matrix.
 *
 * @param {Object} params
 * @param {Array<Object>} params.sidebarStudents Roster of students
 * @param {Array<Object>} params.allClassEvents All recorded classroom events
 * @param {Object} params.classGrades Map of { [studentId]: { overallGrade } }
 * @param {Object} [params.thresholds] Threshold configuration
 * @param {Object} [params.filters] Active factor toggles { absences, lates, washroom }
 * @param {number} [params.periodDuration=75] Standard period duration in minutes
 * @param {Set|Array} [params.washCodes] Recognized out-of-class behavior code keys
 * @param {boolean} [params.isSbar=false] Whether SBAR grading is active
 * @returns {Object} Matrix data including points, counts, and groups
 */
export function calculateStudentRiskMatrix({
  sidebarStudents = [],
  allClassEvents = [],
  classGrades = {},
  thresholds = {},
  filters = { absences: true, lates: true, washroom: true },
  periodDuration = 75,
  washCodes = new Set(['w']),
  isSbar = false
}) {
  if (!sidebarStudents || sidebarStudents.length === 0) {
    return {
      studentPoints: [],
      quadrantGroups: [],
      criticalCount: 0,
      academicRiskCount: 0,
      attendanceRiskCount: 0,
      thrivingCount: 0,
      unassessedCount: 0,
      totalDays: 0,
      scheduledMins: 0,
      metricSubtitle: getMetricSubtitle(filters, isSbar)
    }
  }

  const activeFilters = {
    absences: filters.absences !== false,
    lates: filters.lates !== false,
    washroom: filters.washroom !== false
  }

  const washCodeSet = washCodes instanceof Set ? washCodes : new Set(washCodes || ['w'])
  const distinctDaysSet = new Set()

  // Track student events grouped by studentId and calendar date
  const studentDaysMap = {}
  const studentAbsenceCountMap = {}

  allClassEvents.forEach(e => {
    if (!e || e.superseded || !e.studentId) return
    const sId = String(e.studentId)
    const dateStr = e.timestamp ? String(e.timestamp).slice(0, 10) : 'unknown'
    if (e.timestamp) distinctDaysSet.add(dateStr)

    if (!studentDaysMap[sId]) studentDaysMap[sId] = {}
    if (!studentDaysMap[sId][dateStr]) {
      studentDaysMap[sId][dateStr] = {
        hasAbsence: false,
        lateMinsRaw: 0,
        lateCount: 0,
        washroomMinsRaw: 0,
        washroomCount: 0
      }
    }

    const dayEntry = studentDaysMap[sId][dateStr]

    // 1. Absence Detection
    if (e.code === 'a' || e.eventType === 'absence') {
      dayEntry.hasAbsence = true
      studentAbsenceCountMap[sId] = (studentAbsenceCountMap[sId] || 0) + 1
    }

    // 2. Late Detection
    if (e.code === 'l') {
      const mins = e.duration != null ? toMinutes(e.duration) : 0
      dayEntry.lateMinsRaw += mins
      dayEntry.lateCount += 1
    }

    // 3. Out-of-Class / Washroom Detection
    if (washCodeSet.has(e.code) || e.category === 'washroom' || e.type === 'toggle') {
      const mins = e.duration != null ? toMinutes(e.duration) : 0
      dayEntry.washroomMinsRaw += mins
      dayEntry.washroomCount += 1
    }
  })

  const maxAbsences = Math.max(...Object.values(studentAbsenceCountMap), 0)
  const totalDays = Math.max(distinctDaysSet.size, maxAbsences, 1)
  const scheduledMins = totalDays * periodDuration

  const academicCutoff = Number(thresholds.atRiskThreshold ?? 70)
  const attendanceCutoff = Number(thresholds.attendanceThreshold ?? 85)

  // Map students to raw data and coordinates
  const rawList = sidebarStudents.map(student => {
    const sId = String(student.studentId)
    const gradeObj = classGrades[sId]
    const rawGrade = gradeObj && gradeObj.overallGrade !== undefined && gradeObj.overallGrade !== -1
      ? gradeObj.overallGrade
      : null
    const grade = rawGrade !== null ? Math.round(rawGrade) : null
    const sbarBadge = grade !== null ? getSBARLevelBadge(grade) : null

    const studentDays = studentDaysMap[sId] || {}
    let totalAbsences = 0
    let totalAbsenceMins = 0
    let totalLateCount = 0
    let totalLateMins = 0
    let totalWashroomCount = 0
    let totalWashroomMins = 0
    let activeLostMins = 0

    Object.entries(studentDays).forEach(([_, d]) => {
      // Categorical totals
      if (d.hasAbsence) {
        totalAbsences += 1
        totalAbsenceMins += periodDuration
      }
      totalLateCount += d.lateCount
      totalLateMins += Math.round(d.lateMinsRaw)
      totalWashroomCount += d.washroomCount
      totalWashroomMins += Math.round(d.washroomMinsRaw)

      // Active lost minutes on this specific date (with daily 75m safety cap)
      let dailyActiveLost = 0
      if (activeFilters.absences && d.hasAbsence) {
        dailyActiveLost += periodDuration
      }
      if (activeFilters.lates && d.lateMinsRaw > 0) {
        dailyActiveLost += d.lateMinsRaw
      }
      if (activeFilters.washroom && d.washroomMinsRaw > 0) {
        dailyActiveLost += d.washroomMinsRaw
      }

      // Clamping: A student cannot lose more than 1 full class period on any single day
      dailyActiveLost = Math.min(periodDuration, dailyActiveLost)
      activeLostMins += dailyActiveLost
    })

    // Total Time in Class (%)
    const timeInClassPct = Math.max(
      0,
      Math.min(100, Math.round(((scheduledMins - activeLostMins) / scheduledMins) * 100))
    )

    // Equivalent full classes lost
    const equivClassesLost = activeLostMins > 0 ? (activeLostMins / periodDuration).toFixed(1) : '0.0'

    // X-axis: Map timeInClassPct (50% to 100% active domain) to graph X position (6% to 92%)
    // Eliminates the empty 0%-50% dead desert, centers the threshold line, and gives students room to disperse.
    const normX = Math.max(0, Math.min(1, (timeInClassPct - 50) / 50))
    const baseX = Math.max(6, Math.min(92, Math.round(normX * 86 + 6)))

    // Y-axis: Map grade (0% to 100%) to graph Y position (6% to 92%)
    let baseY = 50
    let quadrant = 'unassessed'

    if (grade === null) {
      quadrant = 'unassessed'
      baseY = 50
    } else {
      baseY = Math.max(6, Math.min(92, Math.round(grade * 0.86 + 6)))
      if (timeInClassPct < attendanceCutoff && grade < academicCutoff) {
        quadrant = 'red' // Critical Intervention
      } else if (timeInClassPct >= attendanceCutoff && grade < academicCutoff) {
        quadrant = 'yellow' // Academic Risk
      } else if (timeInClassPct < attendanceCutoff && grade >= academicCutoff) {
        quadrant = 'orange' // Attendance/Presence Risk
      } else {
        quadrant = 'green' // Thriving
      }
    }

    // Option 1: Chronic Disruption Halo (Frequent Hallway / Late Leaver)
    // Identifies students with serial out-of-class patterns without fudging raw minute percentages
    const schoolDays = Math.max(totalDays, 1)
    const tripsPerWeek = (totalWashroomCount / schoolDays) * 5
    const avgWashroomMins = totalWashroomCount > 0 ? (totalWashroomMins / totalWashroomCount) : 0
    const latesPerWeek = (totalLateCount / schoolDays) * 5

    const isChronicHallway = totalWashroomCount >= 5 && (tripsPerWeek >= 2.5 || totalWashroomCount >= 10)
    const isExtendedHallway = totalWashroomCount >= 3 && avgWashroomMins >= 12
    const isChronicLate = totalLateCount >= 4 && (latesPerWeek >= 2.0 || totalLateCount >= 8)

    // Respect active filters: only halo factors that are currently enabled
    const hasHallwayHalo = Boolean(activeFilters.washroom && (isChronicHallway || isExtendedHallway))
    const hasLateHalo = Boolean(activeFilters.lates && isChronicLate)
    const hasHalo = hasHallwayHalo || hasLateHalo

    let haloReason = ''
    if (hasHallwayHalo && hasLateHalo) {
      haloReason = `Frequent Leaver (${totalWashroomCount} hall · ${totalLateCount} late)`
    } else if (hasHallwayHalo) {
      if (isExtendedHallway && !isChronicHallway) {
        haloReason = `Extended Hall Departures (${totalWashroomCount} trips · avg ${Math.round(avgWashroomMins)}m)`
      } else {
        haloReason = `Frequent Hallway Leaver (${totalWashroomCount} trips · ${tripsPerWeek.toFixed(1)}/wk)`
      }
    } else if (hasLateHalo) {
      haloReason = `Chronically Late (${totalLateCount} lates · ${latesPerWeek.toFixed(1)}/wk)`
    }

    const initials = getInitials(student.name, student.firstName, student.lastName)

    return {
      studentId: sId,
      fullName: student.name || `${student.firstName} ${student.lastName}`,
      initials,
      grade,
      sbarBadge,
      timeInClassPct,
      activeLostMins: Math.round(activeLostMins),
      equivClassesLost,
      absences: totalAbsences,
      absenceMins: totalAbsenceMins,
      lateCount: totalLateCount,
      lateMins: totalLateMins,
      washroomCount: totalWashroomCount,
      washroomMins: totalWashroomMins,
      tripsPerWeek: Number(tripsPerWeek.toFixed(1)),
      latesPerWeek: Number(latesPerWeek.toFixed(1)),
      avgWashroomMins: Math.round(avgWashroomMins),
      hasHalo,
      hasHallwayHalo,
      hasLateHalo,
      haloReason,
      baseX,
      baseY,
      quadrant,
      isUnassessed: grade === null
    }
  })

  // Beeswarm / Circle Relaxation Packing to eliminate all dot overlaps
  const points = rawList.map(item => ({
    ...item,
    xPercent: item.baseX,
    yPercent: item.baseY
  }))

  const aspectScaleX = 2.8 // Canvas is wider than tall in % space (~2.8x)
  const minDistance = 11.5 // Minimum distance in normalized pixel space (~24px)
  const iterations = 24

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i]
        const p2 = points[j]
        let dx = (p2.xPercent - p1.xPercent) * aspectScaleX
        let dy = p2.yPercent - p1.yPercent
        let dist = Math.hypot(dx, dy)

        if (dist === 0) {
          dx = (i % 2 === 0 ? 1 : -1) * 0.3
          dy = (j % 2 === 0 ? 1 : -1) * 0.3
          dist = Math.hypot(dx, dy)
        }

        if (dist < minDistance) {
          const overlap = (minDistance - dist) / 2
          const nx = dx / dist
          const ny = dy / dist

          p1.xPercent -= (nx / aspectScaleX) * overlap
          p1.yPercent -= ny * overlap
          p2.xPercent += (nx / aspectScaleX) * overlap
          p2.yPercent += ny * overlap
        }
      }
    }

    // Keep strictly within visual card bounds [6%, 92%] in X and [7%, 91%] in Y
    points.forEach(p => {
      p.xPercent = Math.max(6, Math.min(92, p.xPercent))
      p.yPercent = Math.max(7, Math.min(91, p.yPercent))
    })
  }

  // Attach cluster members for multi-student popovers
  const finalPoints = points.map(item => {
    const clusterMembers = points.filter(other => {
      const dist = Math.hypot((other.xPercent - item.xPercent) * aspectScaleX, other.yPercent - item.yPercent)
      return dist <= 13.5
    })
    return {
      ...item,
      xPercent: Number(item.xPercent.toFixed(1)),
      yPercent: Number(item.yPercent.toFixed(1)),
      clusterMembers
    }
  })

  const quadrantGroups = [
    { key: 'red', title: 'Critical Intervention', students: finalPoints.filter(p => p.quadrant === 'red') },
    { key: 'yellow', title: 'Academic Risk', students: finalPoints.filter(p => p.quadrant === 'yellow') },
    { key: 'orange', title: 'Attendance Risk', students: finalPoints.filter(p => p.quadrant === 'orange') },
    { key: 'green', title: 'Thriving', students: finalPoints.filter(p => p.quadrant === 'green') },
    { key: 'unassessed', title: 'Pending Marks', students: finalPoints.filter(p => p.quadrant === 'unassessed') }
  ].filter(g => g.students.length > 0)

  return {
    studentPoints: finalPoints,
    quadrantGroups,
    criticalCount: finalPoints.filter(p => p.quadrant === 'red').length,
    academicRiskCount: finalPoints.filter(p => p.quadrant === 'yellow').length,
    attendanceRiskCount: finalPoints.filter(p => p.quadrant === 'orange').length,
    thrivingCount: finalPoints.filter(p => p.quadrant === 'green').length,
    unassessedCount: finalPoints.filter(p => p.quadrant === 'unassessed').length,
    totalDays,
    scheduledMins,
    metricSubtitle: getMetricSubtitle(activeFilters, isSbar)
  }
}
