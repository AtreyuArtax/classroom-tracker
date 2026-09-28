/**
 * src/utils/gradeGridExport.js
 *
 * Clipboard text formatting helpers for GradesGrid.
 */

export function buildStudentNamesClipboardText(roster) {
  return (roster || []).map(s => `${s.lastName}, ${s.firstName}`).join('\n')
}

export function buildOverallGradesClipboardText(roster, classGrades) {
  return (roster || []).map(s => {
    const g = classGrades?.[s.studentId]?.overallGrade
    return g !== null && g !== undefined ? Math.round(g) : ''
  }).join('\n')
}

export function buildAssessmentGradesClipboardText(roster, assessment, gradeMap) {
  return (roster || []).map(student => {
    const grade = gradeMap?.[assessment?.assessmentId]?.[student.studentId]
    if (!grade) return ''
    if (grade.missing) return 'M'
    if (grade.excluded) return 'EX'
    return grade.resolvedScore !== null && grade.resolvedScore !== undefined ? grade.resolvedScore : ''
  }).join('\n')
}
