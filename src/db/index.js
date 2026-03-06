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
 *
 * Bug fixes vs original:
 *  1. Cache the PROMISE (_dbPromise), not the resolved value.
 *     The old code set `_db = await openDB(...)` which means concurrent
 *     callers (e.g. Promise.all in useClassroom.init) all race through the
 *     `if (_db)` guard while the first openDB is still in-flight, resulting
 *     in multiple openDB() calls and an InvalidStateError (version change
 *     transaction already running).
 *  2. Use the named `transaction` parameter in upgrade() for seeding.
 *     `arguments[3]` is undefined in ES module arrow functions.
 */

import { openDB } from 'idb'

const DB_NAME = 'classroomTrackerDB'
const DB_VERSION = 1

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

  // Assign the promise immediately (before any await) so concurrent callers
  // pick up the same promise rather than spawning a second openDB().
  _dbPromise = openDB(DB_NAME, DB_VERSION, {

    // idb calls upgrade(db, oldVersion, newVersion, transaction)
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

      // ── seed defaults on fresh install ───────────────────────────────────
      // Must use the `transaction` parameter idb passes — never db.transaction()
      // inside upgrade(), as the version-change transaction is already running.
      if (oldVersion === 0) {
        transaction.objectStore('settings').put(
          {
            schemaVersion: 1,
            gridSize: { rows: 6, cols: 6 },
            behaviorCodes: {
              p: { icon: '✋', label: 'Participation', category: 'positive', type: 'standard' },
              m: { icon: '📱', label: 'On Device', category: 'redirect', type: 'standard' },
              w: { icon: '🚽', label: 'Washroom', category: 'neutral', type: 'toggle' },
            },
          },
          'singleton'
        )
      }
    },
  })

  return _dbPromise
}
