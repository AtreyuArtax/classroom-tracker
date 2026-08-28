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
import { migrateData, CURRENT_SCHEMA } from './migrations.js'
import { ref } from 'vue'
import { formatLocalDate } from '../utils/dates.js'

export const hasUnsyncedChanges = ref(false)

// ─── duration normalization ──────────────────────────────────────────────────

/**
 * Converts a raw duration (ms) into a numeric minute value with 0.5-minute precision.
 * Now exclusively millisecond-based (CLAUDE.md §18).
 *
 * @param {number|null} d Milliseconds
 * @returns {number} Minutes rounded to 0.5
 */
export function toMinutes(d) {
    if (d === null || d === undefined) return 0
    const mins = d / 60000
    return Math.round(mins * 2) / 2
}


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
        if (!evt.timestamp) return true
        const localDate = formatLocalDate(evt.timestamp)
        if (from) {
            const fromDate = from.includes('T') ? formatLocalDate(from) : from
            if (localDate < fromDate) return false
        }
        if (to) {
            const toDate = to.includes('T') ? formatLocalDate(to) : to
            if (localDate > toDate) return false
        }
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
        // Assessment fields
        acType: eventObj.acType ?? null,
        acContext: eventObj.acContext ?? null,
        acOutcome: eventObj.acOutcome ?? null,
        unitId: eventObj.unitId ?? null,
        expectationId: eventObj.expectationId ?? null,
        nextSteps: eventObj.nextSteps ?? null,
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
    if (eventId == null || (typeof eventId !== 'number' && typeof eventId !== 'string')) {
        console.warn('deleteEvent aborted: missing or invalid eventId', eventId)
        return
    }
    const db = await getDB()
    await db.delete('events', eventId)
    hasUnsyncedChanges.value = true
}

/**
 * Updates an existing event with partial data.
 */
export async function updateEvent(eventId, updates = {}) {
    if (eventId == null) return
    const db = await getDB()
    const tx = db.transaction('events', 'readwrite')
    const store = tx.objectStore('events')
    const event = await store.get(eventId)
    
    if (!event) throw new Error(`Event not found: ${eventId}`)

    Object.assign(event, updates)
    const plain = JSON.parse(JSON.stringify(event))
    await store.put(plain)
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
 * Uses a full cursor on the `by_timestamp` index (sorted).
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
 * Returns all records across all object stores as a single JSON-serializable object.
 * Schema adheres to CLAUDE.md §13 (Backup schema).
 *
 * @returns {Promise<Object>}
 */
export async function exportAllData() {
    const db = await getDB()

    const [settings, classes, events, assessments, grades, learningSkills] = await Promise.all([
        db.get('settings', 'singleton'),
        db.getAll('classes'),
        db.getAllFromIndex('events', 'by_timestamp'),
        db.getAll('assessments'),
        db.getAll('grades'),
        db.getAll('learning_skills').catch(() => [])
    ])

    let photos = []
    try {
        const photoRecords = await db.getAll('student_photos')
        if (photoRecords && photoRecords.length > 0) {
            photos = await Promise.all(photoRecords.map(async r => {
                let dataUrl = null
                if (r.blob instanceof Blob) {
                    dataUrl = await new Promise(resolve => {
                        const reader = new FileReader()
                        reader.onloadend = () => resolve(reader.result)
                        reader.onerror = () => resolve(null)
                        reader.readAsDataURL(r.blob)
                    })
                }
                return {
                    studentId: r.studentId,
                    dataUrl,
                    updatedAt: r.updatedAt
                }
            }))
            photos = photos.filter(p => p.dataUrl)
        }
    } catch (e) {
        console.warn('Could not export photos:', e)
    }

    return {
        schemaVersion: settings?.schemaVersion || 1,
        exportedAt: new Date().toISOString(),
        settings,
        classes,
        events,
        assessments,
        grades,
        learning_skills: learningSkills || [],
        photos
    }
}

/**
 * Creates an emergency recovery snapshot in localStorage before destructive actions.
 * Keeps the most recent 5 snapshots.
 */
export async function createSafetySnapshot(triggerReason = 'Manual snapshot') {
    try {
        const data = await exportAllData()
        const safeData = { ...data }
        delete safeData.photos // Exclude heavy photos from localStorage quota
        const snapshot = {
            id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            triggerReason,
            classCount: data.classes?.length || 0,
            eventCount: data.events?.length || 0,
            assessmentCount: data.assessments?.length || 0,
            gradeCount: data.grades?.length || 0,
            data: safeData
        }

        const raw = localStorage.getItem('ct_safety_snapshots')
        const list = raw ? JSON.parse(raw) : []
        const updatedList = [snapshot, ...list].slice(0, 5)
        localStorage.setItem('ct_safety_snapshots', JSON.stringify(updatedList))
        return snapshot
    } catch (err) {
        console.warn('Could not write emergency safety snapshot to localStorage:', err)
        return null
    }
}

/**
 * Returns all emergency recovery snapshots currently stored in localStorage.
 */
export function getSafetySnapshots() {
    try {
        const raw = localStorage.getItem('ct_safety_snapshots')
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

/**
 * Restores all data from a chosen safety snapshot.
 */
export async function restoreSafetySnapshot(snapshotId) {
    const list = getSafetySnapshots()
    const found = list.find(s => s.id === snapshotId)
    if (!found || !found.data) throw new Error('Safety snapshot not found.')
    return await importAllData(found.data)
}

/**
 * Removes a safety snapshot from localStorage.
 */
export function deleteSafetySnapshot(snapshotId) {
    try {
        const list = getSafetySnapshots()
        const updated = list.filter(s => s.id !== snapshotId)
        localStorage.setItem('ct_safety_snapshots', JSON.stringify(updated))
        return true
    } catch {
        return false
    }
}

/**
 * Helper to write a JSON payload to a file handle with exponential backoff retry.
 * Handles transient file locks from external cloud sync daemons (e.g. OneDrive).
 */
async function writeWithRetry(fileHandle, json, maxAttempts = 3) {
    let lastErr = null
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const writable = await fileHandle.createWritable()
            await writable.write(json)
            await writable.close()
            return true
        } catch (err) {
            lastErr = err
            console.warn(`Write attempt ${attempt} failed:`, err?.message)
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, attempt * 500))
            }
        }
    }
    throw lastErr
}

/**
 * Retains the 10 most recent auto_ snapshots and daily_ snapshots within 14 days.
 */
async function pruneDirectorySnapshots(dirHandle) {
    try {
        const autoFiles = []
        const dailyFiles = []

        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                if (entry.name.startsWith('auto_') && entry.name.endsWith('.json')) {
                    autoFiles.push(entry.name)
                } else if (entry.name.startsWith('daily_') && entry.name.endsWith('.json')) {
                    dailyFiles.push(entry.name)
                }
            }
        }

        // 1. Retain 10 most recent auto_ snapshots (ISO timestamp filename sort descending)
        autoFiles.sort().reverse()
        if (autoFiles.length > 10) {
            const toRemove = autoFiles.slice(10)
            for (const name of toRemove) {
                try {
                    await dirHandle.removeEntry(name)
                } catch (e) {
                    console.warn(`Could not prune ${name}:`, e?.message)
                }
            }
        }

        // 2. Retain daily snapshots from the last 14 days
        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
        const cutoffDateStr = formatLocalDate(fourteenDaysAgo)

        for (const name of dailyFiles) {
            const datePart = name.replace(/^daily_/, '').replace(/\.json$/, '')
            if (datePart < cutoffDateStr) {
                try {
                    await dirHandle.removeEntry(name)
                } catch (e) {
                    console.warn(`Could not prune daily file ${name}:`, e?.message)
                }
            }
        }
    } catch (err) {
        console.warn('Pruning routine encountered an error:', err)
    }
}

/**
 * Uses the File System Access API to write rolling backup JSON snapshots into a linked directory.
 * Falls back to single file handle if only legacy file link exists.
 * Returns the ISO timestamp string if successful, false if user denied permission or no handle exists.
 *
 * @returns {Promise<string|boolean>}
 */
export async function quickSyncBackup() {
    if (!window.showDirectoryPicker && !window.showSaveFilePicker) return false

    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    if (!settings) return false

    const dirHandle = settings.backupDirHandle || null
    const fileHandle = settings.backupFileHandle || null

    if (!dirHandle && !fileHandle) return false

    try {
        const handle = dirHandle || fileHandle

        // Request write permission if we don't already have it
        if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
            const permission = await handle.requestPermission({ mode: 'readwrite' })
            if (permission !== 'granted') return false
        }

        const data = await exportAllData()
        const json = JSON.stringify(data, null, 2)
        const now = new Date()
        const nowISO = now.toISOString()
        const todayStr = formatLocalDate(now)

        if (dirHandle) {
            if (typeof dirHandle.getFileHandle !== 'function') {
                console.warn('Backup directory handle is invalid or stale. Clearing from settings.')
                const freshSettings = await db.get('settings', 'singleton')
                if (freshSettings) {
                    delete freshSettings.backupDirHandle
                    await db.put('settings', freshSettings, 'singleton')
                }
                return false
            }

            // 1. Write rolling auto snapshot (colon and period free for full OS filesystem compatibility)
            const autoFilename = `auto_${nowISO.replace(/[:.]/g, '-')}.json`
            const targetFileHandle = await dirHandle.getFileHandle(autoFilename, { create: true })
            await writeWithRetry(targetFileHandle, json)

            // 2. Check and create daily backup if not already present for today
            const dailyFilename = `daily_${todayStr}.json`
            let dailyExists = false
            try {
                await dirHandle.getFileHandle(dailyFilename, { create: false })
                dailyExists = true
            } catch {
                dailyExists = false
            }

            if (!dailyExists) {
                const dailyFileHandle = await dirHandle.getFileHandle(dailyFilename, { create: true })
                await writeWithRetry(dailyFileHandle, json)
            }

            // 3. Automated retention pruning (10 auto saves + 14 daily saves)
            await pruneDirectorySnapshots(dirHandle)

        } else if (fileHandle) {
            if (typeof fileHandle.createWritable !== 'function') {
                console.warn('Backup file handle is invalid or stale. Clearing from settings.')
                const freshSettings = await db.get('settings', 'singleton')
                if (freshSettings) {
                    delete freshSettings.backupFileHandle
                    await db.put('settings', freshSettings, 'singleton')
                }
                return false
            }
            await writeWithRetry(fileHandle, json)
        }

        // Persist the sync timestamp so page reloads know we're up to date
        const freshSettings = await db.get('settings', 'singleton')
        if (freshSettings) {
            freshSettings.lastSyncedAt = nowISO
            await db.put('settings', freshSettings, 'singleton')
        }

        hasUnsyncedChanges.value = false
        return nowISO
    } catch (err) {
        console.error('Quick sync failed:', err)
        return false // e.g. folder/file moved, permission denied, or lock error
    }
}

/**
 * Inspects the linked backup directory and returns a sorted list of all detected backups.
 *
 * @returns {Promise<Array<{ name: string, type: 'auto'|'daily'|'legacy', size: number, lastModified: number, lastModifiedISO: string }>>}
 */
export async function listDirectoryBackups() {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    const dirHandle = settings?.backupDirHandle
    if (!dirHandle || typeof dirHandle.getFileHandle !== 'function') return []

    try {
        if (dirHandle.queryPermission && (await dirHandle.queryPermission({ mode: 'read' })) !== 'granted') {
            return []
        }

        const backups = []
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                const isAuto = entry.name.startsWith('auto_')
                const isDaily = entry.name.startsWith('daily_')
                const isLegacy = entry.name === 'classroom-tracker-live-backup.json'

                if (isAuto || isDaily || isLegacy) {
                    try {
                        const file = await entry.getFile()
                        backups.push({
                            name: entry.name,
                            type: isAuto ? 'auto' : (isDaily ? 'daily' : 'legacy'),
                            size: file.size,
                            lastModified: file.lastModified,
                            lastModifiedISO: new Date(file.lastModified).toISOString()
                        })
                    } catch (e) {
                        console.warn(`Could not inspect backup file ${entry.name}:`, e)
                    }
                }
            }
        }

        // Sort newest first
        backups.sort((a, b) => b.lastModified - a.lastModified)
        return backups
    } catch (err) {
        console.warn('Could not list directory backups:', err)
        return []
    }
}

/**
 * Loads and restores a backup JSON file directly from the linked directory.
 *
 * @param {string} fileName
 * @returns {Promise<{ classCount: number, eventCount: number }>}
 */
export async function restoreDirectoryBackup(fileName) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    const dirHandle = settings?.backupDirHandle
    if (!dirHandle) throw new Error('No backup directory is linked.')

    const fileHandle = await dirHandle.getFileHandle(fileName, { create: false })
    const file = await fileHandle.getFile()
    const text = await file.text()
    const data = JSON.parse(text)
    return await importAllData(data)
}

/**
 * Reads and previews a backup JSON file directly from the linked directory without importing.
 *
 * @param {string} fileName
 * @returns {Promise<Object>}
 */
export async function previewDirectoryBackup(fileName) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    const dirHandle = settings?.backupDirHandle
    if (!dirHandle) throw new Error('No backup directory is linked.')

    const fileHandle = await dirHandle.getFileHandle(fileName, { create: false })
    const file = await fileHandle.getFile()
    const text = await file.text()
    const data = JSON.parse(text)
    return data
}

/**
 * Restores all data from a backup object.
 * CLAUDE.md §13:
 *  - Validates schemaVersion before writing anything
 *  - Writes all stores in a single IDB transaction
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

    // Latest version check
    if (backupObj.schemaVersion > CURRENT_SCHEMA) {
        throw new Error(
            `The backup file is from a newer version of the app (v${backupObj.schemaVersion}). Please update your app before importing.`
        )
    }

    // Auto-create safety snapshot of current data before overwriting
    await createSafetySnapshot('Before restoring backup file')

    // Apply migrations if legacy
    let data = backupObj
    if (data.schemaVersion < CURRENT_SCHEMA) {
        console.log(`Migrating backup from v${backupObj.schemaVersion || 1} to v${CURRENT_SCHEMA}...`)
        data = migrateData(data)
    }

    const { settings, classes = [], events = [], assessments = [], grades = [], learning_skills = [], photos = [] } = data

    const db = await getDB()

    // Preserve current machine's backup handles — the ones in the backup
    // may be from a different machine and would be invalid here.
    const currentSettings = await db.get('settings', 'singleton')
    const existingDirHandle = currentSettings?.backupDirHandle ?? null
    const existingFileHandle = currentSettings?.backupFileHandle ?? null

    // Single transaction across all primary stores
    const tx = db.transaction(['settings', 'classes', 'events', 'assessments', 'grades', 'learning_skills'], 'readwrite')

    // Clear and rewrite settings
    await tx.objectStore('settings').clear()
    if (settings) {
        // Restore our machine's handles, not the ones from the backup
        const restoredSettings = { 
            ...settings, 
            backupDirHandle: existingDirHandle,
            backupFileHandle: existingFileHandle 
        }
        await tx.objectStore('settings').put(restoredSettings, 'singleton')
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

    // Clear and rewrite learning_skills
    await tx.objectStore('learning_skills').clear()
    for (const ls of learning_skills) {
        await tx.objectStore('learning_skills').put(ls)
    }

    await tx.done

    // Restore photos if present
    if (Array.isArray(photos) && photos.length > 0) {
        try {
            const photoTx = db.transaction('student_photos', 'readwrite')
            const photoStore = photoTx.objectStore('student_photos')
            await photoStore.clear()
            for (const p of photos) {
                if (p.studentId && p.dataUrl) {
                    const res = await fetch(p.dataUrl)
                    const blob = await res.blob()
                    await photoStore.put({
                        studentId: String(p.studentId),
                        blob,
                        updatedAt: p.updatedAt || new Date().toISOString()
                    })
                }
            }
            await photoTx.done
        } catch (e) {
            console.warn('Could not restore photos:', e)
        }
    }

    hasUnsyncedChanges.value = false // We just loaded exact synced data

    // Clear the persisted timestamp so it doesn't show stale info after a restore
    const freshSettings = await db.get('settings', 'singleton')
    if (freshSettings) {
        freshSettings.lastSyncedAt = null
        await db.put('settings', freshSettings, 'singleton')
    }

    return { classCount: classes.length, eventCount: events.length }
}

/**
 * Returns a date range object representing the start and end of the given reporting period.
 * Used by UI components to build { from, to } date filters.
 *
 * @param {'week'|'last_week'|'month'|'semester'|'all'} period
 * @returns {{ from?: string, to?: string }}
 */
export function getDateRangeForPeriod(period) {
    const now = new Date()
    if (period === 'all') return {}

    const getMonday = (d) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        return date;
    }

    if (period === 'week') {
        return { from: formatLocalDate(getMonday(now)) }
    }
    if (period === 'last_week') {
        const thisMonday = getMonday(now);
        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(lastMonday.getDate() - 7);
        const lastSunday = new Date(thisMonday);
        lastSunday.setDate(lastSunday.getDate() - 1);
        return { from: formatLocalDate(lastMonday), to: formatLocalDate(lastSunday) }
    }
    if (period === 'month') {
        const d = new Date(now)
        d.setMonth(d.getMonth() - 1)
        return { from: formatLocalDate(d) }
    }
    if (period === 'semester') {
        const d = new Date(now)
        d.setMonth(d.getMonth() - 5)
        return { from: formatLocalDate(d) }
    }
    return {}
}

/**
 * Returns a date range object representing the start and end of the given reporting period,
 * optionally anchoring the 'semester' period to actual term boundaries.
 *
 * @param {'week'|'last_week'|'month'|'semester'|'all'} period
 * @param {Object} [classObj]
 * @param {Array<Object>} [academicTerms]
 * @returns {{ from?: string, to?: string }}
 */
export function getDateRangeForClassPeriod(period, classObj, academicTerms = []) {
    if (period === 'semester') {
        if (classObj) {
            const term = academicTerms.find(t => t.year === classObj.year && String(t.semester) === String(classObj.semester))
            if (term && term.startDate && term.endDate) {
                const todayStr = formatLocalDate(new Date())
                // Cap at today's date if the semester is still running
                const toDate = term.endDate < todayStr ? term.endDate : todayStr
                return { from: term.startDate, to: toDate }
            }
        }

        // Fallback: Rolling 5-month window
        const now = new Date()
        const d = new Date(now)
        d.setMonth(d.getMonth() - 5)
        return { from: formatLocalDate(d) }
    }

    return getDateRangeForPeriod(period)
}

/**
 * Returns the ISO timestamp of the last successful quick sync, or null.
 */
export async function getLastSyncedAt() {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    return settings?.lastSyncedAt ?? null
}

/**
 * Returns true if the backup directory handle in settings is a live, valid FileSystemHandle.
 * Used by UI components to determine if the "Folder Linked" status is truly active.
 */
export async function isSyncActive() {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    const dirHandle = settings?.backupDirHandle
    const fileHandle = settings?.backupFileHandle
    return !!(
        (dirHandle && typeof dirHandle.getFileHandle === 'function') ||
        (fileHandle && typeof fileHandle.createWritable === 'function')
    )
}

export async function detachEventsForDeletedExpectation(classId, expectationId) {
    const db = await getDB()
    const tx = db.transaction('events', 'readwrite')
    const store = tx.objectStore('events')
    const events = await store.index('by_classId').getAll(classId)
    
    let count = 0
    for (const e of events) {
        if (e.expectationId === expectationId) {
            e.expectationId = null
            e.unitId = null
            await store.put(e)
            count++
        }
    }
    await tx.done
    hasUnsyncedChanges.value = true
    return count
}

export async function renameEventsForExpectation(classId, oldExpIdOrCode, newCode) {
    if (!classId || !oldExpIdOrCode || !newCode) return 0
    const db = await getDB()
    const tx = db.transaction('events', 'readwrite')
    const store = tx.objectStore('events')
    const events = await store.index('by_classId').getAll(classId)
    
    let count = 0
    const oldNorm = String(oldExpIdOrCode).toLowerCase()
    for (const e of events) {
        if (e.expectationId && String(e.expectationId).toLowerCase() === oldNorm) {
            e.expectationId = newCode
            await store.put(e)
            count++
        }
    }
    await tx.done
    hasUnsyncedChanges.value = true
    return count
}

export async function detachEventsForDeletedUnit(classId, unitId) {
    const db = await getDB()
    const tx = db.transaction('events', 'readwrite')
    const store = tx.objectStore('events')
    const events = await store.index('by_classId').getAll(classId)
    
    let count = 0
    for (const e of events) {
        if (e.unitId === unitId) {
            e.expectationId = null
            e.unitId = null
            await store.put(e)
            count++
        }
    }
    await tx.done
    hasUnsyncedChanges.value = true
    return count
}
