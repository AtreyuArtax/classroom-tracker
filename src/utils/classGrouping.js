/**
 * Groups classes into school years, then sessions (semesters, or "Full Year"
 * for elementary homerooms), for the Manage Classes "All Sessions" view.
 *
 * Years are newest first, semesters within a year Sem 2 before Sem 1, and
 * classes within a session by period number then name.
 *
 * @param {Array<Object>} classes
 * @param {{ selectedYear: string, selectedSemester: string|number, teachingMode: string }} current
 * @returns {Array<{ year, isCurrent, totalClasses, sessions: Array<{ key, year, semester, label, isCurrent, classes }> }>}
 */
export function groupClassesByYearAndSession(classes, { selectedYear, selectedSemester, teachingMode }) {
  const yearMap = new Map()

  for (const cls of classes) {
    const isElem = cls.classType === 'elementary' || (cls.subjects && cls.subjects.length > 0)
    const year = cls.year || selectedYear || 'Unknown Year'
    const semester = isElem ? 'Full Year' : (cls.semester ? String(cls.semester) : '1')
    const sessionKey = `${year}|${semester}`

    if (!yearMap.has(year)) {
      yearMap.set(year, { year, isCurrent: year === selectedYear, totalClasses: 0, sessions: new Map() })
    }
    const yearEntry = yearMap.get(year)
    yearEntry.totalClasses++

    if (!yearEntry.sessions.has(sessionKey)) {
      yearEntry.sessions.set(sessionKey, {
        key: sessionKey,
        year,
        semester,
        label: isElem ? 'Full Year' : `Semester ${semester}`,
        isCurrent: year === selectedYear && (teachingMode === 'elementary' || semester === String(selectedSemester)),
        classes: []
      })
    }
    yearEntry.sessions.get(sessionKey).classes.push(cls)
  }

  const sortedYears = Array.from(yearMap.values()).sort((a, b) => b.year.localeCompare(a.year))
  for (const yearEntry of sortedYears) {
    const sortedSessions = Array.from(yearEntry.sessions.values()).sort((a, b) => b.semester.localeCompare(a.semester))
    for (const session of sortedSessions) {
      session.classes.sort((a, b) => {
        const pA = Number(a.periodNumber) || 0
        const pB = Number(b.periodNumber) || 0
        if (pA !== pB) return pA - pB
        return (a.name || '').localeCompare(b.name || '')
      })
    }
    yearEntry.sessions = sortedSessions
  }
  return sortedYears
}
