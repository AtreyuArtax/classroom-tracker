/**
 * src/db/classService.js
 *
 * Public API for the `classes` object store.
 *
 * CLAUDE.md §4 — exact function signatures required:
 *   getAllClasses()
 *   getClass(classId)
 *   saveClass(classObj)
 *   updateStudentSeat(classId, studentId, seat)
 *   setStudentActiveState(classId, studentId, activeStateObj)
 *   clearStudentActiveState(classId, studentId)
 *   importRoster(classId, studentsArray)
 *   setStudentLate(classId, studentId, lateMs)
 *   clearStudentLate(classId, studentId)
 *   patchStudent(classId, studentId, updates)
 *   updateStudentNote(classId, studentId, note)
 */

import { getDB } from './index.js'
import { hasUnsyncedChanges } from './eventService.js'
import { getCurrentSchoolYear, getCurrentSemester } from '../utils/dates.js'

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Returns an array of all class records.
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getAllClasses() {
    const db = await getDB()
    return db.getAll('classes')
}

/**
 * Returns a single class record by classId, or undefined if not found.
 *
 * @param {string} classId
 * @returns {Promise<Object|undefined>}
 */
export async function getClass(classId) {
    const db = await getDB()
    return db.get('classes', classId)
}

/**
 * Inserts or fully replaces a class record.
 * The caller is responsible for providing all required fields.
 *
 * @param {Object} classObj  Must include classId, name, periodNumber, students map.
 * @returns {Promise<void>}
 */
export async function saveClass(classObj) {
    const db = await getDB()
    const plain = JSON.parse(JSON.stringify(classObj))
    await db.put('classes', plain)
    hasUnsyncedChanges.value = true
}

/**
 * Updates a student's seat assignment within a class.
 * seat = { row: number, col: number } | null (null = unassigned to roster pool)
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {{ row: number, col: number } | null} seat
 * @returns {Promise<void>}
 */
export async function updateStudentSeat(classId, studentId, seat) {
    await patchStudent(classId, studentId, { seat })
}

/**
 * Sets the activeStates sub-object for a student.
 * Used when toggling a student OUT (washroom, etc.).
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {Object} activeStateObj
 * @returns {Promise<void>}
 */
export async function setStudentActiveState(classId, studentId, activeStateObj) {
    await patchStudent(classId, studentId, { activeStates: activeStateObj })
}

/**
 * Clears activeStates, resetting a student to the in-room default.
 * Used when toggling a student back IN.
 *
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function clearStudentActiveState(classId, studentId) {
    await patchStudent(classId, studentId, { 
        activeStates: { isOut: false, outTime: null, isAbsent: false, lateMs: null } 
    })
}

/**
 * Sets the period start time for a class.
 *
 * @param {string} classId
 * @param {string} timeString HH:MM format
 * @returns {Promise<void>}
 */
export async function setPeriodStartTime(classId, timeString) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    
    if (!cls) throw new Error(`Class not found: ${classId}`)

    cls.periodStartTime = timeString
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done
    hasUnsyncedChanges.value = true
}

/**
 * Marks a student as absent.
 *
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function setStudentAbsent(classId, studentId) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    const st = cls?.students[studentId]
    if (!st) throw new Error('Student not found')

    st.activeStates = { 
        ...(st.activeStates || { isOut: false, outTime: null }), 
        isAbsent: true,
        lateMs: null // Mutual exclusion
    }
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done
    hasUnsyncedChanges.value = true
}

/**
 * Clears the absent state for a student.
 *
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function clearStudentAbsent(classId, studentId) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    const st = cls?.students[studentId]
    if (!st || !st.activeStates) return

    st.activeStates.isAbsent = false
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done
    hasUnsyncedChanges.value = true
}

/**
 * Marks a student as late with the given milliseconds.
 * Clears isAbsent at the same time (late supersedes absent).
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {number} lateMs
 * @returns {Promise<void>}
 */
export async function setStudentLate(classId, studentId, lateMs) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    const st = cls?.students[studentId]
    if (!st) throw new Error('Student not found')

    st.activeStates = { 
        ...(st.activeStates || { isOut: false, outTime: null }), 
        isAbsent: false, 
        lateMs 
    }
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done
    hasUnsyncedChanges.value = true
}

/**
 * Clears the late state for a student (e.g. on undo).
 *
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function clearStudentLate(classId, studentId) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    const st = cls?.students[studentId]
    if (!st || !st.activeStates) return

    st.activeStates.lateMs = null
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done
    hasUnsyncedChanges.value = true
}

/**
 * Upserts students from a CSV roster into the target class.
 *
 * Rules (CLAUDE.md §6):
 *  - studentId is always the key — never generate a substitute
 *  - Insert: adds student with null seat and default activeStates
 *  - Update: refreshes firstName / lastName, preserves seat and activeStates
 *  - Cross-class conflicts are handled by the caller (composable layer)
 *    before this function is invoked; do not duplicate that logic here
 *
 * @param {string} classId
 * @param {Array<{ studentId: string, firstName: string, lastName: string }>} studentsArray
 * @returns {Promise<{ inserted: number, updated: number }>}
 */
export async function importRoster(classId, studentsArray) {
    const db = await getDB()
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)

    let inserted = 0
    let updated = 0

    for (const row of studentsArray) {
        const { studentId, firstName, lastName, parentContacts, studentEmail, custody, livingWith, birthDate, rfidTag, gradeLevel, grade, courseCode } = row
        const rawG = (gradeLevel || grade || '').toString().trim()
        const parsedG = rawG ? (rawG.toLowerCase().startsWith('grade') ? rawG : `Grade ${parseInt(rawG, 10) || rawG}`) : ''

        if (cls.students[studentId]) {
            // Upsert — preserve seat and activeStates, but update names and gradeLevel
            cls.students[studentId].firstName = firstName
            cls.students[studentId].lastName = lastName
            if (parsedG) cls.students[studentId].gradeLevel = parsedG
            if (courseCode) cls.students[studentId].courseCode = courseCode

            if (parentContacts && parentContacts.length > 0) {
                // Replace parent contacts if new ones are provided in CSV
                cls.students[studentId].parentContacts = parentContacts
            } else if (!cls.students[studentId].parentContacts) {
                cls.students[studentId].parentContacts = []
            }
            if (studentEmail) cls.students[studentId].studentEmail = studentEmail
            if (custody) cls.students[studentId].custody = custody
            if (livingWith) cls.students[studentId].livingWith = livingWith
            if (birthDate) cls.students[studentId].birthDate = birthDate
            if (rfidTag !== undefined) cls.students[studentId].rfidTag = rfidTag
            updated++
        } else {
            // Insert with defaults
            cls.students[studentId] = {
                firstName,
                lastName,
                gradeLevel: parsedG,
                courseCode: courseCode || '',
                parentContacts: parentContacts || [],
                studentEmail: studentEmail || '',
                custody: custody || '',
                livingWith: livingWith || '',
                birthDate: birthDate || '',
                seat: null,
                generalNote: '',
                rfidTag: rfidTag || '',
                activeStates: { isOut: false, outTime: null, isAbsent: false, lateMs: null },
                flags: { IEPAcommodations: false, ELL: false, medicalAlert: false, behaviorPlan: false },
                flagNotes: { IEP: '', ELL: '', medical: '', behavior: '' },
                excludeFromAnalytics: false,
            }
            inserted++
        }
    }

    const uniqueCourses = new Set(Object.values(cls.students).map(s => s.courseCode).filter(Boolean))
    if (uniqueCourses.size > 1) {
        cls.isSplitClass = true
        cls.courseSections = Array.from(uniqueCourses).sort()
    }

    const plain = JSON.parse(JSON.stringify(cls))
    await db.put('classes', plain)
    hasUnsyncedChanges.value = true
    return { inserted, updated }
}

/**
 * Updates a student's general note.
 * Called by StudentProfileModal on textarea blur.
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {string} note
 * @returns {Promise<void>}
 */
/**
 * Performs an atomic, transactional update of a subset of student fields.
 * This is the "surgical" alternative to saveClass() for student-level edits.
 * 
 * @param {string} classId
 * @param {string} studentId
 * @param {Object} updates Map of student fields to update (e.g. { lastName: 'NewName' })
 * @returns {Promise<void>}
 */
export async function patchStudent(classId, studentId, updates) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    // Shallow merge updates into the student record
    Object.assign(cls.students[studentId], updates)
    
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done

    hasUnsyncedChanges.value = true
}

/**
 * Updates a student's general note.
 * Called by StudentProfileModal on textarea blur.
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {string} note
 * @returns {Promise<void>}
 */
export async function updateStudentNote(classId, studentId, note) {
    await patchStudent(classId, studentId, { generalNote: note })
}

/**
 * Updates a student's IEP / accommodation flag.
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {boolean} hasIEP
 * @returns {Promise<void>}
 */
export async function updateStudentIEP(classId, studentId, hasIEP) {
    await patchStudent(classId, studentId, { hasIEP: Boolean(hasIEP) })
}

/**
 * Soft-deletes a class by setting archived = true.
 * The record is kept in IDB; it is simply hidden from normal views.
 *
 * @param {string} classId
 * @returns {Promise<void>}
 */
export async function archiveClass(classId) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    
    cls.archived = true
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done
    hasUnsyncedChanges.value = true
}

/**
 * Restores an archived class (clears the archived flag).
 *
 * @param {string} classId
 * @returns {Promise<void>}
 */
export async function restoreClass(classId) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    
    cls.archived = false
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done
    hasUnsyncedChanges.value = true
}

export async function deleteClass(classId) {
    const db = await getDB()
    
    // 1. Identify all child records that belong to this class
    const [assessments, grades, events] = await Promise.all([
        db.getAllFromIndex('assessments', 'by_classId', classId),
        db.getAllFromIndex('grades', 'by_classId', classId),
        db.getAllFromIndex('events', 'by_classId', classId)
    ])

    // 2. Perform deep delete in a single atomic transaction
    const tx = db.transaction(['classes', 'assessments', 'grades', 'events'], 'readwrite')
    
    // Delete Grades
    const gradeStore = tx.objectStore('grades')
    for (const g of grades) {
        await gradeStore.delete(g.gradeId)
    }
    
    // Delete Assessments
    const assessmentStore = tx.objectStore('assessments')
    for (const a of assessments) {
        await assessmentStore.delete(a.assessmentId)
    }
    
    // Delete Events
    const eventStore = tx.objectStore('events')
    for (const e of events) {
        await eventStore.delete(e.eventId)
    }
    
    // Finally, delete the class record itself
    await tx.objectStore('classes').delete(classId)

    await tx.done
    hasUnsyncedChanges.value = true
}
/**
 * Partially updates a class record.
 * 
 * @param {string} classId
 * @param {Object} updates Map of fields to update.
 * @returns {Promise<Object>} The updated class record.
 */
/**
 * Partially updates a class record.
 */
export async function updateClass(classId, updates) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    
    if (!cls) throw new Error(`Class not found: ${classId}`)

    Object.assign(cls, updates)
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done

    hasUnsyncedChanges.value = true
    return plain
}

/**
 * Toggles a student's analytics exclusion status.
 * Step 5: Persistence for excludeFromAnalytics.
 * 
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<boolean>} The new exclusion state.
 */
export async function toggleStudentAnalyticsExclusion(classId, studentId) {
    const db = await getDB()
    const cls = await db.get('classes', classId)
    const st = cls?.students[studentId]
    if (!st) throw new Error('Student not found')
    
    const newState = !st.excludeFromAnalytics
    await patchStudent(classId, studentId, { excludeFromAnalytics: newState })
    return newState
}

/**
 * Permanently wipes all application data from all object stores.
 * DANGER: This action is irreversible.
 * 
 * @returns {Promise<void>}
 */
export async function clearAllData() {
    const db = await getDB()
    const stores = ['settings', 'classes', 'events', 'assessments', 'grades']
    const tx = db.transaction(stores, 'readwrite')
    
    for (const storeName of stores) {
        await tx.objectStore(storeName).clear()
    }
    
    // Seed default settings so the app isn't in a broken state after reload
    const settings = {
        schemaVersion: 27,
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
        teacherName: '',
        gradebookTemplates: [],
        gradebookMilestones: [],
        academicTerms: [],
        periodStartTimes: {
            '1': '08:00', '2': '09:20', '3': '11:40', '4': '13:00'
        }
    }
    await tx.objectStore('settings').put(settings, 'singleton')
    
    await tx.done
    hasUnsyncedChanges.value = false
}
/**
 * Soft-archives a student within a class.
 * Sets archived = true and clears their seat (they leave the grid).
 * All event/grade data is preserved.
 *
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function archiveStudent(classId, studentId) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId}`)

    cls.students[studentId].archived = true
    cls.students[studentId].seat = null // remove from seating grid
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done
    hasUnsyncedChanges.value = true
}

/**
 * Restores a previously archived student back to the active roster.
 *
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function unarchiveStudent(classId, studentId) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId}`)

    cls.students[studentId].archived = false
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done
    hasUnsyncedChanges.value = true
}

/**
 * Permanently deletes a student and ALL of their data scoped to this class only.
 * Removes: events (by_classId_studentId), grades (by_classId_studentId), 
 * and the student entry from the class record.
 *
 * NOTE: If this student exists in other classes, those records are NOT affected.
 *
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function permanentlyDeleteStudent(classId, studentId) {
    const db = await getDB()

    // 1. Find all events and grades scoped to this specific class + student
    const [events, grades] = await Promise.all([
        db.getAllFromIndex('events', 'by_classId_studentId', [classId, studentId]),
        db.getAllFromIndex('grades', 'by_classId_studentId', [classId, studentId]),
    ])

    // 2. Atomic transaction across all affected stores
    const tx = db.transaction(['classes', 'events', 'grades'], 'readwrite')

    // Delete events for this student in this class only
    const eventStore = tx.objectStore('events')
    for (const e of events) {
        await eventStore.delete(e.eventId)
    }

    // Delete grades for this student in this class only
    const gradeStore = tx.objectStore('grades')
    for (const g of grades) {
        await gradeStore.delete(g.gradeId)
    }

    // Remove the student from the class roster
    const classStore = tx.objectStore('classes')
    const cls = await classStore.get(classId)
    if (cls?.students?.[studentId]) {
        delete cls.students[studentId]
        const plain = JSON.parse(JSON.stringify(cls))
        await classStore.put(plain)
    }

    await tx.done
    hasUnsyncedChanges.value = true
}

/**
 * Bulk imports multiple classes and their rosters in a single database transaction.
 * This ensures that either every class in the import is created/updated, or none are.
 * 
 * @param {Array<Object>} groups Array of { name, year, semester, periodNumber, periodStartTime, students: [{studentId, ...}] }
 * @returns {Promise<{ created: number, updated: number, studentsInserted: number, studentsUpdated: number }>}
 */
export async function bulkImportClasses(groups) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    
    let created = 0
    let updated = 0
    let studentsInserted = 0
    let studentsUpdated = 0

    // To prevent duplicate IDs during a single bulk import when multiple classes are created fast
    const now = Date.now()
    let idCounter = 0

    for (const group of groups) {
        // Find existing class by year/sem/period
        const all = await store.getAll()
        let cls = all.find(c => 
            c.year === group.year && 
            c.semester === group.semester && 
            Number(c.periodNumber) === Number(group.periodNumber)
        )

        if (!cls) {
            const classId = `class_${now}_${idCounter++}`
            cls = {
                classId,
                name: group.name,
                courseCode: group.courseCode || '',
                year: group.year,
                semester: group.semester,
                periodNumber: group.periodNumber,
                periodStartTime: group.periodStartTime || '08:00',
                gridSize: { rows: 6, cols: 6 },
                gradebookUnits: [],
                gradebookCategories: [
                    { categoryId: crypto.randomUUID(), name: 'Assessments', weight: 60 },
                    { categoryId: crypto.randomUUID(), name: 'Activities', weight: 10 },
                    { categoryId: crypto.randomUUID(), name: 'Culminating', weight: 15 },
                    { categoryId: crypto.randomUUID(), name: 'Final Exam', weight: 15 }
                ],
                students: {}
            }
            created++
        } else {
            if (group.courseCode) cls.courseCode = group.courseCode
            updated++
        }

        // Process students for this class
        for (const row of group.students) {
            const { studentId, firstName, lastName, parentContacts, studentEmail, custody, livingWith, birthDate, rfidTag } = row
            if (cls.students[studentId]) {
                cls.students[studentId].firstName = firstName
                cls.students[studentId].lastName = lastName
                if (parentContacts && parentContacts.length > 0) cls.students[studentId].parentContacts = parentContacts
                if (studentEmail) cls.students[studentId].studentEmail = studentEmail
                if (custody) cls.students[studentId].custody = custody
                if (livingWith) cls.students[studentId].livingWith = livingWith
                if (birthDate) cls.students[studentId].birthDate = birthDate
                if (rfidTag !== undefined) cls.students[studentId].rfidTag = rfidTag
                studentsUpdated++
            } else {
                cls.students[studentId] = {
                    firstName,
                    lastName,
                    parentContacts: parentContacts || [],
                    studentEmail: studentEmail || '',
                    custody: custody || '',
                    livingWith: livingWith || '',
                    birthDate: birthDate || '',
                    rfidTag: rfidTag || '',
                    seat: null,
                    generalNote: '',
                    activeStates: { isOut: false, outTime: null, isAbsent: false, lateMs: null },
                    excludeFromAnalytics: false,
                }
                studentsInserted++
            }
        }

        const plain = JSON.parse(JSON.stringify(cls))
        await store.put(plain)
    }

    await tx.done
    hasUnsyncedChanges.value = true
    
    return { created, updated, studentsInserted, studentsUpdated }
}
