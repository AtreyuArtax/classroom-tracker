/**
 * src/test_elementary_sbar_straight_grades_audit.js
 *
 * Exhaustive End-to-End Stress Test & Mathematical Integrity Audit Suite
 * for Elementary SBAR (Standards-Based Assessment & Reporting) with Straight Grades (Grades 1–8).
 */

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
}

import assert from 'assert'

const {
  preciseRound,
  calculatePercentChange,
  ensureFiniteNumber,
  safeSum,
  safeMean,
  safeDivide
} = await import('./utils/math.js')

const {
  calculateDecayingAverage,
  calculatePowerLaw,
  calculateMode,
  getSBARLevelBadge,
  SBAR_LEVELS,
  resolveStudentExpectationOverride,
  calculateSBARExpectationMastery,
  calculateSBARStudentOverallMastery
} = await import('./db/gradebook/gradeCalcSBAR.js')

const {
  filterAssessmentsForSubject,
  getAssessmentPercentage,
  calculateStudentGrade,
  calculateStandardDeviation,
  calculateMedian,
  detectOutliers,
  buildDistributionBuckets,
  buildLevelDistributionBuckets,
  isCohortMatch
} = await import('./db/gradebook/gradeCalc.js')

const {
  getEffectiveClassRecord,
  getStudentEffectiveGrade,
  cleanUnitName,
  parseGradesFromClass,
  DEFAULT_ELEMENTARY_SUBJECTS
} = await import('./composables/useElementary.js')

console.log('================================================================================')
console.log('🏫 EXHAUSTIVE ELEMENTARY SBAR & MATHEMATICAL INTEGRITY AUDIT SUITE (GRADES 1–8)')
console.log('================================================================================\n')

let totalAssertions = 0
function check(condition, message) {
  totalAssertions++
  assert.ok(condition, message)
  console.log(`  ✓ ${message}`)
}

// ================================================================================
// SECTION 1: MATHEMATICAL UTILITIES & STRING COERCION DEFENSE
// ================================================================================
console.log('--- SECTION 1: Mathematical Utilities & Defensive Arithmetic ---')

// 1.1 safeSum
check(safeSum([80, 90]) === 170, 'safeSum adds numeric 80 and 90 to 170')
check(safeSum(['80', '90']) === 170, 'safeSum prevents string concatenation ("80" + "90" !== "8090")')
check(safeSum([80, null, undefined, '', 'abc', NaN, Infinity, 20]) === 100, 'safeSum ignores null, undefined, empty, NaN, and non-finite values')
check(safeSum([]) === 0, 'safeSum of empty array is 0')

// 1.2 safeMean
check(safeMean([80, 90]) === 85, 'safeMean calculates 85 for [80, 90]')
check(safeMean(['80', '90', '100']) === 90, 'safeMean converts numeric strings safely')
check(safeMean([70, 75, 80], 1) === 75, 'safeMean rounds to 1 decimal place safely')
check(safeMean([]) === null, 'safeMean of empty array returns null (not NaN or 0)')
check(safeMean([null, undefined, '']) === null, 'safeMean of non-numeric values returns null')
check(safeMean([0, 0, 0]) === 0, 'safeMean of zeros returns 0 (not null)')

// 1.3 safeDivide
check(safeDivide(100, 2) === 50, 'safeDivide calculates 100 / 2 = 50')
check(safeDivide(10, 0) === null, 'safeDivide returns null for division by zero (not Infinity)')
check(safeDivide(0, 100) === 0, 'safeDivide handles 0 numerator correctly')
check(safeDivide('100', '4') === 25, 'safeDivide converts numeric string operands')
check(safeDivide('abc', 10) === null, 'safeDivide handles NaN numerator safely')
check(safeDivide(10, 'abc') === null, 'safeDivide handles NaN denominator safely')

// 1.4 preciseRound & floating point drift
check(preciseRound(1.005, 2) === 1.01, 'preciseRound avoids floating-point drift (1.005 -> 1.01)')
check(preciseRound(84.44999999999, 1) === 84.4, 'preciseRound handles float precision accurately')
check(preciseRound(null) === null, 'preciseRound of null returns null')
check(preciseRound(NaN) === null, 'preciseRound of NaN returns null')

console.log()

// ================================================================================
// SECTION 2: THE 5 SBAR MASTERY CALCULATION ENGINES UNDER STRESS
// ================================================================================
console.log('--- SECTION 2: SBAR 5 Mastery Algorithms Under Edge Conditions ---')

// 2.1 Decaying Average (power decay: n=0, 1, 2, 10 attempts; identical scores; extreme outliers)
check(calculateDecayingAverage([]) === null, 'Decaying Avg: n=0 returns null')
check(calculateDecayingAverage([null, '']) === null, 'Decaying Avg: invalid values return null')
check(calculateDecayingAverage([75]) === 75, 'Decaying Avg: n=1 returns exact score (75%)')
check(calculateDecayingAverage([75.333333]) === 75.3, 'Decaying Avg: n=1 rounds to 1 decimal')
check(calculateDecayingAverage(['60', '80'], 0.65) === 73, 'Decaying Avg: n=2 with strings evaluates (0.65*80 + 0.35*60 = 73)')
check(calculateDecayingAverage([85, 85, 85, 85], 0.65) === 85, 'Decaying Avg: identical scores evaluate to exact identical score')

// Rapid Improvement & Decaying Recency Bias: [50, 60, 70, 80, 95]
const decayingImproving = calculateDecayingAverage([50, 60, 70, 80, 95], 0.65)
check(decayingImproving >= 87.5 && decayingImproving <= 95, `Decaying Avg: rapid improver reaches ${decayingImproving}% (>= 87.5%)`)

// n=10 convergence test
const tenAttempts = [40, 45, 50, 55, 60, 65, 70, 75, 80, 90]
const tenResult = calculateDecayingAverage(tenAttempts, 0.65)
check(tenResult >= 85 && isFinite(tenResult), `Decaying Avg: 10 attempts converges stably to ${tenResult}%`)

// Extreme Outlier Resilience: Student at 90s has single corrupt/distracted 20%
const outlierEarly = calculateDecayingAverage([20, 90, 90, 90], 0.65)
check(outlierEarly >= 87, `Decaying Avg: early outlier is heavily discounted (${outlierEarly}%)`)

// 2.2 Mean / Weighted Average across Expectations (with expectation multipliers 0x, 0.5x, 1x, 1.5x, 2x)
const mockClassForWeights = {
  classId: 'c_weights',
  gradingFramework: 'sbar',
  sbarAlgorithm: 'decaying_average',
  students: {
    'st_weighted': { studentId: 'st_weighted', firstName: 'Weight', lastName: 'Tester' }
  },
  expectations: [
    { expectationId: 'e_diag', code: 'DIAG.1', weight: 0.0 },     // 0x diagnostic standard
    { expectationId: 'e_minor', code: 'MIN.1', weight: 0.5 },    // 0.5x minor standard
    { expectationId: 'e_normal', code: 'NORM.1', weight: 1.0 },  // 1.0x standard
    { expectationId: 'e_major', code: 'MAJ.1', weight: 1.5 },    // 1.5x major standard
    { expectationId: 'e_core', code: 'CORE.1', weight: 2.0 }     // 2.0x foundational standard
  ]
}

const mockAssessmentsWeights = [
  { assessmentId: 101, expectationIds: ['DIAG.1'], target: 'class' },
  { assessmentId: 102, expectationIds: ['MIN.1'], target: 'class' },
  { assessmentId: 103, expectationIds: ['NORM.1'], target: 'class' },
  { assessmentId: 104, expectationIds: ['MAJ.1'], target: 'class' },
  { assessmentId: 105, expectationIds: ['CORE.1'], target: 'class' }
]

const mockGradeMapWeights = {
  101: { 'st_weighted': { expectationScores: { 'DIAG.1': 40 } } },  // 40% on diagnostic (0x weight)
  102: { 'st_weighted': { expectationScores: { 'MIN.1': 60 } } },   // 60% on 0.5x (30 sum)
  103: { 'st_weighted': { expectationScores: { 'NORM.1': 80 } } },  // 80% on 1.0x (80 sum)
  104: { 'st_weighted': { expectationScores: { 'MAJ.1': 90 } } },   // 90% on 1.5x (135 sum)
  105: { 'st_weighted': { expectationScores: { 'CORE.1': 100 } } }  // 100% on 2.0x (200 sum)
}

// Expected calculation:
// sum = (60 * 0.5) + (80 * 1.0) + (90 * 1.5) + (100 * 2.0) = 30 + 80 + 135 + 200 = 445
// divisor = 0.5 + 1.0 + 1.5 + 2.0 = 5.0 (DIAG.1 weight 0 is excluded!)
// mastery = 445 / 5.0 = 89%
const weightedMastery = calculateSBARStudentOverallMastery('st_weighted', mockClassForWeights, mockAssessmentsWeights, mockGradeMapWeights)
check(weightedMastery === 89, `Weighted Average: 0x diagnostic excluded, exactly computed 89% (got ${weightedMastery}%)`)

// 2.3 Mode / Most Consistent (multi-modal ties, single score, no repeated levels, recency bias)
check(calculateMode([]) === null, 'Mode: n=0 returns null')
check(calculateMode([88]) === 88, 'Mode: n=1 returns exact score (88%)')
check(calculateMode([75, 75, 88]) === 75, 'Mode: [75, 75, 88] selects dominant Level 3 (75%)')
check(calculateMode([65, 88, 88]) === 88, 'Mode: [65, 88, 88] selects dominant Level 4 (88%)')

// Multi-modal tie: [75, 88] (one L3, one L4 - frequency tie)
// Should break tie toward most recent attempt (88, L4)
const modeTie = calculateMode([75, 88])
check(modeTie === 88, `Mode: tie-breaker selects newest level attempt (got ${modeTie}%)`)

// No repeated levels: [55, 65, 75, 88] -> all count 1. Recency selects newest (88, L4)
const modeNoRepeats = calculateMode([55, 65, 75, 88])
check(modeNoRepeats === 88, `Mode: all distinct levels breaks tie to most recent attempt (${modeNoRepeats}%)`)

// 2.4 Most Recent (latest chronological valid attempt & 3-attempt recent average)
const mockClassRecent = {
  classId: 'c_recent',
  sbarAlgorithm: 'most_recent',
  students: { 'st_r': { studentId: 'st_r' } },
  expectations: [{ expectationId: 'e1', code: 'REC.1' }]
}
const mockAssessmentsRecent = [
  { assessmentId: 201, expectationIds: ['REC.1'], date: '2026-09-10' },
  { assessmentId: 202, expectationIds: ['REC.1'], date: '2026-10-15' },
  { assessmentId: 203, expectationIds: ['REC.1'], date: '2026-11-20' },
  { assessmentId: 204, expectationIds: ['REC.1'], date: '2026-12-05' }
]
const mockGradesRecent = {
  201: { 'st_r': { expectationScores: { 'REC.1': 50 } } },
  202: { 'st_r': { expectationScores: { 'REC.1': 70 } } },
  203: { 'st_r': { expectationScores: { 'REC.1': 80 } } },
  204: { 'st_r': { expectationScores: { 'REC.1': 90 } } }
}

// In 'most_recent', it averages the last 3 valid attempts: [70, 80, 90] -> 80%
const recentMastery = calculateSBARExpectationMastery(mockClassRecent, mockAssessmentsRecent, mockGradesRecent, 'most_recent')
check(recentMastery['st_r']['REC.1'].score === 80, `Most Recent: average of last 3 attempts evaluates to 80% (got ${recentMastery['st_r']['REC.1'].score}%)`)

// Single attempt in 'most_recent':
const singleRecent = calculateSBARExpectationMastery(mockClassRecent, [mockAssessmentsRecent[0]], { 201: mockGradesRecent[201] }, 'most_recent')
check(singleRecent['st_r']['REC.1'].score === 50, `Most Recent: single attempt evaluates to 50%`)

// In 'latest' (single most recent attempt):
const latestMastery = calculateSBARExpectationMastery(mockClassRecent, mockAssessmentsRecent, mockGradesRecent, 'latest')
check(latestMastery['st_r']['REC.1'].score === 90, `Latest: single newest attempt evaluates to 90% (got ${latestMastery['st_r']['REC.1'].score}%)`)

// 2.5 Power Law (boundary projections, single attempt, flat slope, negative slopes, all zeros)
check(calculatePowerLaw([]) === null, 'Power Law: n=0 returns null')
check(calculatePowerLaw([78]) === 78, 'Power Law: n=1 returns exact score (78%)')
check(calculatePowerLaw([0, 0, 0]) === 0, 'Power Law: all zeros returns 0 (not log(1) artifact)')
check(calculatePowerLaw([80, 80, 80]) === 80, 'Power Law: flat slope (identical scores) projects exact 80%')

// Growth trajectory: [50, 65, 80, 95]
const plGrowth = calculatePowerLaw([50, 65, 80, 95])
check(plGrowth >= 90 && plGrowth <= 100, `Power Law: positive growth trajectory projects ${plGrowth}% (<= 100%)`)

// Negative slope: [90, 75, 60]
const plDeclining = calculatePowerLaw([90, 75, 60])
check(plDeclining < 65 && plDeclining >= 0, `Power Law: declining trajectory projects ${plDeclining}% (>= 0%)`)

// Boundary clamping: ensure never exceeds 100% or falls below 0%
const plExtreme = calculatePowerLaw([10, 50, 95, 100])
check(plExtreme <= 100 && isFinite(plExtreme), `Power Law: upper boundary is strictly clamped at <= 100% (${plExtreme}%)`)

console.log()

// ================================================================================
// SECTION 3: CONVERSION MATRICES & ONTARIO RUBRIC SCALES
// ================================================================================
console.log('--- SECTION 3: Conversion Matrices & Rubric Scales ---')

const scaleChecks = [
  { pct: 100, expectedLevel: 'L4+', expectedNum: 4.3 },
  { pct: 96,  expectedLevel: 'L4+', expectedNum: 4.3 },
  { pct: 95,  expectedLevel: 'L4+', expectedNum: 4.3 },
  { pct: 94,  expectedLevel: 'L4',  expectedNum: 4.0 },
  { pct: 88,  expectedLevel: 'L4',  expectedNum: 4.0 },
  { pct: 87,  expectedLevel: 'L4',  expectedNum: 4.0 },
  { pct: 86,  expectedLevel: 'L4-', expectedNum: 3.7 },
  { pct: 80,  expectedLevel: 'L4-', expectedNum: 3.7 },
  { pct: 79,  expectedLevel: 'L3+', expectedNum: 3.3 },
  { pct: 77,  expectedLevel: 'L3+', expectedNum: 3.3 },
  { pct: 76,  expectedLevel: 'L3',  expectedNum: 3.0 },
  { pct: 73,  expectedLevel: 'L3',  expectedNum: 3.0 },
  { pct: 72,  expectedLevel: 'L3-', expectedNum: 2.7 },
  { pct: 70,  expectedLevel: 'L3-', expectedNum: 2.7 },
  { pct: 69,  expectedLevel: 'L2+', expectedNum: 2.3 },
  { pct: 67,  expectedLevel: 'L2+', expectedNum: 2.3 },
  { pct: 66,  expectedLevel: 'L2',  expectedNum: 2.0 },
  { pct: 63,  expectedLevel: 'L2',  expectedNum: 2.0 },
  { pct: 62,  expectedLevel: 'L2-', expectedNum: 1.7 },
  { pct: 60,  expectedLevel: 'L2-', expectedNum: 1.7 },
  { pct: 59,  expectedLevel: 'L1+', expectedNum: 1.3 },
  { pct: 57,  expectedLevel: 'L1+', expectedNum: 1.3 },
  { pct: 56,  expectedLevel: 'L1',  expectedNum: 1.0 },
  { pct: 53,  expectedLevel: 'L1',  expectedNum: 1.0 },
  { pct: 52,  expectedLevel: 'L1-', expectedNum: 0.7 },
  { pct: 50,  expectedLevel: 'L1-', expectedNum: 0.7 },
  { pct: 49,  expectedLevel: 'R',   expectedNum: 0.3 },
  { pct: 0,   expectedLevel: 'R',   expectedNum: 0.3 }
]

scaleChecks.forEach(({ pct, expectedLevel, expectedNum }) => {
  const badge = getSBARLevelBadge(pct)
  check(badge.level === expectedLevel && badge.levelNum === expectedNum, `Rubric Matrix: ${pct}% -> ${expectedLevel} (${expectedNum})`)
})

// Unassessed / null handling
const unassessedBadge = getSBARLevelBadge(null)
check(unassessedBadge.level === '—' && unassessedBadge.levelNum === 0, 'Rubric Matrix: null maps to — (Not Assessed)')

console.log()

// ================================================================================
// SECTION 4: FULL ELEMENTARY SCHOOL YEAR SIMULATION (GRADES 1–8)
// 25 Students · 7 Ontario Subjects · 42 Assessments across 3 Terms
// ================================================================================
console.log('--- SECTION 4: Complete Elementary School Year Stress Simulation ---')

const SUBJECTS_CONFIG = [
  { subjectId: 'subj_math', name: 'Mathematics', code: 'MATH', gradingFramework: 'sbar', sbarAlgorithm: 'decaying_average', strands: ['B', 'C', 'D'] },
  { subjectId: 'subj_lang', name: 'Language', code: 'LANG', gradingFramework: 'sbar', sbarAlgorithm: 'power_law', strands: ['A', 'B', 'C'] },
  { subjectId: 'subj_sci', name: 'Science & Technology', code: 'SCI', gradingFramework: 'sbar', sbarAlgorithm: 'mode', strands: ['A', 'B'] },
  { subjectId: 'subj_soc', name: 'Social Studies', code: 'SOC', gradingFramework: 'sbar', sbarAlgorithm: 'most_recent', strands: ['A', 'B'] },
  { subjectId: 'subj_art', name: 'The Arts', code: 'ART', gradingFramework: 'sbar', sbarAlgorithm: 'highest', strands: ['D', 'M', 'V'] },
  { subjectId: 'subj_hpe', name: 'Health & Phys Ed', code: 'HPE', gradingFramework: 'sbar', sbarAlgorithm: 'decaying_average', strands: ['A', 'B'] },
  { subjectId: 'subj_fsl', name: 'Core French', code: 'FSL', gradingFramework: 'sbar', sbarAlgorithm: 'decaying_average', strands: ['A', 'B'] }
]

// Generate 25 students with diverse straight grades (Grades 1 through 8) and IEP accommodations
const students = {}
for (let i = 1; i <= 25; i++) {
  const studentId = `st_${i}`
  const gradeNum = ((i - 1) % 8) + 1 // Cycles Grades 1 through 8
  const isIEP = i === 7 || i === 14  // Students 7 & 14 have IEP modified subject grade
  students[studentId] = {
    studentId,
    firstName: `Student${i}`,
    lastName: `TestCohort`,
    gradeLevel: `Grade ${gradeNum}`,
    hasIEP: isIEP,
    accommodations: isIEP ? {
      modifiedSubjectGrades: {
        'subj_math': `Grade ${Math.max(1, gradeNum - 2)}` // Modified 2 grades lower in Math
      }
    } : {}
  }
}

// Build subjects with strands and expectations
const populatedSubjects = SUBJECTS_CONFIG.map(sc => {
  const gradebookUnits = sc.strands.map((strandCode, sIdx) => ({
    unitId: `unit_${sc.subjectId}_${strandCode}`,
    name: `Strand ${strandCode}`,
    gradeLevel: 'Grade 5',
    weight: 0
  }))

  const expectations = []
  gradebookUnits.forEach(u => {
    const strandCode = u.name.replace('Strand ', '')
    for (let e = 1; e <= 3; e++) {
      expectations.push({
        expectationId: `exp_${sc.subjectId}_${strandCode}${e}`,
        unitId: u.unitId,
        code: `${strandCode}${e}.1`,
        description: `${sc.name} Strand ${strandCode} Expectation ${e}.1`,
        isOverall: e === 1,
        weight: e === 1 ? 2.0 : 1.0, // e=1 is 2x foundational standard
        gradeLevel: 'Grade 5'
      })
    }
  })

  return {
    subjectId: sc.subjectId,
    name: sc.name,
    code: sc.code,
    gradingFramework: sc.gradingFramework,
    sbarAlgorithm: sc.sbarAlgorithm,
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits,
    expectations
  }
})

const yearClassRecord = {
  classId: 'cls_elem_full_year',
  name: 'Grade 5 Homeroom',
  gradeLevel: 'Grade 5',
  classType: 'elementary',
  year: '2026-2027',
  semester: '1',
  subjects: populatedSubjects,
  students
}

// Generate 42 assessments across 3 terms (14 per term, 2 per subject per term)
// Term 1: Sept 1 - Nov 30, 2026
// Term 2: Dec 1, 2026 - Mar 15, 2027
// Term 3: Mar 16 - June 25, 2027
const yearAssessments = []
const yearGradeMap = {}
let asmtCounter = 1

const terms = [
  { term: 1, datePrefix: '2026-10' },
  { term: 2, datePrefix: '2027-01' },
  { term: 3, datePrefix: '2027-04' }
]

terms.forEach(({ term, datePrefix }) => {
  populatedSubjects.forEach(sub => {
    for (let t = 1; t <= 2; t++) {
      const astId = 1000 + asmtCounter++
      const day = 10 + t * 5
      const strandIdx = ((term - 1) * 2 + (t - 1)) % sub.gradebookUnits.length
      const strandUnit = sub.gradebookUnits[strandIdx]
      const taggedExps = sub.expectations
        .filter(e => e.unitId === strandUnit.unitId)
        .map(e => e.code)
      
      const asmt = {
        assessmentId: astId,
        classId: yearClassRecord.classId,
        subjectId: sub.subjectId,
        name: `${sub.name} T${term} Task ${t}`,
        date: `${datePrefix}-${day}`,
        assessmentType: 'product',
        isFormative: false,
        totalPoints: 4,
        expectationIds: taggedExps
      }
      yearAssessments.push(asmt)

      // Enter student grades
      yearGradeMap[astId] = {}
      Object.keys(students).forEach((sId, sIdx) => {
        // Create realistic distribution across students
        // sIdx 0-4: High achievers (85-98)
        // sIdx 5-14: Consistent Proficient (72-84)
        // sIdx 15-20: Approaching (60-70)
        // sIdx 21-23: Remediation / Developing (45-58)
        // sIdx 24: Unassessed / Excused on some tasks
        let baseScore = 75
        if (sIdx < 5) baseScore = 88 + (sIdx % 3) * 4
        else if (sIdx < 15) baseScore = 74 + (sIdx % 4) * 2
        else if (sIdx < 21) baseScore = 62 + (sIdx % 3) * 3
        else if (sIdx < 24) baseScore = 52 + (sIdx % 2) * 4
        else baseScore = null // Student 25 has partial assessments

        if (baseScore !== null) {
          // Term progression: slight growth (+2% per term)
          const termScore = Math.min(100, baseScore + (term - 1) * 2)
          const expScores = {}
          taggedExps.forEach(code => {
            expScores[code] = termScore
          })

          yearGradeMap[astId][sId] = {
            gradeId: `grd_${astId}_${sId}`,
            assessmentId: astId,
            studentId: sId,
            classId: yearClassRecord.classId,
            expectationScores: expScores,
            masteryLevel: termScore,
            resolvedScore: termScore,
            missing: false,
            excluded: false
          }
        }
      })
    }
  })
})

check(yearAssessments.length === 42, `Assessment Generation: generated ${yearAssessments.length} assessments across 3 terms (expected 42)`)
check(Object.keys(yearGradeMap).length === 42, `Gradebook Entry: 42 assessment grade matrices initialized`)

console.log()

// ================================================================================
// SECTION 5: SUBJECT ISOLATION & ZERO CROSS-SUBJECT BLEED
// ================================================================================
console.log('--- SECTION 5: Clean Separation & Zero Subject Bleed-Over ---')

populatedSubjects.forEach(sub => {
  const eff = getEffectiveClassRecord(yearClassRecord, sub.subjectId)
  check(eff.activeSubjectId === sub.subjectId, `Subject ${sub.name}: effective record activeSubjectId is ${sub.subjectId}`)
  check(eff.gradingFramework === 'sbar', `Subject ${sub.name}: gradingFramework is strictly 'sbar'`)
  check(eff.sbarAlgorithm === sub.sbarAlgorithm, `Subject ${sub.name}: preserves active SBAR algorithm '${sub.sbarAlgorithm}'`)

  // Filter assessments for this subject
  const subAssessments = filterAssessmentsForSubject(yearAssessments, eff)
  check(subAssessments.length === 6, `Subject ${sub.name}: strictly 6 assessments isolated (expected 6, got ${subAssessments.length})`)
  
  // Verify ZERO assessments belong to any other subject
  const leaked = subAssessments.filter(a => a.subjectId !== sub.subjectId)
  check(leaked.length === 0, `Subject ${sub.name}: zero leaked assessments from other subjects (0 bleed-over)`)

  // Calculate SBAR Expectation Mastery for this subject
  const masteryMap = calculateSBARExpectationMastery(eff, subAssessments, yearGradeMap, eff.sbarAlgorithm)
  
  // Verify all evaluated scores are finite and within Ontario scale [0, 100]
  let totalEvaluatedExps = 0
  let invalidScoresCount = 0

  Object.entries(masteryMap).forEach(([sId, expObj]) => {
    Object.entries(expObj).forEach(([eCode, eData]) => {
      totalEvaluatedExps++
      if (eData.score !== null) {
        if (isNaN(eData.score) || !isFinite(eData.score) || eData.score < 0 || eData.score > 100) {
          invalidScoresCount++
        }
      }
    })
  })

  check(invalidScoresCount === 0, `Subject ${sub.name}: all ${totalEvaluatedExps} expectation scores are finite and within 0..100%`)
})

console.log()

// ================================================================================
// SECTION 6: STUDENT DOSSIER, STRAND BREAKDOWN & OVERRIDES INTEGRATION
// ================================================================================
console.log('--- SECTION 6: Student Dossier & Strand Progress Fidelity ---')

// Test Student 1 across all 7 subjects in dossier
const effMath = getEffectiveClassRecord(yearClassRecord, 'subj_math')
const mathAssessments = filterAssessmentsForSubject(yearAssessments, effMath)
const mathMasteryMap = calculateSBARExpectationMastery(effMath, mathAssessments, yearGradeMap, effMath.sbarAlgorithm)

// Simulate DossierSBARMasteryBreakdown unitBreakdown logic with flat expectations support
const mathUnits = effMath.gradebookUnits || []
const student1Mastery = mathMasteryMap['st_1'] || {}

const mathUnitBreakdown = mathUnits.map(u => {
  const uExps = (u.expectations && u.expectations.length > 0)
    ? u.expectations
    : (effMath.expectations || []).filter(e => e.unitId && String(e.unitId) === String(u.unitId))

  let weightedSum = 0
  let totalWeight = 0
  let evaluatedCount = 0

  uExps.forEach(exp => {
    const code = exp.code || exp.expectationId
    const entry = student1Mastery[code]
    if (entry && entry.score != null && !isNaN(entry.score)) {
      const w = entry.weight != null ? entry.weight : 1.0
      if (w > 0) {
        weightedSum += entry.score * w
        totalWeight += w
        evaluatedCount++
      }
    }
  })

  const avgScore = (evaluatedCount > 0 && totalWeight > 0) ? Math.round(weightedSum / totalWeight) : null
  return {
    unitId: u.unitId,
    name: cleanUnitName(u.name),
    score: avgScore,
    badge: avgScore != null ? getSBARLevelBadge(avgScore) : null,
    evaluatedCount,
    totalExpectations: uExps.length
  }
})

check(mathUnitBreakdown.length === 3, 'Dossier Strand Breakdown: generates exactly 3 strands for Mathematics')
mathUnitBreakdown.forEach(ub => {
  check(ub.evaluatedCount > 0, `Dossier Strand '${ub.name}': successfully resolved ${ub.evaluatedCount} / ${ub.totalExpectations} flat expectations`)
  check(ub.score !== null && ub.badge !== null, `Dossier Strand '${ub.name}': calculated mastery ${ub.score}% (${ub.badge.level})`)
})

// Test Professional Judgment Override Isolation
const studentWithOverride = {
  ...students['st_2'],
  expectationOverrides: {
    'subj_math::B1.1': { level: 'L4+', score: 98, note: 'Exceeded standard during Math Olympiad' }
  }
}

const overrideResolvedMath = resolveStudentExpectationOverride(studentWithOverride, 'B1.1', 'subj_math', effMath.expectations)
check(overrideResolvedMath !== null && overrideResolvedMath.score === 98 && overrideResolvedMath.level === 'L4+', 'Override: Math-scoped override resolves to 98% (L4+) in Math')

const effSci = getEffectiveClassRecord(yearClassRecord, 'subj_sci')
const overrideResolvedSci = resolveStudentExpectationOverride(studentWithOverride, 'B1.1', 'subj_sci', effSci.expectations)
check(overrideResolvedSci === null, 'Override: Math-scoped override does NOT bleed into Science (evaluates to null in Science)')

console.log()

// ================================================================================
// SECTION 7: CLASSROOM STATISTICAL ANALYTICS & UNASSESSED TOLERANCE
// ================================================================================
console.log('--- SECTION 7: Class Analytics, Outliers & Unassessed Tolerance ---')

// Calculate Math cohort masteries
const cohortOverallScores = []
Object.keys(students).forEach(sId => {
  const overall = calculateSBARStudentOverallMastery(sId, effMath, mathAssessments, yearGradeMap, effMath.sbarAlgorithm)
  if (overall !== null && !isNaN(overall)) {
    cohortOverallScores.push(overall)
  }
})

check(cohortOverallScores.length === 24, `Class Analytics: exactly 24 of 25 students assessed in Math (Student 25 unassessed handled cleanly)`)

const classMean = safeMean(cohortOverallScores)
const classMedian = calculateMedian(cohortOverallScores)
const classSD = calculateStandardDeviation(cohortOverallScores)

check(classMean !== null && classMean >= 70 && classMean <= 95, `Class Analytics: cohort mean is mathematically sound (${classMean}%)`)
check(classMedian !== null && classMedian >= 70 && classMedian <= 95, `Class Analytics: cohort median is mathematically sound (${classMedian}%)`)
check(classSD !== null && classSD > 0 && classSD < 25, `Class Analytics: standard deviation is valid and finite (${classSD})`)

// Verify Distribution Buckets
const levelBuckets = buildLevelDistributionBuckets(cohortOverallScores)
check(levelBuckets.length === 5, 'Class Analytics: Ontario 5-level buckets generated (R, L1, L2, L3, L4)')
const bucketTotalCount = safeSum(levelBuckets.map(b => b.count))
check(bucketTotalCount === 24, `Class Analytics: sum of student counts in buckets matches assessed cohort size (24)`)

// Outlier detection on cohort
const outlierReport = detectOutliers(cohortOverallScores, 1.5)
check(Array.isArray(outlierReport.clean) && Array.isArray(outlierReport.outliers), 'Outlier Detection: executes cleanly without errors')

console.log()
console.log('================================================================================')
console.log(`🎉 ALL ${totalAssertions} ELEMENTARY SBAR & MATHEMATICAL INTEGRITY AUDIT CHECKS PASSED! (100%)`)
console.log('================================================================================')
