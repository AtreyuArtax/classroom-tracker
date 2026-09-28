/**
 * src/db/gradebook/gradeCalc.js
 *
 * DB-backed calculation services and backward-compatibility layer.
 * Pure math algorithms reside under src/utils/gradeCalc.js.
 */

import { getSettings } from '../settingsService.js'
import { getAssessmentsByClass } from './assessmentService.js'
import { getGradesByClass, getGradesByStudent } from './gradeService.js'
import { calculateStudentGrade as pureCalculateStudentGrade } from '../../utils/gradeCalc.js'

export * from '../../utils/gradeCalc.js'

/**
 * Calculates grade for a student, fetching assessments, grades, and settings
 * from IndexedDB if pre-references are not provided.
 */
export async function calculateStudentGrade(studentId, classRecord, { asOf = null, dateFrom = null, assessmentsPreRef = null, gradesPreRef = null, settingsPreRef = null } = {}) {
  if (!studentId || !classRecord || !classRecord.classId) return null
  const assessments = assessmentsPreRef || await getAssessmentsByClass(classRecord.classId)
  const grades = gradesPreRef || await getGradesByStudent(studentId, classRecord.classId)
  const settings = settingsPreRef || await getSettings().catch(() => null)

  return pureCalculateStudentGrade(studentId, classRecord, {
    asOf,
    dateFrom,
    assessmentsPreRef: assessments,
    gradesPreRef: grades,
    settingsPreRef: settings
  })
}

/**
 * Convenience function to calculate grades for all students in a class.
 * Batches DB fetches once for the entire class.
 */
export async function calculateClassGrades(classRecord, { asOf = null, dateFrom = null } = {}) {
  if (!classRecord || !classRecord.classId) return {}
  // 1. Batch fetch all data and settings once
  const [assessments, allGrades, settings] = await Promise.all([
    getAssessmentsByClass(classRecord.classId),
    getGradesByClass(classRecord.classId),
    getSettings().catch(() => null)
  ])

  // 2. Index grades by studentId for O(1) retrieval
  const studentGradeMap = new Map()
  for (const g of allGrades) {
    if (!studentGradeMap.has(g.studentId)) studentGradeMap.set(g.studentId, [])
    studentGradeMap.get(g.studentId).push(g)
  }

  const results = {}
  for (const studentId of Object.keys(classRecord.students || {})) {
    const st = classRecord.students[studentId]
    if (st && st.archived) continue
    if (!st?.firstName?.trim() && !st?.lastName?.trim()) continue
    const studentGrades = studentGradeMap.get(studentId) || []
    
    results[studentId] = await pureCalculateStudentGrade(studentId, classRecord, { 
      asOf, 
      dateFrom,
      assessmentsPreRef: assessments, 
      gradesPreRef: studentGrades,
      settingsPreRef: settings
    })
  }
  return results
}
