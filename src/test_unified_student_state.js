/**
 * src/test_unified_student_state.js
 *
 * Verifies Finding 1: Single source of truth for student state.
 * Validates that students.value, activeClass.value.students, and activeClassRecord.value.students
 * share exact memory references, preventing data desynchronization and eliminating 4-way duplication.
 */

import assert from 'node:assert'

// Mock browser environment for composables
const storage = {}
globalThis.localStorage = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = String(v) },
  removeItem: (k) => { delete storage[k] },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
}
globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
}

const {
  activeClass,
  activeClassRecord,
  classList,
  students,
  syncStudentAcrossRefs
} = await import('./composables/useClassroomState.js')

const { syncStudentState } = await import('./composables/useAttendanceTracker.js')
const { getEffectiveClassRecord } = await import('./composables/useElementary.js')

console.log('=================================================================')
console.log('🧪 RUNNING UNIFIED STUDENT STATE & REFS INTEGRITY AUDIT')
console.log('=================================================================')

// Setup mock class
const mockStudent = {
  studentId: 'st_101',
  firstName: 'Jordan',
  lastName: 'Miller',
  seat: { row: 2, col: 3 },
  activeStates: { isOut: false, isAbsent: false, lateMs: null },
  excludeFromAnalytics: false
}

const mockClass = {
  classId: 'class_alpha',
  name: 'Period 1 Science',
  classType: 'secondary',
  students: {
    'st_101': mockStudent
  }
}

// 1. Activation & Shared Reference Check
activeClass.value = mockClass
classList.value = [mockClass]
students.value = mockClass.students
activeClassRecord.value = getEffectiveClassRecord(mockClass)

import { toRaw } from 'vue'

console.log('\n--- TEST 1: Identity & Reference Equivalence ---')
assert.strictEqual(
  toRaw(students.value['st_101']),
  activeClass.value.students['st_101'],
  'toRaw(students.value) and activeClass.value.students MUST share exact underlying object identity'
)
assert.strictEqual(
  activeClass.value.students['st_101'],
  activeClassRecord.value.students['st_101'],
  'activeClass.value.students and activeClassRecord.value.students MUST share exact object identity'
)
assert.strictEqual(
  activeClass.value.students['st_101'],
  classList.value[0].students['st_101'],
  'activeClass.value.students and classList.value[0].students MUST share exact object identity'
)
console.log('✓ All 4 access points operate on the exact same student object in memory')

// 2. syncStudentAcrossRefs Test
console.log('\n--- TEST 2: Single-Point Mutation via syncStudentAcrossRefs ---')
syncStudentAcrossRefs('class_alpha', 'st_101', {
  seat: { row: 4, col: 5 },
  excludeFromAnalytics: true
})

assert.deepStrictEqual(
  students.value['st_101'].seat,
  { row: 4, col: 5 },
  'students.value reflects updated seat'
)
assert.strictEqual(
  activeClass.value.students['st_101'].seat.row,
  4,
  'activeClass.value.students reflects updated seat without manual syncing'
)
assert.strictEqual(
  activeClassRecord.value.students['st_101'].excludeFromAnalytics,
  true,
  'activeClassRecord.value.students reflects excludeFromAnalytics flag'
)
assert.strictEqual(
  classList.value[0].students['st_101'].seat.col,
  5,
  'classList entry reflects updated seat'
)
console.log('✓ syncStudentAcrossRefs correctly updates the single underlying student object')

// 3. Attendance State Synchronization
console.log('\n--- TEST 3: Attendance State Synchronization via syncStudentState ---')
syncStudentState('class_alpha', 'st_101', {
  isOut: true,
  outTime: 123456789,
  isAbsent: false,
  lateMs: null
}, { code: 'w_out', ts: 123456789 })

assert.strictEqual(students.value['st_101'].activeStates.isOut, true, 'students.value isOut is true')
assert.strictEqual(activeClass.value.students['st_101'].activeStates.isOut, true, 'activeClass.value.students isOut is true')
assert.strictEqual(activeClassRecord.value.students['st_101'].activeStates.isOut, true, 'activeClassRecord.value.students isOut is true')
assert.strictEqual(classList.value[0].students['st_101'].activeStates.isOut, true, 'classList isOut is true')
assert.strictEqual(activeClass.value.students['st_101'].lastEvent.code, 'w_out', 'lastEvent synchronized across all refs')
console.log('✓ syncStudentState successfully keeps all attendance and washroom state unified')

// 4. Elementary Mode Switching & Gradebook Record
console.log('\n--- TEST 4: Elementary Mode Switching & Subject Projection ---')
const elemClass = {
  classId: 'class_elem_7',
  name: 'Grade 7 Homeroom',
  classType: 'elementary',
  subjects: [
    { subjectId: 'sub_math', name: 'Mathematics', gradingFramework: 'sbar' },
    { subjectId: 'sub_sci', name: 'Science', gradingFramework: 'traditional' }
  ],
  students: {
    'st_101': {
      ...mockStudent,
      adjustedGrade: 88
    }
  }
}

activeClass.value = elemClass
students.value = elemClass.students
activeClassRecord.value = getEffectiveClassRecord(elemClass, 'sub_math')

assert.strictEqual(
  toRaw(students.value['st_101']),
  activeClassRecord.value.students['st_101'],
  'Elementary projection preserves exact student object reference'
)
assert.strictEqual(
  activeClass.value.students['st_101'],
  activeClassRecord.value.students['st_101'],
  'activeClass and activeClassRecord share identical student object'
)

// Mutate student in elementary mode
syncStudentAcrossRefs('class_elem_7', 'st_101', { adjustedGrade: 92 })
assert.strictEqual(activeClassRecord.value.students['st_101'].adjustedGrade, 92)
assert.strictEqual(students.value['st_101'].adjustedGrade, 92)
console.log('✓ Elementary subject projection preserves single student object reference')

console.log('\n=================================================================')
console.log('🏁 ALL UNIFIED STUDENT STATE TESTS PASSED CLEANLY!')
console.log('=================================================================\n')
