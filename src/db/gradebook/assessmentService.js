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
export async function createAssessment({
  classId, categoryId, name, description = '', date,
  assessmentType = 'product',
  unitId = null,
  expectationId = null,
  target = 'class',
  targetStudentId = null,
  totalPoints,
  scaledTotal = null,
  excluded = false,
  retestPolicy = 'highest'
}) {
  const db = await getDB()
  const assessment = {
    classId, categoryId, name, description, date,
    assessmentType, unitId, expectationId,
    target, targetStudentId,
    totalPoints, scaledTotal,
    excluded, retestPolicy,
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
  const db = await getDB()
  
  // Find all grades for this assessment first
  const grades = await db.getAllFromIndex('grades', 'by_assessmentId', assessmentId)
  
  const tx = db.transaction(['assessments', 'grades'], 'readwrite')
  for (const grade of grades) {
    await tx.objectStore('grades').delete(grade.gradeId)
  }
  await tx.objectStore('assessments').delete(assessmentId)
  await tx.done
  
  hasUnsyncedChanges.value = true
}
