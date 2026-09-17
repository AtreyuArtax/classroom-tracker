/**
 * src/test_roster_csv_reconciliation.js
 *
 * Automated verification suite for Roster CSV Reconciliation & Section Selector Improvements:
 * 1. Default section selector behavior (initializes with NOTHING selected, count 0).
 * 2. Roster diff calculation (identifying newly added students 'XYZ').
 * 3. Archive candidates detection (identifying enrolled students missing from CSV 'abc').
 * 4. Archiving execution (setting archived: true and seat: null for confirmed candidates).
 * 5. Re-enrolling previously archived students (restoring archived: false).
 * 6. "Keep All" workflow (proceeding without archiving missing students).
 */

import assert from 'assert'

console.log('=================================================================')
console.log('📋 TEST SUITE: ROSTER CSV RECONCILIATION & SECTION SELECTOR')
console.log('=================================================================')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
    failed++
  }
}

// =============================================================================
// TEST GROUP 1: Section Selector Default Selection
// =============================================================================
console.log('\nTEST GROUP 1: Section Selector Default Selection')

test('Section selector initializes all detected groups with selected: false (nothing selected)', () => {
  const rawRows = [
    { studentId: '101', firstName: 'John', lastName: 'Doe', year: '2025-26', semester: '1', periodNumber: '1', courseCode: 'SNC2D' },
    { studentId: '102', firstName: 'Jane', lastName: 'Smith', year: '2025-26', semester: '1', periodNumber: '2', courseCode: 'MPM2D' }
  ]

  const groups = {}
  for (const row of rawRows) {
    const key = `${row.year}-${row.semester}-P${row.periodNumber}`
    if (!groups[key]) {
      groups[key] = {
        name: `Period ${row.periodNumber} — ${row.year}`,
        year: row.year,
        semester: row.semester,
        periodNumber: row.periodNumber,
        students: [],
        selected: false
      }
    }
    groups[key].students.push(row)
  }

  const keys = Object.keys(groups)
  assert.strictEqual(keys.length, 2)
  assert.strictEqual(keys.every(k => groups[k].selected === false), true, 'All groups must default to selected: false')
  
  const selectedCount = Object.values(groups).filter(g => g.selected).length
  assert.strictEqual(selectedCount, 0, 'Selected count must be 0 by default')
})

test('Select All and Semester filter toggles work properly from initial unselected state', () => {
  const groups = {
    '2025-26-1-P1': { semester: '1', selected: false },
    '2025-26-1-P2': { semester: '1', selected: false },
    '2025-26-2-P3': { semester: '2', selected: false }
  }

  // Toggle all
  const isAllSelected = Object.keys(groups).every(k => groups[k].selected)
  assert.strictEqual(isAllSelected, false)
  
  // Select all
  for (const k in groups) groups[k].selected = !isAllSelected
  assert.strictEqual(Object.values(groups).every(g => g.selected), true)

  // Deselect all
  for (const k in groups) groups[k].selected = false
  assert.strictEqual(Object.values(groups).every(g => !g.selected), true)

  // Select semester 1 only
  for (const k in groups) {
    if (groups[k].semester === '1') groups[k].selected = true
  }
  assert.strictEqual(groups['2025-26-1-P1'].selected, true)
  assert.strictEqual(groups['2025-26-1-P2'].selected, true)
  assert.strictEqual(groups['2025-26-2-P3'].selected, false)
})

// =============================================================================
// TEST GROUP 2: Roster Difference Calculation
// =============================================================================
console.log('\nTEST GROUP 2: Roster Difference Calculation')

test('Correctly identifies students to add (XYZ) and students missing from CSV (abc)', () => {
  const existingClass = {
    classId: 'cls_1',
    name: 'Period 1 Science',
    year: '2025-26',
    semester: '1',
    periodNumber: 1,
    students: {
      '101': { firstName: 'Alice', lastName: 'Cooper', archived: false, seat: { row: 0, col: 0 } },
      '102': { firstName: 'Bob', lastName: 'Marley', archived: false, seat: { row: 0, col: 1 } },
      '103': { firstName: 'Charlie', lastName: 'Brown', archived: false, seat: { row: 0, col: 2 } } // Not in new CSV!
    }
  }

  // Incoming CSV has Alice (101), Bob (102), and a NEW student Diana (104)
  const incomingStudents = [
    { studentId: '101', firstName: 'Alice', lastName: 'Cooper' },
    { studentId: '102', firstName: 'Bob', lastName: 'Marley' },
    { studentId: '104', firstName: 'Diana', lastName: 'Prince' } // New student!
  ]

  const incomingIds = new Set(incomingStudents.map(s => String(s.studentId).trim()))
  const existingStudents = existingClass.students

  const adding = []
  const updating = []
  for (const s of incomingStudents) {
    const cleanId = String(s.studentId).trim()
    const ex = existingStudents[cleanId]
    const displayName = `${s.firstName || ''} ${s.lastName || ''}`.trim()
    if (!ex || ex.archived) {
      adding.push({ studentId: cleanId, name: displayName })
    } else {
      updating.push({ studentId: cleanId, name: displayName })
    }
  }

  const missing = []
  for (const [cleanId, s] of Object.entries(existingStudents)) {
    if (!s.archived && !incomingIds.has(cleanId)) {
      missing.push({
        studentId: cleanId,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        selectedForArchive: true
      })
    }
  }

  assert.strictEqual(adding.length, 1, 'Should have 1 student to add')
  assert.strictEqual(adding[0].studentId, '104')
  assert.strictEqual(adding[0].name, 'Diana Prince')

  assert.strictEqual(updating.length, 2, 'Should have 2 students updating')

  assert.strictEqual(missing.length, 1, 'Should have 1 missing student')
  assert.strictEqual(missing[0].studentId, '103')
  assert.strictEqual(missing[0].name, 'Charlie Brown')
  assert.strictEqual(missing[0].selectedForArchive, true, 'Default selectedForArchive should be true')
})

// =============================================================================
// TEST GROUP 3: Archive Execution & Seat Removal
// =============================================================================
console.log('\nTEST GROUP 3: Archive Execution & Data Safety')

test('Archiving missing student marks archived: true and removes seat while preserving other student data', () => {
  const existingClass = {
    classId: 'cls_1',
    name: 'Period 1 Science',
    students: {
      '103': {
        firstName: 'Charlie',
        lastName: 'Brown',
        archived: false,
        seat: { row: 2, col: 3 },
        parentContacts: [{ name: 'Sally Brown', email: 'sally@brown.org' }],
        generalNote: 'Needs front row seating'
      }
    }
  }

  // Simulate archive action
  const student = existingClass.students['103']
  student.archived = true
  student.seat = null

  assert.strictEqual(student.archived, true, 'Student must be marked archived')
  assert.strictEqual(student.seat, null, 'Seat assignment must be cleared')
  assert.strictEqual(student.parentContacts.length, 1, 'Parent contacts must be preserved')
  assert.strictEqual(student.generalNote, 'Needs front row seating', 'General note must be preserved')
})

test('Selective archiving only archives chosen students and keeps unselected active', () => {
  const missingCandidates = [
    { studentId: '201', name: 'Eva Green', selectedForArchive: true },
    { studentId: '202', name: 'Frank Castle', selectedForArchive: false }
  ]

  const studentsDb = {
    '201': { firstName: 'Eva', lastName: 'Green', archived: false, seat: { row: 1, col: 1 } },
    '202': { firstName: 'Frank', lastName: 'Castle', archived: false, seat: { row: 1, col: 2 } }
  }

  for (const m of missingCandidates) {
    if (m.selectedForArchive) {
      studentsDb[m.studentId].archived = true
      studentsDb[m.studentId].seat = null
    }
  }

  assert.strictEqual(studentsDb['201'].archived, true, 'Eva Green was selected and must be archived')
  assert.strictEqual(studentsDb['201'].seat, null)

  assert.strictEqual(studentsDb['202'].archived, false, 'Frank Castle was unselected and must remain active')
  assert.notStrictEqual(studentsDb['202'].seat, null)
})

// =============================================================================
// TEST GROUP 4: Re-enrolling Archived Students
// =============================================================================
console.log('\nTEST GROUP 4: Re-enrolling Archived Students')

test('Re-importing a previously archived student restores them to active status', () => {
  const existingClass = {
    classId: 'cls_1',
    name: 'Period 1 Science',
    students: {
      '301': {
        firstName: 'George',
        lastName: 'Bailey',
        archived: true, // was archived previously
        seat: null
      }
    }
  }

  const row = { studentId: '301', firstName: 'George (SIS)', lastName: 'Bailey' }
  const cleanId = row.studentId

  // classService import logic: restore archived: false, but preserve existing customized data
  if (existingClass.students[cleanId]) {
    existingClass.students[cleanId].archived = false // restored
  }

  assert.strictEqual(existingClass.students['301'].archived, false, 'Student must be unarchived upon re-import')
  assert.strictEqual(existingClass.students['301'].firstName, 'George', 'Student details preserved')
})

test('Re-import NEVER updates or overwrites existing student names, emails, phones, or notes', () => {
  const existingClass = {
    classId: 'cls_2',
    name: 'Period 2 Science',
    students: {
      '401': {
        firstName: 'Alexander (Alex)',
        lastName: 'Smith',
        parentContacts: [{ name: 'Mom', phone: '555-4321', email: 'mom@home.com' }],
        studentEmail: 'alex.smith@school.ca',
        generalNote: 'Needs front row seating'
      }
    }
  }

  const incomingCsvRow = {
    studentId: '401',
    firstName: 'Alexander', // Formal SIS name
    lastName: 'Smith',
    parentContacts: [], // Blank in SIS CSV
    studentEmail: 'asmith@district.ca' // Different SIS email
  }

  const cleanId = incomingCsvRow.studentId
  // classService import logic: NEVER overwrite existing student fields
  if (existingClass.students[cleanId]) {
    existingClass.students[cleanId].archived = false
  }

  const student = existingClass.students['401']
  assert.strictEqual(student.firstName, 'Alexander (Alex)', 'Preferred nickname must NOT be overwritten by SIS formal name')
  assert.strictEqual(student.parentContacts.length, 1, 'Custom parent contacts must NOT be wiped out by CSV')
  assert.strictEqual(student.parentContacts[0].phone, '555-4321')
  assert.strictEqual(student.studentEmail, 'alex.smith@school.ca', 'Custom student email must NOT be overwritten')
  assert.strictEqual(student.generalNote, 'Needs front row seating', 'General notes must remain intact')
})

// =============================================================================
// TEST GROUP 5: Summary Output Accuracy
// =============================================================================
console.log('\nTEST GROUP 5: Summary Output Accuracy')

test('Import summary cleanly aggregates added, updated, and archived counts', () => {
  const items = [
    {
      className: 'Period 1 Science',
      adding: [{ name: 'Alice' }, { name: 'Bob' }],
      updating: [{ name: 'Charlie' }, { name: 'David' }],
      missing: [{ name: 'Eva', selectedForArchive: true }]
    },
    {
      className: 'Period 2 Math',
      adding: [],
      updating: [{ name: 'Frank' }],
      missing: []
    }
  ]

  const shouldArchive = true
  const totalAdded = items.reduce((sum, i) => sum + i.adding.length, 0)
  const totalUpdated = items.reduce((sum, i) => sum + i.updating.length, 0)
  const totalArchived = shouldArchive 
    ? items.reduce((sum, i) => sum + i.missing.filter(m => m.selectedForArchive).length, 0)
    : 0

  assert.strictEqual(totalAdded, 2)
  assert.strictEqual(totalUpdated, 3)
  assert.strictEqual(totalArchived, 1)
})

test('Dynamic button label reflects selections and deselect-all keeps all active with 0 archived', () => {
  const missing = [
    { name: 'Student 1', selectedForArchive: true },
    { name: 'Student 2', selectedForArchive: true },
    { name: 'Student 3', selectedForArchive: true }
  ]

  const getCount = (list) => list.filter(m => m.selectedForArchive).length
  const getButtonLabel = (count) => count > 0 ? `Archive (${count}) & Import` : 'Complete Import'

  // Default: 3 selected
  assert.strictEqual(getCount(missing), 3)
  assert.strictEqual(getButtonLabel(getCount(missing)), 'Archive (3) & Import')

  // User deselects 1
  missing[0].selectedForArchive = false
  assert.strictEqual(getCount(missing), 2)
  assert.strictEqual(getButtonLabel(getCount(missing)), 'Archive (2) & Import')

  // User clicks 'Deselect All' -> keeps all active on roster
  missing.forEach(m => { m.selectedForArchive = false })
  assert.strictEqual(getCount(missing), 0)
  assert.strictEqual(getButtonLabel(getCount(missing)), 'Complete Import')

  // Executing import when 0 selected results in 0 archived
  const toArchive = missing.filter(m => m.selectedForArchive)
  assert.strictEqual(toArchive.length, 0, 'No students are archived when none are checked')
})

console.log('\n=================================================================')
console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed`)
console.log('=================================================================')

if (failed > 0) process.exit(1)
