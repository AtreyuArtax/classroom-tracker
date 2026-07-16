/**
 * src/db/migrations.js
 *
 * This utility handles schema migrations for both IndexedDB upgrades
 * and imported backup files. It works on plain JavaScript objects
 * representing the full database state.
 */

export const CURRENT_SCHEMA = 28

/**
 * Migrates a backup data object to the current schema version (25).
 *
 * @param {Object} data - { settings, classes, events, assessments, grades, schemaVersion }
 * @returns {Object} - The migrated data object.
 */
export function migrateData(data) {
  let version = data.schemaVersion || (data.settings?.schemaVersion) || 1
  const currentVersion = CURRENT_SCHEMA

  if (version >= currentVersion) return data

  // Clone to avoid mutating the original until we're sure
  const migrated = JSON.parse(JSON.stringify(data))
  if (!migrated.settings) migrated.settings = {}
  if (!migrated.classes) migrated.classes = []
  if (!migrated.events) migrated.events = []
  if (!migrated.assessments) migrated.assessments = []
  if (!migrated.grades) migrated.grades = []

  // ── Version 6 ────────────────────────────────────────────────────────
  if (version < 6) {
    const codes = migrated.settings.behaviorCodes ?? {}
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

    for (const cls of migrated.classes) {
      for (const studentId of Object.keys(cls.students ?? {})) {
        if (cls.students[studentId].generalNote === undefined) {
          cls.students[studentId].generalNote = ''
        }
      }
    }
    version = 6
  }

  // ── Version 7 ────────────────────────────────────────────────────────
  if (version < 7) {
    if (migrated.settings.thresholds === undefined) {
      migrated.settings.thresholds = {
        washroomTripsPerWeek: 4,
        deviceIncidentsPerWeek: 3
      }
    }
    version = 7
  }

  // ── Version 8 ────────────────────────────────────────────────────────
  if (version < 8) {
    const lateEventsWithSuperseded = migrated.events.filter(e => e.code === 'l' && e.supersededAbsent === true)
    for (const lateEvt of lateEventsWithSuperseded) {
      const studentId = lateEvt.studentId
      const dateStr = lateEvt.timestamp.slice(0, 10)
      const targetAbsent = migrated.events.find(e => 
        e.studentId === studentId && 
        e.code === 'a' && 
        e.timestamp.startsWith(dateStr) &&
        !e.superseded
      )
      if (targetAbsent) targetAbsent.superseded = true
    }
    version = 8
  }

  // ── Version 9 ────────────────────────────────────────────────────────
  if (version < 9) {
    const codes = migrated.settings.behaviorCodes
    if (codes) {
      delete codes['p']
      delete codes['cv']
      if (codes['ob']) {
        codes['note'] = {
          ...codes['ob'],
          key: 'note',
          icon: 'NotebookPen',
          label: 'Note',
          category: 'note',
          type: 'standard',
          requiresNote: true,
          isTopLevel: true
        }
        delete codes['ob']
      }
      if (!codes['ac']) {
        codes['ac'] = {
          key: 'ac',
          icon: 'GraduationCap',
          label: 'Assessment',
          category: 'assessment',
          type: 'standard',
          requiresNote: true,
          isTopLevel: true
        }
      }
    }
    version = 9
  }

  // ── Version 10 ───────────────────────────────────────────────────────
  if (version < 10) {
    if (migrated.settings?.behaviorCodes?.note) {
      migrated.settings.behaviorCodes.note.isTopLevel = true
    }
    version = 10
  }

  // ── Version 11 ───────────────────────────────────────────────────────
  if (version < 11) {
    for (const cls of migrated.classes) {
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
    }
    if (migrated.settings.gradebookTemplates === undefined) {
      migrated.settings.gradebookTemplates = []
    }
    version = 11
  }

  // ── Version 12 ───────────────────────────────────────────────────────
  if (version < 12) {
    for (const cls of migrated.classes) {
      if (cls.gradebookUnits === undefined) cls.gradebookUnits = []
    }
    version = 12
  }

  // ── Version 13 ───────────────────────────────────────────────────────
  if (version < 13) {
    const oldTypes = new Set(['test', 'quiz', 'assignment', 'lab', 'other'])
    for (const assessment of migrated.assessments) {
      const currentType = (assessment.assessmentType || '').toLowerCase()
      if (oldTypes.has(currentType)) {
        assessment.assessmentType = 'product'
      }
      if (assessment.unit !== null) assessment.unit = null
    }
    version = 13
  }

  // ── Version 14 ───────────────────────────────────────────────────────
  if (version < 14) {
    for (const assessment of migrated.assessments) {
      if (assessment.target === undefined) assessment.target = 'class'
      if (assessment.targetStudentId === undefined) assessment.targetStudentId = null
    }
    version = 14
  }

  // ── Version 15 ───────────────────────────────────────────────────────
  if (version < 15) {
    for (const cls of migrated.classes) {
      for (const studentId of Object.keys(cls.students ?? {})) {
        if (cls.students[studentId].excludeFromAnalytics === undefined) {
          cls.students[studentId].excludeFromAnalytics = false
        }
      }
    }
    version = 15
  }

  // ── Version 16 ───────────────────────────────────────────────────────
  if (version < 16) {
    const assessmentClassMap = {}
    for (const a of migrated.assessments) assessmentClassMap[a.assessmentId] = a.classId
    for (const g of migrated.grades) {
      const classId = assessmentClassMap[g.assessmentId]
      if (classId) g.classId = classId
    }
    version = 16
  }

  // ── Version 17 ───────────────────────────────────────────────────────
  if (version < 17) {
    if (!migrated.settings.gradebookMilestones) migrated.settings.gradebookMilestones = []
    const globalMilestones = []
    const seenNames = new Set()
    for (const cls of migrated.classes) {
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
    if (globalMilestones.length > 0) migrated.settings.gradebookMilestones = globalMilestones
    version = 17
  }

  // ── Version 18 ───────────────────────────────────────────────────────
  if (version < 18) {
    if (migrated.settings.behaviorCodes) {
      const codes = migrated.settings.behaviorCodes
      if (codes.w) codes.w.category = 'washroom'
      if (codes.a) codes.a.category = 'absence'
      if (codes.l) codes.l.category = 'late'
    }
    for (const evt of migrated.events) {
      if (evt.code === 'w' && evt.category !== 'washroom') {
        evt.category = 'washroom'
      } else if (evt.code === 'a' && evt.category !== 'absence') {
        evt.category = 'absence'
      } else if (evt.code === 'l' && evt.category !== 'late') {
        evt.category = 'late'
      }
    }
    version = 18
  }

  // ── Version 19 ───────────────────────────────────────────────────────
  if (version < 19) {
    for (const cls of migrated.classes) {
      const units = cls.gradebookUnits || []
      const updatedUnits = units.map(unit => {
        if (typeof unit === 'string') {
          return { unitId: crypto.randomUUID(), name: unit }
        }
        if (typeof unit === 'object' && unit !== null && !unit.unitId) {
          return { ...unit, unitId: crypto.randomUUID() }
        }
        return unit
      })
      cls.gradebookUnits = updatedUnits

      if (updatedUnits.length > 0) {
        const classAssessments = migrated.assessments.filter(a => a.classId === cls.classId)
        for (const assessment of classAssessments) {
          if (assessment.unit && typeof assessment.unit === 'string') {
            const matchedUnit = updatedUnits.find(u => u.name === assessment.unit)
            if (matchedUnit) {
              assessment.unitId = matchedUnit.unitId
              delete assessment.unit
            }
          }
        }
      }
    }
    version = 19
  }
  // ── Version 21 (Duration Normalization) ──────────────────────────────
  if (version < 21) {
    for (const evt of migrated.events) {
      if (evt.duration !== null && evt.duration !== undefined && evt.duration < 1000) {
        evt.duration = evt.duration * 60000
      }
    }
    for (const cls of migrated.classes) {
      if (cls.students) {
        for (const studentId of Object.keys(cls.students)) {
          const s = cls.students[studentId]
          if (s.activeStates && s.activeStates.lateMinutes !== undefined && s.activeStates.lateMinutes !== null) {
            s.activeStates.lateMs = s.activeStates.lateMinutes * 60000
            delete s.activeStates.lateMinutes
          }
        }
      }
    }
    version = 21
  }

  // ── Version 22 (Grade Buckets) ───────────────────────────────────────
  if (version < 22) {
    if (migrated.settings && !migrated.settings.gradeBuckets) {
      migrated.settings.gradeBuckets = [
        { label: 'R', min: 0, max: 49, color: '#ff3b30' },
        { label: 'L1', min: 50, max: 59, color: '#ff9500' },
        { label: 'L2', min: 60, max: 69, color: '#ffcc00' },
        { label: 'L3', min: 70, max: 79, color: '#30b0c7' },
        { label: 'L4', min: 80, max: 100, color: '#34c759' }
      ]
      if (migrated.settings.capGradesAt100 === undefined) {
        migrated.settings.capGradesAt100 = true
      }
    }
    version = 22
  }

  // ── Version 23 (Composite Indices - no object change needed) ─────────
  if (version < 23) {
    version = 23
  }

  // ── Version 24 (Student Archive) ─────────────────────────────────────
  if (version < 24) {
    for (const cls of migrated.classes) {
      if (cls.students) {
        for (const studentId of Object.keys(cls.students)) {
          if (cls.students[studentId].archived === undefined) {
            cls.students[studentId].archived = false
          }
        }
      }
    }
    version = 24
  }

  // ── Version 25 (Course Code) ─────────────────────────────────────────
  if (version < 25) {
    for (const cls of migrated.classes) {
      if (cls.courseCode === undefined) {
        cls.courseCode = ''
      }
    }
    version = 25
  }

  // ── Version 26 (Retest Policy Default) ───────────────────────────────
  if (version < 26) {
    for (const assessment of migrated.assessments) {
      if (!assessment.retestPolicy) {
        assessment.retestPolicy = 'highest'
      }
    }
    version = 26
  }

  // ── Version 27 (Instructional Days) ───────────────────────────────
  if (version < 27) {
    if (migrated.settings && migrated.settings.academicTerms) {
      migrated.settings.academicTerms = migrated.settings.academicTerms.map(term => ({
        ...term,
        instructionalDays: term.semester === '2' ? 93 : (term.semester === '1' ? 94 : 187)
      }))
    }
    version = 27
  }

  migrated.schemaVersion = currentVersion
  if (migrated.settings) migrated.settings.schemaVersion = currentVersion

  return migrated
}
