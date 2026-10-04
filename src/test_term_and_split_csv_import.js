/**
 * src/test_term_and_split_csv_import.js
 *
 * Automated regression test verifying:
 * 1. Half-semester term courses (Term 1 Civics, Term 2 Careers) are created as separate classes.
 * 2. Term 1 & 2 map to Semester 1; Term 3 & 4 map to Semester 2.
 * 3. Genuine whole-semester split classes (e.g. SPH3U/SPH4U) continue to be recognized and combined.
 * 4. Existing class matching avoids cross-term collisions while safely updating on re-import.
 * 5. Full end-to-end parse of real 'Student ParentGuardian Contact List civics.csv'.
 */

import assert from 'assert'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import {
  normalizeSemester,
  extractTerm,
  parseRosterRows,
  groupRosterRows,
  classMatchesGroup
} from './utils/rosterCsvImport.js'

console.log('=================================================================')
console.log('🧪 RUNNING TERM & SPLIT-CLASS ROSTER IMPORT REGRESSION TEST')
console.log('=================================================================\n')

// ── Test 1: normalizeSemester & extractTerm Unit Logic ───────────────
console.log('TEST GROUP 1: Semester Normalization & Term Extraction')

assert.strictEqual(normalizeSemester('Semester 1'), '1', 'Semester 1 maps to 1')
assert.strictEqual(normalizeSemester('Semester 2'), '2', 'Semester 2 maps to 2')
assert.strictEqual(normalizeSemester('Sem 1'), '1', 'Sem 1 maps to 1')
assert.strictEqual(normalizeSemester('Sem 2'), '2', 'Sem 2 maps to 2')
assert.strictEqual(normalizeSemester('S1'), '1', 'S1 maps to 1')
assert.strictEqual(normalizeSemester('S2'), '2', 'S2 maps to 2')
assert.strictEqual(normalizeSemester('Term 1'), '1', 'Term 1 maps to Semester 1')
assert.strictEqual(normalizeSemester('Term 2'), '1', 'Term 2 maps to Semester 1')
assert.strictEqual(normalizeSemester('Term 3'), '2', 'Term 3 maps to Semester 2')
assert.strictEqual(normalizeSemester('Term 4'), '2', 'Term 4 maps to Semester 2')
assert.strictEqual(normalizeSemester('T1'), '1', 'T1 maps to Semester 1')
assert.strictEqual(normalizeSemester('T4'), '2', 'T4 maps to Semester 2')

assert.strictEqual(extractTerm('Term 1'), 'Term 1')
assert.strictEqual(extractTerm('Term 2'), 'Term 2')
assert.strictEqual(extractTerm('Term 3'), 'Term 3')
assert.strictEqual(extractTerm('Term 4'), 'Term 4')
assert.strictEqual(extractTerm('T1'), 'Term 1')
assert.strictEqual(extractTerm('T2'), 'Term 2')
assert.strictEqual(extractTerm('Semester 1'), null, 'Full semester has null term')
assert.strictEqual(extractTerm('Semester 2'), null, 'Full semester has null term')
assert.strictEqual(extractTerm('2025-2026'), null, 'Year string has null term')
assert.strictEqual(extractTerm(''), null)

console.log('  ✓ normalizeSemester accurately routes Terms 1-4 and Semesters 1-2')
console.log('  ✓ extractTerm extracts Term 1-4 and ignores full-semester schedule values\n')

// ── Test 2: Real Civics & Careers CSV Full Parse ─────────────────────
console.log('TEST GROUP 2: Full Parse of Real Board Civics & Careers CSV')

const csvPath = path.resolve(process.cwd(), 'Student ParentGuardian Contact List civics.csv')
const csvContent = fs.readFileSync(csvPath, 'utf8')

const parsedCsv = Papa.parse(csvContent, { header: true, skipEmptyLines: true })
const { validRows } = parseRosterRows(parsedCsv.data, { year: '2026-27', periodNumber: '1', semester: '1' })
assert.strictEqual(validRows.length, 187, '187 valid students should be identified')

const groups = groupRosterRows(validRows)
const groupKeys = Object.keys(groups)
assert.strictEqual(groupKeys.length, 8, 'Exactly 8 distinct classes must be created')

// Verify Period 1 Term 1 Civics & Period 1 Term 2 Careers
const p1t1 = groups['2026-27-1-P1-Term 1']
const p1t2 = groups['2026-27-1-P1-Term 2']
assert.ok(p1t1, 'Period 1 Term 1 class exists')
assert.ok(p1t2, 'Period 1 Term 2 class exists')
assert.strictEqual(p1t1.students.length, 25, 'Period 1 Term 1 Civics has 25 students')
assert.strictEqual(p1t2.students.length, 25, 'Period 1 Term 2 Careers has 25 students')
assert.strictEqual(p1t1.courseCode, 'CHV2OH', 'Period 1 Term 1 course code is CHV2OH')
assert.strictEqual(p1t2.courseCode, 'GLC2OH', 'Period 1 Term 2 course code is GLC2OH')
assert.ok(!p1t1.isSplitClass, 'Period 1 Term 1 is NOT flagged as a split class')
assert.ok(!p1t2.isSplitClass, 'Period 1 Term 2 is NOT flagged as a split class')
assert.strictEqual(p1t1.semester, '1', 'Period 1 Term 1 belongs to Semester 1')
assert.strictEqual(p1t2.semester, '1', 'Period 1 Term 2 belongs to Semester 1')

// Verify Period 2 Term 1 Civics & Period 2 Term 2 Careers
const p2t1 = groups['2026-27-1-P2-Term 1']
const p2t2 = groups['2026-27-1-P2-Term 2']
assert.ok(p2t1, 'Period 2 Term 1 class exists')
assert.ok(p2t2, 'Period 2 Term 2 class exists')
assert.strictEqual(p2t1.students.length, 26, 'Period 2 Term 1 Civics has 26 students')
assert.strictEqual(p2t2.students.length, 26, 'Period 2 Term 2 Careers has 26 students')
assert.ok(!p2t1.isSplitClass)
assert.ok(!p2t2.isSplitClass)

// Verify Period 4 Semester 1 History (CHC2P1)
const p4s1 = groups['2026-27-1-P4']
assert.ok(p4s1, 'Period 4 Semester 1 class exists')
assert.strictEqual(p4s1.students.length, 23)
assert.strictEqual(p4s1.term, null, 'Full semester course has term null')
assert.strictEqual(p4s1.courseCode, 'CHC2P1')

// Verify Semester 2 classes
const p1s2 = groups['2026-27-2-P1']
const p2s2 = groups['2026-27-2-P2']
const p4s2 = groups['2026-27-2-P4']
assert.ok(p1s2 && p2s2 && p4s2, 'All Semester 2 classes exist')
assert.strictEqual(p1s2.semester, '2')
assert.strictEqual(p2s2.semester, '2')
assert.strictEqual(p4s2.semester, '2')

console.log('  ✓ 8 distinct classes generated from the Civics & Careers CSV')
console.log('  ✓ Period 1 Civics & Careers are separate classes with 25 students each (not merged)')
console.log('  ✓ Period 2 Civics & Careers are separate classes with 26 students each (not merged)')
console.log('  ✓ Semester 1 contains all 5 classes and Semester 2 contains 3 classes\n')

// ── Test 3: Genuine Whole-Semester Split Class Preservation ──────────
console.log('TEST GROUP 3: Genuine Whole-Semester Split Class Preservation')

const splitClassRows = [
  { studentId: 'S1', firstName: 'Alice', lastName: 'A', semester: '1', term: null, periodNumber: '3', year: '2026-27', courseCode: 'SPH3U', _rawCourseCode: 'SPH3U' },
  { studentId: 'S2', firstName: 'Bob',   lastName: 'B', semester: '1', term: null, periodNumber: '3', year: '2026-27', courseCode: 'SPH3U', _rawCourseCode: 'SPH3U' },
  { studentId: 'S3', firstName: 'Carol', lastName: 'C', semester: '1', term: null, periodNumber: '3', year: '2026-27', courseCode: 'SPH4U', _rawCourseCode: 'SPH4U' },
  { studentId: 'S4', firstName: 'Dave',  lastName: 'D', semester: '1', term: null, periodNumber: '3', year: '2026-27', courseCode: 'SPH4U', _rawCourseCode: 'SPH4U' }
]

const splitGroups = groupRosterRows(splitClassRows)

const splitGroup = splitGroups['2026-27-1-P3']
assert.ok(splitGroup, 'Split group created')
assert.strictEqual(splitGroup.isSplitClass, true, 'Properly detected as split class')
assert.strictEqual(splitGroup.courseCode, 'SPH3U/SPH4U')
assert.strictEqual(splitGroup.students.length, 4)
assert.strictEqual(splitGroup.name, 'Period 3 (SPH3U/SPH4U) — 2026-27')

console.log('  ✓ Genuine whole-semester split class correctly combines SPH3U/SPH4U\n')

// ── Test 4: Existing Class Matching & Idempotency ───────────────────
console.log('TEST GROUP 4: Existing Class Matching & Re-Import Idempotency')

const mockExistingClasses = [
  { classId: 'cls_1', year: '2026-27', semester: '1', periodNumber: 1, term: 'Term 1', courseCode: 'CHV2OH' },
  { classId: 'cls_2', year: '2026-27', semester: '1', periodNumber: 1, term: 'Term 2', courseCode: 'GLC2OH' },
  { classId: 'cls_3', year: '2026-27', semester: '1', periodNumber: 4, term: null, courseCode: 'CHC2P1' }
]

// Re-importing Term 1 Civics
const matchT1 = mockExistingClasses.find(c => classMatchesGroup(c, p1t1))
assert.strictEqual(matchT1?.classId, 'cls_1', 'Incoming Term 1 Civics matches cls_1 (Term 1 Civics)')

// Re-importing Term 2 Careers
const matchT2 = mockExistingClasses.find(c => classMatchesGroup(c, p1t2))
assert.strictEqual(matchT2?.classId, 'cls_2', 'Incoming Term 2 Careers matches cls_2 (Term 2 Careers)')

// Re-importing Period 4 History
const matchP4 = mockExistingClasses.find(c => classMatchesGroup(c, p4s1))
assert.strictEqual(matchP4?.classId, 'cls_3', 'Incoming Period 4 History matches cls_3')

// Incoming new Term 1 course in Period 2 does not match Period 1 Term 1
const matchP2T1 = mockExistingClasses.find(c => classMatchesGroup(c, p2t1))
assert.strictEqual(matchP2T1, undefined, 'Period 2 Term 1 is identified as a new class')

console.log('  ✓ Re-importing matches existing classes precisely by period AND term')
console.log('  ✓ Term 1 Civics and Term 2 Careers in the same period do not collide or cross-match\n')

console.log('=================================================================')
console.log('📊 ALL TERM & SPLIT-CLASS IMPORT TESTS PASSED (100% SUCCESS)')
console.log('=================================================================')
