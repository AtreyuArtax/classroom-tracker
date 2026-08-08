/**
 * src/composables/useClassroom.js
 *
 * THE single source of reactive truth for the active class and its students.
 *
 * CLAUDE.md §4 rules (reactivity bridge):
 *  - After every write, update local reactive refs immediately — never re-fetch
 *  - Vue components NEVER import from src/db/ — they call composable functions
 *  - This is the only file allowed to import classService, eventService, settingsService
 *
 * Architecture:
 *   Component → useClassroom function → service function → IDB
 *                       ↓ (also immediately)
 *               reactive ref updated → Vue re-renders
 */

import { ref, shallowRef, computed, watch, triggerRef } from 'vue'
import * as classService from '../db/classService.js'
import * as eventService from '../db/eventService.js'
import { toMinutes } from '../db/eventService.js'
import * as settingsService from '../db/settingsService.js'
import { useUndo } from './useUndo.js'
import { useMessage } from './useMessage.js'
import { getDB } from '../db/index.js'
import { supabase } from '../utils/supabase.js'
import { autoPopulateAllElementarySubjects } from './useElementary.js'
import {
  moveStudentFromClass,
  removeStudent,
  archiveStudent,
  unarchiveStudent,
  permanentlyDeleteStudent,
  updateStudentNote,
  updateStudentParentContacts,
  assignSeat,
  autoAssignSeats
} from './useRosterOperations.js'
import {
  logAttendanceEvent,
  syncLateActiveState,
  reconcileStaleTrips,
  initializeRfidAttendance,
  handleRfidAttendanceScan,
  markAllPresentToday
} from './useAttendanceTracker.js'
import { activeSubCohortFilter } from './useGradebook.js'

const { push: pushUndo, clear: clearUndo } = useUndo()
let midnightTimer = null

import { 
  classList, 
  archivedClasses, 
  activeClass, 
  suggestedClass, 
  students, 
  behaviorCodes, 
  gridSize, 
  teacherName, 
  attendanceMode, 
  latenessGracePeriod, 
  periodStartTimes, 
  showScannerButton,
  academicTerms, 
  nonSchoolDays, 
  isTestDay, 
  activeStudentEvents, 
  selectedYear, 
  selectedSemester, 
  isScannerOpen, 
  autoStartRFID, 
  maxStudentsOut, 
  cloudModeEnabled, 
  userCode,
  activeSubjectId,
  teachingMode
} from './useClassroomState.js'

import { createDefaultElementarySubjects } from '../utils/elementarySubjects.js'


// ─── computed ─────────────────────────────────────────────────────────────────

/** Students sorted by last name for display in roster lists. Excludes archived students. */
const sortedRoster = computed(() =>
    Object.entries(students.value)
        .map(([studentId, s]) => ({ studentId, ...s }))
        .filter(s => !s.archived)
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
)

/** Archived students sorted by last name. */
const archivedRoster = computed(() =>
    Object.entries(students.value)
        .map(([studentId, s]) => ({ studentId, ...s }))
        .filter(s => s.archived)
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
)

/** Filtered class list based on global year/semester and teaching mode */
const filteredClassList = computed(() => {
    return classList.value.filter(c => {
        const matchesYear = !selectedYear.value || c.year === selectedYear.value
        const matchesSem  = !selectedSemester.value || teachingMode.value === 'elementary' || c.semester === selectedSemester.value
        const cType = c.classType || 'secondary'
        const matchesType = cType === teachingMode.value
        return matchesYear && matchesSem && matchesType
    })
})

/** Filtered archived classes */
const filteredArchivedClasses = computed(() => {
    return archivedClasses.value.filter(c => {
        const matchesYear = !selectedYear.value || c.year === selectedYear.value
        const matchesSem  = !selectedSemester.value || teachingMode.value === 'elementary' || c.semester === selectedSemester.value
        const cType = c.classType || 'secondary'
        const matchesType = cType === teachingMode.value
        return matchesYear && matchesSem && matchesType
    })
})




// ─── weekly stats ─────────────────────────────────────────────────────────────

/** @type {import('vue').Ref<{washroomTripsPerWeek: number, deviceIncidentsPerWeek: number, atRiskThreshold: number}>} */
const thresholds = ref({ washroomTripsPerWeek: 4, deviceIncidentsPerWeek: 3, atRiskThreshold: 50 })

/** @type {import('vue').Ref<Object>} Shape: { [studentId]: { washroomTrips: N, deviceIncidents: N } } */
const studentWeeklyStats = ref({})

async function computeWeeklyStats(classId, studentIds) {
    // Get Monday of current week
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    const fromISO = monday.toISOString()

    // Batch: single IDB query for the whole class instead of N per-student queries
    const allEvents = await eventService.getEventsByClass(classId, { from: fromISO })

    // Group in memory by studentId — O(events) instead of O(students * IDB round-trips)
    const eventsByStudent = {}
    for (const e of allEvents) {
        if (!eventsByStudent[e.studentId]) eventsByStudent[e.studentId] = []
        eventsByStudent[e.studentId].push(e)
    }

    const stats = {}
    for (const studentId of studentIds) {
        const events = eventsByStudent[studentId] || []
        stats[studentId] = {
            washroomTrips: events.filter(e => e.code === 'w').length,
            deviceIncidents: events.filter(e => e.category === 'redirect').length
        }
    }
    studentWeeklyStats.value = stats
}

/**
 * Universal Term Options for dropdowns.
 * Combines:
 * 1. Custom terms from Settings
 * 2. Standard terms for Prev, Current, and Next years
 * 3. Any terms found in existing classes
 */
const termOptions = computed(() => {
    const options = new Map() // Use Map to deduplicate by "year|semester"

    // Helper to add if not exists
    const add = (year, semester) => {
        if (!year || !semester) return
        const key = `${year}|${semester}`
        if (!options.has(key)) {
            options.set(key, { year, semester })
        }
    }

    // 1. Custom terms from DB
    academicTerms.value.forEach(t => add(t.year, t.semester))

    // 2. Terms from existing classes (Legacy Safety)
    classList.value.forEach(c => add(c.year, c.semester))
    archivedClasses.value.forEach(c => add(c.year, c.semester))

    // 3. Standard Smart Defaults (Prev, Current, Next)
    const nowCheck = new Date()
    const month = nowCheck.getMonth()
    const yearNum = nowCheck.getFullYear()
    const currentYearStart = (month >= 6) ? yearNum : yearNum - 1

    for (let y = currentYearStart - 1; y <= currentYearStart + 1; y++) {
        const yearStr = `${y}-${(y + 1).toString().slice(-2)}`
        add(yearStr, '1')
        add(yearStr, '2')
    }

    return Array.from(options.values()).sort((a, b) => {
        // Sort descending by Year, then Semester
        if (a.year !== b.year) return b.year.localeCompare(a.year)
        return b.semester.localeCompare(a.semester)
    })
})

const yearOptions = computed(() => {
    const years = new Set()
    termOptions.value.forEach(t => years.add(t.year))
    return Array.from(years).sort().reverse()
})


/**
 * Universal Period Options.
 * Based on keys in periodStartTimes.
 */
const periodOptionsList = computed(() => {
    return Object.keys(periodStartTimes.value)
        .map(Number)
        .sort((a, b) => a - b)
})

// ─── auto-suggest ─────────────────────────────────────────────────────────────

/**
 * Calculates if a class matches the current time boundary.
 */
function computeSuggestedClass() {
    if (teachingMode.value === 'elementary') {
        suggestedClass.value = null
        return null
    }

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    // Sort classes chronologically by start time, ignoring those without times
    const sortedClasses = filteredClassList.value
        .filter(c => !c.archived && c.periodStartTime)
        .sort((a, b) => {
            const timeA = a.periodStartTime.split(':').map(Number)
            const timeB = b.periodStartTime.split(':').map(Number)
            return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1])
        })

    if (sortedClasses.length === 0) {
        suggestedClass.value = null
        return null
    }

    let bestClass = null

    // Find the class that has most recently started
    // (iterate backwards from latest class to earliest)
    for (let i = sortedClasses.length - 1; i >= 0; i--) {
        const cls = sortedClasses[i]
        const [h, m] = cls.periodStartTime.split(':').map(Number)
        const classMinutes = h * 60 + m

        if (classMinutes <= currentMinutes) {
            bestClass = cls
            break
        }
    }

    // If no class has started yet today (currentMinutes < first class),
    // suggest the first class of the day.
    if (!bestClass) {
        bestClass = sortedClasses[0]
    }

    // Calculate diff for the banner (minutes until start, or negative if already started)
    const [h, m] = bestClass.periodStartTime.split(':').map(Number)
    const classMinutes = h * 60 + m
    const diff = classMinutes - currentMinutes

    const best = {
        classId: bestClass.classId,
        name: bestClass.name,
        periodNumber: bestClass.periodNumber,
        minutesUntil: diff
    }

    // Only suggest if it's not already the active class, AND hasn't been dismissed today
    if (best.classId !== activeClass.value?.classId && !hasBeenDismissedToday(best.classId)) {
        suggestedClass.value = best
    } else {
        suggestedClass.value = null
    }

    return bestClass
}

// Recompute whenever the class list changes once populated
watch(classList, (newList) => {
    if (newList && newList.length > 0) {
        computeSuggestedClass()
    }
}, { immediate: true })

// Reset test day flag when active class changes
watch(activeClass, () => {
    isTestDay.value = false
})

/** Students who currently have no assigned seat */
const unseatedStudents = computed(() =>
    sortedRoster.value.filter(s => s.seat === null)
)

/** Students who are currently out of the room */
const studentsOut = computed(() =>
    sortedRoster.value.filter(s => s.activeStates?.isOut === true)
)

/** Students who are currently out of the room across all classes */
const globalStudentsOut = computed(() => {
    // Bug 3 fix: explicitly reference students.value so Vue tracks deep mutations on
    // the active class's student states. classList uses a shallow ref so deep property
    // changes don't trigger recomputes on their own — this forces re-evaluation.
    void students.value
    const list = []
    classList.value.forEach(cls => {
        if (cls.students) {
            Object.entries(cls.students).forEach(([studentId, s]) => {
                if (!s.archived && s.activeStates?.isOut === true) {
                    list.push({ studentId, classId: cls.classId, className: cls.name, ...s })
                }
            })
        }
    })
    return list.sort((a, b) => a.lastName.localeCompare(b.lastName))
})

watch([globalStudentsOut, maxStudentsOut], async ([list, maxLimit]) => {
    if (cloudModeEnabled.value && userCode.value && supabase) {
        try {
            await supabase
                .from('room_status')
                .upsert({
                    user_code: userCode.value,
                    active_students_out: list.length,
                    max_students_out: maxLimit,
                    updated_at: new Date().toISOString()
                })
        } catch (err) {
            console.error('Failed to sync room status to Supabase:', err)
        }
    }
}, { deep: true, immediate: true })

// ─── suggestion dismissal tracking ────────────────────────────────────────────

// Map of date string -> array of classIds dismissed
const dismissedSuggestions = ref({})

function loadDismissedSuggestions() {
    try {
        const stored = sessionStorage.getItem('dismissedSuggestions')
        if (stored) {
            dismissedSuggestions.value = JSON.parse(stored)
        }
    } catch (e) {
        console.error('Failed to load dismissed suggestions', e)
    }
}

function saveDismissedSuggestions() {
    try {
        sessionStorage.setItem('dismissedSuggestions', JSON.stringify(dismissedSuggestions.value))
    } catch (e) {
        console.error('Failed to save dismissed suggestions', e)
    }
}

function hasBeenDismissedToday(classId) {
    const todayStr = new Date().toISOString().slice(0, 10)
    const list = dismissedSuggestions.value[todayStr] || []
    return list.includes(classId)
}

/**
 * Dismisses the current suggestion and prevents it from reappearing today.
 */
function dismissSuggestion() {
    if (!suggestedClass.value) return

    const classId = suggestedClass.value.classId
    const todayStr = new Date().toISOString().slice(0, 10)

    if (!dismissedSuggestions.value[todayStr]) {
        dismissedSuggestions.value[todayStr] = []
    }

    if (!dismissedSuggestions.value[todayStr].includes(classId)) {
        dismissedSuggestions.value[todayStr].push(classId)
        saveDismissedSuggestions()
    }

    suggestedClass.value = null
}

// ─── academic terms & non-school days ──────────────────────────────────────────

/**
 * Returns the date range for a given year and semester.
 * Priority:
 * 1. Custom defined academicTerm in DB
 * 2. Smart Default: Sem 1 = Sept 1 - Jan 31, Sem 2 = Feb 1 - June 30
 * 
 * @param {string} year e.g. "2025-26"
 * @param {string} semester "1", "2", or "Full"
 * @returns {{ start: Date, end: Date, isCustom: boolean }}
 */
function getTermRange(year, semester) {
    const term = academicTerms.value.find(t => t.year === year && t.semester === semester)
    
    if (term) {
        return {
            start: new Date(term.startDate + 'T00:00:00'),
            end: new Date(term.endDate + 'T23:59:59'),
            isCustom: true
        }
    }

    // Smart Defaults
    const startYear = parseInt(year.split('-')[0])
    let startDate, endDate

    if (semester === '1') {
        startDate = new Date(startYear, 8, 1) // Sept 1
        endDate = new Date(startYear + 1, 0, 31, 23, 59, 59) // Jan 31
    } else if (semester === '2') {
        startDate = new Date(startYear + 1, 1, 1) // Feb 1
        endDate = new Date(startYear + 1, 5, 30, 23, 59, 59) // June 30
    } else {
        // Full year fallback
        startDate = new Date(startYear, 8, 1)
        endDate = new Date(startYear + 1, 5, 30, 23, 59, 59)
    }

    return { start: startDate, end: endDate, isCustom: false }
}

async function refreshAcademicTerms() {
    academicTerms.value = await settingsService.getAcademicTerms()
}

async function refreshNonSchoolDays() {
    nonSchoolDays.value = await settingsService.getNonSchoolDays()
}

async function updateAcademicTerms(terms) {
    await settingsService.saveAcademicTerms(JSON.parse(JSON.stringify(terms)))
    academicTerms.value = terms
}

async function updateNonSchoolDays(days) {
    await settingsService.saveNonSchoolDays(JSON.parse(JSON.stringify(days)))
    nonSchoolDays.value = days
}

// ─── init ─────────────────────────────────────────────────────────────────────

/**
 * Load all classes + settings from IDB. Call once on app startup.
 * Activates the first class automatically if one exists.
 *
 * @returns {Promise<void>}
 */
async function init() {
    loadDismissedSuggestions()

    const [classes, codes, settings, terms, nsd] = await Promise.all([
        classService.getAllClasses(),
        settingsService.getBehaviorCodes(),
        settingsService.getSettings(),
        settingsService.getAcademicTerms(),
        settingsService.getNonSchoolDays()
    ])

    academicTerms.value = terms
    nonSchoolDays.value = nsd

    // Inject 'a' and 'l' if missing (migrating existing dbs smoothly)
    let codesUpdated = false
    const codesMap = Object.fromEntries(codes.map(c => [c.codeKey, c]))
    if (!codesMap.a) {
        settings.behaviorCodes.a = { icon: '🚫', label: 'Absent', category: 'absence', type: 'attendance', requiresNote: false }
        codesUpdated = true
    }
    if (!codesMap.l) {
        settings.behaviorCodes.l = { icon: '⏰', label: 'Late', category: 'late', type: 'attendance', requiresNote: false }
        codesUpdated = true
    }

    if (codesUpdated) {
        await settingsService.saveSettings(settings)
        behaviorCodes.value = await settingsService.getBehaviorCodes()
    } else {
        behaviorCodes.value = codes
    }

    const [active, archived] = _sortAndSplitClasses(classes)
    classList.value = active
    archivedClasses.value = archived
    
    // gridSize.value will be updated per-class in _activateClass
    // We store the global default from settings for new classes
    teacherName.value = settings.teacherName || ''
    attendanceMode.value = settings.attendanceMode || 'natural'
    latenessGracePeriod.value = settings.latenessGracePeriod !== undefined ? settings.latenessGracePeriod : 5
    showScannerButton.value = settings.showScannerButton !== undefined ? settings.showScannerButton : true
    cloudModeEnabled.value = settings.cloudModeEnabled || false
    userCode.value = settings.userCode || ''

    // ── Smart Heal: Period Start Times Migration ──
    let periodTimesChanged = false
    let currentPeriodTimes = settings.periodStartTimes || {
        '1': '08:00',
        '2': '09:20',
        '3': '11:40',
        '4': '13:00'
    }

    // Ensure any existing classes have their periods registered so they aren't lost from dropdowns
    classes.forEach(c => {
        const pNum = Number(c.periodNumber)
        if (!isNaN(pNum) && !currentPeriodTimes[pNum]) {
            currentPeriodTimes[pNum] = c.periodStartTime || '08:00'
            periodTimesChanged = true
        }
    })

    if (periodTimesChanged || !settings.periodStartTimes) {
        settings.periodStartTimes = currentPeriodTimes
        await settingsService.saveSettings(settings)
    }
    
    periodStartTimes.value = currentPeriodTimes

    // ── Determine default term ──
    const nowCheck = new Date()
    const nowISO = nowCheck.toISOString().split('T')[0]
    const currentTerm = terms.find(t => nowISO >= t.startDate && nowISO <= t.endDate)
    
    // Only auto-default if we don't already have a valid stored session
    if (!selectedYear.value || !selectedSemester.value) {
        if (currentTerm) {
            selectedYear.value = currentTerm.year
            selectedSemester.value = currentTerm.semester
        } else {
            // Smart Year Detection: If we are in July-Dec, it's the start of YYYY-(YYYY+1)
            // If Jan-June, it's the end of (YYYY-1)-YYYY
            const month = nowCheck.getMonth() // 0-indexed
            const yearNum = nowCheck.getFullYear()
            const yearStr = (month >= 6) ? `${yearNum}-${(yearNum + 1).toString().slice(-2)}` : `${yearNum - 1}-${yearNum.toString().slice(-2)}`
            const semStr = (month >= 1 && month <= 6) ? '2' : '1'

            selectedYear.value = yearStr
            selectedSemester.value = semStr
        }
    }

    if (autoStartRFID.value) {
        localStorage.setItem('scanner-mode', 'rfid')
        isScannerOpen.value = true
    }

    if (filteredClassList.value.length > 0) {
        // Try to find the best class for the current time within the filtered list
        const bestClassFromTime = computeSuggestedClass()
        if (bestClassFromTime && filteredClassList.value.some(c => c.classId === bestClassFromTime.classId)) {
            // Because it's a fresh boot, load this optimal class directly
            await _activateClass(bestClassFromTime)
            suggestedClass.value = null // Clear suggestion since we are now on it
            return
        }

        // Fallback to the first class in the filtered list
        await _activateClass(filteredClassList.value[0])
    } else {
        activeClass.value = null
        students.value = {}
    }
}


/**
 * Watch for changes to global filters and auto-switch class if needed.
 */
watch([selectedYear, selectedSemester, teachingMode], async () => {
    if (!activeClass.value) {
        if (filteredClassList.value.length > 0) {
            await _activateClass(filteredClassList.value[0])
        }
        return
    }
    
    // Check if current active class fits the new filtered list (year, semester, teachingMode)
    const isCurrentActiveValid = filteredClassList.value.some(c => c.classId === activeClass.value.classId)
    if (isCurrentActiveValid) return
    
    // Otherwise, switch to the first class in the newly filtered list, or reset active class
    if (filteredClassList.value.length > 0) {
        await _activateClass(filteredClassList.value[0])
    } else {
        activeClass.value = null
        students.value = {}
    }
})


// ─── class management ─────────────────────────────────────────────────────────

/**
 * Switch the active class. Clears undo stack on switch.
 *
 * @param {string} classId
 * @returns {Promise<void>}
 */
async function switchClass(classId) {
    const cls = await classService.getClass(classId)
    if (!cls) return
    clearUndo()
    suggestedClass.value = null // clear suggestion on manual switch
    await _activateClass(cls)
}

/**
 * Create a new class and switch to it.
 *
 * @param {{ classId: string, name: string, periodNumber: number, periodStartTime: string }} opts
 * @returns {Promise<void>}
 */
async function createClass(opts) {
    // 1. Determine current academic term
    const terms = await settingsService.getAcademicTerms()
    const nowCheck = new Date()
    const nowISO = nowCheck.toISOString().split('T')[0]
    const currentTerm = terms.find(t => nowISO >= t.startDate && nowISO <= t.endDate)
    
    let year = opts.year || currentTerm?.year
    let semester = opts.classType === 'elementary' ? '1' : (opts.semester || currentTerm?.semester)

    if (!year || !semester) {
        const month = nowCheck.getMonth()
        const yearNum = nowCheck.getFullYear()
        year = (month >= 6) ? `${yearNum}-${(yearNum + 1).toString().slice(-2)}` : `${yearNum - 1}-${yearNum.toString().slice(-2)}`
        semester = '1'
    }

    // 2. Use global default grid size as template
    const settings = await settingsService.getSettings()
    const defaultGrid = settings.gridSize || { rows: 6, cols: 6 }
    const defaultStartTime = periodStartTimes.value[opts.periodNumber] || '08:00'

    const classType = opts.classType || 'secondary'
    const subjects = classType === 'elementary'
        ? (opts.subjects && opts.subjects.length > 0 ? opts.subjects : createDefaultElementarySubjects())
        : []

    const newCls = {
        classId: opts.classId,
        name: opts.name,
        courseCode: opts.courseCode || '',
        gradeLevel: opts.gradeLevel || '',
        periodNumber: opts.periodNumber || 1,
        periodStartTime: opts.periodStartTime ?? defaultStartTime,
        year,
        semester,
        gridSize: defaultGrid,
        classType,
        subjects,
        gradebookUnits: [],
        gradebookCategories: [
            { categoryId: `cat_asmt_${Date.now()}`, name: 'Assessments', weight: 60 },
            { categoryId: `cat_act_${Date.now()}`, name: 'Activities', weight: 10 },
            { categoryId: `cat_culm_${Date.now()}`, name: 'Culminating', weight: 15 },
            { categoryId: `cat_exam_${Date.now()}`, name: 'Final Exam', weight: 15 }
        ],
        students: {},
    }

    const finalCls = autoPopulateAllElementarySubjects(newCls)

    if (classType === 'elementary' && finalCls.subjects && finalCls.subjects.length > 0) {
        activeSubjectId.value = finalCls.subjects[0].subjectId
    }

    await classService.saveClass(finalCls)
    classList.value = [...classList.value, finalCls]
    await _activateClass(finalCls)
}

/**
 * Update any plain fields (name, periodNumber, periodStartTime) on the active class.
 * Reads a fresh plain object from IDB first to avoid spreading a Vue reactive Proxy
 * into db.put() — which can fail silently due to structured-clone incompatibilities
 * with Vue's proxy internals.
 *
 * @param {Object} updates  Partial { name, periodNumber, periodStartTime, … }
 * @returns {Promise<void>}
 */
async function updateActiveClass(updates) {
    const classId = activeClass.value?.classId
    if (!classId) return

    // Fetch a fresh PLAIN object from IDB (not the reactive proxy)
    const fresh = await classService.getClass(classId)
    if (!fresh) return

    // Subject-specific settings when in Elementary mode
    const SUBJECT_KEYS = ['gradingFramework', 'sbarAlgorithm', 'sbarInputMode', 'gradebookCategories', 'gradebookUnits', 'expectations']
    const hasSubjectKeys = Object.keys(updates).some(k => SUBJECT_KEYS.includes(k))

    if (fresh.classType === 'elementary' && hasSubjectKeys) {
        const curSubId = activeSubjectId.value || fresh.subjects?.[0]?.subjectId
        if (fresh.subjects && fresh.subjects.length > 0) {
            const subIdx = fresh.subjects.findIndex(s => s.subjectId === curSubId)
            const targetIdx = subIdx >= 0 ? subIdx : 0
            for (const key of SUBJECT_KEYS) {
                if (key in updates) {
                    fresh.subjects[targetIdx][key] = updates[key]
                }
            }
        }
    }

    // Apply updates on top of the plain record
    let updated = { ...fresh, ...updates }
    if (updated.classType === 'elementary') {
        updated = autoPopulateAllElementarySubjects(updated)
    }
    await classService.saveClass(updated)

    // Patch only the changed keys in reactive state — don't replace the whole object
    // to preserve Vue's tracking of nested students mutations
    for (const [key, val] of Object.entries(updates)) {
        activeClass.value[key] = val
        const cls = classList.value.find(c => c.classId === classId)
        if (cls) cls[key] = val

        // Special case: if gridSize is updated, sync the global ref
        if (key === 'gridSize') {
            gridSize.value = val
        }
    }
    if (fresh.classType === 'elementary' && hasSubjectKeys) {
        activeClass.value.subjects = fresh.subjects
    }
    triggerRef(activeClass)
}

// ─── roster import ────────────────────────────────────────────────────────────

/**
 * Import a list of students from a CSV/Parsed array into a specific class.
 *
 * @param {Array} parsedRows - Array of { studentId, firstName, lastName, ... }
 * @param {string} [targetClassId] - Optional class ID to import into (defaults to active)
 * @returns {Promise<{ inserted: number, updated: number, skipped: Array, crossClassConflicts: Array }>}
 */
async function importRoster(parsedRows, targetClassId = null) {
    const classId = targetClassId || activeClass.value?.classId
    if (!classId) throw new Error('No class selected')

    const cls = classList.value.find(c => c.classId === classId)
    if (!cls) throw new Error('Target class not found')

    const skipped = []
    const crossClassConflicts = []
    const validRows = []

    // Detect rows missing studentId (CLAUDE.md §6)
    for (const row of parsedRows) {
        if (!row.studentId) {
            skipped.push({ studentId: null, reason: 'Missing Student ID' })
            continue
        }

        // Check if ID exists in a different class
        const existingClass = classList.value.find(
            c => c.classId !== classId && c.students?.[row.studentId]
        )
        if (existingClass) {
            crossClassConflicts.push({
                studentId: row.studentId,
                existingClassId: existingClass.classId,
                student: row,
            })
            continue
        }

        validRows.push(row)
    }

    // Write valid rows to IDB
    const { inserted, updated } = await classService.importRoster(classId, validRows)

    // Update local reactive state
    const isActive = classId === activeClass.value?.classId
    for (const row of validRows) {
        const { studentId, firstName, lastName } = row
        
        if (!cls.students) cls.students = {}
        
        const rawG = (row.gradeLevel || row.grade || '').toString().trim()
        const parsedG = rawG ? (rawG.toLowerCase().startsWith('grade') ? rawG : `Grade ${parseInt(rawG, 10) || rawG}`) : ''

        if (cls.students[studentId]) {
            const updatedSt = { ...row, gradeLevel: parsedG || cls.students[studentId].gradeLevel }
            Object.assign(cls.students[studentId], updatedSt)
            if (isActive && students.value[studentId]) {
                Object.assign(students.value[studentId], updatedSt)
            }
        } else {
            const newSt = {
                firstName,
                lastName,
                gradeLevel: parsedG,
                parentContacts: row.parentContacts || [],
                studentEmail: row.studentEmail || '',
                custody: row.custody || '',
                livingWith: row.livingWith || '',
                birthDate: row.birthDate || '',
                seat: null,
                generalNote: '',
                activeStates: { isOut: false, outTime: null },
                excludeFromAnalytics: false,
            }
            cls.students[studentId] = newSt
            if (isActive) {
                students.value[studentId] = JSON.parse(JSON.stringify(newSt))
            }
        }
    }

    if (classId === activeClass.value?.classId) {
        triggerRef(students)
        triggerRef(activeClass)
    }
    return { inserted, updated, skipped, crossClassConflicts }
}

/**
 * Bulk import multiple classes and rosters from grouped data.
 * All classes and student records are created/updated in a SINGLE database transaction.
 * 
 * @param {Array<{ name, year, semester, periodNumber, students: Array }>} groups
 */
async function bulkImportClasses(groups) {
    await classService.bulkImportClasses(groups)
    await _reloadClasses()
}

/**
 * Helper to sort and split classes into active/archived arrays.
 */
function _sortAndSplitClasses(classes) {
    const active = classes.filter(c => !c.archived).sort((a, b) => {
        const yearA = a.year || '', yearB = b.year || ''
        if (yearA > yearB) return -1
        if (yearA < yearB) return 1
        const semA = a.semester || '', semB = b.semester || ''
        if (semA > semB) return -1
        if (semA < semB) return 1
        return (a.periodNumber || 0) - (b.periodNumber || 0)
    })
    const archived = classes.filter(c => c.archived)
    return [active, archived]
}

/**
 * Re-fetches all classes from DB and updates reactive singleton state.
 */
async function _reloadClasses() {
    const classes = await classService.getAllClasses()
    const [active, archived] = _sortAndSplitClasses(classes)
    classList.value = active
    archivedClasses.value = archived
    
    // If the active class was updated in the background, refresh its reference
    if (activeClass.value) {
        const fresh = active.find(c => c.classId === activeClass.value.classId)
        if (fresh) {
            // We use Object.assign to keep the same reactive proxy reference
            // but update its contents to match the new DB state.
            Object.assign(activeClass.value, fresh)
            students.value = JSON.parse(JSON.stringify(fresh.students || {}))
        }
    } else if (active.length > 0) {
        activeClass.value = active[0]
        students.value = JSON.parse(JSON.stringify(active[0].students || {}))
    }
}

// ─── roster operations (moved to useRosterOperations.js) ─────────────────────

// ─── event logging ────────────────────────────────────────────────────────────



/**
 * Helper for Student 360 "Red A" badges.
 * Checks if a student was absent or late on a specific date.
 *
 * @param {string} studentId
 * @param {string|Date} date  The date to check (YYYY-MM-DD or Date object)
 * @returns {Promise<{ isAbsent: boolean, isLate: boolean, lateMs: number|null }>}
 */
async function getAttendanceOnDate(studentId, date) {
    const dayStr = (typeof date === 'string') ? date.slice(0, 10) : date.toISOString().slice(0, 10)
    const events = await eventService.getEventsByStudent(studentId, { from: dayStr, to: dayStr })
    
    const absent = events.find(e => e.code === 'a' && !e.superseded)
    const late   = events.find(e => e.code === 'l')

    return {
        isAbsent:    !!absent,
        isLate:      !!late,
        lateMs:      late ? late.duration : null
    }
}

/**
 * Returns all behavior and attendance events for a student.
 * Also synchronizes the reactive activeStudentEvents singleton.
 */
async function getStudentEventHistory(studentId) {
    const evs = await eventService.getEventsByStudent(studentId)
    activeStudentEvents.value = evs
    return evs
}



/**
 * Log a standard (non-toggle) behavior event via the radial menu selection.
 * Follows CLAUDE.md §8 (event write procedure delegated to eventService.logEvent).
 *
 * @param {string} studentId
 * @param {string} code  The behavior code key
 * @param {string|null} [note]  Optional note text (from EventNoteModal for requiresNote codes)
 * @param {Object} [options]  Optional settings like { timestamp }
 * @returns {Promise<void>}
 */
async function logStandardEvent(studentId, code, note = null, options = {}) {
    try {
        const classId = activeClass.value?.classId
        const eventId = await eventService.logEvent({ 
            studentId, 
            classId, 
            code, 
            note,
            testDay: isTestDay.value,
            _overrideTimestamp: options.timestamp 
        })

        // Reactive update: store last event for desk tile flash
        students.value[studentId].lastEvent = { code, ts: Date.now() }

        // Update event history immediately to reflect in UI (e.g. Student 360 Timeline)
        await getStudentEventHistory(studentId)

        // Optimistic update for stats dot
        const category = behaviorCodes.value.find(c => c.codeKey === code)?.category
        if (code === 'w' || category === 'redirect') {
            const current = studentWeeklyStats.value[studentId] || { washroomTrips: 0, deviceIncidents: 0 }
            studentWeeklyStats.value[studentId] = {
                washroomTrips: code === 'w' ? current.washroomTrips + 1 : current.washroomTrips,
                deviceIncidents: category === 'redirect' ? current.deviceIncidents + 1 : current.deviceIncidents
            }
        }

        pushUndo(async () => {
            try {
                await eventService.deleteEvent(eventId)
                students.value[studentId].lastEvent = null

                if (code === 'w' || category === 'redirect') {
                    const current = studentWeeklyStats.value[studentId] || { washroomTrips: 0, deviceIncidents: 0 }
                    studentWeeklyStats.value[studentId] = {
                        washroomTrips: code === 'w' ? Math.max(0, current.washroomTrips - 1) : current.washroomTrips,
                        deviceIncidents: category === 'redirect' ? Math.max(0, current.deviceIncidents - 1) : current.deviceIncidents
                    }
                }
            } catch (err) {
                console.error('Undo standard event failed:', err)
                const { alert } = useMessage()
                await alert('Failed to undo event.')
            }
        })
    } catch (err) {
        console.error('logStandardEvent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save event. Please try again.')
    }
}

async function logAssessmentEvent({ studentId, note, acType, acContext, acOutcome, unitId, expectationId, nextSteps }) {
    try {
        const classId = activeClass.value?.classId
        const code = 'ac'
        
        const eventId = await eventService.logEvent({ 
            studentId, 
            classId, 
            code, 
            note,
            acType,
            acContext,
            acOutcome,
            unitId,
            expectationId,
            nextSteps,
            testDay: isTestDay.value
        })

        // Reactive update
        const newEvt = {
            eventId,
            studentId,
            classId,
            code,
            note,
            acType,
            acContext,
            acOutcome,
            unitId,
            expectationId,
            nextSteps,
            testDay: isTestDay.value,
            timestamp: new Date().toISOString()
        }
        activeStudentEvents.value = [newEvt, ...activeStudentEvents.value]
        if (students.value[studentId]) {
            students.value[studentId].lastEvent = { code, ts: Date.now() }
        }

        pushUndo(async () => {
            try {
                await eventService.deleteEvent(eventId)
                activeStudentEvents.value = activeStudentEvents.value.filter(e => String(e.eventId) !== String(eventId))
                if (students.value[studentId]) {
                    students.value[studentId].lastEvent = null
                }
            } catch (err) {
                console.error('Undo assessment event failed:', err)
                const { alert } = useMessage()
                await alert('Failed to undo assessment log.')
            }
        })
    } catch (err) {
        console.error('logAssessmentEvent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save assessment observation.')
    }
}

/**
 * Toggle a washroom (or other toggle-type) event.
 * Follows CLAUDE.md §7 toggle rules and §9 undo closure rules.
 *
 * @param {string} studentId
 * @param {string} code  The toggle behavior code key
 * @returns {Promise<void>}
 */
// ─── stale trips & RFID attendance (moved to useAttendanceTracker.js) ────────

/**
 * Toggle a washroom (or other toggle-type) event.
 * Follows CLAUDE.md §7 toggle rules and §9 undo closure rules.
 *
 * @param {string} studentId
 * @param {string} code  The toggle behavior code key
 * @param {string} [targetClassId] Optional target class ID
 * @returns {Promise<void>}
 */
async function logToggleEvent(studentId, code, targetClassId = null) {
    try {
        const reconciled = await reconcileStaleTrips()

        const classId = targetClassId || activeClass.value?.classId
        if (!classId) return

        if (reconciled.has(`${classId}-${studentId}`)) {
            return
        }

        const isActive = classId === activeClass.value?.classId
        const clsObj = isActive ? activeClass.value : classList.value.find(c => c.classId === classId)
        if (!clsObj) return

        const student = clsObj.students[studentId]
        if (!student) return

        const currentState = student.activeStates || { isOut: false, outTime: null }

        if (!currentState.isOut) {
            // ── Toggle OUT ───────────────────────────────────────────────────────────
            const outTime = new Date().toISOString()
            const newState = { isOut: true, outTime, code }

            await classService.setStudentActiveState(classId, studentId, newState)
            student.activeStates = newState
            student.lastEvent = { code, ts: Date.now() }

            if (isActive) {
                students.value[studentId].activeStates = newState
                students.value[studentId].lastEvent = { code, ts: Date.now() }
            }

            // Undo: clear the active state (no event was written for OUT, only state)
            pushUndo(async () => {
                try {
                    await classService.clearStudentActiveState(classId, studentId)
                    student.activeStates = { isOut: false, outTime: null }
                    if (isActive) {
                        students.value[studentId].activeStates = { isOut: false, outTime: null }
                    }
                } catch (err) {
                    console.error('Undo toggle OUT failed:', err)
                    const { alert } = useMessage()
                    await alert('Failed to undo room exit.')
                }
            })
        } else {
            // ── Toggle IN ────────────────────────────────────────────────────────────
            // capture outTime BEFORE writing the IN event
            const originalOutTime = currentState.outTime
            const durationMs = Date.now() - new Date(originalOutTime).getTime()

            const eventId = await eventService.logEvent({
                studentId,
                classId,
                code,
                duration: durationMs,
                testDay: isTestDay.value,
            })

            await classService.clearStudentActiveState(classId, studentId)
            
            const newState = { isOut: false, outTime: null }
            student.activeStates = newState
            student.lastEvent = { code, ts: Date.now() }

            if (isActive) {
                students.value[studentId].activeStates = newState
                students.value[studentId].lastEvent = { code, ts: Date.now() }
            }

            // Optimistic update for stats dot
            if (code === 'w') {
                const current = studentWeeklyStats.value[studentId] || { washroomTrips: 0, deviceIncidents: 0 }
                if (isActive) {
                    studentWeeklyStats.value[studentId] = {
                        ...current,
                        washroomTrips: current.washroomTrips + 1,
                    }
                }
            }

            // Undo: restore the exact original state (with original outTime) + delete event
            pushUndo(async () => {
                try {
                    const restoredState = { isOut: true, outTime: originalOutTime }
                    await classService.setStudentActiveState(classId, studentId, restoredState)
                    await eventService.deleteEvent(eventId)
                    
                    student.activeStates = restoredState
                    student.lastEvent = null

                    if (isActive) {
                        students.value[studentId].activeStates = restoredState
                        students.value[studentId].lastEvent = null
                    }

                    if (code === 'w' && isActive) {
                        const current = studentWeeklyStats.value[studentId] || { washroomTrips: 0, deviceIncidents: 0 }
                        studentWeeklyStats.value[studentId] = {
                            ...current,
                            washroomTrips: Math.max(0, current.washroomTrips - 1),
                        }
                    }
                } catch (err) {
                    console.error('Undo toggle IN failed:', err)
                    const { alert } = useMessage()
                    await alert('Failed to undo room return.')
                }
            })
        }
    } catch (err) {
        console.error('logToggleEvent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to process room entry/exit.')
    }
}

/**
 * Update an existing event and sync reactive state.
 */
async function editEvent(eventId, updates) {
    const db = await getDB()
    const original = await db.get('events', eventId)
    if (!original) return

    await eventService.updateEvent(eventId, updates)

    // Sync reactive stats if duration or code changed
    if (updates.duration !== undefined || updates.code !== undefined) {
        await computeWeeklyStats(activeClass.value.classId, Object.keys(students.value))
    }

    // Reactively update the active student events list if this event is in it
    activeStudentEvents.value = activeStudentEvents.value.map(e => 
        String(e.eventId) === String(eventId) ? { ...e, ...updates } : e
    )

    // Special case: if it was a late event from today, sync active state
    if (original.code === 'l' && updates.duration !== undefined) {
        await syncLateActiveState(original.classId, original.studentId, original.duration, updates.duration, original.timestamp)
    }
}

/**
 * Remove an event and sync reactive state.
 */
async function removeEvent(eventId) {
    const db = await getDB()
    const original = await db.get('events', eventId)
    if (!original) return

    await eventService.deleteEvent(eventId)

    // Sync reactive stats
    await computeWeeklyStats(activeClass.value.classId, Object.keys(students.value))

    // Special case: if it was the active late/absent state, clear it
    const st = students.value[original.studentId]
    if (st && st.activeStates) {
        if (original.code === 'a' && st.activeStates.isAbsent) {
            await classService.clearStudentAbsent(original.classId, original.studentId)
            st.activeStates.isAbsent = false
        } else if (original.code === 'l' && st.activeStates.lateMs === original.duration) {
            await classService.clearStudentLate(original.classId, original.studentId)
            st.activeStates.lateMs = null
        }
    }

    // Reactively remove from the active events list
    activeStudentEvents.value = activeStudentEvents.value.filter(e => String(e.eventId) !== String(eventId))
}

async function updateStudentIEP(studentId, hasIEP) {
    const classId = activeClass.value?.classId
    if (!classId) return
    await classService.updateStudentIEP(classId, studentId, hasIEP)
    if (students.value[studentId]) {
        students.value[studentId].hasIEP = Boolean(hasIEP)
    }
}

// ─── grid resize ──────────────────────────────────────────────────────────────

/**
 * Attempt to resize the grid.
 * CLAUDE.md §11: warns if seated students would fall outside new bounds.
 *
 * @param {{ rows: number, cols: number }} newSize
 * @returns {{ affected: Array<Object> }}
 *   Returns the list of students that would be displaced.
 *   The caller must present a confirm dialog and call confirmResize() if approved.
 */
function checkResize(newSize) {
    const affected = Object.entries(students.value)
        .filter(([, s]) => {
            if (!s.seat) return false
            return s.seat.row > newSize.rows || s.seat.col > newSize.cols
        })
        .map(([studentId, s]) => ({ studentId, ...s }))
    return { affected }
}

/**
 * Apply the grid resize. Move affected students to the unassigned pool.
 * Only call after the teacher has confirmed via the dialog.
 *
 * @param {{ rows: number, cols: number }} newSize
 * @returns {Promise<void>}
 */
async function confirmResize(newSize) {
    const { affected } = checkResize(newSize)
    const classId = activeClass.value?.classId
    if (!classId) return

    for (const s of affected) {
        await classService.updateStudentSeat(classId, s.studentId, null)
        students.value[s.studentId].seat = null
    }

    // Save to the ACTIVE CLASS
    await updateActiveClass({ gridSize: newSize })
}

// ─── settings ─────────────────────────────────────────────────────────────────

/**
 * Reload behavior codes from settings (called after Setup view edits codes).
 */
async function reloadBehaviorCodes() {
    behaviorCodes.value = await settingsService.getBehaviorCodes()
}

/**
 * Update the global teacher name.
 */
async function updateTeacherName(name) {
    await settingsService.saveTeacherName(name)
    teacherName.value = name
}

/**
 * Update the default period start times.
 */
async function updatePeriodStartTimes(times) {
    await settingsService.savePeriodStartTimes(times)
    periodStartTimes.value = times
}

/**
 * Update the global attendance configuration.
 */
async function updateAttendanceConfig(mode, gracePeriod) {
    await settingsService.saveAttendanceConfig({ mode, gracePeriod })
    attendanceMode.value = mode
    latenessGracePeriod.value = gracePeriod
    if (mode === 'rfid') {
        for (const cls of classList.value) {
            await initializeRfidAttendance(cls.classId)
        }
    }
}

/**
 * Update global show scanner button preference.
 */
async function updateShowScannerButton(enabled) {
    showScannerButton.value = enabled
    const settings = await settingsService.getSettings()
    settings.showScannerButton = enabled
    await settingsService.saveSettings(settings)
}

/**
 * Update the global cloud configuration.
 */
async function updateCloudConfig(enabled, code) {
    const settings = await settingsService.getSettings()
    settings.cloudModeEnabled = enabled
    settings.userCode = code
    await settingsService.saveSettings(settings)
    cloudModeEnabled.value = enabled
    userCode.value = code
}

/**
 * Auto-generates a unique, short TV-pairing-style user code.
 * Excludes confusing characters (0, O, 1, I, L) and checks uniqueness in Supabase if online.
 */
async function generateUniqueUserCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let unique = false
    let code = ''
    
    while (!unique) {
        code = ''
        for (let i = 0; i < 6; i++) {
            if (i === 3) code += '-'
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        
        if (!supabase) {
            unique = true
            break
        }
        
        try {
            const { data, error } = await supabase
                .from('room_status')
                .select('user_code')
                .eq('user_code', code)
            
            if (error) {
                console.warn('Error checking user_code uniqueness in Supabase:', error)
                unique = true
            } else if (!data || data.length === 0) {
                unique = true
            }
        } catch (err) {
            console.warn('Failed to check code uniqueness, assuming unique:', err)
            unique = true
        }
    }
    
    return code
}

/**
 * Marks all students in a class present for today by superseding today's 'a' and 'l' events


/**
 * Archive (soft-delete) a class. Hides it from classList, saves archived flag to IDB.
 * If the archived class was active, switches to the first remaining class (or null).
 */
async function archiveClass(classId) {
    await classService.archiveClass(classId)
    const cls = classList.value.find(c => c.classId === classId)
    if (cls) {
        cls.archived = true
        classList.value = classList.value.filter(c => c.classId !== classId)
        archivedClasses.value = [...archivedClasses.value, cls]
    }
    if (activeClass.value?.classId === classId) {
        if (classList.value.length > 0) {
            await _activateClass(classList.value[0])
        } else {
            activeClass.value = null
            students.value = {}
        }
    }
}

/**
 * Restore an archived class back to the active list.
 */
async function restoreClass(classId) {
    await classService.restoreClass(classId)
    const cls = archivedClasses.value.find(c => c.classId === classId)
    if (cls) {
        cls.archived = false
        archivedClasses.value = archivedClasses.value.filter(c => c.classId !== classId)
        classList.value = [...classList.value, cls]
    }
}

/**
 * Permanently delete a class. Only call on already-archived classes.
 * Event history is retained (orphaned events remain in the events store).
 */
async function deleteClass(classId) {
    await classService.deleteClass(classId)
    archivedClasses.value = archivedClasses.value.filter(c => c.classId !== classId)
}

// ─── private helpers ──────────────────────────────────────────────────────────

async function _activateClass(cls) {
    // Reconcile same-day stale trips across all classes
    await reconcileStaleTrips()

    // Initialize RFID attendance if active class matches
    if (attendanceMode.value === 'rfid') {
        await initializeRfidAttendance(cls.classId)
    }

    // Reconcile stale activeStates from previous days before activating
    const todayStr = new Date().toISOString().slice(0, 10)
    const eventsToday = await eventService.getEventsByClass(cls.classId, { from: todayStr, to: todayStr })

    let needsSave = false
    for (const [studentId, student] of Object.entries(cls.students ?? {})) {
        const states = student.activeStates
        if (!states) continue

        // Check for stale attendance (absent/late but no event today)
        if (states.isAbsent || states.lateMs != null) {
            const hasAtt = eventsToday.some(e => e.studentId === studentId && (e.code === 'a' || e.code === 'l'))
            if (!hasAtt) {
                states.isAbsent = false
                states.lateMs = null
                needsSave = true
            }
        }

        // Check for stale out-of-room state (left the room yesterday and never returned)
        if (states.isOut && states.outTime) {
            if (!states.outTime.startsWith(todayStr)) {
                const originalOutTime = states.outTime
                const dateOnly = originalOutTime.slice(0, 10)
                const existing = await eventService.getEventsByStudent(studentId, { from: dateOnly, to: dateOnly })
                const isAlreadyLogged = existing.some(e => e.timestamp === originalOutTime)

                if (!isAlreadyLogged) {
                    // Retroactively log the forgotten trip as 5 minutes on the day it occurred
                    const FIVE_MINUTES_MS = 5 * 60 * 1000
                    await eventService.logEvent({
                        studentId,
                        classId: cls.classId,
                        code: states.code || 'w', 
                        duration: FIVE_MINUTES_MS,
                        _overrideTimestamp: originalOutTime
                    })
                }

                states.isOut = false
                states.outTime = null
                states.code = null
                needsSave = true
            }
        }
    }

    if (needsSave) {
        await classService.saveClass(cls)
    }

    // Load class-specific grid size, falling back to global settings if missing
    if (cls.gridSize) {
        gridSize.value = cls.gridSize
    } else {
        const settings = await settingsService.getSettings()
        gridSize.value = settings.gridSize || { rows: 6, cols: 6 }
        cls.gridSize = { ...gridSize.value }
    }

    activeClass.value = cls
    // Deep-copy students map so Vue can track nested mutations
    students.value = JSON.parse(JSON.stringify(cls.students ?? {}))
    
    // Reset sub-cohort filter on class switch so new class isn't accidentally filtered by previous class's sub-cohort
    activeSubCohortFilter.value = 'all'

    thresholds.value = await settingsService.getThresholds()
    await computeWeeklyStats(cls.classId, Object.keys(cls.students ?? {}))
}

// ─── export ───────────────────────────────────────────────────────────────────
export function useClassroom() {
    return {
        // state
        classList,
        archivedClasses,
        activeClass,
        suggestedClass,
        students,
        studentWeeklyStats,
        thresholds,
        behaviorCodes,
        gridSize,
        isTestDay,
        activeStudentEvents,
        
        // Year/Semester context
        selectedYear,
        selectedSemester,
        academicTerms,
        nonSchoolDays,
        teacherName,
        attendanceMode,
        latenessGracePeriod,
        periodStartTimes,
        showScannerButton,
        isScannerOpen,
        autoStartRFID,
        maxStudentsOut,
        filteredClassList,
        filteredArchivedClasses,
        teachingMode,
        // computed


        sortedRoster,
        archivedRoster,
        unseatedStudents,
        studentsOut,
        globalStudentsOut,
        // actions
        init: async () => {
            await init()
            _scheduleMidnightReset()
        },
        switchClass,
        getClass: async (classId) => await classService.getClass(classId),
        createClass,
        updateActiveClass,
        importRoster,
        moveStudentFromClass,
        removeStudent,
        archiveStudent,
        unarchiveStudent,
        permanentlyDeleteStudent,
        assignSeat,
        autoAssignSeats,
        computeSuggestedClass,
        logAttendanceEvent,
        syncLateActiveState,
        logStandardEvent,
        logToggleEvent,
        reconcileStaleTrips,
        logAssessmentEvent,
        getAttendanceOnDate,
        getStudentEventHistory,
        editEvent,
        removeEvent,
        checkResize,
        updateStudentNote,
        updateStudentParentContacts,
        updateStudentIEP,
        confirmResize,
        reloadBehaviorCodes,
        refreshAcademicTerms,
        refreshNonSchoolDays,
        updateAcademicTerms,
        updateNonSchoolDays,
        updateTeacherName,
        updatePeriodStartTimes,
        updateAttendanceConfig,
        updateShowScannerButton,
        markAllPresentToday,
        handleRfidAttendanceScan,
        initializeRfidAttendance,
        archiveClass,
        restoreClass,
        deleteClass,
        dismissSuggestion,
        bulkImportClasses,
        getTermRange,
        termOptions,
        yearOptions,
        periodOptions: periodOptionsList,
        triggerActiveClass: () => triggerRef(activeClass),
        cloudModeEnabled,
        userCode,
        updateCloudConfig,
        generateUniqueUserCode
    }
}

/** Midnight reset scheduler for isTestDay and stale states */
function _scheduleMidnightReset() {
    if (midnightTimer) clearTimeout(midnightTimer)
    
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
    const msToMidnight = midnight.getTime() - now.getTime()

    midnightTimer = setTimeout(async () => {
        isTestDay.value = false
        if (activeClass.value) {
            try {
                await _activateClass(activeClass.value)
            } catch (err) {
                console.error('Midnight active class refresh failed:', err)
            }
        }
        _scheduleMidnightReset()
    }, msToMidnight)
}
