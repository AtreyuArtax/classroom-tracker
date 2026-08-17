/**
 * src/db/index.js
 *
 * Single point of IDB initialisation.
 * Exports ONE function: getDB() → returns the open db instance.
 *
 * Rules (CLAUDE.md §4, §5):
 *  - Uses the `idb` wrapper exclusively (no raw IDBRequest chains)
 *  - Database name:  classroomTrackerDB
 *  - Schema version: 19 (Unit ID refactor)
 *  - Stores: settings | classes | events | assessments | grades
 *  - All indexes are created or migrated using the upgrade() callback to ensure
 *    consistency for both fresh installs and existing users.
 */

import { openDB } from 'idb'
import { getCurrentSchoolYear, getCurrentSemester } from '../utils/dates.js'

const DB_NAME = 'classroomTrackerDB'
const DB_VERSION = 29

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
        const classStore = db.createObjectStore('classes', { keyPath: 'classId' })
        classStore.createIndex('by_year', 'year')
        classStore.createIndex('by_semester', 'semester')
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
        // gradeStore.createIndex('by_classId', 'classId') -> handled in v16 below
        gradeStore.createIndex('by_assessmentAndStudent', ['assessmentId', 'studentId'], { unique: true })
      }

      // ── student_photos store (v29) ───────────────────────────────────────
      if (!db.objectStoreNames.contains('student_photos')) {
        db.createObjectStore('student_photos', { keyPath: 'studentId' })
      }

      // ── seed defaults on fresh install (oldVersion === 0) ────────────────
      if (oldVersion === 0) {
        transaction.objectStore('settings').put(
          {
            schemaVersion: 28,
            gridSize: { rows: 6, cols: 6 },
            currentYear: getCurrentSchoolYear(),
            currentSemester: getCurrentSemester(),
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
            gradeBuckets: [
              { label: 'R', min: 0, max: 49, color: '#ff3b30' },
              { label: 'L1', min: 50, max: 59, color: '#ff9500' },
              { label: 'L2', min: 60, max: 69, color: '#ffcc00' },
              { label: 'L3', min: 70, max: 79, color: '#30b0c7' },
              { label: 'L4', min: 80, max: 100, color: '#34c759' }
            ],
            capGradesAt100: true,
            backupFileHandle: null,
            gradebookTemplates: [],
            gradebookMilestones: [],
            academicTerms: [],
            teacherName: '',
            periodStartTimes: {
              '1': '08:00', '2': '09:20', '3': '11:40', '4': '13:00'
            }
          },
          'singleton'
        )
      }

      // ── version 6 migration (fixing previously silent failures) ───────────
      if (oldVersion < 6) {
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')

        if (settings) {
          const codes = settings.behaviorCodes ?? {}
          for (const key of Object.keys(codes)) {
            if (codes[key].requiresNote === undefined) codes[key].requiresNote = false
          }
          if (!codes.ob) codes.ob = { icon: 'Eye', label: 'Observation', category: 'note', type: 'standard', requiresNote: true }
          if (!codes.cv) codes.cv = { icon: 'MessageSquare', label: 'Conversation', category: 'note', type: 'standard', requiresNote: true }
          if (!codes.pc) codes.pc = { icon: 'Phone', label: 'Parent', category: 'communication', type: 'standard', requiresNote: true }

          const emojiMap = {
            '✋': 'Hand', '📱': 'Smartphone', '🚽': 'Toilet', '🚫': 'UserX',
            '⏰': 'Clock', '👁️': 'Eye', '💬': 'MessageSquare', '📞': 'Phone'
          }
          for (const key of Object.keys(codes)) {
            const currentIcon = codes[key].icon
            if (emojiMap[currentIcon]) codes[key].icon = emojiMap[currentIcon]
            if (codes[key].icon === 'Droplets') codes[key].icon = 'Toilet'
          }

          const directCategories = new Set(['neutral', 'redirect', 'communication'])
          for (const key of Object.keys(codes)) {
            if (codes[key].isTopLevel === undefined) {
              codes[key].isTopLevel = directCategories.has(codes[key].category)
            }
          }

          settings.schemaVersion = 6
          await settingsStore.put(settings, 'singleton')
        }

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
      if (oldVersion < 7) {
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings && settings.thresholds === undefined) {
          settings.thresholds = {
            washroomTripsPerWeek: 4,
            deviceIncidentsPerWeek: 3
          }
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 8 migration ────────────────────────────────────────────────
      if (oldVersion < 8) {
        const eventStore = transaction.objectStore('events')
        const events = await eventStore.getAll()
        const lateEventsWithSuperseded = events.filter(e => e.code === 'l' && e.supersededAbsent === true)
        
        for (const lateEvt of lateEventsWithSuperseded) {
          const studentId = lateEvt.studentId
          const dateStr = lateEvt.timestamp.slice(0, 10)
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
          delete settings.behaviorCodes['p']
          delete settings.behaviorCodes['cv']
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

      // ── version 10 migration ───────────────────────────────────────────────
      if (oldVersion < 10) {
        const tx10 = transaction.objectStore('settings')
        const settings = await tx10.get('singleton')
        if (settings?.behaviorCodes?.note) {
          settings.behaviorCodes.note.isTopLevel = true
          await tx10.put(settings, 'singleton')
        }
      }

      // ── version 11 migration ───────────────────────────────────────────────
      if (oldVersion < 11) {
        const tx11 = transaction.objectStore('classes')
        const allClasses = await tx11.getAll()
        for (const cls of allClasses) {
          if (cls.gradingMethod === undefined) cls.gradingMethod = 'traditional'
          if (cls.gradebookCategories === undefined) cls.gradebookCategories = []
          if (cls.gradebookMilestones === undefined) cls.gradebookMilestones = []
          if (cls.gradebookNotes === undefined) cls.gradebookNotes = ''
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
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings && settings.gradebookTemplates === undefined) {
          settings.gradebookTemplates = []
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 12 migration ───────────────────────────────────────────────
      if (oldVersion < 12) {
        const tx12 = transaction.objectStore('classes')
        const allClasses = await tx12.getAll()
        for (const cls of allClasses) {
          if (cls.gradebookUnits === undefined) {
            cls.gradebookUnits = []
            await tx12.put(cls)
          }
        }
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 12
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 13 migration ───────────────────────────────────────────────
      if (oldVersion < 13) {
        const assessmentStore = transaction.objectStore('assessments')
        const allAssessments = await assessmentStore.getAll()
        const oldTypes = new Set(['test', 'quiz', 'assignment', 'lab', 'other'])
        for (const assessment of allAssessments) {
          let mutated = false
          const currentType = (assessment.assessmentType || '').toLowerCase()
          if (oldTypes.has(currentType)) {
            assessment.assessmentType = 'product'
            mutated = true
          }
          if (assessment.unit !== null) {
            assessment.unit = null
            mutated = true
          }
          if (mutated) await assessmentStore.put(assessment)
        }
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 13
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 14 migration ───────────────────────────────────────────────
      if (oldVersion < 14) {
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
          if (mutated) await assessmentStore.put(assessment)
        }
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
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 15
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 16 migration ───────────────────────────────────────────────
      if (oldVersion < 16) {
        const gradeStore = transaction.objectStore('grades')
        const assessmentStore = transaction.objectStore('assessments')
        const assessments = await assessmentStore.getAll()
        const assessmentClassMap = {}
        for (const a of assessments) assessmentClassMap[a.assessmentId] = a.classId
        const grades = await gradeStore.getAll()
        for (const g of grades) {
          const classId = assessmentClassMap[g.assessmentId]
          if (classId) {
            g.classId = classId
            await gradeStore.put(g)
          }
        }
        if (!gradeStore.indexNames.contains('by_classId')) {
          gradeStore.createIndex('by_classId', 'classId')
        }
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 16
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 17 migration ───────────────────────────────────────────────
      if (oldVersion < 17) {
        const settingsStore = transaction.objectStore('settings')
        const classesStore = transaction.objectStore('classes')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          if (!settings.gradebookMilestones) settings.gradebookMilestones = []
          const allClasses = await classesStore.getAll()
          const globalMilestones = []
          const seenNames = new Set()
          for (const cls of allClasses) {
            if (cls.gradebookMilestones && Array.isArray(cls.gradebookMilestones)) {
              for (const ms of cls.gradebookMilestones) {
                const uniqueKey = `${ms.name.trim().toLowerCase()}_${ms.date}`
                if (!seenNames.has(uniqueKey)) {
                  globalMilestones.push({ ...ms })
                  seenNames.add(uniqueKey)
                }
              }
            }
          }
          if (globalMilestones.length > 0) settings.gradebookMilestones = globalMilestones
          settings.schemaVersion = 17
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 18 migration ───────────────────────────────────────────────
      if (oldVersion < 18) {
        const settingsStore = transaction.objectStore('settings')
        const eventStore = transaction.objectStore('events')
        const settings = await settingsStore.get('singleton')
        if (settings && settings.behaviorCodes) {
          const codes = settings.behaviorCodes
          if (codes.w) codes.w.category = 'washroom'
          if (codes.a) codes.a.category = 'absence'
          if (codes.l) codes.l.category = 'late'
          settings.schemaVersion = 18
          await settingsStore.put(settings, 'singleton')
        }
        const events = await eventStore.getAll()
        for (const evt of events) {
          let mutated = false
          if (evt.code === 'w' && evt.category !== 'washroom') {
            evt.category = 'washroom'
            mutated = true
          } else if (evt.code === 'a' && evt.category !== 'absence') {
            evt.category = 'absence'
            mutated = true
          } else if (evt.code === 'l' && evt.category !== 'late') {
            evt.category = 'late'
            mutated = true
          }
          if (mutated) await eventStore.put(evt)
        }
      }

      // ── version 19 migration (Unit IDs) ───────────────────────────────────
      if (oldVersion < 19) {
        const classesStore = transaction.objectStore('classes')
        const assessmentStore = transaction.objectStore('assessments')
        const allClasses = await classesStore.getAll()
        const allAssessments = await assessmentStore.getAll()

        for (const cls of allClasses) {
          let classMutated = false
          const units = cls.gradebookUnits || []
          
          // 1. Ensure all units are objects with unitId
          const updatedUnits = units.map(unit => {
            if (typeof unit === 'string') {
              classMutated = true
              return { unitId: crypto.randomUUID(), name: unit }
            }
            if (typeof unit === 'object' && unit !== null && !unit.unitId) {
              classMutated = true
              return { ...unit, unitId: crypto.randomUUID() }
            }
            return unit
          })

          if (classMutated) {
            cls.gradebookUnits = updatedUnits
            await classesStore.put(cls)
          }

          if (updatedUnits.length === 0) continue

          // 2. Map assessments to unitId if they have a legacy unit name
          const classAssessments = allAssessments.filter(a => a.classId === cls.classId)
          for (const assessment of classAssessments) {
            if (assessment.unit && typeof assessment.unit === 'string') {
              const matchedUnit = updatedUnits.find(u => 
                typeof u === 'object' && u !== null && u.name === assessment.unit
              )
              
              if (matchedUnit && matchedUnit.unitId) {
                assessment.unitId = matchedUnit.unitId
                delete assessment.unit
                await assessmentStore.put(assessment)
              }
            }
          }
        }
        
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 19
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 20 migration (Year/Semester support) ──────────────────────
      if (oldVersion < 20) {
        const classesStore = transaction.objectStore('classes')
        if (!classesStore.indexNames.contains('by_year')) {
          classesStore.createIndex('by_year', 'year')
        }
        if (!classesStore.indexNames.contains('by_semester')) {
          classesStore.createIndex('by_semester', 'semester')
        }

        const allClasses = await classesStore.getAll()
        for (const cls of allClasses) {
          cls.year = cls.year || getCurrentSchoolYear()
          cls.semester = cls.semester || getCurrentSemester()
          await classesStore.put(cls)
        }

        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 20
          await settingsStore.put(settings, 'singleton')
        }
      }

      // ── version 21 migration (Duration Normalization) ────────────────────
      if (oldVersion < 21) {
        // 1. Normalize events duration
        const eventStore = transaction.objectStore('events')
        const allEvents = await eventStore.getAll()
        for (const evt of allEvents) {
          if (evt.duration !== null && evt.duration !== undefined && evt.duration < 1000) {
            evt.duration = evt.duration * 60000
            await eventStore.put(evt)
          }
        }

        // 2. Normalize student activeStates.lateMinutes -> lateMs
        const classesStore = transaction.objectStore('classes')
        const allClasses = await classesStore.getAll()
        for (const cls of allClasses) {
          let classMutated = false
          if (cls.students) {
            for (const studentId of Object.keys(cls.students)) {
              const s = cls.students[studentId]
              if (s.activeStates && s.activeStates.lateMinutes !== undefined && s.activeStates.lateMinutes !== null) {
                // Convert minutes to ms and rename key
                s.activeStates.lateMs = s.activeStates.lateMinutes * 60000
                delete s.activeStates.lateMinutes
                classMutated = true
              }
            }
          }
          if (classMutated) {
            await classesStore.put(cls)
          }
        }

        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        if (settings) {
          settings.schemaVersion = 21
          await settingsStore.put(settings, 'singleton')
        }
      }

      // --- VERSION 22 MIGRATION ---
      if (oldVersion < 22) {
        console.log('[IDB] Migrating to v22: Seeding gradeBuckets in settings...')
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        
        if (settings && !settings.gradeBuckets) {
          settings.gradeBuckets = [
            { label: 'R', min: 0, max: 49, color: '#ff3b30' },
            { label: 'L1', min: 50, max: 59, color: '#ff9500' },
            { label: 'L2', min: 60, max: 69, color: '#ffcc00' },
            { label: 'L3', min: 70, max: 79, color: '#30b0c7' },
            { label: 'L4', min: 80, max: 100, color: '#34c759' }
          ]
          await settingsStore.put(settings, 'singleton')
        }
      }

      // --- VERSION 23 MIGRATION (Composite Indices) ---
      if (oldVersion < 23) {
        console.log('[IDB] Migrating to v23: Creating composite indices for performance...')
        const eventStore = transaction.objectStore('events')
        if (!eventStore.indexNames.contains('by_classId_studentId')) {
          eventStore.createIndex('by_classId_studentId', ['classId', 'studentId'])
        }
        if (!eventStore.indexNames.contains('by_classId_timestamp')) {
          eventStore.createIndex('by_classId_timestamp', ['classId', 'timestamp'])
        }

        const gradeStore = transaction.objectStore('grades')
        if (!gradeStore.indexNames.contains('by_classId_studentId')) {
          gradeStore.createIndex('by_classId_studentId', ['classId', 'studentId'])
        }
      }

      // --- VERSION 24 MIGRATION (Student Archive) ---
      if (oldVersion < 24) {
        console.log('[IDB] Migrating to v24: Initializing archived flag for all students...')
        const classesStore = transaction.objectStore('classes')
        const allClasses = await classesStore.getAll()
        
        for (const cls of allClasses) {
          let mutated = false
          if (cls.students) {
            for (const studentId of Object.keys(cls.students)) {
              if (cls.students[studentId].archived === undefined) {
                cls.students[studentId].archived = false
                mutated = true
              }
            }
          }
          if (mutated) {
            await classesStore.put(cls)
          }
        }
      }
      // --- VERSION 25 MIGRATION (Course Code) ---
      if (oldVersion < 25) {
        console.log('[IDB] Migrating to v25: Initializing courseCode flag for all classes...')
        const classesStore = transaction.objectStore('classes')
        const allClasses = await classesStore.getAll()
        
        for (const cls of allClasses) {
          if (cls.courseCode === undefined) {
            cls.courseCode = ''
            const plain = JSON.parse(JSON.stringify(cls))
            await classesStore.put(plain)
          }
        }
      }
      // --- VERSION 26 MIGRATION (Retest Policy) ---
      if (oldVersion < 26) {
        console.log('[IDB] Migrating to v26: Initializing retestPolicy for all assessments...')
        const assessmentsStore = transaction.objectStore('assessments')
        const allAssessments = await assessmentsStore.getAll()
        
        for (const assessment of allAssessments) {
          if (!assessment.retestPolicy) {
            assessment.retestPolicy = 'highest'
            await assessmentsStore.put(assessment)
          }
        }
      }

      // --- VERSION 27 MIGRATION (Instructional Days) ---
      if (oldVersion < 27) {
        console.log('[IDB] Migrating to v27: Initializing instructionalDays for academicTerms...')
        const settingsStore = transaction.objectStore('settings')
        const settings = await settingsStore.get('singleton')
        
        if (settings && settings.academicTerms) {
          settings.academicTerms = settings.academicTerms.map(term => ({
            ...term,
            instructionalDays: term.semester === '2' ? 93 : (term.semester === '1' ? 94 : 187)
          }))
          await settingsStore.put(settings, 'singleton')
        }
      }

      // --- VERSION 28 MIGRATION ---
      if (oldVersion < 28) {
        console.log('[IDB] Migrating to v28...')
      }

      // --- VERSION 29 MIGRATION (Student Photos) ---
      if (oldVersion < 29) {
        console.log('[IDB] Migrating to v29: Student photos store...')
        if (!db.objectStoreNames.contains('student_photos')) {
          db.createObjectStore('student_photos', { keyPath: 'studentId' })
        }
      }
    },
  })

  return _dbPromise
}
