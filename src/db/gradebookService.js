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
 * Retrieves a grade record within a transaction.
 * Usually called from within other transactional operations.
 */
async function _getGradeInTransaction(tx, assessmentId, studentId, classId) {
  const existing = await tx.objectStore('grades').index('by_assessmentAndStudent').get([assessmentId, studentId])
  if (existing) return existing

  const grade = {
    assessmentId,
    studentId,
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
 * Now requires classId for the index.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {string} classId
 * @returns {Promise<Object>}
 */
export async function getOrCreateGrade(assessmentId, studentId, classId) {
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
  
  // Validation: Catch typos where score exceeds total possible
  if (pointsEarned > assessment.totalPoints) {
    throw new Error(`Invalid score: ${pointsEarned} exceeds assessment total of ${assessment.totalPoints}`)
  }
  
  const attempt = {
    attemptId: crypto.randomUUID(),
    pointsEarned,
    date: date || new Date().toISOString(),
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
 * Updates the most recent attempt for a grade record.
 * If no attempts exist, it behaves like addAttempt.
 */
export async function updateLastAttempt(assessmentId, studentId, pointsEarned) {
  const db = await getDB()
  const assessment = await db.get('assessments', assessmentId)
  if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`)

  if (pointsEarned > assessment.totalPoints) {
    throw new Error(`Invalid score: ${pointsEarned} exceeds assessment total of ${assessment.totalPoints}`)
  }

  const tx = db.transaction('grades', 'readwrite')
  const store = tx.objectStore('grades')
  const grade = await _getGradeInTransaction(tx, assessmentId, studentId, assessment.classId)
  
  if (grade.attempts.length > 0) {
    const lastIdx = grade.attempts.length - 1
    grade.attempts[lastIdx].pointsEarned = pointsEarned
    grade.attempts[lastIdx].date = new Date().toISOString()
  } else {
    grade.attempts.push({
      attemptId: crypto.randomUUID(),
      pointsEarned,
      date: new Date().toISOString(),
      comment: ''
    })
  }
  
  const plain = JSON.parse(JSON.stringify(grade))
  await store.put(plain)
  await tx.done

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
/**
 * Removes a specific attempt from a grade record.
 * Transaction-guarded to prevent data loss.
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
 */
/**
 * Sets a specific attempt as the primary (counting) one.
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
 * Updates boolean flags on a grade record.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {Object} flags { missing: boolean, excluded: boolean }
 * @returns {Promise<Object>} The updated grade record.
 */
/**
 * Updates boolean flags on a grade record.
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
 * Returns all grades for all students in a class.
 * 
 * @param {string} classId
 * @returns {Promise<Array<Object>>}
 */
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

// ─── Statistical Utils (Step 2) ──────────────────────────────────────────────

/**
 * Calculates standard deviation for an array of numbers.
 * @param {Array<number>} values 
 * @returns {number|null}
 */
export function calculateStandardDeviation(values) {
  if (!values || values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  // Use Sample SD (n-1) for cohort samples
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
  return Math.sqrt(avgSquaredDiff)
}

/**
 * Detects outliers using standard deviation (default 1.5 SD below mean).
 * @param {Array<number>} values 
 * @param {number} threshold 
 * @returns {Object} { clean, outliers, cutoff, mean, sd }
 */
export function detectOutliers(values, threshold = 1.5) {
  if (!values || values.length < 3) return { clean: values, outliers: [] }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = calculateStandardDeviation(values)
  if (sd === null || sd === 0) return { clean: values, outliers: [] }
  const cutoff = mean - (threshold * sd)
  const clean = values.filter(v => v >= cutoff)
  const outliers = values.filter(v => v < cutoff)
  return { clean, outliers, cutoff, mean, sd }
}

/**
 * Groups percentages into 10% buckets.
 * @param {Array<number>} percentages 
 * @returns {Array<Object>}
 */
export function buildDistributionBuckets(percentages) {
  const buckets = Array(10).fill(0).map((_, i) => ({
    label: `${i * 10}-${i * 10 + 9}%`,
    range: [i * 10, i * 10 + 9],
    count: 0,
    scores: []
  }))
  // Handle 100% edge case — goes in the last bucket
  for (const p of percentages) {
    if (p === null || p === undefined || isNaN(p)) continue
    const idx = p >= 100 ? 9 : Math.floor(p / 10)
    const safeIdx = Math.max(0, Math.min(9, idx))
    buckets[safeIdx].count++
    buckets[safeIdx].scores.push(p)
  }
  return buckets
}

/**
 * Groups percentages into 'Growing Success' levels (Ontario Education).
 * R: 0-49, L1: 50-59, L2: 60-69, L3: 70-79, L4: 80-100
 * @param {Array<number>} percentages 
 * @returns {Array<Object>}
 */
export function buildLevelDistributionBuckets(percentages) {
  const buckets = [
    { label: 'R', range: [0, 49], count: 0, scores: [] },
    { label: 'L1', range: [50, 59], count: 0, scores: [] },
    { label: 'L2', range: [60, 69], count: 0, scores: [] },
    { label: 'L3', range: [70, 79], count: 0, scores: [] },
    { label: 'L4', range: [80, 100], count: 0, scores: [] }
  ]

  for (const p of percentages) {
    if (p === null || p === undefined || isNaN(p)) continue
    
    let idx = -1
    if (p < 50) idx = 0
    else if (p < 60) idx = 1
    else if (p < 70) idx = 2
    else if (p < 80) idx = 3
    else idx = 4

    buckets[idx].count++
    buckets[idx].scores.push(p)
  }
  return buckets
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
      // Deterministic tie-break: 
      // 1. Favor the bucket with the most recent entry
      // 2. If dates are identical, favor the higher grade bucket
      if (candidateNewest > currentNewest) {
        bestBucketIndex = i
      } else if (candidateNewest === currentNewest && i > bestBucketIndex) {
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
        percentage: (earned / (a.totalPoints || 1)) * 100,
        date: a.date
      })
    }

    let result = getBucketMode(scores)
    let percentage = result.result
    let isFallback = false
    let bucketLabel = result.bucketLabel
    let count = result.count

    if (percentage === null || scores.length < 2) {
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

function calculateWeightedMedian(studentId, classRecord, gradeMap, assessments) {
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
      
      scores.push((earned / (a.totalPoints || 1)) * 100)
    }

    if (scores.length > 0) {
      const median = calculateMedian(scores)
      breakdown[cat.categoryId] = { 
        percentage: median, 
        count: scores.length 
      }
      weightedSum += median * (cat.weight / 100)
      totalWeight += cat.weight
    }
  }

  if (totalWeight === 0) return null

  return {
    percentage: (weightedSum / totalWeight) * 100,
    categoryBreakdown: breakdown
  }
}

/**
 * Calculates a student's weighted average for a class.
 * 
 * @param {string} studentId
 * @param {Object} classRecord
 * @param {Object} options { asOf: string ISO date, assessmentsPreRef: Array, gradesPreRef: Array }
 * @returns {Promise<Object>} Result object with overall grade and category breakdowns.
 */
export async function calculateStudentGrade(studentId, classRecord, { asOf = null, assessmentsPreRef = null, gradesPreRef = null } = {}) {
  const assessments = assessmentsPreRef || await getAssessmentsByClass(classRecord.classId)
  const grades = gradesPreRef || await getGradesByStudent(studentId, classRecord.classId)
  
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
      // Guard against division by zero
      const divisor = assessment.totalPoints || 1
      const scaledEarned = assessment.scaledTotal
        ? (earned / divisor) * assessment.scaledTotal
        : earned

      totalEarned += scaledEarned
      totalPossible += possible
    }

    if (totalPossible === 0) {
      categoryResults[category.categoryId] = null
      continue
    }

    // Check for manual category override
    const override = classRecord.students[studentId]?.categoryOverrides?.[category.categoryId]
    
    if (override !== undefined && override !== null) {
      const percentage = Number(override.overridePercentage ?? override)
      if (isNaN(percentage)) {
        categoryResults[category.categoryId] = {
          percentage: (totalEarned / totalPossible) * 100,
          isOverridden: false
        }
      } else {
        categoryResults[category.categoryId] = {
          percentage,
          isOverridden: true
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
    
    weightedSum += result.percentage * (category.weight / 100)
    weightUsed += category.weight
  }

  const overallGrade = weightUsed === 0 ? null : (weightedSum / weightUsed) * 100

  // New Metrics
  const mostConsistent = calculateMostConsistent(studentId, classRecord, gradeMap, assessments)
  const median = calculateWeightedMedian(studentId, classRecord, gradeMap, assessments)

  return {
    overallGrade: overallGrade !== null ? Math.round(overallGrade * 10) / 10 : null,
    mostConsistent,
    median: median && median.percentage !== null ? Math.round(median.percentage * 10) / 10 : null,
    medianData: median,
    categoryResults,
    weightUsed,
    asOf
  }
}

/**
 * Convenience function to calculate grades for all students in a class.
 * NOW BATCHED: Loads data once for the whole class instead of per student.
 */
export async function calculateClassGrades(classRecord, { asOf = null } = {}) {
  // Batch fetch all data once
  const assessments = await getAssessmentsByClass(classRecord.classId)
  const allGrades = await getGradesByClass(classRecord.classId)

  const results = {}
  for (const studentId of Object.keys(classRecord.students)) {
    // Filter the batched data for this specific student
    const studentGrades = allGrades.filter(g => g.studentId === studentId)
    
    results[studentId] = await calculateStudentGrade(studentId, classRecord, { 
      asOf, 
      assessmentsPreRef: assessments, 
      gradesPreRef: studentGrades 
    })
  }
  return results
}

/**
 * Step 3: Rich analytics for a single assessment.
 * Replacing calculateAssessmentStats with a richer object.
 * 
 * @param {number} assessmentId
 * @param {Array<Object>} grades All grades for this class.
 * @param {Object} assessment The assessment metadata.
 * @param {Object} options { excludeOutliers: boolean, excludedStudentIds: Set<string> }
 * @returns {Object|null}
 */
export function calculateAssessmentAnalytics(assessmentId, grades, assessment, options = {}) {
  const { excludeOutliers = false, excludedStudentIds = new Set() } = options

  // Only run analytics on Product assessments (Step 17.1 Bug 3)
  const type = (assessment.assessmentType || 'product').toLowerCase()
  if (type !== 'product') return null
  
  // Skip individual assessments
  if (assessment.target === 'individual') return null

  // Collect all valid scores
  const allScores = grades
    .filter(g =>
      g.assessmentId === assessmentId &&
      !g.excluded &&
      !g.missing &&
      g.attempts &&
      g.attempts.length > 0 &&
      !excludedStudentIds.has(g.studentId)
    )
    .map(g => {
      const earned = resolveAttemptScore(g.attempts, assessment.retestPolicy)
      if (earned === null) return null
      return {
        studentId: g.studentId,
        percentage: (earned / (assessment.totalPoints || 1)) * 100
      }
    })
    .filter(s => s !== null)

  if (allScores.length === 0) return null

  const allPercentages = allScores.map(s => s.percentage)

  // Outlier detection
  const outlierResult = detectOutliers(allPercentages)
  const activePercentages = excludeOutliers ? outlierResult.clean : allPercentages
  
  // Bug 5: Safe outlier mapping by studentId
  const outlierStudentIds = []
  if (excludeOutliers && outlierResult.outliers.length > 0) {
    const outlierThreshold = outlierResult.cutoff
    allScores.forEach(s => {
      if (s.percentage < outlierThreshold) {
        outlierStudentIds.push(s.studentId)
      }
    })
  }

  if (activePercentages.length === 0) return null

  // Core stats on active (possibly filtered) set
  const mean = activePercentages.reduce((a, b) => a + b, 0) / activePercentages.length
  const sd = calculateStandardDeviation(activePercentages)
  const median = calculateMedian(activePercentages)
  const sorted = [...activePercentages].sort((a, b) => a - b)
  const highest = sorted[sorted.length - 1]
  const lowest = sorted[0]

  // Distribution buckets on full unfiltered set (always show full picture)
  const distributionBuckets = buildDistributionBuckets(allPercentages)

  return {
    assessmentId,
    count: activePercentages.length,
    totalCount: allPercentages.length,
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    sd: sd !== null ? Math.round(sd * 10) / 10 : null,
    highest: Math.round(highest * 10) / 10,
    lowest: Math.round(lowest * 10) / 10,
    distributionBuckets,
    levelBuckets: buildLevelDistributionBuckets(allPercentages),
    outlierCount: outlierResult.outliers.length,
    outlierStudentIds,
    excludeOutliersActive: excludeOutliers,
    // Calibration signal: low mean + high SD = poorly calibrated assessment
    calibrationFlag: mean < 60 && sd !== null && sd > 15 ? 'too_hard' :
                     mean > 90 && sd !== null && sd < 5 ? 'too_easy' : null
  }
}

/**
 * Step 4: Class-level analytics (rollup of overall grades and coverage).
 * 
 * @param {Object} classRecord
 * @param {Array<Object>} assessments
 * @param {Array<Object>} grades
 * @param {Object} options { excludeOutliers: boolean, asOf: string | null }
 */
export async function calculateClassAnalytics(classRecord, assessments, grades, options = {}) {
  const { excludeOutliers = false, asOf = null } = options

  const studentIds = Object.keys(classRecord.students ?? {})
  const excludedStudentIds = new Set(
    studentIds.filter(id => classRecord.students[id].excludeFromAnalytics)
  )

  // Filter to Product, class-target assessments only
  let productAssessments = assessments.filter(a =>
    a.assessmentType === 'product' &&
    a.target === 'class' &&
    !a.excluded
  )

  // Apply asOf date filter if milestone selected
  if (asOf) {
    productAssessments = productAssessments.filter(a => a.date <= asOf)
  }

  // Build grade map for quick lookup
  const gradeMap = {}
  for (const g of grades) {
    if (!gradeMap[g.assessmentId]) gradeMap[g.assessmentId] = {}
    gradeMap[g.assessmentId][g.studentId] = g
  }

  // Calculate each student's overall grade using Product assessments only
  const studentGrades = []
  for (const studentId of studentIds) {
    if (excludedStudentIds.has(studentId)) continue

    // Temporarily filter classRecord categories to only Product assessments
    let totalEarned = 0
    let totalPossible = 0
    const categoryResults = {}

    for (const cat of classRecord.gradebookCategories) {
      const catAssessments = productAssessments.filter(a => a.categoryId === cat.categoryId)
      let catEarned = 0
      let catPossible = 0

      for (const a of catAssessments) {
        const grade = gradeMap[a.assessmentId]?.[studentId]
        if (!grade || grade.excluded || grade.missing) {
          if (grade?.missing) catPossible += a.scaledTotal ?? a.totalPoints
          continue
        }
        if (!grade.attempts || grade.attempts.length === 0) continue

        const earned = resolveAttemptScore(grade.attempts, a.retestPolicy)
        if (earned === null) continue

        const possible = a.scaledTotal ?? a.totalPoints
        // Guard against division by zero
        const divisor = a.totalPoints || 1
        const scaledEarned = a.scaledTotal
          ? (earned / divisor) * a.scaledTotal
          : earned

        catEarned += scaledEarned
        catPossible += possible
      }

      if (catPossible > 0) {
        categoryResults[cat.categoryId] = (catEarned / catPossible) * 100
      }
    }

    // Weighted rollup
    let weightedSum = 0
    let weightUsed = 0
    for (const cat of classRecord.gradebookCategories) {
      const catGrade = categoryResults[cat.categoryId]
      if (catGrade === undefined) continue
      weightedSum += catGrade * (cat.weight / 100)
      weightUsed += cat.weight
    }

    if (weightUsed > 0) {
      studentGrades.push({
        studentId,
        percentage: (weightedSum / weightUsed) * 100
      })
    }
  }

  if (studentGrades.length === 0) return null

  const allPercentages = studentGrades.map(s => s.percentage)

  // Apply outlier exclusion if toggled
  const outlierResult = detectOutliers(allPercentages)
  const activePercentages = excludeOutliers ? outlierResult.clean : allPercentages
  
  const outlierStudentIds = []
  if (excludeOutliers && outlierResult.outliers.length > 0) {
    const outlierThreshold = outlierResult.cutoff
    studentGrades.forEach(s => {
      if (s.percentage < outlierThreshold) {
        outlierStudentIds.push(s.studentId)
      }
    })
  }

  const mean = activePercentages.reduce((a, b) => a + b, 0) / activePercentages.length
  const sd = calculateStandardDeviation(activePercentages)
  const median = calculateMedian(activePercentages)
  const distributionBuckets = buildDistributionBuckets(allPercentages)

  // Per-assessment analytics
  const assessmentAnalytics = {}
  for (const a of productAssessments) {
    const stats = calculateAssessmentAnalytics(
      a.assessmentId, grades, a,
      { excludeOutliers, excludedStudentIds }
    )
    if (stats) assessmentAnalytics[a.assessmentId] = stats
  }

  // Conversation and Observation coverage
  // Count how many students have at least one entered Conversation/Observation
  const conversationStudents = new Set()
  const observationStudents = new Set()
  for (const a of assessments.filter(a => a.target === 'class' && !a.excluded)) {
    const aGrades = grades.filter(g =>
      g.assessmentId === a.assessmentId &&
      g.attempts &&
      g.attempts.length > 0
    )
    for (const g of aGrades) {
      if (a.assessmentType === 'conversation') conversationStudents.add(g.studentId)
      if (a.assessmentType === 'observation') observationStudents.add(g.studentId)
    }
  }

  const totalStudents = studentIds.length
  const conversationCoverage = {
    studentsWithEvidence: conversationStudents.size,
    totalStudents,
    percentage: totalStudents > 0
      ? Math.round((conversationStudents.size / totalStudents) * 100)
      : 0
  }
  const observationCoverage = {
    studentsWithEvidence: observationStudents.size,
    totalStudents,
    percentage: totalStudents > 0
      ? Math.round((observationStudents.size / totalStudents) * 100)
      : 0
  }

  return {
    // Class-level stats (Product assessments only)
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    sd: sd !== null ? Math.round(sd * 10) / 10 : null,
    distributionBuckets,
    levelBuckets: buildLevelDistributionBuckets(allPercentages),
    studentCount: activePercentages.length,
    totalStudentCount: allPercentages.length,
    outlierCount: outlierResult.outliers.length,
    outlierStudentIds,
    excludeOutliersActive: excludeOutliers,

    // Per-assessment breakdown
    assessmentAnalytics,

    // Triangulation coverage
    conversationCoverage,
    observationCoverage,

    // Milestone context
    asOf
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
export async function saveGradebookTemplate(name, classRecord, milestones) {
  const db = await getDB()
  const settings = await db.get('settings', 'singleton')
  
  const template = {
    templateId: crypto.randomUUID(),
    name,
    categories: classRecord.gradebookCategories.map(c => ({ ...c, categoryId: crypto.randomUUID() })),
    milestones: milestones.map(m => ({ ...m, milestoneId: crypto.randomUUID() }))
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
