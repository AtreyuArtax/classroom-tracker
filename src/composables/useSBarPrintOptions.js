import { ref, reactive, computed } from 'vue'
import { 
  calculateSBARExpectationMastery, 
  calculateSBARStudentOverallMastery, 
  getSBARLevelBadge 
} from '../db/gradebook/gradeCalcSBAR.js'
import { formatLocalDisplay } from '../utils/dates.js'
import { getEffectiveClassRecord } from './useElementary.js'
import { activeSubjectId } from './useClassroomState.js'

/**
 * Composable for managing S-Bar printable report options, expectation scope filtering,
 * overall level badge calculation, and evaluation progression timeline formatting.
 */
export function useSBarPrintOptions() {
  /**
   * Default S-Bar print configuration options
   */
  const createDefaultSBarConfig = () => reactive({
    reportType: 'progress',
    expectationScope: 'assessed', // 'assessed' (default - compact) | 'overall' | 'all'
    layoutColumns: '2',           // '2' (2-Column Grid - default) | '1' (Single Column)
    includeProgression: true,     // Chronological L2 -> L3 -> L4 timeline per expectation
    includeOverallBadge: true,     // Overall course mastery level badge (e.g. L4, L3+)
    includeAttendance: true,       // Absences and Lates summary
    includeBehavior: false,        // Out-of-class washroom/redirect summary
    includeEvidenceMix: false      // Triangulation (Product/Observation/Conversation)
  })

  /**
   * Calculates overall student SBAR badge
   */
  function getStudentOverallSBarBadge(studentId, classRecord, assessments, gradeMap, events = []) {
    if (!studentId || !classRecord) return getSBARLevelBadge(null)
    const effClass = getEffectiveClassRecord(classRecord, activeSubjectId.value)
    if (!effClass) return getSBARLevelBadge(null)
    const algo = effClass.sbarAlgorithm || 'decaying_average'
    const pct = calculateSBARStudentOverallMastery(studentId, effClass, assessments, gradeMap, algo, events)
    return getSBARLevelBadge(pct)
  }

  /**
   * Prepares grouped curriculum expectations with student mastery, trend, and evaluation progression history.
   *
   * @param {string} studentId
   * @param {Object} classRecord
   * @param {Array<Object>} assessments
   * @param {Object} gradeMap
   * @param {Array<Object>} events
   * @param {string} scope - 'assessed' | 'overall' | 'all'
   * @returns {Array<Object>} Array of units containing expectation objects
   */
  function prepareSBarReportData(studentId, classRecord, assessments, gradeMap, events = [], scope = 'assessed') {
    if (!classRecord || !studentId) return []
    const effClass = getEffectiveClassRecord(classRecord, activeSubjectId.value)
    if (!effClass) return []

    const algo = effClass.sbarAlgorithm || 'decaying_average'
    const masteryMap = calculateSBARExpectationMastery(effClass, assessments, gradeMap, algo, events)
    const studentExpMap = masteryMap[studentId] || {}

    // Gather units/strands from effClass.gradebookUnits or flat expectations
    const rawUnits = effClass.gradebookUnits || []
    const flatExps = effClass.expectations || effClass.curriculumExpectations || []

    // Build description lookup dictionary across flatExps, rawUnits, and assessments
    const expDescMap = {}
    const storeDesc = (code, desc) => {
      if (!code || !desc) return
      const k = String(code).toLowerCase()
      if (!expDescMap[k]) expDescMap[k] = desc
    }

    if (Array.isArray(flatExps)) {
      flatExps.forEach(e => storeDesc(e.code || e.expectationId, e.description || e.title))
    }
    if (Array.isArray(rawUnits)) {
      rawUnits.forEach(u => {
        if (Array.isArray(u.expectations)) {
          u.expectations.forEach(e => storeDesc(e.code || e.expectationId, e.description || e.title))
        }
      })
    }
    if (Array.isArray(assessments)) {
      assessments.forEach(a => {
        if (Array.isArray(a.expectations)) {
          a.expectations.forEach(e => storeDesc(e.code || e.expectationId, e.description || e.title))
        }
      })
    }

    const unitMap = {}

    // 1. Build unit structure from gradebookUnits if available
    if (rawUnits.length > 0) {
      rawUnits.forEach(u => {
        unitMap[u.unitId] = {
          unitId: u.unitId,
          name: (u.name || 'Strand').replace(/\[Grade \d+\]\s*/g, ''),
          expectations: []
        }
        if (Array.isArray(u.expectations)) {
          u.expectations.forEach(exp => {
            if (exp.code || exp.expectationId) {
              const codeStr = exp.code || exp.expectationId
              unitMap[u.unitId].expectations.push({
                ...exp,
                description: exp.description || exp.title || expDescMap[String(codeStr).toLowerCase()] || codeStr,
                unitId: u.unitId,
                strandName: u.name
              })
            }
          })
        }
      })
    }

    // 2. Fallback or append from flat expectations
    if (flatExps.length > 0) {
      flatExps.forEach(exp => {
        if (!exp.code && !exp.expectationId) return
        const strandCode = exp.strand || (exp.code ? exp.code.charAt(0).toUpperCase() : 'G')
        const uId = exp.unitId || `strand-${strandCode}`
        const uName = exp.strandName || `Strand ${strandCode}`

        if (!unitMap[uId]) {
          unitMap[uId] = { unitId: uId, name: uName, expectations: [] }
        }

        const existingCode = exp.code || exp.expectationId
        if (!unitMap[uId].expectations.some(e => (e.code || e.expectationId) === existingCode)) {
          unitMap[uId].expectations.push({
            ...exp,
            description: exp.description || exp.title || expDescMap[String(existingCode).toLowerCase()] || existingCode,
            unitId: uId,
            strandName: uName
          })
        }
      })
    }

    // 3. Fallback: Include any assessed expectations from studentExpMap not explicitly listed in units
    if (studentExpMap && Object.keys(studentExpMap).length > 0) {
      Object.keys(studentExpMap).forEach(expCode => {
        const hasMatch = Object.values(unitMap).some(u => 
          u.expectations && u.expectations.some(e => String(e.code || e.expectationId || '').toLowerCase() === expCode.toLowerCase())
        )
        if (!hasMatch) {
          const parts = expCode.split('.')
          let strandName = 'Curriculum Standards'
          if (parts.length >= 2) {
            strandName = parts[0] === 'SC' ? `Strand ${parts[1]}` : `Strand ${parts[0]}`
          }
          const uId = `dynamic-${strandName.toLowerCase().replace(/\s+/g, '-')}`
          if (!unitMap[uId]) {
            unitMap[uId] = { unitId: uId, name: strandName, expectations: [] }
          }
          const matchedDesc = expDescMap[expCode.toLowerCase()] || expCode
          unitMap[uId].expectations.push({
            code: expCode,
            expectationId: expCode,
            description: matchedDesc,
            unitId: uId,
            strandName
          })
        }
      })
    }

    // Convert unitMap to array
    let processedUnits = Object.values(unitMap)

    // Scope: Overall Expectations vs Specific Expectations
    if (scope === 'overall') {
      // Group expectations by overall code or parent code
      processedUnits = processedUnits.map(unit => {
        const overallGroupMap = {}

        unit.expectations.forEach(exp => {
          const fullCode = String(exp.code || exp.expectationId || '')
          // Infer overall parent code e.g. "MT1" from "SC.MT1.1" or "MT1.01" or "A1" from "A1.1"
          let parentCode = exp.overallCode || exp.parentCode
          if (!parentCode) {
            const parts = fullCode.split('.')
            if (parts.length > 1 && parts[0] === 'SC') {
              parentCode = parts[1] // e.g. "SC.MT1.1" -> "MT1"
            } else if (parts.length > 1) {
              parentCode = parts[0] // e.g. "A1.1" -> "A1"
            } else {
              parentCode = fullCode
            }
          }

          if (!overallGroupMap[parentCode]) {
            overallGroupMap[parentCode] = {
              code: parentCode,
              description: exp.overallTitle || exp.strandName || exp.description || `Overall Expectation ${parentCode}`,
              childCodes: [],
              evaluations: []
            }
          }

          overallGroupMap[parentCode].childCodes.push(fullCode)

          // Collect evaluations for child codes
          const dataKey = Object.keys(studentExpMap).find(k => k.toLowerCase() === fullCode.toLowerCase())
          if (dataKey && studentExpMap[dataKey]) {
            const childData = studentExpMap[dataKey]
            if (childData.evaluations) {
              overallGroupMap[parentCode].evaluations.push(...childData.evaluations)
            }
          }
        })

        const aggregatedExpectations = Object.values(overallGroupMap).map(ov => {
          // Sort evaluations chronologically
          ov.evaluations.sort((a, b) => new Date(a.date) - new Date(b.date))
          const scores = ov.evaluations.map(e => e.score)

          let finalScore = null
          if (scores.length > 0) {
            finalScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          }

          let trend = 'steady'
          if (scores.length >= 2) {
            const delta = scores[scores.length - 1] - scores[0]
            if (delta >= 5) trend = 'improving'
            else if (delta <= -5) trend = 'declining'
          }

          const hasSummative = ov.evaluations.some(e => e.type === 'summative')

          return {
            code: ov.code,
            description: ov.description,
            score: finalScore,
            badge: getSBARLevelBadge(finalScore),
            trend,
            isProvisional: ov.evaluations.length > 0 && !hasSummative,
            evaluations: ov.evaluations,
            isAssessed: ov.evaluations.length > 0
          }
        })

        return {
          ...unit,
          expectations: aggregatedExpectations
        }
      })
    } else {
      // Specific Expectations Scope (assessed or all)
      processedUnits = processedUnits.map(unit => {
        const enrichedExpectations = unit.expectations.map(exp => {
          const expCode = String(exp.code || exp.expectationId || '')
          const dataKey = Object.keys(studentExpMap).find(k => k.toLowerCase() === expCode.toLowerCase())
          const expData = dataKey ? studentExpMap[dataKey] : null

          return {
            code: expCode,
            description: exp.description || exp.title || expCode,
            score: expData ? expData.score : null,
            badge: expData ? expData.badge : getSBARLevelBadge(null),
            trend: expData ? expData.trend : 'steady',
            isProvisional: expData ? expData.isProvisional : false,
            evaluations: expData ? (expData.evaluations || []) : [],
            isAssessed: !!(expData && expData.evaluations && expData.evaluations.length > 0)
          }
        })

        return {
          ...unit,
          expectations: enrichedExpectations
        }
      })
    }

    // Filter units based on scope
    if (scope === 'assessed') {
      return processedUnits
        .map(unit => ({
          ...unit,
          expectations: unit.expectations.filter(e => e.isAssessed)
        }))
        .filter(unit => unit.expectations.length > 0)
    }

    return processedUnits.filter(unit => unit.expectations.length > 0)
  }

  /**
   * Helper to format evaluation dates for timeline pills
   */
  function formatEvaluationDate(d) {
    if (!d) return ''
    return formatLocalDisplay(d)
  }

  return {
    createDefaultSBarConfig,
    getStudentOverallSBarBadge,
    prepareSBarReportData,
    formatEvaluationDate
  }
}
