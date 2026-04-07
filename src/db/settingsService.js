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
    const db = await getDB()
    const rec = await db.get('settings', SETTINGS_KEY)
    if (rec) return rec

    // Fallback: seed defaults (should have been written during upgrade, but guard anyway)
    const defaults = {
        schemaVersion: 23,
        gridSize: { rows: 6, cols: 6 },
        behaviorCodes: {
            note: {
                key: 'note',
                icon: 'NotebookPen',
                label: 'Note',
                category: 'note',
                type: 'standard',
                requiresNote: true,
                isTopLevel: true
            },
            m: {
                key: 'm',
                icon: 'Smartphone',
                label: 'On Device',
                category: 'redirect',
                type: 'standard',
                requiresNote: false,
                isTopLevel: true
            },
            w: {
                key: 'w',
                icon: 'Toilet',
                label: 'Washroom',
                category: 'washroom',
                type: 'toggle',
                requiresNote: false,
                isTopLevel: true
            },
            a: {
                key: 'a',
                icon: 'UserX',
                label: 'Absent',
                category: 'absence',
                type: 'attendance',
                requiresNote: false,
                isTopLevel: false
            },
            l: {
                key: 'l',
                icon: 'Clock',
                label: 'Late',
                category: 'late',
                type: 'attendance',
                requiresNote: false,
                isTopLevel: false
            },
            pc: {
                key: 'pc',
                icon: 'Phone',
                label: 'Parent',
                category: 'communication',
                type: 'standard',
                requiresNote: true,
                isTopLevel: true
            },
            ac: {
                key: 'ac',
                icon: 'GraduationCap',
                label: 'Assessment',
                category: 'assessment',
                type: 'standard',
                requiresNote: true,
                isTopLevel: true
            }
        },
        thresholds: {
            washroomTripsPerWeek: 4,
            deviceIncidentsPerWeek: 3
        },
        backupFileHandle: null,
        gradebookMilestones: [],
        gradebookTemplates: [],
        academicTerms: [],
        teacherName: '',
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
        nonSchoolDays: []
    }
    await db.put('settings', defaults, SETTINGS_KEY)
    hasUnsyncedChanges.value = true
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
    return Object.entries(settings.behaviorCodes).map(([codeKey, code]) => ({
        codeKey,
        ...code,
    }))
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
    const settings = await db.get('settings', 'singleton')
    settings.behaviorCodes[codeObj.codeKey] = codeObj
    await db.put('settings', settings, 'singleton')
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
    return settings.thresholds || { washroomTripsPerWeek: 4, deviceIncidentsPerWeek: 3 }
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
