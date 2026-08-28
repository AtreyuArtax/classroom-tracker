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

/**
 * Returns audit usage counts for an expectation in a class (assessments, student scores, qualitative events).
 *
 * @param {string} classId
 * @param {string} expectationCode
 * @param {string} [expectationId]
 * @returns {Promise<{ assessmentCount: number, gradeCount: number, eventCount: number, totalCount: number }>}
 */
export async function getExpectationUsageCounts(classId, expectationCode, expectationId = null) {
  if (!classId || (!expectationCode && !expectationId)) {
    return { assessmentCount: 0, gradeCount: 0, eventCount: 0, totalCount: 0 }
  }

  const db = await getDB()
  const normCode = (expectationCode || '').toLowerCase().trim()
  const normId = (expectationId || '').toLowerCase().trim()

  // 1. Check assessments
  const assessments = await db.getAllFromIndex('assessments', 'by_classId', classId)
  let assessmentCount = 0
  assessments.forEach(ast => {
    const list = (ast.expectationIds || (ast.expectationId ? [ast.expectationId] : [])).map(x => String(x).toLowerCase().trim())
    if ((normCode && list.includes(normCode)) || (normId && list.includes(normId))) {
      assessmentCount++
    }
  })

  // 2. Check student grades
  let grades = []
  try {
    grades = await db.getAllFromIndex('grades', 'by_classId', classId)
  } catch {
    grades = []
  }
  let gradeCount = 0
  grades.forEach(g => {
    if (g.expectationScores && typeof g.expectationScores === 'object') {
      const keys = Object.keys(g.expectationScores).map(k => String(k).toLowerCase().trim())
      if ((normCode && keys.includes(normCode)) || (normId && keys.includes(normId))) {
        gradeCount++
      }
    }
  })

  // 3. Check qualitative events
  let eventCount = 0
  try {
    const events = await db.getAllFromIndex('events', 'by_classId', classId)
    events.forEach(e => {
      if (e.expectationId) {
        const eNorm = String(e.expectationId).toLowerCase().trim()
        if ((normCode && eNorm === normCode) || (normId && eNorm === normId)) {
          eventCount++
        }
      }
    })
  } catch {
    eventCount = 0
  }

  return {
    assessmentCount,
    gradeCount,
    eventCount,
    totalCount: assessmentCount + gradeCount + eventCount
  }
}

/**
 * Cascades expectation renaming across all assessments, student grades, and events in a class.
 * Ensures historical SBAR calculations and student tracking remain intact when expectation codes change.
 *
 * @param {string} classId
 * @param {string} oldCode
 * @param {string} newCode
 * @param {string} [oldId]
 * @returns {Promise<{ affectedAssessments: number, affectedGrades: number, affectedEvents: number }>}
 */
export async function cascadeRenameExpectation(classId, oldCode, newCode, oldId = null) {
  if (!classId || !oldCode || !newCode) {
    return { affectedAssessments: 0, affectedGrades: 0, affectedEvents: 0 }
  }

  const db = await getDB()
  const oldNorm = String(oldCode).toLowerCase().trim()
  const oldIdNorm = oldId ? String(oldId).toLowerCase().trim() : null
  const newClean = String(newCode).toUpperCase().trim()

  let affectedAssessments = 0
  let affectedGrades = 0
  let affectedEvents = 0

  // 1. Update Assessments
  const assessments = await db.getAllFromIndex('assessments', 'by_classId', classId)
  const txAst = db.transaction('assessments', 'readwrite')
  const astStore = txAst.objectStore('assessments')

  for (const ast of assessments) {
    let modified = false
    if (ast.expectationIds && Array.isArray(ast.expectationIds)) {
      const updatedIds = ast.expectationIds.map(code => {
        const cNorm = String(code).toLowerCase().trim()
        if (cNorm === oldNorm || (oldIdNorm && cNorm === oldIdNorm)) {
          modified = true
          return newClean
        }
        return code
      })
      if (modified) ast.expectationIds = updatedIds
    }
    if (ast.expectationId) {
      const singleNorm = String(ast.expectationId).toLowerCase().trim()
      if (singleNorm === oldNorm || (oldIdNorm && singleNorm === oldIdNorm)) {
        ast.expectationId = newClean
        modified = true
      }
    }
    if (modified) {
      await astStore.put(ast)
      affectedAssessments++
    }
  }
  await txAst.done

  // 2. Update Student Grades (expectationScores keys)
  let grades = []
  try {
    grades = await db.getAllFromIndex('grades', 'by_classId', classId)
  } catch {
    grades = []
  }

  if (grades.length > 0) {
    const txGrades = db.transaction('grades', 'readwrite')
    const gradeStore = txGrades.objectStore('grades')

    for (const g of grades) {
      if (g.expectationScores && typeof g.expectationScores === 'object') {
        let modified = false
        const newScores = { ...g.expectationScores }

        Object.keys(g.expectationScores).forEach(key => {
          const kNorm = String(key).toLowerCase().trim()
          if (kNorm === oldNorm || (oldIdNorm && kNorm === oldIdNorm)) {
            newScores[newClean] = g.expectationScores[key]
            delete newScores[key]
            modified = true
          }
        })

        if (modified) {
          g.expectationScores = newScores
          await gradeStore.put(g)
          affectedGrades++
        }
      }
    }
    await txGrades.done
  }

  // 3. Update Qualitative Events
  try {
    const txEvt = db.transaction('events', 'readwrite')
    const evtStore = txEvt.objectStore('events')
    const events = await evtStore.index('by_classId').getAll(classId)

    for (const e of events) {
      if (e.expectationId) {
        const eNorm = String(e.expectationId).toLowerCase().trim()
        if (eNorm === oldNorm || (oldIdNorm && eNorm === oldIdNorm)) {
          e.expectationId = newClean
          await evtStore.put(e)
          affectedEvents++
        }
      }
    }
    await txEvt.done
  } catch (err) {
    console.warn('Failed to cascade rename events', err)
  }

  hasUnsyncedChanges.value = true
  return { affectedAssessments, affectedGrades, affectedEvents }
}

/**
 * Safely detaches a deleted expectation from assessments and student grades in a class.
 *
 * @param {string} classId
 * @param {string} expectationCode
 * @param {string} [expectationId]
 * @returns {Promise<{ affectedAssessments: number, affectedGrades: number }>}
 */
export async function detachExpectationFromAssessmentsAndGrades(classId, expectationCode, expectationId = null) {
  if (!classId || (!expectationCode && !expectationId)) {
    return { affectedAssessments: 0, affectedGrades: 0 }
  }

  const db = await getDB()
  const normCode = (expectationCode || '').toLowerCase().trim()
  const normId = (expectationId || '').toLowerCase().trim()

  let affectedAssessments = 0
  let affectedGrades = 0

  // 1. Detach from Assessments
  const assessments = await db.getAllFromIndex('assessments', 'by_classId', classId)
  const txAst = db.transaction('assessments', 'readwrite')
  const astStore = txAst.objectStore('assessments')

  for (const ast of assessments) {
    let modified = false
    if (ast.expectationIds && Array.isArray(ast.expectationIds)) {
      const filtered = ast.expectationIds.filter(code => {
        const cNorm = String(code).toLowerCase().trim()
        return cNorm !== normCode && (!normId || cNorm !== normId)
      })
      if (filtered.length !== ast.expectationIds.length) {
        ast.expectationIds = filtered
        modified = true
      }
    }
    if (ast.expectationId) {
      const singleNorm = String(ast.expectationId).toLowerCase().trim()
      if (singleNorm === normCode || (normId && singleNorm === normId)) {
        ast.expectationId = ast.expectationIds?.[0] || null
        modified = true
      }
    }
    if (modified) {
      await astStore.put(ast)
      affectedAssessments++
    }
  }
  await txAst.done

  // 2. Detach from Student Grades
  let grades = []
  try {
    grades = await db.getAllFromIndex('grades', 'by_classId', classId)
  } catch {
    grades = []
  }

  if (grades.length > 0) {
    const txGrades = db.transaction('grades', 'readwrite')
    const gradeStore = txGrades.objectStore('grades')

    for (const g of grades) {
      if (g.expectationScores && typeof g.expectationScores === 'object') {
        let modified = false
        const newScores = { ...g.expectationScores }

        Object.keys(g.expectationScores).forEach(key => {
          const kNorm = String(key).toLowerCase().trim()
          if (kNorm === normCode || (normId && kNorm === normId)) {
            delete newScores[key]
            modified = true
          }
        })

        if (modified) {
          g.expectationScores = newScores
          await gradeStore.put(g)
          affectedGrades++
        }
      }
    }
    await txGrades.done
  }

  hasUnsyncedChanges.value = true
  return { affectedAssessments, affectedGrades }
}
