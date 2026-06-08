/**
 * src/composables/useGradebook.js
 *
 * Reactive bridge for the Gradebook V4 feature.
 */

import { ref, shallowRef, computed, triggerRef } from 'vue'
import { useMessage } from './useMessage.js'
import * as gradebookService from '../db/gradebookService.js'
import * as classService from '../db/classService.js'

// ─── Reactive State ──────────────────────────────────────────────────────────

export const activeClassRecord = shallowRef(null)
export const assessments = ref([])
export const grades = ref([])
export const classGrades = ref({})
export const selectedStudentId = ref(null)
export const selectedMilestone = ref(null) // null = current
export const globalMilestones = ref([])
export const gradeBuckets = ref([])

// Reactive state for analytics (Step 6)
export const analyticsMode = ref(false) // false = grid, true = analytics panel
export const exclusionMode = ref('none') // 'none', 'fixed', 'auto'
export const fixedExclusionThreshold = ref(40) // Default cutoff %
export const distributionMode = ref('buckets') // 'buckets' (10%) or 'levels' (Ontario GS)
export const classAnalytics = ref(null) // result of calculateClassAnalytics
export const assessmentStats = ref({}) // Manual cache for assessment stats
export const showAddAssessmentModal = ref(false)
export const isEditingAssessment = ref(false)
export const currentAssessmentId = ref(null)

export const newAssessment = ref({
  name: '',
  description: '',
  categoryId: '',
  assessmentType: 'product',
  unitId: null,
  target: 'class',
  targetStudentId: null,
  date: new Date().toISOString().slice(0, 10),
  totalPoints: 10,
  scaledTotal: null,
  retestPolicy: 'highest'
})

export const assessmentTypes = [
  { value: 'product', label: 'Product' },
  { value: 'conversation', label: 'Conversation' },
  { value: 'observation', label: 'Observation' }
]

export const sortedUnits = computed(() => {
  if (!activeClassRecord.value?.gradebookUnits) return []
  return [...activeClassRecord.value.gradebookUnits].sort((a, b) => (a.order || 0) - (b.order || 0))
})

export const filteredMilestones = computed(() => {
  if (!activeClassRecord.value) return []
  const year = activeClassRecord.value.year
  return globalMilestones.value.filter(m => !m.year || m.year === year)
})

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
  
  // Load global settings
  const { getGlobalMilestones, getGradeBuckets } = await import('../db/settingsService.js')
  globalMilestones.value = await getGlobalMilestones()
  gradeBuckets.value = await getGradeBuckets()
  
  // Compute student grades and stats
  await refreshGrades()
  refreshAllAssessmentStats()
}

/**
 * Recalculates all student grades based on active class and current data.
 */
export async function refreshGrades() {
  if (!activeClassRecord.value) return
  
  // Find date boundary if a milestone is selected
  const asOf = selectedMilestone.value
    ? filteredMilestones.value?.find(m => m.milestoneId === selectedMilestone.value)?.date
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
  // Use filteredMilestones (same as refreshGrades) so grades and analytics always match
  const asOf = selectedMilestone.value
    ? filteredMilestones.value?.find(m => m.milestoneId === selectedMilestone.value)?.date
    : null

  classAnalytics.value = await gradebookService.calculateClassAnalytics(
    activeClassRecord.value,
    assessments.value,
    grades.value,
    { 
      exclusionMode: exclusionMode.value, 
      exclusionThreshold: fixedExclusionThreshold.value,
      asOf,
      gradeBuckets: gradeBuckets.value
    }
  )
}

/**
 * Set exclusion mode and refresh analytics.
 */
export async function setExclusionMode(mode) {
  exclusionMode.value = mode
  await refreshClassAnalytics()
}

/**
 * Toggle a student's analytics exclusion — persists to IDB.
 */
export async function toggleStudentFromAnalytics(studentId) {
  if (!activeClassRecord.value) return
  try {
    await classService.toggleStudentAnalyticsExclusion(activeClassRecord.value.classId, studentId)
    // Reload class record to pick up the change
    const updated = await classService.getClass(activeClassRecord.value.classId)
    activeClassRecord.value = updated
    await refreshClassAnalytics()
  } catch (err) {
    console.error('[useGradebook] toggleStudentFromAnalytics failed:', err)
    const { alert } = useMessage()
    await alert('Failed to update analytics exclusion.')
  }
}

/**
 * Reset analytics state when leaving the analytics panel.
 */
export function resetAnalyticsState() {
  exclusionMode.value = 'none'
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
  
  try {
    const assessment = await gradebookService.createAssessment({
      classId: activeClassRecord.value.classId,
      ...assessmentData
    })
    
    assessments.value.push(assessment)
    return assessment
  } catch (err) {
    console.error('[useGradebook] addAssessment failed:', err)
    const { alert } = useMessage()
    await alert('Failed to save assessment.')
  }
}

/**
 * Updates an assessment and refreshes grades.
 */
export async function editAssessment(assessmentId, updates) {
  try {
    const updated = await gradebookService.updateAssessment(assessmentId, updates)
    
    // Update local ref
    const index = assessments.value.findIndex(a => a.assessmentId === assessmentId)
    if (index !== -1) {
      assessments.value[index] = updated
    }
    
    await refreshGrades()
    return updated
  } catch (err) {
    console.error('[useGradebook] editAssessment failed:', err)
    const { alert } = useMessage()
    await alert('Failed to update assessment.')
  }
}
/**
 * Deletes an assessment and refreshes state.
 */
export async function deleteAssessment(assessmentId) {
  try {
    await gradebookService.deleteAssessment(assessmentId)
    
    // Update local ref
    assessments.value = assessments.value.filter(a => a.assessmentId !== assessmentId)
    
    // Refresh grades as they are now orphaned/removed
    await refreshGrades()
  } catch (err) {
    console.error('[useGradebook] deleteAssessment failed:', err)
    const { alert } = useMessage()
    await alert('Failed to delete assessment.')
  }
}

/**
 * Opens the Add Assessment modal with optional pre-filled data.
 */
export function openAddAssessment(target = 'class', studentId = null) {
  isEditingAssessment.value = false
  currentAssessmentId.value = null
  
  newAssessment.value = {
    name: '',
    description: '',
    categoryId: activeClassRecord.value?.gradebookCategories?.[0]?.categoryId || '',
    assessmentType: (target === 'individual') ? 'conversation' : 'product',
    unitId: activeClassRecord.value?.gradebookUnits?.[0]?.unitId || null,
    target,
    targetStudentId: studentId,
    date: new Date().toISOString().slice(0, 10),
    totalPoints: 10,
    scaledTotal: null,
    retestPolicy: 'highest'
  }
  
  showAddAssessmentModal.value = true
}

/**
 * Closes the Add Assessment modal.
 */
export function closeAddAssessment() {
  showAddAssessmentModal.value = false
}

export function onTargetChange() {
  if (newAssessment.value.target === 'individual') {
    newAssessment.value.assessmentType = 'conversation'
  }
}

export async function saveAssessment() {
  if (!newAssessment.value.name || !newAssessment.value.categoryId) return
  
  const data = { ...newAssessment.value }

  try {
    if (isEditingAssessment.value) {
      await editAssessment(currentAssessmentId.value, data)
    } else {
      await addAssessment(data)
    }

    showAddAssessmentModal.value = false
  } catch (err) {
    // Error already alerted in add/editAssessment
  }
}

// ─── Debounced Async DB Save System ──────────────────────────────────────────
const dbSaveQueue = new Map()
let dbSaveTimer = null

function enqueueDBSave(key, saveFn) {
  const currentClassId = activeClassRecord.value?.classId // Capture current class context
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
        const { alert } = useMessage()
        await alert('Data sync error: Some recent mark changes may not have saved. Please check your connection or refresh.')
      }
    }
    // Guard against class switch during the 500ms debounce window
    if (activeClassRecord.value && activeClassRecord.value.classId === currentClassId) {
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
    ? globalMilestones.value?.find(m => m.milestoneId === selectedMilestone.value)?.date
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
 * Recalculates stats for a SINGLE assessment and updates the cache.
 */
export function refreshSingleAssessmentStats(assessmentId) {
  if (!activeClassRecord.value) return
  
  const assessment = assessments.value.find(a => a.assessmentId === assessmentId)
  if (!assessment) return

  const stats = gradebookService.calculateAssessmentAnalytics(
    assessmentId,
    grades.value,
    assessment,
    { 
      exclusionMode: exclusionMode.value,
      exclusionThreshold: fixedExclusionThreshold.value,
      excludedStudentIds: new Set(
        Object.keys(activeClassRecord.value?.students ?? {})
          .filter(id => activeClassRecord.value.students[id].excludeFromAnalytics || activeClassRecord.value.students[id].archived)
      ),
      gradeBuckets: gradeBuckets.value
    }
  )

  assessmentStats.value = {
    ...assessmentStats.value,
    [assessmentId]: stats
  }
}

/**
 * Full refresh of all assessment stats (e.g. on class load).
 */
export function refreshAllAssessmentStats() {
  const stats = {}
  for (const assessment of assessments.value) {
    stats[assessment.assessmentId] = gradebookService.calculateAssessmentAnalytics(
      assessment.assessmentId,
      grades.value,
      assessment,
      { 
        exclusionMode: exclusionMode.value,
        exclusionThreshold: fixedExclusionThreshold.value,
        excludedStudentIds: new Set(
          Object.keys(activeClassRecord.value?.students ?? {})
            .filter(id => activeClassRecord.value.students[id].excludeFromAnalytics || activeClassRecord.value.students[id].archived)
        ),
        gradeBuckets: gradeBuckets.value
      }
    )
  }
  assessmentStats.value = stats
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
  // Note: We allow raw scores higher than total points for bonus marks and scaling
  
  let grade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  if (!grade) {
    grade = {
      assessmentId: Number(assessmentId), studentId: String(studentId), classId: activeClassRecord.value.classId,
      missing: false, excluded: false, attempts: []
    }
    grades.value.push(grade)
  }
  
  const isFirst = (grade.attempts?.length || 0) === 0
  grade.attempts.push({
    attemptId: crypto.randomUUID(),
    pointsEarned,
    date: date || new Date().toISOString(),
    comment,
    isPrimary: isFirst
  })

  // If a grade is entered, it is no longer missing
  const wasMissing = grade.missing
  grade.missing = false

  // 1. Refresh UI instantly for this student and assessment stats
  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  // 2. Debounce IDB save
  enqueueDBSave(`${assessmentId}_${studentId}`, async () => {
    await gradebookService.addAttempt(assessmentId, studentId, { pointsEarned, date, comment })
    // If it was previously missing, we need to ensure the DB flag is also cleared
    if (wasMissing) {
      await gradebookService.updateGradeFlags(assessmentId, studentId, { missing: false })
    }
  })
}


/**
 * Removes an attempt and refreshes state.
 */
export function removeAttempt(assessmentId, studentId, attemptId) {
  if (!activeClassRecord.value) return
  
  const grade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  if (grade) {
    grade.attempts = grade.attempts.filter(a => a.attemptId !== attemptId)
  }
  
  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_rem_${attemptId}`, () => 
    gradebookService.deleteAttempt(assessmentId, studentId, attemptId)
  )
}

/**
 * Sets a specific attempt as primary and refreshes state.
 */
export function setPrimaryAttempt(assessmentId, studentId, attemptId) {
  if (!activeClassRecord.value) return
  
  const grade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  if (grade) {
    grade.attempts.forEach(a => a.isPrimary = (a.attemptId === attemptId))
  }
  
  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_prim`, () => 
    gradebookService.setPrimaryAttempt(assessmentId, studentId, attemptId)
  )
}

/**
 * Clears all attempts and removes the grade record for a student on an assessment.
 */
export function clearGrade(assessmentId, studentId) {
  if (!activeClassRecord.value) return
  
  grades.value = grades.value.filter(g => !(Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId)))
  
  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_clear`, () => 
    gradebookService.deleteGrade(assessmentId, studentId)
  )
}

/**
 * Toggles the 'missing' flag for a student's grade.
 */
export function markMissing(assessmentId, studentId, missing) {
  if (!activeClassRecord.value) return
  
  let grade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  if (!grade) {
    grade = { assessmentId: Number(assessmentId), studentId: String(studentId), classId: activeClassRecord.value.classId, attempts: [] }
    grades.value.push(grade)
  }
  
  grade.missing = missing
  // Mutual Exclusivity: If marking as missing, it cannot be excluded
  if (missing) grade.excluded = false
  
  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_flags`, () => 
    gradebookService.updateGradeFlags(assessmentId, studentId, { 
      missing: grade.missing, 
      excluded: grade.excluded 
    })
  )
}

/**
 * Toggles the 'excluded' flag for a student's grade.
 */
export function markExcluded(assessmentId, studentId, excluded) {
  if (!activeClassRecord.value) return
  
  let grade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  if (!grade) {
    grade = { assessmentId: Number(assessmentId), studentId: String(studentId), classId: activeClassRecord.value.classId, attempts: [] }
    grades.value.push(grade)
  }
  
  grade.excluded = excluded
  // Mutual Exclusivity: If excluding, it cannot be missing
  if (excluded) grade.missing = false
  
  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_flags`, () => 
    gradebookService.updateGradeFlags(assessmentId, studentId, { 
      missing: grade.missing, 
      excluded: grade.excluded 
    })
  )
}

/**
 * Saves a category override for a student.
 */
export async function saveStudentOverride(studentId, catId, value) {
  if (!activeClassRecord.value) return
  
  try {
    const student = activeClassRecord.value.students[studentId]
    if (!student) return
    
    if (!student.categoryOverrides) student.categoryOverrides = {}

    if (value === '' || value === null || isNaN(Number(value))) {
      delete student.categoryOverrides[catId]
    } else {
      student.categoryOverrides[catId] = Number(value)
    }

    // Force trigger because we are using shallowRef
    triggerRef(activeClassRecord)

    const { patchStudent } = await import('../db/classService.js')
    await patchStudent(activeClassRecord.value.classId, studentId, { 
      categoryOverrides: student.categoryOverrides 
    })
    await refreshGrades()
  } catch (err) {
    console.error('[useGradebook] saveStudentOverride failed:', err)
    const { alert } = useMessage()
    await alert('Failed to save grade override.')
  }
}

import { useClassroom } from './useClassroom.js'

/**
 * Saves a gradebook note for a student.
 */
export async function saveStudentGradebookNote(studentId, note) {
    if (!activeClassRecord.value) return
    
    try {
        const student = activeClassRecord.value.students[studentId]
        if (!student) return

        // Only save if the note has actually changed
        if (student.gradebookNote === note) return
        
        student.gradebookNote = note
        triggerRef(activeClassRecord)

        // Synchronize with useClassroom state if active
        const { students: classroomStudents } = useClassroom()
        if (classroomStudents.value[studentId]) {
            classroomStudents.value[studentId].gradebookNote = note
        }

        // Persist to IDB
        const { patchStudent } = await import('../db/classService.js')
        await patchStudent(activeClassRecord.value.classId, studentId, { gradebookNote: note })
    } catch (err) {
        console.error('[useGradebook] saveStudentGradebookNote failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save student note.')
    }
}

/**
 * Saves demographic and contact information for a student.
 */
export async function saveStudentDemographics(studentId, demographics) {
  if (!activeClassRecord.value) return
  
  try {
    const student = activeClassRecord.value.students[studentId]
    if (!student) return

    const updates = {
      parentContacts: demographics.parentContacts || [],
      studentEmail: demographics.studentEmail || '',
      custody: demographics.custody || '',
      livingWith: demographics.livingWith || '',
      birthDate: demographics.birthDate || ''
    }

    Object.assign(student, updates)
    triggerRef(activeClassRecord)
    const { patchStudent } = await import('../db/classService.js')
    await patchStudent(activeClassRecord.value.classId, studentId, updates)
  } catch (err) {
    console.error('[useGradebook] saveStudentDemographics failed:', err)
    const { alert } = useMessage()
    await alert('Failed to save student info.')
  }
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
    const assessment = assessments.value.find(a => Number(a.assessmentId) === Number(grade.assessmentId))
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

