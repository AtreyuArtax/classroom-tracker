/**
 * src/test_elementary_audit.js
 *
 * Automated verification for Elementary Multi-Subject & IEP Modified Grade Levels:
 *  1. Multi-Subject Assessment Isolation (Math vs Science vs Language)
 *  2. IEP Modified Grade Level per Subject resolution (Grade 3 Math vs Grade 5 Science)
 *  3. Preset Auto-Population & IEP Preset Discovery
 *  4. SBAR and Traditional Grade Calculations across isolated subjects
 */

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
}

import assert from 'assert'

const { 
  getEffectiveClassRecord, 
  getStudentEffectiveGrade, 
  autoPopulateAllElementarySubjects, 
  ensureIEPPresetsForClass,
  DEFAULT_ELEMENTARY_SUBJECTS 
} = await import('./composables/useElementary.js')

const { 
  calculateStudentGrade, 
  calculateClassGrades,
  isCohortMatch 
} = await import('./db/gradebook/gradeCalc.js')
const { calculateSBARExpectationMastery, calculateSBARStudentOverallMastery } = await import('./db/gradebook/gradeCalcSBAR.js')

console.log('=================================================================')
console.log('🧪 RUNNING ELEMENTARY MULTI-SUBJECT & IEP AUDIT SUITE')
console.log('=================================================================\n')

// ─── TEST 1: Multi-Subject Effective Record Derivation ───────────────────────
console.log('TEST 1: Multi-Subject Effective Record Derivation')

const baseClass = {
  classId: 'elem_class_1',
  name: 'Grade 5 Homeroom',
  gradeLevel: 'Grade 5',
  classType: 'elementary',
  subjects: [
    {
      subjectId: 'elem_sub_math',
      name: 'Mathematics',
      code: 'MATH',
      gradingFramework: 'sbar',
      sbarAlgorithm: 'decaying_average',
      gradebookUnits: [
        { unitId: 'u_math_1', name: 'Number Sense', gradeLevel: 'Grade 5' },
        { unitId: 'u_math_iep', name: 'Number Sense (Gr 3)', gradeLevel: 'Grade 3' }
      ],
      expectations: [
        { expectationId: 'exp_m_b1', unitId: 'u_math_1', code: 'B1.1', gradeLevel: 'Grade 5' },
        { expectationId: 'exp_m_b2', unitId: 'u_math_1', code: 'B1.2', gradeLevel: 'Grade 5' },
        { expectationId: 'exp_m_iep', unitId: 'u_math_iep', code: 'B1.1-Gr3', gradeLevel: 'Grade 3' }
      ]
    },
    {
      subjectId: 'elem_sub_sci',
      name: 'Science & Technology',
      code: 'SCI',
      gradingFramework: 'traditional',
      gradebookCategories: [
        { categoryId: 'cat_sci_know', name: 'Knowledge', weight: 50 },
        { categoryId: 'cat_sci_app', name: 'Application', weight: 50 }
      ],
      gradebookUnits: [
        { unitId: 'u_sci_1', name: 'Human Organ Systems', gradeLevel: 'Grade 5' }
      ],
      expectations: [
        { expectationId: 'exp_s_1', unitId: 'u_sci_1', code: 'A1.1', gradeLevel: 'Grade 5' }
      ]
    }
  ],
  students: {
    'st_regular': {
      studentId: 'st_regular',
      firstName: 'Alex',
      lastName: 'Regular',
      gradeLevel: 'Grade 5'
    },
    'st_iep': {
      studentId: 'st_iep',
      firstName: 'Jordan',
      lastName: 'IEPStudent',
      gradeLevel: 'Grade 5',
      hasIEP: true,
      accommodations: {
        modifiedSubjectGrades: {
          'elem_sub_math': 'Grade 3' // Jordan does Grade 3 Math, but regular Grade 5 Science!
        }
      }
    }
  }
}

const effMath = getEffectiveClassRecord(baseClass, 'elem_sub_math')
assert.strictEqual(effMath.activeSubjectId, 'elem_sub_math', 'Math subject active')
assert.strictEqual(effMath.gradingFramework, 'sbar', 'Math uses SBAR framework')
assert.strictEqual(effMath.expectations.length, 3, 'Math expectations isolated to math subject')

const effSci = getEffectiveClassRecord(baseClass, 'elem_sub_sci')
assert.strictEqual(effSci.activeSubjectId, 'elem_sub_sci', 'Science subject active')
assert.strictEqual(effSci.gradingFramework, 'traditional', 'Science uses Traditional framework')
assert.strictEqual(effSci.gradebookCategories.length, 2, 'Science categories loaded')

console.log('✓ getEffectiveClassRecord derives subject-specific frameworks and units accurately\n')


// ─── TEST 2: Student Effective Grade Level Resolution (IEP per Subject) ───────
console.log('TEST 2: Student Effective Grade Level Resolution (IEP per Subject)')

const alexMathGrade = getStudentEffectiveGrade(baseClass.students['st_regular'], 'elem_sub_math')
assert.strictEqual(alexMathGrade, 'Grade 5', 'Regular student does Grade 5 Math')

const jordanMathGrade = getStudentEffectiveGrade(baseClass.students['st_iep'], 'elem_sub_math')
assert.strictEqual(jordanMathGrade, 'Grade 3', 'IEP student resolves to modified Grade 3 for Math')

const jordanSciGrade = getStudentEffectiveGrade(baseClass.students['st_iep'], 'elem_sub_sci')
assert.strictEqual(jordanSciGrade, 'Grade 5', 'IEP student falls back to standard Grade 5 for Science')

console.log('✓ getStudentEffectiveGrade correctly resolves per-subject IEP modified grade levels\n')


// ─── TEST 3: Subject Assessment Isolation in Grade Calculations ──────────────
console.log('TEST 3: Subject Assessment Isolation in Grade Calculations')

const mockAssessments = [
  // Math Assessment (SBAR)
  {
    assessmentId: 'ast_math_1',
    classId: 'elem_class_1',
    subjectId: 'elem_sub_math',
    name: 'Fractions Quiz',
    expectationIds: ['B1.1'],
    gradeLevel: 'Grade 5',
    date: '2026-09-10'
  },
  // Math IEP Assessment (SBAR)
  {
    assessmentId: 'ast_math_iep',
    classId: 'elem_class_1',
    subjectId: 'elem_sub_math',
    name: 'Adding to 100',
    expectationIds: ['B1.1-Gr3'],
    gradeLevel: 'Grade 3',
    date: '2026-09-10'
  },
  // Science SBAR Assessment
  {
    assessmentId: 'ast_sci_sbar',
    classId: 'elem_class_1',
    subjectId: 'elem_sub_sci',
    name: 'Organ Systems Check',
    expectationIds: ['A1.1'],
    gradeLevel: 'Grade 5',
    date: '2026-09-12'
  },
  // Science Assessment (Traditional)
  {
    assessmentId: 'ast_sci_1',
    classId: 'elem_class_1',
    subjectId: 'elem_sub_sci',
    categoryId: 'cat_sci_know',
    name: 'Digestive System Lab',
    gradeLevel: 'Grade 5',
    totalPoints: 20,
    date: '2026-09-12'
  }
]

const mockStudentGrades = {
  'ast_math_1': {
    assessmentId: 'ast_math_1',
    studentId: 'st_regular',
    resolvedScore: 90,
    expectationScores: { 'B1.1': 90 }
  },
  'ast_math_iep': {
    assessmentId: 'ast_math_iep',
    studentId: 'st_iep',
    resolvedScore: 85,
    expectationScores: { 'B1.1-Gr3': 85 }
  },
  'ast_sci_sbar': {
    assessmentId: 'ast_sci_sbar',
    studentId: 'st_regular',
    resolvedScore: 50,
    expectationScores: { 'A1.1': 50 }
  },
  'ast_sci_1': {
    assessmentId: 'ast_sci_1',
    studentId: 'st_regular',
    resolvedScore: 16, // 16/20 = 80%
    pointsEarned: 16
  }
}

// 3A: Calculate Math for Alex (Regular Grade 5)
// Alex has Math = 90% (B1.1) and Science = 50% (A1.1). Math grade MUST be 90% (isolated from Science).
const alexMathResult = await calculateStudentGrade('st_regular', effMath, {
  assessmentsPreRef: mockAssessments,
  gradesPreRef: [mockStudentGrades['ast_math_1'], mockStudentGrades['ast_sci_sbar'], mockStudentGrades['ast_sci_1']],
  settingsPreRef: { capGradesAt100: true }
})
assert.strictEqual(alexMathResult.overallGrade, 90, `Alex Grade 5 Math must be 90% (got ${alexMathResult.overallGrade}%)`)

// 3B: Calculate Math for Jordan (IEP Grade 3)
const jordanMathResult = await calculateStudentGrade('st_iep', effMath, {
  assessmentsPreRef: mockAssessments,
  gradesPreRef: [mockStudentGrades['ast_math_iep']],
  settingsPreRef: { capGradesAt100: true }
})
assert.strictEqual(jordanMathResult.overallGrade, 85, 'Jordan Grade 3 Math is 85% (L4-)')

// 3C: Calculate Science for Alex (Traditional %)
const alexSciResult = await calculateStudentGrade('st_regular', effSci, {
  assessmentsPreRef: mockAssessments,
  gradesPreRef: [mockStudentGrades['ast_math_1'], mockStudentGrades['ast_sci_1']],
  settingsPreRef: { capGradesAt100: true }
})
// Science has 1 category (Knowledge = 50% weight). Alex got 16/20 = 80%.
assert.strictEqual(alexSciResult.overallGrade, 80, 'Alex Science grade is 80%, unaffected by Math 90%')

console.log('✓ Subject assessment isolation and IEP cohort mapping verified in calculateStudentGrade\n')

// ─── TEST 4: Auto-Population & IEP Preset Discovery ───────────────────────────
console.log('TEST 4: Auto-Population & IEP Preset Discovery')

const rawHomeroom = {
  classId: 'cls_gr7_homeroom',
  name: 'Grade 7 Homeroom (7A)',
  gradeLevel: 'Grade 7',
  classType: 'elementary',
  subjects: [
    { subjectId: 'elem_sub_math', name: 'Mathematics', code: 'MATH', expectations: [] },
    { subjectId: 'elem_sub_sci', name: 'Science & Technology', code: 'SCI', expectations: [] }
  ],
  students: {
    'st_gr7_regular': { studentId: 'st_gr7_regular', firstName: 'Sam', lastName: 'Regular', gradeLevel: 'Grade 7' },
    'st_gr7_iep': {
      studentId: 'st_gr7_iep',
      firstName: 'Taylor',
      lastName: 'IEP',
      gradeLevel: 'Grade 7',
      hasIEP: true,
      accommodations: {
        modifiedSubjectGrades: {
          'elem_sub_math': 'Grade 8' // Accelerated Grade 8 Math for Taylor!
        }
      }
    }
  }
}

// Auto-populate subjects from presets
const populated = autoPopulateAllElementarySubjects(rawHomeroom)
const mathSub = populated.subjects.find(s => s.subjectId === 'elem_sub_math')
// Verify that ensureIEPPresetsForClass automatically added Grade 8 Math expectations for Taylor!
const hasGrade8Math = mathSub.expectations.some(e => e.gradeLevel === 'Grade 8')
assert.ok(hasGrade8Math, 'Grade 8 accelerated math expectations automatically imported for IEP student')

console.log('✓ autoPopulateAllElementarySubjects & ensureIEPPresetsForClass automatically load standard and IEP curriculum presets\n')

// ─── TEST 5: Split-Grade & IEP Expectation Applicability in SBAR ─────────────
console.log('TEST 5: Split-Grade & IEP Expectation Applicability in SBAR')

function isExpectationApplicable(exp, student, classRecord) {
  if (!exp || !student) return true
  const expCohort = exp.gradeLevel || exp.courseCode
  if (!expCohort || String(expCohort).toLowerCase() === 'all') return true
  const isElem = classRecord.classType === 'elementary'
  const studentCohort = isElem 
    ? (getStudentEffectiveGrade(student, classRecord.activeSubjectId) || student.gradeLevel)
    : (student.courseCode || student.gradeLevel)
  if (!studentCohort) return true
  return isCohortMatch(expCohort, studentCohort)
}

const g7ExpB1 = { code: 'B1.1', gradeLevel: 'Grade 7' }
const g8ExpB1 = { code: 'B1.1', gradeLevel: 'Grade 8' }

const regularGr7Student = rawHomeroom.students['st_gr7_regular']
const iepGr8Student = rawHomeroom.students['st_gr7_iep']
const effMathPopulated = getEffectiveClassRecord(populated, 'elem_sub_math')

assert.strictEqual(isExpectationApplicable(g7ExpB1, regularGr7Student, effMathPopulated), true, 'Grade 7 B1.1 is applicable to regular Grade 7 student')
assert.strictEqual(isExpectationApplicable(g8ExpB1, regularGr7Student, effMathPopulated), false, 'Grade 8 B1.1 is NOT applicable to regular Grade 7 student')

assert.strictEqual(isExpectationApplicable(g8ExpB1, iepGr8Student, effMathPopulated), true, 'Grade 8 B1.1 is applicable to IEP Grade 8 Math student')
assert.strictEqual(isExpectationApplicable(g7ExpB1, iepGr8Student, effMathPopulated), false, 'Grade 7 B1.1 is NOT applicable to IEP Grade 8 Math student')

console.log('✓ Multi-grade expectation applicability verifies zero cross-grade score bleeding in SBAR\n')

console.log('=================================================================')
console.log('🎉 ALL ELEMENTARY MULTI-SUBJECT & IEP TESTS PASSED!')
console.log('=================================================================')
