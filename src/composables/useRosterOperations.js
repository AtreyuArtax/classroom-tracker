/**
 * src/composables/useRosterOperations.js
 *
 * Roster and student operations.
 */

import { triggerRef } from 'vue'
import { 
  activeClass, 
  students, 
  classList 
} from './useClassroomState.js'
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
 * Assign a student to a seat (or null to send to roster pool).
 * Pushes an undo entry per CLAUDE.md §9.
 *
 * @param {string} studentId
 * @param {{ row: number, col: number } | null} newSeat
 * @returns {Promise<void>}
 */
export async function assignSeat(studentId, newSeat) {
    try {
        const classId = activeClass.value?.classId
        const previousSeat = students.value[studentId]?.seat ?? null

        await classService.updateStudentSeat(classId, studentId, newSeat)
        students.value[studentId].seat = newSeat

        pushUndo(async () => {
            try {
                await classService.updateStudentSeat(classId, studentId, previousSeat)
                students.value[studentId].seat = previousSeat
            } catch (err) {
                console.error('Undo assignSeat failed:', err)
                const { alert } = useMessage()
                await alert('Failed to undo seat assignment.')
            }
        })
    } catch (err) {
        console.error('assignSeat failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save seat assignment. Please check your connection or storage.')
    }
}
