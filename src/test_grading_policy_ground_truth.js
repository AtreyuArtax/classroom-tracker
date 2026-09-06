/**
 * src/test_grading_policy_ground_truth.js
 *
 * GROUND-TRUTH VERIFICATION SUITE FOR GRADING POLICIES & MATHEMATICAL INTEGRITY.
 * 
 * Specifically validates the critical grading contract:
 * 1. BLANKS ARE NEVER COUNTED (blank != 0, omitted from earned AND possible)
 * 2. EXCUSED/EXCLUDED IS NEVER COUNTED (excluded != 0, omitted from earned AND possible)
 * 3. MISSED/MISSING IS STRICTLY COUNTED AS ZERO (missing == 0 against total possible)
 * 4. OVERRIDES TAKE PRECEDENCE AT ALL 3 TIERS (adjustedGrade, categoryOverrides, expectationOverrides)
 * 5. SBAR RULES (Formative vs Summative, Diagnostic 0x Weight, 65/25/10 Component Normalization)
 */

import {
  getAssessmentPercentage,
  _calculateCategoryGrade,
  calculateStudentGrade
} from './db/gradebook/gradeCalc.js'
import {
  calculateDecayingAverage,
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery,
  getSBARLevelBadge
} from './db/gradebook/gradeCalcSBAR.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`)
    throw new Error(message)
  }
  console.log(`  ✓ ${message}`)
}

console.log('\n===================================================================')
console.log('⚖️  GRADING POLICY GROUND-TRUTH & NUMERICAL INTEGRITY PROOF')
console.log('===================================================================')

// ─────────────────────────────────────────────────────────────────────────────
// POLICY 1: BLANK / UNASSESSED IS NEVER COUNTED AS ZERO
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[POLICY 1] Blanks / Unassessed Tasks (blank = not counted in earned OR possible)')

const classPolicy1 = {
  classId: 'c_p1',
  gradingFramework: 'traditional',
  gradebookCategories: [{ categoryId: 'cat_k', name: 'Knowledge', weight: 100 }],
  students: { 's1': { studentId: 's1', firstName: 'Alice', lastName: 'Smith' } }
}

// Case 1A: Student has Ast 1 (80/100) and Ast 2 has NO entry in gradeMap at all
const asts1A = [
  { assessmentId: 'a1', categoryId: 'cat_k', totalPoints: 100 },
  { assessmentId: 'a2', categoryId: 'cat_k', totalPoints: 100 }
]
const gradeMap1A = {
  'a1': { assessmentId: 'a1', studentId: 's1', resolvedScore: 80 }
  // a2 is omitted (not yet entered / blank)
}

const cat1A = _calculateCategoryGrade(asts1A, gradeMap1A, false)
assert(cat1A === 80, `Unentered assessment is omitted: Expected 80%, got ${cat1A}% (NOT 40%)`)

// Case 1B: Student has Ast 1 (80/100) and Ast 2 exists with resolvedScore: null (blank input)
const gradeMap1B = {
  'a1': { assessmentId: 'a1', studentId: 's1', resolvedScore: 80 },
  'a2': { assessmentId: 'a2', studentId: 's1', resolvedScore: null, score: null, missing: false, excluded: false }
}
const cat1B = _calculateCategoryGrade(asts1A, gradeMap1B, false)
assert(cat1B === 80, `Blank score (null) is omitted: Expected 80%, got ${cat1B}% (NOT 40%)`)

// Case 1C: Student has Ast 1 (80/100) and Ast 2 exists with resolvedScore: "" (empty string input)
const gradeMap1C = {
  'a1': { assessmentId: 'a1', studentId: 's1', resolvedScore: 80 },
  'a2': { assessmentId: 'a2', studentId: 's1', resolvedScore: '', score: '', missing: false, excluded: false }
}
const cat1C = _calculateCategoryGrade(asts1A, gradeMap1C, false)
assert(cat1C === 80, `Empty string score ("") is omitted: Expected 80%, got ${cat1C}% (NOT 40%)`)

// Case 1D: Multi-Category Weight Normalization with an Unassessed Category
// Knowledge is 70% weight (student got 80%), Thinking is 30% weight (completely unassessed)
const classMultiCat = {
  classId: 'c_p1_multi',
  gradingFramework: 'traditional',
  gradebookCategories: [
    { categoryId: 'cat_k', name: 'Knowledge', weight: 70 },
    { categoryId: 'cat_t', name: 'Thinking', weight: 30 }
  ],
  students: { 's1': { studentId: 's1', firstName: 'Alice', lastName: 'Smith' } }
}
const astsMulti = [
  { assessmentId: 'a1', categoryId: 'cat_k', totalPoints: 100 },
  { assessmentId: 'a2', categoryId: 'cat_t', totalPoints: 100 }
]
const gradesMultiBlank = [
  { assessmentId: 'a1', studentId: 's1', resolvedScore: 80 }
  // a2 in Thinking is completely blank
]

const studentGradeBlank = await calculateStudentGrade('s1', classMultiCat, {
  assessmentsPreRef: astsMulti,
  gradesPreRef: gradesMultiBlank,
  settingsPreRef: { capGradesAt100: true }
})
assert(studentGradeBlank.calculatedOverallGrade === 80, `Unassessed Category normalizes over weightUsed (70): Expected 80%, got ${studentGradeBlank.calculatedOverallGrade}% (NOT 56%)`)
assert(studentGradeBlank.weightUsed === 70, `weightUsed accurately reflects only assessed categories: Expected 70, got ${studentGradeBlank.weightUsed}`)
assert(studentGradeBlank.categoryResults.cat_t === null, 'Unassessed category reports null, NOT 0%')

// Case 1E: Student with ALL assessments blank in entire course
const studentGradeAllBlank = await calculateStudentGrade('s1', classMultiCat, {
  assessmentsPreRef: astsMulti,
  gradesPreRef: [],
  settingsPreRef: { capGradesAt100: true }
})
assert(studentGradeAllBlank.calculatedOverallGrade === null, 'All-blank course returns overall null (unassessed), NOT 0%')
assert(studentGradeAllBlank.weightUsed === 0, 'All-blank course reports weightUsed === 0')

// ─────────────────────────────────────────────────────────────────────────────
// POLICY 2: EXCUSED / EXCLUDED IS NEVER COUNTED IN EARNED OR POSSIBLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[POLICY 2] Excused / Excluded Tasks (excused = not counted in earned OR possible)')

// Case 2A: Ast 1 (90/100), Ast 2 (10/100, but marked excluded: true)
const gradeMap2A = {
  'a1': { assessmentId: 'a1', studentId: 's1', resolvedScore: 90 },
  'a2': { assessmentId: 'a2', studentId: 's1', resolvedScore: 10, excluded: true }
}
const cat2A = _calculateCategoryGrade(asts1A, gradeMap2A, false)
assert(cat2A === 90, `Excluded assessment is 100% ignored: Expected 90%, got ${cat2A}% (NOT 50%)`)

// Case 2B: Excluded assessment in getAssessmentPercentage returns null
const pctExcluded = getAssessmentPercentage(asts1A[1], { assessmentId: 'a2', resolvedScore: 10, excluded: true })
assert(pctExcluded === null, 'getAssessmentPercentage returns null for excluded task')

// Case 2C: Excluded task in Multi-category course leaves category unassessed
const gradesMultiExcluded = [
  { assessmentId: 'a1', studentId: 's1', resolvedScore: 80 },
  { assessmentId: 'a2', studentId: 's1', resolvedScore: 0, excluded: true }
]
const studentGradeExcluded = await calculateStudentGrade('s1', classMultiCat, {
  assessmentsPreRef: astsMulti,
  gradesPreRef: gradesMultiExcluded,
  settingsPreRef: { capGradesAt100: true }
})
assert(studentGradeExcluded.calculatedOverallGrade === 80, `Excluded assessment in Category B normalizes overall to 80%, got ${studentGradeExcluded.calculatedOverallGrade}%`)
assert(studentGradeExcluded.categoryResults.cat_t === null, 'Category with only excluded assessments reports null')

// ─────────────────────────────────────────────────────────────────────────────
// POLICY 3: MISSED / MISSING IS STRICTLY COUNTED AS ZERO
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[POLICY 3] Missed / Missing Tasks (missed = strictly 0 against total possible)')

// Case 3A: Ast 1 (80/100), Ast 2 (marked missing: true, no score)
const gradeMap3A = {
  'a1': { assessmentId: 'a1', studentId: 's1', resolvedScore: 80 },
  'a2': { assessmentId: 'a2', studentId: 's1', missing: true, resolvedScore: null }
}
const cat3A = _calculateCategoryGrade(asts1A, gradeMap3A, false)
// Total Earned = 80, Total Possible = 200 -> 80 / 200 = 40%
assert(cat3A === 40, `Missing assessment counts as 0/100: Expected 40%, got ${cat3A}%`)

// Case 3B: getAssessmentPercentage on missing grade returns 0
const pctMissing = getAssessmentPercentage(asts1A[1], { assessmentId: 'a2', missing: true, resolvedScore: null })
assert(pctMissing === 0, 'getAssessmentPercentage returns exact 0 for missing task')

// Case 3C: Multi-category with missing task in Thinking category (30% weight)
const gradesMultiMissing = [
  { assessmentId: 'a1', studentId: 's1', resolvedScore: 80 },
  { assessmentId: 'a2', studentId: 's1', missing: true, resolvedScore: null }
]
const studentGradeMissing = await calculateStudentGrade('s1', classMultiCat, {
  assessmentsPreRef: astsMulti,
  gradesPreRef: gradesMultiMissing,
  settingsPreRef: { capGradesAt100: true }
})
// Knowledge = 80 (wt 70), Thinking = 0 (wt 30) -> (80 * 0.70 + 0 * 0.30) / 100 * 100 = 56%
assert(studentGradeMissing.calculatedOverallGrade === 56, `Missing task in Thinking (30% wt) drops overall to exact 56%, got ${studentGradeMissing.calculatedOverallGrade}%`)
assert(studentGradeMissing.categoryResults.cat_t.percentage === 0, 'Missing category evaluates to exact 0%')
assert(studentGradeMissing.weightUsed === 100, 'weightUsed is 100 because Thinking has a missing submission')

// ─────────────────────────────────────────────────────────────────────────────
// POLICY 4: OVERRIDES TAKE PRECEDENCE AT ALL 3 TIERS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[POLICY 4] Teacher Professional Judgment Overrides (Tier 1, Tier 2, Tier 3)')

// Tier 1: Student adjustedGrade
const classWithAdjusted = {
  ...classMultiCat,
  students: {
    's1': {
      studentId: 's1',
      firstName: 'Alice',
      lastName: 'Smith',
      adjustedGrade: 88 // Teacher override
    }
  }
}
const studentResTier1 = await calculateStudentGrade('s1', classWithAdjusted, {
  assessmentsPreRef: astsMulti,
  gradesPreRef: gradesMultiMissing, // Without override, grade is 56%
  settingsPreRef: { capGradesAt100: true }
})
assert(studentResTier1.overallGrade === 88, `Tier 1 adjustedGrade overrides calculated grade (56% -> 88%), got ${studentResTier1.overallGrade}%`)
assert(studentResTier1.displayOverallGrade === 88, `displayOverallGrade reports 88%`)
assert(studentResTier1.calculatedOverallGrade === 56, `calculatedOverallGrade preserves background 56%`)
assert(studentResTier1.isGradeAdjusted === true, `isGradeAdjusted is true`)

// Tier 2: Category Override
const classWithCatOverride = {
  ...classMultiCat,
  students: {
    's1': {
      studentId: 's1',
      firstName: 'Alice',
      lastName: 'Smith',
      categoryOverrides: {
        'cat_k': 95 // Knowledge calculated is 80%, overridden to 95%
      }
    }
  }
}
const studentResTier2 = await calculateStudentGrade('s1', classWithCatOverride, {
  assessmentsPreRef: [astsMulti[0]], // Only Knowledge (weight 70)
  gradesPreRef: [{ assessmentId: 'a1', studentId: 's1', resolvedScore: 80 }],
  settingsPreRef: { capGradesAt100: true }
})
assert(studentResTier2.categoryResults.cat_k.percentage === 95, `Tier 2 category override reports 95%, got ${studentResTier2.categoryResults.cat_k.percentage}%`)
assert(studentResTier2.categoryResults.cat_k.isOverridden === true, `Category isOverridden is true`)
assert(studentResTier2.calculatedOverallGrade === 95, `Overall grade rolls up overridden category score: got ${studentResTier2.calculatedOverallGrade}%`)

// Tier 2B: Category Override on Unassessed Category
const classWithUnassessedCatOverride = {
  ...classMultiCat,
  students: {
    's1': {
      studentId: 's1',
      firstName: 'Alice',
      lastName: 'Smith',
      categoryOverrides: {
        'cat_t': 85 // Thinking has NO assessments, overridden to 85%
      }
    }
  }
}
const studentResTier2B = await calculateStudentGrade('s1', classWithUnassessedCatOverride, {
  assessmentsPreRef: [astsMulti[0]], // Knowledge assessed (80%), Thinking unassessed
  gradesPreRef: [{ assessmentId: 'a1', studentId: 's1', resolvedScore: 80 }],
  settingsPreRef: { capGradesAt100: true }
})
// Knowledge: 80% (wt 70), Thinking: 85% override (wt 30) -> (80 * 0.70 + 85 * 0.30) = 56 + 25.5 = 81.5 -> 82%
assert(studentResTier2B.categoryResults.cat_t.percentage === 85, `Unassessed category override is honored: got ${studentResTier2B.categoryResults.cat_t.percentage}%`)
assert(studentResTier2B.categoryResults.cat_t.isOverridden === true, `Unassessed category isOverridden is true`)
assert(studentResTier2B.calculatedOverallGrade === 82, `Overall rolls up unassessed overridden category: Expected 82%, got ${studentResTier2B.calculatedOverallGrade}%`)

// Tier 3: SBAR Expectation Override
const classSbarOverride = {
  classId: 'c_sbar_ov',
  gradingFramework: 'sbar',
  sbarAlgorithm: 'decaying_average',
  students: {
    's1': {
      studentId: 's1',
      firstName: 'Alice',
      lastName: 'Smith',
      expectationOverrides: {
        'B1.1': 'L4' // Level 4 (88%)
      }
    }
  }
}
const sbarAsts = [
  { assessmentId: 'as1', expectationIds: ['B1.1'], totalPoints: 100, date: '2026-09-01' },
  { assessmentId: 'as2', expectationIds: ['B1.1'], totalPoints: 100, date: '2026-09-02' }
]
const sbarGradeMap = {
  'as1': { 's1': { resolvedScore: 50, expectationScores: { 'B1.1': 50 } } },
  'as2': { 's1': { resolvedScore: 60, expectationScores: { 'B1.1': 60 } } }
}

const sbarMastery = calculateSBARExpectationMastery(classSbarOverride, sbarAsts, sbarGradeMap)
const b1Entry = sbarMastery['s1']['B1.1']
assert(b1Entry.isOverridden === true, 'SBAR expectation isOverridden is true')
assert(b1Entry.score === 88, `SBAR expectation displays overridden score: Expected 88, got ${b1Entry.score}`)
assert(b1Entry.badge.level === 'L4', `SBAR expectation displays overridden badge: Expected L4, got ${b1Entry.badge.level}`)
// Algorithmic decaying average was 0.65 * 60 + 0.35 * 50 = 39 + 17.5 = 56.5%
assert(b1Entry.calculatedScore === 56.5, `Background calculated score preserves algorithmic 56.5%, got ${b1Entry.calculatedScore}`)
assert(b1Entry.calculatedBadge.level === 'L1', `Background calculated badge preserves L1, got ${b1Entry.calculatedBadge.level}`)

const sbarOverallMastery = calculateSBARStudentOverallMastery('s1', classSbarOverride, sbarAsts, sbarGradeMap, 'decaying_average', [], sbarMastery)
assert(sbarOverallMastery === 88, `SBAR overall course mastery uses overridden 88%: got ${sbarOverallMastery}%`)

// ─────────────────────────────────────────────────────────────────────────────
// POLICY 5: SBAR LOGIC RULES (Formative, Diagnostic Weight 0, Hybrid 65/25/10)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[POLICY 5] SBAR Rules (Formative Exclusion, Diagnostic 0x Weight, 65/25/10 Normalization)')

// 5A: Formative vs Summative Precedence
const sbarAstsFormative = [
  { assessmentId: 'as1', expectationIds: ['A1.1'], isFormative: true, assessmentType: 'formative', date: '2026-09-01' },
  { assessmentId: 'as2', expectationIds: ['A1.1'], isFormative: false, assessmentType: 'summative', date: '2026-09-05' }
]
const sbarGradeMapFormative = {
  'as1': { 's1': { expectationScores: { 'A1.1': 60 } } }, // Formative: 60%
  'as2': { 's1': { expectationScores: { 'A1.1': 95 } } }  // Summative: 95%
}
const classSbarPlain = {
  classId: 'c_sbar_plain',
  gradingFramework: 'sbar',
  sbarAlgorithm: 'decaying_average',
  students: { 's1': { studentId: 's1', firstName: 'Alice', lastName: 'Smith' } }
}
const masteryFormative = calculateSBARExpectationMastery(classSbarPlain, sbarAstsFormative, sbarGradeMapFormative)
// When summative evidence exists, formative evidence is NOT decayed into it!
assert(masteryFormative['s1']['A1.1'].score === 95, `Summative (95%) cleanly supersedes formative (60%): Expected 95%, got ${masteryFormative['s1']['A1.1'].score}%`)
assert(masteryFormative['s1']['A1.1'].isProvisional === false, 'Summative evidence marks isProvisional as false')

// 5B: Formative-Only is Provisional
const sbarGradeMapFormativeOnly = {
  'as1': { 's1': { expectationScores: { 'A1.1': 60 } } }
}
const masteryFormativeOnly = calculateSBARExpectationMastery(classSbarPlain, [sbarAstsFormative[0]], sbarGradeMapFormativeOnly)
assert(masteryFormativeOnly['s1']['A1.1'].score === 60, `Formative-only produces provisional score: got ${masteryFormativeOnly['s1']['A1.1'].score}%`)
assert(masteryFormativeOnly['s1']['A1.1'].isProvisional === true, 'Formative-only marks isProvisional as true')

// 5C: Diagnostic / Weight 0 Excluded from Course Overall
const classSbarWeightZero = {
  ...classSbarPlain,
  gradebookUnits: [
    {
      unitId: 'u1',
      name: 'Diagnostic Unit',
      expectations: [
        { code: 'D1.1', weight: 0 },   // Weight 0 (diagnostic)
        { code: 'C1.1', weight: 1.0 }  // Weight 1.0 (standard curriculum)
      ]
    }
  ]
}
const sbarAstsWeights = [
  { assessmentId: 'ad1', expectationIds: ['D1.1'], date: '2026-09-01' },
  { assessmentId: 'ac1', expectationIds: ['C1.1'], date: '2026-09-02' }
]
const sbarGradeMapWeights = {
  'ad1': { 's1': { expectationScores: { 'D1.1': 30 } } }, // 30% diagnostic baseline
  'ac1': { 's1': { expectationScores: { 'C1.1': 90 } } }  // 90% curriculum standard
}
const masteryWeights = calculateSBARExpectationMastery(classSbarWeightZero, sbarAstsWeights, sbarGradeMapWeights)
const overallZeroWeight = calculateSBARStudentOverallMastery('s1', classSbarWeightZero, sbarAstsWeights, sbarGradeMapWeights, 'decaying_average', [], masteryWeights)
assert(overallZeroWeight === 90, `Diagnostic 0x weight is excluded from course mastery: Expected 90%, got ${overallZeroWeight}% (NOT 60%)`)

// 5D: Ontario 65/25/10 Hybrid SBAR with Evaluation Components
const classSbarHybrid = {
  classId: 'c_sbar_hybrid',
  gradingFramework: 'sbar',
  sbarAlgorithm: 'decaying_average',
  sbarWeighting: {
    enabled: true,
    termWeight: 65,
    components: [
      { componentId: 'comp_exam', name: 'Final Exam', weight: 25, assessmentId: 'ast_exam' },
      { componentId: 'comp_att', name: 'Attendance & Participation', weight: 10, assessmentId: 'ast_att' }
    ]
  },
  students: { 's1': { studentId: 's1', firstName: 'Alice', lastName: 'Smith' } }
}

const sbarHybridAsts = [
  { assessmentId: 'ast_term1', expectationIds: ['C1.1'], totalPoints: 100, date: '2026-09-01' },
  { assessmentId: 'ast_exam', totalPoints: 100, date: '2026-11-20' },
  { assessmentId: 'ast_att', totalPoints: 100, date: '2026-11-25' }
]

// Scenario 5D-1: Mid-term (Exam and Attendance not written yet = Blank)
const gradesHybridMidterm = [
  { assessmentId: 'ast_term1', studentId: 's1', expectationScores: { 'C1.1': 80 } }
]
const resHybridMidterm = await calculateStudentGrade('s1', classSbarHybrid, {
  assessmentsPreRef: sbarHybridAsts,
  gradesPreRef: gradesHybridMidterm,
  settingsPreRef: { capGradesAt100: true }
})
// Denominator should normalize over 65% weightUsed, yielding current term mastery (80%)
assert(resHybridMidterm.calculatedOverallGrade === 80, `Hybrid SBAR mid-term normalizes pending components: Expected 80%, got ${resHybridMidterm.calculatedOverallGrade}%`)
assert(resHybridMidterm.weightUsed === 65, `Hybrid SBAR mid-term weightUsed is 65, got ${resHybridMidterm.weightUsed}`)

// Scenario 5D-2: Final Exam is marked MISSING: true
const gradesHybridMissingExam = [
  { assessmentId: 'ast_term1', studentId: 's1', expectationScores: { 'C1.1': 80 } },
  { assessmentId: 'ast_exam', studentId: 's1', missing: true, resolvedScore: null }
]
const resHybridMissingExam = await calculateStudentGrade('s1', classSbarHybrid, {
  assessmentsPreRef: sbarHybridAsts,
  gradesPreRef: gradesHybridMissingExam,
  settingsPreRef: { capGradesAt100: true }
})
// Term Mastery = 80 (wt 65), Exam = 0 (wt 25). Weight used = 90.
// (80 * 0.65 + 0 * 0.25) / 90 * 100 = 52 / 90 * 100 = 57.78% -> 58%
assert(resHybridMissingExam.calculatedOverallGrade === 58, `Hybrid SBAR penalizes missing final exam with 0%: Expected 58%, got ${resHybridMissingExam.calculatedOverallGrade}%`)
assert(resHybridMissingExam.weightUsed === 90, `Hybrid SBAR includes missing exam in weightUsed (90), got ${resHybridMissingExam.weightUsed}`)

// Scenario 5D-3: Complete Final Evaluation (Term 80%, Exam 80%, Attendance 100%)
const gradesHybridComplete = [
  { assessmentId: 'ast_term1', studentId: 's1', expectationScores: { 'C1.1': 80 } },
  { assessmentId: 'ast_exam', studentId: 's1', resolvedScore: 80 },
  { assessmentId: 'ast_att', studentId: 's1', resolvedScore: 100 }
]
const resHybridComplete = await calculateStudentGrade('s1', classSbarHybrid, {
  assessmentsPreRef: sbarHybridAsts,
  gradesPreRef: gradesHybridComplete,
  settingsPreRef: { capGradesAt100: true }
})
// 80 * 0.65 + 80 * 0.25 + 100 * 0.10 = 52 + 20 + 10 = 82%
assert(resHybridComplete.calculatedOverallGrade === 82, `Hybrid SBAR complete evaluation computes exact composite: Expected 82%, got ${resHybridComplete.calculatedOverallGrade}%`)
assert(resHybridComplete.weightUsed === 100, 'Hybrid SBAR complete evaluation uses 100% weight')

console.log('\n===================================================================')
console.log('🎉 ALL GRADING POLICY GROUND-TRUTH ASSERTIONS PASSED (100%)!')
console.log('===================================================================\n')
