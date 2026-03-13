/**
 * src/composables/useGradebook.js
 *
 * Reactive bridge for the Gradebook V4 feature.
 */

import { ref, computed } from 'vue'
import * as gradebookService from '../db/gradebookService.js'

// ─── Reactive State ──────────────────────────────────────────────────────────

export const activeClassRecord = ref(null)
export const assessments = ref([])
export const grades = ref([])
export const classGrades = ref({})
export const selectedStudentId = ref(null)
export const selectedMilestone = ref(null) // null = current

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

/**
 * Records a grade (points earned) for a student and refreshes state.
 * 
 * @param {number} assessmentId
 * @param {string} studentId
 * @param {number} pointsEarned
 * @param {string} comment
 */
export async function enterGrade(assessmentId, studentId, pointsEarned, comment = '') {
  if (!activeClassRecord.value) return
  
  await gradebookService.addAttempt(assessmentId, studentId, {
    pointsEarned,
    date: new Date().toISOString(),
    comment
  })
  
  // Full re-fetch of grades to ensure sync (efficient enough for single class)
  grades.value = await gradebookService.getGradesByClass(activeClassRecord.value.classId)
  await refreshGrades()
}

/**
 * Removes an attempt and refreshes state.
 */
export async function removeAttempt(assessmentId, studentId, attemptId) {
  if (!activeClassRecord.value) return
  
  await gradebookService.deleteAttempt(assessmentId, studentId, attemptId)
  
  grades.value = await gradebookService.getGradesByClass(activeClassRecord.value.classId)
  await refreshGrades()
}

/**
 * Toggles the 'missing' flag for a student's grade.
 */
export async function markMissing(assessmentId, studentId, missing) {
  if (!activeClassRecord.value) return
  
  await gradebookService.updateGradeFlags(assessmentId, studentId, { missing })
  
  grades.value = await gradebookService.getGradesByClass(activeClassRecord.value.classId)
  await refreshGrades()
}

/**
 * Toggles the 'excluded' flag for a student's grade.
 */
export async function markExcluded(assessmentId, studentId, excluded) {
  if (!activeClassRecord.value) return
  
  await gradebookService.updateGradeFlags(assessmentId, studentId, { excluded })
  
  grades.value = await gradebookService.getGradesByClass(activeClassRecord.value.classId)
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
    stats[assessment.assessmentId] = gradebookService.calculateAssessmentStats(
      assessment.assessmentId,
      grades.value,
      assessment
    )
  }
  return stats
})
