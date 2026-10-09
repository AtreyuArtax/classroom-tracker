/**
 * dossierActivityFeed.js — the "Recent Activity" list on the Student360 summary tab.
 * Merges graded assessments and significant logged events, newest first.
 */

import { getSBARLevelBadge } from './gradeCalcSBAR.js'

/**
 * @param {Object}  opts
 * @param {Array}   opts.assessments       Dossier assessments with `score` resolved for the student
 * @param {Array}   opts.events            The student's events
 * @param {Object}  opts.behaviorCodesMap  { codeKey: behaviourCode }
 * @param {boolean} opts.isSBARMode        Class uses standards-based grading
 * @param {Array}   [opts.categories]      Class categories list
 * @param {number}  [opts.limit=4]
 */
export function buildRecentActivityFeed({ assessments = [], events = [], behaviorCodesMap = {}, isSBARMode = false, categories = [], limit = 4 }) {
  const items = []
  const catMap = new Map((categories || []).map(c => [String(c.categoryId), c.name]))

  // 1. Graded assessments for this student
  const assList = Array.isArray(assessments) ? assessments : []
  assList.forEach(ass => {
    if (!ass || ass.score === null || ass.score === undefined) return
    if (ass.purpose === 'administrative') return

    const isSBAR = ass.categoryId === 'sbar_general' || (ass.expectationIds && ass.expectationIds.length > 0)
    
    // Strict isolation based on active mode
    if (isSBARMode && !isSBAR) return
    if (!isSBARMode && isSBAR) return

    const isFormative = Boolean(ass.isFormative || ass.purpose === 'formative')

    if (isSBAR) {
      const pct = Math.round(Number(ass.score))
      const badge = getSBARLevelBadge(pct)
      const expCount = ass.expectationIds?.length || 1
      items.push({
        id: 'ass-' + ass.assessmentId,
        date: ass.date || '',
        title: ass.name,
        type: 'grade',
        category: isFormative ? 'SBAR Practice' : 'SBAR EVAL',
        value: badge.level,
        levelColor: badge.color,
        subText: `${expCount} Standard${expCount !== 1 ? 's' : ''}`,
        isFormative,
        isFailing: !isFormative && pct < 50
      })
    } else {
      const total = ass.scaledTotal || ass.totalPoints || 100
      const pct = Math.round((ass.score / total) * 100)
      const rawCatName = catMap.get(String(ass.categoryId)) || ass.category
      let categoryLabel = rawCatName || (isFormative ? 'Formative' : 'Assessment')
      if (isFormative && (!rawCatName || rawCatName.toLowerCase() === 'assessment' || rawCatName.toLowerCase() === 'assessments')) {
        categoryLabel = 'Formative'
      }

      items.push({
        id: 'ass-' + ass.assessmentId,
        date: ass.date || '',
        title: ass.name,
        type: 'grade',
        category: categoryLabel,
        value: `${pct}%`,
        subText: `${ass.score}/${total}`,
        isFormative,
        isFailing: !isFormative && pct < 50
      })
    }
  })

  // 2. Logged significant student events (Teacher notes, Parent contacts, Positive recognition, Redirects, Test-Day Absences)
  const evtList = Array.isArray(events) ? events : []
  evtList.forEach(evt => {
    if (!evt || evt.superseded || evt.completed || evt.isCompleted) return
    const evtType = evt.code || evt.type || ''
    const config = behaviorCodesMap?.[evt.code] || {}
    const category = evt.category || config.category
    
    const isParentContact = evtType === 'pc' || category === 'communication'
    const isPositive = category === 'positive'
    const isRedirect = category === 'redirect'
    const isTeacherNote = evtType === 'note' || evtType === 'ac' || (evt.note && String(evt.note).trim().length > 0 && evtType !== 'w')
    const isTestDayAbsence = evtType === 'a' && (evt.testDay || evt.isTestDay)

    // Include significant events, positive praise, redirects, teacher notes, or test day absences
    if (isParentContact || isPositive || isRedirect || isTeacherNote || isTestDayAbsence) {
      let cat = 'NOTE'
      if (isParentContact) cat = 'PARENT'
      else if (isPositive) cat = 'POSITIVE'
      else if (isRedirect) cat = 'REDIRECT'
      else if (isTestDayAbsence) cat = 'TEST DAY'

      const label = config.label || evtType
      const noteText = evt.note ? `${label}: ${evt.note}` : (isTestDayAbsence ? 'Absent on scheduled test day' : label)

      items.push({
        id: 'evt-' + (evt.eventId || evt.id || Math.random()),
        date: evt.timestamp || evt.date || '',
        title: noteText,
        type: 'event',
        category: cat,
        value: isParentContact ? 'Contacted' : isTestDayAbsence ? 'Missed Test' : isPositive ? 'Praise' : isRedirect ? 'Redirect' : 'Logged',
        subText: null,
        isFormative: false,
        isFailing: isTestDayAbsence
      })
    }
  })

  return items
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, limit)
}
