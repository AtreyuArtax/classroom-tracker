/**
 * src/test_attendance_patterns.js
 *
 * Automated verification suite for attendance and late pattern detection.
 * Run with: node src/test_attendance_patterns.js
 */

import assert from 'assert'
import {
  toMinutes,
  normalizeDate,
  getDayOfWeek,
  getActiveClassDates,
  detectStudentAttendancePatterns,
  detectClassAttendancePatterns
} from './utils/attendancePatterns.js'

console.log('🧪 Starting Attendance & Late Pattern Detection Tests...\n')

// ── Test 1: Date and Utility Helpers ──────────────────────────────────────────
console.log('Test 1: Date and duration normalization')
assert.strictEqual(toMinutes(300000), 5, '300,000ms = 5 minutes')
assert.strictEqual(toMinutes(90000), 1.5, '90,000ms = 1.5 minutes')
assert.strictEqual(toMinutes(null), 0, 'null ms = 0 minutes')
assert.strictEqual(normalizeDate('2026-09-07T09:15:00.000Z'), '2026-09-07')
assert.strictEqual(normalizeDate('2026-09-07'), '2026-09-07')
// 2026-09-07 is a Monday
assert.strictEqual(getDayOfWeek('2026-09-07'), 1, '2026-09-07 is Monday (1)')
// 2026-09-11 is a Friday
assert.strictEqual(getDayOfWeek('2026-09-11'), 5, '2026-09-11 is Friday (5)')
console.log('✓ Helpers verified\n')

// ── Test 2: Active Class Dates Derivation ──────────────────────────────────────
console.log('Test 2: Deriving active class dates from event ground truth')
const sampleClassEvents = [
  { studentId: 's1', code: 'a', timestamp: '2026-09-02T08:50:00' }, // Wed
  { studentId: 's2', code: 'w', timestamp: '2026-09-03T09:10:00' }, // Thu (Term 1 cut off note on calendar)
  { studentId: 's1', code: 'l', duration: 600000, timestamp: '2026-09-04T08:55:00' }, // Fri
  { studentId: 's3', code: 'a', superseded: true, timestamp: '2026-09-07T08:50:00' } // Superseded on Monday
]
const activeDates = getActiveClassDates(sampleClassEvents)
assert.deepStrictEqual(activeDates, ['2026-09-02', '2026-09-03', '2026-09-04'], 'Correctly identified active meeting dates (superseded ignored)')
console.log('✓ Active class dates correctly derived\n')

// ── Test 3: Consecutive Absences Across Weekends and Note Dates ────────────────
console.log('Test 3: Consecutive school-day absences (Fri -> Mon -> Tue)')
// Active meetings: Friday Sep 4, Monday Sep 7 (open), Tuesday Sep 8
const meetingDates = ['2026-09-04', '2026-09-07', '2026-09-08']
const studentConsecutiveEvents = [
  { studentId: 's10', code: 'a', timestamp: '2026-09-04T08:50:00' },
  { studentId: 's10', code: 'a', timestamp: '2026-09-07T08:50:00' },
  { studentId: 's10', code: 'a', timestamp: '2026-09-08T08:50:00' }
]
const resConsecutive = detectStudentAttendancePatterns('s10', studentConsecutiveEvents, meetingDates)
assert.strictEqual(resConsecutive.hasPatterns, true, 'Pattern detected')
assert.strictEqual(resConsecutive.highestSeverity, 'danger', 'Severity is danger')
const consecPattern = resConsecutive.patterns.find(p => p.type === 'consecutive_absences')
assert.ok(consecPattern, 'consecutive_absences pattern exists')
assert.strictEqual(consecPattern.streak, 3, 'Streak is 3')
assert.strictEqual(consecPattern.isCurrent, true, 'Current streak is active')
console.log(`✓ Consecutive absences flagged: "${consecPattern.reason}"\n`)

// ── Test 4: Broken Absence Streak ─────────────────────────────────────────────
console.log('Test 4: Broken absence streak does not trigger 3-consecutive alert')
// Student absent on Sep 2 and Sep 3, but present on Sep 4, absent on Sep 8
const studentBrokenStreakEvents = [
  { studentId: 's11', code: 'a', timestamp: '2026-09-02T08:50:00' },
  { studentId: 's11', code: 'a', timestamp: '2026-09-03T08:50:00' },
  // Sep 4: attended (no absent event)
  { studentId: 's11', code: 'a', timestamp: '2026-09-08T08:50:00' }
]
const resBroken = detectStudentAttendancePatterns('s11', studentBrokenStreakEvents, ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-08'])
assert.ok(!resBroken.patterns.some(p => p.type === 'consecutive_absences'), 'Should NOT trigger consecutive absence alert')
console.log('✓ Broken streak correctly not flagged\n')

// ── Test 5: Day-of-Week Clustering (Monday Effect) ────────────────────────────
console.log('Test 5: Day-of-week clustering (3 Mondays absent)')
// Mondays: Sep 7, Sep 14, Sep 21. Wednesday: Sep 16
const mondayClusteringEvents = [
  { studentId: 's12', code: 'a', timestamp: '2026-09-07T08:50:00' }, // Mon
  { studentId: 's12', code: 'a', timestamp: '2026-09-14T08:50:00' }, // Mon
  { studentId: 's12', code: 'a', timestamp: '2026-09-16T08:50:00' }, // Wed
  { studentId: 's12', code: 'a', timestamp: '2026-09-21T08:50:00' }  // Mon
]
const resDow = detectStudentAttendancePatterns('s12', mondayClusteringEvents, [])
const dowPattern = resDow.patterns.find(p => p.type === 'day_of_week_cluster')
assert.ok(dowPattern, 'day_of_week_cluster pattern exists')
assert.strictEqual(dowPattern.dayName, 'Monday')
assert.strictEqual(dowPattern.count, 3)
assert.strictEqual(dowPattern.percentage, 75, '3 out of 4 = 75%')
console.log(`✓ Day-of-week cluster flagged: "${dowPattern.reason}"\n`)

// ── Test 6: Chronic Tardiness (Count & Minutes) ────────────────────────────────
console.log('Test 6: Chronic tardiness & cumulative instructional time lost')
const lateEvents = [
  { studentId: 's13', code: 'l', duration: 15 * 60000, timestamp: '2026-09-01T09:05:00' }, // 15m
  { studentId: 's13', code: 'l', duration: 10 * 60000, timestamp: '2026-09-02T09:00:00' }, // 10m
  { studentId: 's13', code: 'l', duration: 20 * 60000, timestamp: '2026-09-03T09:10:00' }, // 20m
  { studentId: 's13', code: 'l', duration: 15 * 60000, timestamp: '2026-09-04T09:05:00' }  // 15m (total: 60m, 4 lates)
]
const resLate = detectStudentAttendancePatterns('s13', lateEvents, ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'])
const latePattern = resLate.patterns.find(p => p.type === 'chronic_late')
assert.ok(latePattern, 'chronic_late pattern exists')
assert.strictEqual(latePattern.lateCount, 4)
assert.strictEqual(latePattern.lateMinutes, 60)
assert.strictEqual(latePattern.severity, 'warning')
// Also consecutive lates (4 in a row)
const consecLatePattern = resLate.patterns.find(p => p.type === 'consecutive_lates')
assert.ok(consecLatePattern, 'consecutive_lates pattern exists')
assert.strictEqual(consecLatePattern.streak, 4)
console.log(`✓ Chronic tardiness flagged: "${latePattern.reason}" & "${consecLatePattern.reason}"\n`)

// ── Test 7: Superseded Morning Absence Ignored ────────────────────────────────
console.log('Test 7: Superseded absence event is not counted as absent')
const supersededEvents = [
  { studentId: 's14', code: 'a', superseded: true, timestamp: '2026-09-01T08:50:00' },
  { studentId: 's14', code: 'l', duration: 10 * 60000, timestamp: '2026-09-01T09:00:00' }
]
const resSuperseded = detectStudentAttendancePatterns('s14', supersededEvents, ['2026-09-01'])
assert.strictEqual(resSuperseded.metrics.totalAbsences, 0, 'Superseded absence is 0')
assert.strictEqual(resSuperseded.metrics.totalLates, 1, 'Late is 1')
console.log('✓ Superseded event correctly treated as late instead of absent\n')

// ── Test 8: Test-Day Absences ─────────────────────────────────────────────────
console.log('Test 8: Test-day absences')
const testEvents = [
  { studentId: 's15', code: 'a', testDay: true, timestamp: '2026-09-10T08:50:00' },
  { studentId: 's15', code: 'a', timestamp: '2026-09-24T08:50:00' } // Matched by assessmentDates
]
const resTest = detectStudentAttendancePatterns('s15', testEvents, ['2026-09-10', '2026-09-24'], {
  assessmentDates: ['2026-09-24']
})
const testPattern = resTest.patterns.find(p => p.type === 'test_day_absence')
assert.ok(testPattern, 'test_day_absence pattern exists')
assert.strictEqual(testPattern.count, 2)
assert.strictEqual(testPattern.severity, 'danger')
console.log(`✓ Test-day absence flagged: "${testPattern.reason}"\n`)

// ── Test 9: Class-Level Batch Detection & Priority Sorting ────────────────────
console.log('Test 9: Class-level batch detection with priority sorting')
const fullClassEvents = [
  ...studentConsecutiveEvents, // s10 (danger: 3 consecutive absences)
  ...lateEvents,               // s13 (warning: 4 lates)
  ...mondayClusteringEvents    // s12 (warning: Monday cluster)
]
const classResults = detectClassAttendancePatterns(fullClassEvents, ['s10', 's12', 's13'])
assert.strictEqual(classResults.length, 3, 'All 3 students flagged')
assert.strictEqual(classResults[0].studentId, 's10', 'Danger severity student s10 is first')
assert.strictEqual(classResults[0].highestSeverity, 'danger')
console.log('✓ Class-level detection returned sorted results:\n' + 
  classResults.map(r => `   - Student ${r.studentId} [${r.highestSeverity}]: ${r.primaryReason}`).join('\n') + '\n'
)

console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!')
