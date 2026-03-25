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

import { ref, computed, watch } from 'vue'
import * as classService from '../db/classService.js'
import * as eventService from '../db/eventService.js'
import * as settingsService from '../db/settingsService.js'
import { useUndo } from './useUndo.js'

const { push: pushUndo, clear: clearUndo } = useUndo()

// ─── module-level singleton reactive state ────────────────────────────────────

/** @type {import('vue').Ref<Array<Object>>} Non-archived classes (for ClassSwitcher & Dashboard) */
const classList = ref([])

/** @type {import('vue').Ref<Array<Object>>} Archived (hidden) class records */
const archivedClasses = ref([])

/** @type {import('vue').Ref<Object|null>} The currently active class record */
const activeClass = ref(null)

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

/** @type {import('vue').Ref<boolean>} Flag for special "Test Day" mode */
export const isTestDay = ref(false)

// ─── computed ─────────────────────────────────────────────────────────────────

/** Students sorted by last name for display in roster lists */
const sortedRoster = computed(() =>
    Object.entries(students.value)
        .map(([studentId, s]) => ({ studentId, ...s }))
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
)

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

// ─── init ─────────────────────────────────────────────────────────────────────

/**
 * Load all classes + settings from IDB. Call once on app startup.
 * Activates the first class automatically if one exists.
 *
 * @returns {Promise<void>}
 */
async function init() {
    loadDismissedSuggestions()

    const [classes, codes, settings] = await Promise.all([
        classService.getAllClasses(),
        settingsService.getBehaviorCodes(),
        settingsService.getSettings(),
    ])

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

    const active = classes.filter(c => !c.archived)
    const archived = classes.filter(c => c.archived)
    classList.value = active
    archivedClasses.value = archived
    gridSize.value = settings.gridSize

    if (active.length > 0) {
        // Try to find the best class for the current time
        const bestClassFromTime = computeSuggestedClass()
        if (bestClassFromTime) {
            // Because it's a fresh boot, load this optimal class directly
            await _activateClass(bestClassFromTime)
            suggestedClass.value = null // Clear suggestion since we are now on it
            return
        }

        // Fallback to the first active class if no time matches at all
        await _activateClass(active[0])
    }
}

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
    const newCls = {
        classId: opts.classId,
        name: opts.name,
        periodNumber: opts.periodNumber,
        periodStartTime: opts.periodStartTime ?? '08:45',
        gradebookUnits: [],
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
    }
}

// ─── roster import ────────────────────────────────────────────────────────────

/**
 * Import a parsed roster array into the active class.
 * Handles cross-class conflict detection.
 *
 * @param {Array<{ studentId: string, firstName: string, lastName: string }>} parsedRows
 * @returns {Promise<{
 *   inserted: number,
 *   updated: number,
 *   skipped: Array<{ studentId: string, reason: string }>,
 *   crossClassConflicts: Array<{ studentId: string, existingClassId: string, student: Object }>
 * }>}
 */
async function importRoster(parsedRows) {
    const classId = activeClass.value?.classId
    if (!classId) throw new Error('No active class')

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

    // Update local reactive state immediately (no re-fetch)
    const cls = activeClass.value
    for (const { studentId, firstName, lastName } of validRows) {
        if (students.value[studentId]) {
            students.value[studentId].firstName = firstName
            students.value[studentId].lastName = lastName
        } else {
            students.value[studentId] = {
                firstName,
                lastName,
                seat: null,
                generalNote: '',
                activeStates: { isOut: false, outTime: null },
                excludeFromAnalytics: false,
            }
        }
    }

    return { inserted, updated, skipped, crossClassConflicts }
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
}

// ─── seat management ──────────────────────────────────────────────────────────

/**
 * Remove a student from the active class entirely.
 *
 * @param {string} studentId
 * @returns {Promise<void>}
 */
async function removeStudent(studentId) {
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
    const classId = activeClass.value?.classId
    const previousSeat = students.value[studentId]?.seat ?? null

    await classService.updateStudentSeat(classId, studentId, newSeat)
    students.value[studentId].seat = newSeat

    pushUndo(async () => {
        await classService.updateStudentSeat(classId, studentId, previousSeat)
        students.value[studentId].seat = previousSeat
    })
}

// ─── event logging ────────────────────────────────────────────────────────────

/**
 * Log an attendance event (Absent or Late).
 */
async function logAttendanceEvent(studentId, code) {
    const classId = activeClass.value?.classId
    if (!classId) return

    const student = students.value[studentId]

    if (code === 'a') {
        if (student.activeStates?.isAbsent) return

        await classService.setStudentAbsent(classId, studentId)

        if (!student.activeStates) student.activeStates = {}
        student.activeStates.isAbsent = true
        student.activeStates.lateMinutes = null

        const eventId = await eventService.logEvent({ studentId, classId, code, duration: null, testDay: isTestDay.value })
        student.lastEvent = { code, ts: Date.now() }

        pushUndo(async () => {
            await classService.clearStudentAbsent(classId, studentId)
            await eventService.deleteEvent(eventId)
            student.activeStates.isAbsent = false
            student.lastEvent = null
        })
    } else if (code === 'l') {
        const periodStart = activeClass.value.periodStartTime
        if (!periodStart) {
            alert('Set a period start time in Setup to calculate lateness.')
            return
        }

        const [h, m] = periodStart.split(':').map(Number)
        const start = new Date()
        start.setHours(h, m, 0, 0)
        let minutesLate = Math.round((Date.now() - start.getTime()) / 60000)
        if (minutesLate < 0) minutesLate = 0

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

        // Persist lateMinutes to IDB so it survives page refresh
        await classService.setStudentLate(classId, studentId, minutesLate)

        if (!student.activeStates) student.activeStates = {}
        student.activeStates.isAbsent = false
        student.activeStates.lateMinutes = minutesLate

        const eventId = await eventService.logEvent({
            studentId,
            classId,
            code,
            duration: minutesLate,
            supersededAbsent: wasAbsent
        })
        student.lastEvent = { code, ts: Date.now() }

        pushUndo(async () => {
            await eventService.deleteEvent(eventId)
            await classService.clearStudentLate(classId, studentId)
            student.activeStates.lateMinutes = null

            if (wasAbsent) {
                await classService.setStudentAbsent(classId, studentId)
                student.activeStates.isAbsent = true
                // Restore the superseded absent event
                if (supersededAbsentId) {
                    await eventService.updateEvent(supersededAbsentId, { superseded: false })
                }
            }
            student.lastEvent = null
        })
    }
}

async function syncLateActiveState(classId, studentId, oldDuration, newDuration, eventTimestamp) {
    const cls = await classService.getClass(classId)
    const st = cls?.students[studentId]

    const isToday = eventTimestamp ? eventTimestamp.startsWith(new Date().toISOString().slice(0, 10)) : false

    // Only update if the active state matches the old duration (meaning it's the current active late state)
    // Or if the event is from today (fallback to fix desynced DBs)
    if (st && st.activeStates && st.activeStates.lateMinutes != null) {
        if (st.activeStates.lateMinutes === oldDuration || isToday) {
            await classService.setStudentLate(classId, studentId, newDuration)
            // If the user happens to have this class active right now, sync the reactive UI
            if (activeClass.value?.classId === classId && students.value[studentId]) {
                // Force triggering Vue reactivity by assigning a new object
                students.value[studentId].activeStates = {
                    ...students.value[studentId].activeStates,
                    lateMinutes: newDuration
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
 * @returns {Promise<void>}
 */
async function logStandardEvent(studentId, code, note = null) {
    const classId = activeClass.value?.classId
    const eventId = await eventService.logEvent({ studentId, classId, code, note })

    // Reactive update: store last event for desk tile flash
    students.value[studentId].lastEvent = { code, ts: Date.now() }

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
        await eventService.deleteEvent(eventId)
        students.value[studentId].lastEvent = null

        if (code === 'w' || category === 'redirect') {
            const current = studentWeeklyStats.value[studentId] || { washroomTrips: 0, deviceIncidents: 0 }
            studentWeeklyStats.value[studentId] = {
                washroomTrips: code === 'w' ? Math.max(0, current.washroomTrips - 1) : current.washroomTrips,
                deviceIncidents: category === 'redirect' ? Math.max(0, current.deviceIncidents - 1) : current.deviceIncidents
            }
        }
    })
}

/**
 * Log a specialized Assessment Conversation event.
 *
 * @param {Object} payload { studentId, note, acContext, acOutcome }
 */
async function logAssessmentEvent({ studentId, note, acContext, acOutcome }) {
    const classId = activeClass.value?.classId
    const code = 'ac'
    const category = 'assessment'
    
    const eventId = await eventService.logEvent({ 
        studentId, 
        classId, 
        code, 
        note,
        acContext,
        acOutcome
    })

    // Reactive update
    students.value[studentId].lastEvent = { code, ts: Date.now() }

    pushUndo(async () => {
        await eventService.deleteEvent(eventId)
        students.value[studentId].lastEvent = null
    })
}

/**
 * Toggle a washroom (or other toggle-type) event.
 * Follows CLAUDE.md §7 toggle rules and §9 undo closure rules.
 *
 * @param {string} studentId
 * @param {string} code  The toggle behavior code key
 * @returns {Promise<void>}
 */
async function logToggleEvent(studentId, code) {
    const classId = activeClass.value?.classId
    const currentState = students.value[studentId].activeStates

    if (!currentState.isOut) {
        // ── Toggle OUT ───────────────────────────────────────────────────────────
        const outTime = new Date().toISOString()
        const newState = { isOut: true, outTime, code }

        await classService.setStudentActiveState(classId, studentId, newState)
        students.value[studentId].activeStates = newState
        students.value[studentId].lastEvent = { code, ts: Date.now() }

        // Undo: clear the active state (no event was written for OUT, only state)
        pushUndo(async () => {
            await classService.clearStudentActiveState(classId, studentId)
            students.value[studentId].activeStates = { isOut: false, outTime: null }
        })
    } else {
        // ── Toggle IN ────────────────────────────────────────────────────────────
        // CLAUDE.md §9 critical note: capture outTime BEFORE writing the IN event
        const originalOutTime = currentState.outTime
        const duration = Date.now() - new Date(originalOutTime).getTime()

        const eventId = await eventService.logEvent({
            studentId,
            classId,
            code,
            duration,
        })

        await classService.clearStudentActiveState(classId, studentId)
        students.value[studentId].activeStates = { isOut: false, outTime: null }
        students.value[studentId].lastEvent = { code, ts: Date.now() }

        // Optimistic update for stats dot
        if (code === 'w') {
            const current = studentWeeklyStats.value[studentId] || { washroomTrips: 0, deviceIncidents: 0 }
            studentWeeklyStats.value[studentId] = {
                ...current,
                washroomTrips: current.washroomTrips + 1,
            }
        }

        // Undo: restore the exact original state (with original outTime) + delete event
        pushUndo(async () => {
            const restoredState = { isOut: true, outTime: originalOutTime }
            await classService.setStudentActiveState(classId, studentId, restoredState)
            await eventService.deleteEvent(eventId)
            students.value[studentId].activeStates = restoredState
            students.value[studentId].lastEvent = null

            if (code === 'w') {
                const current = studentWeeklyStats.value[studentId] || { washroomTrips: 0, deviceIncidents: 0 }
                studentWeeklyStats.value[studentId] = {
                    ...current,
                    washroomTrips: Math.max(0, current.washroomTrips - 1),
                }
            }
        })
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

    for (const s of affected) {
        await classService.updateStudentSeat(classId, s.studentId, null)
        students.value[s.studentId].seat = null
    }

    gridSize.value = newSize
    const settings = await settingsService.getSettings()
    await settingsService.saveSettings({ ...settings, gridSize: newSize })
}

// ─── settings ─────────────────────────────────────────────────────────────────

/**
 * Reload behavior codes from settings (called after Setup view edits codes).
 */
async function reloadBehaviorCodes() {
    behaviorCodes.value = await settingsService.getBehaviorCodes()
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
    // Reconcile stale activeStates from previous days before activating
    const todayStr = new Date().toISOString().slice(0, 10)
    const eventsToday = await eventService.getEventsByClass(cls.classId, { from: todayStr, to: todayStr })

    let needsSave = false
    for (const [studentId, student] of Object.entries(cls.students ?? {})) {
        const states = student.activeStates
        if (!states) continue

        // Check for stale attendance (absent/late but no event today)
        if (states.isAbsent || states.lateMinutes != null) {
            const hasAtt = eventsToday.some(e => e.studentId === studentId && (e.code === 'a' || e.code === 'l'))
            if (!hasAtt) {
                states.isAbsent = false
                states.lateMinutes = null
                needsSave = true
            }
        }

        // Check for stale out-of-room state (left the room yesterday and never returned)
        if (states.isOut && states.outTime) {
            if (!states.outTime.startsWith(todayStr)) {
                // Retroactively log the forgotten trip as 5 minutes on the day it occurred
                const FIVE_MINUTES_MS = 5 * 60 * 1000
                await eventService.logEvent({
                    studentId,
                    classId: cls.classId,
                    code: states.code || 'w', // Fallback to 'w' just in case
                    duration: FIVE_MINUTES_MS,
                    // Use a special property to override the timestamp in logEvent
                    _overrideTimestamp: states.outTime
                })

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
        // computed
        sortedRoster,
        unseatedStudents,
        studentsOut,
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
        assignSeat,
        computeSuggestedClass,
        logAttendanceEvent,
        syncLateActiveState,
        logStandardEvent,
        logToggleEvent,
        logAssessmentEvent,
        checkResize,
        confirmResize,
        reloadBehaviorCodes,
        archiveClass,
        restoreClass,
        deleteClass,
        dismissSuggestion
    }
}

/** Midnight reset scheduler for isTestDay */
function _scheduleMidnightReset() {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
    const msToMidnight = midnight.getTime() - now.getTime()

    setTimeout(() => {
        isTestDay.value = false
        _scheduleMidnightReset()
    }, msToMidnight)
}
