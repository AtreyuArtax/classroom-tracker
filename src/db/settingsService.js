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
        schemaVersion: 3,
        gridSize: { rows: 6, cols: 6 },
        behaviorCodes: {
            p: { icon: 'Hand', label: 'Participation', category: 'positive', type: 'standard', requiresNote: false },
            m: { icon: 'Smartphone', label: 'On Device', category: 'redirect', type: 'standard', requiresNote: false },
            w: { icon: 'Toilet', label: 'Washroom', category: 'neutral', type: 'toggle', requiresNote: false },
            a: { icon: 'UserX', label: 'Absent', category: 'attendance', type: 'attendance', requiresNote: false },
            l: { icon: 'Clock', label: 'Late', category: 'attendance', type: 'attendance', requiresNote: false },
            ob: { icon: 'Eye', label: 'Observation', category: 'note', type: 'standard', requiresNote: true },
            cv: { icon: 'MessageSquare', label: 'Conversation', category: 'note', type: 'standard', requiresNote: true },
            pc: { icon: 'Phone', label: 'Parent Contact', category: 'communication', type: 'standard', requiresNote: true },
        },
    }
    await db.put('settings', defaults, SETTINGS_KEY)
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
    const settings = await _readSettings()
    const { codeKey, ...rest } = codeObj
    settings.behaviorCodes[codeKey] = rest
    await saveSettings(settings)
}

/**
 * Removes a behavior code from the map by its key.
 *
 * @param {string} codeKey
 * @returns {Promise<void>}
 */
export async function deleteBehaviorCode(codeKey) {
    const settings = await _readSettings()
    delete settings.behaviorCodes[codeKey]
    await saveSettings(settings)
}
