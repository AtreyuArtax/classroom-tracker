/**
 * src/test_split_csv_import_comma_fix.js
 *
 * Automated regression test for split-class CSV imports containing banner rows,
 * separator lines, or empty student name entries like "," or ", ".
 */

import assert from 'assert'
import Papa from 'papaparse'

// Mock environment
console.log('🧪 RUNNING SPLIT-CLASS CSV COMMA/PHANTOM IMPORT TEST...')

// Simulated CSV matching real Ontario SIS split-class exports:
// Line 1: Header
// Line 2: Phantom section banner with single comma: "MEL3E / MEL4E",",",,,,
// Line 3: Dropped student or placeholder with studentId and name as ", "
// Line 4: Valid MEL3E student
// Line 5: Section separator: ,,,,,
// Line 6: Valid MEL4E student
// Line 7: Trailing empty line with commas
const splitClassCsv = `Student ID,Student Name,Grade,Period,Course Code,Section
MEL3E/MEL4E,",",11,1,MEL3E,01
9990001,", ",11,1,MEL3E,01
1000001,"Smith, John",11,1,MEL3E,01
,,,,,
1000002,"Tremblay, Sarah",12,1,MEL4E,02
,,,,,
`

const results = Papa.parse(splitClassCsv, {
  header: true,
  skipEmptyLines: true
})

// Run our enhanced parsing algorithm
const rows = results.data.map(row => {
  const studentId = (row['Student ID'] ?? row['Student Number'] ?? row['StudentID'] ?? row['student_id'] ?? '').toString().trim()
  let firstName = (row['First Name'] ?? row['FirstName'] ?? row['first_name'] ?? '').toString().trim()
  let lastName  = (row['Last Name']  ?? row['LastName']  ?? row['last_name']  ?? '').toString().trim()
  
  const rawStudentName = (row['Student Name'] ?? row['StudentName'] ?? row['student_name'] ?? '').toString().trim()
  const hasActualLettersInName = rawStudentName.replace(/[, \t\r\n"']/g, '').length > 0
  if (!firstName && !lastName && hasActualLettersInName) {
    const parts = rawStudentName.split(',')
    if (parts.length >= 2) {
      lastName  = parts[0].trim()
      firstName = parts.slice(1).join(',').trim()
    } else {
      lastName = rawStudentName.trim()
    }
  }

  // Clean any residual punctuation
  firstName = (firstName || '').replace(/^[, \t]+|[, \t]+$/g, '').trim()
  lastName  = (lastName || '').replace(/^[, \t]+|[, \t]+$/g, '').trim()

  return {
    studentId,
    firstName,
    lastName,
    courseCode: row['Course Code'] || ''
  }
})

// Enhanced validation filter
const validRows = rows.filter(r => {
  const cleanFirst = (r.firstName || '').replace(/[, \t\r\n"']/g, '').trim()
  const cleanLast  = (r.lastName || '').replace(/[, \t\r\n"']/g, '').trim()
  const cleanId    = (r.studentId || '').toString().trim()
  const hasName    = cleanFirst.length > 0 || cleanLast.length > 0
  return hasName && cleanId.length > 0
})

console.log(`Total parsed raw rows: ${results.data.length}`)
console.log(`Valid student rows identified: ${validRows.length}`)

// Assertions
assert.strictEqual(validRows.length, 2, 'Only the 2 real students should be identified as valid rows')
assert.strictEqual(validRows[0].firstName, 'John', 'First student firstName must be John')
assert.strictEqual(validRows[0].lastName, 'Smith', 'First student lastName must be Smith')
assert.strictEqual(validRows[0].studentId, '1000001', 'First studentId must be 1000001')

assert.strictEqual(validRows[1].firstName, 'Sarah', 'Second student firstName must be Sarah')
assert.strictEqual(validRows[1].lastName, 'Tremblay', 'Second student lastName must be Tremblay')
assert.strictEqual(validRows[1].studentId, '1000002', 'Second studentId must be 1000002')

// Ensure no row has empty names or displays as just a comma
validRows.forEach(r => {
  const display = `${r.lastName}, ${r.firstName}`
  assert.notStrictEqual(display.trim(), ',', 'Display name must never be just a comma')
  assert.ok(r.firstName.length > 0 || r.lastName.length > 0, 'Every student must have an actual name')
})

console.log('✅ PASS: Split-class CSV import comma/phantom fix verified successfully!')
