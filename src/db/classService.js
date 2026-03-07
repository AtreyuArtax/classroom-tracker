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
 *   setPeriodStartTime(classId, timeString)
 *   setStudentAbsent(classId, studentId)
 *   clearStudentAbsent(classId, studentId)
 *   archiveClass(classId)
 *   restoreClass(classId)
 *   deleteClass(classId)
 */

import { getDB } from './index.js'

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
    await db.put('classes', classObj)
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
    const db = await getDB()
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    cls.students[studentId].seat = seat
    await db.put('classes', cls)
}

/**
 * Sets the activeStates sub-object for a student.
 * Used when toggling a student OUT (washroom, etc.).
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {{ isOut: boolean, outTime: string|null }} activeStateObj
 * @returns {Promise<void>}
 */
export async function setStudentActiveState(classId, studentId, activeStateObj) {
    const db = await getDB()
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    cls.students[studentId].activeStates = activeStateObj
    await db.put('classes', cls)
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
    return setStudentActiveState(classId, studentId, { isOut: false, outTime: null })
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
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)

    cls.periodStartTime = timeString
    await db.put('classes', cls)
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
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    if (!cls.students[studentId].activeStates) {
        cls.students[studentId].activeStates = { isOut: false, outTime: null, isAbsent: false }
    }
    cls.students[studentId].activeStates.isAbsent = true
    await db.put('classes', cls)
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
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    if (cls.students[studentId].activeStates) {
        cls.students[studentId].activeStates.isAbsent = false
    }
    await db.put('classes', cls)
}

/**
 * Marks a student as late with the given number of minutes.
 * Clears isAbsent at the same time (late supersedes absent).
 *
 * @param {string} classId
 * @param {string} studentId
 * @param {number} lateMinutes
 * @returns {Promise<void>}
 */
export async function setStudentLate(classId, studentId, lateMinutes) {
    const db = await getDB()
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    if (!cls.students[studentId].activeStates) {
        cls.students[studentId].activeStates = { isOut: false, outTime: null, isAbsent: false }
    }
    cls.students[studentId].activeStates.isAbsent = false
    cls.students[studentId].activeStates.lateMinutes = lateMinutes
    await db.put('classes', cls)
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
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    if (cls.students[studentId].activeStates) {
        cls.students[studentId].activeStates.lateMinutes = null
    }
    await db.put('classes', cls)
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

    for (const { studentId, firstName, lastName } of studentsArray) {
        if (cls.students[studentId]) {
            // Upsert — preserve seat and activeStates
            cls.students[studentId].firstName = firstName
            cls.students[studentId].lastName = lastName
            updated++
        } else {
            // Insert with defaults
            cls.students[studentId] = {
                firstName,
                lastName,
                seat: null,
                generalNote: '',
                activeStates: { isOut: false, outTime: null, isAbsent: false },
            }
            inserted++
        }
    }

    await db.put('classes', cls)
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
export async function updateStudentNote(classId, studentId, note) {
    const db = await getDB()
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)
    cls.students[studentId].generalNote = note
    await db.put('classes', cls)
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
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    cls.archived = true
    await db.put('classes', cls)
}

/**
 * Restores an archived class (clears the archived flag).
 *
 * @param {string} classId
 * @returns {Promise<void>}
 */
export async function restoreClass(classId) {
    const db = await getDB()
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    cls.archived = false
    await db.put('classes', cls)
}

/**
 * Permanently deletes a class record and all its student data.
 * Event history is NOT deleted — orphaned events remain in the events store.
 *
 * @param {string} classId
 * @returns {Promise<void>}
 */
export async function deleteClass(classId) {
    const db = await getDB()
    await db.delete('classes', classId)
}
