/**
 * Automated Verification Suite for Discrete Academic Milestone Windows
 * Tests both Secondary cumulative milestones and Elementary discrete term milestones (Term 1 & Term 2).
 */

import assert from 'assert'
import { calculateStudentGrade, calculateClassGrades } from './db/gradebook/gradeCalc.js'
import { calculateClassAnalytics } from './db/gradebook/gradeAnalytics.js'

console.log('====================================================')
console.log('🧪 Running Discrete Milestone Windows Test Suite')
console.log('====================================================')

// ── Test Setup Mock Data ──
const classElementary = {
  classId: 'elem_101',
  name: 'Grade 5 Room 104',
  classType: 'elementary',
  gradingFramework: 'traditional',
  activeSubjectId: 'elem_math',
  students: {
    s1: {
      studentId: 's1',
      firstName: 'Maya',
      lastName: 'Lin',
      gradeLevel: '5'
    },
    s2: {
      studentId: 's2',
      firstName: 'Leo',
      lastName: 'Chen',
      gradeLevel: '5'
    }
  },
  gradebookCategories: [
    { categoryId: 'cat_math', name: 'Mathematics', weight: 100 }
  ]
}

// 4 Assessments across the full school year:
// 2 in Term 1 (Sept 2026 - Jan 2027), 2 in Term 2 (Feb 2027 - June 2027)
const assessmentsElem = [
  { assessmentId: 101, classId: 'elem_101', name: 'Term 1 Quiz 1', totalPoints: 100, date: '2026-10-10', categoryId: 'cat_math', target: 'class', isFormative: false },
  { assessmentId: 102, classId: 'elem_101', name: 'Term 1 Unit Test', totalPoints: 100, date: '2026-12-15', categoryId: 'cat_math', target: 'class', isFormative: false },
  { assessmentId: 201, classId: 'elem_101', name: 'Term 2 Project', totalPoints: 100, date: '2027-03-10', categoryId: 'cat_math', target: 'class', isFormative: false },
  { assessmentId: 202, classId: 'elem_101', name: 'Term 2 Final Exam', totalPoints: 100, date: '2027-05-20', categoryId: 'cat_math', target: 'class', isFormative: false }
]

// Student s1:
// Term 1: 60/100, 70/100 -> Term 1 Avg = 65%
// Term 2: 90/100, 100/100 -> Term 2 Avg = 95%
// Full Year Avg = (60 + 70 + 90 + 100) / 4 = 80%
const gradesElemStudent1 = [
  { studentId: 's1', assessmentId: 101, resolvedScore: 60 },
  { studentId: 's1', assessmentId: 102, resolvedScore: 70 },
  { studentId: 's1', assessmentId: 201, resolvedScore: 90 },
  { studentId: 's1', assessmentId: 202, resolvedScore: 100 }
]

// Student s2:
// Term 1: 80/100, 80/100 -> Term 1 Avg = 80%
// Term 2: 70/100, 70/100 -> Term 2 Avg = 70%
// Full Year Avg = 75%
const gradesElemStudent2 = [
  { studentId: 's2', assessmentId: 101, resolvedScore: 80 },
  { studentId: 's2', assessmentId: 102, resolvedScore: 80 },
  { studentId: 's2', assessmentId: 201, resolvedScore: 70 },
  { studentId: 's2', assessmentId: 202, resolvedScore: 70 }
]

const allGradesElem = [...gradesElemStudent1, ...gradesElemStudent2]

// ── TEST GROUP 1: Full Year (No Milestone / Current) ──
console.log('\nTest Group 1: Full Year Active (No Date Filtering)')
async function testFullYear() {
  const s1Full = await calculateStudentGrade('s1', classElementary, {
    assessmentsPreRef: assessmentsElem,
    gradesPreRef: gradesElemStudent1
  })
  assert.strictEqual(s1Full.overallGrade, 80, 'Student 1 full-year grade must be 80%')
  assert.strictEqual(s1Full.asOf, null)
  assert.strictEqual(s1Full.dateFrom, null)
  console.log('  ✓ Full year calculates cumulative grade across all 4 tasks (80%)')
}

// ── TEST GROUP 2: Secondary Cumulative Milestone (asOf only) ──
console.log('\nTest Group 2: Secondary Cumulative Milestone (asOf only, dateFrom: null)')
async function testSecondaryCumulative() {
  // Milestone "Midterm" as of 2026-11-15 (includes 101, excludes 102, 201, 202)
  const s1Midterm = await calculateStudentGrade('s1', classElementary, {
    asOf: '2026-11-15',
    dateFrom: null,
    assessmentsPreRef: assessmentsElem,
    gradesPreRef: gradesElemStudent1
  })
  assert.strictEqual(s1Midterm.overallGrade, 60, 'Cumulative milestone asOf 2026-11-15 includes task 101 only (60%)')
  assert.strictEqual(s1Midterm.asOf, '2026-11-15')
  assert.strictEqual(s1Midterm.dateFrom, null)
  console.log('  ✓ Cumulative milestone filters strictly by <= asOf without regression')
}

// ── TEST GROUP 3: Elementary Term 1 Discrete Milestone Window ──
console.log('\nTest Group 3: Elementary Term 1 Discrete Window (Sept 1, 2026 to Jan 31, 2027)')
async function testTerm1Window() {
  const s1Term1 = await calculateStudentGrade('s1', classElementary, {
    dateFrom: '2026-09-01',
    asOf: '2027-01-31',
    assessmentsPreRef: assessmentsElem,
    gradesPreRef: gradesElemStudent1
  })
  // Term 1 has tasks 101 (60%) and 102 (70%) -> 65%
  assert.strictEqual(s1Term1.overallGrade, 65, 'Student 1 Term 1 mark must be 65%')
  assert.strictEqual(s1Term1.dateFrom, '2026-09-01')
  assert.strictEqual(s1Term1.asOf, '2027-01-31')
  console.log('  ✓ Term 1 discrete window accurately isolates Sept–Jan tasks (65%)')
}

// ── TEST GROUP 4: Elementary Term 2 Discrete Milestone Window ──
console.log('\nTest Group 4: Elementary Term 2 Discrete Window (Feb 1, 2027 to June 30, 2027)')
async function testTerm2Window() {
  const s1Term2 = await calculateStudentGrade('s1', classElementary, {
    dateFrom: '2027-02-01',
    asOf: '2027-06-30',
    assessmentsPreRef: assessmentsElem,
    gradesPreRef: gradesElemStudent1
  })
  // Term 2 has tasks 201 (90%) and 202 (100%) -> 95%
  assert.strictEqual(s1Term2.overallGrade, 95, 'Student 1 Term 2 mark must be 95% (Term 1 65% completely excluded)')
  assert.strictEqual(s1Term2.dateFrom, '2027-02-01')
  assert.strictEqual(s1Term2.asOf, '2027-06-30')
  console.log('  ✓ Term 2 discrete window accurately isolates Feb–June tasks (95%) and prevents Term 1 bleeding')
}

// ── TEST GROUP 5: SBAR Framework with Discrete Milestone Windows ──
console.log('\nTest Group 5: SBAR Framework Discrete Term Isolation')
async function testSbarWindow() {
  const classSbar = {
    classId: 'sbar_elem',
    name: 'Grade 6 Room 202',
    gradingFramework: 'sbar',
    students: {
      s3: { studentId: 's3', firstName: 'Sam', lastName: 'Taylor', gradeLevel: '6' }
    },
    expectations: [
      { code: 'B1', name: 'Number Sense' }
    ]
  }

  // B1 assessed twice in Term 1 (Scores: 60, 65)
  // B1 assessed twice in Term 2 (Scores: 90, 95)
  const assessmentsSbar = [
    { assessmentId: 301, classId: 'sbar_elem', name: 'Term 1 Check 1', date: '2026-10-01', categoryId: 'sbar_general', expectationIds: ['B1'] },
    { assessmentId: 302, classId: 'sbar_elem', name: 'Term 1 Check 2', date: '2026-11-20', categoryId: 'sbar_general', expectationIds: ['B1'] },
    { assessmentId: 401, classId: 'sbar_elem', name: 'Term 2 Check 1', date: '2027-03-05', categoryId: 'sbar_general', expectationIds: ['B1'] },
    { assessmentId: 402, classId: 'sbar_elem', name: 'Term 2 Check 2', date: '2027-05-12', categoryId: 'sbar_general', expectationIds: ['B1'] }
  ]

  const gradesSbar = [
    { studentId: 's3', assessmentId: 301, expectationScores: { B1: 60 } },
    { studentId: 's3', assessmentId: 302, expectationScores: { B1: 65 } },
    { studentId: 's3', assessmentId: 401, expectationScores: { B1: 90 } },
    { studentId: 's3', assessmentId: 402, expectationScores: { B1: 95 } }
  ]

  // In Term 1: decaying average / mastery considers only 301 & 302
  const s3Term1 = await calculateStudentGrade('s3', classSbar, {
    dateFrom: '2026-09-01',
    asOf: '2027-01-31',
    assessmentsPreRef: assessmentsSbar,
    gradesPreRef: gradesSbar
  })
  // In Term 2: decaying average / mastery considers only 401 & 402
  const s3Term2 = await calculateStudentGrade('s3', classSbar, {
    dateFrom: '2027-02-01',
    asOf: '2027-06-30',
    assessmentsPreRef: assessmentsSbar,
    gradesPreRef: gradesSbar
  })

  assert(s3Term1.overallGrade < 70, `SBAR Term 1 mastery should be in the 60s (got ${s3Term1.overallGrade})`)
  assert(s3Term2.overallGrade > 90, `SBAR Term 2 mastery should be > 90 (got ${s3Term2.overallGrade})`)
  console.log(`  ✓ SBAR discrete window isolates expectation observations: Term 1=${s3Term1.overallGrade}%, Term 2=${s3Term2.overallGrade}%`)
}

// ── TEST GROUP 6: Class Analytics with Discrete Window ──
console.log('\nTest Group 6: Class Analytics with Discrete Term Window')
async function testClassAnalytics() {
  const analyticsTerm1 = await calculateClassAnalytics(
    classElementary,
    assessmentsElem,
    allGradesElem,
    {
      dateFrom: '2026-09-01',
      asOf: '2027-01-31',
      settings: { capGradesAt100: true }
    }
  )

  const analyticsTerm2 = await calculateClassAnalytics(
    classElementary,
    assessmentsElem,
    allGradesElem,
    {
      dateFrom: '2027-02-01',
      asOf: '2027-06-30',
      settings: { capGradesAt100: true }
    }
  )

  // In Term 1: s1 = 65%, s2 = 80% -> Class Mean = 72.5%
  assert.strictEqual(analyticsTerm1.mean, 72.5, 'Term 1 class mean must be 72.5%')
  // In Term 2: s1 = 95%, s2 = 70% -> Class Mean = 82.5%
  assert.strictEqual(analyticsTerm2.mean, 82.5, 'Term 2 class mean must be 82.5%')
  assert.strictEqual(analyticsTerm1.dateFrom, '2026-09-01')
  assert.strictEqual(analyticsTerm1.asOf, '2027-01-31')
  assert.strictEqual(analyticsTerm2.dateFrom, '2027-02-01')
  assert.strictEqual(analyticsTerm2.asOf, '2027-06-30')

  console.log('  ✓ Class analytics computes discrete term metrics: Term 1 Mean = 72.5%, Term 2 Mean = 82.5%')
}

// ── Run All Tests ──
async function runSuite() {
  await testFullYear()
  await testSecondaryCumulative()
  await testTerm1Window()
  await testTerm2Window()
  await testSbarWindow()
  await testClassAnalytics()

  console.log('\n====================================================')
  console.log('🎉 ALL DISCRETE MILESTONE WINDOWS TESTS PASSED (100%)!')
  console.log('====================================================\n')
}

runSuite().catch(err => {
  console.error('Test failed with error:', err)
  process.exit(1)
})
