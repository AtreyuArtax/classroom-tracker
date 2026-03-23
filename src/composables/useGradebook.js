/**
 * src/composables/useGradebook.js
 *
 * Reactive bridge for the Gradebook V4 feature.
 */

import { ref, computed } from 'vue'
import * as gradebookService from '../db/gradebookService.js'
import * as classService from '../db/classService.js'

// ─── Reactive State ──────────────────────────────────────────────────────────

export const activeClassRecord = ref(null)
export const assessments = ref([])
export const grades = ref([])
export const classGrades = ref({})
export const selectedStudentId = ref(null)
export const selectedMilestone = ref(null) // null = current

// Reactive state for analytics (Step 6)
export const analyticsMode = ref(false) // false = grid, true = analytics panel
export const excludeOutliers = ref(false) // analytics-only display toggle, not persisted
export const distributionMode = ref('buckets') // 'buckets' (10%) or 'levels' (Ontario GS)
export const classAnalytics = ref(null) // result of calculateClassAnalytics

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Loads all gradebook data for a class and initializes reactive state.
 * 
 * @param {Object} classRecord
 */
export async function loadGradebook(classRecord) {
  activeClassRecord.value = classRecord
  // Reset selection
  selectedStudentId.value = null
  selectedMilestone.value = null
  
  // Load data from DB
  assessments.value = await gradebookService.getAssessmentsByClass(classRecord.classId)
  grades.value = await gradebookService.getGradesByClass(classRecord.classId)
  
  // Compute student grades
  await refreshGrades()
}

/**
 * Recalculates all student grades based on active class and current data.
 */
export async function refreshGrades() {
  if (!activeClassRecord.value) return
  
  // Find date boundary if a milestone is selected
  const asOf = selectedMilestone.value
    ? activeClassRecord.value.gradebookMilestones?.find(m => m.milestoneId === selectedMilestone.value)?.date
    : null
    
    
  classGrades.value = await gradebookService.calculateClassGrades(activeClassRecord.value, { asOf })

  // Refresh analytics if in analytics mode
  if (analyticsMode.value) {
    await refreshClassAnalytics()
  }
}

/**
 * Step 6: Compute class analytics.
 */
export async function refreshClassAnalytics() {
  if (!activeClassRecord.value) return
  const asOf = selectedMilestone.value
    ? activeClassRecord.value.gradebookMilestones
        ?.find(m => m.milestoneId === selectedMilestone.value)?.date
    : null

  classAnalytics.value = await gradebookService.calculateClassAnalytics(
    activeClassRecord.value,
    assessments.value,
    grades.value,
    { excludeOutliers: excludeOutliers.value, asOf }
  )
}

/**
 * Toggle outlier exclusion — recomputes analytics immediately.
 */
export async function toggleOutlierExclusion() {
  excludeOutliers.value = !excludeOutliers.value
  await refreshClassAnalytics()
}

/**
 * Toggle a student's analytics exclusion — persists to IDB.
 */
export async function toggleStudentFromAnalytics(studentId) {
  if (!activeClassRecord.value) return
  await classService.toggleStudentAnalyticsExclusion(activeClassRecord.value.classId, studentId)
  // Reload class record to pick up the change
  const updated = await classService.getClass(activeClassRecord.value.classId)
  activeClassRecord.value = updated
  await refreshClassAnalytics()
}

/**
 * Reset analytics state when leaving the analytics panel.
 */
export function resetAnalyticsState() {
  excludeOutliers.value = false
  distributionMode.value = 'buckets'
  classAnalytics.value = null
  analyticsMode.value = false
}

/**
 * Adds a new assessment and updates local state.
 * 
 * @param {Object} assessmentData
 */
export async function addAssessment(assessmentData) {
  if (!activeClassRecord.value) return
  
  const assessment = await gradebookService.createAssessment({
    classId: activeClassRecord.value.classId,
    ...assessmentData
  })
  
  assessments.value.push(assessment)
  return assessment
}

/**
 * Updates an assessment and refreshes grades.
 */
export async function editAssessment(assessmentId, updates) {
  const updated = await gradebookService.updateAssessment(assessmentId, updates)
  
  // Update local ref
  const index = assessments.value.findIndex(a => a.assessmentId === assessmentId)
  if (index !== -1) {
    assessments.value[index] = updated
  }
  
  await refreshGrades()
  return updated
}

/**
 * Deletes an assessment and refreshes state.
 */
export async function deleteAssessment(assessmentId) {
  await gradebookService.deleteAssessment(assessmentId)
  
  // Update local ref
  assessments.value = assessments.value.filter(a => a.assessmentId !== assessmentId)
  
  // Refresh grades as they are now orphaned/removed
  await refreshGrades()
}

// ─── Debounced Async DB Save System ──────────────────────────────────────────
const dbSaveQueue = new Map()
let dbSaveTimer = null

function enqueueDBSave(key, saveFn) {
  dbSaveQueue.set(key, saveFn)
  if (dbSaveTimer) clearTimeout(dbSaveTimer)
  dbSaveTimer = setTimeout(async () => {
    const tasks = Array.from(dbSaveQueue.values())
    dbSaveQueue.clear()
    for (const task of tasks) {
      try {
        await task()
      } catch (err) {
        console.error('[useGradebook] Background DB save failed:', err)
      }
    }
    // Optional: silently refresh background state after a batch saves to solidify tracking IDs
    if (activeClassRecord.value) {
      grades.value = await gradebookService.getGradesByClass(activeClassRecord.value.classId)
      if (analyticsMode.value) refreshClassAnalytics() // Keep analytics in sync if it was open
    }
  }, 500)
}

/**
 * Recalculates grade for a SINGLE student instantly and updates classGrades.
 */
async function refreshSingleStudent(studentId) {
  if (!activeClassRecord.value) return
  
  const asOf = selectedMilestone.value
    ? activeClassRecord.value.gradebookMilestones?.find(m => m.milestoneId === selectedMilestone.value)?.date
    : null
    
  // Pass grades and assessments by reference so gradebookService doesn't query DB
  const studentGrades = grades.value.filter(g => g.studentId === studentId)
  const result = await gradebookService.calculateStudentGrade(studentId, activeClassRecord.value, {
    asOf,
    assessmentsPreRef: assessments.value,
    gradesPreRef: studentGrades
  })
  
  // Immutably update the reactive object so Vue detects the change
  classGrades.value = {
    ...classGrades.value,
    [studentId]: result
  }
}

/**
 * Records a grade (points earned) for a student and refreshes state.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {number} pointsEarned
 * @param {string} comment
 */
export function enterGrade(assessmentId, studentId, pointsEarned, date = null, comment = '') {
  if (!activeClassRecord.value) return
  
  const assessment = assessments.value.find(a => a.assessmentId === assessmentId)
  if (assessment && pointsEarned > assessment.totalPoints) {
    console.warn(`[useGradebook] enterGrade: ${pointsEarned} exceeds assessment max ${assessment.totalPoints}`)
    return
  }
  
  let grade = grades.value.find(g => g.assessmentId === assessmentId && g.studentId === studentId)
  if (!grade) {
    grade = {
      assessmentId, studentId, classId: activeClassRecord.value.classId,
      missing: false, excluded: false, attempts: []
    }
    grades.value.push(grade)
  }
  
  grade.attempts.push({
    attemptId: crypto.randomUUID(),
    pointsEarned,
    date: date || new Date().toISOString(),
    comment,
    isPrimary: grade.attempts.length === 0
  })

  // 1. Refresh UI instantly for this student
  refreshSingleStudent(studentId)
  
  // 2. Debounce IDB save
  enqueueDBSave(`${assessmentId}_${studentId}_enter`, () => 
    gradebookService.addAttempt(assessmentId, studentId, { pointsEarned, date, comment })
  )
}

/**
 * Changes/overwrites the latest grade attempt.
 */
export function changeGrade(assessmentId, studentId, pointsEarned) {
  if (!activeClassRecord.value) return
  
  const grade = grades.value.find(g => g.assessmentId === assessmentId && g.studentId === studentId)
  if (grade && grade.attempts.length > 0) {
    grade.attempts[grade.attempts.length - 1].pointsEarned = pointsEarned
  }
  
  refreshSingleStudent(studentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_change`, () => 
    gradebookService.updateLastAttempt(assessmentId, studentId, pointsEarned)
  )
}

/**
 * Removes an attempt and refreshes state.
 */
export function removeAttempt(assessmentId, studentId, attemptId) {
  if (!activeClassRecord.value) return
  
  const grade = grades.value.find(g => g.assessmentId === assessmentId && g.studentId === studentId)
  if (grade) {
    grade.attempts = grade.attempts.filter(a => a.attemptId !== attemptId)
  }
  
  refreshSingleStudent(studentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_rem_${attemptId}`, () => 
    gradebookService.deleteAttempt(assessmentId, studentId, attemptId)
  )
}

/**
 * Sets a specific attempt as primary and refreshes state.
 */
export function setPrimaryAttempt(assessmentId, studentId, attemptId) {
  if (!activeClassRecord.value) return
  
  const grade = grades.value.find(g => g.assessmentId === assessmentId && g.studentId === studentId)
  if (grade) {
    grade.attempts.forEach(a => a.isPrimary = (a.attemptId === attemptId))
  }
  
  refreshSingleStudent(studentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_prim`, () => 
    gradebookService.setPrimaryAttempt(assessmentId, studentId, attemptId)
  )
}

/**
 * Clears all attempts and removes the grade record for a student on an assessment.
 */
export function clearGrade(assessmentId, studentId) {
  if (!activeClassRecord.value) return
  
  grades.value = grades.value.filter(g => !(g.assessmentId === assessmentId && g.studentId === studentId))
  
  refreshSingleStudent(studentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_clear`, () => 
    gradebookService.deleteGrade(assessmentId, studentId)
  )
}

/**
 * Toggles the 'missing' flag for a student's grade.
 */
export function markMissing(assessmentId, studentId, missing) {
  if (!activeClassRecord.value) return
  
  let grade = grades.value.find(g => g.assessmentId === assessmentId && g.studentId === studentId)
  if (!grade) {
    grade = { assessmentId, studentId, classId: activeClassRecord.value.classId, attempts: [] }
    grades.value.push(grade)
  }
  grade.missing = missing
  
  refreshSingleStudent(studentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_miss`, () => 
    gradebookService.updateGradeFlags(assessmentId, studentId, { missing })
  )
}

/**
 * Toggles the 'excluded' flag for a student's grade.
 */
export function markExcluded(assessmentId, studentId, excluded) {
  if (!activeClassRecord.value) return
  
  let grade = grades.value.find(g => g.assessmentId === assessmentId && g.studentId === studentId)
  if (!grade) {
    grade = { assessmentId, studentId, classId: activeClassRecord.value.classId, attempts: [] }
    grades.value.push(grade)
  }
  grade.excluded = excluded
  
  refreshSingleStudent(studentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_exc`, () => 
    gradebookService.updateGradeFlags(assessmentId, studentId, { excluded })
  )
}

/**
 * Saves a category override for a student.
 */
export async function saveStudentOverride(studentId, catId, value) {
  if (!activeClassRecord.value) return
  
  const student = activeClassRecord.value.students[studentId]
  if (!student) return
  
  if (!student.categoryOverrides) student.categoryOverrides = {}

  if (value === '' || value === null || isNaN(Number(value))) {
    delete student.categoryOverrides[catId]
  } else {
    student.categoryOverrides[catId] = Number(value)
  }

  const { saveClass } = await import('../db/classService.js')
  await saveClass(JSON.parse(JSON.stringify(activeClassRecord.value)))
  await refreshGrades()
}

/**
 * Saves a gradebook note for a student.
 */
export async function saveStudentGradebookNote(studentId, note) {
  if (!activeClassRecord.value) return
  
  const student = activeClassRecord.value.students[studentId]
  if (!student || student.gradebookNote === note) return

  student.gradebookNote = note
  const { saveClass } = await import('../db/classService.js')
  await saveClass(JSON.parse(JSON.stringify(activeClassRecord.value)))
}

/**
 * Saves demographic and contact information for a student.
 */
export async function saveStudentDemographics(studentId, demographics) {
  if (!activeClassRecord.value) return
  
  const student = activeClassRecord.value.students[studentId]
  if (!student) return

  student.parentContacts = demographics.parentContacts || []
  student.studentEmail = demographics.studentEmail || ''
  student.custody = demographics.custody || ''
  student.livingWith = demographics.livingWith || ''
  student.birthDate = demographics.birthDate || ''

  const { saveClass } = await import('../db/classService.js')
  await saveClass(JSON.parse(JSON.stringify(activeClassRecord.value)))
}

/**
 * Fetches events and calculates basic stats for a student dossier.
 */
export async function fetchStudentDossierData(studentId) {
  const { getEventsByStudent } = await import('../db/eventService.js')
  const events = await getEventsByStudent(studentId)
  
  const acEvents = events
    .filter(e => e.code === 'ac')
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))

  const summary = {
    absences: events.filter(e => e.code === 'a' && !e.superseded).length,
    lates: events.filter(e => e.code === 'l').length
  }

  return { acEvents, summary }
}


/**
 * Deletes an event and refreshes grades.
 */
export async function deleteGradebookEvent(eventId) {
  const { deleteEvent } = await import('../db/eventService.js')
  await deleteEvent(eventId)
  await refreshGrades()
}

// ─── Computeds ───────────────────────────────────────────────────────────────

/**
 * Returns a nested map [assessmentId][studentId] for fast UI lookup.
 */
export const gradeMap = computed(() => {
  const map = {}
  for (const grade of grades.value) {
    if (!map[grade.assessmentId]) map[grade.assessmentId] = {}
    
    // Pre-resolve the score based on assessment policy
    const assessment = assessments.value.find(a => a.assessmentId === grade.assessmentId)
    const resolvedScore = assessment 
      ? gradebookService.resolveAttemptScore(grade.attempts, assessment.retestPolicy)
      : null
      
    map[grade.assessmentId][grade.studentId] = {
      ...grade,
      resolvedScore
    }
  }
  return map
})

/**
 * Returns summary stats for all assessments in the current view.
 */
export const assessmentStats = computed(() => {
  const stats = {}
  for (const assessment of assessments.value) {
    stats[assessment.assessmentId] = gradebookService.calculateAssessmentAnalytics(
      assessment.assessmentId,
      grades.value,
      assessment,
      { 
        excludeOutliers: excludeOutliers.value,
        excludedStudentIds: new Set(
          Object.keys(activeClassRecord.value?.students ?? {})
            .filter(id => activeClassRecord.value.students[id].excludeFromAnalytics)
        )
      }
    )
  }
  return stats
})
