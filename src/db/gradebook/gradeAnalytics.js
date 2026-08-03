/**
 * src/db/gradebook/gradeAnalytics.js
 *
 * Analytics rollups, distribution calculations, template management, and database health audit tools.
 */

import { getDB } from '../index.js'
import { hasUnsyncedChanges } from '../eventService.js'
import { preciseRound } from '../../utils/math.js'
import { getSettings } from '../settingsService.js'
import {
  calculateStandardDeviation,
  detectOutliers,
  buildDistributionBuckets,
  buildLevelDistributionBuckets,
  resolveAttemptScore,
  _calculateCategoryGrade,
  calculateMedian
} from './gradeCalc.js'

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
    targetCourseCode = 'all',
    subCohortFilter = null,
    asOf = null,
    gradeBuckets = null
  } = options

  const filterKey = subCohortFilter || targetCourseCode || 'all'
  const isElem = classRecord.classType === 'elementary'

  const allStudentIds = Object.keys(classRecord.students ?? {})
  let studentIds = allStudentIds.filter(id => !classRecord.students[id].archived)

  if (filterKey && filterKey !== 'all') {
    const fLower = filterKey.toLowerCase()
    studentIds = studentIds.filter(id => {
      const student = classRecord.students[id]
      const tag = isElem ? student.gradeLevel : student.courseCode
      return tag && tag.toLowerCase() === fLower
    })
  }

  const excludedStudentIds = new Set(
    allStudentIds.filter(id => classRecord.students[id].excludeFromAnalytics || classRecord.students[id].archived)
  )

  // Filter to Product, class-target assessments only
  let productAssessments = assessments.filter(a =>
    a.assessmentType === 'product' &&
    a.target !== 'individual' &&
    !a.excluded
  )

  if (filterKey && filterKey !== 'all') {
    const fLower = filterKey.toLowerCase()
    productAssessments = productAssessments.filter(a => {
      const tag = isElem ? (a.gradeLevel || a.targetCourseCode) : (a.targetCourseCode || a.gradeLevel)
      return !tag || tag === 'all' || tag.toLowerCase() === fLower
    })
  }

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
  const assessmentBreakdowns = []

  for (const a of assessments.filter(a => a.target !== 'individual' && !a.excluded)) {
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
      const catName = classRecord.gradebookCategories?.find(c => c.categoryId === a.categoryId)?.name ?? ''
      assessmentBreakdowns.push({
        ...a,
        category: catName,
        stats
      })

      if (a.assessmentType === 'observation') observationAnalytics[a.assessmentId] = stats
      else if (a.assessmentType === 'conversation') conversationAnalytics[a.assessmentId] = stats
      else productAnalytics[a.assessmentId] = stats // Default/Product
    }
  }

  // Triangulation coverage
  // Count how many active students have at least one entered Conversation/Observation
  const activeStudentIdSet = new Set(studentIds)
  const conversationStudents = new Set()
  const observationStudents = new Set()
  for (const a of assessments.filter(a => a.target !== 'individual' && !a.excluded)) {
    const aGrades = grades.filter(g =>
      g.assessmentId === a.assessmentId &&
      activeStudentIdSet.has(g.studentId) &&
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
      ? Math.min(100, Math.round((conversationStudents.size / totalStudents) * 100))
      : 0
  }
  const observationCoverage = {
    studentsWithEvidence: observationStudents.size,
    totalStudents,
    percentage: totalStudents > 0
      ? Math.min(100, Math.round((observationStudents.size / totalStudents) * 100))
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
    assessmentBreakdowns,
    productCount: Object.keys(productAnalytics).length,
    observationCount: Object.keys(observationAnalytics).length,
    conversationCount: Object.keys(conversationAnalytics).length,
    totalAssessmentsCount: assessments.filter(a => a.target !== 'individual' && !a.excluded).length,

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
export function getExclusionResults(studentGrades, mode, threshold) {
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
    milestones: milestones.map(m => ({ ...m, milestoneId: crypto.randomUUID() })),
    gradebookUnits: (classRecord.gradebookUnits || []).map(u => ({
      ...u,
      unitId: crypto.randomUUID(),
      expectations: (u.expectations || []).map(e => ({
        ...e,
        expectationId: crypto.randomUUID()
      }))
    }))
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
    const ass = allAssessments.find(a => Number(a.assessmentId) === Number(grade.assessmentId))
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
      const ass = allAssessments.find(a => Number(a.assessmentId) === Number(grade.assessmentId))
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
    const ass = allAssessments.find(a => Number(a.assessmentId) === Number(assId))
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
