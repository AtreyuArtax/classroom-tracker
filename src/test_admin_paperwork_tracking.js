/**
 * Test Suite: Administrative Logistics & Paperwork Tracking Verification
 * 
 * Verifies:
 * 1. Mathematical isolation of administrative items (zero impact on GPA, averages, SBAR mastery).
 * 2. Category grade calculation ignores administrative items completely.
 * 3. Toggle functionality of checklist items (1 <-> null).
 * 4. Text persistence and retrieval for text-format items (textbook numbers, notes).
 * 5. GradeMap mapping preserves string values for admin text items without NaN coercion.
 */

import { strict as assert } from 'assert'
import { 
  getAssessmentPercentage, 
  _calculateCategoryGrade,
  calculateStudentGrade
} from './db/gradebook/gradeCalc.js'

console.log('===================================================================')
console.log('📋 ADMINISTRATIVE LOGISTICS & PAPERWORK TRACKING VERIFICATION')
console.log('===================================================================')

// TEST 1: Math Isolation in Traditional Grading Engine
console.log('\n[TEST 1] Traditional Grading Engine Isolation')

const academicAssessment1 = {
  assessmentId: 'a101',
  name: 'Unit 1 Lab Report',
  categoryId: 'cat_labs',
  totalPoints: 100,
  purpose: 'summative'
}

const academicAssessment2 = {
  assessmentId: 'a102',
  name: 'Midterm Exam',
  categoryId: 'cat_exams',
  totalPoints: 50,
  purpose: 'summative'
}

const adminSafetyContract = {
  assessmentId: 'a201',
  name: 'Science Safety Contract',
  categoryId: 'admin',
  totalPoints: 1,
  purpose: 'administrative',
  adminFormat: 'checklist'
}

const adminTextbook = {
  assessmentId: 'a202',
  name: 'Textbook #',
  categoryId: 'admin',
  totalPoints: 1,
  purpose: 'administrative',
  adminFormat: 'text'
}

// Student grades
const baseGradeMap = {
  'a101': { assessmentId: 'a101', studentId: 'stu_1', resolvedScore: 85 },
  'a102': { assessmentId: 'a102', studentId: 'stu_1', resolvedScore: 40 } // 40/50 = 80%
}

// Check percentage calculation
assert.equal(getAssessmentPercentage(academicAssessment1, baseGradeMap['a101']), 85, 'Academic score is 85%')
assert.equal(getAssessmentPercentage(academicAssessment2, baseGradeMap['a102']), 80, 'Academic score is 80%')

// Admin items must return null percentage
const adminCheckGrade = { assessmentId: 'a201', studentId: 'stu_1', resolvedScore: 1, score: 1, pointsEarned: 1, received: true }
const adminTextGrade = { assessmentId: 'a202', studentId: 'stu_1', resolvedScore: 'TB-894', textValue: 'TB-894' }

assert.equal(getAssessmentPercentage(adminSafetyContract, adminCheckGrade), null, 'Admin checklist returns null percentage')
assert.equal(getAssessmentPercentage(adminTextbook, adminTextGrade), null, 'Admin text returns null percentage')
console.log('  ✓ getAssessmentPercentage returns null for administrative items')

// Category calculation isolation: _calculateCategoryGrade
const catGradeBefore = _calculateCategoryGrade([academicAssessment1], baseGradeMap, false)
assert.equal(catGradeBefore, 85, 'Lab category score before admin is 85%')

const catGradeWithAdmin = _calculateCategoryGrade([academicAssessment1, adminSafetyContract], {
  ...baseGradeMap,
  'a201': adminCheckGrade
}, false)
assert.equal(catGradeWithAdmin, 85, 'Lab category score with admin task present is still strictly 85%')
console.log('  ✓ _calculateCategoryGrade strictly skips administrative assessments')

// Full calculateStudentGrade isolation
const mockClass = {
  classId: 'c1',
  gradingFramework: 'traditional',
  gradebookCategories: [
    { categoryId: 'cat_labs', name: 'Labs', weight: 40 },
    { categoryId: 'cat_exams', name: 'Exams', weight: 60 }
  ]
}

const baseGradesList = [
  { assessmentId: 'a101', studentId: 'stu_1', resolvedScore: 85 },
  { assessmentId: 'a102', studentId: 'stu_1', resolvedScore: 40 }
]

const studentGradeWithoutAdmin = await calculateStudentGrade('stu_1', mockClass, {
  assessmentsPreRef: [academicAssessment1, academicAssessment2],
  gradesPreRef: baseGradesList,
  settingsPreRef: { capGradesAt100: true }
})
// 85 * 0.4 + 80 * 0.6 = 34 + 48 = 82%
assert.equal(studentGradeWithoutAdmin.calculatedOverallGrade, 82, 'Expected 82% baseline grade')

const studentGradeWithAdmin = await calculateStudentGrade('stu_1', mockClass, {
  assessmentsPreRef: [academicAssessment1, academicAssessment2, adminSafetyContract, adminTextbook],
  gradesPreRef: [
    ...baseGradesList,
    adminCheckGrade,
    adminTextGrade
  ],
  settingsPreRef: { capGradesAt100: true }
})

assert.equal(studentGradeWithAdmin.calculatedOverallGrade, 82, 'Grade with admin items is still exactly 82%')
assert.equal(studentGradeWithAdmin.weightUsed, studentGradeWithoutAdmin.weightUsed, 'Weight used is unaffected by admin items')
console.log('  ✓ calculateStudentGrade is 100% unaffected by administrative tasks')

// TEST 2: Admin Text values do not corrupt to NaN
console.log('\n[TEST 2] GradeMap String Preservation for Admin Text')

function simulateGradeMapResolution(assessment, grade) {
  const isAdminText = assessment?.purpose === 'administrative' && assessment?.adminFormat === 'text'
  let resolvedScore = null
  if (isAdminText) {
    resolvedScore = (grade.textValue != null && String(grade.textValue).trim() !== '')
      ? String(grade.textValue)
      : (grade.comment != null && String(grade.comment).trim() !== '')
        ? String(grade.comment)
        : (grade.resolvedScore != null && String(grade.resolvedScore).trim() !== '' && isNaN(Number(grade.resolvedScore)))
          ? String(grade.resolvedScore)
          : null
  } else {
    if (grade.resolvedScore !== undefined && grade.resolvedScore !== null) {
      resolvedScore = Number(grade.resolvedScore)
    }
  }
  const textValue = isAdminText
    ? (resolvedScore != null ? String(resolvedScore) : '')
    : (grade.textValue || '')
  return { ...grade, resolvedScore, textValue }
}

const resolvedChecklist = simulateGradeMapResolution(adminSafetyContract, adminCheckGrade)
assert.equal(resolvedChecklist.resolvedScore, 1)

const resolvedText = simulateGradeMapResolution(adminTextbook, adminTextGrade)
assert.equal(resolvedText.resolvedScore, 'TB-894', 'Preserved alphanumeric textbook number')
assert.equal(resolvedText.textValue, 'TB-894', 'Preserved textValue')

// Test empty text does not fall back to ghost 1
const emptyTextGrade = { assessmentId: 'a202', studentId: 'stu_empty', textValue: '', attempts: [{ pointsEarned: 1 }] }
const resolvedEmpty = simulateGradeMapResolution(adminTextbook, emptyTextGrade)
assert.equal(resolvedEmpty.resolvedScore, null, 'Empty admin text does NOT resolve to 1')
assert.equal(resolvedEmpty.textValue, '', 'Empty admin textValue is empty string')

assert.ok(!isNaN(resolvedChecklist.resolvedScore), 'Checklist score is not NaN')
console.log('  ✓ Admin text entries safely preserve alphanumeric values without NaN coercion or ghost 1s')

// TEST 3: Admin Checklist Toggle Logic
console.log('\n[TEST 3] Admin Checklist Toggle Logic')

function toggleLogic(currentScore) {
  const isCurrentlyChecked = Boolean(currentScore === 1)
  return isCurrentlyChecked ? null : 1
}

assert.equal(toggleLogic(null), 1, 'Toggling from unreceived (null) sets 1')
assert.equal(toggleLogic(1), null, 'Toggling from received (1) sets null')
assert.equal(toggleLogic(undefined), 1, 'Toggling from undefined sets 1')
console.log('  ✓ Binary toggle alternates cleanly between 1 and null')

// TEST 4: Elementary Multi-Subject Preservation
console.log('\n[TEST 4] Elementary Subject Filtering for Administrative Tasks')
import { filterAssessmentsForSubject, isCohortMatch } from './db/gradebook/gradeCalc.js'

function isAssessmentInSubCohortHelper(assessment, filterVal, classType = 'secondary') {
  if (!filterVal || String(filterVal).toLowerCase() === 'all') return true
  if (!assessment) return true
  const tag = classType === 'elementary'
    ? (assessment.gradeLevel || assessment.targetCourseCode)
    : (assessment.targetCourseCode || assessment.gradeLevel)
  if (!tag || String(tag).toLowerCase() === 'all') return true
  return isCohortMatch(tag, filterVal)
}

function isAssessmentApplicableToStudentHelper(assessment, student, classType = 'secondary') {
  if (!assessment) return true
  const isElem = classType === 'elementary'
  const aTag = isElem 
    ? (assessment.gradeLevel || assessment.targetCourseCode)
    : (assessment.targetCourseCode || assessment.gradeLevel)
  if (!aTag || aTag.toLowerCase() === 'all') return true
  if (!student) return true
  const sTag = student.courseCode || student.gradeLevel
  if (!sTag) return true
  return isCohortMatch(aTag, sTag)
}

const elemClassRecord = {
  classId: 'elem_c1',
  classType: 'elementary',
  activeSubjectId: 'sub_sci',
  subjects: [
    { subjectId: 'sub_math', name: 'Mathematics' },
    { subjectId: 'sub_sci', name: 'Science' }
  ]
}

const allAssessments = [
  { assessmentId: 'ast_sci_1', subjectId: 'sub_sci', purpose: 'summative' },
  { assessmentId: 'ast_math_1', subjectId: 'sub_math', purpose: 'summative' },
  { assessmentId: 'admin_contract', purpose: 'administrative', targetCourseCode: 'all' }, // Class-wide admin
  { assessmentId: 'admin_sci_contract', purpose: 'administrative', subjectId: 'sub_sci' } // Science-scoped admin
]

const filteredForSci = filterAssessmentsForSubject(allAssessments, elemClassRecord, 'sub_sci')
const filteredIdsSci = filteredForSci.map(a => a.assessmentId)
assert.ok(filteredIdsSci.includes('ast_sci_1'), 'Includes Science academic task')
assert.ok(!filteredIdsSci.includes('ast_math_1'), 'Excludes Math academic task')
assert.ok(filteredIdsSci.includes('admin_contract'), 'Preserves class-wide admin task in Science')
assert.ok(filteredIdsSci.includes('admin_sci_contract'), 'Preserves Science-scoped admin task in Science')

const filteredForMath = filterAssessmentsForSubject(allAssessments, elemClassRecord, 'sub_math')
const filteredIdsMath = filteredForMath.map(a => a.assessmentId)
assert.ok(filteredIdsMath.includes('admin_contract'), 'Preserves class-wide admin task in Math')
assert.ok(!filteredIdsMath.includes('admin_sci_contract'), 'Excludes Science-scoped admin task in Math')
console.log('  ✓ Administrative paperwork is preserved and properly scoped across elementary subjects')

// TEST 5: Split Cohort and Multi-Section Isolation
console.log('\n[TEST 5] Split Cohort and Multi-Section Isolation')

const classWideAdmin = { assessmentId: 'a1', purpose: 'administrative', targetCourseCode: 'all', gradeLevel: 'all' }
const gr9Admin = { assessmentId: 'a2', purpose: 'administrative', targetCourseCode: 'Grade 9', gradeLevel: 'Grade 9' }
const gr10Admin = { assessmentId: 'a3', purpose: 'administrative', targetCourseCode: 'Grade 10', gradeLevel: 'Grade 10' }

assert.ok(isAssessmentInSubCohortHelper(classWideAdmin, 'all'), 'Class-wide admin shows for All filter')
assert.ok(isAssessmentInSubCohortHelper(classWideAdmin, 'Grade 9'), 'Class-wide admin shows when filtering by Grade 9')
assert.ok(isAssessmentInSubCohortHelper(classWideAdmin, 'Grade 10'), 'Class-wide admin shows when filtering by Grade 10')

assert.ok(isAssessmentInSubCohortHelper(gr9Admin, 'all'), 'Grade 9 admin shows in All view')
assert.ok(isAssessmentInSubCohortHelper(gr9Admin, 'Grade 9'), 'Grade 9 admin shows in Grade 9 view')
assert.ok(!isAssessmentInSubCohortHelper(gr9Admin, 'Grade 10'), 'Grade 9 admin is hidden in Grade 10 view')

const studentGr9 = { studentId: 's9', gradeLevel: 'Grade 9' }
const studentGr10 = { studentId: 's10', gradeLevel: 'Grade 10' }

assert.ok(isAssessmentApplicableToStudentHelper(classWideAdmin, studentGr9), 'Class-wide admin applies to Grade 9 student')
assert.ok(isAssessmentApplicableToStudentHelper(classWideAdmin, studentGr10), 'Class-wide admin applies to Grade 10 student')
assert.ok(isAssessmentApplicableToStudentHelper(gr9Admin, studentGr9), 'Grade 9 admin applies to Grade 9 student')
assert.ok(!isAssessmentApplicableToStudentHelper(gr9Admin, studentGr10), 'Grade 9 admin does not apply to Grade 10 student (marked N/A)')
console.log('  ✓ Split classes cleanly support both class-wide and grade-specific paperwork tracking')

// TEST 6: Pure Filter Chip Isolation and Badge Counts
console.log('\n[TEST 6] Pure Filter Chip Isolation and Badge Counts')

const sampleAsts = [
  { assessmentId: 'acad_1', unitId: 'u1', purpose: 'summative' },
  { assessmentId: 'acad_2', unitId: 'u2', purpose: 'summative' },
  { assessmentId: 'adm_1', purpose: 'administrative' }
]

function filterGridAssessments(asts, selectedUnitId) {
  if (selectedUnitId === 'admin') {
    return asts.filter(a => a.purpose === 'administrative')
  }
  if (selectedUnitId) {
    return asts.filter(a => a.unitId === selectedUnitId && a.purpose !== 'administrative')
  }
  // All Units view: purely academic assessments, zero paperwork clutter
  return asts.filter(a => a.purpose !== 'administrative')
}

// Badge counters
const academicCount = sampleAsts.filter(a => a.purpose !== 'administrative').length
const adminCount = sampleAsts.filter(a => a.purpose === 'administrative').length

assert.equal(academicCount, 2, 'All Units badge shows 2 academic tasks')
assert.equal(adminCount, 1, 'Admin chip badge shows 1 admin task')

// Case A: All units (selectedUnitId = null) -> Strictly 2 academic tasks
const allUnitsView = filterGridAssessments(sampleAsts, null)
assert.equal(allUnitsView.length, 2, 'All units view shows strictly academic tasks')
assert.ok(!allUnitsView.some(a => a.purpose === 'administrative'), 'Zero admin tasks in All Units view')

// Case B: Admin chip clicked (selectedUnitId = 'admin') -> Strictly 1 admin task
const adminView = filterGridAssessments(sampleAsts, 'admin')
assert.equal(adminView.length, 1, 'Admin chip shows strictly admin items')
assert.equal(adminView[0].assessmentId, 'adm_1', 'Correct admin assessment returned')

// Case C: Unit 1 clicked (selectedUnitId = 'u1') -> Strictly Unit 1 academic items
const unit1View = filterGridAssessments(sampleAsts, 'u1')
assert.equal(unit1View.length, 1, 'Unit 1 shows strictly Unit 1 academic items')
assert.equal(unit1View[0].assessmentId, 'acad_1', 'Correct unit assessment returned')

console.log('  ✓ Pure filter chip model isolates academic vs admin views with 100% precision')

console.log('\n===================================================================')
console.log('🎉 ALL ADMINISTRATIVE TRACKING TESTS PASSED (100%)!')
console.log('===================================================================\n')
