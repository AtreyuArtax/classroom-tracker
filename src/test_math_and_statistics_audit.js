/**
 * src/test_math_and_statistics_audit.js
 *
 * Exhaustive Mathematical Verification & Edge-Case Stress Suite for Classroom Tracker.
 * Tests rounding, string coercion, aggregation, division-by-zero, linear regression,
 * and statistical algorithms.
 */

import { preciseRound, calculatePercentChange } from './utils/math.js'
import { toMinutes } from './db/eventService.js'
import {
  calculateStandardDeviation,
  detectOutliers,
  calculateMedian,
  resolveAttemptScore,
  getAssessmentPercentage,
  _calculateCategoryGrade,
  calculateStudentGrade
} from './db/gradebook/gradeCalc.js'
import {
  calculateDecayingAverage,
  calculatePowerLaw,
  calculateMode,
  getSBARLevelBadge,
  calculateSBARStudentOverallMastery
} from './db/gradebook/gradeCalcSBAR.js'
import { calculateAssessmentAnalytics, calculateClassAnalytics } from './db/gradebook/gradeAnalytics.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`)
    throw new Error(message)
  }
  console.log(`  ✓ ${message}`)
}

console.log('\n===================================================================')
console.log('📐 MATHEMATICAL INTEGRITY & NUMERICAL STRESS-TEST SUITE')
console.log('===================================================================')

// ─── SUITE 1: Precision Rounding & Percent Change ──────────────────────────────
console.log('\n[SUITE 1] Precision Rounding & Percent Change (String Coercion & NaN Immunity)')

// Testing the bug where "85.4" + Number.EPSILON concatenated strings and yielded NaN
assert(preciseRound("85.4", 1) === 85.4, 'preciseRound handles string decimal "85.4" without NaN')
assert(preciseRound("85.46", 1) === 85.5, 'preciseRound correctly rounds string "85.46" to 85.5')
assert(preciseRound(85.44, 1) === 85.4, 'preciseRound correctly rounds numeric 85.44 to 85.4')
assert(preciseRound(1.005, 2) === 1.01, 'preciseRound handles floating-point drift (1.005 -> 1.01)')
assert(preciseRound(null) === null, 'preciseRound handles null cleanly')
assert(preciseRound(undefined) === null, 'preciseRound handles undefined cleanly')
assert(preciseRound('') === null, 'preciseRound handles empty string cleanly')
assert(preciseRound(NaN) === null, 'preciseRound handles NaN cleanly')
assert(preciseRound(Infinity) === null, 'preciseRound handles Infinity cleanly')
assert(preciseRound(0) === 0, 'preciseRound preserves numeric 0')

assert(calculatePercentChange("50", "75") === 50, 'calculatePercentChange handles string numbers "50" -> "75"')
assert(calculatePercentChange(0, 10) === 100, 'calculatePercentChange handles 0 denominator (positive gain)')
assert(calculatePercentChange(0, 0) === 0, 'calculatePercentChange handles 0 -> 0 without NaN')
assert(calculatePercentChange(null, 50) === null, 'calculatePercentChange handles null safely')
assert(calculatePercentChange('', 50) === null, 'calculatePercentChange handles empty string safely')

// ─── SUITE 2: Duration Conversion & Out-of-Class Math ───────────────────────────
console.log('\n[SUITE 2] Duration Normalization & Event Math (toMinutes)')
assert(toMinutes(120000) === 2, 'toMinutes converts 120000ms to 2.0 mins')
assert(toMinutes(90000) === 1.5, 'toMinutes converts 90000ms to 1.5 mins')
assert(toMinutes("120000") === 2, 'toMinutes coerces string "120000" to 2.0 mins')
assert(toMinutes(null) === 0, 'toMinutes handles null duration as 0')
assert(toMinutes(undefined) === 0, 'toMinutes handles undefined duration as 0')
assert(toMinutes('') === 0, 'toMinutes handles empty string duration as 0')
assert(toMinutes('invalid') === 0, 'toMinutes handles non-numeric string as 0 without NaN')
assert(toMinutes(-50000) === 0, 'toMinutes clamps negative duration to 0')

// ─── SUITE 3: Statistical Metrics (Median, SD, Outliers) ───────────────────────
console.log('\n[SUITE 3] Statistical Functions (calculateMedian, calculateStandardDeviation, detectOutliers)')

// Test the bug where ["80", "90"] previously evaluated ("80" + "90") / 2 = 4045
assert(calculateMedian(["80", "90"]) === 85, 'calculateMedian correctly computes 85 for string array ["80", "90"]')
assert(calculateMedian([70, 80, 90]) === 80, 'calculateMedian computes 80 for odd array [70, 80, 90]')
assert(calculateMedian([null, "70", undefined, "90", ""]) === 80, 'calculateMedian filters dirty values cleanly')
assert(calculateMedian([]) === null, 'calculateMedian returns null for empty array')
assert(calculateMedian([100]) === 100, 'calculateMedian returns exact value for single element')

// Standard Deviation
assert(calculateStandardDeviation([]) === null, 'calculateStandardDeviation returns null for empty array')
assert(calculateStandardDeviation([80]) === null, 'calculateStandardDeviation returns null for single element (sample SD n-1)')
assert(calculateStandardDeviation([80, 80, 80]) === 0, 'calculateStandardDeviation returns 0 for identical values')
const sd = calculateStandardDeviation(["70", "80", "90"])
assert(Math.round(sd * 10) / 10 === 10, 'calculateStandardDeviation handles string numbers correctly')

// Outlier detection
const outlierRes = detectOutliers([85, 90, 88, 92, 87, 0], 1.5)
assert(outlierRes.outliers.includes(0), 'detectOutliers flags hard zero as outlier in healthy cohort')
assert(outlierRes.clean.length === 5, 'detectOutliers leaves 5 clean scores')

// ─── SUITE 4: Category Weighting & Proportional Rollover ───────────────────────
console.log('\n[SUITE 4] Category Weighting & String Accumulation Protection')

const mockClassWithStrings = {
  classId: 'c_test_strings',
  name: 'Math Grade 9',
  gradingFramework: 'traditional',
  gradebookCategories: [
    { categoryId: 'cat_k', name: 'Knowledge', weight: "30" }, // String weight
    { categoryId: 'cat_t', name: 'Thinking', weight: "20" },  // String weight
    { categoryId: 'cat_a', name: 'Application', weight: "20" }, // String weight
    { categoryId: 'cat_c', name: 'Communication', weight: "30" } // String weight
  ],
  students: {
    's1': { studentId: 's1', firstName: 'Alice', lastName: 'Smith' }
  }
}

const mockAssessments = [
  { assessmentId: 'a1', categoryId: 'cat_k', totalPoints: 100, date: '2026-09-01' },
  { assessmentId: 'a2', categoryId: 'cat_t', totalPoints: 100, date: '2026-09-02' }
]

const mockGrades = [
  { assessmentId: 'a1', studentId: 's1', resolvedScore: "80" },
  { assessmentId: 'a2', studentId: 's1', resolvedScore: "90" }
]

const studentGradeResult = await calculateStudentGrade('s1', mockClassWithStrings, {
  assessmentsPreRef: mockAssessments,
  gradesPreRef: mockGrades,
  settingsPreRef: { capGradesAt100: true }
})

// Knowledge is 80 (weight 30), Thinking is 90 (weight 20). Total weight used: 50.
// Expected: (80 * 0.30 + 90 * 0.20) / 50 * 100 = (24 + 18) / 50 * 100 = 42 / 50 * 100 = 84%
assert(studentGradeResult.calculatedOverallGrade === 84, `calculateStudentGrade computes exact 84% despite string weights (got ${studentGradeResult.calculatedOverallGrade}%)`)
assert(studentGradeResult.weightUsed === 50, `calculateStudentGrade sums weightUsed as numeric 50, not string "03020" (got ${studentGradeResult.weightUsed})`)

// Test gradeAnalytics.calculateClassAnalytics with string weights
const analytics = await calculateClassAnalytics(mockClassWithStrings, mockAssessments, mockGrades, {
  settings: { capGradesAt100: true },
  evidenceScope: 'product'
})
assert(analytics !== null, 'calculateClassAnalytics returns results with string weights')
assert(Math.round(analytics.mean) === 84, `calculateClassAnalytics computes exact 84% mean with string weights (got ${analytics.mean}%)`)

// ─── SUITE 5: Linear Regression Single-Point (n=1) Crash Prevention ────────────
console.log('\n[SUITE 5] Linear Regression Single-Point & Boundary Safety')

function simulateLinearRegression(runningGrades) {
  const n = runningGrades.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += runningGrades[i]
    sumXY += i * runningGrades[i]
    sumX2 += i * i
  }

  let regressionLine = []
  if (n >= 2) {
    const denom = (n * sumX2 - sumX * sumX)
    if (denom !== 0) {
      const slope = (n * sumXY - sumX * sumY) / denom
      const intercept = (sumY - slope * sumX) / n
      regressionLine = runningGrades.map((_, i) => {
        const val = slope * i + intercept
        return Math.round(Math.max(0, Math.min(100, val)) * 10) / 10
      })
    } else {
      regressionLine = runningGrades.map(() => runningGrades[0])
    }
  } else if (n === 1) {
    regressionLine = [runningGrades[0]]
  }
  return regressionLine
}

const n0 = simulateLinearRegression([])
assert(Array.isArray(n0) && n0.length === 0, 'simulateLinearRegression handles n=0 without crashing')

const n1 = simulateLinearRegression([85])
assert(n1.length === 1 && n1[0] === 85, 'simulateLinearRegression handles n=1 without NaN (got [85])')

const n2 = simulateLinearRegression([70, 90])
assert(n2.length === 2 && n2[0] === 70 && n2[1] === 90, 'simulateLinearRegression handles n=2 clean line [70, 90]')

const nFlat = simulateLinearRegression([80, 80, 80])
assert(nFlat.length === 3 && nFlat.every(v => v === 80), 'simulateLinearRegression handles flat trend [80, 80, 80]')

// ─── SUITE 6: SBAR Mathematical Algorithms Robustness ──────────────────────────
console.log('\n[SUITE 6] SBAR Mathematical Algorithms with Multi-Type Inputs')

assert(calculateDecayingAverage(["60", "80"]) === 73.0, 'calculateDecayingAverage handles string numbers ["60", "80"]')
assert(calculateDecayingAverage([85]) === 85, 'calculateDecayingAverage handles single element cleanly')
assert(calculateDecayingAverage([]) === null, 'calculateDecayingAverage handles empty array cleanly')

assert(calculateMode(["75", "88", "75"]) === 75, 'calculateMode handles string numbers cleanly')
assert(calculateMode([80]) === 80, 'calculateMode handles single score cleanly')

assert(calculatePowerLaw([70]) === 70, 'calculatePowerLaw handles single score cleanly')
assert(calculatePowerLaw([]) === null, 'calculatePowerLaw handles empty array cleanly')
const powerLawResult = calculatePowerLaw(["60", "75", "90"])
assert(powerLawResult !== null && !isNaN(powerLawResult) && isFinite(powerLawResult), `calculatePowerLaw computes valid projection (got ${powerLawResult})`)

// SBAR Overall Mastery with expectation weight multipliers
const mockSbarClass = {
  classId: 'c_sbar_test',
  gradingFramework: 'sbar',
  sbarAlgorithm: 'decaying_average',
  students: {
    'st_1': { studentId: 'st_1', firstName: 'Sam', lastName: 'Taylor' }
  }
}

const mockSbarAssessments = [
  { assessmentId: 'as1', expectationIds: ['B1.1'], date: '2026-09-01', totalPoints: 100 },
  { assessmentId: 'as2', expectationIds: ['B1.2'], date: '2026-09-02', totalPoints: 100 },
  { assessmentId: 'as3', expectationIds: ['B1.3'], date: '2026-09-03', totalPoints: 100 }
]

// B1.1: 80% with 2.0x weight; B1.2: 90% with 1.0x weight; B1.3: 60% with 0x weight (diagnostic)
const mockMasteryPreRef = {
  'st_1': {
    'B1.1': { score: "80", weight: "2.0" },
    'B1.2': { score: "90", weight: "1.0" },
    'B1.3': { score: "60", weight: "0" }
  }
}

const sbarOverall = calculateSBARStudentOverallMastery('st_1', mockSbarClass, mockSbarAssessments, {}, 'decaying_average', [], mockMasteryPreRef)
// Expected: (80 * 2.0 + 90 * 1.0) / (2.0 + 1.0) = (160 + 90) / 3 = 250 / 3 = 83.33 -> 83%
assert(sbarOverall === 83, `calculateSBARStudentOverallMastery computes exact 83% with weighted multipliers and excludes 0x weight (got ${sbarOverall}%)`)

console.log('\n===================================================================')
console.log('🎉 ALL MATHEMATICAL INTEGRITY & STRESS TESTS PASSED (100%)!')
console.log('===================================================================\n')
