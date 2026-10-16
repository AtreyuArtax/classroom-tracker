import assert from 'node:assert'

// Setup Node globals for storage before importing composables
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] ?? null },
  setItem(k, v) { this._store[k] = String(v) },
  removeItem(k) { delete this._store[k] }
}
globalThis.sessionStorage = {
  _store: {},
  getItem(k) { return this._store[k] ?? null },
  setItem(k, v) { this._store[k] = String(v) },
  removeItem(k) { delete this._store[k] }
}

const {
  useActionAlerts,
  setAlertSource,
  syncEventUpdated,
  syncEventRemoved,
  syncEventCreated,
  syncGradeUpdated
} = await import('./composables/useActionAlerts.js')

const {
  notifyEventMutated,
  notifyGradeMutated,
  behaviorCodes
} = await import('./composables/useClassroomState.js')

const {
  classGrades: gbClassGrades,
  activeClassRecord
} = await import('./composables/useGradebook.js')

behaviorCodes.value = [
  { codeKey: 'w', label: 'Out of Class', category: 'washroom', type: 'toggle' }
]

console.log('── Running Action Alerts Event Mutation Reactivity Tests ──\n')

const classId = 'class_101'
const studentId = 'st_42'
const { alertFor, evaluated } = useActionAlerts(classId)

const initialEvent = {
  eventId: 'evt_99',
  studentId,
  classId,
  code: 'w',
  duration: 15 * 60000, // 15 minutes (threshold is default 11 min)
  timestamp: new Date().toISOString()
}

// 1. Seed initial source state with an extended washroom event
setAlertSource(classId, {
  students: {
    [studentId]: { firstName: 'Taylor', lastName: 'Swift', studentId }
  },
  studentList: [
    { firstName: 'Taylor', lastName: 'Swift', studentId }
  ],
  events: [initialEvent],
  periodEvents: [initialEvent],
  classGrades: {},
  effective: { classId, gradingFramework: 'traditional' },
  period: 'week',
  dateRange: {}
})

// Test 1: Verify initial alert is generated
{
  const alert = alertFor(studentId)
  assert.ok(alert, 'Alert should be generated for 15min out of class')
  assert.strictEqual(alert.reason, '15min out of class')
  assert.deepStrictEqual(alert.kinds, ['washroom'])
  console.log('✓ Test 1 Passed: Initial extended absence alert triggered correctly (15min out of class)')
}

// Test 2: Adjust duration down below threshold (15m -> 4m) via syncEventUpdated directly
{
  syncEventUpdated(classId, 'evt_99', { duration: 4 * 60000 })
  const alert = alertFor(studentId)
  assert.strictEqual(alert, null, 'Alert banner should disappear when duration adjusted below threshold')
  assert.strictEqual(evaluated.value.active.length, 0, 'Active queue should be empty')
  console.log('✓ Test 2 Passed: Alert banner immediately disappears when time adjusted below threshold (4 min)')
}

// Test 3: Adjust duration back above threshold via notifyEventMutated
{
  notifyEventMutated({
    type: 'update',
    eventId: 'evt_99',
    classId,
    updates: { duration: 25 * 60000 }
  })
  const alert = alertFor(studentId)
  assert.ok(alert, 'Alert should re-appear when duration adjusted back above threshold')
  assert.strictEqual(alert.reason, '25min out of class')
  console.log('✓ Test 3 Passed: Alert reactively updates to 25min out of class via notifyEventMutated')
}

// Test 4: Adjust duration down below threshold via notifyEventMutated (the exact user scenario!)
{
  notifyEventMutated({
    type: 'update',
    eventId: 'evt_99',
    classId,
    updates: { duration: 5 * 60000 }
  })
  const alert = alertFor(studentId)
  assert.strictEqual(alert, null, 'Alert banner MUST disappear immediately without page refresh')
  console.log('✓ Test 4 Passed: Banner disappears when time adjusted below threshold via notifyEventMutated')
}

// Test 5: Adjust duration partially (e.g. 25m down to 14m, still above 11m threshold)
{
  notifyEventMutated({
    type: 'update',
    eventId: 'evt_99',
    classId,
    updates: { duration: 14 * 60000 }
  })
  const alert = alertFor(studentId)
  assert.ok(alert, 'Alert should update duration text')
  assert.strictEqual(alert.reason, '14min out of class')
  console.log('✓ Test 5 Passed: Banner updates to 14min out of class when adjusted to another above-threshold duration')
}

// Test 6: Remove event via notifyEventMutated
{
  notifyEventMutated({
    type: 'remove',
    eventId: 'evt_99',
    classId
  })
  const alert = alertFor(studentId)
  assert.strictEqual(alert, null, 'Alert banner disappears when event is removed')
  console.log('✓ Test 6 Passed: Banner disappears when event is deleted')
}

// Test 7: Create event via notifyEventMutated
{
  const newEvt = {
    eventId: 'evt_100',
    studentId,
    classId,
    code: 'w',
    duration: 18 * 60000,
    timestamp: new Date().toISOString()
  }
  notifyEventMutated({
    type: 'create',
    eventId: 'evt_100',
    classId,
    event: newEvt
  })
  const alert = alertFor(studentId)
  assert.ok(alert, 'Alert triggers on new event')
  assert.strictEqual(alert.reason, '18min out of class')
  console.log('✓ Test 7 Passed: Banner immediately appears when a new long excursion event is created')
}

// ── Grade Mutation Reactivity Tests ──

// Remove lingering washroom event so we test pure grade alerts
syncEventRemoved(classId, 'evt_100')

// Test 8: Student is failing (<50%) -> alert triggered
{
  activeClassRecord.value = { classId }
  gbClassGrades.value = {
    [studentId]: { overallGrade: 42 }
  }
  notifyGradeMutated({ classId, studentId })

  const alert = alertFor(studentId)
  assert.ok(alert, 'Alert should be triggered for failing grade (<50%)')
  assert.strictEqual(alert.reason, 'Failing Grade (<50%)')
  assert.deepStrictEqual(alert.kinds, ['grade'])
  console.log('✓ Test 8 Passed: Initial failing grade alert triggered correctly (Failing Grade <50%)')
}

// Test 9: Adjust mark above 50% threshold to 55% -> alert changes from failing to low-grade follow-up
{
  gbClassGrades.value = {
    [studentId]: { overallGrade: 55 }
  }
  notifyGradeMutated({ classId, studentId })

  const alert = alertFor(studentId)
  assert.ok(alert, 'Alert should be updated to low grade follow-up')
  assert.strictEqual(alert.reason, 'Grade at 55%')
  assert.strictEqual(alert.severity, 'danger')
  console.log('✓ Test 9 Passed: Mark adjusted above 50% threshold -> alert updates to "Grade at 55%"')
}

// Test 10: Adjust mark above 60% threshold to 78% -> alert banner completely disappears!
{
  gbClassGrades.value = {
    [studentId]: { overallGrade: 78 }
  }
  notifyGradeMutated({ classId, studentId })

  const alert = alertFor(studentId)
  assert.strictEqual(alert, null, 'Alert should be completely removed when grade is above 60%')
  assert.strictEqual(evaluated.value.active.length, 0, 'Active queue should be empty')
  console.log('✓ Test 10 Passed: Mark adjusted above 60% threshold -> student completely removed from Action Required')
}

// Test 11: Mark drops back below threshold (45%) -> alert immediately returns
{
  gbClassGrades.value = {
    [studentId]: { overallGrade: 45 }
  }
  notifyGradeMutated({ classId, studentId })

  const alert = alertFor(studentId)
  assert.ok(alert, 'Alert should re-appear when grade drops back below threshold')
  assert.strictEqual(alert.reason, 'Failing Grade (<50%)')
  console.log('✓ Test 11 Passed: Mark drops back below 50% -> alert immediately re-appears')
}

console.log('\n🎉 ALL ACTION ALERTS REACTIVITY TESTS PASSED!\n')
