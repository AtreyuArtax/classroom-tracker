/**
 * src/composables/useGradebook.js
 *
 * Reactive bridge for the Gradebook V4 feature.
 */

import { ref, shallowRef, computed, triggerRef } from 'vue'
import { useMessage } from './useMessage.js'
import * as gradebookService from '../db/gradebookService.js'
import * as classService from '../db/classService.js'
import { getGlobalMilestones, getGradeBuckets } from '../db/settingsService.js'
import { useUndo } from './useUndo.js'
import { activeClass, activeSubjectId } from './useClassroomState.js'
import { getEffectiveClassRecord, getStudentEffectiveGrade } from './useElementary.js'

const { push: pushUndo } = useUndo()

export { getEffectiveClassRecord, getStudentEffectiveGrade }

// ─── Reactive State ──────────────────────────────────────────────────────────

export const activeClassRecord = shallowRef(null)
export const assessments = ref([])
export const grades = ref([])
export const classGrades = ref({})
export const selectedStudentId = ref(null)
export const selectedMilestone = ref(null) // null = current
export const globalMilestones = ref([])
export const gradeBuckets = ref([])
export const initialDossierTab = ref('summary')
export const activeSubCohortFilter = ref('all') // 'all' | 'Grade 7' | 'SNC2D1' etc.

// Alias for backwards compatibility
export const activeGradeFilter = computed({
  get: () => activeSubCohortFilter.value,
  set: (val) => { activeSubCohortFilter.value = val }
})
export const selectedCourseFilter = computed({
  get: () => activeSubCohortFilter.value,
  set: (val) => { activeSubCohortFilter.value = val }
})

/**
 * Available sub-cohort options for current class (e.g. ['all', 'Grade 7', 'Grade 8'] or ['all', 'SNC2D1', 'SNC2P1'])
 */
export const availableSubCohorts = computed(() => {
  if (!activeClassRecord.value) return ['all']
  const isElem = activeClassRecord.value.classType === 'elementary'
  const curSubId = activeClassRecord.value.activeSubjectId
  const students = Object.values(activeClassRecord.value.students || {})
  const set = new Set()
  students.forEach(st => {
    if (st.archived) return
    let tag = isElem 
      ? getStudentEffectiveGrade(st, curSubId)
      : st.courseCode
    if (tag && tag.trim()) {
      if (isElem && st.accommodations?.modifiedSubjectGrades?.[curSubId]) {
        tag = `${tag.trim()} (IEP)`
      } else {
        tag = tag.trim()
      }
      set.add(tag)
    }
  })
  if (set.size <= 1) return ['all']
  return ['all', ...Array.from(set).sort()]
})

export const availableCourseFilters = computed(() => availableSubCohorts.value)
export const availableGradeFilters = computed(() => availableSubCohorts.value)

/**
 * Check if a student belongs to the active sub-cohort filter
 */
export function isStudentInSubCohort(student, filterVal = activeSubCohortFilter.value, classType = activeClassRecord.value?.classType) {
  if (!filterVal || filterVal.toLowerCase() === 'all') return true
  if (!student) return false
  const cleanFilter = filterVal.replace(/\s*\(IEP\)/i, '').trim().toLowerCase()
  const curSubId = activeClassRecord.value?.activeSubjectId
  const tag = classType === 'elementary'
    ? getStudentEffectiveGrade(student, curSubId)
    : student.courseCode
  if (!tag) return false
  return tag.trim().toLowerCase() === cleanFilter
}

/**
 * Check if an assessment targets the active sub-cohort filter
 */
export function isAssessmentInSubCohort(assessment, filterVal = activeSubCohortFilter.value, classType = activeClassRecord.value?.classType) {
  if (!filterVal || filterVal.toLowerCase() === 'all') return true
  if (!assessment) return true
  const cleanFilter = filterVal.replace(/\s*\(IEP\)/i, '').trim().toLowerCase()
  const tag = classType === 'elementary'
    ? (assessment.gradeLevel || assessment.targetCourseCode)
    : (assessment.targetCourseCode || assessment.gradeLevel)
  if (!tag || tag.toLowerCase() === 'all') return true
  return tag.replace(/\s*\(IEP\)/i, '').trim().toLowerCase() === cleanFilter
}

/**
 * Check if an assessment is applicable to a specific student based on split-class target cohort
 */
export function isAssessmentApplicableToStudent(assessment, student, classType = activeClassRecord.value?.classType) {
  if (!assessment) return true
  const isElem = classType === 'elementary'
  const aTag = isElem 
    ? (assessment.gradeLevel || assessment.targetCourseCode)
    : (assessment.targetCourseCode || assessment.gradeLevel)
  if (!aTag || aTag.toLowerCase() === 'all') return true
  if (!student) return true
  const curSubId = activeClassRecord.value?.activeSubjectId
  const sTag = isElem 
    ? getStudentEffectiveGrade(student, curSubId)
    : (student.courseCode || student.gradeLevel)
  if (!sTag) return true
  const cleanATag = aTag.replace(/\s*\(IEP\)/i, '').trim().toLowerCase()
  const cleanSTag = sTag.replace(/\s*\(IEP\)/i, '').trim().toLowerCase()
  return cleanATag === cleanSTag
}


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

export const displayMode = ref('percent') // 'raw' | 'percent'
export const assessmentSortOrder = ref('desc') // 'desc' = Newest first, 'asc' = Oldest first
export const gridSortBy = ref('name') // 'name' | 'grade' | assessmentId
export const gridSortOrder = ref('asc') // 'asc' | 'desc'

export const newAssessment = ref({
  name: '',
  description: '',
  categoryId: '',
  assessmentType: 'product',
  purpose: 'summative', // 'summative' | 'formative'
  isFormative: false,
  unitId: null,
  expectationId: null,
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
  const cls = activeClassRecord.value?.classType === 'elementary'
    ? getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
    : activeClassRecord.value
  if (!cls?.gradebookUnits) return []
  return [...cls.gradebookUnits].map(u => ({
    ...u,
    name: (u.name || 'Strand').replace(/\[Grade \d+\]\s*/g, '')
  })).sort((a, b) => (a.order || 0) - (b.order || 0))
})

export const filteredMilestones = computed(() => {
  if (!activeClassRecord.value) return []
  const year = activeClassRecord.value.year
  return globalMilestones.value.filter(m => !m.year || m.year === year)
})

// ─── Public API ──────────────────────────────────────────────────────────────

export async function setActiveSubject(subjectId) {
  activeSubjectId.value = subjectId
  if (activeClassRecord.value) {
    const origClass = activeClass.value || await classService.getClass(activeClassRecord.value.classId)
    if (origClass) {
      await loadGradebook(origClass, subjectId)
    }
  }
}

/**
 * Loads all gradebook data for a class and initializes reactive state.
 * 
 * @param {Object} classRecord
 * @param {string|null} targetSubjectId
 */
export async function loadGradebook(classRecord, targetSubjectId = null) {
  const effectiveRecord = getEffectiveClassRecord(classRecord, targetSubjectId)
  activeClassRecord.value = effectiveRecord
  // Reset selection
  selectedStudentId.value = null
  selectedMilestone.value = null
  
  // Load data from DB
  const rawAssessments = await gradebookService.getAssessmentsByClass(classRecord.classId)
  if (classRecord.classType === 'elementary' && effectiveRecord?.activeSubjectId) {
    const curSubId = effectiveRecord.activeSubjectId
    assessments.value = rawAssessments.filter(a => a.subjectId === curSubId || !a.subjectId)
  } else {
    assessments.value = rawAssessments
  }
  grades.value = await gradebookService.getGradesByClass(classRecord.classId)
  
  // Load global settings
  const [gMilestones, gBuckets] = await Promise.all([
    getGlobalMilestones(),
    getGradeBuckets()
  ])
  globalMilestones.value = gMilestones
  gradeBuckets.value = gBuckets
  
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
export async function refreshClassAnalytics(targetSubCohort = null) {
  if (!activeClassRecord.value) return
  // Use filteredMilestones (same as refreshGrades) so grades and analytics always match
  const asOf = selectedMilestone.value
    ? filteredMilestones.value?.find(m => m.milestoneId === selectedMilestone.value)?.date
    : null

  const subCohortFilterVal = targetSubCohort || activeSubCohortFilter.value || 'all'

  classAnalytics.value = await gradebookService.calculateClassAnalytics(
    activeClassRecord.value,
    assessments.value,
    grades.value,
    { 
      exclusionMode: exclusionMode.value, 
      exclusionThreshold: fixedExclusionThreshold.value,
      targetCourseCode: subCohortFilterVal,
      subCohortFilter: subCohortFilterVal,
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
    const classId = activeClassRecord.value.classId
    const currentSubId = activeClassRecord.value.activeSubjectId || null
    await classService.toggleStudentAnalyticsExclusion(classId, studentId)
    // Reload class record to pick up the change while preserving subject context
    const updatedRaw = await classService.getClass(classId)
    activeClassRecord.value = getEffectiveClassRecord(updatedRaw, currentSubId)
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
    const isElem = activeClassRecord.value.classType === 'elementary'
    const curSubId = isElem ? (activeClassRecord.value.activeSubjectId || activeSubjectId.value) : undefined

    const assessment = await gradebookService.createAssessment({
      classId: activeClassRecord.value.classId,
      ...(curSubId ? { subjectId: curSubId } : {}),
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
    
    // Update local ref with loose number matching
    assessments.value = assessments.value.filter(a => Number(a.assessmentId) !== Number(assessmentId))
    
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
  
  const initialCohort = (activeSubCohortFilter.value && activeSubCohortFilter.value !== 'all')
    ? activeSubCohortFilter.value
    : 'all'

  newAssessment.value = {
    name: '',
    description: '',
    categoryId: activeClassRecord.value?.gradebookCategories?.[0]?.categoryId || '',
    assessmentType: (target === 'individual') ? 'conversation' : 'product',
    purpose: 'summative',
    isFormative: false,
    unitId: activeClassRecord.value?.gradebookUnits?.[0]?.unitId || null,
    expectationId: null,
    expectationIds: [],
    target,
    targetStudentId: studentId,
    targetCourseCode: initialCohort,
    gradeLevel: initialCohort !== 'all' ? initialCohort : null,
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
  if (!newAssessment.value.name) return
  
  if (!newAssessment.value.categoryId && activeClassRecord.value?.gradebookCategories?.[0]?.categoryId) {
    newAssessment.value.categoryId = activeClassRecord.value.gradebookCategories[0].categoryId
  }
  if (!newAssessment.value.categoryId) {
    newAssessment.value.categoryId = 'sbar_general'
  }
  
  newAssessment.value.isFormative = (newAssessment.value.purpose === 'formative')

  if (activeClassRecord.value?.classType === 'elementary' && activeSubjectId.value && !newAssessment.value.subjectId) {
    newAssessment.value.subjectId = activeSubjectId.value
  }

  const effClass = activeClassRecord.value?.classType === 'elementary'
    ? getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
    : activeClassRecord.value

  const isElem = activeClassRecord.value?.classType === 'elementary'
  const targetCohort = newAssessment.value.targetCourseCode || 'all'

  if (targetCohort !== 'all') {
    newAssessment.value.targetCourseCode = targetCohort
    newAssessment.value.gradeLevel = targetCohort
  } else if (activeGradeFilter.value && activeGradeFilter.value !== 'all') {
    newAssessment.value.gradeLevel = activeGradeFilter.value
    newAssessment.value.targetCourseCode = activeGradeFilter.value
  } else if (newAssessment.value.unitId && effClass?.gradebookUnits) {
    const u = effClass.gradebookUnits.find(unit => String(unit.unitId) === String(newAssessment.value.unitId))
    if (u) {
      const g = u.gradeLevel || (u.name && u.name.includes('Grade 7') ? 'Grade 7' : (u.name && u.name.includes('Grade 8') ? 'Grade 8' : ''))
      if (g) {
        newAssessment.value.gradeLevel = g
        if (isElem) newAssessment.value.targetCourseCode = g
      }
    }
  }

  if (!newAssessment.value.gradeLevel && effClass?.gradebookUnits) {
    const expCodes = newAssessment.value.expectationIds || (newAssessment.value.expectationId ? [newAssessment.value.expectationId] : [])
    const foundGrades = new Set()
    effClass.gradebookUnits.forEach(u => {
      const uGrade = u.gradeLevel || (u.name && u.name.includes('Grade 7') ? 'Grade 7' : (u.name && u.name.includes('Grade 8') ? 'Grade 8' : ''))
      ;(u.expectations || []).forEach(e => {
        if (expCodes.includes(e.code) || expCodes.includes(e.expectationId)) {
          const g = e.gradeLevel || uGrade
          if (g) foundGrades.add(g)
        }
      })
    })
    if (foundGrades.size === 1) {
      newAssessment.value.gradeLevel = Array.from(foundGrades)[0]
    }
  }

  const data = { 
    ...newAssessment.value,
    targetCourseCode: newAssessment.value.targetCourseCode || 'all'
  }

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
  
  let grade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  if (!grade) {
    grade = {
      assessmentId: Number(assessmentId), studentId: String(studentId), classId: activeClassRecord.value.classId,
      missing: false, excluded: false, attempts: []
    }
    grades.value.push(grade)
  }
  
  grade.masteryLevel = pointsEarned
  grade.resolvedScore = pointsEarned
  
  const isFirst = (grade.attempts?.length || 0) === 0
  const attemptObj = {
    attemptId: crypto.randomUUID(),
    pointsEarned,
    date: date || new Date().toISOString(),
    comment,
    isPrimary: isFirst
  }
  grade.attempts.push(attemptObj)

  // If a grade is entered, it is no longer missing
  const wasMissing = grade.missing
  grade.missing = false

  // 1. Refresh UI instantly for this student and assessment stats
  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}`, () =>
    gradebookService.saveFullGradeRecord(grade)
  )
  
  // Push atomic attempt undo and redo operations
  pushUndo(
    async () => {
      const g = grades.value.find(item => Number(item.assessmentId) === Number(assessmentId) && String(item.studentId) === String(studentId))
      if (g) {
        g.attempts = g.attempts.filter(a => a.attemptId !== attemptObj.attemptId)
        if (wasMissing) g.missing = true
        if (g.attempts.length === 0 && !g.missing && !g.excluded) {
          grades.value = grades.value.filter(item => !(Number(item.assessmentId) === Number(assessmentId) && String(item.studentId) === String(studentId)))
          await gradebookService.deleteGrade(assessmentId, studentId)
        } else {
          await gradebookService.saveFullGradeRecord(g)
        }
      }
      triggerRef(grades)
      refreshSingleStudent(studentId)
      refreshSingleAssessmentStats(assessmentId)
    },
    async () => {
      let g = grades.value.find(item => Number(item.assessmentId) === Number(assessmentId) && String(item.studentId) === String(studentId))
      if (!g) {
        g = { assessmentId: Number(assessmentId), studentId: String(studentId), classId: activeClassRecord.value.classId, missing: false, excluded: false, attempts: [] }
        grades.value.push(g)
      }
      if (!g.attempts.some(a => a.attemptId === attemptObj.attemptId)) {
        g.attempts.push(attemptObj)
      }
      g.missing = false
      await gradebookService.saveFullGradeRecord(g)
      triggerRef(grades)
      refreshSingleStudent(studentId)
      refreshSingleAssessmentStats(assessmentId)
    }
  )
}

/**
 * Enters an SBAR expectation level grade for a specific expectation standard.
 */
export function enterGradeSBAR(assessmentId, studentId, expCode, percentage) {
  if (!activeClassRecord.value) return

  let grade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  if (!grade) {
    grade = {
      assessmentId: Number(assessmentId),
      studentId: String(studentId),
      classId: activeClassRecord.value.classId,
      missing: false,
      excluded: false,
      attempts: [],
      expectationScores: {}
    }
    grades.value.push(grade)
  }

  if (!grade.expectationScores) {
    grade.expectationScores = {}
  }

  grade.expectationScores[expCode] = percentage
  grade.masteryLevel = percentage
  grade.resolvedScore = percentage
  grade.missing = false

  grades.value = [...grades.value]
  refreshSingleStudent(studentId)

  enqueueDBSave(`${assessmentId}_${studentId}`, async () => {
    await gradebookService.saveSBARGrade(
      assessmentId, 
      studentId, 
      grade.expectationScores, 
      percentage,
      activeClassRecord.value?.classId
    )
  })
}


/**
 * Removes an attempt and refreshes state.
 */
export function removeAttempt(assessmentId, studentId, attemptId) {
  if (!activeClassRecord.value) return
  
  const grade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  if (!grade) return

  const attemptObj = grade.attempts.find(a => a.attemptId === attemptId)
  if (!attemptObj) return

  const attemptIndex = grade.attempts.findIndex(a => a.attemptId === attemptId)
  grade.attempts = grade.attempts.filter(a => a.attemptId !== attemptId)
  
  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_rem_${attemptId}`, () => 
    gradebookService.deleteAttempt(assessmentId, studentId, attemptId)
  )

  // Push atomic attempt deletion undo and redo operations
  pushUndo(
    async () => {
      let g = grades.value.find(item => Number(item.assessmentId) === Number(assessmentId) && String(item.studentId) === String(studentId))
      if (!g) {
        g = { assessmentId: Number(assessmentId), studentId: String(studentId), classId: activeClassRecord.value.classId, missing: false, excluded: false, attempts: [] }
        grades.value.push(g)
      }
      if (!g.attempts.some(a => a.attemptId === attemptId)) {
        const insertAt = Math.min(attemptIndex, g.attempts.length)
        g.attempts.splice(insertAt, 0, attemptObj)
      }
      await gradebookService.saveFullGradeRecord(g)
      triggerRef(grades)
      refreshSingleStudent(studentId)
      refreshSingleAssessmentStats(assessmentId)
    },
    async () => {
      const g = grades.value.find(item => Number(item.assessmentId) === Number(assessmentId) && String(item.studentId) === String(studentId))
      if (g) {
        g.attempts = g.attempts.filter(a => a.attemptId !== attemptId)
        if (g.attempts.length === 0 && !g.missing && !g.excluded) {
          grades.value = grades.value.filter(item => !(Number(item.assessmentId) === Number(assessmentId) && String(item.studentId) === String(studentId)))
          await gradebookService.deleteGrade(assessmentId, studentId)
        } else {
          await gradebookService.saveFullGradeRecord(g)
        }
      }
      triggerRef(grades)
      refreshSingleStudent(studentId)
      refreshSingleAssessmentStats(assessmentId)
    }
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
 * Updates the comment on a specific attempt and refreshes state.
 */
export function updateAttemptComment(assessmentId, studentId, attemptId, comment) {
  if (!activeClassRecord.value) return

  const grade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  if (grade) {
    const attempt = grade.attempts.find(a => a.attemptId === attemptId)
    if (attempt) attempt.comment = comment ?? ''
  }

  triggerRef(grades)

  enqueueDBSave(`${assessmentId}_${studentId}_comment_${attemptId}`, () =>
    gradebookService.updateAttemptComment(assessmentId, studentId, attemptId, comment)
  )
}

/**
 * Clears all attempts and removes the grade record for a student on an assessment.
 */
export function clearGrade(assessmentId, studentId) {
  if (!activeClassRecord.value) return
  
  const existingGrade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  const prevSnapshot = existingGrade ? JSON.parse(JSON.stringify(existingGrade)) : null

  grades.value = grades.value.filter(g => !(Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId)))
  
  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_clear`, () => 
    gradebookService.deleteGrade(assessmentId, studentId)
  )

  if (prevSnapshot) {
    pushUndo(
      async () => {
        grades.value.push(prevSnapshot)
        await gradebookService.saveFullGradeRecord(prevSnapshot)
        triggerRef(grades)
        refreshSingleStudent(studentId)
        refreshSingleAssessmentStats(assessmentId)
      },
      async () => {
        grades.value = grades.value.filter(g => !(Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId)))
        await gradebookService.deleteGrade(assessmentId, studentId)
        triggerRef(grades)
        refreshSingleStudent(studentId)
        refreshSingleAssessmentStats(assessmentId)
      }
    )
  }
}

/**
 * Toggles the 'missing' flag for a student's grade.
 */
export function markMissing(assessmentId, studentId, missing) {
  if (!activeClassRecord.value) return
  
  const existingGrade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  const prevSnapshot = existingGrade ? JSON.parse(JSON.stringify(existingGrade)) : null

  let grade = existingGrade
  if (!grade) {
    grade = { assessmentId: Number(assessmentId), studentId: String(studentId), classId: activeClassRecord.value.classId, attempts: [] }
    grades.value.push(grade)
  }
  
  grade.missing = missing
  if (missing) grade.excluded = false
  
  const newSnapshot = JSON.parse(JSON.stringify(grade))

  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_flags`, () => 
    gradebookService.updateGradeFlags(assessmentId, studentId, { 
      missing: grade.missing, 
      excluded: grade.excluded 
    })
  )

  pushUndo(
    async () => {
      if (prevSnapshot) {
        const idx = grades.value.findIndex(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
        if (idx !== -1) grades.value[idx] = prevSnapshot
        else grades.value.push(prevSnapshot)
        await gradebookService.saveFullGradeRecord(prevSnapshot)
      } else {
        grades.value = grades.value.filter(g => !(Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId)))
        await gradebookService.deleteGrade(assessmentId, studentId)
      }
      triggerRef(grades)
      refreshSingleStudent(studentId)
      refreshSingleAssessmentStats(assessmentId)
    },
    async () => {
      const idx = grades.value.findIndex(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
      if (idx !== -1) grades.value[idx] = newSnapshot
      else grades.value.push(newSnapshot)
      await gradebookService.saveFullGradeRecord(newSnapshot)
      triggerRef(grades)
      refreshSingleStudent(studentId)
      refreshSingleAssessmentStats(assessmentId)
    }
  )
}

/**
 * Toggles the 'excluded' flag for a student's grade.
 */
export function markExcluded(assessmentId, studentId, excluded) {
  if (!activeClassRecord.value) return
  
  const existingGrade = grades.value.find(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
  const prevSnapshot = existingGrade ? JSON.parse(JSON.stringify(existingGrade)) : null

  let grade = existingGrade
  if (!grade) {
    grade = { assessmentId: Number(assessmentId), studentId: String(studentId), classId: activeClassRecord.value.classId, attempts: [] }
    grades.value.push(grade)
  }
  
  grade.excluded = excluded
  if (excluded) grade.missing = false
  
  const newSnapshot = JSON.parse(JSON.stringify(grade))

  triggerRef(grades)
  refreshSingleStudent(studentId)
  refreshSingleAssessmentStats(assessmentId)
  
  enqueueDBSave(`${assessmentId}_${studentId}_flags`, () => 
    gradebookService.updateGradeFlags(assessmentId, studentId, { 
      missing: grade.missing, 
      excluded: grade.excluded 
    })
  )

  pushUndo(
    async () => {
      if (prevSnapshot) {
        const idx = grades.value.findIndex(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
        if (idx !== -1) grades.value[idx] = prevSnapshot
        else grades.value.push(prevSnapshot)
        await gradebookService.saveFullGradeRecord(prevSnapshot)
      } else {
        grades.value = grades.value.filter(g => !(Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId)))
        await gradebookService.deleteGrade(assessmentId, studentId)
      }
      triggerRef(grades)
      refreshSingleStudent(studentId)
      refreshSingleAssessmentStats(assessmentId)
    },
    async () => {
      const idx = grades.value.findIndex(g => Number(g.assessmentId) === Number(assessmentId) && String(g.studentId) === String(studentId))
      if (idx !== -1) grades.value[idx] = newSnapshot
      else grades.value.push(newSnapshot)
      await gradebookService.saveFullGradeRecord(newSnapshot)
      triggerRef(grades)
      refreshSingleStudent(studentId)
      refreshSingleAssessmentStats(assessmentId)
    }
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

    await classService.patchStudent(activeClassRecord.value.classId, studentId, { 
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
        await classService.patchStudent(activeClassRecord.value.classId, studentId, { gradebookNote: note })
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
    await classService.patchStudent(activeClassRecord.value.classId, studentId, updates)
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
    const astIdNum = Number(grade.assessmentId)
    const astIdStr = String(grade.assessmentId)
    const stIdNum = Number(grade.studentId)
    const stIdStr = String(grade.studentId)

    if (!map[astIdStr]) map[astIdStr] = {}
    if (!map[astIdNum]) map[astIdNum] = map[astIdStr]

    const assessment = assessments.value.find(a => Number(a.assessmentId) === Number(grade.assessmentId))
    const resolvedAttemptScore = assessment 
      ? gradebookService.resolveAttemptScore(grade.attempts, assessment?.retestPolicy)
      : null

    let resolvedScore = null
    if (resolvedAttemptScore !== null && resolvedAttemptScore !== undefined) {
      resolvedScore = resolvedAttemptScore
    } else if (grade.resolvedScore !== undefined && grade.resolvedScore !== null) {
      resolvedScore = Number(grade.resolvedScore)
    } else if (grade.score !== undefined && grade.score !== null) {
      resolvedScore = Number(grade.score)
    } else if (grade.pointsEarned !== undefined && grade.pointsEarned !== null) {
      resolvedScore = Number(grade.pointsEarned)
    } else if (grade.masteryLevel !== undefined && grade.masteryLevel !== null) {
      resolvedScore = Number(grade.masteryLevel)
    }

    const entry = {
      ...grade,
      resolvedScore
    }

    map[astIdStr][stIdStr] = entry
    map[astIdStr][stIdNum] = entry
    if (!isNaN(stIdNum)) map[astIdNum][stIdNum] = entry
    map[astIdNum][stIdStr] = entry
  }
  return map
})

/**
 * Saves a manual overall grade override (adjusted grade) for a student.
 */
export async function adjustStudentGrade(studentId, adjustedGrade) {
  if (!activeClassRecord.value) return
  
  try {
    const student = activeClassRecord.value.students[studentId]
    if (!student) return
    
    const newVal = adjustedGrade === '' || adjustedGrade === null || isNaN(Number(adjustedGrade))
      ? null
      : Number(adjustedGrade)

    student.adjustedGrade = newVal

    // Force trigger because we are using shallowRef
    triggerRef(activeClassRecord)

    await classService.patchStudent(activeClassRecord.value.classId, studentId, { 
      adjustedGrade: newVal 
    })
    await refreshGrades()
  } catch (err) {
    console.error('[useGradebook] adjustStudentGrade failed:', err)
    const { alert } = useMessage()
    await alert('Failed to adjust student grade.')
  }
}

/**
 * Reverts an adjusted overall grade back to its calculated value.
 */
export async function undoStudentGradeAdjustment(studentId) {
  await adjustStudentGrade(studentId, null)
}
