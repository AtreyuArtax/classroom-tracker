import assert from 'assert'
import { calculateSBARStudentOverallMastery, calculateSBARExpectationMastery } from './utils/gradeCalcSBAR.js'

console.log('====================================================')
console.log('🧪 Multi-Strand Assessment & Expectation Search Verification')
console.log('====================================================')

// 1. Mock Elementary Math Subject with Multiple Strands
const mathUnits = [
  {
    unitId: 'unit_number',
    name: 'Number',
    gradeLevel: 'Grade 5',
    expectations: [
      { code: 'B1.1', expectationId: 'exp_b11', description: 'Fractions and decimals representation', gradeLevel: 'Grade 5' },
      { code: 'B1.2', expectationId: 'exp_b12', description: 'Equivalent fractions and operations', gradeLevel: 'Grade 5' }
    ]
  },
  {
    unitId: 'unit_algebra',
    name: 'Algebra',
    gradeLevel: 'Grade 5',
    expectations: [
      { code: 'C1.1', expectationId: 'exp_c11', description: 'Patterning and algebraic expressions', gradeLevel: 'Grade 5' },
      { code: 'C1.2', expectationId: 'exp_c12', description: 'Variables and solving equations', gradeLevel: 'Grade 5' }
    ]
  },
  {
    unitId: 'unit_data',
    name: 'Data',
    gradeLevel: 'Grade 5',
    expectations: [
      { code: 'D1.1', expectationId: 'exp_d11', description: 'Collect, organize and display data', gradeLevel: 'Grade 5' }
    ]
  }
]

const mockClass = {
  classId: 'class_elem_5',
  classType: 'elementary',
  activeSubjectId: 'elem_sub_math',
  gradingFramework: 'sbar',
  sbarAlgorithm: 'decaying_average',
  gradebookUnits: mathUnits,
  students: {
    student_1: { firstName: 'Alice', lastName: 'Walker', gradeLevel: 'Grade 5' },
    student_2: { firstName: 'Bob', lastName: 'Taylor', gradeLevel: 'Grade 5' }
  }
}

// 2. Multi-Strand Assessment (e.g. Culminating Task spanning Number, Algebra, and Data)
const multiStrandAssessment = {
  assessmentId: 101,
  name: 'Midterm Culminating Task (Fractions & Algebra in Data)',
  subjectId: 'elem_sub_math',
  date: '2026-10-15',
  purpose: 'summative',
  assessmentType: 'product',
  unitId: null, // Multi-strand
  expectationIds: ['B1.1', 'C1.1', 'D1.1'],
  targetCourseCode: 'all',
  gradeLevel: 'Grade 5'
}

const mockGradeMap = {
  101: {
    student_1: {
      expectationScores: {
        'B1.1': 88, // L4 in Number
        'C1.1': 75, // L3 in Algebra
        'D1.1': 95  // L4+ in Data
      }
    },
    student_2: {
      expectationScores: {
        'B1.1': 65, // L2
        'C1.1': 80, // L3+
        'D1.1': 70  // L3-
      }
    }
  }
}

console.log('\n--- TEST 1: SBAR Mastery Evaluation Across Multiple Strands ---')
const assessments = [multiStrandAssessment]

const student1Overall = calculateSBARStudentOverallMastery(
  'student_1',
  mockClass,
  assessments,
  mockGradeMap,
  'decaying_average'
)
console.log(`  Student 1 Overall Score across 3 strands: ${student1Overall}%`)
assert.ok(student1Overall !== null, 'Overall score computed successfully')
// Average of (88 + 75 + 95) / 3 = 86%
assert.strictEqual(Math.round(student1Overall), 86, 'Overall mastery is accurately aggregated across multiple strands')
console.log('  ✓ Multi-strand assessment calculates accurate overall student mastery')

console.log('\n--- TEST 2: Independent Expectation Mastery Isolation ---')
const masteryMap = calculateSBARExpectationMastery(mockClass, assessments, mockGradeMap, 'decaying_average')
const expB11Mastery = masteryMap['student_1']['B1.1']
const expC11Mastery = masteryMap['student_1']['C1.1']
const expD11Mastery = masteryMap['student_1']['D1.1']

assert.strictEqual(expB11Mastery.score, 88, 'B1.1 mastery is 88%')
assert.strictEqual(expC11Mastery.score, 75, 'C1.1 mastery is 75%')
assert.strictEqual(expD11Mastery.score, 95, 'D1.1 mastery is 95%')
console.log('  ✓ Each expectation maintains completely independent scores from the same assessment')

console.log('\n--- TEST 3: Search Query Filtering Emulation ---')
const allExps = mathUnits.flatMap(u => (u.expectations || []).map(e => ({ ...e, unitName: u.name })))

function searchExpectations(query, strandFilter = 'all') {
  let list = allExps
  if (strandFilter !== 'all') {
    list = list.filter(e => e.unitName.toLowerCase() === strandFilter.toLowerCase())
  }
  if (query && query.trim()) {
    const q = query.toLowerCase().trim()
    list = list.filter(e => {
      const codeMatch = e.code && e.code.toLowerCase().includes(q)
      const descMatch = (e.description || '').toLowerCase().includes(q)
      const strandMatch = (e.unitName || '').toLowerCase().includes(q)
      return codeMatch || descMatch || strandMatch
    })
  }
  return list
}

// Search by code:
const searchCode = searchExpectations('B1')
assert.strictEqual(searchCode.length, 2, 'Search by code B1 returns B1.1 and B1.2')
console.log('  ✓ Search by code (e.g. "B1") finds matching expectations')

// Search by keyword:
const searchKeyword = searchExpectations('fractions')
assert.strictEqual(searchKeyword.length, 2, 'Search by keyword "fractions" finds B1.1 and B1.2')
console.log('  ✓ Search by keyword (e.g. "fractions") finds expectations across descriptions')

// Search by keyword in algebra:
const searchPattern = searchExpectations('pattern')
assert.strictEqual(searchPattern.length, 1, 'Search by keyword "pattern" finds C1.1')
assert.strictEqual(searchPattern[0].code, 'C1.1')
console.log('  ✓ Search by keyword (e.g. "pattern") finds algebraic expectations')

// Search combined with Strand Filter:
const searchWithStrand = searchExpectations('equations', 'Algebra')
assert.strictEqual(searchWithStrand.length, 1, 'Search for equations in Algebra returns C1.2')
console.log('  ✓ Search scoped to a specific strand returns exact filtered results')

const searchMismatch = searchExpectations('equations', 'Number')
assert.strictEqual(searchMismatch.length, 0, 'Search for equations in Number returns 0 results')
console.log('  ✓ Search respects strand filter boundaries')

console.log('\n====================================================')
console.log('🎉 ALL MULTI-STRAND & SEARCH VERIFICATION CHECKS PASSED!')
console.log('====================================================\n')
