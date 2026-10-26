/**
 * src/test_duties.js
 *
 * Unit tests for duty tracking calculations, defaults, and Outlook calendar export.
 * Run with: node src/test_duties.js
 */

import assert from 'node:assert'
import { INITIAL_DUTY_SETTINGS } from './db/dutyService.js'
import {
  generateIcsContent,
  getOutlookWebComposeUrl,
  getWeekRangeForDate,
  getWeekDaysList,
  groupDutiesByWeek,
  getLastEnteredWeek
} from './utils/dutyCalendarExport.js'

console.log('🧪 Running Duty Tracker Unit Tests...\n')

// ── Test 1: Initial Duty Settings & Catalog Defaults ──
{
  assert.strictEqual(INITIAL_DUTY_SETTINGS.allottedMinutes, 1875, 'Default allotted minutes must be 1875')
  assert.strictEqual(INITIAL_DUTY_SETTINGS.emergencyCap, 2, 'Default emergency cap must be 2')
  assert.ok(Array.isArray(INITIAL_DUTY_SETTINGS.dutyTypes), 'dutyTypes must be an array')
  assert.strictEqual(INITIAL_DUTY_SETTINGS.dutyTypes.length, 13, 'Must have 13 initial duty presets')

  const amBus = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'AM Bus')
  assert.ok(amBus, 'AM Bus must be present')
  assert.strictEqual(amBus.defaultDuration, 15, 'AM Bus must default to 15 min')
  assert.strictEqual(amBus.defaultDays, 5, 'AM Bus must default to 5 days')

  const cafe = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'Cafeteria')
  assert.ok(cafe, 'Cafeteria must be present')
  assert.strictEqual(cafe.defaultDuration, 20, 'Cafeteria must default to 20 min')
  assert.strictEqual(cafe.defaultDays, 5, 'Cafeteria must default to 5 days')

  const weightRoom = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'Weight Room')
  assert.ok(weightRoom, 'Weight Room must be present')
  assert.strictEqual(weightRoom.defaultDuration, 30, 'Weight Room must default to 30 min')
  assert.strictEqual(weightRoom.defaultDays, 2, 'Weight Room must default to 2 days')

  const onCall = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'On-call')
  assert.ok(onCall, 'On-call must be present')
  assert.strictEqual(onCall.defaultDuration, 75, 'On-call must default to 75 min')
  assert.strictEqual(onCall.defaultDays, 0, 'On-call must default to 0 days (no day pre-selected)')
  assert.deepStrictEqual(onCall.defaultWeekdays, [], 'On-call must default to empty weekdays')

  const emergency = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'Emergency')
  assert.ok(emergency, 'Emergency duty must be present')
  assert.strictEqual(emergency.isEmergency, true, 'Emergency duty must have isEmergency: true')
  assert.strictEqual(emergency.defaultDays, 0, 'Emergency must default to 0 days (no day pre-selected)')
  assert.deepStrictEqual(emergency.defaultWeekdays, [], 'Emergency must default to empty weekdays')

  const osslt = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'OSSLT')
  assert.ok(osslt, 'OSSLT must be present')
  assert.strictEqual(osslt.defaultDays, 0, 'OSSLT must default to 0 days (no day pre-selected)')
  assert.deepStrictEqual(osslt.defaultWeekdays, [], 'OSSLT must default to empty weekdays')

  console.log('✅ Test 1 Passed: Initial duty settings and presets verified.')
}

// ── Test 2: RFC 5545 iCalendar (.ics) Generation ──
{
  const mockDuties = [
    {
      dutyId: 101,
      dutyName: 'AM Bus',
      date: '2026-10-19',
      duration: 15,
      startTime: '08:15',
      notes: 'Bus Bay 3',
      isEmergency: false,
      isSnowDay: false
    },
    {
      dutyId: 102,
      dutyName: 'On-call',
      date: '2026-10-20',
      duration: 75,
      startTime: '09:00',
      location: 'Rm 151',
      notes: 'Covered for Skywalker',
      isEmergency: true,
      isSnowDay: false
    }
  ]

  const ics = generateIcsContent(mockDuties)

  assert.ok(ics.includes('BEGIN:VCALENDAR'), 'Must contain VCALENDAR start')
  assert.ok(ics.includes('VERSION:2.0'), 'Must specify iCalendar 2.0')
  assert.ok(ics.includes('BEGIN:VEVENT'), 'Must contain VEVENT')
  assert.ok(ics.includes('SUMMARY:AM Bus Duty'), 'Must contain AM Bus summary')
  assert.ok(ics.includes('DTSTART:20261019T081500'), 'Must calculate start timestamp correctly')
  assert.ok(ics.includes('DTEND:20261019T083000'), 'Must calculate end timestamp (08:15 + 15m = 08:30)')
  assert.ok(ics.includes('SUMMARY:On-call (Rm 151) Duty'), 'Must contain On-call summary with location')
  assert.ok(ics.includes('LOCATION:Rm 151'), 'Must contain LOCATION property')
  assert.ok(ics.includes('Location: Rm 151'), 'Must contain Location in description')
  assert.ok(ics.includes('DTSTART:20261020T090000'), 'Must calculate on-call start')
  assert.ok(ics.includes('DTEND:20261020T101500'), 'Must calculate on-call end (09:00 + 75m = 10:15)')
  assert.ok(ics.includes('TRIGGER:-PT10M'), 'Must contain 10-minute alarm reminder')
  assert.ok(ics.includes('END:VCALENDAR'), 'Must contain VCALENDAR end')

  console.log('✅ Test 2 Passed: RFC 5545 iCalendar formatting verified.')
}

// ── Test 3: Outlook Web Deep-Link Generation ──
{
  const duty = {
    dutyName: 'Halls Upstairs',
    date: '2026-10-21',
    duration: 20,
    startTime: '11:40',
    location: '2nd Floor West',
    notes: 'Covering zone 3'
  }

  const url = getOutlookWebComposeUrl(duty)
  assert.ok(url.startsWith('https://outlook.office.com/calendar/0/deeplink/compose'), 'Must start with Outlook Web compose URL')
  assert.ok(url.includes('subject=Halls%20Upstairs%20(2nd%20Floor%20West)%20Supervision'), 'Must encode subject with location')
  assert.ok(url.includes('location=2nd%20Floor%20West'), 'Must encode location parameter')
  assert.ok(url.includes('Covering%20zone%203'), 'Must encode body notes')

  console.log('✅ Test 3 Passed: Outlook Web deep-link verified.')
}

// ── Test 4: Calculation Logic (Minutes, Snow Days, Emergency Counter) ──
{
  const allotted = 1875
  const sampleData = [
    { duration: 15, isSnowDay: false, isEmergency: false },
    { duration: 15, isSnowDay: false, isEmergency: false },
    { duration: 15, isSnowDay: false, isEmergency: false },
    { duration: 15, isSnowDay: false, isEmergency: false },
    { duration: 15, isSnowDay: false, isEmergency: false }, // 75 min
    { duration: 20, isSnowDay: true,  isEmergency: false }, // Snow day: 0 min counted
    { duration: 75, isSnowDay: false, isEmergency: true  }, // On-call: 75 min (Emergency #1)
    { duration: 75, isSnowDay: false, isEmergency: true  }, // On-call: 75 min (Emergency #2)
    { duration: 20, isSnowDay: false, isEmergency: false }, // 20 min
  ]

  const completed = sampleData.reduce((acc, d) => d.isSnowDay ? acc : acc + d.duration, 0)
  const remaining = allotted - completed
  const ratio = completed / allotted
  const emergencies = sampleData.filter(d => d.isEmergency && !d.isSnowDay).length

  assert.strictEqual(completed, 245, 'Completed minutes should exclude snow day (75 + 75 + 75 + 20 = 245)')
  assert.strictEqual(remaining, 1630, 'Remaining minutes should be 1875 - 245 = 1630')
  assert.strictEqual(emergencies, 2, 'Emergency count should be 2')
  assert.ok(Math.abs(ratio - 0.13066) < 0.001, 'Ratio matches expectation')

  console.log('✅ Test 4 Passed: Calculation math verified.')
}

// ── Test 5: Duty Service Exports ──
{
  import('./db/dutyService.js').then(dutyService => {
    assert.strictEqual(typeof dutyService.getAllDuties, 'function', 'dutyService must export getAllDuties')
    assert.strictEqual(typeof dutyService.getDutiesByYear, 'function', 'dutyService must export getDutiesByYear')
    assert.strictEqual(typeof dutyService.addDutiesBatch, 'function', 'dutyService must export addDutiesBatch')
    console.log('✅ Test 5 Passed: dutyService exports verified.')

    // ── Test 6: Backup & Restore Round-Trip & Migration ──
    import('./db/migrations.js').then(({ migrateData, CURRENT_SCHEMA }) => {
      const mockBackupPayload = {
        schemaVersion: CURRENT_SCHEMA,
        settings: {
          dutySettings: {
            allottedMinutes: 1875,
            emergencyCap: 2,
            dutyTypes: [{ name: 'AM Bus', defaultDuration: 15 }]
          }
        },
        classes: [],
        events: [],
        assessments: [],
        grades: [],
        learning_skills: [],
        duties: [
          { dutyId: 1, dutyName: 'AM Bus', duration: 15, date: '2026-10-15', schoolYear: '2026-27' },
          { dutyId: 2, dutyName: 'Cafeteria', duration: 20, date: '2025-10-15', schoolYear: '2025-26' }
        ]
      }

      // 1. JSON Roundtrip
      const serialized = JSON.stringify(mockBackupPayload)
      const parsed = JSON.parse(serialized)
      const migrated = migrateData(parsed)

      assert.strictEqual(migrated.duties.length, 2, 'Duties must be 100% preserved in backup roundtrip')
      assert.strictEqual(migrated.duties[0].schoolYear, '2026-27')
      assert.strictEqual(migrated.settings.dutySettings.allottedMinutes, 1875, 'dutySettings must be preserved')

      // 2. Legacy Migration Backfill
      const legacyBackup = { schemaVersion: 25, settings: {}, classes: [], events: [] }
      const migratedLegacy = migrateData(legacyBackup)
      assert.ok(Array.isArray(migratedLegacy.duties), 'Legacy backup without duties safely backfills duties: []')
      assert.strictEqual(migratedLegacy.schemaVersion, CURRENT_SCHEMA)

      console.log('✅ Test 6 Passed: Backup & Restore serialization and legacy migration verified.')

      // ── Test 7: Semester Schedule & Calendar Pace Integration ──
      import('./utils/dutyCalendarUtils.js').then(({ getSemesterSchedule, getSchoolYearCalendarPace }) => {
        // 1. Official Board Calendar Lookup for 2026-27
        const boardSched = getSemesterSchedule('2026-27')
        assert.strictEqual(boardSched.isBoard, true, '2026-27 must be recognized as board calendar')
        assert.strictEqual(boardSched.sem1Start, '2026-09-08', 'Sem 1 start date must match board calendar (Sept 8)')
        assert.strictEqual(boardSched.sem2Start, '2027-02-04', 'Sem 2 start date must match board calendar (Feb 4)')

        // 2. Custom Term Override
        const customTerms = [
          { year: '2026-27', semester: '1', startDate: '2026-09-01', endDate: '2027-01-25' },
          { year: '2026-27', semester: '2', startDate: '2027-01-28', endDate: '2027-06-25' }
        ]
        const customSched = getSemesterSchedule('2026-27', customTerms)
        assert.strictEqual(customSched.isCustom, true, 'Custom terms must take precedence')
        assert.strictEqual(customSched.sem2Start, '2027-01-28', 'Custom Sem 2 start date honored')

        // 3. Fallback for unconfigured year
        const fallbackSched = getSemesterSchedule('2023-24')
        assert.strictEqual(fallbackSched.isBoard, false)
        assert.strictEqual(fallbackSched.isCustom, false)
        assert.strictEqual(fallbackSched.sem1Start, '2023-09-01')
        assert.strictEqual(fallbackSched.sem2Start, '2024-02-01')

        // 4. Calendar Instructional Pace (Oct 18, 2026)
        const paceOnTrack = getSchoolYearCalendarPace('2026-27', [], [], { percentComplete: 16, todayStr: '2026-10-18' })
        assert.strictEqual(paceOnTrack.isActiveYear, true, 'Must be active school year')
        assert.strictEqual(paceOnTrack.totalDays, 173, 'Total instructional school days must equal 173')
        assert.strictEqual(paceOnTrack.elapsedDays, 28, 'Elapsed school days up to Oct 18 must equal 28')
        assert.strictEqual(paceOnTrack.elapsedPercent, 16, 'Elapsed percent must equal 16%')
        assert.strictEqual(paceOnTrack.sem2MarkerPercent, 50, 'Sem 2 marker must sit at 50% target')
        assert.strictEqual(paceOnTrack.paceStatus, 'on-track', '16% duty vs 16% elapsed is on-track')
        assert.strictEqual(paceOnTrack.paceIconName, 'CheckCircle2', 'Pace icon must be CheckCircle2')

        // 5. Ahead and Behind Pace checks
        const paceAhead = getSchoolYearCalendarPace('2026-27', [], [], { percentComplete: 25, todayStr: '2026-10-18' })
        assert.strictEqual(paceAhead.paceStatus, 'ahead', '25% duty vs 16% elapsed is ahead')

        const paceBehind = getSchoolYearCalendarPace('2026-27', [], [], { percentComplete: 5, todayStr: '2026-10-18' })
        assert.strictEqual(paceBehind.paceStatus, 'behind', '5% duty vs 16% elapsed is behind')

        console.log('✅ Test 7 Passed: Semester 2 board calendar extraction and instructional pace verified.')

        // ── Test 8: Weekly Calendar Grouping & Last Entered Week Detection ──
        {
          const range = getWeekRangeForDate('2026-10-08') // Thursday
          assert.strictEqual(range.mondayIso, '2026-10-05')
          assert.strictEqual(range.fridayIso, '2026-10-09')
          assert.strictEqual(range.label, 'Oct 5 – 9, 2026', 'Same-month week must be formatted as "Oct 5 – 9, 2026"')

          const crossMonthRange = getWeekRangeForDate('2026-09-30')
          assert.strictEqual(crossMonthRange.label, 'Sep 28 – Oct 2, 2026', 'Cross-month week must be formatted as "Sep 28 – Oct 2, 2026"')

          const sepMidRange = getWeekRangeForDate('2026-09-15')
          assert.strictEqual(sepMidRange.label, 'Sep 14 – 18, 2026', 'Same-month week must be formatted as "Sep 14 – 18, 2026"')

          const testDuties = [
            { dutyId: 1, dutyName: 'Cafeteria', date: '2026-10-05', duration: 20, createdAt: '2026-10-02T10:00:00Z' },
            { dutyId: 2, dutyName: 'Cafeteria', date: '2026-10-06', duration: 20, createdAt: '2026-10-02T10:00:00Z' },
            { dutyId: 3, dutyName: 'Halls Upstairs', date: '2026-10-12', duration: 20, createdAt: '2026-10-09T14:30:00Z' },
            { dutyId: 4, dutyName: 'Halls Upstairs', date: '2026-10-13', duration: 20, createdAt: '2026-10-09T14:30:00Z' }
          ]

          const weeks = groupDutiesByWeek(testDuties)
          assert.strictEqual(weeks.length, 2, 'Must group into 2 distinct weeks')
          assert.strictEqual(weeks[0].startDate, '2026-10-12', 'Newest week must be first')
          assert.strictEqual(weeks[0].totalMinutes, 40)
          assert.strictEqual(weeks[0].isLatest, true, 'Oct 12-16 week must be tagged as latest entered')

          const latest = getLastEnteredWeek(testDuties)
          assert.ok(latest, 'Must find latest entered week')
          assert.strictEqual(latest.startDate, '2026-10-12')
          assert.strictEqual(latest.dutyNames[0], 'Halls Upstairs')

          // Single-duty week check (e.g. 1-day on-call on Wednesday Oct 21, 2026)
          const singleDutyList = [
            { dutyId: 99, dutyName: 'On-call', date: '2026-10-21', duration: 75, startTime: '09:00', createdAt: '2026-10-18T10:00:00Z' }
          ]
          const singleWeek = groupDutiesByWeek(singleDutyList)
          assert.strictEqual(singleWeek.length, 1, 'Must group single duty into 1 week')
          assert.strictEqual(singleWeek[0].duties.length, 1, 'Week must contain exactly 1 duty')
          assert.strictEqual(singleWeek[0].startDate, '2026-10-19', 'Work week starts on Monday Oct 19')
          assert.strictEqual(singleWeek[0].endDate, '2026-10-23', 'Work week ends on Friday Oct 23')
          assert.strictEqual(singleWeek[0].totalMinutes, 75)
          assert.strictEqual(singleWeek[0].dutyNames[0], 'On-call')

          const singleIcs = generateIcsContent(singleWeek[0].duties)
          assert.ok(singleIcs.includes('BEGIN:VEVENT'), 'Must contain 1 calendar event')
          assert.ok(singleIcs.includes('SUMMARY:On-call Duty'), 'Must contain On-call summary')
          assert.ok(singleIcs.includes('DTSTART:20261021T090000'), 'Event timestamp must match the specific duty date/time')

          console.log('✅ Test 8 Passed: Weekly calendar grouping and single-duty week handling verified.')
        }

        // ── Test 9: Weekday Selector & Weight Room (Tue/Thu) Export ──
        {
          // Any date in the week of Oct 5-9, 2026 (e.g. Wednesday Oct 7)
          const weekList = getWeekDaysList('2026-10-07')
          assert.strictEqual(weekList.length, 5, 'Must return 5 weekdays')
          assert.strictEqual(weekList[0].dayKey, 'Mon')
          assert.strictEqual(weekList[0].dateIso, '2026-10-05')
          assert.strictEqual(weekList[1].dayKey, 'Tue')
          assert.strictEqual(weekList[1].dateIso, '2026-10-06')
          assert.strictEqual(weekList[3].dayKey, 'Thu')
          assert.strictEqual(weekList[3].dateIso, '2026-10-08')

          // Simulate Weight Room duty: Tue & Thu selected
          const weightRoomPreset = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'Weight Room')
          assert.ok(weightRoomPreset, 'Weight Room preset must exist')
          assert.deepStrictEqual(weightRoomPreset.defaultWeekdays, ['Tue', 'Thu'], 'Weight Room must default to Tue & Thu')

          const selectedDays = ['Tue', 'Thu']
          const createdDates = weekList.filter(d => selectedDays.includes(d.dayKey)).map(d => d.dateIso)
          assert.deepStrictEqual(createdDates, ['2026-10-06', '2026-10-08'], 'Must resolve to Tuesday Oct 6 and Thursday Oct 8')

          const duties = createdDates.map((date, idx) => ({
            dutyId: 501 + idx,
            dutyName: 'Weight Room',
            date,
            duration: 30,
            startTime: '11:25',
            notes: 'Supervision',
            isEmergency: false
          }))

          const ics = generateIcsContent(duties)
          assert.ok(ics.includes('DTSTART:20261006T112500'), 'Must contain Tuesday Oct 6 at 11:25')
          assert.ok(ics.includes('DTEND:20261006T115500'), 'Must end Tuesday Oct 6 at 11:55')
          assert.ok(ics.includes('DTSTART:20261008T112500'), 'Must contain Thursday Oct 8 at 11:25')
          assert.ok(ics.includes('DTEND:20261008T115500'), 'Must end Thursday Oct 8 at 11:55')
          assert.ok(!ics.includes('20261007T112500'), 'Must NOT contain Wednesday Oct 7')

          console.log('✅ Test 9 Passed: Weekday selector and Weight Room (Tue/Thu) calendar export verified.')
        }

        // ── Test 10: Schedule Days Catalog Presets & Weekday Toggle Sync ──
        {
          const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          function toggleDutyWeekday(duty, dayKey) {
            if (!Array.isArray(duty.defaultWeekdays)) {
              duty.defaultWeekdays = []
            }
            if (duty.defaultWeekdays.includes(dayKey)) {
              duty.defaultWeekdays = duty.defaultWeekdays.filter(k => k !== dayKey)
            } else {
              duty.defaultWeekdays = [...duty.defaultWeekdays, dayKey].sort(
                (a, b) => order.indexOf(a) - order.indexOf(b)
              )
            }
            duty.defaultDays = duty.defaultWeekdays.length
          }

          function setDutyNoDay(duty) {
            duty.defaultWeekdays = []
            duty.defaultDays = 0
          }

          const amBus = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'AM Bus')
          assert.deepStrictEqual(amBus.defaultWeekdays, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'AM Bus must default to M-F')
          assert.strictEqual(amBus.defaultDays, 5)

          const weightRoom = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'Weight Room')
          assert.deepStrictEqual(weightRoom.defaultWeekdays, ['Tue', 'Thu'], 'Weight Room must default to Tue & Thu')
          assert.strictEqual(weightRoom.defaultDays, 2)

          const onCall = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'On-call')
          assert.deepStrictEqual(onCall.defaultWeekdays, [], 'On-call default weekdays must be empty')
          assert.strictEqual(onCall.defaultDays, 0, 'On-call must default to 0 days (no day selected)')

          // Test toggling
          const mockCustomDuty = {
            id: 'custom-1',
            name: 'Weight Room',
            defaultDuration: 30,
            defaultDays: 2,
            defaultWeekdays: ['Tue', 'Thu']
          }

          // Toggle Wednesday ON -> ['Tue', 'Wed', 'Thu'], defaultDays: 3
          toggleDutyWeekday(mockCustomDuty, 'Wed')
          assert.deepStrictEqual(mockCustomDuty.defaultWeekdays, ['Tue', 'Wed', 'Thu'])
          assert.strictEqual(mockCustomDuty.defaultDays, 3)

          // Toggle Tuesday OFF -> ['Wed', 'Thu'], defaultDays: 2
          toggleDutyWeekday(mockCustomDuty, 'Tue')
          assert.deepStrictEqual(mockCustomDuty.defaultWeekdays, ['Wed', 'Thu'])
          assert.strictEqual(mockCustomDuty.defaultDays, 2)

          // Toggle all OFF -> [], defaultDays: 0 (No day selected)
          toggleDutyWeekday(mockCustomDuty, 'Wed')
          toggleDutyWeekday(mockCustomDuty, 'Thu')
          assert.deepStrictEqual(mockCustomDuty.defaultWeekdays, [])
          assert.strictEqual(mockCustomDuty.defaultDays, 0)

          // Explicit None action sets to 0 days
          toggleDutyWeekday(mockCustomDuty, 'Mon')
          assert.strictEqual(mockCustomDuty.defaultDays, 1)
          setDutyNoDay(mockCustomDuty)
          assert.deepStrictEqual(mockCustomDuty.defaultWeekdays, [])
          assert.strictEqual(mockCustomDuty.defaultDays, 0)

          console.log('✅ Test 10 Passed: Schedule Days catalog presets and weekday toggle sync verified.')
        }

        // ── Test 11: AddDutyModal 'No Day' Default & Ad-hoc Duty Logic ──
        {
          function simulateAddDutyModal(dutyPreset, initialDate = '', currentStartDate = '2026-10-26') {
            let selectedDays = []
            const form = {
              dutyName: dutyPreset.name,
              startDate: initialDate || currentStartDate,
              duration: Number(dutyPreset.defaultDuration) || 15,
              startTime: dutyPreset.defaultStartTime || '',
              isEmergency: Boolean(dutyPreset.isEmergency)
            }

            function selectSingleDay() {
              const [y, m, d] = form.startDate.split('-').map(Number)
              const dt = new Date(y, m - 1, d)
              const dow = dt.getDay()
              const map = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' }
              selectedDays = [map[dow] || 'Mon']
            }

            function applyDutyPreset(duty) {
              form.dutyName = duty.name
              form.duration = Number(duty.defaultDuration) || 15
              form.startTime = duty.defaultStartTime || ''
              form.isEmergency = Boolean(duty.isEmergency)

              if (duty.defaultWeekdays && Array.isArray(duty.defaultWeekdays) && duty.defaultWeekdays.length > 0) {
                selectedDays = [...duty.defaultWeekdays]
              } else if (duty.defaultDays === 0 || (!duty.defaultWeekdays || duty.defaultWeekdays.length === 0)) {
                if (initialDate && form.startDate === initialDate) {
                  const [y, m, d] = initialDate.split('-').map(Number)
                  const dt = new Date(y, m - 1, d)
                  const dow = dt.getDay()
                  const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  const dayKey = map[dow]
                  if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dayKey)) {
                    selectedDays = [dayKey]
                    return
                  }
                }
                selectedDays = []
              } else if (duty.id === 'weight-room' || (duty.name && duty.name.toLowerCase().includes('weight')) || duty.defaultDays === 2) {
                selectedDays = ['Tue', 'Thu']
              } else if (duty.defaultDays === 5) {
                selectedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
              } else if (duty.defaultDays === 1) {
                selectSingleDay()
              } else {
                selectedDays = []
              }
            }

            function toggleDay(dayKey) {
              if (selectedDays.includes(dayKey)) {
                selectedDays = selectedDays.filter(k => k !== dayKey)
              } else {
                const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                selectedDays = [...selectedDays, dayKey].sort(
                  (a, b) => order.indexOf(a) - order.indexOf(b)
                )
              }
            }

            function onStartDateChange(newStartDate) {
              form.startDate = newStartDate
              if (dutyPreset.defaultDays === 0 || (!dutyPreset.defaultWeekdays || dutyPreset.defaultWeekdays.length === 0)) {
                return
              }
              if (dutyPreset.defaultDays === 5) {
                selectedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
              } else if (dutyPreset.defaultDays === 1) {
                selectSingleDay()
              }
            }

            applyDutyPreset(dutyPreset)

            return {
              getSelectedDays: () => selectedDays,
              toggleDay,
              onStartDateChange
            }
          }

          // Case A: Emergency duty logged via header "+ Log Assigned Duty" (no initialDate)
          const emergencyPreset = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'Emergency')
          const emModal = simulateAddDutyModal(emergencyPreset)
          assert.deepStrictEqual(emModal.getSelectedDays(), [], 'Emergency must default to no day selected')

          // Clicking Wednesday selects only Wednesday (no accidental Monday!)
          emModal.toggleDay('Wed')
          assert.deepStrictEqual(emModal.getSelectedDays(), ['Wed'], 'Only Wednesday should be selected')

          // Clicking Wednesday again deselects it down to 0 days
          emModal.toggleDay('Wed')
          assert.deepStrictEqual(emModal.getSelectedDays(), [], 'Should deselect down to 0 days')

          // Changing week/start date does NOT auto-populate Monday
          emModal.onStartDateChange('2026-11-02') // Monday
          assert.deepStrictEqual(emModal.getSelectedDays(), [], 'Changing date must not auto-populate Monday for no-day duty')

          // Case B: On-call and OSSLT presets default to empty
          const onCallPreset = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'On-call')
          const ocModal = simulateAddDutyModal(onCallPreset)
          assert.deepStrictEqual(ocModal.getSelectedDays(), [], 'On-call must default to no day selected')

          const ossltPreset = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'OSSLT')
          const osModal = simulateAddDutyModal(ossltPreset)
          assert.deepStrictEqual(osModal.getSelectedDays(), [], 'OSSLT must default to no day selected')

          // Case C: Standard 5-day duty still defaults to M-F
          const busPreset = INITIAL_DUTY_SETTINGS.dutyTypes.find(d => d.name === 'AM Bus')
          const busModal = simulateAddDutyModal(busPreset)
          assert.deepStrictEqual(busModal.getSelectedDays(), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])

          // Case D: Calendar view click on a specific date (e.g. Wednesday 2026-10-28)
          const calModal = simulateAddDutyModal(emergencyPreset, '2026-10-28')
          assert.deepStrictEqual(calModal.getSelectedDays(), ['Wed'], 'Clicking specific calendar cell pre-fills that specific day')

          console.log('✅ Test 11 Passed: AddDutyModal no-day defaults and ad-hoc duty workflows verified.')
        }

        console.log('\n🎉 ALL DUTY TRACKER TESTS PASSED SUCCESSFULLY!\n')
      })
    })
  })
}
