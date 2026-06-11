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

const { push: pushUndo, clear: clearUndo } = useUndo()
let midnightTimer = null

// ─── module-level singleton reactive state ────────────────────────────────────

/** @type {import('vue').Ref<Array<Object>>} Non-archived classes (for ClassSwitcher & Dashboard) */
const classList = ref([])

/** @type {import('vue').Ref<Array<Object>>} Archived (hidden) class records */
const archivedClasses = ref([])

/** @type {import('vue').Ref<Object|null>} The currently active class record */
const activeClass = shallowRef(null)

/** @type {import('vue').Ref<{ classId: string, name: string, periodNumber: number, minutesUntil: number }|null>} Suggested class based on time of day */
const suggestedClass = ref(null)

/**
 * Reactive student map for the active class.
 * Shape: { [studentId]: { firstName, lastName, seat, activeStates } }
 * @type {import('vue').Ref<Object>}
 */
const students = ref({})

/**
 * Available behavior codes (from settings).
 * Array of { codeKey, icon, label, category, type }
 * @type {import('vue').Ref<Array>}
 */
const behaviorCodes = ref([])

const gridSize = ref({ rows: 6, cols: 6 })
const teacherName = ref('')
const attendanceMode = ref('natural')
const latenessGracePeriod = ref(5)
const periodStartTimes = ref({})
const academicTerms = ref([])
const nonSchoolDays = ref([])

/** @type {import('vue').Ref<boolean>} Flag for special "Test Day" mode — persisted in sessionStorage so a
 *  page reload mid-class doesn't silently reset it. Cleared at midnight and on tab close. */
export const isTestDay = ref(sessionStorage.getItem('isTestDay') === 'true')
// Keep sessionStorage in sync so reloads preserve the flag within the same session
watch(isTestDay, (val) => sessionStorage.setItem('isTestDay', String(val)))

/** @type {import('vue').Ref<Array>} Events for the student currently in focus (Dossier) */
const activeStudentEvents = ref([])

/** @type {import('vue').Ref<string>} Global year filter */
const selectedYear = ref(localStorage.getItem('selectedYear') || '')
/** @type {import('vue').Ref<string>} Global semester filter */
const selectedSemester = ref(localStorage.getItem('selectedSemester') || '')

/** @type {import('vue').Ref<boolean>} Controls visibility of the QR Scanner component */
const isScannerOpen = ref(false)
/** @type {import('vue').Ref<number>} Max students allowed out (0 = infinite) */
const maxStudentsOut = ref(parseInt(localStorage.getItem('maxStudentsOut')) || 0)

// Watch for changes and persist to localStorage
watch(selectedYear, (val) => localStorage.setItem('selectedYear', val))
watch(selectedSemester, (val) => localStorage.setItem('selectedSemester', val))
watch(maxStudentsOut, (val) => localStorage.setItem('maxStudentsOut', val.toString()))

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

/** Filtered class list based on global year/semester */
const filteredClassList = computed(() => {
    return classList.value.filter(c => {
        const matchesYear = !selectedYear.value || c.year === selectedYear.value
        const matchesSem  = !selectedSemester.value || c.semester === selectedSemester.value
        return matchesYear && matchesSem
    })
})

/** Filtered archived classes */
const filteredArchivedClasses = computed(() => {
    return archivedClasses.value.filter(c => {
        const matchesYear = !selectedYear.value || c.year === selectedYear.value
        const matchesSem  = !selectedSemester.value || c.semester === selectedSemester.value
        return matchesYear && matchesSem
    })
})

// ─── weekly stats ─────────────────────────────────────────────────────────────

/** @type {import('vue').Ref<{washroomTripsPerWeek: number, deviceIncidentsPerWeek: number}>} */
const thresholds = ref({ washroomTripsPerWeek: 4, deviceIncidentsPerWeek: 3 })

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

    const stats = {}
    for (const studentId of studentIds) {
        const events = await eventService.getEventsByStudent(studentId, { from: fromISO })
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
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    // Sort classes chronologically by start time, ignoring those without times
    const sortedClasses = classList.value
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
    }
}

/**
 * Watch for changes to global filters and auto-switch class if needed.
 */
watch([selectedYear, selectedSemester], async ([newYear, newSem]) => {
    if (!activeClass.value) return
    
    // If current active class fits the new filter, stay on it
    if (activeClass.value.year === newYear && activeClass.value.semester === newSem) return
    
    // Otherwise, switch to the first class in the newly filtered list
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
    let semester = opts.semester || currentTerm?.semester

    if (!year || !semester) {
        const month = nowCheck.getMonth()
        const yearNum = nowCheck.getFullYear()
        year = (month >= 6) ? `${yearNum}-${(yearNum + 1).toString().slice(-2)}` : `${yearNum - 1}-${yearNum.toString().slice(-2)}`
        semester = (month >= 1 && month <= 6) ? '2' : '1'
    }

    // 2. Use global default grid size as template
    const settings = await settingsService.getSettings()
    const defaultGrid = settings.gridSize || { rows: 6, cols: 6 }
    const defaultStartTime = periodStartTimes.value[opts.periodNumber] || '08:00'

    const newCls = {
        classId: opts.classId,
        name: opts.name,
        courseCode: opts.courseCode || '',
        periodNumber: opts.periodNumber,
        periodStartTime: opts.periodStartTime ?? defaultStartTime,
        year,
        semester,
        gridSize: defaultGrid,
        gradebookUnits: [],
        gradebookCategories: [
            { categoryId: `cat_asmt_${Date.now()}`, name: 'Assessments', weight: 60 },
            { categoryId: `cat_act_${Date.now()}`, name: 'Activities', weight: 10 },
            { categoryId: `cat_culm_${Date.now()}`, name: 'Culminating', weight: 15 },
            { categoryId: `cat_exam_${Date.now()}`, name: 'Final Exam', weight: 15 }
        ],
        students: {},
    }
    await classService.saveClass(newCls)
    classList.value = [...classList.value, newCls]
    await _activateClass(newCls)
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

    // Apply updates on top of the plain record
    const updated = { ...fresh, ...updates }
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
        
        if (cls.students[studentId]) {
            Object.assign(cls.students[studentId], row)
            if (isActive && students.value[studentId]) {
                Object.assign(students.value[studentId], row)
            }
        } else {
            const newSt = {
                firstName,
                lastName,
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

    if (targetClassId === activeClass.value?.classId) triggerRef(activeClass)
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
    }
}

/**
 * Move a student from another class into the active class.
 * Called by the Setup view after the teacher confirms the cross-class conflict.
 *
 * @param {string} fromClassId
 * @param {{ studentId: string, firstName: string, lastName: string }} student
 * @returns {Promise<void>}
 */
async function moveStudentFromClass(fromClassId, student) {
    const toClassId = activeClass.value?.classId
    if (!toClassId) return

    // Remove from source class
    const src = await classService.getClass(fromClassId)
    if (src?.students?.[student.studentId]) {
        delete src.students[student.studentId]
        await classService.saveClass(src)
        classList.value = classList.value.map(c => c.classId === fromClassId ? src : c)
        if (activeClass.value?.classId === fromClassId) triggerRef(activeClass)
    }

    // Add to destination (upsert)
    await classService.importRoster(toClassId, [student])
    students.value[student.studentId] = {
        firstName: student.firstName,
        lastName: student.lastName,
        seat: null,
        generalNote: '',
        activeStates: { isOut: false, outTime: null },
        excludeFromAnalytics: false,
    }
    triggerRef(activeClass)
}

// ─── seat management ──────────────────────────────────────────────────────────

/**
 * Remove a student from the active class entirely.
 *
 * @param {string} studentId
 * @returns {Promise<void>}
 */
async function removeStudent(studentId) {
    const { confirm } = useMessage()
    if (!await confirm('Are you sure you want to remove this student? Their event history will remain in the database, but they will be removed from this class roster.', 'Remove Student', { danger: true })) return

    try {
        const classId = activeClass.value?.classId
        if (!classId) return

        // 1. Remove from DB
        const fresh = await classService.getClass(classId)
        if (fresh?.students?.[studentId]) {
            delete fresh.students[studentId]
            await classService.saveClass(fresh)
        }

        // 2. Remove from reactive state
        delete students.value[studentId]

        if (activeClass.value?.students?.[studentId]) {
            delete activeClass.value.students[studentId]
        }

        const clsInList = classList.value.find(c => c.classId === classId)
        if (clsInList?.students?.[studentId]) {
            delete clsInList.students[studentId]
        }
        triggerRef(activeClass)
    } catch (err) {
        console.error('removeStudent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to remove student from roster.')
    }
}

/**
 * Soft-archives a student in the active class.
 * 
 * @param {string} studentId 
 */
async function archiveStudent(studentId) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return

        await classService.archiveStudent(classId, studentId)

        if (students.value[studentId]) {
            students.value[studentId].archived = true
            students.value[studentId].seat = null
        }
        
        if (activeClass.value?.students?.[studentId]) {
            activeClass.value.students[studentId].archived = true
            activeClass.value.students[studentId].seat = null
        }
        
        const clsInList = classList.value.find(c => c.classId === classId)
        if (clsInList?.students?.[studentId]) {
            clsInList.students[studentId].archived = true
            clsInList.students[studentId].seat = null
        }

        triggerRef(activeClass)
    } catch (err) {
        console.error('archiveStudent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to archive student.')
    }
}

/**
 * Unarchives a student in the active class.
 * 
 * @param {string} studentId 
 */
async function unarchiveStudent(studentId) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return

        await classService.unarchiveStudent(classId, studentId)

        if (students.value[studentId]) {
            students.value[studentId].archived = false
        }
        
        if (activeClass.value?.students?.[studentId]) {
            activeClass.value.students[studentId].archived = false
        }
        
        const clsInList = classList.value.find(c => c.classId === classId)
        if (clsInList?.students?.[studentId]) {
            clsInList.students[studentId].archived = false
        }

        triggerRef(activeClass)
    } catch (err) {
        console.error('unarchiveStudent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to unarchive student.')
    }
}

/**
 * Permanently deletes a student's data scoped ONLY to the active class.
 * 
 * @param {string} studentId 
 */
async function permanentlyDeleteStudent(studentId) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return
        
        await classService.permanentlyDeleteStudent(classId, studentId)
        
        delete students.value[studentId]

        if (activeClass.value?.students?.[studentId]) {
            delete activeClass.value.students[studentId]
        }

        const clsInList = classList.value.find(c => c.classId === classId)
        if (clsInList?.students?.[studentId]) {
            delete clsInList.students[studentId]
        }
        
        triggerRef(activeClass)
    } catch (err) {
        console.error('permanentlyDeleteStudent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to permanently delete student data.')
    }
}

/**
 * Updates a student's general note and persists it.
 *
 * @param {string} studentId
 * @param {string} note
 * @returns {Promise<void>}
 */
async function updateStudentNote(studentId, note) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return
        await classService.updateStudentNote(classId, studentId, note)
        if (students.value[studentId]) {
            students.value[studentId].generalNote = note
        }
    } catch (err) {
        console.error('updateStudentNote failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save student note.')
    }
}

/**
 * Assign a student to a seat (or null to send to roster pool).
 * Pushes an undo entry per CLAUDE.md §9.
 *
 * @param {string} studentId
 * @param {{ row: number, col: number } | null} newSeat
 * @returns {Promise<void>}
 */
async function assignSeat(studentId, newSeat) {
    try {
        const classId = activeClass.value?.classId
        const previousSeat = students.value[studentId]?.seat ?? null

        await classService.updateStudentSeat(classId, studentId, newSeat)
        students.value[studentId].seat = newSeat

        pushUndo(async () => {
            try {
                await classService.updateStudentSeat(classId, studentId, previousSeat)
                students.value[studentId].seat = previousSeat
            } catch (err) {
                console.error('Undo assignSeat failed:', err)
                const { alert } = useMessage()
                await alert('Failed to undo seat assignment.')
            }
        })
    } catch (err) {
        console.error('assignSeat failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save seat assignment. Please check your connection or storage.')
    }
}

// ─── event logging ────────────────────────────────────────────────────────────

/**
 * Log an attendance event (Absent or Late).
 */
async function logAttendanceEvent(studentId, code) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return

        const student = students.value[studentId]

        if (code === 'a') {
            if (student.activeStates?.isAbsent) return

            await classService.setStudentAbsent(classId, studentId)

            if (!student.activeStates) student.activeStates = {}
            student.activeStates.isAbsent = true
            student.activeStates.lateMs = null

            const eventId = await eventService.logEvent({ studentId, classId, code, duration: null, testDay: isTestDay.value })
            student.lastEvent = { code, ts: Date.now() }

            pushUndo(async () => {
                try {
                    await classService.clearStudentAbsent(classId, studentId)
                    await eventService.deleteEvent(eventId)
                    student.activeStates.isAbsent = false
                    student.lastEvent = null
                } catch (err) {
                    console.error('Undo attendance event failed:', err)
                    const { alert } = useMessage()
                    await alert('Failed to undo attendance change.')
                }
            })
        } else if (code === 'l') {
            const periodStart = activeClass.value.periodStartTime
            if (!periodStart) {
                const { alert } = useMessage()
                await alert('Set a period start time in Setup to calculate lateness.')
                return
            }

            const [h, m] = periodStart.split(':').map(Number)
            const start = new Date()
            start.setHours(h, m, 0, 0)
            let msLate = Math.round(Date.now() - start.getTime())
            if (msLate < 0) msLate = 0
            
            // UX3 — Cap late time at 240 minutes (4 hours) to prevent extreme outliers
            const MAX_LATE_MS = 240 * 60 * 1000
            if (msLate > MAX_LATE_MS) msLate = MAX_LATE_MS

            const wasAbsent = student.activeStates?.isAbsent === true

            const todayStr = new Date().toISOString().slice(0, 10)
            const eventsToday = await eventService.getEventsByStudent(studentId, { from: todayStr, to: todayStr })
            const existingLateEvent = eventsToday.find(e => e.code === 'l')

            if (existingLateEvent) {
                await eventService.deleteEvent(existingLateEvent.eventId)
            }

            let supersededAbsentId = null
            if (wasAbsent) {
                await classService.clearStudentAbsent(classId, studentId)
                // Find the 'a' event for today and mark it superseded
                const todayStr = new Date().toISOString().slice(0, 10)
                const eventsToday = await eventService.getEventsByStudent(studentId, { from: todayStr, to: todayStr })
                const absentEvent = eventsToday.find(e => e.code === 'a' && !e.superseded)
                if (absentEvent) {
                    supersededAbsentId = absentEvent.eventId
                    await eventService.updateEvent(supersededAbsentId, { superseded: true })
                }
            }

            // Persist lateMs to IDB so it survives page refresh
            await classService.setStudentLate(classId, studentId, msLate)

            if (!student.activeStates) student.activeStates = {}
            student.activeStates.isAbsent = false
            student.activeStates.lateMs = msLate

            const eventId = await eventService.logEvent({
                studentId,
                classId,
                code,
                duration: msLate,
                testDay: isTestDay.value,
                supersededAbsent: wasAbsent
            })
            student.lastEvent = { code, ts: Date.now() }

            pushUndo(async () => {
                try {
                    await eventService.deleteEvent(eventId)
                    await classService.clearStudentLate(classId, studentId)
                    student.activeStates.lateMs = null

                    if (wasAbsent) {
                        await classService.setStudentAbsent(classId, studentId)
                        student.activeStates.isAbsent = true
                        // Restore the superseded absent event
                        if (supersededAbsentId) {
                            await eventService.updateEvent(supersededAbsentId, { superseded: false })
                        }
                    }
                    student.lastEvent = null
                } catch (err) {
                    console.error('Undo attendance event failed:', err)
                    const { alert } = useMessage()
                    await alert('Failed to undo attendance change.')
                }
            })
        }
    } catch (err) {
        console.error('logAttendanceEvent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save attendance. Please try again.')
    }
}

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

async function syncLateActiveState(classId, studentId, oldDuration, newDuration, eventTimestamp) {
    const cls = await classService.getClass(classId)
    const st = cls?.students[studentId]

    const isToday = eventTimestamp ? eventTimestamp.startsWith(new Date().toISOString().slice(0, 10)) : false

    // Only update if the active state matches the old duration (meaning it's the current active late state)
    // Or if the event is from today (fallback to fix desynced DBs)
    if (st && st.activeStates && st.activeStates.lateMs != null) {
        if (st.activeStates.lateMs === oldDuration || isToday) {
            await classService.setStudentLate(classId, studentId, newDuration)
            // If the user happens to have this class active right now, sync the reactive UI
            if (activeClass.value?.classId === classId && students.value[studentId]) {
                // Force triggering Vue reactivity by assigning a new object
                students.value[studentId].activeStates = {
                    ...students.value[studentId].activeStates,
                    lateMs: newDuration
                }
            }
        }
    }
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

async function logAssessmentEvent({ studentId, note, acType, acContext, acOutcome }) {
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
            testDay: isTestDay.value
        })

        // Reactive update
        students.value[studentId].lastEvent = { code, ts: Date.now() }

        pushUndo(async () => {
            try {
                await eventService.deleteEvent(eventId)
                students.value[studentId].lastEvent = null
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
/**
 * Reconciles any stale trips for all active classes.
 * Runs on every scan and checks if class periods have ended.
 */
async function reconcileStaleTrips() {
    const reconciled = new Set()
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const startTimes = periodStartTimes.value || {}

    // Convert period start times to minutes of the day
    const periodMinutes = {}
    for (const [pNum, timeStr] of Object.entries(startTimes)) {
        const [h, m] = timeStr.split(':').map(Number)
        periodMinutes[pNum] = h * 60 + m
    }

    // Sort periods keys numerically
    const sortedPeriods = Object.keys(startTimes).map(Number).sort((a, b) => a - b)

    for (const cls of classList.value) {
        const classPeriod = Number(cls.periodNumber)
        const classStartMins = periodMinutes[classPeriod]
        if (classStartMins === undefined) continue

        // Determine the class end time in minutes
        let classEndMins = classStartMins + 75 // Default 75 minutes fallback
        const nextPeriodNum = sortedPeriods.find(p => p > classPeriod)
        if (nextPeriodNum && periodMinutes[nextPeriodNum] !== undefined) {
            classEndMins = periodMinutes[nextPeriodNum]
        }

        // Check if the class period has ended today
        const hasEnded = currentMinutes >= classEndMins
        const elapsedSinceCheckOutLimit = 90 * 60 * 1000 // 90 mins

        let classNeedsSave = false
        for (const [studentId, student] of Object.entries(cls.students || {})) {
            const states = student.activeStates
            if (states?.isOut && states.outTime && states.outTime.startsWith(todayStr)) {
                const outDate = new Date(states.outTime)
                const elapsedMs = now.getTime() - outDate.getTime()
                const isStale = hasEnded || elapsedMs > elapsedSinceCheckOutLimit

                if (isStale) {
                    // Calculate periodEndTime
                    let periodEndTime = null
                    if (nextPeriodNum && startTimes[nextPeriodNum]) {
                        const [h, m] = startTimes[nextPeriodNum].split(':').map(Number)
                        const d = new Date(states.outTime)
                        d.setHours(h, m, 0, 0)
                        periodEndTime = d
                    } else {
                        // Last period of the day: end time is class start time + 75 minutes
                        const [h, m] = (cls.periodStartTime || '08:00').split(':').map(Number)
                        const d = new Date(states.outTime)
                        d.setHours(h, m, 0, 0)
                        d.setTime(d.getTime() + 75 * 60 * 1000)
                        periodEndTime = d
                    }

                    // Calculate duration
                    let durationMs = periodEndTime.getTime() - outDate.getTime()
                    if (durationMs < 0) durationMs = 5 * 60 * 1000 // Min fallback
                    const MAX_DURATION_MS = 75 * 60 * 1000
                    if (durationMs > MAX_DURATION_MS) durationMs = MAX_DURATION_MS

                    // Retroactively log the trip to IDB
                    await eventService.logEvent({
                        studentId,
                        classId: cls.classId,
                        code: states.code || 'w',
                        duration: durationMs,
                        testDay: false,
                        _overrideTimestamp: states.outTime
                    })

                    // Clear state
                    states.isOut = false
                    states.outTime = null
                    states.code = null
                    classNeedsSave = true
                    reconciled.add(`${cls.classId}-${studentId}`)

                    // Sync viewed class if it was the active class
                    if (activeClass.value?.classId === cls.classId && students.value[studentId]) {
                        students.value[studentId].activeStates = { isOut: false, outTime: null }
                    }
                }
            }
        }

        if (classNeedsSave) {
            await classService.saveClass(cls)
        }
    }
    return reconciled
}

/**
 * Initializes RFID-based attendance for a class on class activation if needed.
 * Marks all non-archived students as absent and creates 'a' database events.
 *
 * @param {string} classId
 * @returns {Promise<void>}
 */
async function initializeRfidAttendance(classId) {
    if (attendanceMode.value !== 'rfid') return

    const clsObj = classList.value.find(c => c.classId === classId)
    if (!clsObj) return

    const todayStr = new Date().toISOString().slice(0, 10)

    // Check if any attendance events (a or l) exist for this class today.
    // If they do, it means we have already initialized or the day is in progress, so do nothing.
    const existingEvents = await eventService.getEventsByClass(classId, { from: todayStr, to: todayStr })
    const hasAttendanceLogs = existingEvents.some(e => e.code === 'a' || e.code === 'l')
    if (hasAttendanceLogs) return

    let classNeedsSave = false
    for (const [studentId, student] of Object.entries(clsObj.students || {})) {
        if (student.archived) continue

        // Initialize active state to absent
        if (!student.activeStates) student.activeStates = {}
        student.activeStates.isAbsent = true
        student.activeStates.lateMs = null
        classNeedsSave = true

        // Log the 'a' event to IndexedDB
        await eventService.logEvent({
            studentId,
            classId,
            code: 'a',
            duration: null,
            testDay: false
        })
    }

    if (classNeedsSave) {
        await classService.saveClass(clsObj)
        // If this class is the active class, sync local view model
        if (activeClass.value?.classId === classId) {
            for (const [studentId, student] of Object.entries(students.value)) {
                if (student.archived) continue
                if (!student.activeStates) student.activeStates = {}
                student.activeStates.isAbsent = true
                student.activeStates.lateMs = null
            }
        }
    }
}

/**
 * Handles the first RFID/QR tap for an absent student under RFID-Based Attendance Mode.
 * Marks the student present or late based on the period start time and grace period.
 *
 * @param {string} studentId
 * @param {string} classId
 * @returns {Promise<{ type: 'present'|'late', statusText: string }>}
 */
async function handleRfidAttendanceScan(studentId, classId) {
    const isActive = classId === activeClass.value?.classId
    const clsObj = isActive ? activeClass.value : classList.value.find(c => c.classId === classId)
    // Bug 2 fix: return a safe fallback instead of undefined to prevent runtime crash in QRScanner
    if (!clsObj) return { type: 'error', statusText: 'Class not found' }

    const student = clsObj.students[studentId]
    if (!student) return { type: 'error', statusText: 'Student not found' }

    const todayStr = new Date().toISOString().slice(0, 10)

    // Find and supersede today's 'a' event for this student
    const eventsToday = await eventService.getEventsByStudent(studentId, { from: todayStr, to: todayStr })
    const absentEvent = eventsToday.find(e => e.code === 'a' && !e.superseded)
    if (absentEvent) {
        await eventService.updateEvent(absentEvent.eventId, { superseded: true })
    }

    // Determine if student is late or on-time
    const periodStart = clsObj.periodStartTime
    let isLate = false
    let msLate = 0

    if (periodStart) {
        const [h, m] = periodStart.split(':').map(Number)
        const start = new Date()
        start.setHours(h, m, 0, 0)
        
        const scanTime = Date.now()
        msLate = Math.round(scanTime - start.getTime())

        // Calculate late threshold in milliseconds
        // Bug 4 fix: use >= so grace=0 only flags students scanning AFTER the bell, not at the exact moment
        const gracePeriodMinutes = latenessGracePeriod.value !== undefined ? latenessGracePeriod.value : 5
        const graceMs = gracePeriodMinutes * 60 * 1000
        if (msLate > 0 && msLate > graceMs) {
            isLate = true
            // Cap late time at 240 minutes (4 hours)
            const MAX_LATE_MS = 240 * 60 * 1000
            if (msLate > MAX_LATE_MS) msLate = MAX_LATE_MS
        }
    }

    if (isLate) {
        // Persist lateMs state
        // Bug 6 fix: setStudentLate already spreads activeStates and sets isAbsent=false,
        // but we also need to clear isOut if the student was somehow manually sent out while absent
        await classService.setStudentLate(classId, studentId, msLate)
        
        if (!student.activeStates) student.activeStates = {}
        student.activeStates.isAbsent = false
        student.activeStates.isOut = false   // Bug 6: clear impossible dual state
        student.activeStates.outTime = null
        student.activeStates.lateMs = msLate

        if (isActive && students.value[studentId]) {
            students.value[studentId].activeStates.isAbsent = false
            students.value[studentId].activeStates.isOut = false
            students.value[studentId].activeStates.outTime = null
            students.value[studentId].activeStates.lateMs = msLate
        }

        // Log late event
        await eventService.logEvent({
            studentId,
            classId,
            code: 'l',
            duration: msLate,
            testDay: isTestDay.value,
            supersededAbsent: true
        })

        const minsLate = Math.round(msLate / 60000)
        return { type: 'late', statusText: `LATE ${minsLate}m` }
    } else {
        // Mark Present
        // Bug 6 fix: also clear isOut in case teacher manually sent student out while they were absent
        await classService.clearStudentAbsent(classId, studentId)

        if (!student.activeStates) student.activeStates = {}
        student.activeStates.isAbsent = false
        student.activeStates.isOut = false   // Bug 6: clear impossible dual state
        student.activeStates.outTime = null
        student.activeStates.lateMs = null

        if (isActive && students.value[studentId]) {
            students.value[studentId].activeStates.isAbsent = false
            students.value[studentId].activeStates.isOut = false
            students.value[studentId].activeStates.outTime = null
            students.value[studentId].activeStates.lateMs = null
        }

        return { type: 'present', statusText: 'PRESENT' }
    }
}

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
    const db = await (await import('../db/index.js')).getDB()
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
    const db = await (await import('../db/index.js')).getDB()
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
}

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
    }

    activeClass.value = cls
    // Deep-copy students map so Vue can track nested mutations
    students.value = JSON.parse(JSON.stringify(cls.students ?? {}))

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
        isScannerOpen,
        maxStudentsOut,
        filteredClassList,
        filteredArchivedClasses,
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
        confirmResize,
        reloadBehaviorCodes,
        refreshAcademicTerms,
        refreshNonSchoolDays,
        updateAcademicTerms,
        updateNonSchoolDays,
        updateTeacherName,
        updatePeriodStartTimes,
        updateAttendanceConfig,
        handleRfidAttendanceScan,
        archiveClass,
        restoreClass,
        deleteClass,
        dismissSuggestion,
        bulkImportClasses,
        getTermRange,
        termOptions,
        periodOptions: periodOptionsList,
        triggerActiveClass: () => triggerRef(activeClass)
    }
}

/** Midnight reset scheduler for isTestDay */
function _scheduleMidnightReset() {
    if (midnightTimer) clearTimeout(midnightTimer)
    
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
    const msToMidnight = midnight.getTime() - now.getTime()

    midnightTimer = setTimeout(() => {
        isTestDay.value = false
        _scheduleMidnightReset()
    }, msToMidnight)
}
