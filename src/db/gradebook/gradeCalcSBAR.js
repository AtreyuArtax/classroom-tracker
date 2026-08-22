/**
 * src/db/gradebook/gradeCalcSBAR.js
 *
 * Dedicated Standards-Based Assessment & Reporting (SBAR / SBGR) Math Engine.
 * Implements Decaying Average, Most Recent, Level 1-4 mappings, and Expectation Mastery calculations.
 */
import { isCohortMatch } from './gradeCalc.js'

/**
 * Calculates a Decaying Average over a chronologically sorted array of score percentages (0..100).
 * Default weight for newest score is 65% (0.65).
 *
 * @param {Array<number>} scores - Scores sorted from oldest to newest.
 * @param {number} [weightNewest=0.65] - Weight given to the newest evaluation.
 * @returns {number|null} Calculated mastery percentage (0..100) or null if empty.
 */
export function calculateDecayingAverage(scores, weightNewest = 0.65) {
  if (!scores || scores.length === 0) return null
  if (scores.length === 1) return scores[0]

  let currentMastery = scores[0]
  for (let i = 1; i < scores.length; i++) {
    currentMastery = (weightNewest * scores[i]) + ((1 - weightNewest) * currentMastery)
  }

  return Math.round(currentMastery * 10) / 10
}

/**
 * Converts a numerical percentage (0..100) or rubric score into an SBAR Level Badge object.
 *
 * @param {number|null} pct
 * @returns {{ level: string, label: string, color: string, levelNum: number }}
 */
export function getSBARLevelBadge(pct) {
  if (pct == null || isNaN(pct)) {
    return { level: '—', label: 'Not Assessed', color: 'var(--text-secondary)', levelNum: 0 }
  }

  const num = Number(pct)

  if (num >= 95) return { level: 'L4+', label: 'Level 4+', color: '#16a34a', levelNum: 4.3 }
  if (num >= 87) return { level: 'L4',  label: 'Level 4',  color: '#22c55e', levelNum: 4.0 }
  if (num >= 80) return { level: 'L4-', label: 'Level 4-', color: '#4ade80', levelNum: 3.7 }

  if (num >= 77) return { level: 'L3+', label: 'Level 3+', color: '#2563eb', levelNum: 3.3 }
  if (num >= 73) return { level: 'L3',  label: 'Level 3',  color: '#3b82f6', levelNum: 3.0 }
  if (num >= 70) return { level: 'L3-', label: 'Level 3-', color: '#60a5fa', levelNum: 2.7 }

  if (num >= 67) return { level: 'L2+', label: 'Level 2+', color: '#d97706', levelNum: 2.3 }
  if (num >= 63) return { level: 'L2',  label: 'Level 2',  color: '#f59e0b', levelNum: 2.0 }
  if (num >= 60) return { level: 'L2-', label: 'Level 2-', color: '#fbbf24', levelNum: 1.7 }

  if (num >= 57) return { level: 'L1+', label: 'Level 1+', color: '#dc2626', levelNum: 1.3 }
  if (num >= 53) return { level: 'L1',  label: 'Level 1',  color: '#ef4444', levelNum: 1.0 }
  if (num >= 50) return { level: 'L1-', label: 'Level 1-', color: '#f87171', levelNum: 0.7 }

  return { level: 'R', label: 'Remediation Needed', color: '#991b1b', levelNum: 0.3 }
}

/**
 * Calculates Power Law (Marzano Trajectory) model over chronologically sorted score percentages.
 * Projects true current mastery using log-log regression.
 *
 * @param {Array<number>} scores - Scores sorted from oldest to newest.
 * @returns {number|null}
 */
export function calculatePowerLaw(scores) {
  if (!scores || scores.length === 0) return null
  if (scores.length === 1) return scores[0]

  const safeScores = scores.map(s => Math.max(1, Math.min(100, s)))
  const n = safeScores.length

  const logX = []
  const logY = []
  for (let i = 0; i < n; i++) {
    logX.push(Math.log(i + 1))
    logY.push(Math.log(safeScores[i]))
  }

  const meanLogX = logX.reduce((a, b) => a + b, 0) / n
  const meanLogY = logY.reduce((a, b) => a + b, 0) / n

  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (logX[i] - meanLogX) * (logY[i] - meanLogY)
    den += Math.pow(logX[i] - meanLogX, 2)
  }

  if (den === 0) return safeScores[safeScores.length - 1]

  const B = num / den
  const logA = meanLogY - B * meanLogX

  const projectedLogY = logA + B * Math.log(n)
  const projectedY = Math.exp(projectedLogY)

  return Math.round(Math.max(0, Math.min(100, projectedY)) * 10) / 10
}

/**
 * Calculates Mode (Most Consistent) rubric level score.
 * Finds the most frequent SBAR rubric level across attempts.
 *
 * @param {Array<number>} scores - Scores sorted from oldest to newest.
 * @returns {number|null}
 */
export function calculateMode(scores) {
  if (!scores || scores.length === 0) return null
  if (scores.length === 1) return scores[0]

  const counts = new Map()
  scores.forEach(s => {
    const key = getSBARLevelBadge(s).level
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  let maxCount = 0
  let modeLevelKey = null

  for (let i = scores.length - 1; i >= 0; i--) {
    const key = getSBARLevelBadge(scores[i]).level
    const cnt = counts.get(key)
    if (cnt > maxCount) {
      maxCount = cnt
      modeLevelKey = key
    }
  }

  const modeScores = scores.filter(s => getSBARLevelBadge(s).level === modeLevelKey)
  const avgModeScore = modeScores.reduce((a, b) => a + b, 0) / modeScores.length
  return Math.round(avgModeScore * 10) / 10
}

/**
 * Computes Expectation Mastery for a class across all students and curriculum expectations.
 *
 * @param {Object} classRecord
 * @param {Array<Object>} assessments
 * @param {Object} gradeMap
 * @param {string} [algorithm='decaying_average']
 * @returns {Object} { [studentId]: { [expectationCode]: { score, badge, trend, isProvisional, evaluations } } }
 */
export function calculateSBARExpectationMastery(classRecord, assessments, gradeMap, algorithm = 'decaying_average', events = []) {
  if (!classRecord?.students || !assessments || !gradeMap) return {}

  const masteryMap = {}

  Object.keys(classRecord.students).forEach(studentId => {
    if (classRecord.students[studentId].archived) return
    masteryMap[studentId] = {}
  })

  // Map expectation codes to assessments that evaluate them
  const allClassExps = [
    ...(classRecord.expectations || []),
    ...((classRecord.gradebookUnits || []).flatMap(u => u.expectations || []))
  ]
  const validExpSet = (allClassExps.length > 0)
    ? new Set(allClassExps.map(e => String(e.code || e.expectationId).toLowerCase()))
    : null

  const expectationEvaluations = {}

  assessments.forEach(ast => {
    const expCodes = ast.expectationIds || (ast.expectationId ? [ast.expectationId] : [])
    if (!expCodes.length) return

    expCodes.forEach(code => {
      const codeStr = String(code).toLowerCase()
      if (validExpSet && !validExpSet.has(codeStr)) return

      if (!expectationEvaluations[code]) expectationEvaluations[code] = []
      expectationEvaluations[code].push(ast)
    })
  })

  // Map qualitative radial events linked to specific expectations
  const radialEvaluations = {}
  if (Array.isArray(events) && events.length > 0) {
    events.forEach(evt => {
      if (!evt.expectationId || !evt.acOutcome) return
      const codeStr = String(evt.expectationId).toLowerCase()
      if (validExpSet && !validExpSet.has(codeStr)) return

      let percentage = null
      if (evt.acOutcome === 'demonstrates_understanding') percentage = 90
      else if (evt.acOutcome === 'inconclusive') percentage = 65
      else if (evt.acOutcome === 'gap_confirmed') percentage = 55
      else if (evt.acOutcome === 'remediation_required') percentage = 35

      if (percentage !== null) {
        if (!radialEvaluations[evt.expectationId]) radialEvaluations[evt.expectationId] = []
        radialEvaluations[evt.expectationId].push({
          studentId: String(evt.studentId),
          eventId: evt.eventId,
          name: `Radial Check-in (${evt.acType === 'observation' ? 'Observation' : 'Conversation'})`,
          date: evt.timestamp,
          score: percentage,
          type: 'formative',
          isRadial: true,
          badge: getSBARLevelBadge(percentage)
        })
      }
    })
  }

  const allExpCodes = new Set([...Object.keys(expectationEvaluations), ...Object.keys(radialEvaluations)])

  // Calculate mastery per expectation for each student
  Object.keys(masteryMap).forEach(studentId => {
    allExpCodes.forEach(expCode => {
      const astList = expectationEvaluations[expCode] ? [...expectationEvaluations[expCode]] : []
      const evaluations = []

      astList.forEach(ast => {
        if (ast.target === 'individual' && String(ast.targetStudentId) !== String(studentId)) return

        const st = classRecord.students?.[studentId]
        const isElem = classRecord.classType === 'elementary'
        const targetTag = isElem ? (ast.gradeLevel || ast.targetCourseCode) : (ast.targetCourseCode || ast.gradeLevel)
        const studentCohort = isElem 
          ? (st?.accommodations?.modifiedSubjectGrades?.[classRecord.activeSubjectId] || st?.gradeLevel)
          : st?.courseCode

        if (!isCohortMatch(targetTag, studentCohort)) return

        const rawGrade = gradeMap[ast.assessmentId]
        const grade = (rawGrade && (rawGrade.gradeId !== undefined || rawGrade.assessmentId !== undefined))
          ? rawGrade
          : (rawGrade ? rawGrade[studentId] : null)
        if (!grade || grade.excluded || grade.missing) return

        let percentage = null
        if (grade.expectationScores && grade.expectationScores[expCode] != null) {
          percentage = Number(grade.expectationScores[expCode])
        } else if (grade.masteryLevel != null) {
          percentage = Number(grade.masteryLevel)
        } else if (grade.resolvedScore != null && ast.totalPoints > 0) {
          percentage = (grade.resolvedScore / ast.totalPoints) * 100
        }

        if (percentage != null) {
          const type = (ast.assessmentType === 'formative' || ast.type === 'formative' || ast.isFormative) ? 'formative' : 'summative'
          evaluations.push({
            assessmentId: ast.assessmentId,
            name: ast.name,
            date: ast.date,
            score: percentage,
            type,
            isRadial: false,
            badge: getSBARLevelBadge(percentage)
          })
        }
      })

      // Merge radial evaluations for this student & expectation
      const studentRadials = radialEvaluations[expCode] 
        ? radialEvaluations[expCode].filter(r => String(r.studentId) === String(studentId))
        : []

      studentRadials.forEach(rEvt => {
        const dateDay = rEvt.date ? rEvt.date.split('T')[0] : null
        // Same-day tie-breaker: formal assessment on the exact same date takes precedence
        const hasFormalSameDay = evaluations.some(e => !e.isRadial && e.date && e.date.split('T')[0] === dateDay)
        if (!hasFormalSameDay) {
          evaluations.push({
            assessmentId: `radial-${rEvt.eventId}`,
            name: rEvt.name,
            date: rEvt.date,
            score: rEvt.score,
            type: 'formative',
            isRadial: true,
            badge: rEvt.badge
          })
        }
      })

      // Chronological sort
      evaluations.sort((a, b) => new Date(a.date) - new Date(b.date))

      if (evaluations.length > 0) {
        // Formative vs Summative Rule:
        // If summative evidence exists, calculate ONLY from summative evidence.
        // Otherwise, calculate provisionally from formative evidence.
        const summativeEvals = evaluations.filter(e => e.type === 'summative')
        const hasSummative = summativeEvals.length > 0
        const activeEvals = hasSummative ? summativeEvals : evaluations
        const scoresToCalculate = activeEvals.map(e => e.score)

        let finalScore = null
        if (algorithm === 'power_law') {
          finalScore = calculatePowerLaw(scoresToCalculate)
        } else if (algorithm === 'mode') {
          finalScore = calculateMode(scoresToCalculate)
        } else if (algorithm === 'most_recent') {
          const recent = scoresToCalculate.slice(-3)
          finalScore = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
        } else if (algorithm === 'highest') {
          finalScore = Math.max(...scoresToCalculate)
        } else {
          finalScore = calculateDecayingAverage(scoresToCalculate, 0.65)
        }

        // Calculate growth trend (improving / steady / declining) using all chronological evaluations
        const allScores = evaluations.map(e => e.score)
        let trend = 'steady'
        if (allScores.length >= 2) {
          const delta = allScores[allScores.length - 1] - allScores[0]
          if (delta >= 5) trend = 'improving'
          else if (delta <= -5) trend = 'declining'
        }

        masteryMap[studentId][expCode] = {
          score: finalScore,
          badge: getSBARLevelBadge(finalScore),
          trend,
          isProvisional: !hasSummative,
          evaluations
        }
      }
    })
  })

  return masteryMap
}

/**
 * Calculates the overall course SBAR mastery score (percentage 0..100) for a student
 * by taking the average across all evaluated curriculum expectations.
 */
export function calculateSBARStudentOverallMastery(studentId, classRecord, assessments, gradeMap, algorithm = 'decaying_average', events = []) {
  if (!studentId || !classRecord || !assessments || !gradeMap) return null
  const activeAlgorithm = algorithm || classRecord.sbarAlgorithm || 'decaying_average'
  const shouldIncludeRadial = classRecord.includeRadialInSbar !== false // default true for SBAR
  const eventsToPass = shouldIncludeRadial ? events : []
  const masteryMap = calculateSBARExpectationMastery(classRecord, assessments, gradeMap, activeAlgorithm, eventsToPass)
  const studentExpMap = masteryMap[studentId] || {}
  const scores = Object.values(studentExpMap).map(e => e.score).filter(s => s != null && !isNaN(s))
  if (scores.length === 0) return null
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return Math.round(avg)
}
