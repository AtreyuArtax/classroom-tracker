/**
 * src/db/gradebookService.js
 *
 * Public API for the `assessments` and `grades` object stores.
 * Handles the complete data layer for the Gradebook V4 feature.
 */

import { getDB } from './index.js'
import { hasUnsyncedChanges } from './eventService.js'
import { preciseRound } from '../utils/math.js'
import { getSettings } from './settingsService.js'

// ─── Assessment CRUD ─────────────────────────────────────────────────────────

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
    assessmentType, unitId,
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
 * Includes a "Hard Zero" rule for non-attending students in healthy classes.
 * @param {Array<number>} values 
 * @param {number} threshold 
 * @returns {Object} { clean, outliers, cutoff, mean, sd }
 */
export function detectOutliers(values, threshold = 1.5) {
  if (!values || values.length < 3) return { clean: values, outliers: [] }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = calculateStandardDeviation(values)
  if (sd === null || sd === 0) return { clean: values, outliers: [] }

  let cutoff = mean - (threshold * sd)

  // Hard Zero / Extreme Deviation Rule:
  // If the class mean is healthy (>50%), any student at 0% is statistically
  // likely to be a non-participator (outlier) unless >25% of the class also has 0%.
  const zeroCount = values.filter(v => v === 0).length
  const zeroRatio = zeroCount / values.length
  if (mean > 50 && zeroRatio < 0.25) {
    // Ensure cutoff is at least 1% to catch hard zeros/Missing entries
    if (cutoff < 1) cutoff = 1
  }

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
    label: i === 9 ? '90%+' : `${i * 10}-${i * 10 + 9}%`,
    range: [i * 10, i === 9 ? Infinity : i * 10 + 9],
    count: 0,
    scores: []
  }))

  for (const p of percentages) {
    if (p === null || p === undefined || isNaN(p)) continue
    const idx = Math.floor(p / 10)
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
export function buildLevelDistributionBuckets(percentages, customBuckets = null) {
  const buckets = (customBuckets && customBuckets.length > 0)
    ? customBuckets.map(b => ({ ...b, count: 0, scores: [], range: [b.min, b.max] }))
    : [
        { label: 'R', range: [0, 49], count: 0, scores: [] },
        { label: 'L1', range: [50, 59], count: 0, scores: [] },
        { label: 'L2', range: [60, 69], count: 0, scores: [] },
        { label: 'L3', range: [70, 79], count: 0, scores: [] },
        { label: 'L4', range: [80, 100], count: 0, scores: [] }
      ]

  for (const p of percentages) {
    if (p === null || p === undefined || isNaN(p)) continue
    
    // Find the matching bucket
    let bucket = buckets.find(b => p >= b.range[0] && p <= b.range[1])
    
    // If no matching bucket (e.g. score > 100) and it's a high score, add to the last bucket
    if (!bucket && p > buckets[buckets.length - 1].range[1]) {
      bucket = buckets[buckets.length - 1]
    }

    if (bucket) {
      bucket.count++
      bucket.scores.push(p)
    }
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
 * Calculates the percentage score for an assessment.
 * Centralizing this logic to ensure consistent reporting across grid and analytics.
 * 
 * @param {Object} assessment Assessment metadata
 * @param {Object} grade Grade record with attempts
 * @returns {number|null}
 */
export function getAssessmentPercentage(assessment, grade) {
  if (!grade || grade.excluded) return null
  if (grade.missing) return 0
  if (!grade.attempts || grade.attempts.length === 0) return null
  
  const earned = resolveAttemptScore(grade.attempts, assessment.retestPolicy)
  if (earned === null) return null
  
  const divisor = assessment.totalPoints || 1
  return (earned / divisor) * 100
}

/**
 * Calculates a single category grade from a set of assessments and a map of student grades.
 * Shared by calculateStudentGrade and calculateClassAnalytics to ensure consistency.
 * 
 * @param {Array<Object>} catAssessments 
 * @param {Object} gradeMap Map of grades keyed by assessmentId
 * @returns {number|null} The calculated percentage, or null if no data
 */
function _calculateCategoryGrade(catAssessments, gradeMap, capAt100 = false) {
  let totalEarned = 0
  let totalPossible = 0

  for (const assessment of catAssessments) {
    const grade = gradeMap[assessment.assessmentId]
    if (!grade || grade.excluded) continue

    const possible = assessment.scaledTotal ?? assessment.totalPoints

    if (grade.missing) {
      // Missing counts as 0 against the scaled total
      totalPossible += possible
      continue
    }

    if (!grade.attempts || grade.attempts.length === 0) continue

    const earned = resolveAttemptScore(grade.attempts, assessment.retestPolicy)
    if (earned === null) continue

    // Guard against division by zero
    const divisor = assessment.totalPoints || 1
    const scaledEarned = assessment.scaledTotal
      ? (earned / divisor) * assessment.scaledTotal
      : earned

    totalEarned += scaledEarned
    totalPossible += possible
  }

  if (totalPossible === 0) return null
  const result = (totalEarned / totalPossible) * 100
  return preciseRound(capAt100 ? Math.min(100, result) : result)
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
  const high = bestBucketIndex >= 9 ? '' : (low + 9)
  const label = bestBucketIndex >= 9 ? '90%+' : `${low}-${high}%`

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
function calculateMostConsistent(studentId, classRecord, gradeMap, assessments, capAt100 = false) {
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
      const percentage = getAssessmentPercentage(a, g)
      if (percentage === null) continue
      
      scores.push({
        percentage: percentage,
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
      const finalPerc = capAt100 ? Math.min(100, percentage) : percentage
      const rounded = preciseRound(finalPerc)
      breakdown[cat.categoryId] = { 
        percentage: rounded, 
        bucketLabel, 
        count, 
        totalCount: scores.length,
        isFallback 
      }
      weightedSum += rounded * (cat.weight / 100)
      totalWeight += cat.weight
    } else {
      breakdown[cat.categoryId] = null
    }
  }

  if (totalWeight === 0) return null

  const result = (weightedSum / totalWeight) * 100
  const finalPerc = capAt100 ? Math.min(100, result) : result

  return {
    percentage: preciseRound(finalPerc),
    isFallback: Object.values(breakdown).some(b => b?.isFallback),
    categoryBreakdown: breakdown
  }
}

function calculateWeightedMedian(studentId, classRecord, gradeMap, assessments, capAt100 = false) {
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
      const percentage = getAssessmentPercentage(a, g)
      if (percentage !== null) {
        scores.push(percentage)
      }
    }

    if (scores.length > 0) {
      const median = calculateMedian(scores)
      const rounded = preciseRound(median)
      breakdown[cat.categoryId] = { 
        percentage: rounded, 
        count: scores.length 
      }
      weightedSum += rounded * (cat.weight / 100)
      totalWeight += cat.weight
    }
  }

  if (totalWeight === 0) return null

  const result = (weightedSum / totalWeight) * 100
  const finalPerc = capAt100 ? Math.min(100, result) : result

  return {
    percentage: preciseRound(finalPerc),
    categoryBreakdown: breakdown
  }
}

export async function calculateStudentGrade(studentId, classRecord, { asOf = null, assessmentsPreRef = null, gradesPreRef = null } = {}) {
  const assessments = assessmentsPreRef || await getAssessmentsByClass(classRecord.classId)
  const grades = gradesPreRef || await getGradesByStudent(studentId, classRecord.classId)
  
  const gradeMap = {}
  for (const g of grades) gradeMap[g.assessmentId] = g

  const categories = classRecord.gradebookCategories
  if (!categories || categories.length === 0) return null

  const settings = await getSettings()
  const capAt100 = settings.capGradesAt100 ?? true

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

    const calculatedPercentage = _calculateCategoryGrade(catAssessments, gradeMap, capAt100)

    if (calculatedPercentage === null) {
      categoryResults[category.categoryId] = null
      continue
    }

    // Check for manual category override
    const override = classRecord.students[studentId]?.categoryOverrides?.[category.categoryId]
    const overrideValue = Number(override?.overridePercentage ?? override)
    
    if (override !== undefined && override !== null && !isNaN(overrideValue)) {
      categoryResults[category.categoryId] = {
        percentage: preciseRound(overrideValue),
        isOverridden: true
      }
    } else {
      categoryResults[category.categoryId] = {
        percentage: preciseRound(calculatedPercentage),
        isOverridden: false
      }
    }
  }

  // Calculate weighted final grade
  let weightedSum = 0
  let weightUsed = 0

  for (const category of categories) {
    const result = categoryResults[category.categoryId]
    if (!result) continue
    
    weightedSum += result.percentage * (category.weight / 100)
    weightUsed += category.weight
  }

  const overallGrade = weightUsed === 0 ? null : preciseRound((weightedSum / weightUsed) * 100)

  // New Metrics
  const mostConsistent = calculateMostConsistent(studentId, classRecord, gradeMap, assessments, capAt100)
  const median = calculateWeightedMedian(studentId, classRecord, gradeMap, assessments, capAt100)

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
  // 1. Batch fetch all data once
  const assessments = await getAssessmentsByClass(classRecord.classId)
  const allGrades = await getGradesByClass(classRecord.classId)

  // 2. Index grades by studentId for O(1) retrieval
  const studentGradeMap = new Map()
  for (const g of allGrades) {
    if (!studentGradeMap.has(g.studentId)) studentGradeMap.set(g.studentId, [])
    studentGradeMap.get(g.studentId).push(g)
  }

  const results = {}
  for (const studentId of Object.keys(classRecord.students)) {
    const studentGrades = studentGradeMap.get(studentId) || []
    
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
 * @param {Object} options { exclusionMode: string, exclusionThreshold: number, excludedStudentIds: Set<string> }
 * @returns {Object|null}
 */
export function calculateAssessmentAnalytics(assessmentId, grades, assessment, options = {}) {
  const { 
    exclusionMode = 'none', 
    exclusionThreshold = 40, 
    excludedStudentIds = new Set(),
    gradeBuckets = null
  } = options

  // Skip individual assessments as they don't have "class averages"
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

  // Filtering logic
  const exclusionResults = getExclusionResults(allScores, exclusionMode, exclusionThreshold)
  const activePercentages = exclusionResults.activePercentages
  const outlierStudentIds = exclusionResults.excludedIds
  
  if (activePercentages.length === 0) return null

  // Core stats on active (possibly filtered) set
  const mean = activePercentages.reduce((a, b) => a + b, 0) / activePercentages.length
  const sd = calculateStandardDeviation(activePercentages)
  const median = calculateMedian(activePercentages)
  const sorted = [...activePercentages].sort((a, b) => a - b)
  const highest = sorted[sorted.length - 1]
  const lowest = sorted[0]

  // Distribution buckets on filtered set
  const distributionBuckets = buildDistributionBuckets(activePercentages)

  return {
    assessmentId,
    count: activePercentages.length,
    totalCount: allPercentages.length,
    mean: preciseRound(mean),
    average: (mean / 100) * (assessment.totalPoints || 1),
    median: preciseRound(median),
    sd: preciseRound(sd),
    highest: preciseRound(highest),
    lowest: preciseRound(lowest),
    distributionBuckets,
    levelBuckets: buildLevelDistributionBuckets(activePercentages, gradeBuckets),
    outlierCount: outlierStudentIds.length,
    outlierStudentIds,
    excludeOutliersActive: exclusionMode !== 'none',
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
 * @param {Object} options { exclusionMode: string, exclusionThreshold: number, asOf: string | null }
 */
export async function calculateClassAnalytics(classRecord, assessments, grades, options = {}) {
  const settings = await getSettings()
  const capAt100 = settings.capGradesAt100 ?? true

  const { 
    exclusionMode = 'none', 
    exclusionThreshold = 40,
    asOf = null,
    gradeBuckets = null
  } = options

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
      
      const studentGradeMap = {}
      for (const a of catAssessments) {
        if (gradeMap[a.assessmentId]?.[studentId]) {
          studentGradeMap[a.assessmentId] = gradeMap[a.assessmentId][studentId]
        }
      }
      
      const catPercentage = _calculateCategoryGrade(catAssessments, studentGradeMap, capAt100)
      if (catPercentage !== null) {
        categoryResults[cat.categoryId] = catPercentage
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

  // Apply filtering
  const exclusionResults = getExclusionResults(studentGrades, exclusionMode, exclusionThreshold)
  const activePercentages = exclusionResults.activePercentages
  const outlierStudentIds = exclusionResults.excludedIds

  const mean = activePercentages.reduce((a, b) => a + b, 0) / activePercentages.length
  const sd = calculateStandardDeviation(activePercentages)
  const median = calculateMedian(activePercentages)
  const distributionBuckets = buildDistributionBuckets(activePercentages)
  const levelBuckets = buildLevelDistributionBuckets(activePercentages, gradeBuckets)

    // Per-assessment analytics (Grouped by type)
    const productAnalytics = {}
    const observationAnalytics = {}
    const conversationAnalytics = {}

    for (const a of assessments.filter(a => a.target === 'class' && !a.excluded)) {
        const stats = calculateAssessmentAnalytics(
            a.assessmentId, grades, a,
            { 
              exclusionMode, 
              exclusionThreshold, 
              excludedStudentIds,
              gradeBuckets
            }
        )
        if (stats) {
            if (a.assessmentType === 'observation') observationAnalytics[a.assessmentId] = stats
            else if (a.assessmentType === 'conversation') conversationAnalytics[a.assessmentId] = stats
            else productAnalytics[a.assessmentId] = stats // Default/Product
        }
    }

    // Triangulation coverage
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
        levelBuckets,
        studentCount: activePercentages.length,
        totalStudentCount: allPercentages.length,
        outlierCount: outlierStudentIds.length,
        outlierStudentIds,
        excludeOutliersActive: exclusionMode !== 'none',

        // Grouped assessment breakdowns
        productAnalytics,
        observationAnalytics,
        conversationAnalytics,

        // Triangulation coverage
        conversationCoverage,
        observationCoverage,

        // Milestone context
        asOf
    }
}

/**
 * Helper to get active percentages and excluded student IDs based on mode.
 * Internal to this file.
 */
function getExclusionResults(studentGrades, mode, threshold) {
  const allPercentages = studentGrades.map(s => s.percentage)
  
  if (!mode || mode === 'none') {
    return { activePercentages: allPercentages, excludedIds: [] }
  }

  if (mode === 'fixed') {
    const clean = allPercentages.filter(p => p >= threshold)
    const hiddenIds = studentGrades
      .filter(s => s.percentage < threshold)
      .map(s => s.studentId)
    return { activePercentages: clean, excludedIds: hiddenIds }
  }

  if (mode === 'auto') {
    const res = detectOutliers(allPercentages)
    const hiddenIds = studentGrades
      .filter(s => s.percentage < res.cutoff)
      .map(s => s.studentId)
    return { activePercentages: res.clean, excludedIds: hiddenIds }
  }

  return { activePercentages: allPercentages, excludedIds: [] }
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

// ─── Data Integrity & Audit ──────────────────────────────────────────────────

/**
 * Scans the database for orphaned or inconsistent gradebook records.
 * Returns a report of any issues found. (Read-only)
 */
export async function auditGradebookData() {
  const db = await getDB()
  
  const [allGrades, allAssessments, allClasses] = await Promise.all([
    db.getAll('grades'),
    db.getAll('assessments'),
    db.getAll('classes')
  ])

  const assessmentIds = new Set(allAssessments.map(a => a.assessmentId))
  const classIds = new Set(allClasses.map(c => c.classId))
  
  const report = {
    orphanedGrades: [], // Grade records where assessmentId is missing
    missingClassIds: [], // Records (Grade or Assessment) where classId is null
    invalidCategories: [] // Assessments where categoryId isn't in its class
  }

  // 1. Audit Grades
  for (const grade of allGrades) {
    const ass = allAssessments.find(a => a.assessmentId === grade.assessmentId)
    const cls = allClasses.find(c => c.classId === (grade.classId || (ass && ass.classId)))
    const student = cls && cls.students && cls.students[grade.studentId]
      ? cls.students[grade.studentId]
      : null
    
    const studentName = student ? `${student.firstName} ${student.lastName}` : `Student ID: ${grade.studentId}`
    const assName = ass ? ass.name : `Assessment ID: ${grade.assessmentId}`

    if (!assessmentIds.has(grade.assessmentId)) {
      report.orphanedGrades.push({
        id: grade.gradeId,
        studentId: grade.studentId,
        assessmentId: grade.assessmentId,
        context: `${studentName} - ${assName}`
      })
    }
    if (!grade.classId || !classIds.has(grade.classId)) {
      report.missingClassIds.push({
        type: 'grade',
        id: grade.gradeId,
        context: `${studentName} mark in "${assName}"`
      })
    }
  }

  // 2. Audit Assessments
  for (const ass of allAssessments) {
    const cls = allClasses.find(c => c.classId === ass.classId)
    if (!ass.classId || !classIds.has(ass.classId)) {
      report.missingClassIds.push({
        type: 'assessment',
        id: ass.assessmentId,
        context: `Assessment "${ass.name}" missing class link`
      })
    } else if (cls) {
      // Check category validity
      const catIds = new Set(cls.gradebookCategories?.map(c => c.categoryId) || [])
      if (!catIds.has(ass.categoryId)) {
        report.invalidCategories.push({
          id: ass.assessmentId,
          name: ass.name,
          class: cls.name,
          context: `Assessment "${ass.name}" in ${cls.name} has invalid category`
        })
      }
    }
  }

  return report
}

/**
 * Deletes orphaned grade records from the database.
 */
export async function repairGradebookOrphans(gradeIds) {
  const db = await getDB()
  const tx = db.transaction('grades', 'readwrite')
  const store = tx.objectStore('grades')
  for (const id of gradeIds) {
    await store.delete(id)
  }
  await tx.done
  hasUnsyncedChanges.value = true
}

/**
 * Attempts to heal records missing Class IDs by cross-referencing.
 */
export async function repairMissingClassIds() {
  const db = await getDB()
  const [allGrades, allAssessments] = await Promise.all([
    db.getAll('grades'),
    db.getAll('assessments')
  ])

  const txGrades = db.transaction('grades', 'readwrite')

  // 1. Heal Grades using Assessment's classId
  for (const grade of allGrades) {
    if (!grade.classId) {
      const ass = allAssessments.find(a => a.assessmentId === grade.assessmentId)
      if (ass && ass.classId) {
        grade.classId = ass.classId
        await txGrades.objectStore('grades').put(grade)
      }
    }
  }

  await txGrades.done
  hasUnsyncedChanges.value = true
}

/**
 * Heals assessments with invalid or missing category IDs.
 * Re-assigns them to the first available category in the class.
 */
export async function repairInvalidCategories(assessmentIds) {
  const db = await getDB()
  const [allAssessments, allClasses] = await Promise.all([
    db.getAll('assessments'),
    db.getAll('classes')
  ])

  const tx = db.transaction('assessments', 'readwrite')
  const store = tx.objectStore('assessments')

  for (const assId of assessmentIds) {
    const ass = allAssessments.find(a => a.assessmentId === assId)
    if (!ass) continue

    const cls = allClasses.find(c => c.classId === ass.classId)
    if (!cls || !cls.gradebookCategories || cls.gradebookCategories.length === 0) continue

    // Re-assign to the first category in the class
    ass.categoryId = cls.gradebookCategories[0].categoryId
    await store.put(ass)
  }

  await tx.done
  hasUnsyncedChanges.value = true
}
