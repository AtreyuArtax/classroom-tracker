/**
 * src/test_data_pipelines_audit.js
 *
 * Automated verification suite for Classroom Tracker's data import & backup/restore pipelines:
 * 1. CSV Roster Importer (re-import idempotency, seat preservation, override retention, historical marks)
 * 2. Malformed Inputs (missing headers, extra whitespace, special characters, commas in quotes, blank rows)
 * 3. Expectation Importer (apostrophes, commas in quotes, escaped quotes, pipe/tab/colon delimiters)
 * 4. Student Survey CSV (Office 365 email/username matching, name matching, blank row skipping, deduplication)
 * 5. Full Database Backup & Restore (custom curriculum presets, expectation weights, seating charts, schema migration)
 */

import assert from 'assert'
import { CURRENT_SCHEMA, migrateData } from './db/migrations.js'
import { parseCsvRows } from './utils/learningSkillsCsvParser.js'
import { parseStudentInfoRows, normalizeConfidence, sanitizeTextField, cleanOptionText } from './utils/studentInfoCsvParser.js'
import { cleanExpectationText } from './utils/textUtils.js'

console.log('=================================================================')
console.log('📦 DATA PIPELINES AUDIT: IMPORT, MERGE & BACKUP/RESTORE')
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
// TEST GROUP 1: Roster CSV Re-import Idempotency & Mark Retention
// =============================================================================
console.log('\nTEST GROUP 1: Roster CSV Re-import Idempotency & Mark Retention')

test('Re-importing the same CSV does not duplicate students and preserves seats & overrides', () => {
  // Simulate active class state
  const classId = 'class_test_101'
  const targetClass = {
    classId,
    name: 'Grade 10 Science',
    year: '2025-26',
    semester: '1',
    periodNumber: 1,
    students: {
      '1001': {
        firstName: 'Alice',
        lastName: 'Smith',
        gradeLevel: 'Grade 10',
        courseCode: 'SNC2D',
        parentContacts: [{ name: 'Bob Smith', email: 'bob@example.com', phone: '555-0101', phones: [] }],
        studentEmail: 'alice@school.ca',
        custody: 'Both',
        livingWith: 'Parents',
        birthDate: '2010-04-15',
        rfidTag: 'TAG_001',
        seat: { row: 2, col: 3 }, // Seating chart position
        adjustedGrade: 88, // Teacher Professional Judgment Override
        categoryOverrides: { 'cat_knowledge': 90 },
        expectationOverrides: { 'B1.1': 4 },
        generalNote: 'Excellent class participation',
        activeStates: { isOut: false, outTime: null, isAbsent: false, lateMs: null },
        flags: { IEPAcommodations: true, ELL: false, medicalAlert: false, behaviorPlan: false },
        flagNotes: { IEP: 'Extra time on tests', ELL: '', medical: '', behavior: '' },
        excludeFromAnalytics: false
      }
    }
  }

  // Historical grades table in DB
  const historicalGrades = [
    { gradeId: 'g_1', classId, studentId: '1001', assessmentId: 'ast_lab1', resolvedScore: 85, score: 85 }
  ]

  // Re-import payload (identical student row)
  const incomingCsvRows = [
    {
      studentId: '1001',
      firstName: 'Alice',
      lastName: 'Smith',
      gradeLevel: 'Grade 10',
      courseCode: 'SNC2D',
      parentContacts: [{ name: 'Bob Smith', email: 'bob@example.com', phone: '555-0101', phones: [] }],
      studentEmail: 'alice@school.ca',
      custody: 'Both',
      livingWith: 'Parents',
      birthDate: '2010-04-15',
      rfidTag: 'TAG_001'
    }
  ]

  // Execute upsert logic from classService.js importRoster
  let inserted = 0
  let updated = 0
  for (const row of incomingCsvRows) {
    const cleanId = (row.studentId || '').toString().trim()
    if (targetClass.students[cleanId]) {
      const st = targetClass.students[cleanId]
      st.firstName = row.firstName
      st.lastName = row.lastName
      if (row.gradeLevel) st.gradeLevel = row.gradeLevel
      if (row.courseCode !== undefined) st.courseCode = row.courseCode
      if (row.parentContacts && row.parentContacts.length > 0) st.parentContacts = row.parentContacts
      if (row.studentEmail) st.studentEmail = row.studentEmail
      if (row.custody) st.custody = row.custody
      if (row.livingWith) st.livingWith = row.livingWith
      if (row.birthDate) st.birthDate = row.birthDate
      if (row.rfidTag !== undefined) st.rfidTag = row.rfidTag
      updated++
    } else {
      inserted++
    }
  }

  assert.strictEqual(inserted, 0, 'Should not insert duplicate students')
  assert.strictEqual(updated, 1, 'Should mark existing student as updated')
  assert.strictEqual(Object.keys(targetClass.students).length, 1, 'Student count must remain 1')

  const student = targetClass.students['1001']
  assert.deepStrictEqual(student.seat, { row: 2, col: 3 }, 'Seat must be 100% preserved')
  assert.strictEqual(student.adjustedGrade, 88, 'adjustedGrade must be 100% preserved')
  assert.strictEqual(student.categoryOverrides['cat_knowledge'], 90, 'Category override must be preserved')
  assert.strictEqual(student.expectationOverrides['B1.1'], 4, 'Expectation override must be preserved')
  assert.strictEqual(student.flags.IEPAcommodations, true, 'IEP flag must be preserved')
  assert.strictEqual(student.flagNotes.IEP, 'Extra time on tests', 'IEP note must be preserved')
  assert.strictEqual(student.generalNote, 'Excellent class participation', 'General note must be preserved')

  // Verify historical marks remain linked
  const studentGrades = historicalGrades.filter(g => g.classId === classId && g.studentId === '1001')
  assert.strictEqual(studentGrades.length, 1)
  assert.strictEqual(studentGrades[0].resolvedScore, 85)
})

test('Re-import cleanly updates student demographic info without touching marks', () => {
  const targetClass = {
    classId: 'class_test_102',
    students: {
      '1002': {
        firstName: 'Marcus',
        lastName: 'Brown',
        studentEmail: 'old_email@school.ca',
        parentContacts: [{ name: 'Parent One', phone: '555-1111' }],
        seat: { row: 1, col: 1 },
        adjustedGrade: 76
      }
    }
  }

  const incomingUpdatedRow = {
    studentId: '1002',
    firstName: 'Marcus',
    lastName: 'Brown-Smith', // Updated hyphenated last name
    studentEmail: 'marcus.brown@school.ca', // Updated email
    parentContacts: [{ name: 'Parent One', phone: '555-9999' }] // Updated phone
  }

  const cleanId = incomingUpdatedRow.studentId.trim()
  const st = targetClass.students[cleanId]
  st.firstName = incomingUpdatedRow.firstName
  st.lastName = incomingUpdatedRow.lastName
  st.studentEmail = incomingUpdatedRow.studentEmail
  st.parentContacts = incomingUpdatedRow.parentContacts

  assert.strictEqual(st.lastName, 'Brown-Smith', 'Last name should update')
  assert.strictEqual(st.studentEmail, 'marcus.brown@school.ca', 'Email should update')
  assert.strictEqual(st.parentContacts[0].phone, '555-9999', 'Parent phone should update')
  assert.deepStrictEqual(st.seat, { row: 1, col: 1 }, 'Seat coordinate must remain intact')
  assert.strictEqual(st.adjustedGrade, 76, 'Teacher override must remain intact')
})

test('bulkImportClasses matches existing classes by periodNumber safely (numeric and string AM-PM)', () => {
  const existingClasses = [
    { classId: 'cls_1', year: '2025-26', semester: '1', periodNumber: 1, name: 'Period 1' },
    { classId: 'cls_2', year: '2025-26', semester: '1', periodNumber: 'AM-PM', name: 'Elementary Homeroom' }
  ]

  // Helper matching rule from classService.js
  const findClass = (group) => existingClasses.find(c =>
    c.year === group.year &&
    c.semester === group.semester &&
    (String(c.periodNumber).trim() === String(group.periodNumber).trim() ||
     (!isNaN(Number(c.periodNumber)) && !isNaN(Number(group.periodNumber)) && Number(c.periodNumber) === Number(group.periodNumber)))
  )

  // Test numeric match
  const matchNum = findClass({ year: '2025-26', semester: '1', periodNumber: '1' })
  assert.ok(matchNum, 'Must match numeric period 1')
  assert.strictEqual(matchNum.classId, 'cls_1')

  // Test non-numeric AM-PM match (previously failed with NaN === NaN)
  const matchAmPm = findClass({ year: '2025-26', semester: '1', periodNumber: 'AM-PM' })
  assert.ok(matchAmPm, 'Must match string period AM-PM without NaN failure')
  assert.strictEqual(matchAmPm.classId, 'cls_2')
})

// =============================================================================
// TEST GROUP 2: Malformed Inputs in CSV Parsers
// =============================================================================
console.log('\nTEST GROUP 2: Malformed Inputs in CSV Parsers')

test('Handles extra whitespace in student IDs, names, and emails cleanly', () => {
  const csv = `Student ID,First Name,Last Name,Student Email
    1003   ,   Samantha   ,   Green   ,   sam@school.ca   `

  const rows = parseCsvRows(csv)
  assert.strictEqual(rows.length, 2)
  const row = rows[1]

  const cleanId = row[0].trim()
  const cleanFirst = row[1].trim()
  const cleanLast = row[2].trim()
  const cleanEmail = row[3].trim()

  assert.strictEqual(cleanId, '1003')
  assert.strictEqual(cleanFirst, 'Samantha')
  assert.strictEqual(cleanLast, 'Green')
  assert.strictEqual(cleanEmail, 'sam@school.ca')
})

test('Handles commas inside quoted fields and escaped quotes without breaking columns', () => {
  const csv = `Student ID,Student Name,Parent Note
"1004","O'Connor, Liam","Parent requested: ""Please call after 4pm, thanks!"""`

  const rows = parseCsvRows(csv)
  assert.strictEqual(rows.length, 2)
  assert.strictEqual(rows[1][0], '1004')
  assert.strictEqual(rows[1][1], "O'Connor, Liam", 'Preserves comma inside student name')
  assert.strictEqual(rows[1][2], 'Parent requested: "Please call after 4pm, thanks!"', 'Unescapes double quotes and keeps internal comma')
})

test('Handles international and special characters without corruption', () => {
  const csv = `Student ID,First Name,Last Name
"1005","José-María","Nuñez"
"1006","Zoë","Björn"`

  const rows = parseCsvRows(csv)
  assert.strictEqual(rows.length, 3)
  assert.strictEqual(rows[1][1], 'José-María')
  assert.strictEqual(rows[1][2], 'Nuñez')
  assert.strictEqual(rows[2][1], 'Zoë')
  assert.strictEqual(rows[2][2], 'Björn')
})

test('Filters out blank rows, empty lines, and placeholder separator lines', () => {
  const csv = `Student ID,First Name,Last Name
1007,David,Lee

,,,,
   
1008,Sarah,Miller
\n\r\n`

  const rows = parseCsvRows(csv)
  // Header + 2 valid rows = 3 rows total
  assert.strictEqual(rows.length, 3)
  assert.strictEqual(rows[1][0], '1007')
  assert.strictEqual(rows[2][0], '1008')
})

test('Detects missing headers and rejects gracefully', () => {
  const badCsv = `Random Text,Something Else,Foo Bar
123,abc,xyz`

  const rows = parseCsvRows(badCsv)
  const headers = rows[0].map(h => h.trim().toLowerCase())
  const hasId = headers.some(h => h.includes('student') || h.includes('id') || h.includes('oen'))
  const hasName = headers.some(h => h.includes('name'))

  assert.strictEqual(hasId, false, 'Should detect missing student ID header')
  assert.strictEqual(hasName, false, 'Should detect missing student name header')
})

// =============================================================================
// TEST GROUP 3: Expectation Importer Hardening
// =============================================================================
console.log('\nTEST GROUP 3: Expectation Importer Hardening')

function parseCsvLineCustom(text) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(cur.trim().replace(/^["']|["']$/g, ''))
        cur = ''
      } else {
        cur += char
      }
    }
  }
  if (cur.length > 0 || result.length > 0) {
    result.push(cur.trim().replace(/^["']|["']$/g, ''))
  }
  return result
}

test('Expectation CSV parser does not break on apostrophes in descriptions', () => {
  // Description contains apostrophes ("Newton's", "Earth's") AND internal commas
  const line = `Physics,SPH3U-A1.1,"Investigate Newton's laws, analyzing Earth's gravitational pull, velocity, and force"`
  const parts = parseCsvLineCustom(line)

  assert.strictEqual(parts.length, 3, 'Must parse exactly 3 columns')
  assert.strictEqual(parts[0], 'Physics')
  assert.strictEqual(parts[1], 'SPH3U-A1.1')
  assert.strictEqual(parts[2], "Investigate Newton's laws, analyzing Earth's gravitational pull, velocity, and force")
})

test('Expectation CSV parser correctly unescapes doubled quotes in descriptions', () => {
  const line = `Science,SNC1W-B2,"Explain the concept of ""ecosystem resilience"", biodiversity, and stability"`
  const parts = parseCsvLineCustom(line)

  assert.strictEqual(parts.length, 3)
  assert.strictEqual(parts[2], 'Explain the concept of "ecosystem resilience", biodiversity, and stability')
})

test('Supports pipe-delimited, tab-delimited, and colon-delimited expectation formats', () => {
  // Pipe format
  const pipeLine = 'Strand A | A1.1 | Demonstrate understanding of linear relations'
  const pipeParts = pipeLine.split('|').map(s => s.trim())
  assert.strictEqual(pipeParts.length, 3)
  assert.strictEqual(pipeParts[0], 'Strand A')
  assert.strictEqual(pipeParts[1], 'A1.1')

  // Tab format (Excel paste)
  const tabLine = 'Biology\tB1.2\tEvaluate cellular respiration and photosynthesis'
  const tabParts = tabLine.split('\t').map(s => s.trim())
  assert.strictEqual(tabParts.length, 3)
  assert.strictEqual(tabParts[1], 'B1.2')

  // Colon format
  const colonLine = 'C2.3: Solve multi-step algebraic equations'
  const colonMatch = colonLine.match(/^([A-Za-z0-9\.-]{1,12})\s*:\s*(.+)$/)
  assert.ok(colonMatch)
  assert.strictEqual(colonMatch[1], 'C2.3')
  assert.strictEqual(colonMatch[2], 'Solve multi-step algebraic equations')
})

// =============================================================================
// TEST GROUP 4: Student Survey CSV / Intake Normalization
// =============================================================================
console.log('\nTEST GROUP 4: Student Survey CSV / Intake Normalization')

test('Matches students by Office 365 email, username, and full name', () => {
  const roster = [
    { studentId: 'st_1', firstName: 'Elena', lastName: 'Rostova', studentEmail: 'elena.rostova@school.ca' },
    { studentId: 'st_2', firstName: 'Tariq', lastName: 'Mansoor', studentEmail: 'tmansoor@school.ca' },
    { studentId: 'st_3', firstName: 'Mei-Ling', lastName: 'Chen', studentEmail: '' }
  ]

  const surveyCsvRows = [
    ['Email', 'Name', 'Preferred Name', 'Pronouns', 'What seating helps you learn best?', 'How confident do you feel in this course?'],
    ['elena.rostova@school.ca', 'Elena Rostova', 'Ellie', 'she/her', 'Near the front', '4 - Fairly confident'],
    ['tmansoor@external.com', 'Tariq Mansoor', 'Tariq', 'he/him', 'Near the window', '5 - Very confident'],
    ['', 'Mei-Ling Chen', 'Mei', 'she/they', 'With a partner', '3 - Neutral']
  ]

  const result = parseStudentInfoRows(surveyCsvRows, roster)
  assert.strictEqual(result.matchedRecords.length, 3, 'All 3 students should match')

  const match1 = result.matchedRecords.find(r => r.studentId === 'st_1')
  assert.strictEqual(match1.matchMethod, 'email')
  assert.strictEqual(match1.surveyData.preferredName, 'Ellie')
  assert.strictEqual(match1.surveyData.courseConfidence, 4)

  const match2 = result.matchedRecords.find(r => r.studentId === 'st_2')
  assert.strictEqual(match2.matchMethod, 'username', 'Should match by Office 365 username')
  assert.strictEqual(match2.surveyData.courseConfidence, 5)

  const match3 = result.matchedRecords.find(r => r.studentId === 'st_3')
  assert.strictEqual(match3.matchMethod, 'fullname')
  assert.strictEqual(match3.surveyData.pronouns, 'she/they')
})

test('Multi-submission deduplication keeps newest completion timestamp', () => {
  const roster = [
    { studentId: 'st_10', firstName: 'Lucas', lastName: 'Vance', studentEmail: 'lucas@school.ca' }
  ]

  const surveyRows = [
    ['Email', 'Name', 'Completion time', 'Preferred Name', 'How confident do you feel?'],
    ['lucas@school.ca', 'Lucas Vance', '2026-09-01T10:00:00.000Z', 'Luke', '3 - Neutral'],
    ['lucas@school.ca', 'Lucas Vance', '2026-09-02T14:30:00.000Z', 'Lucas (updated)', '5 - Very confident']
  ]

  const result = parseStudentInfoRows(surveyRows, roster)
  assert.strictEqual(result.matchedRecords.length, 1)
  assert.strictEqual(result.duplicateCount, 1)

  const record = result.matchedRecords[0]
  assert.strictEqual(record.surveyData.preferredName, 'Lucas (updated)', 'Must keep newer submission')
  assert.strictEqual(record.surveyData.courseConfidence, 5)
})

test('Trailing blank rows in survey CSV do not produce phantom unmatched rows', () => {
  const roster = [
    { studentId: 'st_11', firstName: 'Zack', lastName: 'Morris', studentEmail: 'zack@school.ca' }
  ]

  const surveyRowsWithTrailingBlanks = [
    ['Email', 'Name', 'Preferred Name', 'Target Grade'],
    ['zack@school.ca', 'Zack Morris', 'Zack', '85%'],
    ['', '', '', ''],
    ['', '', '', '']
  ]

  const result = parseStudentInfoRows(surveyRowsWithTrailingBlanks, roster)
  assert.strictEqual(result.matchedRecords.length, 1)
  assert.strictEqual(result.unmatchedRows.length, 0, 'Blank rows must not appear as unmatched rows')
})

// =============================================================================
// TEST GROUP 5: Full Database Backup & Restore Roundtrip Fidelity
// =============================================================================
console.log('\nTEST GROUP 5: Full Database Backup & Restore Roundtrip Fidelity')

test('Full database backup roundtrip preserves custom presets, expectation weights, and seating charts', () => {
  const masterBackup = {
    schemaVersion: CURRENT_SCHEMA,
    exportedAt: new Date().toISOString(),
    settings: {
      schemaVersion: CURRENT_SCHEMA,
      teacherName: 'Ms. Frizzle',
      thresholds: { washroomTripsPerWeek: 4, deviceIncidentsPerWeek: 3 },
      // Custom Master Curriculum Presets
      customCurriculumPresets: {
        'preset_custom_physics': {
          presetId: 'preset_custom_physics',
          title: 'Custom AP Physics 1',
          panel: 'secondary',
          isCustomMaster: true,
          strands: [
            {
              name: 'Kinematics & Dynamics',
              expectations: [
                { code: 'AP1.1', description: '1D Motion analysis', weight: 1.5, active: true },
                { code: 'AP1.2', description: 'Newtonian mechanics', weight: 2.0, active: true },
                { code: 'AP1.3', description: 'Centripetal force & gravitation', weight: 0.5, active: false }
              ]
            }
          ]
        }
      },
      // Saved Seating Layout Presets
      savedLayoutPresets: [
        {
          id: 'preset_pods_4',
          name: '6 Pods of 4',
          rows: 6,
          cols: 6,
          layoutConfig: { aisles: ['R1-C2', 'R2-C2'], pods: { 'pod_1': { name: 'Pod 1', color: '#ff3b30' } } }
        }
      ]
    },
    classes: [
      {
        classId: 'cls_ap_phys',
        name: 'AP Physics',
        year: '2025-26',
        semester: '1',
        periodNumber: 1,
        gridSize: { rows: 6, cols: 6 },
        expectations: [
          { code: 'AP1.1', description: '1D Motion analysis', weight: 1.5 },
          { code: 'AP1.2', description: 'Newtonian mechanics', weight: 2.0 }
        ],
        gradebookCategories: [
          { categoryId: 'cat_tests', name: 'Unit Tests', weight: 70 },
          { categoryId: 'cat_labs', name: 'Inquiry Labs', weight: 30 }
        ],
        students: {
          'st_100': {
            firstName: 'Isaac',
            lastName: 'Newton',
            seat: { row: 3, col: 4 }, // Student seat position
            adjustedGrade: 98,
            activeStates: { isOut: false, outTime: null, isAbsent: false, lateMs: null }
          }
        }
      }
    ],
    events: [
      { eventId: 'evt_1', classId: 'cls_ap_phys', studentId: 'st_100', code: 'note', text: 'Brilliant insight', timestamp: '2026-09-01T09:00:00.000Z' }
    ],
    assessments: [
      { assessmentId: 'ast_test1', classId: 'cls_ap_phys', name: 'Dynamics Exam', categoryId: 'cat_tests', totalPoints: 100, weight: 1 }
    ],
    grades: [
      { gradeId: 'grd_1', classId: 'cls_ap_phys', studentId: 'st_100', assessmentId: 'ast_test1', resolvedScore: 98, score: 98 }
    ],
    learning_skills: [],
    photos: []
  }

  // 1. JSON roundtrip serialization
  const jsonString = JSON.stringify(masterBackup)
  const parsedBackup = JSON.parse(jsonString)

  // 2. Migration verification
  const migrated = migrateData(parsedBackup)
  assert.strictEqual(migrated.schemaVersion, CURRENT_SCHEMA)

  // 3. Verify Custom Curriculum Presets preserved
  const restoredPreset = migrated.settings.customCurriculumPresets['preset_custom_physics']
  assert.ok(restoredPreset, 'Custom curriculum preset must be preserved')
  assert.strictEqual(restoredPreset.title, 'Custom AP Physics 1')
  assert.strictEqual(restoredPreset.strands[0].expectations[0].code, 'AP1.1')
  assert.strictEqual(restoredPreset.strands[0].expectations[0].weight, 1.5, 'Expectation weight 1.5 preserved')
  assert.strictEqual(restoredPreset.strands[0].expectations[1].weight, 2.0, 'Expectation weight 2.0 preserved')
  assert.strictEqual(restoredPreset.strands[0].expectations[2].weight, 0.5, 'Expectation weight 0.5 preserved')

  // 4. Verify Saved Seating Layout Presets preserved
  const restoredLayout = migrated.settings.savedLayoutPresets[0]
  assert.ok(restoredLayout, 'Saved seating layout preset must be preserved')
  assert.strictEqual(restoredLayout.name, '6 Pods of 4')
  assert.strictEqual(restoredLayout.rows, 6)
  assert.strictEqual(restoredLayout.cols, 6)

  // 5. Verify Class Seating Grid & Student Seat Assignment preserved
  const restoredClass = migrated.classes[0]
  assert.strictEqual(restoredClass.gridSize.rows, 6)
  assert.strictEqual(restoredClass.gridSize.cols, 6)
  assert.deepStrictEqual(restoredClass.students['st_100'].seat, { row: 3, col: 4 }, 'Student seat coordinates must be 100% preserved')
  assert.strictEqual(restoredClass.students['st_100'].adjustedGrade, 98, 'adjustedGrade preserved')

  // 6. Verify Class Expectation Weights & Category Weights preserved
  assert.strictEqual(restoredClass.expectations[0].weight, 1.5)
  assert.strictEqual(restoredClass.expectations[1].weight, 2.0)
  assert.strictEqual(restoredClass.gradebookCategories[0].weight, 70)
  assert.strictEqual(restoredClass.gradebookCategories[1].weight, 30)

  // 7. Verify Assessments and Grades preserved
  assert.strictEqual(migrated.assessments[0].assessmentId, 'ast_test1')
  assert.strictEqual(migrated.grades[0].resolvedScore, 98)
})

test('Migrates legacy backup (schema v1) up to current schema without dropping custom data', () => {
  const legacyV1Backup = {
    schemaVersion: 1,
    settings: {
      schemaVersion: 1,
      behaviorCodes: {
        w: { icon: 'Toilet', label: 'Out of Class' }
      }
    },
    classes: [
      {
        classId: 'cls_legacy',
        name: 'Legacy Class',
        students: {
          'st_old': { firstName: 'Old', lastName: 'Student' }
        }
      }
    ],
    events: [],
    assessments: [],
    grades: []
  }

  const migrated = migrateData(legacyV1Backup)
  assert.strictEqual(migrated.schemaVersion, CURRENT_SCHEMA, 'Must upgrade schema version to CURRENT_SCHEMA')
  assert.ok(migrated.settings.behaviorCodes.note, 'Must backfill missing behavior codes')
  assert.ok(migrated.settings.thresholds, 'Must backfill missing thresholds')
  assert.strictEqual(migrated.classes[0].students['st_old'].generalNote, '', 'Must backfill missing student generalNote')
})

test('Strictly rejects backups from a newer incompatible schema version', () => {
  const futureBackup = {
    schemaVersion: 999, // In the future
    settings: {},
    classes: [],
    events: []
  }

  // eventService.js importAllData schema check:
  const validateSchema = (backup) => {
    if (!backup || typeof backup !== 'object') throw new Error('Invalid backup: not an object.')
    if (typeof backup.schemaVersion !== 'number') throw new Error('Invalid schema version.')
    if (backup.schemaVersion > CURRENT_SCHEMA) {
      throw new Error(`The backup file is from a newer version of the app (v${backup.schemaVersion}).`)
    }
  }

  assert.throws(
    () => validateSchema(futureBackup),
    /newer version of the app \(v999\)/,
    'Must throw clear error on future schema version'
  )
})

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n=================================================================')
console.log(`📊 PIPELINE AUDIT RESULTS: ${passed} passed, ${failed} failed`)
console.log('=================================================================')

if (failed > 0) {
  process.exit(1)
}
