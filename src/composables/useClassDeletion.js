/**
 * src/composables/useClassDeletion.js
 *
 * Permanent deletion of an archived class, behind a typed-name confirmation
 * that lists how much data will be removed. Lets Setup components delete a
 * class without touching db/ directly.
 */

import { getClassDataCounts } from '../db/classService.js'
import { useClassroom } from './useClassroom.js'
import { useMessage } from './useMessage.js'

export function useClassDeletion() {
  const { archivedClasses, deleteClass } = useClassroom()
  const { confirm } = useMessage()

  /**
   * Ask the teacher to type the class name, then delete the class and all its
   * assessments, grades and events.
   *
   * @param {string} classId
   * @returns {Promise<boolean>} true when the class was deleted
   */
  async function confirmAndDeleteClass(classId) {
    const cls = archivedClasses.value.find(c => c.classId === classId)
    const name = cls?.name ?? 'this class'

    const details = []
    try {
      const { assessmentCount, gradeCount, eventCount } = await getClassDataCounts(classId)
      if (assessmentCount > 0) details.push(`${assessmentCount} assessment(s)`)
      if (gradeCount > 0) details.push(`${gradeCount} recorded student grade(s)`)
      if (eventCount > 0) details.push(`${eventCount} attendance/behavior event(s)`)
    } catch (err) {
      console.warn('Failed to pre-fetch class delete stats:', err)
    }

    const warningDetail = details.length > 0
      ? `\n\nThis will permanently delete: ${details.join(', ')}.`
      : ''

    if (!await confirm(
      `You are about to PERMANENTLY wipe "${name}" and all its historical data.${warningDetail}\n\nThis action is irreversible. Please type the name of the class below to confirm.`,
      'Final Security Check',
      { danger: true, requireText: name }
    )) return false

    await deleteClass(classId)
    return true
  }

  return { confirmAndDeleteClass }
}
