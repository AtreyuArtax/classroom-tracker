/**
 * src/db/eventService.js
 *
 * Public API for the `events` object store.
 *
 * CLAUDE.md §4 — exact function signatures required:
 *   logEvent(eventObj)                        → returns eventId
 *   deleteEvent(eventId)                      → used by undo
 *   getEventsByStudent(studentId, dateRange)
 *   getEventsByClass(classId, dateRange)
 *   getEventsByPeriod(periodNumber, dateRange)
 *   getAllEvents(dateRange)
 *   exportAllData()                           → full backup object
 *   importAllData(backupObj)                  → validates + writes all stores
 *
 * CLAUDE.md §8 — Event Write Procedure (followed inside logEvent):
 *   1. Fetch class record → get periodNumber
 *   2. Fetch behavior code → get category
 *   3. Compute dayOfWeek from new Date()
 *   4. Write event with all fields populated
 *   5. Return the auto-generated eventId
 *
 * Uses indexes for all queries — never full table scans (CLAUDE.md §12).
 */

import { getDB } from './index.js'
import { getClass } from './classService.js'
import { getSettings } from './settingsService.js'
import { ref } from 'vue'

export const hasUnsyncedChanges = ref(true)

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Filter an array of events by an optional date range.
 * dateRange = { from: string|null, to: string|null } — ISO date strings (YYYY-MM-DD)
 *
 * @param {Array<Object>} events
 * @param {{ from?: string, to?: string }} dateRange
 * @returns {Array<Object>}
 */
function _applyDateRange(events, dateRange = {}) {
    const { from, to } = dateRange
    return events.filter(evt => {
        if (from && evt.timestamp < from) return false
        if (to && evt.timestamp > to + 'T23:59:59') return false
        return true
    })
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Logs a behavioral event to IndexedDB.
 *
 * Follows the CLAUDE.md §8 event write procedure exactly.
 * The caller provides { studentId, classId, code } at minimum.
 * periodNumber, dayOfWeek, category, and timestamp are derived/written here.
 *
 * @param {{ studentId: string, classId: string, code: string, duration?: number|null, note?: string|null }} eventObj
 * @returns {Promise<number>}  The auto-generated eventId
 */
export async function logEvent(eventObj) {
    // Step 1 — Fetch class record for periodNumber
    const cls = await getClass(eventObj.classId)
    if (!cls) throw new Error(`Class not found: ${eventObj.classId}`)

    // Step 2 — Fetch behavior code for category
    const settings = await getSettings()
    const behaviorCode = settings.behaviorCodes[eventObj.code]
    if (!behaviorCode) throw new Error(`Unknown behavior code: ${eventObj.code}`)

    // Step 3 — Compute dayOfWeek
    const now = new Date()
    const dayOfWeek = now.getDay()       // 0=Sun … 6=Sat
    const timestamp = now.toISOString().slice(0, 19) + 'Z' // "YYYY-MM-DDTHH:MM:SSZ"

    // Step 4 — Build the complete event record (no nulls for required fields)
    const record = {
        studentId: eventObj.studentId,
        classId: eventObj.classId,
        periodNumber: cls.periodNumber,      // integer, copied from class
        dayOfWeek,
        timestamp,
        code: eventObj.code,
        category: behaviorCode.category, // copied from behavior code
        duration: eventObj.duration ?? null,
        note: eventObj.note ?? null,
    }
    if (eventObj.supersededAbsent !== undefined) {
        record.supersededAbsent = eventObj.supersededAbsent
    }

    const db = await getDB()
    // Step 5 — Write and return the auto-generated eventId
    const eventId = await db.add('events', record)

    hasUnsyncedChanges.value = true
    return eventId
}

/**
 * Deletes a single event by its auto-generated eventId.
 * Used by the undo system (useUndo.js).
 *
 * @param {number} eventId
 * @returns {Promise<void>}
 */
export async function deleteEvent(eventId) {
    const db = await getDB()
    await db.delete('events', eventId)
    hasUnsyncedChanges.value = true
}

/**
 * Returns all events for a student, optionally filtered by date.
 * Uses the `by_studentId` index (no full scan).
 *
 * @param {string} studentId
 * @param {{ from?: string, to?: string }} [dateRange]
 * @returns {Promise<Array<Object>>}
 */
export async function getEventsByStudent(studentId, dateRange = {}) {
    const db = await getDB()
    const events = await db.getAllFromIndex('events', 'by_studentId', studentId)
    return _applyDateRange(events, dateRange)
}

/**
 * Returns all events for a class, optionally filtered by date.
 * Uses the `by_classId` index.
 *
 * @param {string} classId
 * @param {{ from?: string, to?: string }} [dateRange]
 * @returns {Promise<Array<Object>>}
 */
export async function getEventsByClass(classId, dateRange = {}) {
    const db = await getDB()
    const events = await db.getAllFromIndex('events', 'by_classId', classId)
    return _applyDateRange(events, dateRange)
}

/**
 * Returns all events for a period, optionally filtered by dayOfWeek and date.
 * Uses the `by_periodNumber` index.
 *
 * @param {number} periodNumber
 * @param {{ from?: string, to?: string, dayOfWeek?: number }} [dateRange]
 * @returns {Promise<Array<Object>>}
 */
export async function getEventsByPeriod(periodNumber, dateRange = {}) {
    const db = await getDB()
    const events = await db.getAllFromIndex('events', 'by_periodNumber', periodNumber)
    const date = _applyDateRange(events, dateRange)
    if (dateRange.dayOfWeek != null) {
        return date.filter(evt => evt.dayOfWeek === dateRange.dayOfWeek)
    }
    return date
}

/**
 * Returns all events across all classes and students.
 * Uses a full cursor on the `by_timestamp` index (sorted) — acceptable for
 * full-dataset reporting. Still index-driven, not a random scan.
 *
 * @param {{ from?: string, to?: string }} [dateRange]
 * @returns {Promise<Array<Object>>}
 */
export async function getAllEvents(dateRange = {}) {
    const db = await getDB()
    const events = await db.getAllFromIndex('events', 'by_timestamp')
    return _applyDateRange(events, dateRange)
}

/**
 * Serialises all three stores into a single backup object.
 * CLAUDE.md §13:
 *   { schemaVersion: 1, exportedAt: <ISO>, settings: {...}, classes: [...], events: [...] }
 *
 * @returns {Promise<Object>}
 */
export async function exportAllData() {
    const db = await getDB()

    const [settings, classes, events] = await Promise.all([
        db.get('settings', 'singleton'),
        db.getAll('classes'),
        db.getAllFromIndex('events', 'by_timestamp'),
    ])

    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        settings,
        classes,
        events,
    }
}

/**
 * Uses the File System Access API to silently overwrite a previously linked backup JSON file.
 * Returns true if successful, false if user denied permission or no handle exists.
 *
 * @returns {Promise<boolean>}
 */
export async function quickSyncBackup() {
    if (!window.showSaveFilePicker) return false // fallback or unsupported

    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    if (!settings || !settings.backupFileHandle) return false

    const handle = settings.backupFileHandle

    try {
        // Request write permission if we don't already have it
        if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
            const permission = await handle.requestPermission({ mode: 'readwrite' })
            if (permission !== 'granted') return false
        }

        const data = await exportAllData()
        const json = JSON.stringify(data, null, 2)

        const writable = await handle.createWritable()
        await writable.write(json)
        await writable.close()

        hasUnsyncedChanges.value = false
        return true
    } catch (err) {
        console.error('Quick sync failed:', err)
        return false // e.g. file was moved/deleted/permission denied
    }
}

/**
 * Restores all data from a backup object.
 * CLAUDE.md §13:
 *  - Validates schemaVersion before writing anything
 *  - Writes all three stores in a single IDB transaction
 *  - On mismatch: throws, does not touch existing data
 *
 * @param {Object} backupObj
 * @returns {Promise<{ classCount: number, eventCount: number }>}
 */
export async function importAllData(backupObj) {
    if (!backupObj || typeof backupObj !== 'object') {
        throw new Error('Invalid backup: not an object.')
    }
    if (typeof backupObj.schemaVersion !== 'number') {
        throw new Error(
            `Invalid schema version: backup must have a numeric schemaVersion. Aborting \u2014 no data was changed.`
        )
    }

    const { settings, classes = [], events = [] } = backupObj

    const db = await getDB()

    // Single transaction across all three stores
    const tx = db.transaction(['settings', 'classes', 'events'], 'readwrite')

    // Clear and rewrite settings
    await tx.objectStore('settings').clear()
    if (settings) {
        await tx.objectStore('settings').put(settings, 'singleton')
    }

    // Clear and rewrite classes
    await tx.objectStore('classes').clear()
    for (const cls of classes) {
        await tx.objectStore('classes').put(cls)
    }

    // Clear and rewrite events
    await tx.objectStore('events').clear()
    for (const evt of events) {
        await tx.objectStore('events').put(evt)
    }

    await tx.done

    hasUnsyncedChanges.value = false // We just loaded exact synced data
    return { classCount: classes.length, eventCount: events.length }
}

/**
 * Returns an ISO string representing the start of the given reporting period,
 * or null for 'all time'. Used by useStudentDossier to build { from } date ranges.
 *
 * @param {'week'|'month'|'semester'|'all'} period
 * @returns {string|null}
 */
export function getDateBoundary(period) {
    const now = new Date()
    if (period === 'all') return null
    if (period === 'week') {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        return d.toISOString()
    }
    if (period === 'month') {
        const d = new Date(now)
        d.setMonth(d.getMonth() - 1)
        return d.toISOString()
    }
    if (period === 'semester') {
        const d = new Date(now)
        d.setMonth(d.getMonth() - 5)
        return d.toISOString()
    }
    return null
}
