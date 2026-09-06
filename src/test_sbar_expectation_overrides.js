/**
 * src/test_sbar_expectation_overrides.js
 * 
 * Automated Verification Suite for SBAR Professional Judgment Expectation Overrides
 * 
 * Verifies:
 * 1. Initial algorithmic calculation of expectation mastery
 * 2. Applying professional judgment override (e.g. L3- to L3)
 * 3. Overall course mastery reflects overridden score
 * 4. Permanence: Adding new assessments recalculates background score while preserving teacher override
 * 5. Elementary subject isolation: Math B1.1 vs Science B1.1 zero calculation bleed
 * 6. Student cohort isolation: overrides on Student A do not bleed to Student B
 * 7. Unassessed expectation overrides
 * 8. Reverting override restores live algorithmic score
 */

import {
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery,
  resolveStudentExpectationOverride,
  SBAR_LEVELS
} from './db/gradebook/gradeCalcSBAR.js'

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ✓ ${message}`)
  } else {
    failedTests++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

function assertApprox(val, expected, tolerance = 0.5, message) {
  totalTests++
  if (Math.abs(val - expected) <= tolerance) {
    passedTests++
    console.log(`  ✓ ${message} (got ${val}, expected ${expected})`)
  } else {
    failedTests++
    console.error(`  ✗ FAIL: ${message} (got ${val}, expected ${expected})`)
  }
}

console.log('=================================================================')
console.log('🧪 SBAR Expectation Overrides: Professional Judgment Test Suite')
console.log('=================================================================\n')

// ── TEST 1: Canonical SBAR Levels Export ──────────────────────────
console.log('Test Group 1: Canonical SBAR Levels Definition')
{
  assert(Array.isArray(SBAR_LEVELS) && SBAR_LEVELS.length === 13, 'SBAR_LEVELS is exported as canonical array of 13 tiers')
  const l3 = SBAR_LEVELS.find(l => l.code === 'L3')
  const l4 = SBAR_LEVELS.find(l => l.code === 'L4')
  const l4plus = SBAR_LEVELS.find(l => l.code === 'L4+')
  const r = SBAR_LEVELS.find(l => l.code === 'R')
  assert(l3 && l3.pct === 75, 'L3 defaults to 75%')
  assert(l4 && l4.pct === 88, 'L4 defaults to 88%')
  assert(l4plus && l4plus.pct === 96, 'L4+ defaults to 96%')
  assert(r && r.pct === 45, 'R defaults to 45%')
}
console.log()

// ── TEST 2: Initial Calculation & Applying Override ───────────────
console.log('Test Group 2: Override Application on Calculated Standard')
{
  const mockClass = {
    classId: 'c1',
    classType: 'secondary',
    sbarAlgorithm: 'decaying_average',
    students: {
      's1': {
        id: 's1',
        firstName: 'Alice',
        lastName: 'Cooper',
        expectationOverrides: {}
      },
      's2': {
        id: 's2',
        firstName: 'Bob',
        lastName: 'Dylan',
        expectationOverrides: {}
      }
    },
    expectations: [
      { code: 'B1.1', name: 'Standard B1.1' }
    ]
  }

  const mockAssessments = [
    {
      assessmentId: 101,
      title: 'Unit 1 Quiz',
      date: '2026-02-01',
      evaluationType: 'summative',
      expectationIds: ['B1.1']
    }
  ]

  // s1 scored 72% (L3-), s2 scored 72% (L3-)
  const mockGradeMap = {
    101: {
      's1': { assessmentId: 101, studentId: 's1', expectationScores: { 'B1.1': 72 } },
      's2': { assessmentId: 101, studentId: 's2', expectationScores: { 'B1.1': 72 } }
    }
  }

  // 1. Initial run without override
  const initialMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'decaying_average')
  assert(initialMap['s1']['B1.1'] !== undefined, 's1 B1.1 is defined in initial mastery map')
  assert(initialMap['s1']['B1.1'].badge.level === 'L3-', 'Student 1 initial level is L3-')
  assert(initialMap['s1']['B1.1'].score === 72, 'Student 1 initial score is 72%')
  assert(initialMap['s1']['B1.1'].isOverridden === false, 'Student 1 initial is not overridden')

  // 2. Teacher applies professional judgment override: sets B1.1 to L3 (75%)
  mockClass.students['s1'].expectationOverrides['B1.1'] = {
    level: 'L3',
    score: 75,
    note: 'Demonstrated deep conceptual understanding in oral conference',
    updatedAt: new Date().toISOString()
  }

  const overriddenMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'decaying_average')
  const s1Exp = overriddenMap['s1']['B1.1']
  const s2Exp = overriddenMap['s2']['B1.1']

  assert(s1Exp.isOverridden === true, 's1 B1.1 is flagged as overridden')
  assert(s1Exp.badge.level === 'L3', 's1 B1.1 reported level is L3')
  assert(s1Exp.score === 75, 's1 B1.1 reported score is 75%')
  assert(s1Exp.calculatedScore === 72, 's1 B1.1 retains background calculated score 72%')
  assert(s1Exp.calculatedBadge.level === 'L3-', 's1 B1.1 retains background calculated badge L3-')
  assert(s1Exp.overrideLevel === 'L3', 's1 B1.1 records overrideLevel L3')
  assert(s1Exp.overrideNote.includes('oral conference'), 's1 B1.1 preserves teacher note')
  assert(Array.isArray(s1Exp.evaluations) && s1Exp.evaluations.length === 1, 's1 B1.1 retains contributing evaluations list')

  // 3. Verify student cohort isolation (s2 is unaffected)
  assert(s2Exp.isOverridden === false, 's2 B1.1 is NOT overridden')
  assert(s2Exp.badge.level === 'L3-', 's2 B1.1 level remains L3-')
  assert(s2Exp.score === 72, 's2 B1.1 score remains 72%')
}
console.log()

// ── TEST 3: Overall Course Mastery Integration ───────────────────
console.log('Test Group 3: Overall Course Mastery Calculation with Overrides')
{
  const mockClass = {
    classId: 'c1',
    students: {
      's1': {
        id: 's1',
        expectationOverrides: {
          'B1.1': { level: 'L3', score: 75 } // Overridden from 72 to 75
        }
      }
    },
    expectations: [
      { code: 'B1.1', name: 'Standard B1.1' },
      { code: 'B1.2', name: 'Standard B1.2' }
    ]
  }

  const mockAssessments = [
    { assessmentId: 1, expectationIds: ['B1.1'] },
    { assessmentId: 2, expectationIds: ['B1.2'] }
  ]

  const mockGradeMap = {
    1: {
      's1': { assessmentId: 1, studentId: 's1', expectationScores: { 'B1.1': 72 } }
    },
    2: {
      's1': { assessmentId: 2, studentId: 's1', expectationScores: { 'B1.2': 85 } } // L4-
    }
  }

  const overallMastery = calculateSBARStudentOverallMastery('s1', mockClass, mockAssessments, mockGradeMap)
  // Standard B1.1 is 75 (overridden), Standard B1.2 is 85.
  // Average = (75 + 85) / 2 = 80.0%
  assertApprox(overallMastery, 80.0, 0.1, 'Student overall course mastery averages overridden score (80.0%)')
}
console.log()

// ── TEST 4: Permanence Across Subsequent Assessments ─────────────
console.log('Test Group 4: Permanence Across Subsequent Assessments')
{
  const mockClass = {
    classId: 'c1',
    students: {
      's1': {
        id: 's1',
        expectationOverrides: {
          'A1.1': { level: 'L4', score: 90, note: 'Exceeded standard on portfolio' }
        }
      }
    },
    expectations: [
      { code: 'A1.1', name: 'Standard A1.1' }
    ]
  }

  // Assessment 1: student had 60% (L1+)
  const mockAssessments = [
    { assessmentId: 201, date: '2026-01-10', evaluationType: 'summative', expectationIds: ['A1.1'] }
  ]
  const mockGradeMap = {
    201: {
      's1': { assessmentId: 201, studentId: 's1', expectationScores: { 'A1.1': 60 } }
    }
  }

  // State 1: 1 assessment, teacher already overrode to L4
  let mastery = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'decaying_average')
  assert(mastery['s1']['A1.1'].badge.level === 'L4', 'State 1: reported level is L4 (overridden)')
  assert(mastery['s1']['A1.1'].calculatedScore === 60, 'State 1: calculated score is 60%')

  // State 2: Teacher adds a 2nd assessment for A1.1, student scores 70%
  mockAssessments.push({
    assessmentId: 202,
    date: '2026-02-15',
    evaluationType: 'summative',
    expectationIds: ['A1.1']
  })
  mockGradeMap[202] = {
    's1': { assessmentId: 202, studentId: 's1', expectationScores: { 'A1.1': 70 } }
  }

  mastery = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'decaying_average')
  const a1ExpAfter2 = mastery['s1']['A1.1']

  // Decaying average: 0.65*70 + 0.35*60 = 45.5 + 21.0 = 66.5% -> L2+
  assert(a1ExpAfter2.isOverridden === true, 'State 2: override persists after adding 2nd assessment')
  assert(a1ExpAfter2.badge.level === 'L4', 'State 2: reported level remains L4 (override held permanent)')
  assert(a1ExpAfter2.score === 90, 'State 2: reported score remains 90%')
  assertApprox(a1ExpAfter2.calculatedScore, 66.5, 0.2, 'State 2: background calculated score updated to 66.5%')
  assert(a1ExpAfter2.calculatedBadge.level === 'L2', 'State 2: background calculated badge updated to L2')
  assert(a1ExpAfter2.evaluations.length === 2, 'State 2: both assessments listed in evaluations')

  // State 3: Teacher adds a 3rd assessment for A1.1, student scores 95%
  mockAssessments.push({
    assessmentId: 203,
    date: '2026-03-01',
    evaluationType: 'summative',
    expectationIds: ['A1.1']
  })
  mockGradeMap[203] = {
    's1': { assessmentId: 203, studentId: 's1', expectationScores: { 'A1.1': 95 } }
  }

  mastery = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'decaying_average')
  const a1ExpAfter3 = mastery['s1']['A1.1']

  assert(a1ExpAfter3.isOverridden === true, 'State 3: override remains permanent after 3rd assessment')
  assert(a1ExpAfter3.badge.level === 'L4', 'State 3: reported level remains L4')
  assert(a1ExpAfter3.evaluations.length === 3, 'State 3: all 3 assessments are tracked')
}
console.log()

// ── TEST 5: Elementary Subject Isolation & No Bleed ───────────────
console.log('Test Group 5: Elementary Cross-Subject Isolation (Math vs Science)')
{
  const elemClass = {
    classId: 'elem-1',
    classType: 'elementary',
    activeSubjectId: 'math',
    subjects: [
      {
        id: 'math',
        name: 'Mathematics',
        expectations: [
          { code: 'B1.1', subjectId: 'math', description: 'Math number sense' }
        ]
      },
      {
        id: 'science',
        name: 'Science & Technology',
        expectations: [
          { code: 'B1.1', subjectId: 'science', description: 'Science matter and energy' }
        ]
      }
    ],
    curriculumExpectations: [
      { code: 'B1.1', subjectId: 'math', description: 'Math number sense' },
      { code: 'B1.1', subjectId: 'science', description: 'Science matter and energy' }
    ],
    expectations: [
      { code: 'B1.1', subjectId: 'math', description: 'Math number sense' }
    ],
    students: {
      's1': {
        id: 's1',
        expectationOverrides: {
          // Scoped by subject: only Math B1.1 is overridden to L4
          'math::B1.1': { level: 'L4', score: 90 }
        }
      }
    }
  }

  // Resolver tests
  const resolvedMath = resolveStudentExpectationOverride(
    elemClass.students['s1'],
    'B1.1',
    'math',
    elemClass.curriculumExpectations
  )
  assert(resolvedMath !== null, 'Math B1.1 resolves override')
  assert(resolvedMath.level === 'L4' && resolvedMath.score === 90, 'Math B1.1 level is L4, score 90')

  const resolvedScience = resolveStudentExpectationOverride(
    elemClass.students['s1'],
    'B1.1',
    'science',
    elemClass.curriculumExpectations
  )
  assert(resolvedScience === null, 'Science B1.1 does NOT resolve Math override (zero cross-subject bleed)')

  // Mastery calculation in elementary Math context
  const mathAssessments = [
    { assessmentId: 301, subjectId: 'math', expectationIds: ['B1.1'] }
  ]
  const mathGradeMap = {
    301: {
      's1': { assessmentId: 301, studentId: 's1', expectationScores: { 'B1.1': 65 } } // L2
    }
  }

  const mathMastery = calculateSBARExpectationMastery(elemClass, mathAssessments, mathGradeMap)
  assert(mathMastery['s1']['B1.1'].isOverridden === true, 'Elementary Math B1.1 is overridden')
  assert(mathMastery['s1']['B1.1'].badge.level === 'L4', 'Elementary Math B1.1 displays L4')
  assert(mathMastery['s1']['B1.1'].calculatedBadge.level === 'L2', 'Elementary Math B1.1 calculated is L2')

  // Switch to Science context
  elemClass.activeSubjectId = 'science'
  elemClass.expectations = [
    { code: 'B1.1', subjectId: 'science', description: 'Science matter and energy' }
  ]
  const scienceAssessments = [
    { assessmentId: 302, subjectId: 'science', expectationIds: ['B1.1'] }
  ]
  const scienceGradeMap = {
    302: {
      's1': { assessmentId: 302, studentId: 's1', expectationScores: { 'B1.1': 65 } }
    }
  }

  const scienceMastery = calculateSBARExpectationMastery(elemClass, scienceAssessments, scienceGradeMap)
  assert(scienceMastery['s1']['B1.1'].isOverridden === false, 'Elementary Science B1.1 is NOT overridden')
  assert(scienceMastery['s1']['B1.1'].badge.level === 'L2', 'Elementary Science B1.1 displays calculated L2')
}
console.log()

// ── TEST 6: Reversion to Calculated ──────────────────────────────
console.log('Test Group 6: Reverting Override Restores Algorithmic Score')
{
  const mockClass = {
    classId: 'c1',
    students: {
      's1': {
        id: 's1',
        expectationOverrides: {
          'C1.1': { level: 'L4+', score: 98 }
        }
      }
    },
    expectations: [
      { code: 'C1.1', name: 'Standard C1.1' }
    ]
  }

  const mockAssessments = [
    { assessmentId: 401, expectationIds: ['C1.1'] }
  ]
  const mockGradeMap = {
    401: {
      's1': { assessmentId: 401, studentId: 's1', expectationScores: { 'C1.1': 75 } }
    }
  }

  // 1. With override
  let mastery = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap)
  assert(mastery['s1']['C1.1'].badge.level === 'L4+', 'Before revert: level is L4+')
  assert(mastery['s1']['C1.1'].isOverridden === true, 'Before revert: isOverridden is true')

  // 2. Revert override
  delete mockClass.students['s1'].expectationOverrides['C1.1']

  mastery = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap)
  assert(mastery['s1']['C1.1'].badge.level === 'L3', 'After revert: level restored to calculated L3')
  assert(mastery['s1']['C1.1'].score === 75, 'After revert: score restored to 75%')
  assert(mastery['s1']['C1.1'].isOverridden === false, 'After revert: isOverridden is false')
  assert(mastery['s1']['C1.1'].overrideLevel === null, 'After revert: overrideLevel is null')
}
console.log()

// ── TEST 7: Unassessed Expectation Override ──────────────────────
console.log('Test Group 7: Override on Expectation with Zero Assessments')
{
  const mockClass = {
    classId: 'c1',
    students: {
      's1': {
        id: 's1',
        expectationOverrides: {
          'D1.1': { level: 'L3', score: 75, note: 'Prior learning credit' }
        }
      }
    },
    expectations: [
      { code: 'D1.1', name: 'Standard D1.1' }
    ]
  }

  const mockAssessments = [] // No assessments at all
  const mockGradeMap = {}

  const mastery = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap)
  assert(mastery['s1'] && mastery['s1']['D1.1'] !== undefined, 'Unassessed expectation is populated in mastery map')
  assert(mastery['s1']['D1.1'].isOverridden === true, 'Unassessed expectation is marked overridden')
  assert(mastery['s1']['D1.1'].badge.level === 'L3', 'Unassessed expectation has badge L3')
  assert(mastery['s1']['D1.1'].score === 75, 'Unassessed expectation has score 75')
  assert(mastery['s1']['D1.1'].calculatedScore === null, 'Unassessed expectation calculatedScore is null')
  assert(mastery['s1']['D1.1'].evaluations.length === 0, 'Unassessed expectation has 0 evaluations')
}
console.log()

// ── SUMMARY REPORT ────────────────────────────────────────────────
console.log('=================================================================')
console.log(`Results: ${passedTests} passed, ${failedTests} failed out of ${totalTests} total tests`)
console.log('=================================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('🎉 ALL SBAR EXPECTATION OVERRIDE TESTS PASSED!')
  process.exit(0)
}
