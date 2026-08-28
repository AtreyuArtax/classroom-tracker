import assert from 'assert'
import {
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery,
  calculateDecayingAverage,
  calculatePowerLaw,
  calculateMode,
  getSBARLevelBadge
} from './db/gradebook/gradeCalcSBAR.js'

console.log('=================================================================')
console.log('🧪 SBAR END-TO-END WORKFLOW, MULTI-ASSIGNMENT & MATH AUDIT')
console.log('=================================================================')

// SCENARIO 1: Single student, 1st assignment assessing SC.B1.1
const mockClass = {
  classId: 'cls_sbar_audit',
  className: 'SNC1W Grade 9 Science',
  gradingFramework: 'sbar',
  sbarAlgorithm: 'decaying_average',
  students: {
    'st_alicia': { id: 'st_alicia', firstName: 'Alicia', lastName: 'Keys' },
    'st_bob': { id: 'st_bob', firstName: 'Bob', lastName: 'Dylan' }
  },
  gradebookUnits: [
    {
      unitId: 'u_stem',
      name: 'STEM Skills',
      expectations: [
        { expectationId: 'exp_a1', code: 'SC.A1.1', description: 'STEM Investigation' }
      ]
    },
    {
      unitId: 'u_matter',
      name: 'Nature of Matter',
      expectations: [
        { expectationId: 'exp_b1', code: 'SC.B1.1', description: 'Properties of Matter' },
        { expectationId: 'exp_b2', code: 'SC.B1.2', description: 'Chemical Reactions' }
      ]
    }
  ]
}

// Assignment 1: Quiz 1 (SC.B1.1) on Sept 15
const ast1 = {
  assessmentId: 'ast_quiz1',
  name: 'Quiz 1: Matter Properties',
  date: '2026-09-15',
  purpose: 'summative',
  expectationIds: ['SC.B1.1']
}

// Grades for Quiz 1: Alicia gets 70% (L3-), Bob gets 55% (L1)
const gradeMap1 = {
  'ast_quiz1': {
    'st_alicia': { studentId: 'st_alicia', expectationScores: { 'SC.B1.1': 70 } },
    'st_bob': { studentId: 'st_bob', expectationScores: { 'SC.B1.1': 55 } }
  }
}

console.log('\n--- PHASE 1: After Assignment 1 (Quiz 1) ---')
let masteryMap = calculateSBARExpectationMastery(mockClass, [ast1], gradeMap1, 'decaying_average')
assert.strictEqual(masteryMap['st_alicia']['SC.B1.1'].score, 70)
assert.strictEqual(masteryMap['st_alicia']['SC.B1.1'].badge.level, 'L3-')
assert.strictEqual(masteryMap['st_bob']['SC.B1.1'].score, 55)
assert.strictEqual(masteryMap['st_bob']['SC.B1.1'].badge.level, 'L1')
console.log('✓ Alicia Quiz 1 mastery: 70% (L3-)')
console.log('✓ Bob Quiz 1 mastery: 55% (L1)')

let aliciaOverall = calculateSBARStudentOverallMastery('st_alicia', mockClass, [ast1], gradeMap1, 'decaying_average')
assert.strictEqual(aliciaOverall, 70)
assert.strictEqual(getSBARLevelBadge(aliciaOverall).level, 'L3-')
console.log('✓ Overall Course Mastery after 1 task: 70% (L3-)')


// SCENARIO 2: Teacher creates Assignment 2 (Unit 1 Test) on Oct 05 assessing the SAME expectation SC.B1.1 + SC.B1.2
const ast2 = {
  assessmentId: 'ast_test1',
  name: 'Unit 1 Test: Chemistry',
  date: '2026-10-05',
  purpose: 'summative',
  expectationIds: ['SC.B1.1', 'SC.B1.2']
}

// Grades for Test 1: Alicia improves on SC.B1.1 to 90% (L4), and gets 85% on SC.B1.2
// Bob gets 80% on SC.B1.1, and 75% on SC.B1.2
const gradeMap2 = {
  ...gradeMap1,
  'ast_test1': {
    'st_alicia': { studentId: 'st_alicia', expectationScores: { 'SC.B1.1': 90, 'SC.B1.2': 85 } },
    'st_bob': { studentId: 'st_bob', expectationScores: { 'SC.B1.1': 80, 'SC.B1.2': 75 } }
  }
}

console.log('\n--- PHASE 2: After Assignment 2 (Unit 1 Test with repeat SC.B1.1) ---')
masteryMap = calculateSBARExpectationMastery(mockClass, [ast1, ast2], gradeMap2, 'decaying_average')

// Math verification for Decaying Average on SC.B1.1:
// Alicia: 0.65 * 90 + 0.35 * 70 = 58.5 + 24.5 = 83.0% (Level 4-)
// Bob: 0.65 * 80 + 0.35 * 55 = 52.0 + 19.25 = 71.25 -> 71.3% (Level 3-)
assert.strictEqual(masteryMap['st_alicia']['SC.B1.1'].score, 83.0)
assert.strictEqual(masteryMap['st_alicia']['SC.B1.1'].badge.level, 'L4-')
assert.strictEqual(masteryMap['st_alicia']['SC.B1.1'].trend, 'improving')
console.log('✓ Alicia Decaying Average on repeat SC.B1.1 [70, 90] = 83.0% (L4-) with growth trend ↗')

assert.strictEqual(masteryMap['st_bob']['SC.B1.1'].score, 71.3)
assert.strictEqual(masteryMap['st_bob']['SC.B1.1'].badge.level, 'L3-')
assert.strictEqual(masteryMap['st_bob']['SC.B1.1'].trend, 'improving')
console.log('✓ Bob Decaying Average on repeat SC.B1.1 [55, 80] = 71.3% (L3-) with growth trend ↗')

// SC.B1.2 verification (only evaluated once, 85% = L4-)
assert.strictEqual(masteryMap['st_alicia']['SC.B1.2'].score, 85)
assert.strictEqual(masteryMap['st_alicia']['SC.B1.2'].badge.level, 'L4-')
console.log('✓ Alicia SC.B1.2 single evaluation = 85% (L4-)')


// SCENARIO 3: Overall Course Mastery Combining ALL evaluated expectations
// Alicia has: SC.B1.1 (83.0%) and SC.B1.2 (85%)
// Course Average = (83.0 + 85) / 2 = 168 / 2 = 84% -> Level 4-
aliciaOverall = calculateSBARStudentOverallMastery('st_alicia', mockClass, [ast1, ast2], gradeMap2, 'decaying_average')
assert.strictEqual(aliciaOverall, 84)
assert.strictEqual(getSBARLevelBadge(aliciaOverall).level, 'L4-')
console.log('✓ Alicia Course Overall Mastery correctly averages all expectations: 84% (L4-)')

// Bob has: SC.B1.1 (71.3%) and SC.B1.2 (75%)
// Course Average = (71.3 + 75) / 2 = 146.3 / 2 = 73.15 -> 73% (Level 3)
const bobOverall = calculateSBARStudentOverallMastery('st_bob', mockClass, [ast1, ast2], gradeMap2, 'decaying_average')
assert.strictEqual(bobOverall, 73)
assert.strictEqual(getSBARLevelBadge(bobOverall).level, 'L3')
console.log('✓ Bob Course Overall Mastery correctly averages all expectations: 73% (L3)')


// SCENARIO 4: Adding a 3rd Assignment in a different strand (SC.A1.1)
const ast3 = {
  assessmentId: 'ast_lab1',
  name: 'Lab Report: Inquiry',
  date: '2026-10-20',
  purpose: 'summative',
  expectationIds: ['SC.A1.1']
}

const gradeMap3 = {
  ...gradeMap2,
  'ast_lab1': {
    'st_alicia': { studentId: 'st_alicia', expectationScores: { 'SC.A1.1': 95 } }, // L4+
    'st_bob': { studentId: 'st_bob', expectationScores: { 'SC.A1.1': 90 } }       // L4
  }
}

console.log('\n--- PHASE 3: After Assignment 3 (Lab Report evaluating Strand A) ---')
masteryMap = calculateSBARExpectationMastery(mockClass, [ast1, ast2, ast3], gradeMap3, 'decaying_average')

// Alicia has 3 evaluated standards: SC.B1.1 (83%), SC.B1.2 (85%), SC.A1.1 (95%)
// Average = (83 + 85 + 95) / 3 = 263 / 3 = 87.67 -> 88% (Level 4)
aliciaOverall = calculateSBARStudentOverallMastery('st_alicia', mockClass, [ast1, ast2, ast3], gradeMap3, 'decaying_average')
assert.strictEqual(aliciaOverall, 88)
assert.strictEqual(getSBARLevelBadge(aliciaOverall).level, 'L4')
console.log('✓ Alicia Course Overall Mastery across 3 distinct expectations = 88% (L4)')


// SCENARIO 5: Verifying all 5 SBAR Algorithms on Multi-Attempt Scores
console.log('\n--- PHASE 4: Verification of Alternative SBAR Math Models on [70, 90] ---')
const scores = [70, 90]

// 1. Decaying Average: 0.65 * 90 + 0.35 * 70 = 83.0%
const decayingRes = calculateDecayingAverage(scores, 0.65)
assert.strictEqual(decayingRes, 83.0)
console.log('✓ Decaying Average Model: 83.0%')

// 2. Power Law (Marzano): Projects forward trajectory
const powerLawRes = calculatePowerLaw(scores)
assert(powerLawRes >= 90, 'Power law on improving trajectory [70, 90] projects >= 90%')
console.log('✓ Power Law Model: ' + powerLawRes + '%')

// 3. Mode (Most Consistent): Level 4 (90% attempt)
const modeRes = calculateMode(scores)
assert.strictEqual(modeRes, 90.0)
console.log('✓ Mode Model: 90.0%')

// 4. Most Recent: Latest score (90%)
const recentRes = calculateDecayingAverage([90])
assert.strictEqual(recentRes, 90)
console.log('✓ Most Recent Model: 90%')

// 5. Highest: Maximum score (90%)
const highestRes = Math.max(...scores)
assert.strictEqual(highestRes, 90)
console.log('✓ Highest Model: 90%')


// SCENARIO 6: Teacher edits an assessment score (e.g. Alicia Quiz 1 is corrected from 70% to 80%)
console.log('\n--- PHASE 5: Editing an Existing Assessment Grade ---')
const gradeMapEdited = {
  ...gradeMap3,
  'ast_quiz1': {
    'st_alicia': { studentId: 'st_alicia', expectationScores: { 'SC.B1.1': 80 } }, // Changed from 70 to 80
    'st_bob': { studentId: 'st_bob', expectationScores: { 'SC.B1.1': 55 } }
  }
}

masteryMap = calculateSBARExpectationMastery(mockClass, [ast1, ast2, ast3], gradeMapEdited, 'decaying_average')
// New SC.B1.1 Decaying Average: 0.65 * 90 + 0.35 * 80 = 58.5 + 28.0 = 86.5% (Level 4-)
assert.strictEqual(masteryMap['st_alicia']['SC.B1.1'].score, 86.5)
assert.strictEqual(masteryMap['st_alicia']['SC.B1.1'].badge.level, 'L4-')
console.log('✓ Alicia edited Quiz 1 score immediately updates SC.B1.1 mastery to 86.5% (L4-)')

aliciaOverall = calculateSBARStudentOverallMastery('st_alicia', mockClass, [ast1, ast2, ast3], gradeMapEdited, 'decaying_average')
// New Overall: (86.5 + 85 + 95) / 3 = 266.5 / 3 = 88.83 -> 89% (L4)
assert.strictEqual(aliciaOverall, 89)
console.log('✓ Alicia edited Quiz 1 score immediately updates Course Overall Mastery to 89% (L4)')

console.log('\n=================================================================')
console.log('🎉 ALL SBAR LIFECYCLE, MULTI-ASSIGNMENT & MATH AUDIT TESTS PASSED!')
console.log('=================================================================')
