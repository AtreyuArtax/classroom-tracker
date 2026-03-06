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
                activeStates: { isOut: false, outTime: null },
            }
            inserted++
        }
    }

    await db.put('classes', cls)
    return { inserted, updated }
}
