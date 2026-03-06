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

import { ref, computed } from 'vue'
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

/** @type {import('vue').Ref<{ rows: number, cols: number }>} */
const gridSize = ref({ rows: 6, cols: 6 })

// ─── computed ─────────────────────────────────────────────────────────────────

/** Students sorted by last name for display in roster lists */
const sortedRoster = computed(() =>
    Object.entries(students.value)
        .map(([studentId, s]) => ({ studentId, ...s }))
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
)

/** Students who currently have no assigned seat */
const unseatedStudents = computed(() =>
    sortedRoster.value.filter(s => s.seat === null)
)

/** Students who are currently out of the room */
const studentsOut = computed(() =>
    sortedRoster.value.filter(s => s.activeStates?.isOut === true)
)

// ─── init ─────────────────────────────────────────────────────────────────────

/**
 * Load all classes + settings from IDB. Call once on app startup.
 * Activates the first class automatically if one exists.
 *
 * @returns {Promise<void>}
 */
async function init() {
    const [classes, codes, settings] = await Promise.all([
        classService.getAllClasses(),
        settingsService.getBehaviorCodes(),
        settingsService.getSettings(),
    ])

    // Inject 'a' and 'l' if missing (migrating existing dbs smoothly)
    let codesUpdated = false
    const codesMap = Object.fromEntries(codes.map(c => [c.codeKey, c]))
    if (!codesMap.a) {
        settings.behaviorCodes.a = { icon: '🚫', label: 'Absent', category: 'attendance', type: 'attendance' }
        codesUpdated = true
    }
    if (!codesMap.l) {
        settings.behaviorCodes.l = { icon: '⏰', label: 'Late', category: 'attendance', type: 'attendance' }
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
                activeStates: { isOut: false, outTime: null },
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
        activeStates: { isOut: false, outTime: null },
    }
}

// ─── seat management ──────────────────────────────────────────────────────────

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

        const eventId = await eventService.logEvent({ studentId, classId, code, duration: null })
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

        if (wasAbsent) {
            await classService.clearStudentAbsent(classId, studentId)
        }

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
            student.activeStates.lateMinutes = null

            if (wasAbsent) {
                await classService.setStudentAbsent(classId, studentId)
                student.activeStates.isAbsent = true
            }
            student.lastEvent = null
        })
    }
}

/**
 * Log a standard (non-toggle) behavior event via the radial menu selection.
 * Follows CLAUDE.md §8 (event write procedure delegated to eventService.logEvent).
 *
 * @param {string} studentId
 * @param {string} code  The behavior code key
 * @returns {Promise<void>}
 */
async function logStandardEvent(studentId, code) {
    const classId = activeClass.value?.classId
    const eventId = await eventService.logEvent({ studentId, classId, code })

    // Reactive update: store last event for desk tile flash
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
        const newState = { isOut: true, outTime }

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

        // Undo: restore the exact original state (with original outTime) + delete event
        pushUndo(async () => {
            const restoredState = { isOut: true, outTime: originalOutTime }
            await classService.setStudentActiveState(classId, studentId, restoredState)
            await eventService.deleteEvent(eventId)
            students.value[studentId].activeStates = restoredState
            students.value[studentId].lastEvent = null
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
    activeClass.value = cls
    // Deep-copy students map so Vue can track nested mutations
    students.value = JSON.parse(JSON.stringify(cls.students ?? {}))
}

// ─── export ───────────────────────────────────────────────────────────────────
export function useClassroom() {
    return {
        // state
        classList,
        archivedClasses,
        activeClass,
        students,
        behaviorCodes,
        gridSize,
        // computed
        sortedRoster,
        unseatedStudents,
        studentsOut,
        // actions
        init,
        switchClass,
        createClass,
        updateActiveClass,
        archiveClass,
        restoreClass,
        deleteClass,
        importRoster,
        moveStudentFromClass,
        assignSeat,
        logStandardEvent,
        logToggleEvent,
        logAttendanceEvent,
        checkResize,
        confirmResize,
        reloadBehaviorCodes,
    }
}
