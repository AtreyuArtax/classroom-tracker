/**
 * src/test_roster_import_summaries.js
 *
 * Covers the Setup roster import flow helpers in utils/rosterCsvImport.js and
 * utils/classGrouping.js:
 * 1. Rows missing a Student ID or name are reported, blank rows are ignored.
 * 2. Periods found in the CSV but not in settings get chained default start times.
 * 3. Roster reconciliation: added / kept / restored-from-archive / missing students,
 *    with half-semester term classes matched to the right existing class.
 * 4. Multi-class (secondary) import summary, with and without archiving.
 * 5. Elementary homeroom summary, including students enrolled in another class.
 * 6. Manage Classes year → semester grouping and ordering.
 * 7. Re-importing a roster keeps teacher edits and only restores archived students.
 * 8. Cross-class conflicts only between same-year elementary homerooms.
 */

import assert from 'node:assert'
import {
  parseRosterRows,
  addMissingPeriodTimes,
  nextPeriodStartTime,
  groupRosterRows,
  buildReconciliationItems,
  buildBulkImportSummary,
  buildElementaryImportSummary,
  mergeRosterRows,
  findConflictingHomeroom
} from './utils/rosterCsvImport.js'
import { groupClassesByYearAndSession } from './utils/classGrouping.js'

const defaults = { year: '2026-27', periodNumber: '1', semester: '1' }

// ── 1. Skipped rows ─────────────────────────────────────────────────────────
{
  const raw = [
    { 'Student ID': '100', 'First Name': 'Ava', 'Last Name': 'Ng', 'Period': '2', 'Semester': 'Term 1' },
    { 'Student ID': '', 'First Name': 'Ben', 'Last Name': 'Ito', 'Period': '2' },
    { 'Student ID': '102', 'First Name': '', 'Last Name': '' },
    { 'Student ID': '', 'First Name': '', 'Last Name': '' },
    { 'Student Number': '103', 'Student Name': 'Diaz, Cam', 'Sec Section': 'CHV2OH-1', 'Period': '2', 'Schedule': 'Term 2' }
  ]
  const { validRows, skippedRows } = parseRosterRows(raw, defaults)
  assert.deepStrictEqual(validRows.map(r => r.studentId), ['100', '103'])
  assert.deepStrictEqual(skippedRows, [
    { studentId: null, name: 'Ben Ito', reason: 'Missing Student ID' },
    { studentId: '102', name: '', reason: 'Missing student name' }
  ], 'Name-only and ID-only rows are reported; fully blank rows are ignored')
  assert.strictEqual(validRows[0].term, 'Term 1')
  assert.strictEqual(validRows[1].term, 'Term 2')
  assert.strictEqual(validRows[1].firstName, 'Cam')
  assert.strictEqual(validRows[1].lastName, 'Diaz')
  assert.strictEqual(validRows[1].courseCode, 'CHV2OH')
  console.log('  ✓ Rows missing a Student ID or name are reported; blank rows ignored')
}

// ── 2. New periods ──────────────────────────────────────────────────────────
{
  const rows = [{ periodNumber: '5' }, { periodNumber: '2' }, { periodNumber: '4' }]
  const { missingPeriods, updatedTimes } = addMissingPeriodTimes(rows, [1, 2], { 1: '08:00', 2: '09:20' })
  assert.deepStrictEqual(missingPeriods, [4, 5], 'Missing periods are sorted')
  assert.strictEqual(updatedTimes[4], nextPeriodStartTime(undefined), 'Period 4 has no period 3 before it, so it starts from 08:00')
  assert.strictEqual(updatedTimes[4], '09:20')
  assert.strictEqual(updatedTimes[5], '10:40', 'Period 5 chains from period 4')
  assert.strictEqual(updatedTimes[2], '09:20', 'Existing times are untouched')

  const groups = groupRosterRows([{ studentId: '1', year: '2026-27', semester: '1', term: null, periodNumber: '5', courseCode: '' }], updatedTimes)
  assert.strictEqual(Object.values(groups)[0].periodStartTime, '10:40', 'New classes in a new period get its default start time')
  console.log('  ✓ New CSV periods get chained 80-minute default start times')
}

// ── 3. Reconciliation ───────────────────────────────────────────────────────
const classList = [
  {
    classId: 'civics', year: '2026-27', semester: '1', periodNumber: 1, term: 'Term 1', courseCode: 'CHV2OH',
    students: {
      A: { firstName: 'Ann', lastName: 'Ash' },
      B: { firstName: 'Bo', lastName: 'Birch' },
      C: { firstName: 'Cy', lastName: 'Cedar', archived: true }
    }
  },
  { classId: 'careers', year: '2026-27', semester: '1', periodNumber: 1, term: 'Term 2', courseCode: 'GLC2OH', students: { Z: { firstName: 'Zed', lastName: 'Zinc' } } }
]
const civicsGroup = {
  name: 'Period 1 (CHV2OH · Term 1) — 2026-27', year: '2026-27', semester: '1', term: 'Term 1', periodNumber: '1', courseCode: 'CHV2OH',
  students: [
    { studentId: 'A', firstName: 'Ann', lastName: 'Ash' },
    { studentId: 'C', firstName: 'Cy', lastName: 'Cedar' },
    { studentId: 'D', firstName: 'Di', lastName: 'Dogwood', gradeLevel: 'Grade 10' }
  ]
}
const newGroup = {
  name: 'Period 3 — 2026-27', year: '2026-27', semester: '1', term: null, periodNumber: '3', courseCode: 'MPM2D',
  students: [{ studentId: 'E', firstName: 'Eve', lastName: 'Elm' }]
}
{
  const { items, anyMissing } = buildReconciliationItems([civicsGroup, newGroup], classList)
  assert.strictEqual(anyMissing, true)
  const [civics, fresh] = items
  assert.strictEqual(civics.existingClass.classId, 'civics', 'Term 1 group matches the Term 1 class, not Term 2')
  assert.deepStrictEqual(civics.adding.map(a => [a.studentId, a.wasArchived]), [['C', true], ['D', false]], 'Archived student is restored as an add')
  assert.deepStrictEqual(civics.updating.map(u => u.studentId), ['A'])
  assert.deepStrictEqual(civics.missing.map(m => [m.studentId, m.selectedForArchive]), [['B', true]], 'Missing students default to archive')
  assert.strictEqual(fresh.isExisting, false)
  assert.strictEqual(fresh.missing.length, 0)
  console.log('  ✓ Reconciliation separates added, kept, restored and missing students per term class')

  // ── 4. Bulk summary ─────────────────────────────────────────────────────
  const skipped = [{ studentId: null, name: 'Ben Ito', reason: 'Missing Student ID' }]
  const archivedSummary = buildBulkImportSummary(items, true, skipped)
  assert.strictEqual(archivedSummary.classesCount, 2)
  assert.strictEqual(archivedSummary.classesCreated, 1)
  assert.strictEqual(archivedSummary.totalAdded, 3)
  assert.strictEqual(archivedSummary.totalUpdated, 1)
  assert.strictEqual(archivedSummary.totalArchived, 1)
  assert.deepStrictEqual(archivedSummary.items[0].archivedNames, ['Bo Birch'])
  assert.deepStrictEqual(archivedSummary.items[0].addedNames, ['Cy Cedar', 'Di Dogwood'])
  assert.strictEqual(archivedSummary.items[1].isNew, true)
  assert.deepStrictEqual(archivedSummary.skippedRows, skipped)

  civics.missing[0].selectedForArchive = false
  assert.strictEqual(buildBulkImportSummary(items, true).totalArchived, 0, 'Unticked students are not reported as archived')
  civics.missing[0].selectedForArchive = true
  assert.strictEqual(buildBulkImportSummary(items, false).totalArchived, 0, 'No archiving when there was no review step')
  console.log('  ✓ Multi-class summary counts new classes, adds, kept, archived and skipped rows')
}

// ── 5. Elementary summary ───────────────────────────────────────────────────
{
  const validRows = [
    { studentId: 'A', firstName: 'Ann', lastName: 'Ash' },
    { studentId: 'B', firstName: 'Bo', lastName: 'Birch' },
    { studentId: 'N', firstName: 'Nia', lastName: 'Nettle' }
  ]
  const existingStudents = { A: { firstName: 'Ann', lastName: 'Ash', archived: false } }
  const conflicts = [{ studentId: 'B', existingClassId: 'hrm-131', student: validRows[1] }]

  const skippedSummary = buildElementaryImportSummary({ homeroomName: 'HRM-130', isNew: false, validRows, existingStudents, conflicts, moved: false })
  assert.strictEqual(skippedSummary.totalAdded, 1)
  assert.strictEqual(skippedSummary.totalUpdated, 1)
  assert.strictEqual(skippedSummary.totalNotImported, 1)
  assert.deepStrictEqual(skippedSummary.items[0].notImportedNames, ['Bo Birch'], 'Skipped conflicts are listed, not silently dropped')
  assert.strictEqual(skippedSummary.classesCreated, 0)

  const movedSummary = buildElementaryImportSummary({ homeroomName: 'HRM-130', isNew: true, validRows, existingStudents: {}, conflicts, moved: true })
  assert.strictEqual(movedSummary.totalAdded, 3, 'Moved students count as added')
  assert.strictEqual(movedSummary.totalNotImported, 0)
  assert.strictEqual(movedSummary.classesCreated, 1)
  console.log('  ✓ Elementary summary reports added, kept, and students left in another class')
}

// ── 6. Class grouping ───────────────────────────────────────────────────────
{
  const classes = [
    { classId: 'a', name: 'Bio', year: '2025-26', semester: '1', periodNumber: 2 },
    { classId: 'b', name: 'Chem', year: '2026-27', semester: '1', periodNumber: 3 },
    { classId: 'c', name: 'Civics', year: '2026-27', semester: '1', periodNumber: 1 },
    { classId: 'd', name: 'Physics', year: '2026-27', semester: '2', periodNumber: 1 }
  ]
  const years = groupClassesByYearAndSession(classes, { selectedYear: '2026-27', selectedSemester: '1', teachingMode: 'secondary' })
  assert.deepStrictEqual(years.map(y => y.year), ['2026-27', '2025-26'], 'Newest year first')
  assert.strictEqual(years[0].isCurrent, true)
  assert.strictEqual(years[0].totalClasses, 3)
  const labels = years[0].sessions.map(s => s.label)
  assert.deepStrictEqual(labels, ['Semester 2', 'Semester 1'])
  const sem1 = years[0].sessions.find(s => s.label === 'Semester 1')
  assert.deepStrictEqual(sem1.classes.map(c => c.name), ['Civics', 'Chem'], 'Classes sorted by period')
  assert.strictEqual(sem1.isCurrent, true)
  assert.strictEqual(years[0].sessions.find(s => s.label === 'Semester 2').isCurrent, false)

  const elem = groupClassesByYearAndSession([{ classId: 'e', name: 'HRM-130', year: '2026-27', classType: 'elementary' }], { selectedYear: '2026-27', selectedSemester: '1', teachingMode: 'elementary' })
  assert.strictEqual(elem[0].sessions[0].label, 'Full Year')
  assert.strictEqual(elem[0].sessions[0].isCurrent, true, 'Elementary homerooms are current for the whole year')
  console.log('  ✓ Manage Classes groups by year then semester, newest first, classes by period')
}

// ── 7. Re-import keeps teacher edits ────────────────────────────────────────
{
  const students = {
    A: {
      firstName: 'Alexandra', lastName: 'Ash', gradeLevel: 'Grade 5', generalNote: 'Prefers front row',
      parentContacts: [{ name: 'Pat Ash', email: 'pat@example.com', phone: '555-0100', phones: [] }],
      rfidTag: 'A1B2', flags: { IEPAcommodations: true }
    },
    B: { firstName: 'Bo', lastName: 'Birch', archived: true, generalNote: 'Moved mid-year' }
  }
  const before = JSON.parse(JSON.stringify(students.A))
  mergeRosterRows(students, [
    { studentId: 'A', firstName: 'Alex', lastName: 'ASH', gradeLevel: '6', parentContacts: [], rfidTag: '' },
    { studentId: 'B', firstName: 'Bo', lastName: 'Birch' },
    { studentId: 'C', firstName: 'Cy', lastName: 'Cedar', gradeLevel: '6', courseCode: 'HRM-130' }
  ])
  assert.deepStrictEqual({ ...students.A, archived: undefined }, { ...before, archived: undefined }, 'Enrolled student keeps edited name, contacts, grade, note, RFID and flags')
  assert.strictEqual(students.A.archived, false)
  assert.strictEqual(students.B.archived, false, 'Archived student is restored')
  assert.strictEqual(students.B.generalNote, 'Moved mid-year', 'Restored student keeps their history')
  assert.strictEqual(students.C.gradeLevel, 'Grade 6', 'New student grade is normalized')
  assert.deepStrictEqual(students.C.flags, { IEPAcommodations: false, ELL: false, medicalAlert: false, behaviorPlan: false })
  assert.strictEqual(students.C.activeStates.isAbsent, false)
  console.log('  ✓ Re-import keeps teacher edits, restores archived students, adds new ones')
}

// ── 8. Conflict scope ───────────────────────────────────────────────────────
{
  const hrm130 = { classId: 'h130', classType: 'elementary', year: '2026-27', students: {} }
  const list = [
    hrm130,
    { classId: 'h131', classType: 'elementary', year: '2026-27', students: { S1: {}, S2: { archived: true } } },
    { classId: 'h120', classType: 'elementary', year: '2025-26', students: { S3: {} } },
    { classId: 'p1', classType: 'secondary', year: '2026-27', students: { S4: {} } },
    { classId: 'p2', classType: 'secondary', year: '2026-27', students: { S4: {} } }
  ]
  assert.strictEqual(findConflictingHomeroom(list, hrm130, 'S1')?.classId, 'h131', 'Active in another homeroom this year')
  assert.strictEqual(findConflictingHomeroom(list, hrm130, 'S2'), null, 'Archived there: not a conflict')
  assert.strictEqual(findConflictingHomeroom(list, hrm130, 'S3'), null, "Last year's homeroom: not a conflict")
  assert.strictEqual(findConflictingHomeroom(list, hrm130, 'S4'), null, 'Secondary classes never conflict with a homeroom')
  assert.strictEqual(findConflictingHomeroom(list, list[3], 'S4'), null, 'Secondary student in two periods is normal')
  console.log('  ✓ Conflicts only between active, same-year elementary homerooms')
}

console.log('\n📊 ALL ROSTER IMPORT SUMMARY TESTS PASSED')
