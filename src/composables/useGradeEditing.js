import { ref, watch, nextTick } from 'vue'
import {
  gradeMap,
  assessments,
  classGrades,
  clearGrade,
  markMissing,
  markExcluded,
  enterGrade,
  adjustStudentGrade,
  undoStudentGradeAdjustment,
  removeAttempt,
  setPrimaryAttempt,
  updateAttemptComment,
  activeClassRecord
} from './useGradebook.js'
import { useMessage } from './useMessage.js'

export function useGradeEditing(defaultStudentIdRef = null) {
  const { alert, confirm } = useMessage()

  // State
  const editingCell = ref(null)      // { studentId, sId, assessmentId, aId, value }
  const editOriginalValue = ref(null)
  const editInput = ref(null)
  const contextMenu = ref(null)      // { x, y, studentId, sId, assessmentId, aId }
  const attemptsPopover = ref(null)  // { x, y, studentId, sId, assessmentId, aId, studentName, assessmentName, retestPolicy, attempts, totalPoints, resolvedScore }
  const newAttemptForm = ref(null)   // { assessmentId, points, date, comment }

  // Context menu helper to position popups viewports-aware
  function getAdjustedPosition(e, width, height) {
    let x = e.clientX - width / 2
    let y = e.clientY + 10

    if (x < 10) x = 10
    if (x + width > window.innerWidth - 10) x = window.innerWidth - width - 10

    if (y + height > window.innerHeight - 10) {
      y = Math.max(10, e.clientY - height - 10)
    }

    return { x, y }
  }

  // 1. Inline editing
  function startEdit(arg1, arg2) {
    let studentId = defaultStudentIdRef?.value || null
    let assessmentId = null
    if (arg2 !== undefined) {
      studentId = arg1
      assessmentId = arg2
    } else {
      assessmentId = arg1
    }

    let val = null
    if (assessmentId === 'overall') {
      const gradesObj = classGrades.value[studentId]
      val = gradesObj?.isGradeAdjusted ? gradesObj.adjustedGrade : gradesObj?.calculatedOverallGrade
    } else {
      const current = gradeMap.value[assessmentId]?.[studentId]
      val = current ? current.resolvedScore : null
    }

    editOriginalValue.value = val
    editInput.value = val
    editingCell.value = {
      studentId,
      sId: studentId,
      assessmentId,
      aId: assessmentId,
      value: val
    }

    nextTick(() => {
      // Focus element in next tick (handles either direct grid ref or simple selector)
      const input = document.querySelector('.cell-edit-input, .grades__input-inline')
      if (input) {
        input.focus()
        input.select()
      }
    })
  }

  function cancelEdit() {
    editingCell.value = null
    editInput.value = null
  }

  async function saveEdit() {
    if (!editingCell.value) return
    const { studentId, assessmentId, value } = editingCell.value
    
    // Resolve current input value based on whether editInput is a DOM ref or a v-model ref
    let currentVal = editInput.value
    if (editInput.value && (editInput.value instanceof Element || (Array.isArray(editInput.value) && editInput.value[0] instanceof Element))) {
      currentVal = value
    }
    const normalizedNew = (currentVal === null || currentVal === undefined || currentVal === '') ? null : Number(currentVal)
    const normalizedOld = (editOriginalValue.value === null || editOriginalValue.value === undefined || editOriginalValue.value === '') ? null : Number(editOriginalValue.value)

    if (normalizedNew === normalizedOld) {
      editingCell.value = null
      return
    }

    if (assessmentId === 'overall') {
      if (normalizedNew === null) {
        await undoStudentGradeAdjustment(studentId)
      } else {
        const adjusted = Math.max(0, normalizedNew)
        await adjustStudentGrade(studentId, adjusted)
      }
      editingCell.value = null
      return
    }

    if (normalizedNew === null) {
      const grade = gradeMap.value[assessmentId]?.[studentId]
      const hasMultipleAttempts = grade?.attempts?.length > 1

      if (hasMultipleAttempts) {
        await alert('Cannot clear: This student has multiple attempts. Use the attempt history menu (•) to manage or delete specific entries.')
        editingCell.value = null
        return
      }

      await clearGrade(assessmentId, studentId)
      editingCell.value = null
      return
    }

    const assessment = assessments.value.find(a => a.assessmentId === assessmentId)
    if (!assessment) {
      editingCell.value = null
      return
    }

    const points = Math.max(0, normalizedNew)
    await enterGrade(assessmentId, studentId, points)
    editingCell.value = null
  }

  // 2. Context Menu
  function openContextMenu(e, arg1, arg2) {
    let studentId = defaultStudentIdRef?.value || null
    let assessmentId = null
    if (arg2 !== undefined) {
      studentId = arg1
      assessmentId = arg2
    } else {
      assessmentId = arg1
    }

    const { x, y } = getAdjustedPosition(e, 160, 150)
    contextMenu.value = {
      x,
      y,
      studentId,
      sId: studentId,
      assessmentId,
      aId: assessmentId
    }
  }

  // 3. Attempts popover
  function openAttempts(e, arg1, arg2) {
    let studentId = defaultStudentIdRef?.value || null
    let assessmentId = null
    if (arg2 !== undefined) {
      studentId = arg1
      assessmentId = arg2
    } else {
      assessmentId = arg1
    }

    const { x, y } = getAdjustedPosition(e, 280, 300)
    const grade = gradeMap.value[assessmentId]?.[studentId]
    const student = activeClassRecord.value?.students?.[studentId]
    const assessment = assessments.value.find(a => a.assessmentId === assessmentId)

    if (grade && student && assessment) {
      attemptsPopover.value = {
        x,
        y,
        studentId,
        sId: studentId,
        assessmentId,
        aId: assessmentId,
        studentName: `${student.firstName} ${student.lastName}`,
        assessmentName: assessment.name,
        retestPolicy: assessment.retestPolicy || 'highest',
        attempts: grade.attempts || [],
        totalPoints: assessment.totalPoints,
        resolvedScore: grade.resolvedScore
      }
    }
  }

  function openAttemptsFromMenu(e, studentId, assessmentId) {
    const x = contextMenu.value?.x || e.clientX
    const y = contextMenu.value?.y || e.clientY
    contextMenu.value = null
    openAttempts({ clientX: x, clientY: y }, studentId, assessmentId)
  }

  function isMissing(studentId, assessmentId) {
    return gradeMap.value[assessmentId]?.[studentId]?.missing
  }

  function isExcluded(studentId, assessmentId) {
    return gradeMap.value[assessmentId]?.[studentId]?.excluded
  }

  async function toggleMissing(assessmentId, studentId) {
    let aId = (typeof assessmentId === 'string' || typeof assessmentId === 'number') ? assessmentId : null
    let sId = (typeof studentId === 'string' || typeof studentId === 'number') ? studentId : null
    if (!aId && contextMenu.value) {
      aId = contextMenu.value.assessmentId
      sId = contextMenu.value.studentId
    }
    const current = isMissing(sId, aId)
    await markMissing(aId, sId, !current)
    contextMenu.value = null
  }

  async function toggleExcluded(assessmentId, studentId) {
    let aId = (typeof assessmentId === 'string' || typeof assessmentId === 'number') ? assessmentId : null
    let sId = (typeof studentId === 'string' || typeof studentId === 'number') ? studentId : null
    if (!aId && contextMenu.value) {
      aId = contextMenu.value.assessmentId
      sId = contextMenu.value.studentId
    }
    const current = isExcluded(sId, aId)
    await markExcluded(aId, sId, !current)
    contextMenu.value = null
  }

  // 4. Attempts popover CRUD
  function startNewAttempt(assessmentId) {
    newAttemptForm.value = {
      assessmentId,
      points: null,
      date: new Date().toISOString().slice(0, 10),
      comment: ''
    }
    contextMenu.value = null
    attemptsPopover.value = null
  }

  async function submitNewAttempt(studentId) {
    if (!newAttemptForm.value || newAttemptForm.value.points === null) return
    const { assessmentId, points, date, comment } = newAttemptForm.value
    const sId = (studentId && typeof studentId === 'string') ? studentId : defaultStudentIdRef?.value
    await enterGrade(assessmentId, sId, points, date, comment)
    newAttemptForm.value = null
  }

  async function setAttemptPrimary(arg1, arg2, arg3) {
    let aId, sId, attemptId
    if (arg3 !== undefined) {
      aId = arg1
      sId = arg2
      attemptId = arg3
    } else if (arg2 !== undefined) {
      aId = arg1
      sId = defaultStudentIdRef?.value
      attemptId = arg2
    } else {
      aId = attemptsPopover.value?.assessmentId
      sId = attemptsPopover.value?.studentId
      attemptId = arg1
    }
    if (!aId || !sId) return
    await setPrimaryAttempt(aId, sId, attemptId)

    // Sync attempts array in active popover
    if (attemptsPopover.value && attemptsPopover.value.assessmentId === aId && attemptsPopover.value.studentId === sId) {
      const grade = gradeMap.value[aId]?.[sId]
      if (grade) {
        attemptsPopover.value.attempts = grade.attempts || []
      }
    }
  }

  async function deleteAttempt(arg1, arg2, arg3) {
    let aId, sId, attemptId
    if (arg3 !== undefined) {
      aId = arg1
      sId = arg2
      attemptId = arg3
    } else if (arg2 !== undefined) {
      aId = arg1
      sId = defaultStudentIdRef?.value
      attemptId = arg2
    } else {
      aId = attemptsPopover.value?.assessmentId
      sId = attemptsPopover.value?.studentId
      attemptId = arg1
    }
    if (!aId || !sId) return
    if (!await confirm('Are you sure you want to delete this attempt?', 'Delete Attempt', { danger: true })) return
    await removeAttempt(aId, sId, attemptId)

    // Sync attempts array in active popover
    if (attemptsPopover.value && attemptsPopover.value.assessmentId === aId && attemptsPopover.value.studentId === sId) {
      const grade = gradeMap.value[aId]?.[sId]
      if (grade && grade.attempts && grade.attempts.length > 0) {
        attemptsPopover.value.attempts = grade.attempts
      } else {
        attemptsPopover.value = null
      }
    }
  }

  function updateComment(arg1, arg2, arg3, arg4) {
    let aId, sId, attemptId, comment
    if (arg4 !== undefined) {
      aId = arg1
      sId = arg2
      attemptId = arg3
      comment = arg4
    } else if (arg3 !== undefined) {
      aId = arg1
      sId = defaultStudentIdRef?.value
      attemptId = arg2
      comment = arg3
    } else {
      aId = attemptsPopover.value?.assessmentId
      sId = attemptsPopover.value?.studentId
      attemptId = arg1
      comment = arg2
    }
    if (!aId || !sId) return
    updateAttemptComment(aId, sId, attemptId, comment)
  }

  return {
    editingCell,
    editOriginalValue,
    editInput,
    contextMenu,
    attemptsPopover,
    newAttemptForm,
    getAdjustedPosition,
    startEdit,
    cancelEdit,
    saveEdit,
    openContextMenu,
    openAttempts,
    openAttemptsFromMenu,
    isMissing,
    isExcluded,
    toggleMissing,
    toggleExcluded,
    startNewAttempt,
    submitNewAttempt,
    setAttemptPrimary,
    deleteAttempt,
    updateComment
  }
}
