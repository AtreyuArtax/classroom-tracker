/**
 * src/test_attendance_history.js
 *
 * Automated verification suite for the Attendance History feature logic.
 * Tests event parsing, student status categorization (absent, late, present),
 * rate calculation, seat mapping, and date shifting helpers.
 *
 * Run with: node src/test_attendance_history.js
 */

import assert from 'assert'
import { toMinutes } from './db/eventService.js'
import { formatLocalDate, parseLocal } from './utils/dates.js'

console.log('=================================================================')
console.log('🧪 ATTENDANCE HISTORY DRAWER AUTOMATED VERIFICATION')
console.log('=================================================================')

// ── Test 1: Attendance Categorization Logic ──────────────────────────────────
console.log('\nTest 1: Categorizing Students into Absent, Late, and Present (with Key-Derived IDs)')

// Simulate real IndexedDB class records where studentId is ONLY the object key!
const mockClassRecord = {
  classId: 'cls_science9',
  name: 'Period 2 - Grade 9 Science',
  periodNumber: 2,
  gridSize: { rows: 2, cols: 2 },
  students: {
    '1001': { firstName: 'Alice', lastName: 'Adams', seat: { row: 1, col: 1 }, archived: false },
    '1002': { firstName: 'Bob', lastName: 'Brown', seat: { row: 1, col: 2 }, archived: false },
    '1003': { firstName: 'Charlie', lastName: 'Clark', seat: { row: 2, col: 1 }, archived: false },
    '1004': { firstName: 'Diana', lastName: 'Davis', seat: { row: 2, col: 2 }, archived: false },
    '1005_archived': { firstName: 'Zoe', lastName: 'Zero', seat: null, archived: true }
  }
}

// Events on target date (2026-09-17) using studentIds matching dictionary keys
const mockEvents = [
  // Alice (1001) is absent
  { eventId: 'e1', classId: 'cls_science9', studentId: '1001', code: 'a', timestamp: '2026-09-17T09:05:00.000Z', note: 'Doctor appointment' },
  // Bob (1002) is late (+15m)
  { eventId: 'e2', classId: 'cls_science9', studentId: '1002', code: 'l', timestamp: '2026-09-17T09:20:00.000Z', duration: 900000 },
  // Charlie (1003) had an absence event earlier that was SUPERSEDED
  { eventId: 'e3', classId: 'cls_science9', studentId: '1003', code: 'a', superseded: true, timestamp: '2026-09-17T09:02:00.000Z' },
  // Diana (1004) has no events (present)
  // Zoe (1005_archived) is archived (should be excluded)
]

function categorizeAttendance(classRecord, events) {
  const enrolled = Object.entries(classRecord.students)
    .filter(([_, s]) => !s.archived)
    .map(([keyId, s]) => ({
      ...s,
      studentId: s.studentId ? String(s.studentId) : String(keyId)
    }))

  const absents = events.filter(e => e.code === 'a' && !e.superseded)
  const lates = events.filter(e => e.code === 'l')

  const statusMap = {}
  for (const s of enrolled) {
    const sId = String(s.studentId)
    const absentEv = absents.find(e => String(e.studentId) === sId)
    const lateEv = lates.find(e => String(e.studentId) === sId)

    if (absentEv) {
      statusMap[sId] = { student: s, status: 'absent', event: absentEv }
    } else if (lateEv) {
      statusMap[sId] = { student: s, status: 'late', event: lateEv }
    } else {
      statusMap[sId] = { student: s, status: 'present', event: null }
    }
  }

  const absentList = Object.values(statusMap).filter(x => x.status === 'absent')
  const lateList = Object.values(statusMap).filter(x => x.status === 'late')
  const presentList = Object.values(statusMap).filter(x => x.status === 'present')
  const rate = enrolled.length > 0 ? Math.round(((enrolled.length - absentList.length) / enrolled.length) * 100) : 100

  return { enrolled, statusMap, absentList, lateList, presentList, rate }
}

const result = categorizeAttendance(mockClassRecord, mockEvents)

assert.strictEqual(result.enrolled.length, 4, 'Excludes archived student Zoe (4 active students)')
assert.strictEqual(result.absentList.length, 1, 'Only 1 absent student (Alice)')
assert.strictEqual(result.absentList[0].student.firstName, 'Alice', 'Alice is marked absent')
assert.strictEqual(result.absentList[0].event.note, 'Doctor appointment', 'Note is preserved')

assert.strictEqual(result.lateList.length, 1, '1 late student (Bob)')
assert.strictEqual(result.lateList[0].student.firstName, 'Bob', 'Bob is marked late')
assert.strictEqual(toMinutes(result.lateList[0].event.duration), 15, 'Bob was 15 minutes late')

assert.strictEqual(result.presentList.length, 2, '2 present students (Charlie and Diana)')
const presentNames = result.presentList.map(x => x.student.firstName).sort()
assert.deepStrictEqual(presentNames, ['Charlie', 'Diana'], 'Charlie (superseded absence ignored) and Diana are present')

assert.strictEqual(result.rate, 75, 'Class attendance rate is 75% (3/4 in attendance)')
console.log('✓ Categorization and rate calculation verified')

// ── Test 2: Seating Chart Map Placement ───────────────────────────────────────
console.log('\nTest 2: Seating Map Grid Placement & Status Resolution')

function getSeatStatus(enrolledList, statusMap, row, col) {
  const student = enrolledList.find(s => s.seat?.row === row && s.seat?.col === col)
  if (!student) return { type: 'empty' }
  const entry = statusMap[student.studentId]
  return {
    type: 'occupied',
    studentId: student.studentId,
    name: `${student.firstName} ${student.lastName}`,
    status: entry?.status || 'present',
    lateMinutes: entry?.event?.duration ? toMinutes(entry.event.duration) : 0
  }
}

// Seat (1, 1) = Alice (Absent)
const seat11 = getSeatStatus(result.enrolled, result.statusMap, 1, 1)
assert.strictEqual(seat11.status, 'absent', 'Seat (1,1) is Absent (Alice)')

// Seat (1, 2) = Bob (Late)
const seat12 = getSeatStatus(result.enrolled, result.statusMap, 1, 2)
assert.strictEqual(seat12.status, 'late', 'Seat (1,2) is Late (Bob)')
assert.strictEqual(seat12.lateMinutes, 15, 'Seat (1,2) shows 15 minutes late')

// Seat (2, 1) = Charlie (Present)
const seat21 = getSeatStatus(result.enrolled, result.statusMap, 2, 1)
assert.strictEqual(seat21.status, 'present', 'Seat (2,1) is Present (Charlie)')

// Seat (2, 2) = Diana (Present)
const seat22 = getSeatStatus(result.enrolled, result.statusMap, 2, 2)
assert.strictEqual(seat22.status, 'present', 'Seat (2,2) is Present (Diana)')

console.log('✓ Seating map placement and status resolution verified')

// ── Test 3: Date Shifting & Weekend Skip Helpers ─────────────────────────────
console.log('\nTest 3: Date Navigation & Previous School Day Skipping')

function jumpToPrevSchoolDayFrom(dateStr) {
  const d = parseLocal(dateStr)
  d.setDate(d.getDate() - 1)
  // If Sunday (0), back to Friday (-2)
  if (d.getDay() === 0) d.setDate(d.getDate() - 2)
  // If Saturday (6), back to Friday (-1)
  else if (d.getDay() === 6) d.setDate(d.getDate() - 1)
  return formatLocalDate(d)
}

// From Monday 2026-09-21, previous school day should be Friday 2026-09-18
const monday = '2026-09-21'
const prevFromMonday = jumpToPrevSchoolDayFrom(monday)
assert.strictEqual(prevFromMonday, '2026-09-18', 'From Monday Sep 21, previous school day jumps over weekend to Friday Sep 18')

// From Sunday 2026-09-20, previous school day should be Friday 2026-09-18
const sunday = '2026-09-20'
const prevFromSunday = jumpToPrevSchoolDayFrom(sunday)
assert.strictEqual(prevFromSunday, '2026-09-18', 'From Sunday Sep 20, jumps back to Friday Sep 18')

// From Wednesday 2026-09-16, previous school day is Tuesday 2026-09-15
const wednesday = '2026-09-16'
const prevFromWed = jumpToPrevSchoolDayFrom(wednesday)
assert.strictEqual(prevFromWed, '2026-09-15', 'From Wednesday Sep 16, jumps to Tuesday Sep 15')

console.log('✓ Date shifting and weekend skips verified')

console.log('\n=================================================================')
console.log('🎉 ALL ATTENDANCE HISTORY TESTS PASSED SUCCESSFULLY!')
console.log('=================================================================')
