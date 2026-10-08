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
  'Comparing Academic Mark vs. Time in Class (All Factors)'
)
assert.strictEqual(
  getMetricSubtitle({ absences: false, lates: true, washroom: true }, false),
  'Comparing Academic Mark vs. Time in Class (Lates & Hallway)'
)
assert.strictEqual(
  getMetricSubtitle({ absences: true, lates: false, washroom: false }, false),
  'Comparing Academic Mark vs. Time in Class (Absences Only)'
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
  thresholds: { attendanceThreshold: 85, atRiskThreshold: 70 },
  filters: { absences: true, lates: true, washroom: true },
  periodDuration: 75
})

assert.strictEqual(resAll.totalDays, 20, '20 class days scheduled')
assert.strictEqual(resAll.scheduledMins, 1500, '1,500 total scheduled minutes')

const pPerfect = resAll.studentPoints.find(p => p.studentId === 'st_perfect')
const pAbsent = resAll.studentPoints.find(p => p.studentId === 'st_absent')
const pHallway = resAll.studentPoints.find(p => p.studentId === 'st_hallway')

// Penny: 100% time in class, 92% mark -> Thriving (green)
assert.strictEqual(pPerfect.timeInClassPct, 100)
assert.strictEqual(pPerfect.quadrant, 'green')
assert.strictEqual(pPerfect.baseX, 92, '100% in-class maps to rightmost edge baseX=92%')
assert.strictEqual(pPerfect.hasHalo, false, 'Penny has no halo')

// Aaron: 1 absence = 75m lost. (1500 - 75) / 1500 = 1425 / 1500 = 95%.
// Mark = 58% (< 70%). Attendance = 95% (>= 85%). -> Academic Risk (yellow)
assert.strictEqual(pAbsent.timeInClassPct, 95)
assert.strictEqual(pAbsent.activeLostMins, 75)
assert.strictEqual(pAbsent.quadrant, 'yellow')
assert.strictEqual(pAbsent.baseX, 83, '95% in-class maps to baseX=83% (> 85% cutoff at 66%)')
assert.strictEqual(pAbsent.hasHalo, false, 'Aaron has no halo')

// Harry: 0 absences, 240m lost (120m late + 120m washroom).
// (1500 - 240) / 1500 = 1260 / 1500 = 84.0% -> 84%.
// Mark = 54% (< 70%). Time in Class = 84% (< 85%).
// Under the old metric, Harry had 100% attendance!
// Under the new metric, Harry is at 84% and correctly lands in Critical Intervention (red)!
assert.strictEqual(pHallway.timeInClassPct, 84)
assert.strictEqual(pHallway.activeLostMins, 240)
assert.strictEqual(pHallway.quadrant, 'red')
assert.strictEqual(pHallway.baseX, 64, '84% in-class maps to baseX=64% (< 85% cutoff at 66%)')
assert.strictEqual(pHallway.hasHalo, true, 'Harry has chronic leaver halo')
assert.strictEqual(pHallway.equivClassesLost, '3.2') // 240 / 75 = 3.2 classes
console.log('✓ Chronic hallway/late student drops to 84%, shifts to Critical Intervention, and gains Halo')

// ── 5. Filter Toggling Recalculation ───────────────────────────────
console.log('\n[Test 5] Toggling Absences OFF (Isolating In-School Disengagement)')

const resNoAbs = calculateStudentRiskMatrix({
  sidebarStudents: students,
  allClassEvents: events,
  classGrades,
  thresholds: { attendanceThreshold: 85, atRiskThreshold: 70 },
  filters: { absences: false, lates: true, washroom: true },
  periodDuration: 75
})

const pAbsentNoAbs = resNoAbs.studentPoints.find(p => p.studentId === 'st_absent')
const pHallwayNoAbs = resNoAbs.studentPoints.find(p => p.studentId === 'st_hallway')

// With absences toggled OFF, Aaron was never late or out of class, so his in-school time is 100%
assert.strictEqual(pAbsentNoAbs.timeInClassPct, 100)
assert.strictEqual(pAbsentNoAbs.activeLostMins, 0)

// Harry still lost 240m, so he stays at 84%
assert.strictEqual(pHallwayNoAbs.timeInClassPct, 84)
assert.strictEqual(pHallwayNoAbs.activeLostMins, 240)
console.log('✓ Toggling absences off isolates in-school disengagement accurately')

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
assert.strictEqual(pClamp.timeInClassPct, 0, 'Lost 100% of the 1 scheduled day')
console.log('✓ Clamping correctly prevents losing more than 75 minutes on one day')

// ── 7. Beeswarm Bounds ─────────────────────────────────────────────
console.log('\n[Test 7] Beeswarm Boundary Enforcement')
resAll.studentPoints.forEach(p => {
  assert(p.xPercent >= 6 && p.xPercent <= 92, `xPercent ${p.xPercent} is within [6, 92]`)
  assert(p.yPercent >= 7 && p.yPercent <= 91, `yPercent ${p.yPercent} is within [7, 91]`)
})
console.log('✓ All student dot coordinates stay within canvas bounds')

console.log('\nALL TESTS PASSED! ✨')
