/**
/**
 * src/composables/useClassroomState.js
 *
 * Holds the shared singleton reactive state for useClassroom and related composables
 * to prevent circular dependencies.
 */

import { ref, shallowRef, watch, triggerRef } from 'vue'

export const classList = shallowRef([])
export const archivedClasses = shallowRef([])
export const activeClass = shallowRef(null)
export const activeClassRecord = shallowRef(null)
export const suggestedClass = ref(null)
export const students = ref({})
export const behaviorCodes = shallowRef([])
export const gridSize = ref({ rows: 6, cols: 6 })
export const teacherName = ref('')
export const attendanceMode = ref('natural')
export const latenessGracePeriod = ref(5)
export const periodStartTimes = ref({})
export const showScannerButton = ref(false)
export const academicTerms = shallowRef([])
export const nonSchoolDays = shallowRef([])

export const isTestDay = ref(sessionStorage.getItem('isTestDay') === 'true')
watch(isTestDay, (val) => sessionStorage.setItem('isTestDay', String(val)))

export const activeStudentEvents = shallowRef([])
export const selectedYear = ref(localStorage.getItem('selectedYear') || '')
export const selectedSemester = ref(localStorage.getItem('selectedSemester') || '')
export const isScannerOpen = ref(false)
export const autoStartRFID = ref(localStorage.getItem('autoStartRFID') === 'true')
export const maxStudentsOut = ref(parseInt(localStorage.getItem('maxStudentsOut')) || 0)

watch(selectedYear, (val) => localStorage.setItem('selectedYear', val))
watch(selectedSemester, (val) => localStorage.setItem('selectedSemester', val))
watch(maxStudentsOut, (val) => localStorage.setItem('maxStudentsOut', val.toString()))
watch(autoStartRFID, (val) => localStorage.setItem('autoStartRFID', String(val)))

export const cloudModeEnabled = ref(false)
export const userCode = ref('')

export const activeSubjectId = ref(localStorage.getItem('activeSubjectId') || '')
watch(activeSubjectId, (val) => localStorage.setItem('activeSubjectId', val || ''), { flush: 'sync' })

export const teachingMode = ref(localStorage.getItem('teachingMode') || 'secondary')
watch(teachingMode, (val) => localStorage.setItem('teachingMode', val || 'secondary'), { flush: 'sync' })

/**
 * Keeps all 4 in-memory student references completely in lockstep:
 * 1. students.value (dashboard desk tiles)
 * 2. activeClass.value.students (classroom setup & logistics)
 * 3. activeClassRecord.value.students (gradebook & analytics)
 * 4. classList.value[c].students (class switcher & background timers)
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {Object} updates Map of student properties to merge
 */
export function syncStudentAcrossRefs(classId, studentId, updates) {
    if (!classId || !studentId || !updates) return

    if (students.value && students.value[studentId]) {
        Object.assign(students.value[studentId], updates)
    }
    if (activeClass.value?.classId === classId && activeClass.value?.students?.[studentId]) {
        Object.assign(activeClass.value.students[studentId], updates)
    }
    if (activeClassRecord.value?.classId === classId && activeClassRecord.value?.students?.[studentId]) {
        Object.assign(activeClassRecord.value.students[studentId], updates)
    }
    const clsInList = classList.value?.find(c => c.classId === classId)
    if (clsInList?.students?.[studentId]) {
        Object.assign(clsInList.students[studentId], updates)
    }

    triggerRef(students)
    triggerRef(activeClass)
    if (activeClassRecord.value) triggerRef(activeClassRecord)
    triggerRef(classList)
}



