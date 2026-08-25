/**
 * src/composables/useRosterOperations.js
 *
 * Roster and student operations.
 */

import { triggerRef } from 'vue'
import { 
  activeClass, 
  students, 
  classList,
  gridSize
} from './useClassroomState.js'
import { activeClassRecord, loadGradebook } from './useGradebook.js'
import { ensureIEPPresetsForClass } from './useElementary.js'
import * as classService from '../db/classService.js'
import { useUndo } from './useUndo.js'
import { useMessage } from './useMessage.js'

const { push: pushUndo } = useUndo()

/**
 * Move student from another class.
 * Called by Setup view after the teacher confirms the cross-class conflict.
 *
 * @param {string} fromClassId
 * @param {{ studentId: string, firstName: string, lastName: string }} student
 * @returns {Promise<void>}
 */
export async function moveStudentFromClass(fromClassId, student) {
    const toClassId = activeClass.value?.classId
    if (!toClassId) return

    // Remove from source class
    const src = await classService.getClass(fromClassId)
    if (src?.students?.[student.studentId]) {
        delete src.students[student.studentId]
        await classService.saveClass(src)
        classList.value = classList.value.map(c => c.classId === fromClassId ? src : c)
        if (activeClass.value?.classId === fromClassId) triggerRef(activeClass)
    }

    // Add to destination (upsert)
    await classService.importRoster(toClassId, [student])
    students.value[student.studentId] = {
        firstName: student.firstName,
        lastName: student.lastName,
        seat: null,
        generalNote: '',
        activeStates: { isOut: false, outTime: null },
        excludeFromAnalytics: false,
    }
    triggerRef(activeClass)
}

/**
 * Remove a student from the active class entirely.
 *
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function removeStudent(studentId) {
    const { confirm } = useMessage()
    if (!await confirm('Are you sure you want to remove this student? Their event history will remain in the database, but they will be removed from this class roster.', 'Remove Student', { danger: true })) return

    try {
        const classId = activeClass.value?.classId
        if (!classId) return

        // 1. Remove from DB
        const fresh = await classService.getClass(classId)
        if (fresh?.students?.[studentId]) {
            delete fresh.students[studentId]
            await classService.saveClass(fresh)
        }

        // 2. Remove from reactive state
        delete students.value[studentId]

        if (activeClass.value?.students?.[studentId]) {
            delete activeClass.value.students[studentId]
        }

        const clsInList = classList.value.find(c => c.classId === classId)
        if (clsInList?.students?.[studentId]) {
            delete clsInList.students[studentId]
            classService.syncClassSections(clsInList)
        }
        if (activeClass.value) {
            classService.syncClassSections(activeClass.value)
        }
        triggerRef(activeClass)
    } catch (err) {
        console.error('removeStudent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to remove student from roster.')
    }
}

/**
 * Soft-archives a student in the active class.
 * 
 * @param {string} studentId 
 */
export async function archiveStudent(studentId) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return

        await classService.archiveStudent(classId, studentId)

        if (students.value[studentId]) {
            students.value[studentId].archived = true
            students.value[studentId].seat = null
        }
        
        if (activeClass.value?.students?.[studentId]) {
            activeClass.value.students[studentId].archived = true
            activeClass.value.students[studentId].seat = null
        }
        
        const clsInList = classList.value.find(c => c.classId === classId)
        if (clsInList?.students?.[studentId]) {
            clsInList.students[studentId].archived = true
            clsInList.students[studentId].seat = null
            classService.syncClassSections(clsInList)
        }
        if (activeClass.value) {
            classService.syncClassSections(activeClass.value)
        }

        triggerRef(activeClass)
    } catch (err) {
        console.error('archiveStudent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to archive student.')
    }
}

/**
 * Unarchives a student in the active class.
 * 
 * @param {string} studentId 
 */
export async function unarchiveStudent(studentId) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return

        await classService.unarchiveStudent(classId, studentId)

        if (students.value[studentId]) {
            students.value[studentId].archived = false
        }
        
        if (activeClass.value?.students?.[studentId]) {
            activeClass.value.students[studentId].archived = false
        }
        
        const clsInList = classList.value.find(c => c.classId === classId)
        if (clsInList?.students?.[studentId]) {
            clsInList.students[studentId].archived = false
            classService.syncClassSections(clsInList)
        }
        if (activeClass.value) {
            classService.syncClassSections(activeClass.value)
        }

        triggerRef(activeClass)
    } catch (err) {
        console.error('unarchiveStudent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to unarchive student.')
    }
}

/**
 * Permanently deletes a student's data scoped ONLY to the active class.
 * 
 * @param {string} studentId 
 */
export async function permanentlyDeleteStudent(studentId) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return
        
        await classService.permanentlyDeleteStudent(classId, studentId)
        
        delete students.value[studentId]

        if (activeClass.value?.students?.[studentId]) {
            delete activeClass.value.students[studentId]
        }

        const clsInList = classList.value.find(c => c.classId === classId)
        if (clsInList?.students?.[studentId]) {
            delete clsInList.students[studentId]
            classService.syncClassSections(clsInList)
        }
        if (activeClass.value) {
            classService.syncClassSections(activeClass.value)
        }
        
        triggerRef(activeClass)
    } catch (err) {
        console.error('permanentlyDeleteStudent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to permanently delete student data.')
    }
}

/**
 * Updates a student's general note and persists it.
 *
 * @param {string} studentId
 * @param {string} note
 * @returns {Promise<void>}
 */
export async function updateStudentNote(studentId, note) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return
        await classService.updateStudentNote(classId, studentId, note)
        if (students.value[studentId]) {
            students.value[studentId].generalNote = note
        }
    } catch (err) {
        console.error('updateStudentNote failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save student note.')
    }
}

/**
 * Updates a student's IEP toggle status.
 *
 * @param {string} studentId
 * @param {boolean} hasIEP
 * @returns {Promise<void>}
 */
export async function updateStudentIEP(studentId, hasIEP) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return
        await classService.updateStudentIEP(classId, studentId, hasIEP)
        if (students.value[studentId]) {
            students.value[studentId].hasIEP = Boolean(hasIEP)
        }
        if (activeClass.value?.students?.[studentId]) {
            activeClass.value.students[studentId].hasIEP = Boolean(hasIEP)
        }
        triggerRef(students)
        triggerRef(activeClass)
    } catch (err) {
        console.error('updateStudentIEP failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save IEP status.')
    }
}

/**
 * Updates a student's full accommodations profile (IEP + modified subject grades).
 *
 * @param {string} studentId
 * @param {Object} accommodations
 * @returns {Promise<void>}
 */
export async function updateStudentAccommodations(studentId, accommodations) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return
        const accCopy = JSON.parse(JSON.stringify(accommodations || {}))
        await classService.updateStudentAccommodations(classId, studentId, accCopy)
        if (students.value[studentId]) {
            students.value[studentId].hasIEP = Boolean(accCopy.hasIEP)
            students.value[studentId].accommodations = accCopy
        }
        if (activeClass.value?.students?.[studentId]) {
            activeClass.value.students[studentId].hasIEP = Boolean(accCopy.hasIEP)
            activeClass.value.students[studentId].accommodations = accCopy
        }
        if (activeClassRecord.value?.students?.[studentId]) {
            activeClassRecord.value.students[studentId].hasIEP = Boolean(accCopy.hasIEP)
            activeClassRecord.value.students[studentId].accommodations = accCopy
        }
        if (activeClassRecord.value && activeClassRecord.value.classType === 'elementary') {
            const afterIEP = ensureIEPPresetsForClass(activeClassRecord.value)
            if (afterIEP !== activeClassRecord.value) {
                await classService.saveClass(afterIEP)
                await loadGradebook(afterIEP)
            }
        }
        triggerRef(students)
        triggerRef(activeClass)
        triggerRef(activeClassRecord)
    } catch (err) {
        console.error('updateStudentAccommodations failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save accommodations.')
    }
}

/**
 * Updates a student's parent/guardian contacts and persists them.
 *
 * @param {string} studentId
 * @param {Array} parentContacts
 * @returns {Promise<void>}
 */
export async function updateStudentParentContacts(studentId, parentContacts) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return
        const contactsCopy = JSON.parse(JSON.stringify(parentContacts || []))
        await classService.updateStudentParentContacts(classId, studentId, contactsCopy)
        if (students.value[studentId]) {
            students.value[studentId].parentContacts = contactsCopy
        }
        if (activeClass.value?.students?.[studentId]) {
            activeClass.value.students[studentId].parentContacts = contactsCopy
        }
        triggerRef(students)
        triggerRef(activeClass)
    } catch (err) {
        console.error('updateStudentParentContacts failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save parent contacts.')
    }
}


/**
 * Assign a student to a seat (or null to send to roster pool).
 * Pushes an undo entry per CLAUDE.md §9.
 *
 * @param {string} studentId
 * @param {{ row: number, col: number } | null} newSeat
 * @returns {Promise<void>}
 */
export async function assignSeat(studentId, newSeat) {
    return swapSeats(studentId, newSeat, null, null)
}

/**
 * Swaps two students' seats (or assigns a student to a seat) in a single atomic transaction
 * with a single undo operation.
 */
export async function swapSeats(studentIdA, toSeatA, studentIdB = null, toSeatB = null) {
    try {
        const classId = activeClass.value?.classId
        if (!classId || !studentIdA) return

        const previousSeatA = students.value[studentIdA]?.seat ?? null
        const previousSeatB = studentIdB ? (students.value[studentIdB]?.seat ?? null) : null

        const seatMap = { [studentIdA]: toSeatA }
        if (studentIdB) {
            seatMap[studentIdB] = toSeatB
        }

        await classService.updateMultipleStudentSeats(classId, seatMap)

        if (students.value[studentIdA]) students.value[studentIdA].seat = toSeatA
        if (activeClass.value?.students?.[studentIdA]) activeClass.value.students[studentIdA].seat = toSeatA

        if (studentIdB) {
            if (students.value[studentIdB]) students.value[studentIdB].seat = toSeatB
            if (activeClass.value?.students?.[studentIdB]) activeClass.value.students[studentIdB].seat = toSeatB
        }

        students.value = { ...students.value }
        triggerRef(students)
        triggerRef(activeClass)

        pushUndo(async () => {
            try {
                const undoMap = { [studentIdA]: previousSeatA }
                if (studentIdB) undoMap[studentIdB] = previousSeatB

                await classService.updateMultipleStudentSeats(classId, undoMap)

                if (students.value[studentIdA]) students.value[studentIdA].seat = previousSeatA
                if (activeClass.value?.students?.[studentIdA]) activeClass.value.students[studentIdA].seat = previousSeatA

                if (studentIdB) {
                    if (students.value[studentIdB]) students.value[studentIdB].seat = previousSeatB
                    if (activeClass.value?.students?.[studentIdB]) activeClass.value.students[studentIdB].seat = previousSeatB
                }

                students.value = { ...students.value }
                triggerRef(students)
                triggerRef(activeClass)
            } catch (err) {
                console.error('Undo swapSeats failed:', err)
                const { alert } = useMessage()
                await alert('Failed to undo seat swap.')
            }
        })
    } catch (err) {
        console.error('swapSeats failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save seat assignment. Please check your connection or storage.')
    }
}

/**
 * Automatically assigns all unassigned students to empty seats in the grid.
 * Combines all changes into a single transactional operation and a single undo entry.
 *
 * @returns {Promise<void>}
 */
export async function autoAssignSeats() {
    const classId = activeClass.value?.classId
    if (!classId) return

    // Find all active (non-archived) students in this class
    const allStudents = Object.entries(students.value)
        .map(([studentId, s]) => ({ studentId, ...s }))
        .filter(s => !s.archived)

    // Shuffle the students array to completely randomize seat assignments
    for (let i = allStudents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allStudents[i], allStudents[j]] = [allStudents[j], allStudents[i]];
    }

    if (allStudents.length === 0) return

    // Check if any student is currently seated
    const anySeated = allStudents.some(s => s.seat !== null)

    if (anySeated) {
        const { confirm } = useMessage()
        const proceed = await confirm(
            'This will clear all current seat assignments and reassign all students. Are you sure you want to proceed?',
            'Reassign All Seats'
        )
        if (!proceed) return
    }

    // Determine the assignments from bottom-up (rows from max down to 1), left-to-right
    // Skipping aisle cells
    const layoutConfig = activeClass.value?.layoutConfig || {}
    const cellTypes = layoutConfig.cellTypes || {}

    const availableSeats = []
    for (let r = gridSize.value.rows; r >= 1; r--) {
        for (let c = 1; c <= gridSize.value.cols; c++) {
            if (cellTypes[`${r}-${c}`] !== 'aisle') {
                availableSeats.push({ row: r, col: c })
            }
        }
    }

    // Match students to seats
    const assignments = []
    const limit = Math.min(allStudents.length, availableSeats.length)
    for (let i = 0; i < limit; i++) {
        assignments.push({
            studentId: allStudents[i].studentId,
            seat: availableSeats[i]
        })
    }

    // Any remaining students who exceed the grid size will be sent to the pool (null seat)
    for (let i = limit; i < allStudents.length; i++) {
        assignments.push({
            studentId: allStudents[i].studentId,
            seat: null
        })
    }

    // Save previous seats for undo functionality
    const previousSeats = {}
    for (const s of allStudents) {
        previousSeats[s.studentId] = s.seat
    }

    // Apply the updates
    try {
        for (const assign of assignments) {
            await classService.updateStudentSeat(classId, assign.studentId, assign.seat)
            if (students.value[assign.studentId]) {
                students.value[assign.studentId].seat = assign.seat
            }
            if (activeClass.value?.students?.[assign.studentId]) {
                activeClass.value.students[assign.studentId].seat = assign.seat
            }
        }
        students.value = { ...students.value }
        triggerRef(students)
        triggerRef(activeClass)

        // Push a single batch undo operation
        pushUndo(async () => {
            try {
                for (const [studentId, seat] of Object.entries(previousSeats)) {
                    await classService.updateStudentSeat(classId, studentId, seat)
                    if (students.value[studentId]) {
                        students.value[studentId].seat = seat
                    }
                    if (activeClass.value?.students?.[studentId]) {
                        activeClass.value.students[studentId].seat = seat
                    }
                }
                triggerRef(students)
                triggerRef(activeClass)
            } catch (err) {
                console.error('Undo autoAssignSeats failed:', err)
                const { alert } = useMessage()
                await alert('Failed to undo automatic seat assignment.')
            }
        })
    } catch (err) {
        console.error('autoAssignSeats failed:', err)
        const { alert } = useMessage()
        await alert('Failed to auto-assign seats. Please check your connection or storage.')
    }
}

