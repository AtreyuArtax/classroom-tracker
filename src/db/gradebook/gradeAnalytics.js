/**
 * src/db/gradebook/gradeAnalytics.js
 *
 * Analytics rollups, distribution calculations, template management, and database health audit tools.
 */

import { getDB } from '../index.js'
import { hasUnsyncedChanges } from '../eventService.js'
import { preciseRound } from '../../utils/math.js'
import { getSettings } from '../settingsService.js'
import { cleanExpectationText } from '../../utils/textUtils.js'
import {
  calculateStandardDeviation,
  detectOutliers,
  buildDistributionBuckets,
  buildLevelDistributionBuckets,
  resolveAttemptScore,
  getAssessmentPercentage,
  _calculateCategoryGrade,
  calculateMedian,
  isCohortMatch,
  calculateStudentGrade
} from './gradeCalc.js'
import { calculateSBARStudentOverallMastery } from './gradeCalcSBAR.js'

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
      Number(g.assessmentId) === Number(assessmentId) &&
      !g.excluded &&
      !excludedStudentIds.has(g.studentId)
    )
    .map(g => {
      const percentage = getAssessmentPercentage(assessment, g)
      if (percentage === null) return null
      return {
        studentId: g.studentId,
        percentage
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
    average: preciseRound((mean / 100) * (assessment.totalPoints || 1)),
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
 * @param {Object} options { exclusionMode: string, exclusionThreshold: number, evidenceScope: string, asOf: string | null }
 */
export async function calculateClassAnalytics(classRecord, assessments, grades, options = {}) {
  const settings = options.settings || await getSettings()
  const capAt100 = settings?.capGradesAt100 ?? true

  const { 
    exclusionMode = 'none', 
    exclusionThreshold = 40,
    evidenceScope = 'all',
    targetCourseCode = 'all',
    subCohortFilter = null,
    asOf = null,
    gradeBuckets = null
  } = options

  const filterKey = subCohortFilter || targetCourseCode || 'all'
  const isElem = classRecord.classType === 'elementary'
  const isSbar = classRecord.gradingFramework === 'sbar'

  const allStudentIds = Object.keys(classRecord.students ?? {})
  let studentIds = allStudentIds.filter(id => {
    const st = classRecord.students[id]
    return st && !st.archived && Boolean(st.firstName?.trim() || st.lastName?.trim())
  })

  if (filterKey && filterKey !== 'all') {
    studentIds = studentIds.filter(id => {
      const student = classRecord.students[id]
      const tag = isElem 
        ? (student?.accommodations?.modifiedSubjectGrades?.[classRecord.activeSubjectId] || student.gradeLevel)
        : student.courseCode
      return isCohortMatch(tag, filterKey)
    })
  }

  const excludedStudentIds = new Set(
    allStudentIds.filter(id => classRecord.students[id].excludeFromAnalytics || classRecord.students[id].archived)
  )

  // Filter class-target assessments matching sub-cohort & asOf
  let filteredAssessments = assessments.filter(a => a.target !== 'individual' && !a.excluded)

  if (filterKey && filterKey !== 'all') {
    const fLower = filterKey.toLowerCase()
    filteredAssessments = filteredAssessments.filter(a => {
      const tag = isElem ? (a.gradeLevel || a.targetCourseCode) : (a.targetCourseCode || a.gradeLevel)
      return !tag || tag === 'all' || tag.toLowerCase() === fLower
    })
  }

  if (asOf) {
    filteredAssessments = filteredAssessments.filter(a => a.date <= asOf)
  }

  // Build grade map for quick lookup
  const gradeMap = {}
  const studentGradesMap = new Map()
  const assessmentGradesMap = new Map()
  for (const g of grades) {
    if (!gradeMap[g.assessmentId]) gradeMap[g.assessmentId] = {}
    gradeMap[g.assessmentId][g.studentId] = g

    if (!studentGradesMap.has(g.studentId)) studentGradesMap.set(g.studentId, [])
    studentGradesMap.get(g.studentId).push(g)

    if (!assessmentGradesMap.has(g.assessmentId)) assessmentGradesMap.set(g.assessmentId, [])
    assessmentGradesMap.get(g.assessmentId).push(g)
  }

  // Calculate each student's overall grade according to evidenceScope & grading framework
  const studentGrades = []
  const studentCategoryGradesMap = new Map()

  if (isSbar) {
    const sbarAssessments = evidenceScope === 'product'
      ? filteredAssessments.filter(a => (a.assessmentType || 'product') === 'product')
      : filteredAssessments

    for (const studentId of studentIds) {
      if (excludedStudentIds.has(studentId)) continue
      const studentRecord = classRecord.students?.[studentId]
      const adjustedGrade = studentRecord?.adjustedGrade
      if (adjustedGrade !== undefined && adjustedGrade !== null) {
        studentGrades.push({
          studentId,
          percentage: preciseRound(Number(adjustedGrade), 0)
        })
      } else {
        const score = calculateSBARStudentOverallMastery(
          studentId,
          classRecord,
          sbarAssessments,
          gradeMap,
          classRecord.sbarAlgorithm
        )
        if (score !== null && score !== undefined) {
          studentGrades.push({
            studentId,
            percentage: preciseRound(score, 0)
          })
        }
      }
    }
  } else if (evidenceScope === 'all') {
    // Traditional Categories: Complete evidence calculation with full Gradebook Grid parity
    for (const studentId of studentIds) {
      if (excludedStudentIds.has(studentId)) continue
      const res = await calculateStudentGrade(studentId, classRecord, {
        asOf,
        assessmentsPreRef: assessments,
        gradesPreRef: studentGradesMap.get(studentId) || [],
        settingsPreRef: settings
      })
      if (res && res.overallGrade !== null && res.overallGrade !== undefined) {
        studentGrades.push({
          studentId,
          percentage: res.overallGrade
        })
        if (res.categoryResults) {
          studentCategoryGradesMap.set(studentId, res.categoryResults)
        }
      }
    }
  } else {
    // Traditional Categories: Product assessments only
    const productAssessments = filteredAssessments.filter(a => (a.assessmentType || 'product') === 'product')

    for (const studentId of studentIds) {
      if (excludedStudentIds.has(studentId)) continue

      const categoryResults = {}
      for (const cat of classRecord.gradebookCategories || []) {
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

      let weightedSum = 0
      let weightUsed = 0
      for (const cat of classRecord.gradebookCategories || []) {
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

  const cohortStudentIdSet = new Set(studentIds)
  const combinedExcludedStudentIds = new Set([
    ...allStudentIds.filter(id => !cohortStudentIdSet.has(id)),
    ...excludedStudentIds,
    ...(outlierStudentIds || [])
  ])

  for (const a of filteredAssessments) {
    const aGrades = assessmentGradesMap.get(a.assessmentId) || []
    const stats = calculateAssessmentAnalytics(
      a.assessmentId, aGrades, a,
      { 
        exclusionMode, 
        exclusionThreshold, 
        excludedStudentIds: combinedExcludedStudentIds,
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

  // Category Breakdowns
  const activeStudentIdSet = new Set(
    studentIds.filter(id => !excludedStudentIds.has(id) && !(outlierStudentIds || []).includes(id))
  )

  const categoryBreakdowns = (classRecord.gradebookCategories || []).map(cat => {
    let sum = 0
    let count = 0
    const catAssessments = filteredAssessments.filter(a => {
      if (a.categoryId !== cat.categoryId) return false
      if (evidenceScope === 'product') {
        return (a.assessmentType || 'product') === 'product'
      }
      return true
    })

    if (evidenceScope === 'all' && studentCategoryGradesMap.size > 0) {
      for (const sId of activeStudentIdSet) {
        const studentCats = studentCategoryGradesMap.get(sId)
        const catRes = studentCats?.[cat.categoryId]
        if (catRes && catRes.percentage !== null && !isNaN(catRes.percentage)) {
          sum += catRes.percentage
          count++
        }
      }
    } else {
      for (const sId of activeStudentIdSet) {
        const studentGradeMap = {}
        for (const a of catAssessments) {
          if (gradeMap[a.assessmentId]?.[sId]) {
            studentGradeMap[a.assessmentId] = gradeMap[a.assessmentId][sId]
          }
        }
        const catPercentage = _calculateCategoryGrade(catAssessments, studentGradeMap, capAt100)
        if (catPercentage !== null) {
          sum += catPercentage
          count++
        }
      }
    }

    return {
      categoryId: cat.categoryId,
      name: cat.name,
      weight: cat.weight || 0,
      average: count > 0 ? preciseRound(sum / count, 1) : null,
      studentCount: count,
      assessmentCount: catAssessments.length
    }
  })

  // Triangulation coverage
  // Count how many active students have at least one entered Conversation/Observation
  const activeTriangulationStudentSet = new Set(studentIds)
  const conversationStudents = new Set()
  const observationStudents = new Set()
  for (const a of assessments.filter(a => a.target !== 'individual' && !a.excluded)) {
    const aGrades = assessmentGradesMap.get(a.assessmentId) || []
    for (const g of aGrades) {
      if (activeTriangulationStudentSet.has(g.studentId) && g.attempts && g.attempts.length > 0) {
        if (a.assessmentType === 'conversation') conversationStudents.add(g.studentId)
        if (a.assessmentType === 'observation') observationStudents.add(g.studentId)
      }
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
    evidenceScope,
    // Class-level stats
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
    studentGrades,

    // Grouped assessment breakdowns
    productAnalytics,
    observationAnalytics,
    conversationAnalytics,
    assessmentBreakdowns,
    categoryBreakdowns,
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
    invalidCategories: [], // Assessments where categoryId isn't in its class
    unlinkedSBARAssessments: [] // SBAR assessments with 0 curriculum expectations attached
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
        name: ass.name,
        context: `Assessment "${ass.name}" missing class link`
      })
    } else if (cls) {
      let isSbar = false
      if (cls.classType === 'elementary') {
        if (ass.subjectId && cls.subjects) {
          const sub = cls.subjects.find(s => s.subjectId === ass.subjectId)
          isSbar = sub ? (sub.gradingFramework !== 'traditional') : (cls.gradingFramework !== 'traditional')
        } else {
          isSbar = (cls.gradingFramework !== 'traditional')
        }
      } else {
        isSbar = (cls.gradingFramework === 'sbar') || (ass.gradingFramework === 'sbar') || (ass.categoryId === 'sbar_general')
      }
      
      if (isSbar) {
        // In SBAR mode: Verify curriculum expectations are attached
        const expCodes = ass.expectationIds || (ass.expectationId ? [ass.expectationId] : [])
        if (!expCodes || expCodes.length === 0) {
          report.unlinkedSBARAssessments.push({
            id: ass.assessmentId,
            name: ass.name,
            class: cls.name,
            context: `SBAR assessment "${ass.name}" in ${cls.name} has no curriculum expectations attached`
          })
        }
      } else {
        // In Traditional mode: Check category validity
        const validCatIds = new Set(cls.gradebookCategories?.map(c => c.categoryId) || [])
        if (cls.subjects) {
          cls.subjects.forEach(s => {
            ;(s.gradebookCategories || []).forEach(c => validCatIds.add(c.categoryId))
          })
        }
        if (cls.courseFrameworks) {
          Object.values(cls.courseFrameworks).forEach(fw => {
            ;(fw.gradebookCategories || []).forEach(c => validCatIds.add(c.categoryId))
          })
        }

        // Standard categories
        validCatIds.add('cat_knowledge')
        validCatIds.add('cat_thinking')
        validCatIds.add('cat_communication')
        validCatIds.add('cat_application')
        validCatIds.add('cat_elem_knowledge')
        validCatIds.add('cat_elem_thinking')
        validCatIds.add('cat_elem_communication')
        validCatIds.add('cat_elem_application')

        if (ass.categoryId && !validCatIds.has(ass.categoryId) && !ass.categoryId.startsWith('sbar_')) {
          report.invalidCategories.push({
            id: ass.assessmentId,
            name: ass.name,
            class: cls.name,
            context: `Assessment "${ass.name}" in ${cls.name} has invalid category`
          })
        }
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
    if (!cls) continue

    let defaultCatId = cls.gradebookCategories?.[0]?.categoryId
    if (!defaultCatId && cls.subjects?.[0]?.gradebookCategories?.[0]?.categoryId) {
      defaultCatId = cls.subjects[0].gradebookCategories[0].categoryId
    }
    if (!defaultCatId) {
      defaultCatId = 'cat_knowledge'
    }

    ass.categoryId = defaultCatId
    await store.put(ass)
  }

  await tx.done
  hasUnsyncedChanges.value = true
}

/**
 * Permanently deletes specified assessment IDs and their grade records.
 */
export async function deleteAssessments(assessmentIds) {
  const db = await getDB()
  const tx = db.transaction(['assessments', 'grades'], 'readwrite')
  const aStore = tx.objectStore('assessments')
  const gStore = tx.objectStore('grades')
  const allGrades = await gStore.getAll()

  for (const assId of assessmentIds) {
    await aStore.delete(Number(assId))
    const matchingGrades = allGrades.filter(g => Number(g.assessmentId) === Number(assId))
    for (const g of matchingGrades) {
      await gStore.delete(g.gradeId)
    }
  }

  await tx.done
  hasUnsyncedChanges.value = true
}

/**
 * Sweeps all classes, subjects, units, and assessments in IndexedDB
 * to sanitize any residual HTML entities or non-breaking spaces in expectation codes/descriptions.
 */
export async function repairExpectationHtmlEntities() {
  const db = await getDB()
  const tx = db.transaction(['classes', 'assessments'], 'readwrite')
  const cStore = tx.objectStore('classes')
  const aStore = tx.objectStore('assessments')

  const [allClasses, allAssessments] = await Promise.all([
    cStore.getAll(),
    aStore.getAll()
  ])

  let repairedCount = 0

  for (const cls of allClasses) {
    let modified = false
    if (cls.gradebookUnits) {
      for (const u of cls.gradebookUnits) {
        if (u.name && (u.name.includes('&') || u.name.includes('\u00a0'))) {
          u.name = cleanExpectationText(u.name)
          modified = true
        }
        if (u.expectations) {
          for (const e of u.expectations) {
            if (e.code && (e.code.includes('&') || e.code.includes('\u00a0'))) {
              e.code = cleanExpectationText(e.code)
              modified = true
            }
            if (e.description && (e.description.includes('&') || e.description.includes('\u00a0'))) {
              e.description = cleanExpectationText(e.description)
              modified = true
            }
          }
        }
      }
    }
    if (cls.expectations) {
      for (const e of cls.expectations) {
        if (e.code && (e.code.includes('&') || e.code.includes('\u00a0'))) {
          e.code = cleanExpectationText(e.code)
          modified = true
        }
        if (e.description && (e.description.includes('&') || e.description.includes('\u00a0'))) {
          e.description = cleanExpectationText(e.description)
          modified = true
        }
      }
    }
    if (cls.subjects) {
      for (const sub of cls.subjects) {
        if (sub.gradebookUnits) {
          for (const u of sub.gradebookUnits) {
            if (u.name && (u.name.includes('&') || u.name.includes('\u00a0'))) {
              u.name = cleanExpectationText(u.name)
              modified = true
            }
            if (u.expectations) {
              for (const e of u.expectations) {
                if (e.code && (e.code.includes('&') || e.code.includes('\u00a0'))) {
                  e.code = cleanExpectationText(e.code)
                  modified = true
                }
                if (e.description && (e.description.includes('&') || e.description.includes('\u00a0'))) {
                  e.description = cleanExpectationText(e.description)
                  modified = true
                }
              }
            }
          }
        }
        if (sub.expectations) {
          for (const e of sub.expectations) {
            if (e.code && (e.code.includes('&') || e.code.includes('\u00a0'))) {
              e.code = cleanExpectationText(e.code)
              modified = true
            }
            if (e.description && (e.description.includes('&') || e.description.includes('\u00a0'))) {
              e.description = cleanExpectationText(e.description)
              modified = true
            }
          }
        }
      }
    }
    if (modified) {
      await cStore.put(cls)
      repairedCount++
    }
  }

  for (const ast of allAssessments) {
    let modified = false
    if (ast.expectations) {
      for (const e of ast.expectations) {
        if (typeof e === 'object' && e !== null) {
          if (e.code && (e.code.includes('&') || e.code.includes('\u00a0'))) {
            e.code = cleanExpectationText(e.code)
            modified = true
          }
          if (e.description && (e.description.includes('&') || e.description.includes('\u00a0'))) {
            e.description = cleanExpectationText(e.description)
            modified = true
          }
        }
      }
    }
    if (modified) {
      await aStore.put(ast)
      repairedCount++
    }
  }

  await tx.done
  if (repairedCount > 0) {
    hasUnsyncedChanges.value = true
  }
  return repairedCount
}
