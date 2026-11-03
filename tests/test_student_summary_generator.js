/**
 * tests/test_student_summary_generator.js
 * 
 * Standalone validation script for Student Course Summary generator.
 */

import { generateStudentCourseSummary } from '../src/utils/studentSummaryGenerator.js'
import assert from 'node:assert'

console.log('--- Testing studentSummaryGenerator.js ---')

// 1. High-achieving student
const highStudentData = {
  student: {
    studentId: 's1',
    firstName: 'Alex',
    lastName: 'Rivera',
    gender: 'f'
  },
  overallGrade: 88,
  weightedMedian: 89,
  className: 'Grade 10 Science',
  categories: [
    { categoryId: 'c1', name: 'Knowledge', score: 90 },
    { categoryId: 'c2', name: 'Inquiry', score: 85 }
  ],
  assessments: [
    { name: 'Task 1', date: '2026-09-10', score: 18, maxPoints: 20, missing: false },
    { name: 'Task 2', date: '2026-09-20', score: 27, maxPoints: 30, missing: false },
    { name: 'Task 3', date: '2026-10-01', score: 45, maxPoints: 50, missing: false },
    { name: 'Task 4', date: '2026-10-15', score: 48, maxPoints: 50, missing: false }
  ],
  stats: {
    absences: 0,
    lates: 0,
    testDayAbsences: 0,
    attendanceRate: 100
  },
  attendanceAverages: {
    latesTotal: 0,
    washroomTotal: 0
  },
  events: [
    { studentId: 's1', timestamp: '2026-09-10T09:00:00', code: 'p' },
    { studentId: 's1', timestamp: '2026-09-11T09:00:00', code: 'p' },
    { studentId: 's1', timestamp: '2026-09-12T09:00:00', code: 'p' },
    { studentId: 's1', timestamp: '2026-09-15T09:00:00', code: 'p' },
    { studentId: 's1', timestamp: '2026-09-16T09:00:00', code: 'p' },
    { studentId: 's1', timestamp: '2026-09-17T09:00:00', code: 'p' }
  ]
}

const highRes = generateStudentCourseSummary(highStudentData, { audience: 'parent' })
console.log('High Student Tone:', highRes.tone)
assert.strictEqual(highRes.tone, 'positive')
assert(highRes.headline.includes('Alex is currently achieving 88%'))
assert(highRes.plainText.includes('STUDENT COURSE SUMMARY: ALEX'))
console.log('✓ High student test passed')

// 2. At-risk student with outlier gap, missing work, and test day absences
const atRiskData = {
  student: {
    studentId: 's2',
    firstName: 'Jordan',
    lastName: 'Smith',
    pronouns: 'he/him',
    hasIEP: true,
    iepType: 'Accommodated',
    accommodations: ['Extra time', 'Quiet setting']
  },
  overallGrade: 58,
  weightedMedian: 68,
  className: 'Grade 10 Math',
  categories: [
    { categoryId: 'c1', name: 'Knowledge', score: 72 },
    { categoryId: 'c2', name: 'Application', score: 48 }
  ],
  assessments: [
    { name: 'Quiz 1', date: '2026-09-10', score: 14, maxPoints: 20, missing: false },
    { name: 'Unit 1 Test', date: '2026-09-20', score: 0, maxPoints: 50, missing: true },
    { name: 'Assignment 1', date: '2026-10-01', score: 25, maxPoints: 30, attempts: [1, 2] }
  ],
  stats: {
    absences: 5,
    lates: 4,
    testDayAbsences: 2,
    attendanceRate: 75
  },
  attendanceAverages: {
    latesTotal: 40,
    washroomTotal: 35
  },
  washroomCount: 4,
  redirectCount: 2,
  events: [
    { studentId: 's2', timestamp: '2026-09-15T09:00:00', code: 'a', testDay: true },
    { studentId: 's2', timestamp: '2026-09-22T09:00:00', code: 'a', testDay: true },
    { studentId: 's2', timestamp: '2026-09-29T09:00:00', code: 'a' },
    { studentId: 's2', timestamp: '2026-10-06T09:00:00', code: 'a' }
  ],
  learningSkillsRecord: {
    studentEval: { resp: 'E', org: 'G' },
    teacherEval: { resp: 'S', org: 'N' }
  }
}

// Parent view
const parentRes = generateStudentCourseSummary(atRiskData, { audience: 'parent' })
console.log('At-Risk Tone:', parentRes.tone)
assert.strictEqual(parentRes.tone, 'danger')
assert(parentRes.plainText.includes('1 evaluation marked missing'))
assert(parentRes.plainText.includes('weighted median is higher at 68%'))
assert(!parentRes.plainText.includes('IEP on file'), 'Parent view must not include internal teacher briefing')
console.log('✓ Parent view privacy test passed')

// Teacher view
const teacherRes = generateStudentCourseSummary(atRiskData, { audience: 'teacher' })
const teacherSec = teacherRes.sections.find(s => s.id === 'teacher')
assert(teacherSec != null, 'Teacher section must exist in teacher audience mode')
assert(teacherSec.text.includes('test/assessment days'))
assert(teacherSec.text.includes('2 redirect events'))
assert(teacherSec.text.includes('IEP on file'))
assert(teacherSec.text.includes('Perception gap in self-evaluation'))
console.log('✓ Teacher briefing content test passed')

// 3. Fallback check (empty student, no grades)
const emptyRes = generateStudentCourseSummary({ student: { firstName: 'Sam' } })
assert.strictEqual(emptyRes.tone, 'neutral')
assert(emptyRes.headline.includes('Sam is actively participating'))
console.log('✓ Empty fallback test passed')

// 4. Lowercase preferred name matching roster name test
const lowercaseFormStudent = {
  student: {
    studentId: 's3',
    firstName: 'Andrew',
    preferredName: 'andrew',
    gender: 'm'
  },
  overallGrade: 75
}
const lowercaseRes = generateStudentCourseSummary(lowercaseFormStudent)
assert(lowercaseRes.headline.includes('Andrew is currently achieving 75%'), `Expected capitalized 'Andrew', got: ${lowercaseRes.headline}`)
assert(lowercaseRes.plainText.includes('Andrew is currently holding an overall grade'), `Expected capitalized 'Andrew', got: ${lowercaseRes.plainText}`)
console.log('✓ Lowercase form submission case normalization test passed')

console.log('\nAll studentSummaryGenerator tests passed successfully!')
