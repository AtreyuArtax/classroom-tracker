/**
 * src/db/index.js
 *
 * Single point of IDB initialisation.
 * Exports ONE function: getDB() → returns the open db instance.
 *
 * Rules (CLAUDE.md §4, §5):
 *  - Uses the `idb` wrapper exclusively (no raw IDBRequest chains)
 *  - Database name:  classroomTrackerDB
 *  - Schema version: 2  (bumped from 1 — adds generalNote + requiresNote + new codes)
 *  - Stores: settings | classes | events
 *  - All indexes on `events` are created here in upgrade()
 *
 * Version 2 migration (oldVersion < 2):
 *  - Adds `generalNote: ''` to any student record missing the field
 *  - Adds `requiresNote: false` to any behavior code missing the field
 *  - Adds the three new codes (ob, cv, pc) if they don't exist
 */

import { openDB } from 'idb'

const DB_NAME = 'classroomTrackerDB'
const DB_VERSION = 6

/**
 * Cached promise — set synchronously before the first await so every
 * concurrent caller gets the same promise, not a new openDB() call.
 * @type {Promise<import('idb').IDBPDatabase> | null}
 */
let _dbPromise = null

/**
 * Returns the open IDB database instance (shared singleton).
 * @returns {Promise<import('idb').IDBPDatabase>}
 */
export function getDB() {
  if (_dbPromise) return _dbPromise

  _dbPromise = openDB(DB_NAME, DB_VERSION, {

    async upgrade(db, oldVersion, _newVersion, transaction) {

      // ── settings store ──────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }

      // ── classes store ────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'classId' })
      }

      // ── events store ─────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', {
          keyPath: 'eventId',
          autoIncrement: true,
        })
        eventStore.createIndex('by_studentId', 'studentId', { unique: false })
        eventStore.createIndex('by_classId', 'classId', { unique: false })
        eventStore.createIndex('by_periodNumber', 'periodNumber', { unique: false })
        eventStore.createIndex('by_dayOfWeek', 'dayOfWeek', { unique: false })
        eventStore.createIndex('by_timestamp', 'timestamp', { unique: false })
        eventStore.createIndex('by_category', 'category', { unique: false })
      }

      // ── seed defaults on fresh install (oldVersion === 0) ────────────────
      if (oldVersion === 0) {
        transaction.objectStore('settings').put(
          {
            schemaVersion: 6,
            gridSize: { rows: 6, cols: 6 },
            behaviorCodes: {
              p: { icon: 'Hand', label: 'Participation', category: 'positive', type: 'standard', requiresNote: false, isTopLevel: false },
              m: { icon: 'Smartphone', label: 'On Device', category: 'redirect', type: 'standard', requiresNote: false, isTopLevel: true },
              w: { icon: 'Toilet', label: 'Washroom', category: 'neutral', type: 'toggle', requiresNote: false, isTopLevel: true },
              a: { icon: 'UserX', label: 'Absent', category: 'attendance', type: 'attendance', requiresNote: false, isTopLevel: false },
              l: { icon: 'Clock', label: 'Late', category: 'attendance', type: 'attendance', requiresNote: false, isTopLevel: false },
              ob: { icon: 'Eye', label: 'Observation', category: 'note', type: 'standard', requiresNote: true, isTopLevel: false },
              cv: { icon: 'MessageSquare', label: 'Conversation', category: 'note', type: 'standard', requiresNote: true, isTopLevel: false },
              pc: { icon: 'Phone', label: 'Parent', category: 'communication', type: 'standard', requiresNote: true, isTopLevel: true },
            },
          },
          'singleton'
        )
        return  // fresh install — no migration needed
      }

      // ── version 6 migration (fixing previously silent failures) ───────────
      // The previous migrations (v2-v5) used raw IndexedDB `onsuccess` callbacks
      // which do not work with `idb` Promise wrappers. They failed silently.
      // This version 6 block awaits the promises and applies all missing logic.
      if (oldVersion < 6) {
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')

        if (settings) {
          const codes = settings.behaviorCodes ?? {}

          // Recover v2 logic: Missing fields and missing codes
          for (const key of Object.keys(codes)) {
            if (codes[key].requiresNote === undefined) codes[key].requiresNote = false
          }
          if (!codes.ob) codes.ob = { icon: 'Eye', label: 'Observation', category: 'note', type: 'standard', requiresNote: true }
          if (!codes.cv) codes.cv = { icon: 'MessageSquare', label: 'Conversation', category: 'note', type: 'standard', requiresNote: true }
          if (!codes.pc) codes.pc = { icon: 'Phone', label: 'Parent', category: 'communication', type: 'standard', requiresNote: true }

          // Recover v3/4 logic: Map emoji to Lucide string, resolve Washroom icon back to Toilet
          const emojiMap = {
            '✋': 'Hand', '📱': 'Smartphone', '🚽': 'Toilet', '🚫': 'UserX',
            '⏰': 'Clock', '👁️': 'Eye', '💬': 'MessageSquare', '📞': 'Phone'
          }
          for (const key of Object.keys(codes)) {
            const currentIcon = codes[key].icon
            if (emojiMap[currentIcon]) codes[key].icon = emojiMap[currentIcon]
            if (codes[key].icon === 'Droplets') codes[key].icon = 'Toilet'
          }

          // Recover v5 logic: Top Level toggle default assignment
          const directCategories = new Set(['neutral', 'redirect', 'communication'])
          for (const key of Object.keys(codes)) {
            if (codes[key].isTopLevel === undefined) {
              codes[key].isTopLevel = directCategories.has(codes[key].category)
            }
          }

          settings.schemaVersion = 6
          await settingsStore.put(settings, 'singleton')
        }

        // Recover v2 logic for classes: Add generalNote
        const classesStore = transaction.objectStore('classes')
        const classes = await classesStore.getAll()
        for (const cls of classes) {
          let changed = false
          for (const studentId of Object.keys(cls.students ?? {})) {
            if (cls.students[studentId].generalNote === undefined) {
              cls.students[studentId].generalNote = ''
              changed = true
            }
          }
          if (changed) await classesStore.put(cls)
        }
      }
    },
  })

  return _dbPromise
}
