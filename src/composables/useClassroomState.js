/**
/**
 * src/composables/useClassroomState.js
 *
 * Holds the shared singleton reactive state for useClassroom and related composables
 * to prevent circular dependencies.
 */

import { ref, shallowRef, watch } from 'vue'

export const classList = shallowRef([])
export const archivedClasses = shallowRef([])
export const activeClass = shallowRef(null)
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



