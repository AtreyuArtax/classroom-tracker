/**
 * src/db/gradebook/gradeCalcSBAR.js
 *
 * Dedicated Standards-Based Assessment & Reporting (SBAR / SBGR) Math Engine.
 * Implements Decaying Average, Most Recent, Level 1-4 mappings, and Expectation Mastery calculations.
 */

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
 * Computes Expectation Mastery for a class across all students and curriculum expectations.
 *
 * @param {Object} classRecord
 * @param {Array<Object>} assessments
 * @param {Object} gradeMap
 * @param {string} [algorithm='decaying_average']
 * @returns {Object} { [studentId]: { [expectationCode]: { score, badge, trend, evaluations } } }
 */
export function calculateSBARExpectationMastery(classRecord, assessments, gradeMap, algorithm = 'decaying_average') {
  if (!classRecord?.students || !assessments || !gradeMap) return {}

  const masteryMap = {}

  Object.keys(classRecord.students).forEach(studentId => {
    if (classRecord.students[studentId].archived) return
    masteryMap[studentId] = {}
  })

  // Map expectation codes to assessments that evaluate them
  const expectationEvaluations = {}

  assessments.forEach(ast => {
    const expCodes = ast.expectationIds || (ast.expectationId ? [ast.expectationId] : [])
    if (!expCodes.length) return

    expCodes.forEach(code => {
      if (!expectationEvaluations[code]) expectationEvaluations[code] = []
      expectationEvaluations[code].push(ast)
    })
  })

  // Calculate mastery per expectation for each student
  Object.keys(masteryMap).forEach(studentId => {
    Object.keys(expectationEvaluations).forEach(expCode => {
      const astList = [...expectationEvaluations[expCode]].sort((a, b) => new Date(a.date) - new Date(b.date))
      const scores = []
      const evaluations = []

      astList.forEach(ast => {
        const rawGrade = gradeMap[ast.assessmentId]
        const grade = (rawGrade && rawGrade[studentId]) ? rawGrade[studentId] : rawGrade
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
          scores.push(percentage)
          evaluations.push({
            assessmentId: ast.assessmentId,
            name: ast.name,
            date: ast.date,
            score: percentage,
            badge: getSBARLevelBadge(percentage)
          })
        }
      })

      if (scores.length > 0) {
        let finalScore = null
        if (algorithm === 'most_recent') {
          const recent = scores.slice(-3)
          finalScore = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
        } else if (algorithm === 'highest') {
          finalScore = Math.max(...scores)
        } else {
          finalScore = calculateDecayingAverage(scores, 0.65)
        }

        // Calculate growth trend (improving / steady / declining)
        let trend = 'steady'
        if (scores.length >= 2) {
          const delta = scores[scores.length - 1] - scores[0]
          if (delta >= 5) trend = 'improving'
          else if (delta <= -5) trend = 'declining'
        }

        masteryMap[studentId][expCode] = {
          score: finalScore,
          badge: getSBARLevelBadge(finalScore),
          trend,
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
export function calculateSBARStudentOverallMastery(studentId, classRecord, assessments, gradeMap, algorithm = 'decaying_average') {
  if (!studentId || !classRecord || !assessments || !gradeMap) return null
  const masteryMap = calculateSBARExpectationMastery(classRecord, assessments, gradeMap, algorithm)
  const studentExpMap = masteryMap[studentId] || {}
  const scores = Object.values(studentExpMap).map(e => e.score).filter(s => s != null && !isNaN(s))
  if (scores.length === 0) return null
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return Math.round(avg)
}
