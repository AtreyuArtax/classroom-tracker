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
