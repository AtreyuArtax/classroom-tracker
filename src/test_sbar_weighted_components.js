/**
 * src/test_sbar_weighted_components.js
 *
 * Automated verification suite for SBAR Weighted Evaluation Components:
 * - Legacy unweighted SBAR mode (100% expectation mastery)
 * - Ontario 65/25/10 Composite Math (Coursework 65%, Exam 25%, Attendance 10%)
 * - Progressive / Dynamic mid-term normalization (e.g. Exam not written yet)
 * - Partial evaluations (only attendance entered, or only exam entered)
 * - Missing evaluation penalty (0%) vs Unassessed (null)
 * - Manual Adjusted Grade override precedence
 * - Custom weighting schemes (70/30, 80/20, etc.)
 */

import assert from 'assert'
import { calculateStudentGrade } from './db/gradebook/gradeCalc.js'

console.log('====================================================')
console.log('🧪 SBAR Weighted Components Automated Verification')
console.log('====================================================\n')

// ─── MOCK FIXTURES ───

const baseClass = {
  classId: 'cls_sbar_1',
  name: 'SBI3U Grade 11 Biology',
  gradingFramework: 'sbar',
  sbarAlgorithm: 'decaying_average',
  expectations: [
    { code: 'B1.1', expectationId: 'exp_b11' },
    { code: 'B1.2', expectationId: 'exp_b12' },
    { code: 'B2.1', expectationId: 'exp_b21' }
  ],
  students: {
    st_1: { studentId: 'st_1', firstName: 'Alice', lastName: 'Smith' },
    st_2: { studentId: 'st_2', firstName: 'Bob', lastName: 'Jones' },
    st_adj: { studentId: 'st_adj', firstName: 'Charlie', lastName: 'Brown', adjustedGrade: 92 }
  }
}

// Coursework assessments evaluating expectations
const sbarCourseworkAssessments = [
  {
    assessmentId: 101,
    name: 'Cell Lab Investigation',
    date: '2026-10-05',
    assessmentType: 'summative',
    isFormative: false,
    expectationIds: ['B1.1'],
    totalPoints: 100
  },
  {
    assessmentId: 102,
    name: 'Mitosis Microscope Quiz',
    date: '2026-10-20',
    assessmentType: 'summative',
    isFormative: false,
    expectationIds: ['B1.2'],
    totalPoints: 100
  },
  {
    assessmentId: 103,
    name: 'Genetics Case Study',
    date: '2026-11-15',
    assessmentType: 'summative',
    isFormative: false,
    expectationIds: ['B2.1'],
    totalPoints: 100
  }
]

// Final evaluation component assessments
const finalExamAssessment = {
  assessmentId: 201,
  componentId: 'comp_exam',
  name: 'Written Final Examination',
  date: '2027-01-20',
  assessmentType: 'product',
  purpose: 'summative',
  isNumericComponent: true,
  totalPoints: 100
}

const attendanceAssessment = {
  assessmentId: 202,
  componentId: 'comp_att',
  name: 'Attendance & Participation',
  date: '2027-01-22',
  assessmentType: 'product',
  purpose: 'summative',
  isNumericComponent: true,
  totalPoints: 100
}

const allAssessments = [
  ...sbarCourseworkAssessments,
  finalExamAssessment,
  attendanceAssessment
]

// Grades for Alice:
// B1.1 = 80%, B1.2 = 80%, B2.1 = 80% -> SBAR Mastery = 80%
// Exam = 70% (score: 70/100)
// Attendance = 90% (score: 90/100)
const aliceGrades = [
  { assessmentId: 101, studentId: 'st_1', expectationScores: { 'B1.1': 80 } },
  { assessmentId: 102, studentId: 'st_1', expectationScores: { 'B1.2': 80 } },
  { assessmentId: 103, studentId: 'st_1', expectationScores: { 'B2.1': 80 } },
  { assessmentId: 201, studentId: 'st_1', score: 70 },
  { assessmentId: 202, studentId: 'st_1', score: 90 }
]

// --- TEST GROUP 1: Legacy Unweighted SBAR Mode ---
console.log('Test Group 1: Legacy Unweighted SBAR Mode')
{
  const classLegacy = { ...baseClass, sbarWeighting: { enabled: false } }
  const result = await calculateStudentGrade('st_1', classLegacy, {
    assessmentsPreRef: sbarCourseworkAssessments,
    gradesPreRef: aliceGrades.slice(0, 3)
  })

  assert.strictEqual(result.sbarMasteryPct, 80, 'SBAR mastery is 80%')
  assert.strictEqual(result.overallGrade, 80, 'Overall grade equals 100% SBAR mastery when weighting disabled')
  assert.strictEqual(result.sbarBreakdown, undefined, 'No breakdown returned in legacy mode')
  console.log('  ✓ Legacy SBAR mode computes 100% expectation mastery without modification')
}

// --- TEST GROUP 2: Ontario 65 / 25 / 10 Composite Math ---
console.log('\nTest Group 2: Ontario 65 / 25 / 10 Composite Math')
{
  const classWeighted = {
    ...baseClass,
    sbarWeighting: {
      enabled: true,
      termWeight: 65,
      components: [
        { componentId: 'comp_exam', name: 'Written Final Exam', weight: 25, assessmentId: 201 },
        { componentId: 'comp_att', name: 'Attendance & Participation', weight: 10, assessmentId: 202 }
      ]
    }
  }

  const result = await calculateStudentGrade('st_1', classWeighted, {
    assessmentsPreRef: allAssessments,
    gradesPreRef: aliceGrades
  })

  // Math: (80 * 0.65) + (70 * 0.25) + (90 * 0.10) = 52.0 + 17.5 + 9.0 = 78.5 -> rounds to 79%
  assert.strictEqual(result.sbarMasteryPct, 80, 'Coursework SBAR mastery preserved as 80%')
  assert.strictEqual(result.categoryResults.sbar_term.percentage, 80, 'Term category percentage is 80%')
  assert.strictEqual(result.categoryResults.comp_exam.percentage, 70, 'Exam percentage is 70%')
  assert.strictEqual(result.categoryResults.comp_att.percentage, 90, 'Attendance percentage is 90%')
  assert.strictEqual(result.weightUsed, 100, 'All 100% weight is used')
  assert.strictEqual(result.overallGrade, 79, 'Composite grade is 79% (52 + 17.5 + 9 = 78.5 -> 79)')
  assert.strictEqual(result.sbarBreakdown.enabled, true, 'sbarBreakdown flag is true')
  console.log('  ✓ 65% Coursework + 25% Exam + 10% Attendance calculates exact composite (78.5% -> 79%)')
}

// --- TEST GROUP 3: Progressive Mid-Semester Normalization (Exam & Attendance Not Written Yet) ---
console.log('\nTest Group 3: Progressive Mid-Semester Normalization (Exam & Attendance Not Written Yet)')
{
  const classWeighted = {
    ...baseClass,
    sbarWeighting: {
      enabled: true,
      termWeight: 65,
      components: [
        { componentId: 'comp_exam', name: 'Written Final Exam', weight: 25, assessmentId: 201 },
        { componentId: 'comp_att', name: 'Attendance & Participation', weight: 10, assessmentId: 202 }
      ]
    }
  }

  // Only coursework grades exist so far
  const midtermGrades = aliceGrades.slice(0, 3)
  const result = await calculateStudentGrade('st_1', classWeighted, {
    assessmentsPreRef: allAssessments,
    gradesPreRef: midtermGrades
  })

  // In October: weightUsed is 65 (termWeight only).
  // (80 * 0.65) / 0.65 = 80%.
  assert.strictEqual(result.weightUsed, 65, 'Weight used is only 65% in mid-semester')
  assert.strictEqual(result.categoryResults.comp_exam.percentage, null, 'Exam is unassessed (null)')
  assert.strictEqual(result.categoryResults.comp_att.percentage, null, 'Attendance is unassessed (null)')
  assert.strictEqual(result.overallGrade, 80, 'Mid-term grade is 80% (does not prematurely penalize for unwritten exam)')
  console.log('  ✓ Progressive normalization cleanly uses 65% denominator so mid-term grade equals current mastery (80%)')
}

// --- TEST GROUP 4: Partial Final Entry (Attendance Entered, Exam Pending) ---
console.log('\nTest Group 4: Partial Final Entry (Attendance Entered, Exam Pending)')
{
  const classWeighted = {
    ...baseClass,
    sbarWeighting: {
      enabled: true,
      termWeight: 65,
      components: [
        { componentId: 'comp_exam', name: 'Written Final Exam', weight: 25, assessmentId: 201 },
        { componentId: 'comp_att', name: 'Attendance & Participation', weight: 10, assessmentId: 202 }
      ]
    }
  }

  // Coursework (80%) + Attendance (90%) entered. Exam (25%) not entered yet.
  const partialGrades = [
    ...aliceGrades.slice(0, 3),
    { assessmentId: 202, studentId: 'st_1', score: 90 }
  ]

  const result = await calculateStudentGrade('st_1', classWeighted, {
    assessmentsPreRef: allAssessments,
    gradesPreRef: partialGrades
  })

  // Weight used: 65 + 10 = 75.
  // Weighted sum: (80 * 0.65) + (90 * 0.10) = 52.0 + 9.0 = 61.0.
  // Grade: (61.0 / 75) * 100 = 81.333% -> 81%.
  assert.strictEqual(result.weightUsed, 75, 'Weight used is 75%')
  assert.strictEqual(result.overallGrade, 81, 'Normalized grade across 75% is 81% (61/75 = 81.33%)')
  console.log('  ✓ Partial evaluation dynamically normalizes over 75% weightUsed')
}

// --- TEST GROUP 5: Missing Exam Penalizes as 0% ---
console.log('\nTest Group 5: Missing Exam Penalizes as 0%')
{
  const classWeighted = {
    ...baseClass,
    sbarWeighting: {
      enabled: true,
      termWeight: 65,
      components: [
        { componentId: 'comp_exam', name: 'Written Final Exam', weight: 25, assessmentId: 201 },
        { componentId: 'comp_att', name: 'Attendance & Participation', weight: 10, assessmentId: 202 }
      ]
    }
  }

  // Exam is marked missing: true
  const missingExamGrades = [
    ...aliceGrades.slice(0, 3),
    { assessmentId: 201, studentId: 'st_1', missing: true },
    { assessmentId: 202, studentId: 'st_1', score: 90 }
  ]

  const result = await calculateStudentGrade('st_1', classWeighted, {
    assessmentsPreRef: allAssessments,
    gradesPreRef: missingExamGrades
  })

  // Weight used: 65 + 25 + 10 = 100.
  // Weighted sum: (80 * 0.65) + (0 * 0.25) + (90 * 0.10) = 52.0 + 0 + 9.0 = 61.0 -> 61%
  assert.strictEqual(result.weightUsed, 100, 'Weight used is 100% when exam is marked missing')
  assert.strictEqual(result.categoryResults.comp_exam.percentage, 0, 'Missing exam is 0%')
  assert.strictEqual(result.overallGrade, 61, 'Overall grade is 61%')
  console.log('  ✓ Missing evaluation penalty correctly factors in 0% against the 25% weight')
}

// --- TEST GROUP 6: Manual Adjusted Grade Overrides All Calculations ---
console.log('\nTest Group 6: Manual Adjusted Grade Precedence')
{
  const classWeighted = {
    ...baseClass,
    sbarWeighting: {
      enabled: true,
      termWeight: 65,
      components: [
        { componentId: 'comp_exam', name: 'Written Final Exam', weight: 25, assessmentId: 201 },
        { componentId: 'comp_att', name: 'Attendance & Participation', weight: 10, assessmentId: 202 }
      ]
    }
  }

  const charlieGrades = [
    { assessmentId: 101, studentId: 'st_adj', expectationScores: { 'B1.1': 70 } },
    { assessmentId: 201, studentId: 'st_adj', score: 60 },
    { assessmentId: 202, studentId: 'st_adj', score: 80 }
  ]

  const result = await calculateStudentGrade('st_adj', classWeighted, {
    assessmentsPreRef: allAssessments,
    gradesPreRef: charlieGrades
  })

  assert.strictEqual(result.isAdjusted, true, 'isAdjusted is true')
  assert.strictEqual(result.adjustedGrade, 92, 'adjustedGrade is 92')
  assert.strictEqual(result.overallGrade, 92, 'Overall grade honors teacher manual adjustedGrade of 92')
  console.log('  ✓ Teacher adjustedGrade takes ultimate precedence')
}

// --- TEST GROUP 7: Custom Weighting Schemes (Ontario Standard 70/30) ---
console.log('\nTest Group 7: Custom Weighting Schemes (70/30)')
{
  const class7030 = {
    ...baseClass,
    sbarWeighting: {
      enabled: true,
      termWeight: 70,
      components: [
        { componentId: 'comp_exam', name: 'Final Evaluation', weight: 30, assessmentId: 201 }
      ]
    }
  }

  // Coursework 80%, Final Exam 90%
  // (80 * 0.70) + (90 * 0.30) = 56 + 27 = 83%
  const result = await calculateStudentGrade('st_1', class7030, {
    assessmentsPreRef: allAssessments,
    gradesPreRef: [
      ...aliceGrades.slice(0, 3),
      { assessmentId: 201, studentId: 'st_1', score: 90 }
    ]
  })

  assert.strictEqual(result.overallGrade, 83, '70/30 calculation produces exact 83%')
  console.log('  ✓ 70/30 custom weighting produces exact 83%')
}

console.log('\n====================================================')
console.log('🎉 ALL SBAR WEIGHTED COMPONENTS TESTS PASSED (100%)!')
console.log('====================================================')
