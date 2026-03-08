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
const DB_VERSION = 4

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

    upgrade(db, oldVersion, _newVersion, transaction) {

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
            schemaVersion: 4,
            gridSize: { rows: 6, cols: 6 },
            behaviorCodes: {
              p: { icon: 'Hand', label: 'Participation', category: 'positive', type: 'standard', requiresNote: false },
              m: { icon: 'Smartphone', label: 'On Device', category: 'redirect', type: 'standard', requiresNote: false },
              w: { icon: 'Toilet', label: 'Washroom', category: 'neutral', type: 'toggle', requiresNote: false },
              a: { icon: 'UserX', label: 'Absent', category: 'attendance', type: 'attendance', requiresNote: false },
              l: { icon: 'Clock', label: 'Late', category: 'attendance', type: 'attendance', requiresNote: false },
              ob: { icon: 'Eye', label: 'Observation', category: 'note', type: 'standard', requiresNote: true },
              cv: { icon: 'MessageSquare', label: 'Conversation', category: 'note', type: 'standard', requiresNote: true },
              pc: { icon: 'Phone', label: 'Parent', category: 'communication', type: 'standard', requiresNote: true },
            },
          },
          'singleton'
        )
        return  // fresh install — no migration needed
      }

      // ── version 2 migration (upgrading from v1) ───────────────────────────
      if (oldVersion < 2) {
        const settingsStore = transaction.objectStore('settings')
        const classesStore = transaction.objectStore('classes')

        // Patch settings: add requiresNote to existing codes, add new codes
        const settingsReq = settingsStore.get('singleton')
        settingsReq.onsuccess = () => {
          const settings = settingsReq.result
          if (!settings) return

          const codes = settings.behaviorCodes ?? {}

          // Add requiresNote: false to any existing code that lacks it
          for (const key of Object.keys(codes)) {
            if (codes[key].requiresNote === undefined) {
              codes[key].requiresNote = false
            }
          }

          // Add the three new codes if missing
          if (!codes.ob) codes.ob = { icon: '👁️', label: 'Observation', category: 'note', type: 'standard', requiresNote: true }
          if (!codes.cv) codes.cv = { icon: '💬', label: 'Conversation', category: 'note', type: 'standard', requiresNote: true }
          if (!codes.pc) codes.pc = { icon: 'Phone', label: 'Parent', category: 'communication', type: 'standard', requiresNote: true }

          settings.schemaVersion = 2
          settingsStore.put(settings, 'singleton')
        }

        // Patch all class records: add generalNote: '' to any student missing it
        const classesReq = classesStore.getAll()
        classesReq.onsuccess = () => {
          const classes = classesReq.result ?? []
          for (const cls of classes) {
            let changed = false
            for (const studentId of Object.keys(cls.students ?? {})) {
              if (cls.students[studentId].generalNote === undefined) {
                cls.students[studentId].generalNote = ''
                changed = true
              }
            }
            if (changed) classesStore.put(cls)
          }
        }
      }

      // ── version 3 migration (upgrading from v2) ───────────────────────────
      // Converts existing emoji icons to Lucide icon name strings
      if (oldVersion < 3) {
        const settingsStore = transaction.objectStore('settings')
        const req = settingsStore.get('singleton')
        req.onsuccess = () => {
          const settings = req.result
          if (!settings) return

          const codes = settings.behaviorCodes ?? {}
          const emojiMap = {
            '✋': 'Hand',
            '📱': 'Smartphone',
            '🚽': 'Toilet',
            '🚫': 'UserX',
            '⏰': 'Clock',
            '👁️': 'Eye',
            '💬': 'MessageSquare',
            '📞': 'Phone'
          }

          for (const key of Object.keys(codes)) {
            const currentIcon = codes[key].icon
            if (emojiMap[currentIcon]) {
              codes[key].icon = emojiMap[currentIcon]
            }
          }

          settings.schemaVersion = 3
          settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 4 migration (upgrading from v3) ───────────────────────────
      // Converts mistaken 'Droplets' icon back to 'Toilet' for washroom
      if (oldVersion < 4) {
        const settingsStore = transaction.objectStore('settings')
        const req = settingsStore.get('singleton')
        req.onsuccess = () => {
          const settings = req.result
          if (!settings) return

          const codes = settings.behaviorCodes ?? {}
          for (const key of Object.keys(codes)) {
            if (codes[key].icon === 'Droplets') {
              codes[key].icon = 'Toilet'
            }
          }

          settings.schemaVersion = 4
          settingsStore.put(settings, 'singleton')
        }
      }
    },
  })

  return _dbPromise
}
