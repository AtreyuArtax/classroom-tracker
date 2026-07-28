/**
 * src/db/gradebook/gradeService.js
 *
 * CRUD operations for the `grades` IndexedDB object store and attempt management.
 */

import { getDB } from '../index.js'
import { hasUnsyncedChanges } from '../eventService.js'
import { getAssessmentsByClass } from './assessmentService.js'

/**
 * Retrieves a grade record within a transaction.
 * Usually called from within other transactional operations.
 */
export async function _getGradeInTransaction(tx, assessmentId, studentId, classId) {
  // Normalize types: assessmentId should be Number, studentId should be String
  const normAssessmentId = Number(assessmentId)
  const normStudentId = String(studentId)

  const existing = await tx.objectStore('grades').index('by_assessmentAndStudent').get([normAssessmentId, normStudentId])
  
  if (existing) {
    // HEAL: If classId is missing or null, update it now.
    // This fixes the "disappearing marks" bug where orphan records (classId: null) 
    // are excluded from the class-view list.
    if (!existing.classId && classId) {
      existing.classId = classId
      await tx.objectStore('grades').put(existing)
    }
    return existing
  }

  const grade = {
    assessmentId: normAssessmentId,
    studentId: normStudentId,
    classId: classId || null, // classId is required for performance index
    missing: false,
    excluded: false,
    attempts: []
  }
  const plain = JSON.parse(JSON.stringify(grade))
  const id = await tx.objectStore('grades').add(plain)
  return { ...plain, gradeId: id }
}

/**
 * Retrieves a grade record for a student/assessment pair, or creates one if missing.
 * Requires classId to prevent orphan records and ensure index performance.
 */
export async function getOrCreateGrade(assessmentId, studentId, classId) {
  if (!classId) throw new Error('[gradebookService] getOrCreateGrade: classId is required.')
  const db = await getDB()
  const tx = db.transaction('grades', 'readwrite')
  const grade = await _getGradeInTransaction(tx, assessmentId, studentId, classId)
  await tx.done
  return grade
}

/**
 * Adds an assessment attempt (score entry) for a student.
 * Uses a single transaction to prevent race conditions.
 */
export async function addAttempt(assessmentId, studentId, { pointsEarned, date, comment = '' }) {
  const db = await getDB()
  
  // We need to know classId for the new grade record if it doesn't exist.
  // We fetch it from the assessment.
  const assessment = await db.get('assessments', assessmentId)
  if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`)

  const tx = db.transaction('grades', 'readwrite')
  const store = tx.objectStore('grades')
  const grade = await _getGradeInTransaction(tx, assessmentId, studentId, assessment.classId)
  
  // Note: We allow raw scores higher than total points for bonus marks and scaling
  
  const attempt = {
    attemptId: crypto.randomUUID(),
    pointsEarned,
    date: date || new Date().toISOString(),
    isPrimary: grade.attempts.length === 0,
    comment
  }
  
  grade.attempts.push(attempt)
  const plain = JSON.parse(JSON.stringify(grade))
  await store.put(plain)
  await tx.done

  hasUnsyncedChanges.value = true
  return plain
}

/**
 * Removes a specific attempt from a grade record.
 * Transaction-guarded to prevent data loss.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {string} attemptId
 * @returns {Promise<Object>} The updated grade record.
 */
export async function deleteAttempt(assessmentId, studentId, attemptId) {
  const db = await getDB()
  const assessment = await db.get('assessments', assessmentId)
  if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`)

  const tx = db.transaction('grades', 'readwrite')
  const store = tx.objectStore('grades')
  
  const grade = await _getGradeInTransaction(tx, assessmentId, studentId, assessment.classId)
  
  grade.attempts = grade.attempts.filter(a => a.attemptId !== attemptId)
  
  const plain = JSON.parse(JSON.stringify(grade))
  await store.put(plain)
  await tx.done

  hasUnsyncedChanges.value = true
  return plain
}

/**
 * Sets a specific attempt as the primary (counting) one.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {string} attemptId
 * @returns {Promise<Object>} The updated grade record.
 */
export async function setPrimaryAttempt(assessmentId, studentId, attemptId) {
  const db = await getDB()
  const assessment = await db.get('assessments', assessmentId)
  if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`)

  const tx = db.transaction('grades', 'readwrite')
  const store = tx.objectStore('grades')
  const grade = await _getGradeInTransaction(tx, assessmentId, studentId, assessment.classId)
  
  grade.attempts = grade.attempts.map(a => ({
    ...a,
    isPrimary: a.attemptId === attemptId
  }))
  
  const plain = JSON.parse(JSON.stringify(grade))
  await store.put(plain)
  await tx.done

  hasUnsyncedChanges.value = true
  return plain
}

/**
 * Updates the comment on a specific attempt.
 *
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {string} attemptId
 * @param {string} comment
 * @returns {Promise<Object>} The updated grade record.
 */
export async function updateAttemptComment(assessmentId, studentId, attemptId, comment) {
  const db = await getDB()
  const assessment = await db.get('assessments', assessmentId)
  if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`)

  const tx = db.transaction('grades', 'readwrite')
  const store = tx.objectStore('grades')
  const grade = await _getGradeInTransaction(tx, assessmentId, studentId, assessment.classId)

  grade.attempts = grade.attempts.map(a =>
    a.attemptId === attemptId ? { ...a, comment: comment ?? '' } : a
  )

  const plain = JSON.parse(JSON.stringify(grade))
  await store.put(plain)
  await tx.done

  hasUnsyncedChanges.value = true
  return plain
}

/**
 * Updates boolean flags on a grade record.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {Object} flags { missing: boolean, excluded: boolean }
 * @returns {Promise<Object>} The updated grade record.
 */
export async function updateGradeFlags(assessmentId, studentId, flags) {
  const db = await getDB()
  
  const assessment = await db.get('assessments', assessmentId)
  if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`)

  const tx = db.transaction('grades', 'readwrite')
  const store = tx.objectStore('grades')
  const grade = await _getGradeInTransaction(tx, assessmentId, studentId, assessment.classId)
  
  Object.assign(grade, flags)
  const plain = JSON.parse(JSON.stringify(grade))
  await store.put(plain)
  await tx.done

  hasUnsyncedChanges.value = true
  return plain
}

/**
 * Deletes a grade record for a student/assessment.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 */
export async function deleteGrade(assessmentId, studentId) {
  const db = await getDB()
  const existing = await db.getFromIndex('grades', 'by_assessmentAndStudent', [assessmentId, studentId])
  if (existing) {
    await db.delete('grades', existing.gradeId)
    hasUnsyncedChanges.value = true
  }
}

/**
 * Persists/overwrites a complete grade object in IndexedDB (used by Undo).
 * 
 * @param {Object} gradeRecord
 */
export async function saveFullGradeRecord(gradeRecord) {
  const db = await getDB()
  const tx = db.transaction('grades', 'readwrite')
  const store = tx.objectStore('grades')
  const plain = JSON.parse(JSON.stringify(gradeRecord))
  await store.put(plain)
  await tx.done
  hasUnsyncedChanges.value = true
}

/**
 * Returns all grades for all students in a class.
 * NOW OPTIMIZED with single-query by_classId index!
 * 
 * @param {string} classId
 * @returns {Promise<Array<Object>>}
 */
export async function getGradesByClass(classId) {
  const db = await getDB()
  return await db.getAllFromIndex('grades', 'by_classId', classId)
}

/**
 * Returns all grades for a specific student across all assessments in a class.
 * 
 * @param {string} studentId
 * @param {string} classId
 * @returns {Promise<Array<Object>>}
 */
export async function getGradesByStudent(studentId, classId) {
  const db = await getDB()
  const assessments = await getAssessmentsByClass(classId)
  const assessmentIds = new Set(assessments.map(a => a.assessmentId))
  
  const allGrades = await db.getAllFromIndex('grades', 'by_studentId', studentId)
  return allGrades.filter(g => assessmentIds.has(g.assessmentId))
}
