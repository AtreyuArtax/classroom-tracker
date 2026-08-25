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

// ── SUMMARY ───────────────────────────────────────────────────────
console.log('====================================================')
console.log(`Results: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`)
if (failedTests === 0) {
  console.log('🎉 ALL SBAR MATH & PIPELINE TESTS PASSED!')
} else {
  console.error(`⚠️ ${failedTests} TESTS FAILED!`)
  process.exit(1)
}
console.log('====================================================\n')
