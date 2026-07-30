/**
 * src/db/gradebook/gradeCalc.js
 *
 * Core math algorithms, statistical functions, and grade calculations.
 */

import { preciseRound } from '../../utils/math.js'
import { getSettings } from '../settingsService.js'
import { getAssessmentsByClass } from './assessmentService.js'
import { getGradesByClass, getGradesByStudent } from './gradeService.js'
import { calculateSBARStudentOverallMastery } from './gradeCalcSBAR.js'

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

/**
 * Resolves which score counts for an assessment based on the retest policy.
 * 
 * @param {Array<Object>} attempts Array of attempt objects.
 * @param {string} retestPolicy 'highest' | 'latest' | 'average' | 'manual'
 * @returns {number|null}
 */
export function resolveAttemptScore(attempts, retestPolicy) {
  if (!attempts || attempts.length === 0) return null
  const getVal = a => (a.pointsEarned != null ? Number(a.pointsEarned) : (a.score != null ? Number(a.score) : (a.points != null ? Number(a.points) : null)))
  const validObjects = attempts.filter(a => getVal(a) !== null)
  if (validObjects.length === 0) return null
  const valid = validObjects.map(getVal)

  switch (retestPolicy) {
    case 'highest':
      return Math.max(...valid)
    case 'latest':
      return valid[valid.length - 1]
    case 'average':
      return valid.reduce((sum, v) => sum + v, 0) / valid.length
    case 'manual':
      const primaryAttempt = validObjects.find(a => a.isPrimary)
      const primaryVal = primaryAttempt ? getVal(primaryAttempt) : null
      return primaryVal !== null ? primaryVal : valid[valid.length - 1]
    default:
      return Math.max(...valid)
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
  
  let earned = null
  if (grade.attempts && grade.attempts.length > 0) {
    earned = resolveAttemptScore(grade.attempts, assessment?.retestPolicy)
  }
  if (earned === null && grade.resolvedScore !== null && grade.resolvedScore !== undefined) {
    earned = Number(grade.resolvedScore)
  }
  if (earned === null && grade.score !== null && grade.score !== undefined) {
    earned = Number(grade.score)
  }
  if (earned === null || isNaN(earned)) return null
  
  const divisor = assessment?.totalPoints || 1
  return (earned / divisor) * 100
}

export function _calculateCategoryGrade(catAssessments, gradeMap, capAt100 = false) {
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

    let earned = null
    if (grade.attempts && grade.attempts.length > 0) {
      earned = resolveAttemptScore(grade.attempts, assessment.retestPolicy)
    }
    if (earned === null && grade.resolvedScore !== null && grade.resolvedScore !== undefined) {
      earned = Number(grade.resolvedScore)
    }
    if (earned === null && grade.score !== null && grade.score !== undefined) {
      earned = Number(grade.score)
    }

    if (earned === null || isNaN(earned)) continue

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
export function getBucketMode(scores) {
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
export function calculateMedian(scores) {
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
export function calculateMostConsistent(studentId, classRecord, gradeMap, assessments, capAt100 = false) {
  const categories = classRecord.gradebookCategories
  if (!categories || categories.length === 0) return null

  const breakdown = {}
  let weightedSum = 0
  let totalWeight = 0

  for (const cat of categories) {
    const catAssessments = assessments.filter(a => 
      a.target !== 'individual' && 
      a.categoryId === cat.categoryId && 
      !a.excluded &&
      a.categoryId !== 'sbar_general' &&
      (!a.expectationIds || a.expectationIds.length === 0)
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

export function calculateWeightedMedian(studentId, classRecord, gradeMap, assessments, capAt100 = false) {
  const categories = classRecord.gradebookCategories
  if (!categories || categories.length === 0) return null

  const breakdown = {}
  let weightedSum = 0
  let totalWeight = 0

  for (const cat of categories) {
    const catAssessments = assessments.filter(a => 
      a.target !== 'individual' && 
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

  if (classRecord.gradingFramework === 'sbar') {
    const sbarMasteryPct = calculateSBARStudentOverallMastery(studentId, classRecord, assessments, gradeMap)
    return {
      overallGrade: sbarMasteryPct,
      displayOverallGrade: sbarMasteryPct,
      categoryResults: {},
      isAdjusted: false,
      mostConsistent: null,
      median: null,
      sbarMasteryPct
    }
  }

  const categories = classRecord.gradebookCategories
  if (!categories || categories.length === 0) return null

  const settings = await getSettings()
  const capAt100 = settings.capGradesAt100 ?? true

  const categoryResults = {}

  for (const category of categories) {
    // Filter assessments for this category
    let catAssessments = assessments.filter(a =>
      String(a.categoryId) === String(category.categoryId) &&
      !a.excluded &&
      a.categoryId !== 'sbar_general' &&
      (!a.expectationIds || a.expectationIds.length === 0) &&
      (a.target !== 'individual' || (a.target === 'individual' && String(a.targetStudentId) === String(studentId)))
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

  const overallGrade = weightUsed === 0 ? null : preciseRound((weightedSum / weightUsed) * 100, 0)

  // Check for manual overall grade override (adjusted grade)
  const studentRecord = classRecord.students?.[studentId]
  const adjustedGrade = studentRecord?.adjustedGrade
  const isAdjusted = adjustedGrade !== undefined && adjustedGrade !== null

  const displayOverallGrade = isAdjusted
    ? preciseRound(Number(adjustedGrade), 0)
    : (overallGrade !== null ? preciseRound(overallGrade, 0) : null)

  // New Metrics
  const mostConsistent = calculateMostConsistent(studentId, classRecord, gradeMap, assessments, capAt100)
  const median = calculateWeightedMedian(studentId, classRecord, gradeMap, assessments, capAt100)

  return {
    overallGrade: displayOverallGrade,
    calculatedOverallGrade: overallGrade !== null ? preciseRound(overallGrade, 0) : null,
    isGradeAdjusted: isAdjusted,
    adjustedGrade: isAdjusted ? preciseRound(Number(adjustedGrade), 0) : null,
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
