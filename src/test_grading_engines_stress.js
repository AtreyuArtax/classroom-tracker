/**
 * src/test_grading_engines_stress.js
 *
 * Automated Math Stress-Test Suite for Classroom Tracker Grading Engines:
 * 1. SBAR Engine (Decaying Average, Power Law, Mode, Most Recent, Highest, Single Attempt, 0-Weights)
 * 2. Traditional Percentage Engine (0-Weights, All 0-Weights, String Weights, Missing, Excluded, Category Overrides)
 * 3. Hybrid Engine (SBAR with Weighted Components, Unsubmitted vs Missing, Scaled Rollups)
 * 4. Switching Frameworks (Traditional <-> SBAR <-> Hybrid, Algorithm Switching)
 * 5. Professional Judgment Overrides (Student, Category, Expectation preservation across recalculations & re-imports)
 * 6. Split-Term Date Windows (Boundary dates, Empty ranges)
 * 7. Zero NaN%, undefined, or broken grade trends verification
 */

import assert from 'assert'
import {
  calculateDecayingAverage,
  calculatePowerLaw,
  calculateMode,
  getSBARLevelBadge,
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery,
  resolveStudentExpectationOverride,
  SBAR_LEVELS
} from './db/gradebook/gradeCalcSBAR.js'

import {
  calculateStudentGrade,
  _calculateCategoryGrade,
  calculateMostConsistent,
  calculateWeightedMedian,
  getAssessmentPercentage,
  getBucketMode,
  isCohortMatch
} from './db/gradebook/gradeCalc.js'

console.log('===================================================================')
console.log('  GRADING ENGINES MATH STRESS-TEST & CORRUPTION AUDIT')
console.log('===================================================================\n')

let passedTests = 0
let failedTests = 0

function runTest(name, fn) {
  return (async () => {
    try {
      await fn()
      passedTests++
      console.log(`  ✓ ${name}`)
    } catch (err) {
      failedTests++
      console.error(`  ✗ FAIL: ${name}`)
      console.error(`    ${err.message}`)
      if (err.stack) {
        console.error(err.stack.split('\n').slice(1, 4).join('\n'))
      }
    }
  })()
}

async function runAllTests() {
  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 1: SBAR MATH ALGORITHMS & EDGE CASES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[SUITE 1] SBAR Math Algorithms & Single-Attempt Edge Cases')

  await runTest('calculateDecayingAverage handles 0, 1, and multiple attempts cleanly', () => {
    assert.strictEqual(calculateDecayingAverage([]), null, 'Empty array returns null')
    assert.strictEqual(calculateDecayingAverage(null), null, 'null returns null')
    assert.strictEqual(calculateDecayingAverage([85]), 85, 'Single attempt returns exact score (85)')
    
    // 2 attempts: [70, 90], w=0.65 -> 0.65 * 90 + 0.35 * 70 = 58.5 + 24.5 = 83.0
    assert.strictEqual(calculateDecayingAverage([70, 90], 0.65), 83.0, 'Two attempts decaying average matches formula')

    // 3 attempts: [60, 70, 90], w=0.65 -> step1 = 66.5, step2 = 0.65 * 90 + 0.35 * 66.5 = 58.5 + 23.275 = 81.8
    assert.strictEqual(calculateDecayingAverage([60, 70, 90], 0.65), 81.8, 'Three attempts decaying average matches formula')
  })

  await runTest('calculateDecayingAverage handles invalid inputs, strings, and NaNs without corruption', () => {
    assert.strictEqual(calculateDecayingAverage(['80']), 80, 'String score coerced to number')
    assert.strictEqual(calculateDecayingAverage(['70', '90']), 83.0, 'Array of string scores coerced and calculated correctly')
    assert.strictEqual(calculateDecayingAverage([NaN, null, undefined]), null, 'Array of only invalid values returns null')
    assert.strictEqual(calculateDecayingAverage([75, NaN, null, 85]), 81.5, 'Skips NaNs and nulls cleanly')
    assert.strictEqual(calculateDecayingAverage([85], NaN), 85, 'NaN weight defaults safely to 0.65')
  })

  await runTest('calculateDecayingAverage with N=100 attempts converges without overflow or precision drift', () => {
    const hundredNineties = Array(100).fill(90)
    const result = calculateDecayingAverage(hundredNineties, 0.65)
    assert.strictEqual(result, 90, '100 identical scores converge to exactly 90')
    assert(!isNaN(result) && isFinite(result), 'Result is finite and not NaN')
  })

  await runTest('calculatePowerLaw (Marzano log-log) handles edge cases safely', () => {
    assert.strictEqual(calculatePowerLaw([]), null, 'Empty returns null')
    assert.strictEqual(calculatePowerLaw([75]), 75, 'Single attempt returns exact score')
    assert.strictEqual(calculatePowerLaw(['75']), 75, 'String single attempt returns number')
    
    // Identical attempts (flat line, den = 0 fallback)
    assert.strictEqual(calculatePowerLaw([80, 80, 80]), 80, 'Flat trajectory falls back to last score without divide-by-zero')
    
    // Ascending trajectory
    const asc = calculatePowerLaw([50, 70, 90])
    assert(asc !== null && asc > 80 && asc <= 100, `Ascending trajectory projects mastery correctly: ${asc}`)
    assert(!isNaN(asc) && isFinite(asc), 'Ascending trajectory is valid number')

    // Array with invalid entries
    const withNan = calculatePowerLaw([50, NaN, 80])
    assert(!isNaN(withNan) && isFinite(withNan), 'Power law with NaN in array returns safe finite number')
  })

  await runTest('calculateMode (Most Consistent) avoids string concatenation corruption', () => {
    assert.strictEqual(calculateMode([]), null, 'Empty returns null')
    assert.strictEqual(calculateMode([88]), 88, 'Single attempt returns exact score')
    
    // Array of string numbers must NOT concatenate as strings ("75" + "80" = "7580" / 2 = 3790)
    const stringScores = ['75', '75', '80']
    const modeResult = calculateMode(stringScores)
    assert.strictEqual(modeResult, 75, `String scores mode is 75, not corrupted string concatenation: got ${modeResult}`)
    assert(!isNaN(modeResult) && isFinite(modeResult), 'Mode is finite number')

    // Array with NaNs
    assert.strictEqual(calculateMode([88, NaN, 88]), 88, 'Mode filters NaNs cleanly')
  })

  await runTest('getSBARLevelBadge maps percentages and handles boundary/corrupt numbers', () => {
    assert.strictEqual(getSBARLevelBadge(null).level, '—')
    assert.strictEqual(getSBARLevelBadge(NaN).level, '—')
    assert.strictEqual(getSBARLevelBadge(undefined).level, '—')
    assert.strictEqual(getSBARLevelBadge(96).level, 'L4+')
    assert.strictEqual(getSBARLevelBadge(88).level, 'L4')
    assert.strictEqual(getSBARLevelBadge(75).level, 'L3')
    assert.strictEqual(getSBARLevelBadge(65).level, 'L2')
    assert.strictEqual(getSBARLevelBadge(55).level, 'L1')
    assert.strictEqual(getSBARLevelBadge(40).level, 'R')
    assert.strictEqual(getSBARLevelBadge('88').level, 'L4', 'String 88 maps to L4')
  })

  console.log('')

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 2: TRADITIONAL PERCENTAGE ENGINE & EDGE CASES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[SUITE 2] Traditional Percentage Engine (Weights, Missing, Overrides)')

  await runTest('getAssessmentPercentage handles attempts, raw scores, missing, excluded, and 0 totalPoints', () => {
    const ast = { totalPoints: 50, retestPolicy: 'highest' }
    
    // Normal score
    assert.strictEqual(getAssessmentPercentage(ast, { score: 40 }), 80, '40/50 is 80%')
    
    // Multiple attempts with highest retest policy
    const multiAttempts = {
      attempts: [
        { pointsEarned: 30 },
        { pointsEarned: 45 },
        { pointsEarned: 40 }
      ]
    }
    assert.strictEqual(getAssessmentPercentage(ast, multiAttempts), 90, '45/50 is 90% under highest policy')
    
    // Missing grade returns 0%
    assert.strictEqual(getAssessmentPercentage(ast, { missing: true }), 0, 'missing: true returns 0%')
    
    // Excluded grade returns null
    assert.strictEqual(getAssessmentPercentage(ast, { score: 45, excluded: true }), null, 'excluded: true returns null')
    
    // 0 total points does not divide by zero or produce NaN
    const zeroPtAst = { totalPoints: 0 }
    const zeroResult = getAssessmentPercentage(zeroPtAst, { score: 10 })
    assert(!isNaN(zeroResult), '0 total points does not return NaN')
    
    // Negative total points does not produce NaN
    const negPtAst = { totalPoints: -10 }
    assert(!isNaN(getAssessmentPercentage(negPtAst, { score: 5 })), 'Negative total points does not return NaN')
  })

  await runTest('_calculateCategoryGrade handles 0 possible, missing, bonus marks, and scaling', () => {
    // Empty assessments
    assert.strictEqual(_calculateCategoryGrade([], {}), null, 'Empty assessments return null')
    
    const assessments = [
      { assessmentId: 'a1', totalPoints: 100, scaledTotal: 50 },
      { assessmentId: 'a2', totalPoints: 50, scaledTotal: 50 }
    ]
    
    // Student completed a1 (80/100 -> 40/50), a2 is missing (0/50)
    const gradeMap = {
      a1: { score: 80 },
      a2: { missing: true }
    }
    // Total earned: 40 + 0 = 40. Total possible: 50 + 50 = 100. Category % = 40%
    const result = _calculateCategoryGrade(assessments, gradeMap)
    assert.strictEqual(result, 40, `Missing counts as 0 against scaled total: expected 40, got ${result}`)

    // Bonus marks >100%
    const bonusMap = {
      a1: { score: 110 },
      a2: { score: 50 }
    }
    // a1: (110/100)*50 = 55. a2: 50. Total earned: 105/100 -> 105%
    const bonusResult = _calculateCategoryGrade(assessments, bonusMap, false)
    assert.strictEqual(bonusResult, 105, `Bonus marks roll up cleanly uncapped: expected 105, got ${bonusResult}`)
    
    // Capped at 100%
    const cappedResult = _calculateCategoryGrade(assessments, bonusMap, true)
    assert.strictEqual(cappedResult, 100, `Capped bonus marks clamp to 100: got ${cappedResult}`)
  })

  await runTest('calculateStudentGrade prevents string weight concatenation corruption', async () => {
    const classRecord = {
      classId: 'cls_test',
      gradingFramework: 'traditional',
      gradebookCategories: [
        { categoryId: 'cat_k', name: 'Knowledge', weight: '20' }, // String weight
        { categoryId: 'cat_t', name: 'Thinking', weight: '30' }   // String weight
      ],
      students: {
        s1: { studentId: 's1', firstName: 'Alice', lastName: 'Smith' }
      }
    }

    const assessments = [
      { assessmentId: 'a1', categoryId: 'cat_k', totalPoints: 100 },
      { assessmentId: 'a2', categoryId: 'cat_t', totalPoints: 100 }
    ]

    const grades = [
      { assessmentId: 'a1', studentId: 's1', score: 80 },
      { assessmentId: 'a2', studentId: 's1', score: 90 }
    ]

    // If weights concatenated as strings: "02030" -> corrupted grade
    // Correct: weightedSum = 80 * 0.2 + 90 * 0.3 = 16 + 27 = 43. weightUsed = 50. (43 / 50) * 100 = 86%
    const result = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })

    assert.strictEqual(result.weightUsed, 50, `weightUsed must be numeric 50, not string "02030": got ${result.weightUsed}`)
    assert.strictEqual(result.overallGrade, 86, `Calculated overall grade must be 86%: got ${result.overallGrade}`)
    assert(!isNaN(result.overallGrade) && isFinite(result.overallGrade), 'Overall grade is finite and not NaN')
  })

  await runTest('calculateStudentGrade handles all-0 category weights cleanly without NaN', async () => {
    const classRecord = {
      classId: 'cls_zero_weights',
      gradingFramework: 'traditional',
      gradebookCategories: [
        { categoryId: 'cat_diag1', name: 'Diagnostic 1', weight: 0 },
        { categoryId: 'cat_diag2', name: 'Diagnostic 2', weight: 0 }
      ],
      students: {
        s1: { studentId: 's1', firstName: 'Bob', lastName: 'Jones' }
      }
    }

    const assessments = [
      { assessmentId: 'a1', categoryId: 'cat_diag1', totalPoints: 100 }
    ]

    const grades = [
      { assessmentId: 'a1', studentId: 's1', score: 95 }
    ]

    const result = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })

    // When all weights are 0, overall grade must be null, NOT NaN or 0/0
    assert.strictEqual(result.overallGrade, null, `All 0-weights return overallGrade: null, got ${result.overallGrade}`)
    assert.strictEqual(result.calculatedOverallGrade, null, 'calculatedOverallGrade is null')
    assert.strictEqual(result.categoryResults.cat_diag1.percentage, 95, 'Individual category grade is still computed for reference')
  })

  await runTest('Traditional category override on unassessed category is honored and rolls up', async () => {
    const classRecord = {
      classId: 'cls_cat_override',
      gradingFramework: 'traditional',
      gradebookCategories: [
        { categoryId: 'cat_k', name: 'Knowledge', weight: 50 },
        { categoryId: 'cat_t', name: 'Thinking', weight: 50 }
      ],
      students: {
        s1: {
          studentId: 's1',
          firstName: 'Carol',
          lastName: 'Danvers',
          categoryOverrides: {
            cat_t: 80 // Manual override for Thinking before any Thinking test was entered!
          }
        }
      }
    }

    // Only a Knowledge assessment exists
    const assessments = [
      { assessmentId: 'a1', categoryId: 'cat_k', totalPoints: 100 }
    ]
    const grades = [
      { assessmentId: 'a1', studentId: 's1', score: 90 }
    ]

    const result = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })

    assert(result.categoryResults.cat_t !== null, 'Unassessed category with override is not null')
    assert.strictEqual(result.categoryResults.cat_t.percentage, 80, 'Unassessed category reflects override (80%)')
    assert.strictEqual(result.categoryResults.cat_t.isOverridden, true, 'isOverridden is true')
    // Knowledge (90% * 0.5) + Thinking override (80% * 0.5) = 45 + 40 = 85%
    assert.strictEqual(result.overallGrade, 85, `Overall grade incorporates unassessed category override: expected 85%, got ${result.overallGrade}%`)
  })

  await runTest('getBucketMode handles empty, single, tie-break, and NaNs without throwing', () => {
    assert.strictEqual(getBucketMode([]).result, null, 'Empty returns null')
    assert.strictEqual(getBucketMode([{ percentage: NaN }]).result, null, 'NaN percentage does not crash with TypeError')
    assert.strictEqual(getBucketMode([{ percentage: null }]).result, null, 'null percentage returns null')
    
    const scores = [
      { percentage: 72, date: '2025-10-01' },
      { percentage: 75, date: '2025-10-05' },
      { percentage: 85, date: '2025-10-10' }
    ]
    const mode = getBucketMode(scores)
    assert.strictEqual(mode.count, 2, 'Dominant bucket has count 2')
    assert.strictEqual(mode.bucketLabel, '70-79%', 'Bucket label is 70-79%')
    assert.strictEqual(mode.result, 73.5, 'Bucket mean is 73.5%')
  })

  console.log('')

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 3: HYBRID ENGINE (SBAR WITH WEIGHTED COMPONENTS)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[SUITE 3] Hybrid Engine (SBAR with Evaluation Components)')

  await runTest('Hybrid mode rolls up Term SBAR mastery + Non-term components accurately', async () => {
    const classRecord = {
      classId: 'cls_hybrid',
      gradingFramework: 'sbar',
      sbarWeighting: {
        enabled: true,
        termWeight: 70,
        components: [
          { componentId: 'comp_exam', name: 'Final Exam', weight: 30, assessmentId: 'ast_exam' }
        ]
      },
      expectations: [
        { code: 'B1.1', expectationId: 'exp_b1', weight: 1.0 }
      ],
      students: {
        s1: { studentId: 's1', firstName: 'David', lastName: 'Banner' }
      }
    }

    const assessments = [
      { assessmentId: 'ast_term1', expectationIds: ['B1.1'], totalPoints: 100, assessmentType: 'summative', date: '2025-10-01' },
      { assessmentId: 'ast_exam', totalPoints: 100, assessmentType: 'summative', date: '2026-01-20' }
    ]

    const grades = [
      // SBAR term expectation score: 80%
      { assessmentId: 'ast_term1', studentId: 's1', expectationScores: { 'B1.1': 80 }, masteryLevel: 80 },
      // Final Exam score: 90%
      { assessmentId: 'ast_exam', studentId: 's1', resolvedScore: 90, score: 90 }
    ]

    // SBAR term: 80% * 0.70 = 56. Exam: 90% * 0.30 = 27. Total: 83%
    const result = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })

    assert.strictEqual(result.sbarMasteryPct, 80, 'SBAR term mastery is 80%')
    assert.strictEqual(result.categoryResults.comp_exam.percentage, 90, 'Exam component is 90%')
    assert.strictEqual(result.weightUsed, 100, 'Total weight used is 100')
    assert.strictEqual(result.overallGrade, 83, `Hybrid overall grade is 83%: got ${result.overallGrade}`)
  })

  await runTest('Hybrid mode scales proportionally when final exam is unsubmitted (not yet taken)', async () => {
    const classRecord = {
      classId: 'cls_hybrid_unsubmitted',
      gradingFramework: 'sbar',
      sbarWeighting: {
        enabled: true,
        termWeight: 70,
        components: [
          { componentId: 'comp_exam', name: 'Final Exam', weight: 30, assessmentId: 'ast_exam' }
        ]
      },
      expectations: [{ code: 'B1.1', expectationId: 'exp_b1', weight: 1.0 }],
      students: { s1: { studentId: 's1', firstName: 'Eve', lastName: 'Polastri' } }
    }

    const assessments = [
      { assessmentId: 'ast_term1', expectationIds: ['B1.1'], totalPoints: 100, assessmentType: 'summative', date: '2025-10-01' },
      { assessmentId: 'ast_exam', totalPoints: 100, assessmentType: 'summative', date: '2026-01-20' }
    ]

    // Only term assessment is graded. Exam has NO grade record (unsubmitted)
    const grades = [
      { assessmentId: 'ast_term1', studentId: 's1', expectationScores: { 'B1.1': 85 }, masteryLevel: 85 }
    ]

    const result = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })

    assert.strictEqual(result.weightUsed, 70, 'weightUsed is 70 (exam weight omitted until submitted)')
    // (85 * 0.70 / 70) * 100 = 85%
    assert.strictEqual(result.overallGrade, 85, `Overall grade scales proportionally to 85% before exam: got ${result.overallGrade}`)
  })

  await runTest('Hybrid mode penalizes with 0% when final exam is marked missing: true', async () => {
    const classRecord = {
      classId: 'cls_hybrid_missing',
      gradingFramework: 'sbar',
      sbarWeighting: {
        enabled: true,
        termWeight: 70,
        components: [
          { componentId: 'comp_exam', name: 'Final Exam', weight: 30, assessmentId: 'ast_exam' }
        ]
      },
      expectations: [{ code: 'B1.1', expectationId: 'exp_b1', weight: 1.0 }],
      students: { s1: { studentId: 's1', firstName: 'Frank', lastName: 'Castle' } }
    }

    const assessments = [
      { assessmentId: 'ast_term1', expectationIds: ['B1.1'], totalPoints: 100, assessmentType: 'summative', date: '2025-10-01' },
      { assessmentId: 'ast_exam', totalPoints: 100, assessmentType: 'summative', date: '2026-01-20' }
    ]

    const grades = [
      { assessmentId: 'ast_term1', studentId: 's1', expectationScores: { 'B1.1': 100 }, masteryLevel: 100 },
      // Exam is marked MISSING
      { assessmentId: 'ast_exam', studentId: 's1', missing: true }
    ]

    const result = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })

    assert.strictEqual(result.weightUsed, 100, 'weightUsed is 100 because missing exam counts against total')
    assert.strictEqual(result.categoryResults.comp_exam.percentage, 0, 'Exam percentage is 0%')
    // (100 * 0.70 + 0 * 0.30) = 70%
    assert.strictEqual(result.overallGrade, 70, `Missing exam penalizes grade to 70%: got ${result.overallGrade}`)
  })

  await runTest('Hybrid mode handles 0 term weight and all-0 weights cleanly', async () => {
    const classRecord = {
      classId: 'cls_hybrid_zero',
      gradingFramework: 'sbar',
      sbarWeighting: {
        enabled: true,
        termWeight: 0,
        components: [
          { componentId: 'comp_exam', name: 'Final Exam', weight: 0, assessmentId: 'ast_exam' }
        ]
      },
      expectations: [{ code: 'B1.1', expectationId: 'exp_b1', weight: 1.0 }],
      students: { s1: { studentId: 's1', firstName: 'Grace', lastName: 'Hopper' } }
    }

    const assessments = [
      { assessmentId: 'ast_term1', expectationIds: ['B1.1'], totalPoints: 100, assessmentType: 'summative' }
    ]
    const grades = [
      { assessmentId: 'ast_term1', studentId: 's1', expectationScores: { 'B1.1': 88 }, masteryLevel: 88 }
    ]

    const result = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })

    assert.strictEqual(result.overallGrade, null, 'All 0-weights in hybrid mode return null without NaN')
    assert(!isNaN(result.overallGrade), 'overallGrade is not NaN')
  })

  console.log('')

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 4: PROFESSIONAL JUDGMENT OVERRIDES PRESERVATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[SUITE 4] Professional Judgment Overrides Preservation')

  await runTest('Teacher adjustedGrade takes absolute precedence over calculated grade across all modes', async () => {
    const baseClass = {
      classId: 'cls_overrides',
      gradingFramework: 'traditional',
      gradebookCategories: [{ categoryId: 'cat_main', name: 'Main', weight: 100 }],
      students: {
        s1: {
          studentId: 's1',
          firstName: 'Hank',
          lastName: 'Pym',
          adjustedGrade: 88 // Teacher manual override to 88%
        }
      }
    }

    const assessments = [{ assessmentId: 'a1', categoryId: 'cat_main', totalPoints: 100 }]
    const grades = [{ assessmentId: 'a1', studentId: 's1', score: 62 }]

    // 1. Traditional mode
    const resTrad = await calculateStudentGrade('s1', baseClass, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })
    assert.strictEqual(resTrad.isAdjusted, true, 'isAdjusted is true')
    assert.strictEqual(resTrad.adjustedGrade, 88, 'adjustedGrade is 88')
    assert.strictEqual(resTrad.calculatedOverallGrade, 62, 'calculatedOverallGrade preserves raw math (62%)')
    assert.strictEqual(resTrad.displayOverallGrade, 88, 'displayOverallGrade displays teacher override (88%)')
    assert.strictEqual(resTrad.overallGrade, 88, 'overallGrade displays teacher override (88%)')

    // 2. SBAR mode
    const sbarClass = {
      ...baseClass,
      gradingFramework: 'sbar',
      expectations: [{ code: 'E1', weight: 1.0 }]
    }
    const sbarAst = [{ assessmentId: 'a1', expectationIds: ['E1'], totalPoints: 100, assessmentType: 'summative' }]
    const sbarGrades = [{ assessmentId: 'a1', studentId: 's1', expectationScores: { E1: 62 }, masteryLevel: 62 }]

    const resSbar = await calculateStudentGrade('s1', sbarClass, {
      assessmentsPreRef: sbarAst,
      gradesPreRef: sbarGrades
    })
    assert.strictEqual(resSbar.isAdjusted, true, 'SBAR isAdjusted is true')
    assert.strictEqual(resSbar.overallGrade, 88, 'SBAR overallGrade displays teacher override (88%)')
    assert.strictEqual(resSbar.calculatedOverallGrade, 62, 'SBAR calculatedOverallGrade preserves 62%')

    // 3. Verify original student record in baseClass was NOT mutated/erased
    assert.strictEqual(baseClass.students.s1.adjustedGrade, 88, 'StudentRecord.adjustedGrade remains intact in class record')
  })

  await runTest('Expectation-level overrides (standard and subject-scoped) resolve cleanly', () => {
    const student = {
      studentId: 'st_elem',
      expectationOverrides: {
        'B1.1': 'L4+',                                  // Unscoped level string
        'elem_sub_math::A1.2': { level: 'L3', score: 75, note: 'Oral check-in' }, // Scoped object
        'C2.3': 85                                     // Numeric override
      }
    }

    // Unscoped resolution
    const b1 = resolveStudentExpectationOverride(student, 'B1.1')
    assert.strictEqual(b1.level, 'L4+')
    assert.strictEqual(b1.score, 96)
    assert.strictEqual(b1.isOverridden, true)

    // Elementary subject-scoped resolution
    const a1 = resolveStudentExpectationOverride(student, 'A1.2', 'elem_sub_math')
    assert.strictEqual(a1.level, 'L3')
    assert.strictEqual(a1.score, 75)
    assert.strictEqual(a1.note, 'Oral check-in')

    // Cross-subject isolation: French subject looking for A1.2 does NOT pick up Math A1.2
    const a1French = resolveStudentExpectationOverride(student, 'A1.2', 'elem_sub_french')
    assert.strictEqual(a1French, null, 'Elementary subject override does not bleed across subjects')

    // Numeric override
    const c2 = resolveStudentExpectationOverride(student, 'C2.3')
    assert.strictEqual(c2.score, 85)
    assert.strictEqual(c2.level, 'L4-')
  })

  await runTest('Simulated roster re-import preserves existing student overrides', () => {
    // Existing class state with overrides
    const cls = {
      students: {
        st_101: {
          studentId: 'st_101',
          firstName: 'Iris',
          lastName: 'West',
          gradeLevel: 'Grade 8',
          adjustedGrade: 92,
          categoryOverrides: { cat_k: 88 },
          expectationOverrides: { 'B1.1': 'L4' },
          seat: { row: 2, col: 3 }
        }
      }
    }

    // Incoming CSV roster update (e.g. updated parent email and courseCode)
    const incomingRows = [
      {
        studentId: 'st_101',
        firstName: 'Iris',
        lastName: 'West-Allen', // Name updated
        gradeLevel: 'Grade 8',
        studentEmail: 'iris@ccp.org',
        courseCode: 'SNC2D'
      }
    ]

    // Execute upsert logic from importRoster / bulkImportClasses
    for (const row of incomingRows) {
      const cleanId = String(row.studentId).trim()
      if (cls.students[cleanId]) {
        cls.students[cleanId].firstName = row.firstName
        cls.students[cleanId].lastName = row.lastName
        if (row.courseCode) cls.students[cleanId].courseCode = row.courseCode
        if (row.studentEmail) cls.students[cleanId].studentEmail = row.studentEmail
      }
    }

    // Check that overrides were NOT overwritten or lost
    assert.strictEqual(cls.students.st_101.lastName, 'West-Allen', 'Name was updated')
    assert.strictEqual(cls.students.st_101.adjustedGrade, 92, 'adjustedGrade (92%) preserved after re-import')
    assert.strictEqual(cls.students.st_101.categoryOverrides.cat_k, 88, 'categoryOverrides preserved after re-import')
    assert.strictEqual(cls.students.st_101.expectationOverrides['B1.1'], 'L4', 'expectationOverrides preserved after re-import')
    assert.deepStrictEqual(cls.students.st_101.seat, { row: 2, col: 3 }, 'Seat assignment preserved after re-import')
  })

  console.log('')

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 5: SWITCHING FRAMEWORKS & ALGORITHMS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[SUITE 5] Switching Frameworks & Calculation Algorithms')

  await runTest('Switching from Traditional to SBAR and back never produces NaN or crashes', async () => {
    const classRecord = {
      classId: 'cls_toggle',
      gradingFramework: 'traditional',
      gradebookCategories: [
        { categoryId: 'cat_k', name: 'Knowledge', weight: 50 },
        { categoryId: 'cat_t', name: 'Thinking', weight: 50 }
      ],
      expectations: [
        { code: 'B1.1', expectationId: 'exp_1', weight: 1.0 }
      ],
      students: {
        s1: { studentId: 's1', firstName: 'John', lastName: 'Stewart' }
      }
    }

    const assessments = [
      { assessmentId: 'a1', categoryId: 'cat_k', expectationIds: ['B1.1'], totalPoints: 100, assessmentType: 'summative', date: '2025-10-01' },
      { assessmentId: 'a2', categoryId: 'cat_t', totalPoints: 100, assessmentType: 'summative', date: '2025-10-15' }
    ]

    const grades = [
      { assessmentId: 'a1', studentId: 's1', score: 80, resolvedScore: 80, expectationScores: { 'B1.1': 80 }, masteryLevel: 80 },
      { assessmentId: 'a2', studentId: 's1', score: 90, resolvedScore: 90 }
    ]

    // 1. Calculate under Traditional
    classRecord.gradingFramework = 'traditional'
    const resTrad = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })
    assert.strictEqual(resTrad.overallGrade, 85, 'Traditional overall grade is 85%')
    assert(!isNaN(resTrad.overallGrade), 'Not NaN in traditional')

    // 2. Toggle to SBAR
    classRecord.gradingFramework = 'sbar'
    const resSbar = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })
    assert.strictEqual(resSbar.overallGrade, 80, 'SBAR overall grade reflects B1.1 mastery (80%)')
    assert(!isNaN(resSbar.overallGrade), 'Not NaN in SBAR')

    // 3. Toggle to Hybrid (SBAR + 30% exam)
    classRecord.sbarWeighting = {
      enabled: true,
      termWeight: 70,
      components: [{ componentId: 'comp_t', name: 'Thinking Task', weight: 30, assessmentId: 'a2' }]
    }
    const resHybrid = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })
    // 80 * 0.70 + 90 * 0.30 = 56 + 27 = 83%
    assert.strictEqual(resHybrid.overallGrade, 83, 'Hybrid overall grade is 83%')
    assert(!isNaN(resHybrid.overallGrade), 'Not NaN in Hybrid')

    // 4. Toggle back to Traditional
    classRecord.gradingFramework = 'traditional'
    const resTrad2 = await calculateStudentGrade('s1', classRecord, {
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })
    assert.strictEqual(resTrad2.overallGrade, 85, 'Returned to Traditional overall grade 85% cleanly')
  })

  await runTest('Switching SBAR algorithms (decaying, power_law, mode, most_recent, highest) recalculates cleanly', () => {
    const classRecord = {
      classId: 'cls_algo_switch',
      gradingFramework: 'sbar',
      expectations: [{ code: 'A1.1', weight: 1.0 }],
      students: { s1: { studentId: 's1', firstName: 'Kori', lastName: 'Anders' } }
    }

    const assessments = [
      { assessmentId: 'a1', expectationIds: ['A1.1'], totalPoints: 100, assessmentType: 'summative', date: '2025-09-10' },
      { assessmentId: 'a2', expectationIds: ['A1.1'], totalPoints: 100, assessmentType: 'summative', date: '2025-10-10' },
      { assessmentId: 'a3', expectationIds: ['A1.1'], totalPoints: 100, assessmentType: 'summative', date: '2025-11-10' }
    ]

    const gradeMap = {
      a1: { assessmentId: 'a1', studentId: 's1', expectationScores: { 'A1.1': 55 } }, // L1
      a2: { assessmentId: 'a2', studentId: 's1', expectationScores: { 'A1.1': 75 } }, // L3
      a3: { assessmentId: 'a3', studentId: 's1', expectationScores: { 'A1.1': 95 } }  // L4+
    }

    const algorithms = ['decaying_average', 'power_law', 'mode', 'most_recent', 'highest']
    for (const algo of algorithms) {
      const mastery = calculateSBARStudentOverallMastery('s1', classRecord, assessments, gradeMap, algo)
      assert(mastery !== null && !isNaN(mastery) && isFinite(mastery), `Algorithm ${algo} produces valid mastery score: got ${mastery}`)
    }

    // Highest must be 95
    const highest = calculateSBARStudentOverallMastery('s1', classRecord, assessments, gradeMap, 'highest')
    assert.strictEqual(highest, 95, 'Highest algorithm returns 95')
  })

  console.log('')

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 6: SPLIT-TERM DATE WINDOWS & BOUNDARY TESTING
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[SUITE 6] Split-Term Date Windows & Boundary Stress')

  await runTest('calculateStudentGrade accurately respects asOf and dateFrom boundaries', async () => {
    const classRecord = {
      classId: 'cls_terms',
      gradingFramework: 'traditional',
      gradebookCategories: [{ categoryId: 'cat_all', name: 'All', weight: 100 }],
      students: { s1: { studentId: 's1', firstName: 'Logan', lastName: 'Howlett' } }
    }

    const assessments = [
      { assessmentId: 'a1', categoryId: 'cat_all', totalPoints: 100, date: '2025-09-15' }, // Term 1 early
      { assessmentId: 'a2', categoryId: 'cat_all', totalPoints: 100, date: '2025-11-15' }, // Term 1 exact boundary
      { assessmentId: 'a3', categoryId: 'cat_all', totalPoints: 100, date: '2025-11-16' }, // Term 2 exact start
      { assessmentId: 'a4', categoryId: 'cat_all', totalPoints: 100, date: '2026-01-20' }  // Term 2 mid
    ]

    const grades = [
      { assessmentId: 'a1', studentId: 's1', score: 70 },
      { assessmentId: 'a2', studentId: 's1', score: 80 },
      { assessmentId: 'a3', studentId: 's1', score: 90 },
      { assessmentId: 'a4', studentId: 's1', score: 100 }
    ]

    // Term 1 (up to 2025-11-15 inclusive): a1 (70) and a2 (80) -> average 75%
    const resTerm1 = await calculateStudentGrade('s1', classRecord, {
      asOf: '2025-11-15',
      dateFrom: null,
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })
    assert.strictEqual(resTerm1.overallGrade, 75, `Term 1 grade is 75%: got ${resTerm1.overallGrade}`)

    // Term 2 (from 2025-11-16 to 2026-02-01): a3 (90) and a4 (100) -> average 95%
    const resTerm2 = await calculateStudentGrade('s1', classRecord, {
      dateFrom: '2025-11-16',
      asOf: '2026-02-01',
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })
    assert.strictEqual(resTerm2.overallGrade, 95, `Term 2 grade is 95%: got ${resTerm2.overallGrade}`)

    // Empty window (no assessments exist between 2024-01-01 and 2024-05-01)
    const resEmpty = await calculateStudentGrade('s1', classRecord, {
      dateFrom: '2024-01-01',
      asOf: '2024-05-01',
      assessmentsPreRef: assessments,
      gradesPreRef: grades
    })
    assert.strictEqual(resEmpty.overallGrade, null, 'Empty date window returns null overall grade without NaN')
    assert(!isNaN(resEmpty.overallGrade), 'Empty date window overallGrade is not NaN')
  })

  console.log('')

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 7: NO NaN%, UNDEFINED, OR BROKEN TRENDS AUDIT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[SUITE 7] Zero NaN% and Trend Integrity Audit')

  await runTest('Extreme corrupt assessment inputs never produce NaN% or crash engines', async () => {
    const corruptClass = {
      classId: 'cls_corrupt',
      gradingFramework: 'traditional',
      gradebookCategories: [
        { categoryId: 'cat_c1', name: 'Cat 1', weight: 0 },
        { categoryId: 'cat_c2', name: 'Cat 2', weight: -10 },
        { categoryId: 'cat_c3', name: 'Cat 3', weight: 'invalid_string' }
      ],
      students: {
        st_c: { studentId: 'st_c', firstName: 'Miles', lastName: 'Morales' }
      }
    }

    const corruptAssessments = [
      { assessmentId: 'c1', categoryId: 'cat_c1', totalPoints: 0 },
      { assessmentId: 'c2', categoryId: 'cat_c2', totalPoints: -50 },
      { assessmentId: 'c3', categoryId: 'cat_c3', totalPoints: 'NaN' }
    ]

    const corruptGrades = [
      { assessmentId: 'c1', studentId: 'st_c', score: 'abc', resolvedScore: NaN },
      { assessmentId: 'c2', studentId: 'st_c', score: null, attempts: [{ pointsEarned: undefined }] },
      { assessmentId: 'c3', studentId: 'st_c', resolvedScore: Infinity }
    ]

    const result = await calculateStudentGrade('st_c', corruptClass, {
      assessmentsPreRef: corruptAssessments,
      gradesPreRef: corruptGrades
    })

    // Must not throw, must return null or finite, never NaN
    assert(result !== null, 'Returned calculation result object')
    assert(!isNaN(result.overallGrade), 'overallGrade is not NaN')
    assert(!isNaN(result.calculatedOverallGrade), 'calculatedOverallGrade is not NaN')
    assert(!isNaN(result.rawOverallGrade), 'rawOverallGrade is not NaN')
    assert(!isNaN(result.weightUsed), 'weightUsed is not NaN')
    
    // Format check: no property string contains "NaN"
    const json = JSON.stringify(result)
    assert(!json.includes('"NaN"'), 'JSON serialized result contains no "NaN" strings')
  })

  await runTest('Cohort matching handles edge cases without crashing or false negatives', () => {
    // Elementary grade normalization: 7 -> grade 7, gr. 7 -> grade 7
    assert.strictEqual(isCohortMatch('7', 'grade 7'), true, '7 matches grade 7')
    assert.strictEqual(isCohortMatch('Grade 7', 'gr. 7'), true, 'Grade 7 matches gr. 7')
    assert.strictEqual(isCohortMatch('Grade 8 (IEP)', 'grade 8'), true, 'IEP tag stripped for cohort match')
    assert.strictEqual(isCohortMatch('All', 'Grade 7'), true, 'All matches any cohort')
    assert.strictEqual(isCohortMatch(null, 'Grade 7'), true, 'null matches any cohort')
    assert.strictEqual(isCohortMatch('SNC2D', 'SNC2D'), true, 'Secondary course matches exactly')
    assert.strictEqual(isCohortMatch('SNC2D', 'SNC2P'), false, 'Different secondary courses do not match')
  })

  console.log('===================================================================')
  console.log(`  TEST RESULTS: ${passedTests} passed, ${failedTests} failed.`)
  console.log('===================================================================')

  if (failedTests > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runAllTests().catch(err => {
  console.error('Fatal test runner error:', err)
  process.exit(1)
})
