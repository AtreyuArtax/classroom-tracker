/**
 * Pure helpers for the Setup roster CSV import flow (board / PowerSchool
 * "Student ParentGuardian Contact List" exports).
 *
 * Parsing, grouping into classes (including half-semester Term 1–4 courses and
 * multi-course split classes), matching against existing classes, roster
 * reconciliation, and building the "Import Complete" summary all live here so
 * they can be tested without IndexedDB or Vue.
 */

// ── Field normalizers ────────────────────────────────────────────────────────

export function cleanPeriod(raw) {
  if (!raw) return '1'
  const match = raw.toString().match(/^(\d+)/)
  return match ? match[1] : raw.toString()
}

export function extractCourseCode(raw) {
  if (!raw) return ''
  // SCDSB Sec Section format: "SPH3U1-2" — code is everything before the last "-N" section suffix
  return raw.toString().replace(/-\d+$/, '').trim()
}

export function extractYearFromPeriod(raw) {
  if (!raw) return null
  const match = raw.toString().match(/\(Y(\d+)\)/i)
  if (match) {
    const fullYear = 2000 + parseInt(match[1])
    return `${fullYear}-${(fullYear + 1).toString().slice(-2)}`
  }
  return null
}

export function normalizeSemester(raw) {
  if (!raw) return '1'
  const str = raw.toString().trim()
  // Bare digit — e.g. Semester column = "2"
  if (str === '2') return '2'
  if (str === '1') return '1'
  // Full year strings like "2025-2026" are NOT semester numbers
  if (/^\d{4}-\d{2,4}$/.test(str)) return '1'
  const lower = str.toLowerCase()
  if (
    lower.includes('sem 2') ||
    lower.includes('semester 2') ||
    /\bs2\b/.test(lower) ||
    /\bsem2\b/.test(lower) ||
    lower.includes('term 3') ||
    lower.includes('term 4') ||
    /\bt3\b/.test(lower) ||
    /\bt4\b/.test(lower)
  ) {
    return '2'
  }
  return '1'
}

/** Half-semester courses: "Term 1".."Term 4" (or T1..T4), otherwise null. */
export function extractTerm(raw) {
  if (!raw) return null
  const lower = raw.toString().trim().toLowerCase()
  const match = lower.match(/\bterm\s*([1-4])\b/i) || lower.match(/\bt([1-4])\b/i)
  return match ? `Term ${match[1]}` : null
}

function formatGradeVal(rawGrade) {
  if (!rawGrade) return ''
  const gNum = parseInt(rawGrade.replace(/\D/g, ''), 10)
  if (!isNaN(gNum) && gNum >= 1 && gNum <= 12) return `Grade ${gNum}`
  if (rawGrade.toLowerCase().startsWith('grade')) return rawGrade
  return `Grade ${rawGrade}`
}

export function extractGradeFromRow(rawRow) {
  if (!rawRow) return ''
  const keys = Object.keys(rawRow)
  for (const target of ['grade level', 'gradelevel', 'grade', 'gr.', 'gr', 'yr', 'year level']) {
    const matchedKey = keys.find(k => k.trim().toLowerCase() === target)
    if (matchedKey && rawRow[matchedKey] !== undefined && rawRow[matchedKey] !== null) {
      const val = String(rawRow[matchedKey]).trim()
      if (val) return formatGradeVal(val)
    }
  }
  for (const k of keys) {
    const kLower = k.trim().toLowerCase()
    if ((kLower.startsWith('grade') || kLower.startsWith('gr')) && !kLower.includes('point') && !kLower.includes('book')) {
      const val = String(rawRow[k]).trim()
      if (val) return formatGradeVal(val)
    }
  }
  return ''
}

/** Default start time for the period after one starting at `prevTime` (80-minute periods). */
export function nextPeriodStartTime(prevTime) {
  const [h, m] = (prevTime || '08:00').split(':').map(Number)
  return new Date(0, 0, 0, h, m + 80).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ── Row parsing ──────────────────────────────────────────────────────────────

const stripSeparators = (s) => (s || '').replace(/[, \t\r\n"']/g, '').trim()

/**
 * Map one raw CSV row (papaparse `header: true`) to a roster row.
 *
 * @param {Object} row
 * @param {{ year: string, periodNumber: string|number, semester: string }} defaults
 *   Used when the CSV has no Year / Period / Semester information.
 */
export function mapRosterRow(row, defaults) {
  const studentId = row['Student ID'] ?? row['Student Number'] ?? row['StudentID'] ?? row['student_id'] ?? ''
  let firstName = row['First Name'] ?? row['FirstName'] ?? row['first_name'] ?? ''
  let lastName  = row['Last Name']  ?? row['LastName']  ?? row['last_name']  ?? ''

  const rawStudentName = (row['Student Name'] ?? row['StudentName'] ?? row['student_name'] ?? '').toString().trim()
  if (!firstName && !lastName && stripSeparators(rawStudentName).length > 0) {
    const parts = rawStudentName.split(',')
    if (parts.length >= 2) {
      lastName  = parts[0].trim()
      firstName = parts.slice(1).join(',').trim()
    } else {
      lastName = rawStudentName.trim()
    }
  }

  // Clean any residual punctuation
  firstName = (firstName || '').replace(/^[, \t]+|[, \t]+$/g, '').trim()
  lastName  = (lastName || '').replace(/^[, \t]+|[, \t]+$/g, '').trim()

  const parentContacts = []
  for (let i = 1; i <= 4; i++) {
    const pName = (row[`Par${i} Name`] ?? '').trim()
    const pEmail = (row[`Par${i} eMail`] ?? '').trim()
    const pMobile = (row[`Par${i} Mobile`] ?? '').trim()
    const pHome = (row[`Par${i} Home`] ?? '').trim()

    const phones = []
    if (pMobile) phones.push({ type: 'Mobile', number: pMobile })
    if (pHome && pHome !== pMobile) phones.push({ type: 'Home', number: pHome })

    if (pName || pEmail || phones.length > 0) {
      parentContacts.push({ name: pName, email: pEmail, phone: pMobile || pHome || '', phones })
    }
  }

  const rawSem = row['Semester'] ?? row['Sem'] ?? row['Schedule'] ?? ''
  const rawPeriod = row['Period'] ?? ''
  const rawSection = row['Section'] ?? row['Sec Section'] ?? ''

  const year = row['Year'] ?? extractYearFromPeriod(rawPeriod || rawSection) ?? defaults.year
  const periodNumber = (rawPeriod || rawSection) ? cleanPeriod(rawPeriod || rawSection) : defaults.periodNumber
  const courseCode = row['Course Code'] ?? row['CourseCode'] ?? (rawSection ? extractCourseCode(rawSection) : '')
  const semester = normalizeSemester(rawSem || defaults.semester)
  const term = extractTerm(row['Term'] ?? rawSem)
  const grade = extractGradeFromRow(row)

  return {
    studentId: studentId.trim(),
    firstName,
    lastName,
    grade,
    gradeLevel: grade,
    parentContacts,
    studentEmail: (row['Student eMail'] ?? row['Student Email'] ?? '').trim(),
    custody: (row['Custody'] ?? '').trim(),
    livingWith: (row['Living With'] ?? '').trim(),
    birthDate: (row['Birth'] ?? '').trim(),
    semester,
    term,
    periodNumber,
    year,
    courseCode,
    _rawCourseCode: courseCode
  }
}

/**
 * Map raw CSV rows and split them into importable rows and skipped rows.
 * A row needs both a Student ID and a name. Rows with neither (blank or
 * separator lines in board exports) are dropped silently; rows with only one
 * are reported in `skippedRows` so the teacher can see what was left out.
 */
export function parseRosterRows(rawRows, defaults) {
  const validRows = []
  const skippedRows = []
  for (const raw of rawRows) {
    const row = mapRosterRow(raw, defaults)
    const hasName = stripSeparators(row.firstName).length > 0 || stripSeparators(row.lastName).length > 0
    const hasId = row.studentId.length > 0
    if (hasName && hasId) {
      validRows.push(row)
    } else if (hasName || hasId) {
      skippedRows.push({
        studentId: row.studentId || null,
        name: `${row.firstName} ${row.lastName}`.trim(),
        reason: hasId ? 'Missing student name' : 'Missing Student ID'
      })
    }
  }
  return { validRows, skippedRows }
}

// ── Periods ──────────────────────────────────────────────────────────────────

/**
 * Find periods used in the CSV that aren't configured yet, and return the
 * period start-time map with default times filled in for them.
 */
export function addMissingPeriodTimes(validRows, periodOptions, periodStartTimes) {
  const detected = [...new Set(validRows.map(r => Number(r.periodNumber)))].filter(p => !isNaN(p))
  const missingPeriods = detected.filter(p => !periodOptions.includes(p)).sort((a, b) => a - b)
  const updatedTimes = { ...periodStartTimes }
  for (const p of missingPeriods) {
    updatedTimes[p] = nextPeriodStartTime(updatedTimes[p - 1])
  }
  return { missingPeriods, updatedTimes }
}

// ── Grouping into classes ────────────────────────────────────────────────────

/**
 * Group roster rows into one class per year / semester / period, plus term for
 * half-semester courses (Term 1 Civics and Term 2 Careers in the same period
 * become two classes). A period holding several course codes for the whole
 * semester is flagged as a split class (e.g. SPH3U/SPH4U).
 *
 * @returns {Object<string, Object>} groups keyed by year-semester-period[-term]
 */
export function groupRosterRows(validRows, periodStartTimes = {}) {
  const groups = {}
  for (const row of validRows) {
    const key = row.term
      ? `${row.year}-${row.semester}-P${row.periodNumber}-${row.term}`
      : `${row.year}-${row.semester}-P${row.periodNumber}`
    if (!groups[key]) {
      groups[key] = {
        name: row.term
          ? `Period ${row.periodNumber} (${row.courseCode ? row.courseCode + ' · ' : ''}${row.term}) — ${row.year}`
          : `Period ${row.periodNumber} — ${row.year}`,
        year: row.year,
        semester: row.semester,
        term: row.term || null,
        periodNumber: row.periodNumber,
        periodStartTime: periodStartTimes[row.periodNumber] || '08:00',
        courseCode: row.courseCode,
        students: [],
        selected: false
      }
    }
    groups[key].students.push(row)
  }

  for (const group of Object.values(groups)) {
    const uniqueCourses = [...new Set(group.students.map(r => r._rawCourseCode || r.courseCode).filter(Boolean))]
    if (uniqueCourses.length > 1) {
      group.isSplitClass = true
      group.courseSections = uniqueCourses
      group.courseCode = uniqueCourses.join('/')
      const termSuffix = group.term ? ` (${group.term})` : ''
      group.name = `Period ${group.periodNumber} (${uniqueCourses.join('/')}${termSuffix}) — ${group.year}`
    }
  }
  return groups
}

/** Bulk-import groups split into semester sections, sorted by period then term. */
export function groupBulkBySemester(groups) {
  const entries = Object.entries(groups).map(([key, group]) => ({ key, group }))
  const semOrder = (s) => s === 'Full' ? 99 : Number(s)
  const sems = [...new Set(entries.map(e => e.group.semester))].sort((a, b) => semOrder(a) - semOrder(b))
  const periodNum = (p) => isNaN(Number(p)) ? 0 : Number(p)
  return sems.map(sem => ({
    label: sem === 'Full' ? 'Full Year' : `Semester ${sem}`,
    groups: entries
      .filter(e => e.group.semester === sem)
      .sort((a, b) => {
        const pA = periodNum(a.group.periodNumber), pB = periodNum(b.group.periodNumber)
        if (pA !== pB) return pA - pB
        return (a.group.term || '').localeCompare(b.group.term || '')
      })
  }))
}

// ── Matching existing classes ────────────────────────────────────────────────

/**
 * Does an existing class record correspond to an incoming import group?
 * Same year, semester and period; for term courses also the same term (or the
 * same course code, for classes created before terms were tracked). A
 * whole-semester group never matches a term class, so Term 1 / Term 2 courses
 * in one period stay separate.
 */
export function classMatchesGroup(cls, group) {
  const sameYear = cls.year === group.year
  const sameSem = String(cls.semester) === String(group.semester)
  const samePeriod = String(cls.periodNumber).trim() === String(group.periodNumber).trim() ||
    (!isNaN(Number(cls.periodNumber)) && !isNaN(Number(group.periodNumber)) && Number(cls.periodNumber) === Number(group.periodNumber))
  if (!sameYear || !sameSem || !samePeriod) return false
  if (group.term) {
    return cls.term === group.term || !!(cls.courseCode && group.courseCode && cls.courseCode === group.courseCode)
  }
  return !cls.term
}

export function findMatchingClass(classList, group) {
  return classList.find(c => classMatchesGroup(c, group)) || null
}

// ── Reconciliation & summaries ───────────────────────────────────────────────

const fullName = (s, fallback) => `${s.firstName || ''} ${s.lastName || ''}`.trim() || fallback

/**
 * For each selected group, work out which students are being added, which are
 * already enrolled, and which enrolled students are missing from the CSV
 * (candidates for archiving).
 */
export function buildReconciliationItems(selectedGroups, classList) {
  const items = selectedGroups.map(group => {
    const existing = findMatchingClass(classList, group)
    const existingStudents = existing?.students || {}
    const incomingIds = new Set(group.students.map(s => String(s.studentId).trim()))

    const adding = []
    const updating = []
    for (const s of group.students) {
      const cleanId = String(s.studentId).trim()
      const ex = existingStudents[cleanId]
      const name = fullName(ex || s, cleanId)
      if (!ex || ex.archived) {
        adding.push({ studentId: cleanId, name, grade: s.gradeLevel || s.grade || '', wasArchived: !!ex?.archived })
      } else {
        updating.push({ studentId: cleanId, name })
      }
    }

    const missing = []
    for (const [cleanId, s] of Object.entries(existingStudents)) {
      if (!s.archived && !incomingIds.has(cleanId)) {
        missing.push({ studentId: cleanId, name: fullName(s, cleanId), grade: s.gradeLevel || s.grade || '', selectedForArchive: true })
      }
    }

    return { group, existingClass: existing, isExisting: !!existing, className: group.name, adding, updating, missing }
  })
  return { items, anyMissing: items.some(i => i.missing.length > 0) }
}

/**
 * Summary shown after a multi-class (secondary) import.
 *
 * @param {Array} items         from buildReconciliationItems
 * @param {boolean} archived    whether the selected missing students were archived
 * @param {Array} skippedRows   from parseRosterRows
 */
export function buildBulkImportSummary(items, archived, skippedRows = []) {
  const summaryItems = items.map(i => {
    const toArchive = archived ? i.missing.filter(m => m.selectedForArchive) : []
    return {
      className: i.className,
      isNew: !i.isExisting,
      addedCount: i.adding.length,
      addedNames: i.adding.map(a => a.name),
      updatedCount: i.updating.length,
      archivedCount: toArchive.length,
      archivedNames: toArchive.map(m => m.name),
      notImportedNames: []
    }
  })
  return summarize(summaryItems, skippedRows)
}

/**
 * Summary shown after an elementary homeroom import.
 *
 * @param {Object} opts
 * @param {string} opts.homeroomName
 * @param {boolean} opts.isNew              homeroom was created by this import
 * @param {Array} opts.validRows            rows sent to importRoster
 * @param {Object} opts.existingStudents    homeroom roster before the import
 * @param {Array} opts.conflicts            crossClassConflicts from importRoster
 * @param {boolean} opts.moved              conflicting students were moved into the homeroom
 * @param {Array} opts.skippedRows          from parseRosterRows
 */
export function buildElementaryImportSummary({ homeroomName, isNew, validRows, existingStudents = {}, conflicts = [], moved = false, skippedRows = [] }) {
  const conflictIds = new Set(conflicts.map(c => String(c.studentId).trim()))
  const added = []
  const notImported = []
  let updatedCount = 0
  for (const row of validRows) {
    const id = String(row.studentId).trim()
    const ex = existingStudents[id]
    const name = fullName(ex || row, id)
    if (conflictIds.has(id) && !moved) notImported.push(name)
    else if (ex && !ex.archived) updatedCount++
    else added.push(name)
  }
  return summarize([{
    className: homeroomName,
    isNew,
    addedCount: added.length,
    addedNames: added,
    updatedCount,
    archivedCount: 0,
    archivedNames: [],
    notImportedNames: notImported
  }], skippedRows)
}

function summarize(items, skippedRows) {
  const sum = (key) => items.reduce((n, i) => n + i[key], 0)
  return {
    classesCount: items.length,
    classesCreated: items.filter(i => i.isNew).length,
    totalAdded: sum('addedCount'),
    totalUpdated: sum('updatedCount'),
    totalArchived: sum('archivedCount'),
    totalNotImported: items.reduce((n, i) => n + i.notImportedNames.length, 0),
    skippedRows,
    items
  }
}

// ── Applying a roster to a class ─────────────────────────────────────────────

/**
 * Upsert roster rows into a class's `students` map, in place.
 *
 * Students already enrolled keep everything the teacher has edited (names,
 * parent contacts, grade, notes, RFID); an archived student is only restored.
 * New students get a fresh record, the same shape classService.importRoster
 * writes. Edits to an existing student go through updateStudentProfile, not here.
 *
 * @param {Object<string, Object>} studentMap  class.students
 * @param {Array<Object>} rows                 validated roster rows
 */
export function mergeRosterRows(studentMap, rows) {
  for (const row of rows) {
    const existing = studentMap[row.studentId]
    if (existing) {
      existing.archived = false
      continue
    }
    const rawG = (row.gradeLevel || row.grade || '').toString().trim()
    studentMap[row.studentId] = {
      firstName: row.firstName,
      lastName: row.lastName,
      gradeLevel: rawG ? (rawG.toLowerCase().startsWith('grade') ? rawG : `Grade ${parseInt(rawG, 10) || rawG}`) : '',
      courseCode: row.courseCode || '',
      parentContacts: row.parentContacts || [],
      studentEmail: row.studentEmail || '',
      custody: row.custody || '',
      livingWith: row.livingWith || '',
      birthDate: row.birthDate || '',
      seat: null,
      generalNote: '',
      rfidTag: row.rfidTag || '',
      activeStates: { isOut: false, outTime: null, isAbsent: false, lateMs: null },
      flags: { IEPAcommodations: false, ELL: false, medicalAlert: false, behaviorPlan: false },
      flagNotes: { IEP: '', ELL: '', medical: '', behavior: '' },
      excludeFromAnalytics: false,
    }
  }
}

/**
 * The other class a student is still actively enrolled in, if importing them
 * into `targetClass` would put them in two places at once. Only elementary
 * homerooms conflict (one homeroom per student); secondary students normally
 * take several classes. Last year's homerooms and archived enrolments are
 * history, not conflicts.
 *
 * @returns {Object|null} the conflicting class record
 */
export function findConflictingHomeroom(classList, targetClass, studentId) {
  if (targetClass?.classType !== 'elementary') return null
  return classList.find(c =>
    c.classId !== targetClass.classId &&
    c.classType === 'elementary' &&
    c.students?.[studentId] && !c.students[studentId].archived &&
    (!c.year || !targetClass.year || c.year === targetClass.year)
  ) || null
}

// ── Elementary homeroom detection ────────────────────────────────────────────

/**
 * Homeroom code and school year from an elementary export's first student row.
 * "HRM.130" → "HRM-130"; Schedule "2025-2026" → "2025-26".
 */
export function detectElementaryHomeroom(rawRows, fallbackYear) {
  const firstRaw = rawRows.find(r => r['Student Number'] || r['Student Name'])
  const homeroomCode = firstRaw?.['Sec Section'] || firstRaw?.['Home Room'] || 'Homeroom'
  const yearMatch = (firstRaw?.['Schedule'] || '').match(/(\d{4})-(\d{4})/)
  return {
    homeroomName: homeroomCode.replace(/\./g, '-').trim(),
    csvYear: yearMatch ? `${yearMatch[1]}-${yearMatch[2].slice(-2)}` : fallbackYear
  }
}

export function findExistingHomeroom(classList, homeroomName, year) {
  return classList.find(c =>
    c.classType === 'elementary' &&
    c.year === year &&
    (c.name === homeroomName || c.courseCode === homeroomName)
  ) || null
}

/** Distinct grades (or course codes, when no grade column) among homeroom rows. */
export function getPreviewSubCohorts(validRows, homeroomName) {
  const hrmName = homeroomName?.toLowerCase()
  const set = new Set()
  for (const s of validRows) {
    let val = s.gradeLevel || s.grade
    if (!val && s.courseCode && s.courseCode.toLowerCase() !== hrmName) val = s.courseCode
    if (val) set.add(val)
  }
  return Array.from(set).sort()
}
