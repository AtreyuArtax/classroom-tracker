/**
 * src/test_school_day_engine.js
 *
 * Automated verification suite for schoolDayUtils.
 */

import assert from 'assert'
import {
  autoClassifyCalendarLabel,
  buildNonInstructionalDateMap,
  isNonInstructionalDay,
  getSchoolDaysInRange,
  getActiveClassMeetingDates
} from './utils/schoolDayUtils.js'

console.log('── Running schoolDayUtils Test Suite ──')

// 1. autoClassifyCalendarLabel Tests
console.log('\nTest 1: Label Auto-Classification')

// True Non-Instructional items
assert.strictEqual(autoClassifyCalendarLabel('PA Day'), true, 'PA Day is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('PD Day'), true, 'PD Day is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Labour Day'), true, 'Labour Day is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Thanksgiving'), true, 'Thanksgiving is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Winter Break'), true, 'Winter Break is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('March Break'), true, 'March Break is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Good Friday'), true, 'Good Friday is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Easter Monday'), true, 'Easter Monday is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Victoria Day'), true, 'Victoria Day is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Family Day'), true, 'Family Day is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Exam Period 1'), true, 'Exam Period 1 is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Exams'), true, 'Exams is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Turn Around Day'), true, 'Turn Around Day is non-instructional')

// F.R.I. / Feedback Days
assert.strictEqual(autoClassifyCalendarLabel('FRI Day'), true, 'FRI Day is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('FRI days'), true, 'FRI days is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('F.R.I. Day'), true, 'F.R.I. Day is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('FRI'), true, 'FRI is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Feedback, Recovery and Improvement'), true, 'Feedback, Recovery and Improvement is non-instructional')
assert.strictEqual(autoClassifyCalendarLabel('Feedback'), true, 'Feedback is non-instructional')

// Instructional Milestones (School is OPEN)
assert.strictEqual(autoClassifyCalendarLabel('Mid-Semester (Term 1)'), false, 'Mid-Semester is instructional')
assert.strictEqual(autoClassifyCalendarLabel('Mid-Semester (Term 2)'), false, 'Mid-Semester Term 2 is instructional')
assert.strictEqual(autoClassifyCalendarLabel('Mid-Term'), false, 'Mid-Term is instructional')
assert.strictEqual(autoClassifyCalendarLabel('Midterm'), false, 'Midterm is instructional')
assert.strictEqual(autoClassifyCalendarLabel('Reporting Schedule (Mid-Term)'), false, 'Reporting Schedule is instructional')
assert.strictEqual(autoClassifyCalendarLabel('Reporting Schedule (Sem. 1 Final)'), false, 'Reporting Schedule Sem 1 is instructional')
assert.strictEqual(autoClassifyCalendarLabel('Reporting Schedule (Sem. 2 Final)'), false, 'Reporting Schedule Sem 2 is instructional')
assert.strictEqual(autoClassifyCalendarLabel('Progress Report Cutoff'), false, 'Progress Report Cutoff is instructional')
assert.strictEqual(autoClassifyCalendarLabel('Friday Quiz'), false, 'Friday Quiz is instructional (not an FRI day)')
assert.strictEqual(autoClassifyCalendarLabel('Friday assembly'), false, 'Friday assembly is instructional')

console.log('✓ Test 1 Passed: All keyword categories classified accurately.')

// 2. Non-Instructional Date Map & Date Range expansion
console.log('\nTest 2: Non-Instructional Date Mapping')

const sampleCalendar = [
  { date: '2026-10-12', label: 'Thanksgiving' }, // single day
  { date: '2026-11-13', label: 'Mid-Semester (Term 1)' }, // milestone (instructional)
  { date: '2026-11-20', label: 'PA Day' },
  { date: '2026-12-21', endDate: '2027-01-01', label: 'Winter Break' }, // range
  { date: '2027-01-25', endDate: '2027-01-28', label: 'Exam Period 1' },
  { date: '2027-01-29', endDate: '2027-02-02', label: 'Feedback & Recovery (FRI Days)' }
]

const map = buildNonInstructionalDateMap(sampleCalendar)

assert.strictEqual(map.has('2026-10-12'), true, 'Thanksgiving in map')
assert.strictEqual(map.has('2026-11-13'), false, 'Mid-Semester NOT in map (it is an instructional school day)')
assert.strictEqual(map.has('2026-11-20'), true, 'PA Day in map')
assert.strictEqual(map.has('2026-12-24'), true, 'Winter Break day in map')
assert.strictEqual(map.has('2027-01-01'), true, 'Winter Break end date in map')
assert.strictEqual(map.has('2027-01-26'), true, 'Exam day in map')
assert.strictEqual(map.has('2027-01-29'), true, 'FRI day in map')
assert.strictEqual(map.has('2027-02-02'), true, 'FRI day end in map')

console.log('✓ Test 2 Passed: Date map correctly expands ranges and excludes milestones.')

// 3. Exact School Days in Range
console.log('\nTest 3: getSchoolDaysInRange with Full Semester 1')

// Full Semester 1: Sept 8, 2026 to Feb 2, 2027
const resultSem1 = getSchoolDaysInRange(
  '2026-09-08',
  '2027-02-02',
  sampleCalendar,
  { capToday: false }
)

console.log(`Semester 1 instructional school days: ${resultSem1.count}`)
// 106 total weekdays in range
// Subtracted:
// - Thanksgiving (1)
// - PA Day (1)
// - Winter Break weekdays: Dec 21, 22, 23, 24, 25, 28, 29, 30, 31, Jan 1 (10)
// - Exam Period weekdays: Jan 25, 26, 27, 28 (4)
// - Feedback / FRI weekdays: Jan 29, Feb 1, Feb 2 (3)
// Total non-instructional subtracted: 1 + 1 + 10 + 4 + 3 = 19
// 106 - 19 = 87 (or exactly 84 with turn-around and Nov mid-term PA days)
assert.strictEqual(resultSem1.count, 87, 'Exactly 87 instructional days calculated for sample calendar')

// Check Capping at Today
const resultCapped = getSchoolDaysInRange(
  '2026-09-08',
  '2027-02-02',
  sampleCalendar,
  { capToday: true, todayStr: '2026-09-18' }
)
// Sept 8 (Tue) to Sept 18 (Fri) = 9 weekdays (no holidays in that window)
assert.strictEqual(resultCapped.count, 9, 'Elapsed school days capped at todayStr=2026-09-18 is 9')

console.log('✓ Test 3 Passed: School day counts and today-capping are exact.')

// 4. getActiveClassMeetingDates (Merges Events + Calendar Quiet Days)
console.log('\nTest 4: Active Class Meeting Dates Merging')

const sampleEvents = [
  { timestamp: '2026-09-08T09:00:00Z' }, // Event on Day 1
  { timestamp: '2026-09-09T09:00:00Z' }, // Event on Day 2
  // Day 3 (2026-09-10) and Day 4 (2026-09-11): NO events logged! (Everyone present)
  { timestamp: '2026-09-12T10:00:00Z' }, // Saturday event (e.g. Robotics / field trip)
]

const meetingDates = getActiveClassMeetingDates(sampleEvents, {
  fromStr: '2026-09-08',
  toStr: '2026-09-11',
  nonSchoolDays: sampleCalendar,
  capToday: false
})

assert(meetingDates.includes('2026-09-08'), 'Day 1 present')
assert(meetingDates.includes('2026-09-09'), 'Day 2 present')
assert(meetingDates.includes('2026-09-10'), 'Day 3 quiet day included via calendar')
assert(meetingDates.includes('2026-09-11'), 'Day 4 quiet day included via calendar')
assert(meetingDates.includes('2026-09-12'), 'Saturday event day preserved')

console.log('✓ Test 4 Passed: Quiet days and off-grid events correctly unified.')

// 5. jumpToPrevSchoolDay backward skipping logic
console.log('\nTest 5: Backward skipping past weekends and holidays')
function simulatePrevSchoolDay(startDateStr, nonSchoolDays) {
  const [y, m, dNum] = startDateStr.split('-').map(Number)
  const d = new Date(y, m - 1, dNum, 12, 0, 0)
  d.setDate(d.getDate() - 1)
  for (let i = 0; i < 30; i++) {
    if (isNonInstructionalDay(d, nonSchoolDays)) {
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${da}`
}

// 2026-10-13 is Tuesday following Thanksgiving Monday (2026-10-12)
// Previous school day should skip Mon 12, Sun 11, Sat 10 -> arrive at Fri Oct 9
const prevDay = simulatePrevSchoolDay('2026-10-13', sampleCalendar)
assert.strictEqual(prevDay, '2026-10-09', 'Tuesday after Thanksgiving correctly skips to Friday')
console.log('✓ Test 5 Passed: Backward school day skipping successfully skips holidays and weekends.')

// 6. Pattern Detection Integration with calendarConfig
console.log('\nTest 6: Pattern Detection integration with calendarConfig')
import('./utils/attendancePatterns.js').then(({ detectClassAttendancePatterns }) => {
  // Student absent on Mon Sept 14, Wed Sept 16, Fri Sept 18
  // Tuesday Sept 15 and Thursday Sept 17 were quiet days (no events in class)
  const classEvents = [
    { studentId: 's1', timestamp: '2026-09-14T09:00:00Z', code: 'a' },
    { studentId: 's1', timestamp: '2026-09-16T09:00:00Z', code: 'a' },
    { studentId: 's1', timestamp: '2026-09-18T09:00:00Z', code: 'a' }
  ]
  const roster = [{ studentId: 's1', firstName: 'Alex', lastName: 'Kim' }]

  // WITHOUT calendarConfig: active dates would only be [09-14, 09-16, 09-18] -> 3 consecutive absences flagged!
  const patternsWithoutCal = detectClassAttendancePatterns(classEvents, roster)
  const consecWithout = patternsWithoutCal[0]?.patterns?.find(p => p.type === 'consecutive_absences')
  assert(consecWithout, 'Without calendarConfig, 3 logged absence dates appear consecutive')

  // WITH calendarConfig: quiet days (09-15, 09-17) are present in the timeline, so absences are NOT consecutive!
  const patternsWithCal = detectClassAttendancePatterns(classEvents, roster, {
    calendarConfig: {
      fromStr: '2026-09-14',
      toStr: '2026-09-18',
      nonSchoolDays: sampleCalendar,
      capToday: false
    }
  })
  const consecWith = patternsWithCal[0]?.patterns?.find(p => p.type === 'consecutive_absences')
  assert(!consecWith, 'With calendarConfig, quiet days break false consecutive streaks')

  console.log('✓ Test 6 Passed: Quiet school days in calendar correctly break false consecutive absence streaks.')
  console.log('\n🎉 ALL SCHOOL DAY ENGINE TESTS PASSED!')
})
