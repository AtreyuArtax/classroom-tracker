/**
 * src/test_student_risk_math.js
 *
 * Standalone unit test suite for studentRiskMath.js
 * Run via: node src/test_student_risk_math.js
 */

import assert from 'node:assert'
import {
  getInitials,
  getMetricSubtitle,
  calculateStudentRiskMatrix
} from './utils/studentRiskMath.js'

console.log('--- Testing studentRiskMath.js ---\n')

// ── 1. Initials extraction ─────────────────────────────────────────
console.log('[Test 1] Student Initials')
assert.strictEqual(getInitials('John Doe'), 'JD')
assert.strictEqual(getInitials('Alice'), 'AL')
assert.strictEqual(getInitials(null, 'Marcus', 'Vance'), 'MV')
assert.strictEqual(getInitials('', 'Sarah', 'Connor'), 'SC')
assert.strictEqual(getInitials(''), 'ST')
console.log('✓ Initials extracted correctly')

// ── 2. Metric Subtitle Generation ──────────────────────────────────
console.log('\n[Test 2] Metric Subtitle')
assert.strictEqual(
  getMetricSubtitle({ absences: true, lates: true, washroom: true }, false),
  'Comparing Academic Mark vs. Lost Time (All Factors)'
)
assert.strictEqual(
  getMetricSubtitle({ absences: false, lates: true, washroom: true }, false),
  'Comparing Academic Mark vs. Lost Time (Lates & Out of Class)'
)
assert.strictEqual(
  getMetricSubtitle({ absences: true, lates: false, washroom: false }, false),
  'Comparing Academic Mark vs. Lost Time (Absences Only)'
)
console.log('✓ Metric subtitles match active filter states')

// ── 3. Empty Roster ────────────────────────────────────────────────
console.log('\n[Test 3] Empty Roster')
const emptyResult = calculateStudentRiskMatrix({
  sidebarStudents: [],
  allClassEvents: []
})
assert.strictEqual(emptyResult.studentPoints.length, 0)
assert.strictEqual(emptyResult.criticalCount, 0)
assert.strictEqual(emptyResult.totalDays, 0)
assert.strictEqual(emptyResult.axisXPercent, 68)
console.log('✓ Empty roster returns safe structure')

// ── 4. In-Class Time Calculation with Realistic Events ─────────────
console.log('\n[Test 4] Time in Class Calculation across 20 Class Days')

// 20 distinct dates
const dates = Array.from({ length: 20 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`)

const students = [
  { studentId: 'st_perfect', name: 'Penny Perfect', firstName: 'Penny', lastName: 'Perfect' },
  { studentId: 'st_absent', name: 'Aaron Absent', firstName: 'Aaron', lastName: 'Absent' },
  { studentId: 'st_hallway', name: 'Harry Hallway', firstName: 'Harry', lastName: 'Hallway' }
]

const classGrades = {
  st_perfect: { overallGrade: 92 },
  st_absent: { overallGrade: 58 },
  st_hallway: { overallGrade: 54 }
}

const events = []

// Base events on all 20 dates to establish 20 instructional days (e.g. from teacher's session)
dates.forEach(d => {
  events.push({
    eventId: `ev_cal_${d}`,
    timestamp: `${d}T08:30:00.000Z`,
    studentId: 'st_perfect',
    code: 'note'
  })
})

// Aaron Absent: 1 full absence on day 1 (75 min)
events.push({
  eventId: 'ev_a1',
  timestamp: `${dates[0]}T08:30:00.000Z`,
  studentId: 'st_absent',
  code: 'a'
})

// Harry Hallway: 0 absences, but 8 lates (15 min each = 120m) and 8 washroom trips (15 min each = 120m)
// 8 * 15m = 120m late
for (let i = 0; i < 8; i++) {
  events.push({
    eventId: `ev_late_${i}`,
    timestamp: `${dates[i]}T08:45:00.000Z`,
    studentId: 'st_hallway',
    code: 'l',
    duration: 15 * 60000 // 15 mins in ms
  })
}
// 8 * 15m = 120m washroom on different dates
for (let i = 8; i < 16; i++) {
  events.push({
    eventId: `ev_wash_${i}`,
    timestamp: `${dates[i]}T09:10:00.000Z`,
    studentId: 'st_hallway',
    code: 'w',
    duration: 15 * 60000 // 15 mins in ms
  })
}

// Case 4A: All 3 Filters Active (Absences + Lates + Washroom)
const resAll = calculateStudentRiskMatrix({
  sidebarStudents: students,
  allClassEvents: events,
  classGrades,
  thresholds: { atRiskThreshold: 70 },
  filters: { absences: true, lates: true, washroom: true },
  periodDuration: 75
})

assert.strictEqual(resAll.totalDays, 20, '20 class days scheduled')
assert.strictEqual(resAll.scheduledMins, 1500, '1,500 total scheduled minutes')
assert.strictEqual(resAll.medianLostMins, 75, 'Median lost minutes across [0, 75, 240] is 75m')
assert.strictEqual(resAll.axisXPercent, 68, 'Vertical divider is anchored at 68%')

const pPerfect = resAll.studentPoints.find(p => p.studentId === 'st_perfect')
const pAbsent = resAll.studentPoints.find(p => p.studentId === 'st_absent')
const pHallway = resAll.studentPoints.find(p => p.studentId === 'st_hallway')

// Penny: 0m lost time, 92% mark -> Thriving (green)
assert.strictEqual(pPerfect.activeLostMins, 0)
assert.strictEqual(pPerfect.quadrant, 'green')
assert.strictEqual(pPerfect.baseX, 90, '0 lost time maps to rightmost edge baseX=90%')
assert.strictEqual(pPerfect.hasHalo, false, 'Penny has no halo')

// Aaron: 1 absence = 75m lost.
// Mark = 58% (< 70%). Lost time = 75m (<= 101m cutoff). -> Academic Risk (yellow)
assert.strictEqual(pAbsent.activeLostMins, 75)
assert.strictEqual(pAbsent.quadrant, 'yellow')
assert.strictEqual(pAbsent.baseX, 74, '75m lost maps to baseX=74% (on safe right side of 68% divider)')
assert.strictEqual(pAbsent.hasHalo, false, 'Aaron has no halo')
assert.strictEqual(pAbsent.medianMultiple, 1.0, 'Aaron is exactly at class median (75m / 75m = 1.0x)')

// Harry: 0 absences, 240m lost (120m late + 120m washroom).
// Mark = 54% (< 70%). Lost time = 240m (> 101m cutoff).
// Correctly lands in Critical Intervention (red)!
assert.strictEqual(pHallway.activeLostMins, 240)
assert.strictEqual(pHallway.quadrant, 'red')
assert.strictEqual(pHallway.baseX, 8, '240m maximum lost maps to leftmost edge baseX=8%')
assert.strictEqual(pHallway.hasHalo, true, 'Harry has chronic out of class halo')
assert.strictEqual(pHallway.equivClassesLost, '3.2') // 240 / 75 = 3.2 classes
assert.strictEqual(pHallway.formattedLostTime, '4h lost')
assert.strictEqual(pHallway.medianMultiple, 3.2, 'Harry has 3.2x the class median lost time')
console.log('✓ Chronic hallway/late student drops to Critical Intervention, maps to far left (8%), with 3.2x median')

// ── 5. Filter Toggling Recalculation ───────────────────────────────
console.log('\n[Test 5] Toggling Absences OFF (Isolating In-School Disengagement)')

const resNoAbs = calculateStudentRiskMatrix({
  sidebarStudents: students,
  allClassEvents: events,
  classGrades,
  thresholds: { atRiskThreshold: 70 },
  filters: { absences: false, lates: true, washroom: true },
  periodDuration: 75
})

const pAbsentNoAbs = resNoAbs.studentPoints.find(p => p.studentId === 'st_absent')
const pHallwayNoAbs = resNoAbs.studentPoints.find(p => p.studentId === 'st_hallway')

// With absences toggled OFF, Aaron was never late or out of class, so his lost time is 0m
assert.strictEqual(pAbsentNoAbs.activeLostMins, 0)
assert.strictEqual(pAbsentNoAbs.baseX, 90)

// Harry still lost 240m out of class / late, which greatly exceeds the noise floor cutoff (25m)
assert.strictEqual(pHallwayNoAbs.activeLostMins, 240)
assert.strictEqual(pHallwayNoAbs.quadrant, 'red')
assert.strictEqual(pHallwayNoAbs.baseX, 8, 'Harry is still pushed far to the left (8%) in Critical Intervention')
console.log('✓ Toggling absences off isolates in-school disengagement accurately and pushes wanderers to the left')

// ── 6. Daily 75m Clamping Rule ─────────────────────────────────────
console.log('\n[Test 6] Daily 75-Minute Lost Time Clamping')

// Student with an absence AND a 20m late on the same day (duplicate / overlap event)
const clampEvents = [
  { eventId: 'c1', timestamp: '2026-09-01T08:30:00.000Z', studentId: 'st_clamp', code: 'a' },
  { eventId: 'c2', timestamp: '2026-09-01T08:45:00.000Z', studentId: 'st_clamp', code: 'l', duration: 20 * 60000 }
]

const resClamp = calculateStudentRiskMatrix({
  sidebarStudents: [{ studentId: 'st_clamp', name: 'Charlie Clamp' }],
  allClassEvents: clampEvents,
  classGrades: { st_clamp: { overallGrade: 75 } },
  periodDuration: 75
})

const pClamp = resClamp.studentPoints[0]
// Even though 75 + 20 = 95m, daily cap ensures lost minutes is exactly 75m (100% of that 1 day)
assert.strictEqual(pClamp.activeLostMins, 75, 'Daily lost time is clamped to period duration (75m)')
assert.strictEqual(pClamp.equivClassesLost, '1.0')
console.log('✓ Clamping correctly prevents losing more than 75 minutes on one day')

// ── 8. Zero-Median Cohort Comparison (Percentile / Rank) ──────────
console.log('\n[Test 8] Zero-Median Cohort Standing (More than 50% Zero Lost Time)')
const zeroMedianStudents = Array.from({ length: 10 }, (_, i) => ({
  studentId: `s_${i}`,
  name: `Student ${i}`
}))

// Students 0-6 have 0 lost mins (7 out of 10 students = 70% zero lost)
// Student 7 has 15m lost
// Student 8 has 60m lost
// Student 9 has 120m lost
const zeroMedianEvents = [
  { eventId: 'z1', timestamp: '2026-09-01T08:30:00.000Z', studentId: 's_7', code: 'l', duration: 15 * 60000 },
  { eventId: 'z2', timestamp: '2026-09-01T08:30:00.000Z', studentId: 's_8', code: 'w', duration: 60 * 60000 },
  { eventId: 'z3', timestamp: '2026-09-01T08:30:00.000Z', studentId: 's_9', code: 'w', duration: 120 * 60000 }
]

const resZeroMed = calculateStudentRiskMatrix({
  sidebarStudents: zeroMedianStudents,
  allClassEvents: zeroMedianEvents,
  classGrades: { s_9: { overallGrade: 45 }, s_8: { overallGrade: 60 }, s_7: { overallGrade: 75 } },
  filters: { absences: false, lates: true, washroom: true }
})

assert.strictEqual(resZeroMed.medianLostMins, 0, 'Class median is 0m')
const pTop = resZeroMed.studentPoints.find(p => p.studentId === 's_9')
const pSecond = resZeroMed.studentPoints.find(p => p.studentId === 's_8')
const pMod = resZeroMed.studentPoints.find(p => p.studentId === 's_7')
const pZero = resZeroMed.studentPoints.find(p => p.studentId === 's_0')

assert.strictEqual(pTop.cohortComparison, 'Highest in class', 'Top student is labeled Highest in class')
assert.strictEqual(pSecond.cohortComparison, 'Top 10% lost time', 'Second student is labeled Top 10% lost time')
assert.strictEqual(pMod.cohortComparison, '', 'Moderate student has no clunky multiplier')
assert.strictEqual(pZero.cohortComparison, '', 'Zero-lost student has empty comparison')
console.log('✓ Zero-median distributions cleanly assign rank/percentile badges without average jargon')

console.log('\nALL TESTS PASSED! ✨')
