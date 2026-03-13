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
        schemaVersion: 10,
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
                category: 'neutral',
                type: 'toggle',
                requiresNote: false,
                isTopLevel: true
            },
            a: {
                key: 'a',
                icon: 'UserX',
                label: 'Absent',
                category: 'attendance',
                type: 'attendance',
                requiresNote: false,
                isTopLevel: false
            },
            l: {
                key: 'l',
                icon: 'Clock',
                label: 'Late',
                category: 'attendance',
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
