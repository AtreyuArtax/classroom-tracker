/**
 * src/test_sbar_math.js
 * 
 * Automated Verification Suite for SBAR (Standards-Based Assessment & Reporting)
 * Tests:
 * 1. Decaying Average (65/35 weight, single/multi progression)
 * 2. Power Law Marzano Trajectory (logarithmic regression, clamping)
 * 3. Mode / Most Consistent (level grouping, frequency count, tie-breaker with most recent)
 * 4. Most Recent (last 3 window) and Highest score
 * 5. Level Badge Mapper (L4+, L4, L4-, L3+, L3, L3-, L2+, L2, L2-, L1+, L1, L1-, R)
 * 6. Multi-expectation Assessment Isolation (verifying no score bleeding across expectations)
 * 7. Formative vs Summative Precedence and Provisional Mastery
 * 8. Overall Course Mastery Calculation
 */

import {
  calculateDecayingAverage,
  calculatePowerLaw,
  calculateMode,
  getSBARLevelBadge,
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery
} from './db/gradebook/gradeCalcSBAR.js'

import {
  _calculateCategoryGrade,
  resolveAttemptScore,
  detectOutliers,
  calculateStandardDeviation,
  isCohortMatch,
  calculateStudentGrade,
  calculateMostConsistent,
  calculateWeightedMedian
} from './db/gradebook/gradeCalc.js'

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

console.log('====================================================')
console.log('🧪 SBAR Math & Pipeline Automated Verification Suite')
console.log('====================================================\n')

// ── TEST GROUP 1: Decaying Average ────────────────────────────────
console.log('Test Group 1: Decaying Average (65/35 Exponential Decay)')
{
  assert(calculateDecayingAverage([]) === null, 'Empty scores array returns null')
  assert(calculateDecayingAverage([75]) === 75, 'Single score returns exact score')
  
  // Two scores: 60, then 80 -> (0.65 * 80) + (0.35 * 60) = 52 + 21 = 73
  assertApprox(calculateDecayingAverage([60, 80]), 73.0, 0.1, 'Two scores [60, 80] = 73.0')
  
  // Three scores: 60, 80, 90 -> (0.65 * 90) + (0.35 * 73) = 58.5 + 25.55 = 84.05 -> 84.1
  assertApprox(calculateDecayingAverage([60, 80, 90]), 84.1, 0.1, 'Three scores [60, 80, 90] = 84.1')
  
  // Progression showing growth: 50 -> 60 -> 70 -> 85
  // 50 -> 60: 0.65*60 + 0.35*50 = 56.5
  // 56.5 -> 70: 0.65*70 + 0.35*56.5 = 45.5 + 19.775 = 65.275
  // 65.275 -> 85: 0.65*85 + 0.35*65.275 = 55.25 + 22.846 = 78.096 -> 78.1
  assertApprox(calculateDecayingAverage([50, 60, 70, 85]), 78.1, 0.2, 'Four scores [50, 60, 70, 85] = 78.1')
}
console.log()

// ── TEST GROUP 2: Power Law (Marzano Logarithmic Trajectory) ───────
console.log('Test Group 2: Power Law (Marzano Trajectory)')
{
  assert(calculatePowerLaw([]) === null, 'Empty array returns null')
  assert(calculatePowerLaw([80]) === 80, 'Single score returns exact score')
  
  // Consistently improving scores: [50, 65, 80, 95]
  const pLawGrowth = calculatePowerLaw([50, 65, 80, 95])
  assert(pLawGrowth >= 90 && pLawGrowth <= 100, `Improving trajectory projects high mastery (${pLawGrowth}%)`)
  
  // Flat scores: [75, 75, 75]
  assertApprox(calculatePowerLaw([75, 75, 75]), 75.0, 1.0, 'Flat trajectory projects exact score (75%)')
  
  // Boundary clamping: ensure never below 0 or above 100
  const clamped = calculatePowerLaw([10, 20, 50, 90, 100, 100])
  assert(clamped <= 100 && clamped >= 0, `Clamped within [0, 100] (${clamped}%)`)
}
console.log()

// ── TEST GROUP 3: Mode / Most Consistent ──────────────────────────
console.log('Test Group 3: Mode (Most Frequent Rubric Level)')
{
  assert(calculateMode([]) === null, 'Empty array returns null')
  assert(calculateMode([88]) === 88, 'Single score returns exact score')
  
  // [62 (L2), 74 (L3), 76 (L3), 88 (L4)] -> Mode is L3, avg of [74, 76] = 75
  assertApprox(calculateMode([62, 74, 76, 88]), 75.0, 0.1, 'Mode selects most frequent level (L3 avg = 75.0)')
  
  // Tie-breaker: [74 (L3), 88 (L4)] -> Both count 1, tie-breaker selects most recent (L4 = 88)
  assertApprox(calculateMode([74, 88]), 88.0, 0.1, 'Mode tie-breaker selects most recent level (L4 = 88.0)')
}
console.log()

// ── TEST GROUP 4: Level Badge Mapper ──────────────────────────────
console.log('Test Group 4: SBAR Level Badge Mapping')
{
  assert(getSBARLevelBadge(98).level === 'L4+', '98% maps to L4+')
  assert(getSBARLevelBadge(90).level === 'L4', '90% maps to L4')
  assert(getSBARLevelBadge(82).level === 'L4-', '82% maps to L4-')
  assert(getSBARLevelBadge(78).level === 'L3+', '78% maps to L3+')
  assert(getSBARLevelBadge(74).level === 'L3', '74% maps to L3')
  assert(getSBARLevelBadge(71).level === 'L3-', '71% maps to L3-')
  assert(getSBARLevelBadge(68).level === 'L2+', '68% maps to L2+')
  assert(getSBARLevelBadge(64).level === 'L2', '64% maps to L2')
  assert(getSBARLevelBadge(61).level === 'L2-', '61% maps to L2-')
  assert(getSBARLevelBadge(58).level === 'L1+', '58% maps to L1+')
  assert(getSBARLevelBadge(54).level === 'L1', '54% maps to L1')
  assert(getSBARLevelBadge(51).level === 'L1-', '51% maps to L1-')
  assert(getSBARLevelBadge(42).level === 'R', '42% maps to Remediation (R)')
}
console.log()

// ── TEST GROUP 5: Multi-Expectation Isolation in calculateSBARExpectationMastery
console.log('Test Group 5: Multi-Expectation Isolation (No Score Bleeding)')
{
  const mockClass = {
    classId: 'cls_1',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    students: {
      'std_1': { firstName: 'Alice', lastName: 'Smith', archived: false }
    },
    expectations: [
      { code: 'A1.1', expectationId: 'exp_1', name: 'Expectation 1' },
      { code: 'A1.2', expectationId: 'exp_2', name: 'Expectation 2' },
      { code: 'A1.3', expectationId: 'exp_3', name: 'Expectation 3' }
    ]
  }

  // Assessment 1 evaluates A1.1, A1.2, A1.3
  const mockAssessments = [
    {
      assessmentId: 101,
      name: 'Unit 1 Multi-Standard Project',
      date: '2026-08-20',
      expectationIds: ['A1.1', 'A1.2', 'A1.3'],
      assessmentType: 'summative'
    }
  ]

  // Student is graded ONLY on A1.1 (90%) and A1.2 (70%). A1.3 is intentionally NOT graded yet.
  const mockGradeMap = {
    101: {
      'std_1': {
        assessmentId: 101,
        studentId: 'std_1',
        expectationScores: {
          'A1.1': 90,
          'A1.2': 70
        },
        masteryLevel: 80, // Average of 90 and 70
        resolvedScore: 80
      }
    }
  }

  const masteryMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'decaying_average')
  const studentMastery = masteryMap['std_1']

  assert(studentMastery['A1.1']?.score === 90, 'A1.1 receives exact score of 90% (L4)')
  assert(studentMastery['A1.2']?.score === 70, 'A1.2 receives exact score of 70% (L3-)')
  assert(studentMastery['A1.3'] === undefined || studentMastery['A1.3']?.score === null, 
    'A1.3 is unassessed and did NOT erroneously receive 80% fallback from masteryLevel')
}
console.log()

// ── TEST GROUP 6: Formative vs Summative Precedence & Radial Events
console.log('Test Group 6: Formative vs Summative Precedence')
{
  const mockClass = {
    classId: 'cls_2',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    students: {
      'std_2': { firstName: 'Bob', lastName: 'Jones', archived: false }
    },
    expectations: [
      { code: 'B2.1', expectationId: 'exp_b21', name: 'Expectation B2.1' }
    ]
  }

  // 1. Only Formative exists -> Provisional Mastery
  const formativeAssessments = [
    { assessmentId: 201, name: 'Practice Quiz', date: '2026-08-10', expectationIds: ['B2.1'], isFormative: true }
  ]
  const formativeGradeMap = {
    201: { 'std_2': { expectationScores: { 'B2.1': 60 }, masteryLevel: 60 } }
  }
  const provisionalMap = calculateSBARExpectationMastery(mockClass, formativeAssessments, formativeGradeMap)
  assert(provisionalMap['std_2']['B2.1']?.score === 60, 'Provisional score is calculated when only formative exists')
  assert(provisionalMap['std_2']['B2.1']?.isProvisional === true, 'Marked as isProvisional: true')

  // 2. Summative added -> Formative excluded from final mastery
  const combinedAssessments = [
    { assessmentId: 201, name: 'Practice Quiz', date: '2026-08-10', expectationIds: ['B2.1'], isFormative: true },
    { assessmentId: 202, name: 'Official Unit Test', date: '2026-08-15', expectationIds: ['B2.1'], isFormative: false }
  ]
  const combinedGradeMap = {
    201: { 'std_2': { expectationScores: { 'B2.1': 60 }, masteryLevel: 60 } },
    202: { 'std_2': { expectationScores: { 'B2.1': 95 }, masteryLevel: 95 } }
  }
  const summativeMap = calculateSBARExpectationMastery(mockClass, combinedAssessments, combinedGradeMap)
  assert(summativeMap['std_2']['B2.1']?.score === 95, 
    'Summative evaluation (95%) overrides formative practice (60%) rather than decaying with it')
  assert(summativeMap['std_2']['B2.1']?.isProvisional === false, 'Marked as isProvisional: false')
}
console.log()

// ── TEST GROUP 7: Overall Course Mastery Across Expectations ───────
console.log('Test Group 7: Overall Student Course Mastery Calculation')
{
  const mockClass = {
    classId: 'cls_3',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    students: {
      'std_3': { firstName: 'Charlie', lastName: 'Brown', archived: false }
    },
    expectations: [
      { code: 'C1.1', expectationId: 'c1' },
      { code: 'C1.2', expectationId: 'c2' },
      { code: 'C1.3', expectationId: 'c3' }
    ]
  }

  const mockAssessments = [
    { assessmentId: 301, date: '2026-08-10', expectationIds: ['C1.1'], assessmentType: 'summative' },
    { assessmentId: 302, date: '2026-08-12', expectationIds: ['C1.2'], assessmentType: 'summative' },
    { assessmentId: 303, date: '2026-08-14', expectationIds: ['C1.3'], assessmentType: 'summative' }
  ]

  // Scores: C1.1 = 90, C1.2 = 80, C1.3 = 70 -> Average = 80% (Level 4-)
  const mockGradeMap = {
    301: { 'std_3': { expectationScores: { 'C1.1': 90 } } },
    302: { 'std_3': { expectationScores: { 'C1.2': 80 } } },
    303: { 'std_3': { expectationScores: { 'C1.3': 70 } } }
  }

  const overallMastery = calculateSBARStudentOverallMastery('std_3', mockClass, mockAssessments, mockGradeMap)
  assert(overallMastery === 80, `Overall course mastery average is 80% (got ${overallMastery}%)`)
  assert(getSBARLevelBadge(overallMastery).level === 'L4-', 'Overall level badge is L4-')
}
console.log()

// ── TEST GROUP 8: Blank, Empty String, Null, and NaN Handling ───────
console.log('Test Group 8: Blank, Empty String, Null, and NaN Robustness')
{
  const mockClass = {
    classId: 'cls_4',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    students: {
      'std_4': { firstName: 'Dana', lastName: 'Scully', archived: false }
    },
    expectations: [
      { code: 'D1.1', expectationId: 'd1' },
      { code: 'D1.2', expectationId: 'd2' },
      { code: 'D1.3', expectationId: 'd3' }
    ]
  }

  const mockAssessments = [
    { assessmentId: 401, date: '2026-08-10', expectationIds: ['D1.1', 'D1.2', 'D1.3'], assessmentType: 'summative' },
    { assessmentId: 402, date: '2026-08-15', expectationIds: ['D1.1'], assessmentType: 'summative' }
  ]

  // D1.1 is scored 85. D1.2 has empty string "". D1.3 has null.
  const mockGradeMap = {
    401: {
      'std_4': {
        expectationScores: {
          'D1.1': 85,
          'D1.2': '', // Empty string must NOT be converted to 0%
          'D1.3': null // Null must NOT be converted to 0%
        },
        masteryLevel: 85
      }
    },
    402: {
      'std_4': {
        expectationScores: {
          'D1.1': 95
        },
        masteryLevel: 95
      }
    }
  }

  const masteryMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'decaying_average')
  const dMastery = masteryMap['std_4']

  // D1.1: 85 then 95 -> decaying average = 0.65*95 + 0.35*85 = 61.75 + 29.75 = 91.5
  assertApprox(dMastery['D1.1']?.score, 91.5, 0.1, 'D1.1 decaying average is 91.5%')
  assert(dMastery['D1.2'] === undefined || dMastery['D1.2']?.score === null, 'D1.2 with empty string "" is NOT treated as 0% and remains unassessed')
  assert(dMastery['D1.3'] === undefined || dMastery['D1.3']?.score === null, 'D1.3 with null is NOT treated as 0% and remains unassessed')
}
console.log()

// ── TEST GROUP 9: Non-Default Algorithm Mastery (Power Law, Mode, Most Recent, Highest)
console.log('Test Group 9: Full Pipeline with Non-Default SBAR Algorithms')
{
  const mockClass = {
    classId: 'cls_5',
    students: { 'std_5': { firstName: 'Fox', lastName: 'Mulder', archived: false } },
    expectations: [{ code: 'E1.1', expectationId: 'e1' }]
  }

  const mockAssessments = [
    { assessmentId: 501, date: '2026-08-01', expectationIds: ['E1.1'], assessmentType: 'summative' },
    { assessmentId: 502, date: '2026-08-05', expectationIds: ['E1.1'], assessmentType: 'summative' },
    { assessmentId: 503, date: '2026-08-10', expectationIds: ['E1.1'], assessmentType: 'summative' },
    { assessmentId: 504, date: '2026-08-15', expectationIds: ['E1.1'], assessmentType: 'summative' }
  ]

  // Scores: 50, 75, 75, 90
  const mockGradeMap = {
    501: { 'std_5': { expectationScores: { 'E1.1': 50 } } },
    502: { 'std_5': { expectationScores: { 'E1.1': 75 } } },
    503: { 'std_5': { expectationScores: { 'E1.1': 75 } } },
    504: { 'std_5': { expectationScores: { 'E1.1': 90 } } }
  }

  // Highest
  const highestMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'highest')
  assert(highestMap['std_5']['E1.1']?.score === 90, 'Highest algorithm returns 90%')

  // Most Recent (last 3: [75, 75, 90] -> avg = 80)
  const recentMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'most_recent')
  assert(recentMap['std_5']['E1.1']?.score === 80, 'Most Recent algorithm returns 80%')

  // Mode (most frequent level: 75 is Level 3 -> returns 75%)
  const modeMap = calculateSBARExpectationMastery(mockClass, mockAssessments, mockGradeMap, 'mode')
  assert(modeMap['std_5']['E1.1']?.score === 75, 'Mode algorithm returns 75%')

  // Trend detection
  assert(highestMap['std_5']['E1.1']?.trend === 'improving', 'Growth trend is correctly identified as improving (+40 delta)')
}
console.log()

// ── TEST GROUP 10: Traditional Category Grade Calculations & Formative Exclusions
console.log('Test Group 10: Traditional Grade Calculation & Formative Exclusion')
{
  const mockCatAssessments = [
    { assessmentId: 601, totalPoints: 50, scaledTotal: 50, isFormative: false },
    { assessmentId: 602, totalPoints: 100, scaledTotal: 100, isFormative: false },
    { assessmentId: 603, totalPoints: 20, scaledTotal: 20, isFormative: true } // Formative should be excluded
  ]

  const mockGradeMap = {
    601: { assessmentId: 601, score: 40, resolvedScore: 40 }, // 40/50
    602: { assessmentId: 602, score: 80, resolvedScore: 80 }, // 80/100
    603: { assessmentId: 603, score: 20, resolvedScore: 20 }  // 20/20 formative practice
  }

  // Total earned: 40 + 80 = 120. Total possible: 50 + 100 = 150. Pct = (120/150)*100 = 80.0%
  const catGrade = _calculateCategoryGrade(mockCatAssessments, mockGradeMap, true)
  assertApprox(catGrade, 80.0, 0.1, 'Traditional category grade calculates accurately with formative exclusion (80%)')

  // Missing assignment counts as 0 against scaledTotal
  const mockGradeMapWithMissing = {
    601: { assessmentId: 601, score: 40, resolvedScore: 40 },
    602: { assessmentId: 602, missing: true } // 0/100
  }
  // Total earned: 40 + 0 = 40. Total possible: 50 + 100 = 150. Pct = (40/150)*100 = 26.67%
  const missingCatGrade = _calculateCategoryGrade(mockCatAssessments, mockGradeMapWithMissing, true)
  assertApprox(missingCatGrade, 26.67, 0.1, 'Missing assessment correctly penalizes as 0/100 (26.67%)')
}
console.log()

// ── TEST GROUP 11: Retest Policy Resolutions
console.log('Test Group 11: Multi-Attempt Retest Policy Resolutions')
{
  const attempts = [
    { attemptId: 1, pointsEarned: 60, isPrimary: false },
    { attemptId: 2, pointsEarned: 85, isPrimary: true },
    { attemptId: 3, pointsEarned: 70, isPrimary: false }
  ]

  assert(resolveAttemptScore(attempts, 'highest') === 85, 'Retest policy "highest" selects 85')
  assert(resolveAttemptScore(attempts, 'latest') === 70, 'Retest policy "latest" selects 70')
  assertApprox(resolveAttemptScore(attempts, 'average'), 71.67, 0.1, 'Retest policy "average" averages attempts (71.67)')
  assert(resolveAttemptScore(attempts, 'manual') === 85, 'Retest policy "manual" selects primary attempt (85)')
}
console.log()

// ── TEST GROUP 12: Statistical Outliers & Cohort Matching
console.log('Test Group 12: Statistical Outlier Detection & Cohort Matching')
{
  // Sample: [70, 75, 80, 85, 90, 10] -> 10 is an extreme statistical outlier
  const values = [70, 75, 80, 85, 90, 10]
  const sd = calculateStandardDeviation(values)
  assert(sd > 0, `Standard deviation computed (${Math.round(sd * 10) / 10})`)
  
  const outlierResult = detectOutliers(values, 1.5)
  assert(outlierResult.outliers.includes(10), '10% is identified as a statistical outlier')
  assert(!outlierResult.clean.includes(10), '10% is excluded from clean cohort distribution')

  // Cohort string normalization & matching
  assert(isCohortMatch('Grade 7', 'grade 7') === true, 'Case-insensitive match for Grade 7')
  assert(isCohortMatch('Gr. 8', 'Grade 8') === true, 'Normalized match for Gr. 8 and Grade 8')
  assert(isCohortMatch('MTH1W', 'MTH1W') === true, 'Secondary course code match for MTH1W')
  assert(isCohortMatch('MTH1W', 'SNC1D') === false, 'Cohort mismatch between MTH1W and SNC1D')
}
console.log()

// ── TEST GROUP 13: Category Weight Normalization (Partial & Zero Weights)
console.log('Test Group 13: Category Weight Normalization & Overall Grade Math')
{
  const mockClass = {
    classId: 'cls_trad_1',
    gradingFramework: 'traditional',
    gradebookCategories: [
      { categoryId: 'cat_know', name: 'Knowledge', weight: 40 },
      { categoryId: 'cat_think', name: 'Thinking', weight: 30 },
      { categoryId: 'cat_exam', name: 'Final Exam', weight: 30 }, // Unassessed in term
      { categoryId: 'cat_diag', name: 'Diagnostic', weight: 0 }    // 0% weight diagnostic
    ],
    students: {
      'std_trad_1': { firstName: 'Fox', lastName: 'Mulder', archived: false }
    }
  }

  const mockAssessments = [
    { assessmentId: 701, categoryId: 'cat_know', totalPoints: 50, date: '2026-08-01', isFormative: false },
    { assessmentId: 702, categoryId: 'cat_think', totalPoints: 100, date: '2026-08-05', isFormative: false },
    { assessmentId: 703, categoryId: 'cat_diag', totalPoints: 20, date: '2026-08-01', isFormative: false }
  ]

  const mockGrades = [
    { assessmentId: 701, studentId: 'std_trad_1', score: 40, resolvedScore: 40 }, // 40/50 = 80%
    { assessmentId: 702, studentId: 'std_trad_1', score: 90, resolvedScore: 90 }, // 90/100 = 90%
    { assessmentId: 703, studentId: 'std_trad_1', score: 10, resolvedScore: 10 }  // 10/20 = 50% (weight 0)
  ]

  const gradeResult = await calculateStudentGrade('std_trad_1', mockClass, {
    assessmentsPreRef: mockAssessments,
    gradesPreRef: mockGrades
  })

  // Knowledge: 80% (weight 40), Thinking: 90% (weight 30), Weight used = 70.
  // Weighted sum: 80 * 0.40 + 90 * 0.30 = 32 + 27 = 59.
  // Normalized overall = (59 / 70) * 100 = 84.2857% -> 84% rounded.
  assert(gradeResult.categoryResults['cat_know'].percentage === 80, 'Knowledge category is 80%')
  assert(gradeResult.categoryResults['cat_think'].percentage === 90, 'Thinking category is 90%')
  assert(gradeResult.weightUsed === 70, 'Weight used correctly totals 70% during term')
  assert(gradeResult.overallGrade === 84, 'Normalized overall term grade is 84% (59/70)')
  assert(gradeResult.calculatedOverallGrade === 84, 'Calculated overall matches display overall')
}
console.log()

// ── TEST GROUP 14: Scaled Totals vs Raw Points Math
console.log('Test Group 14: Scaled Totals & Weighting Multipliers')
{
  // Test assessment where score is out of 30, but scaled to count as 60 possible points
  const assessments = [
    { assessmentId: 801, totalPoints: 30, scaledTotal: 60, isFormative: false },
    { assessmentId: 802, totalPoints: 40, scaledTotal: 40, isFormative: false }
  ]

  // Student scored 15/30 on #801 (scaled to 30/60) and 40/40 on #802 (40/40)
  const gradeMap = {
    801: { assessmentId: 801, score: 15, resolvedScore: 15 },
    802: { assessmentId: 802, score: 40, resolvedScore: 40 }
  }

  // Total earned: 30 + 40 = 70. Total possible: 60 + 40 = 100. Pct = (70/100)*100 = 70%
  const catPct = _calculateCategoryGrade(assessments, gradeMap, true)
  assert(catPct === 70, 'Scaled total weighting produces exact 70% result')
}
console.log()

// ── TEST GROUP 15: Grade Adjustments, Category Overrides & Historical AsOf Cutoff
console.log('Test Group 15: Student Overrides, Adjusted Grades & Milestone AsOf Cutoffs')
{
  const mockClass = {
    classId: 'cls_trad_2',
    gradingFramework: 'traditional',
    gradebookCategories: [
      { categoryId: 'cat_k', name: 'Knowledge', weight: 50 },
      { categoryId: 'cat_a', name: 'Application', weight: 50 }
    ],
    students: {
      'std_adj_1': {
        firstName: 'Dana',
        lastName: 'Scully',
        adjustedGrade: 88, // Teacher manual override to 88%
        categoryOverrides: {
          'cat_k': 95 // Override Knowledge to 95%
        }
      }
    }
  }

  const mockAssessments = [
    { assessmentId: 901, categoryId: 'cat_k', totalPoints: 100, date: '2026-08-01', isFormative: false },
    { assessmentId: 902, categoryId: 'cat_a', totalPoints: 100, date: '2026-08-10', isFormative: false },
    { assessmentId: 903, categoryId: 'cat_a', totalPoints: 100, date: '2026-08-25', isFormative: false } // After asOf date
  ]

  const mockGrades = [
    { assessmentId: 901, studentId: 'std_adj_1', score: 60, resolvedScore: 60 },
    { assessmentId: 902, studentId: 'std_adj_1', score: 80, resolvedScore: 80 },
    { assessmentId: 903, studentId: 'std_adj_1', score: 100, resolvedScore: 100 }
  ]

  // Historical asOf cutoff: '2026-08-15' (ignores #903)
  const result = await calculateStudentGrade('std_adj_1', mockClass, {
    asOf: '2026-08-15',
    assessmentsPreRef: mockAssessments,
    gradesPreRef: mockGrades
  })

  assert(result.isGradeAdjusted === true, 'isGradeAdjusted is true')
  assert(result.overallGrade === 88, 'Display overall grade reflects manual adjustedGrade (88%)')
  assert(result.categoryResults['cat_k'].isOverridden === true, 'Knowledge category is marked as overridden')
  assert(result.categoryResults['cat_k'].percentage === 95, 'Knowledge category reflects overridden 95%')
  assert(result.categoryResults['cat_a'].percentage === 80, 'Application category calculated as 80% (ignoring post-asOf 100%)')
}
console.log()

// ── TEST GROUP 17: Bonus Marks >100% & Final Mark 100% Lockdown
console.log('Test Group 17: Bonus Marks >100% & Final Mark 100% Lockdown')
{
  const mockClass = {
    classId: 'cls_trad_bonus',
    gradingFramework: 'traditional',
    gradebookCategories: [
      { categoryId: 'cat_k', name: 'Knowledge', weight: 50 },
      { categoryId: 'cat_t', name: 'Thinking', weight: 50 }
    ],
    students: {
      'std_bonus_1': { firstName: 'Dana', lastName: 'Scully', archived: false },
      'std_bonus_2': { firstName: 'Fox', lastName: 'Mulder', archived: false }
    }
  }

  // Student 1: 55/50 (110%) on Knowledge, 40/50 (80%) on Thinking.
  // Weighted: 110*0.5 + 80*0.5 = 55 + 40 = 95%. Bonus in Knowledge offsets Thinking deficit!
  // Student 2: 55/50 (110%) on Knowledge, 52/50 (104%) on Thinking.
  // Weighted: 110*0.5 + 104*0.5 = 55 + 52 = 107% raw. Capped to 100% when capGradesAt100 is true!
  const mockAssessments = [
    { assessmentId: 1001, categoryId: 'cat_k', totalPoints: 50, date: '2026-08-01', isFormative: false },
    { assessmentId: 1002, categoryId: 'cat_t', totalPoints: 50, date: '2026-08-05', isFormative: false }
  ]

  const mockGradesStudent1 = [
    { assessmentId: 1001, studentId: 'std_bonus_1', score: 55, resolvedScore: 55 },
    { assessmentId: 1002, studentId: 'std_bonus_1', score: 40, resolvedScore: 40 }
  ]

  const mockGradesStudent2 = [
    { assessmentId: 1001, studentId: 'std_bonus_2', score: 55, resolvedScore: 55 },
    { assessmentId: 1002, studentId: 'std_bonus_2', score: 52, resolvedScore: 52 }
  ]

  // Case A: Student 1 (110% in K + 80% in T = 95% overall)
  const res1 = await calculateStudentGrade('std_bonus_1', mockClass, {
    assessmentsPreRef: mockAssessments,
    gradesPreRef: mockGradesStudent1,
    settingsPreRef: { capGradesAt100: true }
  })
  assert(res1.categoryResults['cat_k'].percentage === 110, 'Knowledge category reflects 110% with bonus points')
  assert(res1.categoryResults['cat_t'].percentage === 80, 'Thinking category is 80%')
  assert(res1.overallGrade === 95, 'Bonus in Knowledge correctly offsets Thinking deficit to produce 95% overall')

  // Case B: Student 2 with capGradesAt100 = true (110% in K + 104% in T = 107% raw -> capped to 100%)
  const res2Capped = await calculateStudentGrade('std_bonus_2', mockClass, {
    assessmentsPreRef: mockAssessments,
    gradesPreRef: mockGradesStudent2,
    settingsPreRef: { capGradesAt100: true }
  })
  assert(res2Capped.rawOverallGrade === 107, 'Raw overall grade preserves 107% before cap')
  assert(res2Capped.overallGrade === 100, 'Final overall grade is locked down to 100% when capGradesAt100 is true')

  // Case C: Student 2 with capGradesAt100 = false (leaves uncapped 107%)
  const res2Uncapped = await calculateStudentGrade('std_bonus_2', mockClass, {
    assessmentsPreRef: mockAssessments,
    gradesPreRef: mockGradesStudent2,
    settingsPreRef: { capGradesAt100: false }
  })
  assert(res2Uncapped.overallGrade === 107, `Final overall grade preserves 107% when capGradesAt100 is toggled off (got ${res2Uncapped?.overallGrade})`)
}
console.log()

// ── TEST GROUP 18: User-Defined Category Names (Labs, Tests, Projects, Activities, Exam)
console.log('Test Group 18: Custom Category Structures (Labs, Tests, Projects, Activities, Exam)')
{
  const mockClass = {
    classId: 'cls_custom_cats',
    gradingFramework: 'traditional',
    gradebookCategories: [
      { categoryId: 'cat_labs', name: 'Labs & Practical', weight: 20 },
      { categoryId: 'cat_tests', name: 'Unit Tests', weight: 40 },
      { categoryId: 'cat_proj', name: 'Projects & Activities', weight: 20 },
      { categoryId: 'cat_exam', name: 'Final Exam', weight: 20 }
    ],
    students: {
      'std_sci_1': { firstName: 'Marie', lastName: 'Curie', archived: false }
    }
  }

  const mockAssessments = [
    { assessmentId: 1101, categoryId: 'cat_labs', totalPoints: 40, date: '2026-08-01', isFormative: false },
    { assessmentId: 1102, categoryId: 'cat_tests', totalPoints: 100, date: '2026-08-10', isFormative: false },
    { assessmentId: 1103, categoryId: 'cat_proj', totalPoints: 50, date: '2026-08-15', isFormative: false }
  ]

  const mockGrades = [
    { assessmentId: 1101, studentId: 'std_sci_1', score: 44, resolvedScore: 44 }, // 44/40 = 110% (bonus)
    { assessmentId: 1102, studentId: 'std_sci_1', score: 80, resolvedScore: 80 }, // 80/100 = 80%
    { assessmentId: 1103, studentId: 'std_sci_1', score: 45, resolvedScore: 45 }  // 45/50 = 90%
  ]

  const res = await calculateStudentGrade('std_sci_1', mockClass, {
    assessmentsPreRef: mockAssessments,
    gradesPreRef: mockGrades,
    settingsPreRef: { capGradesAt100: true }
  })

  // (110 * 0.20) + (80 * 0.40) + (90 * 0.20) = 22 + 32 + 18 = 72.
  // Weight used = 80. (72 / 80) * 100 = 90%.
  assert(res.categoryResults['cat_labs'].percentage === 110, 'Custom "Labs & Practical" category is 110%')
  assert(res.categoryResults['cat_tests'].percentage === 80, 'Custom "Unit Tests" category is 80%')
  assert(res.categoryResults['cat_proj'].percentage === 90, 'Custom "Projects & Activities" category is 90%')
  assert(res.weightUsed === 80, 'Weight used totals 80% with unassessed Exam')
  assert(res.overallGrade === 90, 'Term grade calculates precisely to 90%')
}
console.log()

// ── TEST GROUP 19: Most Consistent & Weighted Median Across Traditional Categories
console.log('Test Group 19: Most Consistent & Weighted Median Analytics')
{
  const mockClass = {
    classId: 'cls_analytics_test',
    gradebookCategories: [
      { categoryId: 'c1', name: 'Tests', weight: 60 },
      { categoryId: 'c2', name: 'Quizzes', weight: 40 }
    ],
    students: {
      'std_an_1': { firstName: 'Alan', lastName: 'Turing', archived: false }
    }
  }

  const mockAssessments = [
    { assessmentId: 1201, categoryId: 'c1', totalPoints: 100, date: '2026-08-01' },
    { assessmentId: 1202, categoryId: 'c1', totalPoints: 100, date: '2026-08-05' },
    { assessmentId: 1203, categoryId: 'c1', totalPoints: 100, date: '2026-08-10' },
    { assessmentId: 1204, categoryId: 'c2', totalPoints: 100, date: '2026-08-02' },
    { assessmentId: 1205, categoryId: 'c2', totalPoints: 100, date: '2026-08-06' }
  ]

  // c1 scores: [72, 75, 78] (all Level 3, 70-79% bucket) -> mean of bucket = 75
  // c2 scores: [90, 94] (all Level 4, 90%+ bucket) -> mean of bucket = 92
  const mockGradeMap = {
    1201: { resolvedScore: 72 },
    1202: { resolvedScore: 75 },
    1203: { resolvedScore: 78 },
    1204: { resolvedScore: 90 },
    1205: { resolvedScore: 94 }
  }

  const mc = calculateMostConsistent('std_an_1', mockClass, mockGradeMap, mockAssessments, true)
  // Weighted: (75 * 0.60) + (92 * 0.40) = 45 + 36.8 = 81.8 -> 82% rounded
  assertApprox(mc.percentage, 81.8, 0.2, 'Most Consistent mode calculation produces 81.8% weighted grade')
  assert(mc.categoryBreakdown['c1'].bucketLabel === '70-79%', 'c1 bucket label is 70-79%')

  const med = calculateWeightedMedian('std_an_1', mockClass, mockGradeMap, mockAssessments, true)
  // c1 median: 75, c2 median: 92. Weighted median: (75*0.6) + (92*0.4) = 81.8
  assertApprox(med.percentage, 81.8, 0.2, 'Weighted Median calculation produces 81.8%')
}
console.log()

// ── TEST GROUP 20: Elementary Split-Class & Modified Subject Accommodations
console.log('Test Group 20: Elementary Split-Class Cohort & Subject Accommodations')
{
  const mockClass = {
    classId: 'cls_elem_split',
    classType: 'elementary',
    activeSubjectId: 'sub_math',
    gradebookCategories: [
      { categoryId: 'c_math', name: 'Math Work', weight: 100 }
    ],
    students: {
      'std_split_1': {
        firstName: 'Ada',
        lastName: 'Lovelace',
        gradeLevel: 'Grade 7',
        accommodations: {
          modifiedSubjectGrades: {
            'sub_math': 'Grade 8' // Working on Grade 8 Math curriculum
          }
        }
      }
    }
  }

  const mockAssessments = [
    { assessmentId: 1301, categoryId: 'c_math', totalPoints: 50, gradeLevel: 'Grade 7', isFormative: false },
    { assessmentId: 1302, categoryId: 'c_math', totalPoints: 50, gradeLevel: 'Grade 8', isFormative: false }
  ]

  const mockGrades = [
    { assessmentId: 1301, studentId: 'std_split_1', score: 30, resolvedScore: 30 }, // Gr 7 (should be filtered out)
    { assessmentId: 1302, studentId: 'std_split_1', score: 45, resolvedScore: 45 }  // Gr 8 (45/50 = 90%)
  ]

  const res = await calculateStudentGrade('std_split_1', mockClass, {
    assessmentsPreRef: mockAssessments,
    gradesPreRef: mockGrades,
    settingsPreRef: { capGradesAt100: true }
  })

  assert(res.overallGrade === 90, 'Student accurately assessed against Grade 8 accommodation (90%), ignoring Grade 7 tasks')
}
console.log()

// ── SUMMARY ───────────────────────────────────────────────────────
console.log('====================================================')
console.log(`Results: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`)
if (failedTests === 0) {
  console.log('🎉 ALL ARCHITECTURAL, MATH & PIPELINE TESTS PASSED!')
} else {
  console.error(`⚠️ ${failedTests} TESTS FAILED!`)
  process.exit(1)
}
console.log('====================================================\n')
