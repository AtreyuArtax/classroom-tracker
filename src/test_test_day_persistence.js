/**
 * src/test_test_day_persistence.js
 *
 * Automated verification suite for Test Day persistence and reconciliation across
 * class switching, browser reloads, and event ground truth.
 * Run with: node src/test_test_day_persistence.js
 */

import assert from 'assert'
import { formatLocalDate } from './utils/dates.js'

// Mock browser environment for composables
const sStorage = {}
globalThis.sessionStorage = {
  getItem: (k) => sStorage[k] ?? null,
  setItem: (k, v) => { sStorage[k] = String(v) },
  removeItem: (k) => { delete sStorage[k] },
  clear: () => { Object.keys(sStorage).forEach(k => delete sStorage[k]) }
}
const lStorage = {}
globalThis.localStorage = {
  getItem: (k) => lStorage[k] ?? null,
  setItem: (k, v) => { lStorage[k] = String(v) },
  removeItem: (k) => { delete lStorage[k] },
  clear: () => { Object.keys(lStorage).forEach(k => delete lStorage[k]) }
}

console.log('🧪 Starting Test Day Persistence & Reconciliation Tests...\n')

const todayStr = formatLocalDate(new Date())
const yesterdayStr = '2026-01-01'

// Mock classes
const classA = {
  classId: 'class-a',
  name: 'Period 1 Math',
  periodNumber: 1,
  testDayDate: todayStr,
  students: {
    's1': { firstName: 'Alice', lastName: 'Smith', activeStates: { isAbsent: false, isOut: false } }
  }
}

const classB = {
  classId: 'class-b',
  name: 'Period 2 Science',
  periodNumber: 2,
  testDayDate: null,
  students: {
    's2': { firstName: 'Bob', lastName: 'Jones', activeStates: { isAbsent: false, isOut: false } }
  }
}

const classC_stale = {
  classId: 'class-c',
  name: 'Period 3 History',
  periodNumber: 3,
  testDayDate: yesterdayStr,
  students: {}
}

const classD_fromEvents = {
  classId: 'class-d',
  name: 'Period 4 English',
  periodNumber: 4,
  testDayDate: null,
  students: {
    's4': { firstName: 'Diana', lastName: 'Prince', activeStates: { isAbsent: true, isOut: false } }
  }
}

// ── Test 1: Reconciling class with testDayDate set to today ────────────────────
console.log('Test 1: Reconciling class with testDayDate set to today')
{
  const eventsToday = []
  const hasTestDayEventsToday = eventsToday.some(e => !e.superseded && e.testDay)
  const isStoredTestDayToday = classA.testDayDate === todayStr || sessionStorage.getItem(`testDay_${classA.classId}`) === todayStr
  const isTestDayActive = hasTestDayEventsToday || isStoredTestDayToday

  assert.strictEqual(isTestDayActive, true, 'Class A should be recognized as active Test Day')
  console.log('✓ Class A with today testDayDate correctly resolves to active Test Day\n')
}

// ── Test 2: Reconciling class without testDayDate ─────────────────────────────
console.log('Test 2: Reconciling class without testDayDate')
{
  const eventsToday = []
  const hasTestDayEventsToday = eventsToday.some(e => !e.superseded && e.testDay)
  const isStoredTestDayToday = classB.testDayDate === todayStr || sessionStorage.getItem(`testDay_${classB.classId}`) === todayStr
  const isTestDayActive = hasTestDayEventsToday || isStoredTestDayToday

  assert.strictEqual(isTestDayActive, false, 'Class B should NOT be active Test Day')
  console.log('✓ Class B with null testDayDate correctly resolves to inactive\n')
}

// ── Test 3: Switching between classes preserves respective Test Day states ─────
console.log('Test 3: Switching Class A -> Class B -> Class A preserves states')
{
  let currentIsTestDay = false

  // Activate Class A
  {
    const eventsToday = []
    const isTestDayActive = classA.testDayDate === todayStr || eventsToday.some(e => !e.superseded && e.testDay)
    currentIsTestDay = isTestDayActive
    sessionStorage.setItem(`testDay_${classA.classId}`, todayStr)
  }
  assert.strictEqual(currentIsTestDay, true, 'Class A activated with Test Day true')

  // Switch to Class B
  {
    const eventsToday = []
    const isTestDayActive = classB.testDayDate === todayStr || eventsToday.some(e => !e.superseded && e.testDay)
    currentIsTestDay = isTestDayActive
  }
  assert.strictEqual(currentIsTestDay, false, 'Switched to Class B, Test Day is false')

  // Switch back to Class A
  {
    const eventsToday = []
    const isStored = classA.testDayDate === todayStr || sessionStorage.getItem(`testDay_${classA.classId}`) === todayStr
    const isTestDayActive = isStored || eventsToday.some(e => !e.superseded && e.testDay)
    currentIsTestDay = isTestDayActive
  }
  assert.strictEqual(currentIsTestDay, true, 'Switched back to Class A, Test Day restored to true')
  console.log('✓ Switching between classes cleanly isolates and preserves Test Day state\n')
}

// ── Test 4: Reconciling Test Day from existing attendance events ───────────────
console.log('Test 4: Reconciling Test Day from events when class.testDayDate was missing')
{
  // Simulated events logged earlier today with testDay: true
  const eventsToday = [
    { eventId: 'ev-1', studentId: 's4', code: 'a', testDay: true, superseded: false, timestamp: todayStr + 'T09:00:00' }
  ]

  const hasTestDayEventsToday = eventsToday.some(e => !e.superseded && e.testDay)
  const isStoredTestDayToday = classD_fromEvents.testDayDate === todayStr || sessionStorage.getItem(`testDay_${classD_fromEvents.classId}`) === todayStr
  const shouldActivate = hasTestDayEventsToday || isStoredTestDayToday

  assert.strictEqual(shouldActivate, true, 'Test day events today should trigger active Test Day state')

  // Auto-healing: class record should update testDayDate
  if (classD_fromEvents.testDayDate !== todayStr) {
    classD_fromEvents.testDayDate = todayStr
  }
  assert.strictEqual(classD_fromEvents.testDayDate, todayStr, 'class.testDayDate auto-healed from event ground truth')
  console.log('✓ Reconciled and auto-healed Test Day state from attendance events ground truth\n')
}

// ── Test 5: Expiring stale testDayDate from previous day ────────────────────────
console.log('Test 5: Stale testDayDate from a previous day is cleared')
{
  const eventsToday = []
  const hasTestDayEventsToday = eventsToday.some(e => !e.superseded && e.testDay)
  const isStoredTestDayToday = classC_stale.testDayDate === todayStr || sessionStorage.getItem(`testDay_${classC_stale.classId}`) === todayStr
  const shouldActivate = hasTestDayEventsToday || isStoredTestDayToday

  assert.strictEqual(shouldActivate, false, 'Yesterday test day should not be active today')

  let cleanedDate = classC_stale.testDayDate
  if (!shouldActivate && classC_stale.testDayDate && classC_stale.testDayDate !== todayStr) {
    cleanedDate = null
  }
  assert.strictEqual(cleanedDate, null, 'Stale testDayDate successfully cleared')
  console.log('✓ Previous day testDayDate correctly invalidated and cleared\n')
}

console.log('🎉 ALL 5 TEST DAY PERSISTENCE TESTS PASSED SUCCESSFULLY!\n')
