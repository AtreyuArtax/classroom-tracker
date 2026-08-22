/**
 * src/db/gradebook/assessmentService.js
 *
 * CRUD operations for the `assessments` IndexedDB object store.
 */

import { getDB } from '../index.js'
import { hasUnsyncedChanges } from '../eventService.js'

/**
 * Creates a new assessment in the database.
 * 
 * @param {Object} data Assessment data (classId, categoryId, name, date, etc.)
 * @returns {Promise<Object>} The created assessment object with its ID.
 */
export async function createAssessment(data) {
  const {
    classId, categoryId, name, description = '', date,
    assessmentType = 'product',
    unitId = null,
    expectationId = null,
    expectationIds = [],
    target = 'class',
    targetStudentId = null,
    targetCourseCode = 'all',
    totalPoints = 10,
    scaledTotal = null,
    excluded = false,
    retestPolicy = 'highest',
    ...rest
  } = data || {}

  const db = await getDB()
  const assessment = {
    classId, categoryId, name, description, date,
    assessmentType, unitId, expectationId, expectationIds,
    target, targetStudentId, targetCourseCode,
    totalPoints: totalPoints || 10, scaledTotal,
    excluded, retestPolicy,
    ...rest,
    createdAt: new Date().toISOString()
  }
  const plain = JSON.parse(JSON.stringify(assessment))
  const id = await db.add('assessments', plain)
  hasUnsyncedChanges.value = true
  return { ...plain, assessmentId: id }
}

/**
 * Returns all assessments for a specific class.
 * 
 * @param {string} classId
 * @returns {Promise<Array<Object>>}
 */
export async function getAssessmentsByClass(classId) {
  const db = await getDB()
  return await db.getAllFromIndex('assessments', 'by_classId', classId)
}

/**
 * Updates an assessment record.
 * 
 * @param {number} assessmentId
 * @param {Object} updates Partial object of fields to update.
 * @returns {Promise<Object>} The updated assessment record.
 */
export async function updateAssessment(assessmentId, updates) {
  const db = await getDB()
  const assessment = await db.get('assessments', assessmentId)
  if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`)
  
  Object.assign(assessment, updates)
  const plain = JSON.parse(JSON.stringify(assessment))
  await db.put('assessments', plain)
  hasUnsyncedChanges.value = true
  return plain
}

/**
 * Deletes an assessment and all its associated grade records.
 * 
 * @param {number} assessmentId
 * @returns {Promise<void>}
 */
export async function deleteAssessment(assessmentId) {
  if (assessmentId == null) return
  const normId = Number(assessmentId)
  if (isNaN(normId) || normId <= 0) {
    console.warn('deleteAssessment aborted: invalid assessmentId', assessmentId)
    return
  }
  const db = await getDB()
  
  const grades = await db.getAllFromIndex('grades', 'by_assessmentId', normId)
  
  const tx = db.transaction(['assessments', 'grades'], 'readwrite')
  for (const grade of grades) {
    if (grade.gradeId != null) {
      await tx.objectStore('grades').delete(grade.gradeId)
    }
  }
  await tx.objectStore('assessments').delete(normId)
  await tx.done
  
  hasUnsyncedChanges.value = true
}
