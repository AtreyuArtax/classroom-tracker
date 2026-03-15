/**
 * src/db/gradebookService.js
 *
 * Public API for the `assessments` and `grades` object stores.
 * Handles the complete data layer for the Gradebook V4 feature.
 */

import { getDB } from './index.js'
import { hasUnsyncedChanges } from './eventService.js'

// ─── Assessment CRUD ─────────────────────────────────────────────────────────

/**
 * Creates a new assessment in the database.
 * 
 * @param {Object} data Assessment data (classId, categoryId, name, date, etc.)
 * @returns {Promise<Object>} The created assessment object with its ID.
 */
export async function createAssessment({
  classId, categoryId, name, date,
  assessmentType = 'product',
  unit = null,
  target = 'class',
  targetStudentId = null,
  totalPoints,
  scaledTotal = null,
  excluded = false,
  retestPolicy = 'highest'
}) {
  const db = await getDB()
  const assessment = {
    classId, categoryId, name, date,
    assessmentType, unit,
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

// ─── Grade CRUD ─────────────────────────────────────────────────────────────

/**
 * Retrieves a grade record for a student/assessment pair, or creates one if missing.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @returns {Promise<Object>}
 */
export async function getOrCreateGrade(assessmentId, studentId) {
  const db = await getDB()
  const existing = await db.getFromIndex('grades', 'by_assessmentAndStudent', [assessmentId, studentId])
  if (existing) return existing

  const grade = {
    assessmentId,
    studentId,
    missing: false,
    excluded: false,
    attempts: []
  }
  const plain = JSON.parse(JSON.stringify(grade))
  const id = await db.add('grades', plain)
  return { ...plain, gradeId: id }
}

/**
 * Adds an assessment attempt (score entry) for a student.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {Object} attemptData { pointsEarned, date, comment }
 * @returns {Promise<Object>} The updated grade record.
 */
export async function addAttempt(assessmentId, studentId, { pointsEarned, date, comment = '' }) {
  const db = await getDB()
  const grade = await getOrCreateGrade(assessmentId, studentId)
  
  const attempt = {
    attemptId: crypto.randomUUID(),
    pointsEarned,
    date: date || new Date().toISOString(),
    comment
  }
  
  grade.attempts.push(attempt)
  const plain = JSON.parse(JSON.stringify(grade))
  await db.put('grades', plain)
  hasUnsyncedChanges.value = true
  return plain
}

/**
 * Removes a specific attempt from a grade record.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {string} attemptId
 * @returns {Promise<Object>} The updated grade record.
 */
export async function deleteAttempt(assessmentId, studentId, attemptId) {
  const db = await getDB()
  const grade = await getOrCreateGrade(assessmentId, studentId)
  
  grade.attempts = grade.attempts.filter(a => a.attemptId !== attemptId)
  
  const plain = JSON.parse(JSON.stringify(grade))
  await db.put('grades', plain)
  hasUnsyncedChanges.value = true
  return plain
}

/**
 * Sets a specific attempt as the primary (counting) one.
 */
export async function setPrimaryAttempt(assessmentId, studentId, attemptId) {
  const db = await getDB()
  const grade = await getOrCreateGrade(assessmentId, studentId)
  
  grade.attempts = grade.attempts.map(a => ({
    ...a,
    isPrimary: a.attemptId === attemptId
  }))
  
  const plain = JSON.parse(JSON.stringify(grade))
  await db.put('grades', plain)
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
  const grade = await getOrCreateGrade(assessmentId, studentId)
  
  Object.assign(grade, flags)
  const plain = JSON.parse(JSON.stringify(grade))
  await db.put('grades', plain)
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
 * Returns all grades for all students in a class.
 * 
 * @param {string} classId
 * @returns {Promise<Array<Object>>}
 */
export async function getGradesByClass(classId) {
  const db = await getDB()
  const assessments = await getAssessmentsByClass(classId)
  const assessmentIds = assessments.map(a => a.assessmentId)
  
  const allGrades = []
  for (const assessmentId of assessmentIds) {
    const grades = await db.getAllFromIndex('grades', 'by_assessmentId', assessmentId)
    allGrades.push(...grades)
  }
  return allGrades
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

// ─── Grade Calculation Logic ───────────────────────────────────────────────

/**
 * Resolves which score counts for an assessment based on the retest policy.
 * 
 * @param {Array<Object>} attempts Array of attempt objects.
 * @param {string} retestPolicy 'highest' | 'latest' | 'average' | 'manual'
 * @returns {number|null}
 */
export function resolveAttemptScore(attempts, retestPolicy) {
  if (!attempts || attempts.length === 0) return null
  const valid = attempts.filter(a => a.pointsEarned != null)
  if (valid.length === 0) return null

  switch (retestPolicy) {
    case 'highest':
      return Math.max(...valid.map(a => a.pointsEarned))
    case 'latest':
      return valid[valid.length - 1].pointsEarned
    case 'average':
      return valid.reduce((sum, a) => sum + a.pointsEarned, 0) / valid.length
    case 'manual':
      const primary = valid.find(a => a.isPrimary)
      return primary ? primary.pointsEarned : valid[valid.length - 1].pointsEarned
    default:
      return Math.max(...valid.map(a => a.pointsEarned))
  }
}

/**
 * Finds the dominant 10% bucket for a set of scores.
 */
function getBucketMode(scores) {
  if (!scores || scores.length === 0) return { result: null, isFallback: false }
  
  const buckets = Array.from({ length: 11 }, () => []) // 0-10, 10-20, ..., 90-100, and a catch-all 100
  
  scores.forEach(s => {
    let index = Math.floor(s.percentage / 10)
    if (index > 10) index = 10
    if (index < 0) index = 0
    buckets[index].push(s)
  })

  let maxCount = 0
  let bestBucketIndex = -1

  for (let i = 0; i <= 10; i++) {
    if (buckets[i].length > maxCount) {
      maxCount = buckets[i].length
      bestBucketIndex = i
    } else if (buckets[i].length === maxCount && maxCount > 0) {
      // Tie-break: use bucket with most recent score
      const currentNewest = Math.max(...buckets[bestBucketIndex].map(s => new Date(s.date).getTime()))
      const candidateNewest = Math.max(...buckets[i].map(s => new Date(s.date).getTime()))
      if (candidateNewest > currentNewest) {
        bestBucketIndex = i
      }
    }
  }

  if (maxCount <= 1) return { result: null, isFallback: false }

  const bucketScores = buckets[bestBucketIndex].map(s => s.percentage)
  const mean = bucketScores.reduce((a, b) => a + b, 0) / bucketScores.length
  
  const low = bestBucketIndex * 10
  const high = bestBucketIndex === 10 ? 100 : low + 9
  const label = `${low}-${high}%`

  return { 
    result: mean, 
    bucketLabel: label, 
    count: maxCount, 
    isFallback: false 
  }
}

/**
 * Calculates the median of an array of numbers.
 */
function calculateMedian(scores) {
  if (!scores || scores.length === 0) return null
  const sorted = [...scores].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Calculates Most Consistent grade based on bucket mode per category.
 */
function calculateMostConsistent(studentId, classRecord, gradeMap, assessments) {
  const categories = classRecord.gradebookCategories
  if (!categories || categories.length === 0) return null

  const breakdown = {}
  let weightedSum = 0
  let totalWeight = 0

  for (const cat of categories) {
    const catAssessments = assessments.filter(a => 
      a.target === 'class' && 
      a.categoryId === cat.categoryId && 
      !a.excluded
    )

    const scores = []
    for (const a of catAssessments) {
      const g = gradeMap[a.assessmentId]
      if (!g || g.excluded || g.missing || !g.attempts || g.attempts.length === 0) continue
      
      const earned = resolveAttemptScore(g.attempts, a.retestPolicy)
      if (earned === null) continue
      
      scores.push({
        percentage: (earned / a.totalPoints) * 100,
        date: a.date
      })
    }

    let result = getBucketMode(scores)
    let percentage = result.result
    let isFallback = false
    let bucketLabel = result.bucketLabel
    let count = result.count

    if (percentage === null || scores.length < 3) {
      percentage = calculateMedian(scores.map(s => s.percentage))
      isFallback = true
      bucketLabel = null
      count = scores.length
    }

    if (percentage !== null) {
      breakdown[cat.categoryId] = { 
        percentage, 
        bucketLabel, 
        count, 
        totalCount: scores.length,
        isFallback 
      }
      weightedSum += percentage * (cat.weight / 100)
      totalWeight += cat.weight
    } else {
      breakdown[cat.categoryId] = null
    }
  }

  if (totalWeight === 0) return null

  return {
    percentage: (weightedSum / totalWeight) * 100,
    isFallback: Object.values(breakdown).some(b => b?.isFallback),
    categoryBreakdown: breakdown
  }
}

function calculateOverallMedian(studentId, gradeMap, assessments) {
  const scores = []
  for (const a of assessments) {
    if (a.target !== 'class' || a.excluded) continue
    const g = gradeMap[a.assessmentId]
    if (!g || g.excluded || g.missing || !g.attempts || g.attempts.length === 0) continue
    
    const earned = resolveAttemptScore(g.attempts, a.retestPolicy)
    if (earned === null) continue
    scores.push((earned / a.totalPoints) * 100)
  }
  return calculateMedian(scores)
}

/**
 * Calculates a student's weighted average for a class.
 * 
 * @param {string} studentId
 * @param {Object} classRecord
 * @param {Object} options { asOf: string ISO date }
 * @returns {Promise<Object>} Result object with overall grade and category breakdowns.
 */
export async function calculateStudentGrade(studentId, classRecord, { asOf = null } = {}) {
  const assessments = await getAssessmentsByClass(classRecord.classId)
  const grades = await getGradesByStudent(studentId, classRecord.classId)
  
  const gradeMap = {}
  for (const g of grades) gradeMap[g.assessmentId] = g

  const categories = classRecord.gradebookCategories
  if (!categories || categories.length === 0) return null

  const categoryResults = {}

  for (const category of categories) {
    // Filter assessments for this category
    let catAssessments = assessments.filter(a =>
      a.categoryId === category.categoryId &&
      !a.excluded &&
      (a.target === 'class' || (a.target === 'individual' && a.targetStudentId === studentId))
    )

    // Apply asOf date filter if provided
    if (asOf) {
      catAssessments = catAssessments.filter(a => a.date <= asOf)
    }

    if (catAssessments.length === 0) {
      categoryResults[category.categoryId] = null
      continue
    }

    let totalEarned = 0
    let totalPossible = 0

    for (const assessment of catAssessments) {
      const grade = gradeMap[assessment.assessmentId]
      
      // Skip if individual grade is excluded
      if (!grade || grade.excluded) continue
      
      if (grade.missing) {
        // Missing counts as 0 against the scaled total
        const possible = assessment.scaledTotal ?? assessment.totalPoints
        totalPossible += possible
        continue
      }
      
      if (!grade.attempts || grade.attempts.length === 0) continue // not entered yet

      const earned = resolveAttemptScore(grade.attempts, assessment.retestPolicy)
      if (earned === null) continue

      const possible = assessment.scaledTotal ?? assessment.totalPoints
      const scaledEarned = assessment.scaledTotal
        ? (earned / assessment.totalPoints) * assessment.scaledTotal
        : earned

      totalEarned += scaledEarned
      totalPossible += possible
    }

    if (totalPossible === 0) {
      categoryResults[category.categoryId] = null
      continue
    }

    // Check for manual category override on this student recorded in classRecord
    const override = classRecord.students[studentId]?.categoryOverrides?.[category.categoryId]
    
    if (override !== undefined && override !== null) {
      const percentage = Number(override.overridePercentage ?? override)
      if (isNaN(percentage)) {
        // Fall back to calculated grade if override data is corrupt/NaN
        categoryResults[category.categoryId] = {
          percentage: (totalEarned / totalPossible) * 100,
          isOverridden: false
        }
      } else {
        categoryResults[category.categoryId] = {
          percentage,
          isOverridden: true,
          overrideNote: override?.note
        }
      }
    } else {
      categoryResults[category.categoryId] = {
        percentage: (totalEarned / totalPossible) * 100,
        isOverridden: false
      }
    }
  }

  // Calculate weighted final grade
  let weightedSum = 0
  let weightUsed = 0

  for (const category of categories) {
    const result = categoryResults[category.categoryId]
    if (result === null) continue
    
    // category.weight is an integer (e.g. 70 for 70%)
    weightedSum += result.percentage * (category.weight / 100)
    weightUsed += category.weight
  }

  const overallGrade = weightUsed === 0 ? null : (weightedSum / weightUsed) * 100

  // New Metrics (Step 2)
  const mostConsistent = calculateMostConsistent(studentId, classRecord, gradeMap, assessments)
  const median = calculateOverallMedian(studentId, gradeMap, assessments)

  return {
    overallGrade: overallGrade !== null ? Math.round(overallGrade * 10) / 10 : null,
    mostConsistent,
    median: median !== null ? Math.round(median * 10) / 10 : null,
    categoryResults,
    weightUsed,
    asOf
  }
}

/**
 * Convenience function to calculate grades for all students in a class at once.
 */
export async function calculateClassGrades(classRecord, { asOf = null } = {}) {
  const results = {}
  for (const studentId of Object.keys(classRecord.students)) {
    results[studentId] = await calculateStudentGrade(studentId, classRecord, { asOf })
  }
  return results
}

/**
 * Calculates summary statistics for a single assessment.
 * 
 * @param {number} assessmentId
 * @param {Array<Object>} grades All grades for this class.
 * @param {Object} assessment The assessment metadata.
 * @returns {Object|null}
 */
export function calculateAssessmentStats(assessmentId, grades, assessment) {
  const scores = grades
    .filter(g => {
      if (g.assessmentId !== assessmentId || g.excluded || g.missing || g.attempts.length === 0) return false
      // Skip stats if it's an individual assessment
      if (assessment.target === 'individual') return false
      return true
    })
    .map(g => resolveAttemptScore(g.attempts, assessment.retestPolicy))
    .filter(s => s !== null)

  if (scores.length === 0) return null

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const sorted = [...scores].sort((a, b) => a - b)

  return {
    count: scores.length,
    average: Math.round(avg * 10) / 10,
    highest: Math.round(sorted[sorted.length - 1] * 10) / 10,
    lowest: Math.round(sorted[0] * 10) / 10,
    median: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10
  }
}

// ─── Template Management ─────────────────────────────────────────────────────

/**
 * Returns saved gradebook templates from global settings.
 */
export async function getGradebookTemplates() {
  const db = await getDB()
  const settings = await db.get('settings', 'singleton')
  return settings?.gradebookTemplates ?? []
}

/**
 * Saves a new template based on the categories/milestones of an existing class.
 */
export async function saveGradebookTemplate(name, classRecord) {
  const db = await getDB()
  const settings = await db.get('settings', 'singleton')
  
  const template = {
    templateId: crypto.randomUUID(),
    name,
    categories: classRecord.gradebookCategories.map(c => ({ ...c, categoryId: crypto.randomUUID() })),
    milestones: classRecord.gradebookMilestones.map(m => ({ ...m, milestoneId: crypto.randomUUID() }))
  }
  
  if (!settings.gradebookTemplates) settings.gradebookTemplates = []
  settings.gradebookTemplates.push(template)
  
  const plain = JSON.parse(JSON.stringify(settings))
  await db.put('settings', plain, 'singleton')
  hasUnsyncedChanges.value = true
  return template
}

/**
 * Removes a template from global settings.
 */
export async function deleteGradebookTemplate(templateId) {
  const db = await getDB()
  const settings = await db.get('settings', 'singleton')
  if (!settings.gradebookTemplates) return
  
  settings.gradebookTemplates = settings.gradebookTemplates.filter(t => t.templateId !== templateId)
  const plain = JSON.parse(JSON.stringify(settings))
  await db.put('settings', plain, 'singleton')
  hasUnsyncedChanges.value = true
}
