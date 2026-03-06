/**
 * src/db/index.js
 *
 * Single point of IDB initialisation.
 * Exports ONE function: getDB() → returns the open db instance.
 *
 * Rules (CLAUDE.md §4, §5):
 *  - Uses the `idb` wrapper exclusively (no raw IDBRequest chains)
 *  - Database name:  classroomTrackerDB
 *  - Schema version: 1
 *  - Stores: settings | classes | events
 *  - All indexes on `events` are created here in upgrade()
 */

import { openDB } from 'idb'

const DB_NAME    = 'classroomTrackerDB'
const DB_VERSION = 1

/** @type {import('idb').IDBPDatabase | null} */
let _db = null

/**
 * Returns the open IDB database instance.
 * Opens (and if needed, upgrades) the database on first call.
 * Subsequent calls return the cached instance.
 *
 * @returns {Promise<import('idb').IDBPDatabase>}
 */
export async function getDB() {
  if (_db) return _db

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion /*, newVersion, transaction */) {
      // ── settings store ──────────────────────────────────────────────────
      // Single record keyed by the hardcoded string "singleton"
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }

      // ── classes store ────────────────────────────────────────────────────
      // Keyed by classId (string, e.g. "class_01")
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'classId' })
      }

      // ── events store ─────────────────────────────────────────────────────
      // Auto-increment primary key (eventId).
      // Six indexes required by §5 and §12.
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', {
          keyPath:       'eventId',
          autoIncrement: true,
        })

        eventStore.createIndex('by_studentId',    'studentId',    { unique: false })
        eventStore.createIndex('by_classId',      'classId',      { unique: false })
        eventStore.createIndex('by_periodNumber', 'periodNumber', { unique: false })
        eventStore.createIndex('by_dayOfWeek',    'dayOfWeek',    { unique: false })
        eventStore.createIndex('by_timestamp',    'timestamp',    { unique: false })
        eventStore.createIndex('by_category',     'category',     { unique: false })
      }

      // ── seed default settings on fresh install ───────────────────────────
      if (oldVersion === 0) {
        // We can write to the object store directly during upgrade because
        // `idb` exposes the underlying IDBObjectStore synchronously here.
        const settingsStore = db
          .transaction('settings', 'readwrite')
          .objectStore('settings')

        // Seed happens inside upgrade(); the transaction is already open.
        // Use the store reference from the upgrade transaction directly.
        const tx = arguments[3] // the IDBPTransaction passed by idb
        if (tx) {
          tx.objectStore('settings').put(
            {
              schemaVersion: 1,
              gridSize: { rows: 6, cols: 6 },
              behaviorCodes: {
                p: { icon: '✋', label: 'Participation', category: 'positive', type: 'standard' },
                m: { icon: '📱', label: 'On Device',     category: 'redirect', type: 'standard' },
                w: { icon: '🚽', label: 'Washroom',      category: 'neutral',  type: 'toggle'   },
              },
            },
            'singleton'
          )
        }
      }
    },
  })

  return _db
}
