/**
 * src/db/learningSkillsService.js
 *
 * Public API for the `learning_skills` object store.
 * Handles student self-evaluations and teacher evaluations for the 6 Ontario
 * Growing Success Learning Skills & Work Habits:
 *   1. Responsibility
 *   2. Organization
 *   3. Independent Work
 *   4. Collaboration
 *   5. Initiative
 *   6. Self-Regulation
 *
 * Scope rule: Records are strictly isolated by compound key (classId, studentId, term).
 */

import { getDB } from './index.js'
import { hasUnsyncedChanges } from './eventService.js'

export const LEARNING_SKILL_CATEGORIES = [
  { key: 'responsibility', label: 'Responsibility', short: 'R', description: 'Fulfills commitments, submits work on time, takes responsibility for actions.' },
  { key: 'organization', label: 'Organization', short: 'O', description: 'Manages time, materials, and priorities effectively.' },
  { key: 'independentWork', label: 'Independent Work', short: 'I', description: 'Monitors progress, follows instructions, works without constant supervision.' },
  { key: 'collaboration', label: 'Collaboration', short: 'C', description: 'Works well with others, shares responsibility, builds positive relationships.' },
  { key: 'initiative', label: 'Initiative', short: 'I', description: 'Demonstrates curiosity, seeks new learning opportunities, acts with positive advocacy.' },
  { key: 'selfRegulation', label: 'Self-Regulation', short: 'S', description: 'Sets individual goals, perseveres through challenges, manages emotions and focus.' }
]

export const LEARNING_SKILL_LEVELS = [
  { key: 'E', label: 'Excellent', numeric: 4, color: '#30b0c7', bg: 'rgba(48, 176, 199, 0.15)' },
  { key: 'G', label: 'Good', numeric: 3, color: '#34c759', bg: 'rgba(52, 199, 89, 0.15)' },
  { key: 'S', label: 'Satisfactory', numeric: 2, color: '#ffcc00', bg: 'rgba(255, 204, 0, 0.15)' },
  { key: 'N', label: 'Needs Improvement', numeric: 1, color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.15)' }
]

export const LEARNING_SKILL_TERMS = ['Progress Report', 'Midterm', 'Final']

export const LEVEL_MAP = Object.fromEntries(LEARNING_SKILL_LEVELS.map(l => [l.key, l]))

/**
 * Returns true if the record contains at least one non-null rating in either teacherEval or studentEval.
 * @param {Object} record
 * @returns {boolean}
 */
export function hasLearningSkillsData(record) {
  if (!record) return false
  const se = record.studentEval || {}
  const te = record.teacherEval || {}
  const hasStudentRating = Object.values(se).some(v => v !== null && v !== undefined && v !== '')
  const hasTeacherRating = Object.values(te).some(v => v !== null && v !== undefined && v !== '')
  return hasStudentRating || hasTeacherRating
}

/**
 * Returns a standardized deterministic ID for a learning skill record.
 * @param {string} classId
 * @param {string} studentId
 * @param {string} term
 * @returns {string}
 */
export function formatLearningSkillKey(classId, studentId, term) {
  return `${classId}_${studentId}_${term}`
}

/**
 * Returns all learning skill records for a specific class and term.
 * @param {string} classId
 * @param {string} term
 * @returns {Promise<Array<Object>>}
 */
export async function getLearningSkillsByClassAndTerm(classId, term) {
  if (!classId || !term) return []
  const db = await getDB()
  try {
    const records = await db.getAllFromIndex('learning_skills', 'by_classId_term', [classId, term])
    return (records || []).filter(hasLearningSkillsData)
  } catch (err) {
    console.error(`[LearningSkills] Failed to get skills for class ${classId} term ${term}:`, err)
    return []
  }
}

/**
 * Returns all learning skill records for a specific class across all terms.
 * @param {string} classId
 * @returns {Promise<Array<Object>>}
 */
export async function getLearningSkillsByClass(classId) {
  if (!classId) return []
  const db = await getDB()
  try {
    const records = await db.getAllFromIndex('learning_skills', 'by_classId', classId)
    return (records || []).filter(hasLearningSkillsData)
  } catch (err) {
    console.error(`[LearningSkills] Failed to get skills for class ${classId}:`, err)
    return []
  }
}

/**
 * Returns all learning skill records for a student scoped strictly to a specific course (classId).
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<Array<Object>>}
 */
export async function getLearningSkillsByStudent(classId, studentId) {
  if (!classId || !studentId) return []
  const db = await getDB()
  try {
    const records = await db.getAllFromIndex('learning_skills', 'by_student_class', [studentId, classId])
    return (records || []).filter(hasLearningSkillsData)
  } catch (err) {
    console.error(`[LearningSkills] Failed to get student ${studentId} in class ${classId}:`, err)
    return []
  }
}

/**
 * Saves or updates a single learning skill record.
 * Automatically deletes the record from IndexedDB if all ratings are cleared/empty.
 * @param {Object} record
 * @returns {Promise<Object|null>}
 */
export async function saveLearningSkillsRecord(record) {
  if (!record.classId || !record.studentId || !record.term) {
    throw new Error('Learning skills record must contain classId, studentId, and term.')
  }
  const db = await getDB()
  const plain = JSON.parse(JSON.stringify(record))
  const key = plain.id || formatLearningSkillKey(plain.classId, plain.studentId, plain.term)

  if (!hasLearningSkillsData(plain)) {
    await db.delete('learning_skills', key)
    hasUnsyncedChanges.value = true
    return null
  }

  const payload = {
    ...plain,
    id: key,
    updatedAt: new Date().toISOString()
  }
  await db.put('learning_skills', payload)
  hasUnsyncedChanges.value = true
  return payload
}

/**
 * Deletes a single learning skill record by its ID.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteLearningSkillsRecord(id) {
  if (!id) return
  const db = await getDB()
  await db.delete('learning_skills', id)
  hasUnsyncedChanges.value = true
}

/**
 * Saves a batch of learning skill records in a single transaction.
 * @param {Array<Object>} records
 * @returns {Promise<number>} count of saved records
 */
export async function saveBatchLearningSkills(records) {
  if (!Array.isArray(records) || records.length === 0) return 0
  const db = await getDB()
  const tx = db.transaction('learning_skills', 'readwrite')
  const store = tx.objectStore('learning_skills')
  const now = new Date().toISOString()
  const plainRecords = JSON.parse(JSON.stringify(records))
  let count = 0

  for (const r of plainRecords) {
    if (!r.classId || !r.studentId || !r.term) continue
    const key = r.id || formatLearningSkillKey(r.classId, r.studentId, r.term)
    if (!hasLearningSkillsData(r)) {
      await store.delete(key)
    } else {
      const payload = {
        ...r,
        id: key,
        updatedAt: now
      }
      await store.put(payload)
      count++
    }
  }

  await tx.done
  hasUnsyncedChanges.value = true
  return count
}

/**
 * Deletes all learning skill records for a specific class and term.
 * @param {string} classId
 * @param {string} term
 * @returns {Promise<void>}
 */
export async function deleteLearningSkillsByTerm(classId, term) {
  if (!classId || !term) return
  const db = await getDB()
  const records = await getLearningSkillsByClassAndTerm(classId, term)
  if (!records.length) return

  const tx = db.transaction('learning_skills', 'readwrite')
  const store = tx.objectStore('learning_skills')
  for (const r of records) {
    await store.delete(r.id)
  }
  await tx.done
  hasUnsyncedChanges.value = true
}

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

/**
 * Generates and downloads a standardized CSV formatted for school SIS imports.
 * @param {Object} reportClass
 * @param {Array<Object>} students
 * @param {string} term
 * @param {Map<string, Object>} recordsMap
 */
export function exportLearningSkillsCsv(reportClass, students = [], term = 'Progress Report', recordsMap = new Map()) {
  if (!students || students.length === 0) return

  const rows = [
    ['Student ID', 'Last Name', 'First Name', 'Student Email', 'Term', 'Responsibility', 'Organization', 'Independent Work', 'Collaboration', 'Initiative', 'Self-Regulation'].map(escapeCsvCell)
  ]

  for (const s of students) {
    const rec = recordsMap.get(s.studentId)
    const te = rec?.teacherEval || {}
    const se = rec?.studentEval || {}

    const r = te.responsibility || se.responsibility || ''
    const o = te.organization || se.organization || ''
    const i = te.independentWork || se.independentWork || ''
    const c = te.collaboration || se.collaboration || ''
    const init = te.initiative || se.initiative || ''
    const sr = te.selfRegulation || se.selfRegulation || ''

    rows.push([
      escapeCsvCell(s.studentNumber || s.studentId || ''),
      escapeCsvCell(s.lastName || ''),
      escapeCsvCell(s.firstName || ''),
      escapeCsvCell(s.studentEmail || s.email || ''),
      escapeCsvCell(term),
      escapeCsvCell(r),
      escapeCsvCell(o),
      escapeCsvCell(i),
      escapeCsvCell(c),
      escapeCsvCell(init),
      escapeCsvCell(sr)
    ])
  }

  const csvContent = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  return blob
}

/**
 * Generates an all-term CSV export containing all reporting periods with data.
 * @param {Object} reportClass
 * @param {Array<Object>} students
 * @param {Array<Object>} allRecordsList
 * @returns {Blob}
 */
export function exportAllLearningSkillsCsv(reportClass, students = [], allRecordsList = []) {
  if (!students || students.length === 0) return null

  const studentRecordsMap = new Map()
  const detectedTerms = new Set()

  for (const rec of allRecordsList) {
    if (!rec.studentId || !rec.term) continue
    detectedTerms.add(rec.term)
    if (!studentRecordsMap.has(rec.studentId)) {
      studentRecordsMap.set(rec.studentId, new Map())
    }
    studentRecordsMap.get(rec.studentId).set(rec.term, rec)
  }

  // Canonical ordering: Progress Report -> Midterm -> Final
  const orderedTerms = LEARNING_SKILL_TERMS.filter(t => detectedTerms.has(t))
  for (const t of detectedTerms) {
    if (!orderedTerms.includes(t)) orderedTerms.push(t)
  }

  if (orderedTerms.length === 0) orderedTerms.push('Progress Report')

  const rows = [
    ['Student ID', 'Last Name', 'First Name', 'Student Email', 'Term', 'Responsibility', 'Organization', 'Independent Work', 'Collaboration', 'Initiative', 'Self-Regulation'].map(escapeCsvCell)
  ]

  for (const s of students) {
    const termMap = studentRecordsMap.get(s.studentId) || new Map()
    for (const term of orderedTerms) {
      const rec = termMap.get(term)
      const te = rec?.teacherEval || {}
      const se = rec?.studentEval || {}

      const r = te.responsibility || se.responsibility || ''
      const o = te.organization || se.organization || ''
      const i = te.independentWork || se.independentWork || ''
      const c = te.collaboration || se.collaboration || ''
      const init = te.initiative || se.initiative || ''
      const sr = te.selfRegulation || se.selfRegulation || ''

      rows.push([
        escapeCsvCell(s.studentNumber || s.studentId || ''),
        escapeCsvCell(s.lastName || ''),
        escapeCsvCell(s.firstName || ''),
        escapeCsvCell(s.studentEmail || s.email || ''),
        escapeCsvCell(term),
        escapeCsvCell(r),
        escapeCsvCell(o),
        escapeCsvCell(i),
        escapeCsvCell(c),
        escapeCsvCell(init),
        escapeCsvCell(sr)
      ])
    }
  }

  const csvContent = rows.map(r => r.join(',')).join('\n')
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
}
