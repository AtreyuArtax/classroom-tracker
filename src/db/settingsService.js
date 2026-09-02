/**
 * src/db/settingsService.js
 *
 * Public API for the `settings` object store.
 * All reads/writes go through getDB() — never raw IndexedDB.
 *
 * CLAUDE.md §4 — exact function signatures required:
 *   getSettings()
 *   saveSettings(settingsObj)
 *   getBehaviorCodes()
 *   saveBehaviorCode(codeObj)
 *   deleteBehaviorCode(codeKey)
 */

import { getDB } from './index.js'
import { hasUnsyncedChanges } from './eventService.js'

const SETTINGS_KEY = 'singleton'

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the entire settings record.
 * Creates the default record if it doesn't exist yet.
 *
 * @returns {Promise<Object>}
 */
async function _readSettings() {
    try {
        if (typeof indexedDB !== 'undefined') {
            const db = await getDB()
            const rec = await db.get('settings', SETTINGS_KEY)
            if (rec) {
                return rec
            }
        }
    } catch (err) {
        console.warn('Unable to read settings from IndexedDB, using defaults:', err?.message)
    }

    // Fallback: seed defaults (should have been written during upgrade, but guard anyway)
    const defaults = {
        schemaVersion: 32,
        gridSize: { rows: 6, cols: 6 },
        behaviorCodes: {
            w: {
                key: 'w',
                codeKey: 'w',
                icon: 'DoorOpen',
                label: 'Out of Class',
                category: 'neutral',
                type: 'toggle',
                requiresNote: false,
                isTopLevel: true,
                order: 0,
                enabled: true
            },
            a: {
                key: 'a',
                codeKey: 'a',
                icon: 'UserX',
                label: 'Absent',
                category: 'attendance',
                type: 'attendance',
                requiresNote: false,
                isTopLevel: true,
                order: 1,
                enabled: true
            },
            l: {
                key: 'l',
                codeKey: 'l',
                icon: 'Clock',
                label: 'Late',
                category: 'attendance',
                type: 'attendance',
                requiresNote: false,
                isTopLevel: true,
                order: 2,
                enabled: true
            },
            note: {
                key: 'note',
                codeKey: 'note',
                icon: 'NotebookPen',
                label: 'Note',
                category: 'note',
                type: 'standard',
                requiresNote: true,
                isTopLevel: true,
                order: 3,
                enabled: true
            },
            pc: {
                key: 'pc',
                codeKey: 'pc',
                icon: 'Phone',
                label: 'Parent',
                category: 'communication',
                type: 'standard',
                requiresNote: true,
                isTopLevel: true,
                order: 4,
                enabled: true
            },
            ac: {
                key: 'ac',
                codeKey: 'ac',
                icon: 'GraduationCap',
                label: 'Assessment',
                category: 'assessment',
                type: 'standard',
                requiresNote: true,
                isTopLevel: true,
                order: 5,
                enabled: true
            },
            m: {
                key: 'm',
                codeKey: 'm',
                icon: 'Smartphone',
                label: 'On Device',
                category: 'redirect',
                type: 'standard',
                requiresNote: false,
                isTopLevel: true,
                order: 6,
                enabled: true
            }
        },
        thresholds: {
            washroomTripsPerWeek: 4,
            washroomWeeklyMinutesLimit: 20,
            washroomDurationLimit: 11,
            deviceIncidentsPerWeek: 3
        },
        backupDirHandle: null,
        backupFileHandle: null,
        gradebookMilestones: [],
        gradebookTemplates: [],
        teacherName: '',
        attendanceMode: 'natural',
        latenessGracePeriod: 5,
        periodStartTimes: {
            '1': '08:00',
            '2': '09:20',
            '3': '11:40',
            '4': '13:00'
        },
        gradeBuckets: [
            { label: 'R', min: 0, max: 49, color: '#ff3b30' },
            { label: 'L1', min: 50, max: 59, color: '#ff9500' },
            { label: 'L2', min: 60, max: 69, color: '#ffcc00' },
            { label: 'L3', min: 70, max: 79, color: '#30b0c7' },
            { label: 'L4', min: 80, max: 100, color: '#34c759' }
        ],
        capGradesAt100: true,
        nonSchoolDays: [],
        appTheme: 'system'
    }
    if (typeof indexedDB !== 'undefined') {
        try {
            const db = await getDB()
            await db.put('settings', defaults, SETTINGS_KEY)
            hasUnsyncedChanges.value = true
        } catch (e) {
            // ignore fallback write failure in non-browser context
        }
    }
    return defaults
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Returns the full settings object (gridSize, behaviorCodes, schemaVersion).
 *
 * @returns {Promise<Object>}
 */
export async function getSettings() {
    return _readSettings()
}

/**
 * Overwrites the entire settings record.
 * Pass the full settings object (spread existing + modified fields).
 *
 * @param {Object} settingsObj
 * @returns {Promise<void>}
 */
export async function saveSettings(settingsObj) {
    const db = await getDB()
    await db.put('settings', settingsObj, SETTINGS_KEY)
    hasUnsyncedChanges.value = true
}

/**
 * Returns the behaviorCodes map as an array of enriched objects
 * (each object includes its key as `codeKey` for convenience).
 *
 * @returns {Promise<Array<{codeKey: string, icon: string, label: string, category: string, type: string}>>}
 */
export async function getBehaviorCodes() {
    const settings = await _readSettings()
    const codesMap = settings.behaviorCodes || {}
    const result = []
    const seenLower = new Set()

    let idx = 0
    for (const [codeKey, code] of Object.entries(codesMap)) {
        const lower = codeKey.toLowerCase()
        if (seenLower.has(lower)) continue
        seenLower.add(lower)
        result.push({
            codeKey,
            ...code,
            enabled: code.enabled !== false,
            order: code.order ?? idx++
        })
    }

    return result.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

/**
 * Adds or updates a single behavior code in the map.
 * `codeObj.codeKey` is used as the map key.
 *
 * @param {{ codeKey: string, icon: string, label: string, category: string, type: string }} codeObj
 * @returns {Promise<void>}
 */
export async function saveBehaviorCode(codeObj) {
    const db = await getDB()
    const settings = await db.get('settings', SETTINGS_KEY) || await _readSettings()
    if (!settings.behaviorCodes) settings.behaviorCodes = {}

    const targetKey = codeObj.codeKey
    // Remove any case-insensitive collisions/duplicates
    for (const k of Object.keys(settings.behaviorCodes)) {
        if (k.toLowerCase() === targetKey.toLowerCase()) {
            delete settings.behaviorCodes[k]
        }
    }

    settings.behaviorCodes[targetKey] = {
        ...codeObj,
        codeKey: targetKey,
        enabled: codeObj.enabled !== false
    }

    await db.put('settings', settings, SETTINGS_KEY)
    hasUnsyncedChanges.value = true
}

/**
 * Persists updated ordering / properties for a batch of behavior codes.
 *
 * @param {Array<Object>} codesList
 * @returns {Promise<void>}
 */
export async function saveBehaviorCodesBatch(codesList) {
    const db = await getDB()
    const settings = await db.get('settings', SETTINGS_KEY) || await _readSettings()
    if (!settings.behaviorCodes) settings.behaviorCodes = {}

    codesList.forEach((c, index) => {
        const targetKey = c.codeKey
        if (settings.behaviorCodes[targetKey]) {
            settings.behaviorCodes[targetKey] = {
                ...settings.behaviorCodes[targetKey],
                ...c,
                order: index
            }
        }
    })

    await db.put('settings', settings, SETTINGS_KEY)
    hasUnsyncedChanges.value = true
}

/**
 * Removes a behavior code from the map by its key.
 *
 * @param {string} codeKey
 * @returns {Promise<void>}
 */
export async function deleteBehaviorCode(codeKey) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    delete settings.behaviorCodes[codeKey]
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}

/**
 * Returns the current behavior thresholds.
 *
 * @returns {Promise<{washroomTripsPerWeek: number, deviceIncidentsPerWeek: number}>}
 */
export async function getThresholds() {
    const settings = await _readSettings()
    return settings.thresholds || { washroomTripsPerWeek: 4, washroomWeeklyMinutesLimit: 20, deviceIncidentsPerWeek: 3, washroomDurationLimit: 11, atRiskThreshold: 70, attendanceThreshold: 85 }
}

/**
 * Saves behavior thresholds.
 *
 * @param {{washroomTripsPerWeek: number, deviceIncidentsPerWeek: number}} thresholdsObj
 * @returns {Promise<void>}
 */
export async function saveThresholds(thresholdsObj) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    settings.thresholds = thresholdsObj
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}

/**
 * Returns the global gradebook milestones.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getGlobalMilestones() {
    const settings = await _readSettings()
    return settings.gradebookMilestones || []
}

/**
 * Saves the global gradebook milestones.
 *
 * @param {Array<Object>} milestones
 * @returns {Promise<void>}
 */
export async function saveGlobalMilestones(milestones) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    settings.gradebookMilestones = milestones
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}

/**
 * Returns saved seating layout presets.
 * @returns {Promise<Array<Object>>}
 */
export async function getSavedLayoutPresets() {
    const settings = await _readSettings()
    return settings.savedLayoutPresets || []
}

/**
 * Saves a layout preset template to global settings.
 * @param {Object} presetObj { id, name, rows, cols, layoutConfig }
 * @returns {Promise<void>}
 */
export async function saveLayoutPreset(presetObj) {
    const db = await getDB()
    const settings = await _readSettings()
    if (!settings.savedLayoutPresets) settings.savedLayoutPresets = []
    const existingIdx = settings.savedLayoutPresets.findIndex(p => p.id === presetObj.id)
    if (existingIdx >= 0) {
        settings.savedLayoutPresets[existingIdx] = presetObj
    } else {
        settings.savedLayoutPresets.push(presetObj)
    }
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}

/**
 * Deletes a layout preset template by ID.
 * @param {string} presetId
 * @returns {Promise<void>}
 */
export async function deleteLayoutPreset(presetId) {
    const db = await getDB()
    const settings = await _readSettings()
    if (settings.savedLayoutPresets) {
        settings.savedLayoutPresets = settings.savedLayoutPresets.filter(p => p.id !== presetId)
        await db.put('settings', settings, 'singleton')
        hasUnsyncedChanges.value = true
    }
}

/**
 * Returns the global teacher name.
 *
 * @returns {Promise<string>}
 */
export async function getTeacherName() {
    const settings = await _readSettings()
    return settings.teacherName || ''
}

/**
 * Saves the global teacher name.
 *
 * @param {string} name
 * @returns {Promise<void>}
 */
export async function saveTeacherName(name) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    settings.teacherName = name
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}

/**
 * Returns the configured app theme ('system' | 'light' | 'dark').
 *
 * @returns {Promise<string>}
 */
export async function getAppTheme() {
    const settings = await _readSettings()
    return settings.appTheme || 'system'
}

/**
 * Saves the global app theme preference.
 *
 * @param {string} theme ('system' | 'light' | 'dark')
 * @returns {Promise<void>}
 */
export async function saveAppTheme(theme) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    if (settings) {
        settings.appTheme = theme
        await db.put('settings', settings, 'singleton')
        hasUnsyncedChanges.value = true
    }
}

/**
 * Returns the attendance configuration (mode, gracePeriod).
 *
 * @returns {Promise<{attendanceMode: string, latenessGracePeriod: number}>}
 */
export async function getAttendanceConfig() {
    const settings = await _readSettings()
    return {
        attendanceMode: settings.attendanceMode || 'natural',
        latenessGracePeriod: settings.latenessGracePeriod !== undefined ? settings.latenessGracePeriod : 5
    }
}

/**
 * Saves the attendance configuration.
 *
 * @param {{mode: string, gracePeriod: number}} config
 * @returns {Promise<void>}
 */
export async function saveAttendanceConfig({ mode, gracePeriod }) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    settings.attendanceMode = mode
    settings.latenessGracePeriod = gracePeriod
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}

/**
 * Returns the defined academic terms.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getAcademicTerms() {
    const settings = await _readSettings()
    return settings.academicTerms || []
}

/**
 * Saves the academic terms list.
 *
 * @param {Array<Object>} terms Array of { name, semester, start, end }
 * @returns {Promise<void>}
 */
export async function saveAcademicTerms(terms) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    settings.academicTerms = terms
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}

/**
 * Returns the default start times for each period.
 *
 * @returns {Promise<Object>}
 */
export async function getPeriodStartTimes() {
    const settings = await _readSettings()
    return settings.periodStartTimes || {
        '1': '08:00',
        '2': '09:20',
        '3': '11:40',
        '4': '13:00'
    }
}

/**
 * Saves default start times for periods.
 *
 * @param {Object} timesObj Map of { periodNumber: startTime }
 * @returns {Promise<void>}
 */
export async function savePeriodStartTimes(timesObj) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    settings.periodStartTimes = timesObj
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}

/**
 * Returns the global grade buckets for level distribution.
 */
export async function getGradeBuckets() {
    const settings = await _readSettings()
    return settings.gradeBuckets || [
        { label: 'R', min: 0, max: 49, color: '#ff3b30' },
        { label: 'L1', min: 50, max: 59, color: '#ff9500' },
        { label: 'L2', min: 60, max: 69, color: '#ffcc00' },
        { label: 'L3', min: 70, max: 79, color: '#30b0c7' },
        { label: 'L4', min: 80, max: 100, color: '#34c759' }
    ]
}

/**
 * Saves global grade buckets.
 */
export async function saveGradeBuckets(buckets) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    settings.gradeBuckets = buckets
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}

/**
 * Returns the defined holidays and PD days.
 *
 * @returns {Promise<Array<{date: string, label: string}>>}
 */
export async function getNonSchoolDays() {
    const settings = await _readSettings()
    return settings.nonSchoolDays || []
}

/**
 * Saves the non-school days list.
 *
 * @param {Array<{date: string, label: string}>} days
 * @returns {Promise<void>}
 */
export async function saveNonSchoolDays(days) {
    const db = await getDB()
    const settings = await db.get('settings', 'singleton')
    settings.nonSchoolDays = days
    await db.put('settings', settings, 'singleton')
    hasUnsyncedChanges.value = true
}
/**
 * Audits settings for integrity issues.
 * @returns {Promise<Object>} { issues: Array<string>, fixedCount: number }
 */
export async function auditSettingsIntegrity() {
    const db = await getDB()
    const settings = await db.get('settings', SETTINGS_KEY)
    if (!settings) return { issues: [], fixedCount: 0 }

    const issues = []
    let fixedCount = 0
    let changed = false

    // 1. Check academicTerms for missing instructionalDays
    if (settings.academicTerms) {
        for (const term of settings.academicTerms) {
            if (term.instructionalDays === undefined) {
                term.instructionalDays = term.semester === '2' ? 93 : (term.semester === '1' ? 94 : 187)
                issues.push(`Fixed missing instructionalDays for term: ${term.year} ${term.semester}`)
                fixedCount++
                changed = true
            }
        }
    }

    // 2. Check schemaVersion
    if (settings.schemaVersion < 28) {
        settings.schemaVersion = 28
        issues.push(`Updated schemaVersion to 28`)
        fixedCount++
        changed = true
    }

    if (changed) {
        await db.put('settings', settings, SETTINGS_KEY)
        hasUnsyncedChanges.value = true
    }

    return { issues, fixedCount }
}
