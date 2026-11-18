import { formatLocalDisplay } from './dates.js'

/**
 * Formats qualitative evidence events into a rich, structured text breakdown
 * grouped by Unit -> Expectation -> Event (with Outcome & Next Steps).
 */
export function formatQualitativeEvidenceForReport(events, classRecord) {
  const qualitativeEvents = (events || []).filter(e => 
    !e.superseded && (e.code === 'ac' || e.acType === 'observation' || e.acType === 'conversation')
  )

  if (qualitativeEvents.length === 0) {
    return ['None']
  }

  const judgmentLines = []
  const units = classRecord?.gradebookUnits || []
  const byUnit = {}
  const generalEvents = []

  qualitativeEvents.forEach(e => {
    if (!e.unitId) {
      generalEvents.push(e)
    } else {
      if (!byUnit[e.unitId]) byUnit[e.unitId] = []
      byUnit[e.unitId].push(e)
    }
  })

  // Group by Units
  Object.keys(byUnit).forEach(unitId => {
    const unitRecord = units.find(u => u.unitId === unitId || u.name?.toLowerCase() === String(unitId).toLowerCase())
    const unitName = unitRecord ? unitRecord.name : 'Unit Evidence'
    judgmentLines.push(`${unitName}:`)

    const byExp = {}
    const unitGeneralEvents = []

    byUnit[unitId].forEach(e => {
      if (!e.expectationId) {
        unitGeneralEvents.push(e)
      } else {
        if (!byExp[e.expectationId]) byExp[e.expectationId] = []
        byExp[e.expectationId].push(e)
      }
    })

    Object.keys(byExp).forEach(expId => {
      const expRecord = unitRecord?.expectations?.find(exp => 
        (exp.expectationId && exp.expectationId === expId) || 
        (exp.code && String(exp.code).toLowerCase() === String(expId).toLowerCase())
      )
      const expCode = expRecord ? expRecord.code : (typeof expId === 'string' ? expId : 'Expectation')
      judgmentLines.push(`  ${expCode}:`)

      const sortedEvts = byExp[expId].sort((a, b) => new Date(a.ts || a.timestamp) - new Date(b.ts || b.timestamp))
      sortedEvts.forEach(e => {
        const dateStr = formatLocalDisplay(e.ts || e.timestamp, { month: 'short', day: 'numeric' })
        const type = e.acType === 'observation' ? 'Obs' : 'Conv'
        let outcomeLabel = ''
        if (e.acOutcome === 'demonstrates_understanding') outcomeLabel = 'Mastered'
        else if (e.acOutcome === 'gap_confirmed') outcomeLabel = 'Needs Support'
        else if (e.acOutcome === 'inconclusive') outcomeLabel = 'Developing'
        const outcome = outcomeLabel ? ` [${outcomeLabel}]` : ''
        const noteText = e.note || e.title || ''
        judgmentLines.push(`    - ${dateStr} (${type})${outcome}: ${noteText}`)
        if (e.nextSteps) {
          judgmentLines.push(`      Next Steps: ${e.nextSteps}`)
        }
      })
    })

    if (unitGeneralEvents.length > 0) {
      judgmentLines.push(`  General:`)
      const sortedEvts = unitGeneralEvents.sort((a, b) => new Date(a.ts || a.timestamp) - new Date(b.ts || b.timestamp))
      sortedEvts.forEach(e => {
        const dateStr = formatLocalDisplay(e.ts || e.timestamp, { month: 'short', day: 'numeric' })
        const type = e.acType === 'observation' ? 'Obs' : 'Conv'
        let outcomeLabel = ''
        if (e.acOutcome === 'demonstrates_understanding') outcomeLabel = 'Mastered'
        else if (e.acOutcome === 'gap_confirmed') outcomeLabel = 'Needs Support'
        else if (e.acOutcome === 'inconclusive') outcomeLabel = 'Developing'
        const outcome = outcomeLabel ? ` [${outcomeLabel}]` : ''
        const noteText = e.note || e.title || ''
        judgmentLines.push(`    - ${dateStr} (${type})${outcome}: ${noteText}`)
        if (e.nextSteps) {
          judgmentLines.push(`      Next Steps: ${e.nextSteps}`)
        }
      })
    }
  })

  // General course-wide observations & conversations
  if (generalEvents.length > 0) {
    judgmentLines.push('General Observations & Conversations:')
    const sortedEvts = generalEvents.sort((a, b) => new Date(a.ts || a.timestamp) - new Date(b.ts || b.timestamp))
    sortedEvts.forEach(e => {
      const dateStr = formatLocalDisplay(e.ts || e.timestamp, { month: 'short', day: 'numeric' })
      const type = e.acType === 'observation' ? 'Obs' : 'Conv'
      let outcomeLabel = ''
        if (e.acOutcome === 'demonstrates_understanding') outcomeLabel = 'Mastered'
        else if (e.acOutcome === 'gap_confirmed') outcomeLabel = 'Needs Support'
        else if (e.acOutcome === 'inconclusive') outcomeLabel = 'Developing'
        else if (e.acOutcome === 'remediation_required') outcomeLabel = 'Insufficient (R)'
      const outcome = outcomeLabel ? ` [${outcomeLabel}]` : ''
      const noteText = e.note || e.title || ''
      judgmentLines.push(`  - ${dateStr} (${type})${outcome}: ${noteText}`)
      if (e.nextSteps) {
        judgmentLines.push(`    Next Steps: ${e.nextSteps}`)
      }
    })
  }

  return judgmentLines
}

/**
 * Builds a lookup dictionary for curriculum expectations from classRecord units and flat expectation lists.
 */
function buildExpectationLookup(classRecord) {
  const lookup = {}
  const store = (exp) => {
    if (!exp) return
    const code = exp.code || exp.expectationId
    const id = exp.expectationId || exp.code
    const desc = exp.description || exp.title || ''
    const entry = { code: code ? String(code) : String(id), description: desc }
    if (id) lookup[String(id).toLowerCase()] = entry
    if (code) lookup[String(code).toLowerCase()] = entry
  }

  ;(classRecord?.expectations || classRecord?.curriculumExpectations || []).forEach(store)
  ;(classRecord?.gradebookUnits || []).forEach(u => {
    ;(u.expectations || []).forEach(store)
  })
  return lookup
}

/**
 * Formats a complete, structured report card progress summary for a single student.
 * Shared by both the Student 360 "Copy for Report Card Comment" buttons and the
 * Reports hub "Report Card Comments" CSV export so both outputs stay identical.
 */
export function formatStudentReportCardSummary({
  student,
  classRecord,
  includeName = false,
  reportType = 'Midterm',
  midtermDate = 'N/A',
  formattedGrade = 'N/A',
  absences = 0,
  lates = 0,
  assessments = [],
  categoryAverages = [],
  events = [],
  expectationMastery = null,
  lineEnding = '\n'
}) {
  const s = student || {}
  const classObj = classRecord || {}
  const expLookup = buildExpectationLookup(classObj)

  const resolveExpCodes = (a) => {
    const rawIds = Array.isArray(a.expectationIds) && a.expectationIds.length > 0
      ? a.expectationIds
      : (a.expectationId ? [a.expectationId] : [])
    const seen = new Set()
    const codes = []
    rawIds.forEach(id => {
      const key = String(id).toLowerCase()
      const code = expLookup[key]?.code || String(id)
      if (!seen.has(code)) {
        seen.add(code)
        codes.push(code)
      }
    })
    return codes
  }

  const classCode = classObj.courseCode ? ` (${classObj.courseCode})` : ''
  const header = includeName
    ? `Student Name: ${s.firstName || ''} ${s.lastName || ''}${classCode}`.trim()
    : `Student${classCode} — Progress Summary`

  const textLines = [header]

  if (includeName) {
    const pronouns = (s.pronouns || s.intakeSurvey?.pronouns || '').trim()
    if (pronouns) {
      textLines.push(`Pronouns: ${pronouns}`)
    }
  }

  if (classObj.courseCode) {
    textLines.push(`Course: ${classObj.courseCode}`)
  } else if (classObj.classType === 'elementary' && classObj.name) {
    textLines.push(`Subject: ${classObj.name}`)
  }

  textLines.push(`Current Grade: ${formattedGrade}`)

  if (s.hasIEP) {
    const curSubId = classObj.activeSubjectId
    const modGrade = curSubId ? s.accommodations?.modifiedSubjectGrades?.[curSubId] : null
    if (modGrade) {
      textLines.push(`Accommodations: IEP Modified Expectations (${modGrade})`)
    } else if (s.iepType === 'gifted') {
      textLines.push(`Accommodations: IEP — Gifted / Enrichment Plan`)
    } else {
      textLines.push(`Accommodations: IEP Plan Active`)
    }
  }

  if (midtermDate && midtermDate !== 'N/A') {
    textLines.push(`Midterm Cutoff Date: ${midtermDate}`)
  }
  textLines.push(`Report Type: ${reportType}`)
  textLines.push(`Attendance: ${absences} Absences, ${lates} Lates`)

  // 1. Chronological Gradebook Log (with units, expectations, attempts, and notes)
  const academicList = [...(assessments || [])]
    .filter(a => !a.excluded && a.purpose !== 'administrative' && (a.score !== null || a.missing || a.attempts?.some(att => att.comment?.trim())))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  let boundaryInserted = false
  const academicLines = []
  const expAssessmentStats = {}

  academicList.forEach(a => {
    if (midtermDate && midtermDate !== 'N/A' && a.date > midtermDate && !boundaryInserted) {
      academicLines.push('--- MIDTERM CUTOFF BOUNDARY ---')
      boundaryInserted = true
    }
    const date = formatLocalDisplay(a.date, { month: 'short', day: 'numeric' })
    const unit = classObj.gradebookUnits?.find(u => u.unitId === a.unitId)
    const unitPrefix = unit ? `[${unit.name}] ` : ''
    const expCodes = resolveExpCodes(a)
    const expSuffix = expCodes.length > 0 ? ` [Exp: ${expCodes.join(', ')}]` : ''

    let line = `- ${date} - ${unitPrefix}${a.name}: `
    let pct = null
    if (a.missing) {
      line += 'Missing'
    } else if (a.score !== null && a.score !== undefined) {
      pct = Math.round((a.score / (a.totalPoints || 1)) * 100)
      line += `${pct}%`
    } else {
      line += 'Ungraded'
    }
    line += expSuffix

    if (pct !== null && expCodes.length > 0) {
      expCodes.forEach(code => {
        if (!expAssessmentStats[code]) expAssessmentStats[code] = { scores: [], missing: 0 }
        expAssessmentStats[code].scores.push(pct)
      })
    } else if (a.missing && expCodes.length > 0) {
      expCodes.forEach(code => {
        if (!expAssessmentStats[code]) expAssessmentStats[code] = { scores: [], missing: 0 }
        expAssessmentStats[code].missing++
      })
    }

    if (a.attempts?.length > 1) {
      const history = a.attempts
        .map(att => {
          if (att.pointsEarned === null || att.pointsEarned === undefined) return 'Ungraded'
          return Math.round((att.pointsEarned / (a.totalPoints || 1)) * 100) + '%'
        })
        .join(', ')
      line += ` (Attempts history: ${history})`
    }

    const comments = (a.attempts || [])
      .map((att, idx) => {
        const trimmed = att.comment?.trim()
        if (!trimmed) return null
        if ((a.attempts || []).length === 1) return `[Note] ${trimmed}`
        if (att.pointsEarned === null || att.pointsEarned === undefined) {
          return `[Note - Attempt ${idx + 1}] ${trimmed}`
        }
        const attPct = Math.round((att.pointsEarned / (a.totalPoints || 1)) * 100)
        return `[Note - Attempt ${idx + 1} (${attPct}%)] ${trimmed}`
      })
      .filter(Boolean)

    comments.forEach(c => {
      line += `${lineEnding}  ↳ ${c}`
    })
    academicLines.push(line)
  })

  textLines.push('')
  textLines.push('Gradebook Log (Chronological):')
  textLines.push(...(academicLines.length > 0 ? academicLines : ['None']))

  // 2. Category Averages
  textLines.push('')
  textLines.push('Category Averages:')
  if (categoryAverages && categoryAverages.length > 0) {
    textLines.push(...categoryAverages.map(c => `- ${c.name}: ${c.score !== null && c.score !== undefined ? Math.round(c.score) + '%' : 'N/A'}`))
  } else {
    textLines.push('None')
  }

  // 3. Curriculum Expectations Summary (from SBAR mastery, assessments, and tagged events)
  const expQualitativeCounts = {}
  ;(events || []).forEach(e => {
    if (e.superseded || !e.expectationId) return
    if (e.code === 'ac' || e.acType === 'observation' || e.acType === 'conversation') {
      const code = expLookup[String(e.expectationId).toLowerCase()]?.code || String(e.expectationId)
      expQualitativeCounts[code] = (expQualitativeCounts[code] || 0) + 1
    }
  })

  const allExpCodes = new Set([
    ...Object.keys(expAssessmentStats),
    ...Object.keys(expQualitativeCounts),
    ...(expectationMastery ? Object.keys(expectationMastery) : [])
  ])

  const expectationLines = []
  Array.from(allExpCodes).sort().forEach(code => {
    const info = expLookup[code.toLowerCase()]
    const desc = info?.description ? ` (${info.description.length > 80 ? info.description.slice(0, 77) + '...' : info.description})` : ''
    const masteryObj = expectationMastery?.[code]
    const assessStat = expAssessmentStats[code]
    const qualCount = expQualitativeCounts[code] || 0

    const parts = []
    if (masteryObj && masteryObj.score !== null && masteryObj.score !== undefined) {
      const badgeStr = masteryObj.badge?.label ? `${masteryObj.badge.label} ` : ''
      parts.push(`${badgeStr}${Math.round(masteryObj.score)}%`)
    } else if (assessStat && assessStat.scores.length > 0) {
      const avg = Math.round(assessStat.scores.reduce((sum, v) => sum + v, 0) / assessStat.scores.length)
      parts.push(`${avg}% (${assessStat.scores.length} assessment${assessStat.scores.length === 1 ? '' : 's'})`)
    }
    if (assessStat?.missing > 0) {
      parts.push(`${assessStat.missing} missing`)
    }
    if (qualCount > 0) {
      parts.push(`${qualCount} obs/conv`)
    }

    if (parts.length > 0) {
      expectationLines.push(`- ${code}${desc}: ${parts.join(', ')}`)
    }
  })

  if (expectationLines.length > 0) {
    textLines.push('')
    textLines.push('Curriculum Expectations Summary:')
    textLines.push(...expectationLines)
  }

  // 4. Professional Judgment (Observations & Conversations)
  textLines.push('')
  textLines.push('Professional Judgment (Observations & Conversations):')
  const judgmentLines = formatQualitativeEvidenceForReport(events, classObj)
  textLines.push(...judgmentLines)

  // 5. Teacher Working Notes & General Notes
  const workingNote = s.gradebookNote?.trim()
  const generalNote = s.generalNote?.trim()
  if (workingNote || generalNote) {
    textLines.push('')
    if (workingNote) {
      textLines.push('Teacher Working Notes (Comment Ideas):')
      textLines.push(workingNote)
    }
    if (generalNote) {
      if (workingNote) textLines.push('')
      textLines.push('General Notes:')
      textLines.push(generalNote)
    }
  }

  return textLines.join(lineEnding)
}
