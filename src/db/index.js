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
const DB_VERSION = 16

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

      // ── assessments store (v11) ──────────────────────────────────────────
      if (!db.objectStoreNames.contains('assessments')) {
        const assessmentStore = db.createObjectStore('assessments', {
          keyPath: 'assessmentId',
          autoIncrement: true
        })
        assessmentStore.createIndex('by_classId', 'classId')
        assessmentStore.createIndex('by_categoryId', 'categoryId')
        assessmentStore.createIndex('by_date', 'date')
      }

      // ── grades store (v11) ───────────────────────────────────────────────
      if (!db.objectStoreNames.contains('grades')) {
        const gradeStore = db.createObjectStore('grades', {
          keyPath: 'gradeId',
          autoIncrement: true
        })
        gradeStore.createIndex('by_assessmentId', 'assessmentId')
        gradeStore.createIndex('by_studentId', 'studentId')
        gradeStore.createIndex('by_classId', 'classId')
        gradeStore.createIndex('by_assessmentAndStudent', ['assessmentId', 'studentId'], { unique: true })
      }

      // ── seed defaults on fresh install (oldVersion === 0) ────────────────
      if (oldVersion === 0) {
        transaction.objectStore('settings').put(
          {
            schemaVersion: 16,
            gridSize: { rows: 6, cols: 6 },
            behaviorCodes: {
              m: { icon: 'Smartphone', label: 'On Device', category: 'redirect', type: 'standard', requiresNote: false, isTopLevel: true },
              w: { icon: 'Toilet', label: 'Washroom', category: 'neutral', type: 'toggle', requiresNote: false, isTopLevel: true },
              a: { icon: 'UserX', label: 'Absent', category: 'attendance', type: 'attendance', requiresNote: false, isTopLevel: false },
              l: { icon: 'Clock', label: 'Late', category: 'attendance', type: 'attendance', requiresNote: false, isTopLevel: false },
              note: { icon: 'NotebookPen', label: 'Note', category: 'note', type: 'standard', requiresNote: true, isTopLevel: true },
              ac: { icon: 'GraduationCap', label: 'Assessment', category: 'assessment', type: 'standard', requiresNote: true, isTopLevel: true },
              pc: { icon: 'Phone', label: 'Parent', category: 'communication', type: 'standard', requiresNote: true, isTopLevel: true },
            },
            thresholds: {
              washroomTripsPerWeek: 4,
              deviceIncidentsPerWeek: 3
            },
            gradebookTemplates: []
          },
          'singleton'
        )

        // Seed class fields if any classes are created during seed (none usually)
        // However, the rules implies updating seed logic for future classes too.
        // The getDB() itself doesn't create classes, that's classService.
        // But if we had a seed class here, we'd adds those fields.

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

      // ── version 7 migration ────────────────────────────────────────────────
      // Add behavior component thresholds to settings
      if (oldVersion < 7) {
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          if (settings.thresholds === undefined) {
            settings.thresholds = {
              washroomTripsPerWeek: 4,
              deviceIncidentsPerWeek: 3
            }
            await settingsStore.put(settings, 'singleton')
          }
        }
      }

      // ── version 8 migration ────────────────────────────────────────────────
      // Retroactively mark absences as superseded if they were followed by a Late arrival
      if (oldVersion < 8) {
        const eventStore = transaction.objectStore('events')
        const events = await eventStore.getAll()
        
        // Group events by student and date for easier lookup
        const lateEventsWithSuperseded = events.filter(e => e.code === 'l' && e.supersededAbsent === true)
        
        for (const lateEvt of lateEventsWithSuperseded) {
          const studentId = lateEvt.studentId
          const dateStr = lateEvt.timestamp.slice(0, 10)
          
          // Find the 'a' event for the same student on the same day
          const targetAbsent = events.find(e => 
            e.studentId === studentId && 
            e.code === 'a' && 
            e.timestamp.startsWith(dateStr) &&
            !e.superseded
          )
          
          if (targetAbsent) {
            targetAbsent.superseded = true
            await eventStore.put(targetAbsent)
          }
        }
      }

      // ── version 9 migration (restructure behavior codes) ───────────────────
      if (oldVersion < 9) {
        const tx9 = transaction.objectStore('settings')
        const settings = await tx9.get('singleton')
        if (settings && settings.behaviorCodes) {
          // Remove participation code
          delete settings.behaviorCodes['p']

          // Remove cv if it exists
          delete settings.behaviorCodes['cv']

          // Rename ob to note if ob exists
          if (settings.behaviorCodes['ob']) {
            settings.behaviorCodes['note'] = {
              ...settings.behaviorCodes['ob'],
              key: 'note',
              icon: 'NotebookPen',
              label: 'Note',
              category: 'note',
              type: 'standard',
              requiresNote: true,
              isTopLevel: true
            }
            delete settings.behaviorCodes['ob']
          }

          // Add ac if it doesn't exist
          if (!settings.behaviorCodes['ac']) {
            settings.behaviorCodes['ac'] = {
              key: 'ac',
              icon: 'GraduationCap',
              label: 'Assessment',
              category: 'assessment',
              type: 'standard',
              requiresNote: true,
              isTopLevel: true
            }
          }

          await tx9.put(settings, 'singleton')
        }
      }

      // ── version 10 migration (move note to top level) ──────────────────────
      if (oldVersion < 10) {
        const tx10 = transaction.objectStore('settings')
        const settings = await tx10.get('singleton')
        if (settings && settings.behaviorCodes && settings.behaviorCodes.note) {
          settings.behaviorCodes.note.isTopLevel = true
          await tx10.put(settings, 'singleton')
        }
      }

      // ── version 11 migration ───────────────────────────────────────────────
      if (oldVersion < 11) {
        // Update all class records
        const tx11 = transaction.objectStore('classes')
        const allClasses = await tx11.getAll()
        for (const cls of allClasses) {
          // Add gradebook fields to class record
          if (cls.gradingMethod === undefined) cls.gradingMethod = 'traditional'
          if (cls.gradebookCategories === undefined) cls.gradebookCategories = []
          if (cls.gradebookMilestones === undefined) cls.gradebookMilestones = []
          if (cls.gradebookNotes === undefined) cls.gradebookNotes = ''

          // Add categoryOverrides and gradebookNote to each student
          if (cls.students) {
            for (const studentId of Object.keys(cls.students)) {
              if (cls.students[studentId].categoryOverrides === undefined) {
                cls.students[studentId].categoryOverrides = {}
              }
              if (cls.students[studentId].gradebookNote === undefined) {
                cls.students[studentId].gradebookNote = ''
              }
            }
          }
          await tx11.put(cls)
        }

        // Update settings singleton
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          if (settings.gradebookTemplates === undefined) {
            settings.gradebookTemplates = []
          }
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 12 migration ───────────────────────────────────────────────
      if (oldVersion < 12) {
        // Update all class records to include gradebookUnits
        const tx12 = transaction.objectStore('classes')
        const allClasses = await tx12.getAll()
        for (const cls of allClasses) {
          if (cls.gradebookUnits === undefined) {
            cls.gradebookUnits = []
            await tx12.put(cls)
          }
        }

        // Update settings singleton version
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 12
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 13 migration ───────────────────────────────────────────────
      if (oldVersion < 13) {
        // Update all assessments: overhaul types and replace units with null
        const assessmentStore = transaction.objectStore('assessments')
        const allAssessments = await assessmentStore.getAll()
        
        const oldTypes = new Set(['test', 'quiz', 'assignment', 'lab', 'other'])
        
        for (const assessment of allAssessments) {
          let mutated = false
          
          // Overhaul type
          const currentType = (assessment.assessmentType || '').toLowerCase()
          if (oldTypes.has(currentType)) {
            assessment.assessmentType = 'product'
            mutated = true
          }
          
          // Clear unit field (from free text to null)
          if (assessment.unit !== null) {
            assessment.unit = null
            mutated = true
          }
          
          if (mutated) {
            await assessmentStore.put(assessment)
          }
        }

        // Update settings singleton version
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 13
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 14 migration ───────────────────────────────────────────────
      if (oldVersion < 14) {
        // Add target and targetStudentId to all existing assessments
        const assessmentStore = transaction.objectStore('assessments')
        const allAssessments = await assessmentStore.getAll()
        
        for (const assessment of allAssessments) {
          let mutated = false
          if (assessment.target === undefined) {
            assessment.target = 'class'
            mutated = true
          }
          if (assessment.targetStudentId === undefined) {
            assessment.targetStudentId = null
            mutated = true
          }
          if (mutated) {
            await assessmentStore.put(assessment)
          }
        }

        // Update settings singleton version
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 14
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 15 migration ───────────────────────────────────────────────
      if (oldVersion < 15) {
        const tx15 = transaction.objectStore('classes')
        const allClasses = await tx15.getAll()
        for (const cls of allClasses) {
          let mutated = false
          for (const studentId of Object.keys(cls.students ?? {})) {
            if (cls.students[studentId].excludeFromAnalytics === undefined) {
              cls.students[studentId].excludeFromAnalytics = false
              mutated = true
            }
          }
          if (mutated) {
            const plain = JSON.parse(JSON.stringify(cls))
            await tx15.put(plain)
          }
        }

        // Update settings singleton version
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 15
          await settingsStore.put(settings, 'singleton')
        }
      }
      // ── version 16 migration (Add by_classId index to grades) ─────────────
      if (oldVersion < 16) {
        const gradeStore = transaction.objectStore('grades')
        const assessmentStore = transaction.objectStore('assessments')
        
        // 1. Fetch all assessments to build a map of association [id] -> classId
        const assessments = await assessmentStore.getAll()
        const assessmentClassMap = {}
        for (const a of assessments) {
          assessmentClassMap[a.assessmentId] = a.classId
        }

        // 2. Backfill classId into all existing grades
        const grades = await gradeStore.getAll()
        for (const g of grades) {
          const classId = assessmentClassMap[g.assessmentId]
          if (classId) {
            g.classId = classId
            await gradeStore.put(g)
          }
        }

        // 3. Add the index (if not already added by fresh install logic)
        if (!gradeStore.indexNames.contains('by_classId')) {
          gradeStore.createIndex('by_classId', 'classId')
        }

        // 4. Update settings singleton version
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 16
          await settingsStore.put(settings, 'singleton')
        }
      }
    },
  })

  return _dbPromise
}
