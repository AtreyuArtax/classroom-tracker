import assert from 'assert'

console.log('🧪 Testing Assessment Score Sorting with Notes/Comments & Admin Text...')

// 1. Verify GradeMap resolution: notes/comments must not leak into textValue for non-admin assessments
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
    } else if (grade.score !== undefined && grade.score !== null) {
      resolvedScore = Number(grade.score)
    } else if (grade.pointsEarned !== undefined && grade.pointsEarned !== null) {
      resolvedScore = Number(grade.pointsEarned)
    }
  }

  const textValue = isAdminText
    ? (resolvedScore != null ? String(resolvedScore) : '')
    : (grade.textValue || '')

  return {
    ...grade,
    resolvedScore,
    textValue
  }
}

const academicAssessment = {
  assessmentId: 101,
  name: 'Test 1 Kinematics',
  totalPoints: 34,
  purpose: 'summative'
}

const sophiaGradeWithNote = {
  assessmentId: 101,
  studentId: 'sophia',
  resolvedScore: 9.5,
  score: 9.5,
  comment: 'Absent on initial test date, wrote makeup test',
  attempts: [
    {
      attemptId: 'att-1',
      pointsEarned: 9.5,
      comment: 'Absent on initial test date, wrote makeup test',
      isPrimary: true
    }
  ]
}

const resolvedSophia = simulateGradeMapResolution(academicAssessment, sophiaGradeWithNote)
assert.strictEqual(resolvedSophia.resolvedScore, 9.5, 'Resolved score should be 9.5')
assert.strictEqual(resolvedSophia.textValue, '', 'textValue must NOT leak attempt comment/note for academic assessment')
console.log('  ✓ Non-admin assessment does not contaminate textValue with note/comment')

// 2. Test sorting comparator function
function sortRoster(students, sortBy, sortOrder, gradeMap, assessments) {
  function tieBreakName(sA, sB) {
    const lA = (sA.lastName || '').toLowerCase()
    const lB = (sB.lastName || '').toLowerCase()
    const lCmp = lA.localeCompare(lB)
    if (lCmp !== 0) return lCmp
    return (sA.firstName || '').toLowerCase().localeCompare((sB.firstName || '').toLowerCase())
  }

  return [...students].sort((a, b) => {
    if (sortBy === 'grade') {
      const gA = a.overallGrade
      const gB = b.overallGrade
      if (gA === -1 && gB !== -1) return 1
      if (gA !== -1 && gB === -1) return -1
      if (gA === -1 && gB === -1) return tieBreakName(a, b)
      const diff = sortOrder === 'asc' ? gA - gB : gB - gA
      if (diff !== 0) return diff
      return tieBreakName(a, b)
    } else if (sortBy !== 'name') {
      const aId = sortBy
      const gradeA = gradeMap[aId]?.[a.studentId]
      const gradeB = gradeMap[aId]?.[b.studentId]

      const targetAssess = (assessments || []).find(ast => String(ast.assessmentId) === String(aId))
      const isAdminText = targetAssess?.purpose === 'administrative' && targetAssess?.adminFormat === 'text'

      if (isAdminText) {
        const valA = (gradeA?.textValue || (gradeA?.resolvedScore != null && isNaN(Number(gradeA.resolvedScore)) ? String(gradeA.resolvedScore) : '')).trim()
        const valB = (gradeB?.textValue || (gradeB?.resolvedScore != null && isNaN(Number(gradeB.resolvedScore)) ? String(gradeB.resolvedScore) : '')).trim()
        if (!valA && valB) return 1
        if (valA && !valB) return -1
        if (!valA && !valB) return tieBreakName(a, b)
        const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        const diff = sortOrder === 'asc' ? cmp : -cmp
        if (diff !== 0) return diff
        return tieBreakName(a, b)
      }

      const getVal = (g) => {
        if (!g) return -1
        if (g.excluded) return -1
        if (g.missing) return 0
        const score = g.resolvedScore ?? g.score ?? g.pointsEarned ?? -1
        const num = Number(score)
        return isNaN(num) ? -1 : num
      }

      const valA = getVal(gradeA)
      const valB = getVal(gradeB)
      if (valA === -1 && valB !== -1) return 1
      if (valA !== -1 && valB === -1) return -1
      if (valA === -1 && valB === -1) return tieBreakName(a, b)
      const diff = sortOrder === 'asc' ? valA - valB : valB - valA
      if (diff !== 0) return diff
      return tieBreakName(a, b)
    }

    const nameA = (a.lastName || '').toLowerCase()
    const nameB = (b.lastName || '').toLowerCase()
    const lastCmp = nameA.localeCompare(nameB)
    if (lastCmp !== 0) return sortOrder === 'asc' ? lastCmp : -lastCmp
    const firstA = (a.firstName || '').toLowerCase()
    const firstB = (b.firstName || '').toLowerCase()
    return sortOrder === 'asc' ? firstA.localeCompare(firstB) : -firstA.localeCompare(firstB)
  })
}

const students = [
  { studentId: 'hayden', firstName: 'Hayden', lastName: 'Toner', overallGrade: 94 },
  { studentId: 'sophia', firstName: 'Sophia', lastName: 'Pilla', overallGrade: 28 },
  { studentId: 'katie', firstName: 'Katie', lastName: 'Keown', overallGrade: 63 },
  { studentId: 'missing_stu', firstName: 'Alex', lastName: 'Absent', overallGrade: 50 },
  { studentId: 'unassessed_stu', firstName: 'Zoe', lastName: 'Zero', overallGrade: 70 }
]

const gradeMap = {
  101: {
    hayden: { resolvedScore: 32 }, // 94.1%
    sophia: { resolvedScore: 9.5, comment: 'Was absent on Tuesday', textValue: '' }, // 27.9% with note
    katie: { resolvedScore: 21.5 }, // 63.2%
    missing_stu: { missing: true }, // M (0%)
    unassessed_stu: null // not assessed (-1)
  }
}

// Descending sort by Test 1 Kinematics
const descSorted = sortRoster(students, 101, 'desc', gradeMap, [academicAssessment])
assert.deepStrictEqual(
  descSorted.map(s => s.studentId),
  ['hayden', 'katie', 'sophia', 'missing_stu', 'unassessed_stu'],
  'Descending sort order must place 94.1% first, then 63.2%, then 27.9%, then missing, then unassessed'
)
console.log('  ✓ Descending sort places 27.9% with note in correct spot (below 63.2% and above missing)')

// Ascending sort by Test 1 Kinematics
const ascSorted = sortRoster(students, 101, 'asc', gradeMap, [academicAssessment])
assert.deepStrictEqual(
  ascSorted.map(s => s.studentId),
  ['missing_stu', 'sophia', 'katie', 'hayden', 'unassessed_stu'],
  'Ascending sort order must place missing (0%) first, then 27.9%, then 63.2%, then 94.1%, then unassessed'
)
console.log('  ✓ Ascending sort places 27.9% with note in correct spot (between missing and 63.2%)')

// Verify order is IDENTICAL whether or not the note exists
const gradeMapWithoutNote = {
  101: {
    hayden: { resolvedScore: 32 },
    sophia: { resolvedScore: 9.5, comment: '', textValue: '' }, // note removed
    katie: { resolvedScore: 21.5 },
    missing_stu: { missing: true },
    unassessed_stu: null
  }
}
const descSortedNoNote = sortRoster(students, 101, 'desc', gradeMapWithoutNote, [academicAssessment])
assert.deepStrictEqual(
  descSorted.map(s => s.studentId),
  descSortedNoNote.map(s => s.studentId),
  'Sorting order must be completely identical whether the note exists or not'
)
console.log('  ✓ Sorting order is identical with or without the note')

// 3. Test Admin Text assessment sorting
const adminTextAssessment = {
  assessmentId: 201,
  name: 'Textbook #',
  purpose: 'administrative',
  adminFormat: 'text'
}

const adminGradeMap = {
  201: {
    hayden: { textValue: 'TB-10', resolvedScore: 'TB-10' },
    sophia: { textValue: 'TB-02', resolvedScore: 'TB-02' },
    katie: { textValue: 'TB-01', resolvedScore: 'TB-01' },
    missing_stu: { textValue: '', resolvedScore: null },
    unassessed_stu: null
  }
}

const adminAscSorted = sortRoster(students, 201, 'asc', adminGradeMap, [adminTextAssessment])
assert.deepStrictEqual(
  adminAscSorted.map(s => s.studentId),
  ['katie', 'sophia', 'hayden', 'missing_stu', 'unassessed_stu'],
  'Admin text ascending sort puts TB-01, TB-02, TB-10, with empties at bottom'
)
console.log('  ✓ Admin text sorting functions correctly and places unassigned at the bottom')

console.log('\n🎉 ALL ASSESSMENT SORTING TESTS PASSED!')
