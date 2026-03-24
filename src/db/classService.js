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
import { hasUnsyncedChanges } from './eventService.js'

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
/**
 * Updates a student's seat assignment within a class.
 * Uses an atomic transaction to prevent concurrent write conflicts.
 */
export async function updateStudentSeat(classId, studentId, seat) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    cls.students[studentId].seat = seat
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done

    hasUnsyncedChanges.value = true
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
/**
 * Sets the activeStates sub-object for a student.
 */
export async function setStudentActiveState(classId, studentId, activeStateObj) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    cls.students[studentId].activeStates = activeStateObj
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done

    hasUnsyncedChanges.value = true
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
    const plain = JSON.parse(JSON.stringify(cls))
    await db.put('classes', plain)
    hasUnsyncedChanges.value = true
}

/**
 * Marks a student as absent.
 *
 * @param {string} classId
 * @param {string} studentId
 * @returns {Promise<void>}
 */
/**
 * Marks a student as absent.
 */
export async function setStudentAbsent(classId, studentId) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    if (!cls.students[studentId].activeStates) {
        cls.students[studentId].activeStates = { isOut: false, outTime: null, isAbsent: false }
    }
    cls.students[studentId].activeStates.isAbsent = true
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
/**
 * Clears the absent state for a student.
 */
export async function clearStudentAbsent(classId, studentId) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    if (cls.students[studentId].activeStates) {
        cls.students[studentId].activeStates.isAbsent = false
    }
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done

    hasUnsyncedChanges.value = true
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
/**
 * Marks a student as late.
 */
export async function setStudentLate(classId, studentId, lateMinutes) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    if (!cls.students[studentId].activeStates) {
        cls.students[studentId].activeStates = { isOut: false, outTime: null, isAbsent: false }
    }
    cls.students[studentId].activeStates.isAbsent = false
    cls.students[studentId].activeStates.lateMinutes = lateMinutes
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
    
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)

    if (cls.students[studentId].activeStates) {
        cls.students[studentId].activeStates.lateMinutes = null
    }
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

    for (const { studentId, firstName, lastName, parentContacts, studentEmail, custody, livingWith, birthDate } of studentsArray) {
        if (cls.students[studentId]) {
            // Upsert — preserve seat, activeStates, AND manual name changes
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
            updated++
        } else {
            // Insert with defaults
            cls.students[studentId] = {
                firstName,
                lastName,
                parentContacts: parentContacts || [],
                studentEmail: studentEmail || '',
                custody: custody || '',
                livingWith: livingWith || '',
                birthDate: birthDate || '',
                seat: null,
                generalNote: '',
                activeStates: { isOut: false, outTime: null, isAbsent: false },
                excludeFromAnalytics: false,
            }
            inserted++
        }
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
 * Updates a student's general note.
 */
export async function updateStudentNote(classId, studentId, note) {
    const db = await getDB()
    const tx = db.transaction('classes', 'readwrite')
    const store = tx.objectStore('classes')
    const cls = await store.get(classId)
    
    if (!cls) throw new Error(`Class not found: ${classId}`)
    if (!cls.students[studentId]) throw new Error(`Student not found: ${studentId} in ${classId}`)
    
    cls.students[studentId].generalNote = note
    const plain = JSON.parse(JSON.stringify(cls))
    await store.put(plain)
    await tx.done

    hasUnsyncedChanges.value = true
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
    const plain = JSON.parse(JSON.stringify(cls))
    await db.put('classes', plain)
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
    const cls = await db.get('classes', classId)
    if (!cls) throw new Error(`Class not found: ${classId}`)
    cls.archived = false
    const plain = JSON.parse(JSON.stringify(cls))
    await db.put('classes', plain)
    hasUnsyncedChanges.value = true
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
    if (!cls || !cls.students[studentId]) throw new Error('Student not found')
    
    cls.students[studentId].excludeFromAnalytics = !cls.students[studentId].excludeFromAnalytics
    const plain = JSON.parse(JSON.stringify(cls))
    await db.put('classes', plain)
    hasUnsyncedChanges.value = true
    return cls.students[studentId].excludeFromAnalytics
}
