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
 * Uses a single transaction to ensure consistency between class lookup and event write.
 */
export async function logEvent(eventObj) {
    const db = await getDB()
    
    // We start a transaction across both stores
    const tx = db.transaction(['classes', 'events', 'settings'], 'readwrite')
    
    // Step 1 — Fetch class record for periodNumber
    const cls = await tx.objectStore('classes').get(eventObj.classId)
    if (!cls) throw new Error(`Class not found: ${eventObj.classId}`)

    // Step 2 — Fetch behavior code for category
    const settings = await tx.objectStore('settings').get('singleton')
    const behaviorCode = settings?.behaviorCodes[eventObj.code]
    if (!behaviorCode) throw new Error(`Unknown behavior code: ${eventObj.code}`)

    // Step 3 — Compute dayOfWeek
    const now = eventObj._overrideTimestamp ? new Date(eventObj._overrideTimestamp) : new Date()
    const dayOfWeek = now.getDay()       // 0=Sun … 6=Sat
    const timestamp = eventObj._overrideTimestamp || (now.toISOString().slice(0, 19) + 'Z') // "YYYY-MM-DDTHH:MM:SSZ"

    // Step 4 — Build the complete event record
    const record = {
        studentId: eventObj.studentId,
        classId: eventObj.classId,
        periodNumber: cls.periodNumber,      // copied from class
        dayOfWeek,
        timestamp,
        code: eventObj.code,
        category: behaviorCode.category, // copied from behavior code
        duration: eventObj.duration ?? null,
        note: eventObj.note ?? null,
        testDay: eventObj.testDay ?? false,
    }
    if (eventObj.supersededAbsent !== undefined) {
        record.supersededAbsent = eventObj.supersededAbsent
    }

    // Step 5 — Write
    const eventId = await tx.objectStore('events').add(record)
    await tx.done

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
 * Updates an existing event with partial data.
 */
export async function updateEvent(eventId, updates = {}) {
    const db = await getDB()
    const tx = db.transaction('events', 'readwrite')
    const store = tx.objectStore('events')
    const event = await store.get(eventId)
    
    if (!event) throw new Error(`Event not found: ${eventId}`)

    Object.assign(event, updates)
    await store.put(event)
    await tx.done

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
export async function getEventsByStudent(studentId, options = {}) {
    const db = await getDB()
    const events = await db.getAllFromIndex('events', 'by_studentId', studentId)
    
    let filtered = _applyDateRange(events, options)
    
    if (options.code) {
        filtered = filtered.filter(e => e.code === options.code)
    }
    
    return filtered
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

    const [settings, classes, events, assessments, grades] = await Promise.all([
        db.get('settings', 'singleton'),
        db.getAll('classes'),
        db.getAllFromIndex('events', 'by_timestamp'),
        db.getAll('assessments'),
        db.getAll('grades'),
    ])

    return {
        schemaVersion: settings?.schemaVersion || 1,
        exportedAt: new Date().toISOString(),
        settings,
        classes,
        events,
        assessments,
        grades,
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

        // The provided code snippet for tie-breakers and schema version guards
        // appears to be out of context for this function.
        // It seems to belong to a different part of the application logic,
        // possibly related to selecting between multiple backup candidates.
        // As such, it cannot be directly inserted here without breaking
        // the function's syntax and logic.
        // No changes are applied to this section based on the provided snippet.

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
    // Hard check: version 16 is current. Avoid importing future structure that this app doesn't understand.
    if (backupObj.schemaVersion > 16) {
        throw new Error(
            `The backup file is from a newer version of the app (v${backupObj.schemaVersion}). Please update your app before importing.`
        )
    }

    const { settings, classes = [], events = [], assessments = [], grades = [] } = backupObj

    const db = await getDB()

    // Single transaction across all stores
    const tx = db.transaction(['settings', 'classes', 'events', 'assessments', 'grades'], 'readwrite')

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

    // Clear and rewrite assessments
    await tx.objectStore('assessments').clear()
    for (const ass of assessments) {
        await tx.objectStore('assessments').put(ass)
    }

    // Clear and rewrite grades
    await tx.objectStore('grades').clear()
    for (const g of grades) {
        await tx.objectStore('grades').put(g)
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
