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
 * Canonical SBAR rubric levels with percentage defaults, colors, and tier order.
 */
export const SBAR_LEVELS = [
  { code: 'L4+', label: 'Level 4+', shortLabel: '4+', pct: 96, color: '#16a34a', order: 13 },
  { code: 'L4',  label: 'Level 4',  shortLabel: '4',  pct: 88, color: '#22c55e', order: 12 },
  { code: 'L4-', label: 'Level 4-', shortLabel: '4-', pct: 82, color: '#4ade80', order: 11 },
  { code: 'L3+', label: 'Level 3+', shortLabel: '3+', pct: 78, color: '#2563eb', order: 10 },
  { code: 'L3',  label: 'Level 3',  shortLabel: '3',  pct: 75, color: '#3b82f6', order: 9 },
  { code: 'L3-', label: 'Level 3-', shortLabel: '3-', pct: 71, color: '#60a5fa', order: 8 },
  { code: 'L2+', label: 'Level 2+', shortLabel: '2+', pct: 68, color: '#d97706', order: 7 },
  { code: 'L2',  label: 'Level 2',  shortLabel: '2',  pct: 65, color: '#f59e0b', order: 6 },
  { code: 'L2-', label: 'Level 2-', shortLabel: '2-', pct: 61, color: '#fbbf24', order: 5 },
  { code: 'L1+', label: 'Level 1+', shortLabel: '1+', pct: 58, color: '#dc2626', order: 4 },
  { code: 'L1',  label: 'Level 1',  shortLabel: '1',  pct: 55, color: '#ef4444', order: 3 },
  { code: 'L1-', label: 'Level 1-', shortLabel: '1-', pct: 51, color: '#f87171', order: 2 },
  { code: 'R',   label: 'Remediation', shortLabel: 'R', pct: 45, color: '#991b1b', order: 1 }
]

/**
 * Resolves any professional judgment override for a student on a specific expectation.
 * Supports elementary subject-scoped keys (e.g. "elem_sub_math::B1.1") to prevent cross-subject bleed.
 *
 * @param {Object} student - Student record from classRecord.students[studentId]
 * @param {string} expCode - Expectation code (e.g. "B1.1")
 * @param {string|null} [subjectId] - Active elementary subject ID if applicable
 * @param {Array<Object>} [allClassExps] - All curriculum expectations for alias matching
 * @returns {Object|null} Normalized override { level, score, note, updatedAt, isOverridden: true }
 */
export function resolveStudentExpectationOverride(student, expCode, subjectId = null, allClassExps = []) {
  if (!student || !student.expectationOverrides || !expCode) return null

  const overrides = student.expectationOverrides
  const expCodeStr = String(expCode).trim()
  const expCodeLower = expCodeStr.toLowerCase()

  // 1. If subjectId is provided (elementary mode), check subject-scoped keys first
  if (subjectId) {
    const scopedKey = `${subjectId}::${expCodeStr}`
    if (overrides[scopedKey]) return normalizeOverride(overrides[scopedKey])

    const matchScoped = Object.keys(overrides).find(k => k.toLowerCase() === scopedKey.toLowerCase())
    if (matchScoped) return normalizeOverride(overrides[matchScoped])

    // Check alias by expectationId under this subject
    const matchedExp = allClassExps.find(e => 
      String(e.code || '').toLowerCase() === expCodeLower || 
      String(e.expectationId || '').toLowerCase() === expCodeLower
    )
    if (matchedExp && matchedExp.expectationId) {
      const scopedIdKey = `${subjectId}::${matchedExp.expectationId}`
      if (overrides[scopedIdKey]) return normalizeOverride(overrides[scopedIdKey])
      const matchScopedId = Object.keys(overrides).find(k => k.toLowerCase() === scopedIdKey.toLowerCase())
      if (matchScopedId) return normalizeOverride(overrides[matchScopedId])
    }

    // In elementary mode, only fall back to unscoped key if it doesn't contain a scope separator
    const unscopedDirect = overrides[expCodeStr]
    if (unscopedDirect) return normalizeOverride(unscopedDirect)
    const matchUnscoped = Object.keys(overrides).find(k => !k.includes('::') && k.toLowerCase() === expCodeLower)
    if (matchUnscoped) return normalizeOverride(overrides[matchUnscoped])
    return null
  }

  // 2. Standard / Secondary mode check (non-scoped)
  if (overrides[expCodeStr]) return normalizeOverride(overrides[expCodeStr])
  const matchDirect = Object.keys(overrides).find(k => !k.includes('::') && k.toLowerCase() === expCodeLower)
  if (matchDirect) return normalizeOverride(overrides[matchDirect])

  // Check alias by expectationId
  const matchedExp = allClassExps.find(e => 
    String(e.code || '').toLowerCase() === expCodeLower || 
    String(e.expectationId || '').toLowerCase() === expCodeLower
  )
  if (matchedExp) {
    const idStr = String(matchedExp.expectationId || '')
    if (idStr && overrides[idStr]) return normalizeOverride(overrides[idStr])
    const codeStr = String(matchedExp.code || '')
    if (codeStr && overrides[codeStr]) return normalizeOverride(overrides[codeStr])
  }

  return null
}

function normalizeOverride(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    const found = SBAR_LEVELS.find(l => 
      l.code.toUpperCase() === raw.toUpperCase() || 
      l.shortLabel.toUpperCase() === raw.toUpperCase()
    )
    return {
      level: found ? found.code : raw,
      score: found ? found.pct : 75,
      note: '',
      updatedAt: null,
      isOverridden: true
    }
  }
  if (typeof raw === 'number') {
    return {
      level: getSBARLevelBadge(raw).level,
      score: raw,
      note: '',
      updatedAt: null,
      isOverridden: true
    }
  }
  if (typeof raw === 'object') {
    const level = raw.level || getSBARLevelBadge(raw.score).level
    const found = SBAR_LEVELS.find(l => 
      l.code.toUpperCase() === String(level).toUpperCase() || 
      l.shortLabel.toUpperCase() === String(level).toUpperCase()
    )
    const score = raw.score != null && !isNaN(Number(raw.score))
      ? Number(raw.score)
      : (found ? found.pct : 75)
    return {
      level: found ? found.code : level,
      score,
      note: raw.note || '',
      updatedAt: raw.updatedAt || null,
      isOverridden: true
    }
  }
  return null
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
    ...(classRecord.curriculumExpectations || []),
    ...((classRecord.gradebookUnits || []).flatMap(u => u.expectations || []))
  ]
  if (classRecord.courseFrameworks) {
    Object.values(classRecord.courseFrameworks).forEach(fw => {
      if (fw?.gradebookUnits) {
        fw.gradebookUnits.forEach(u => {
          if (u.expectations) allClassExps.push(...u.expectations)
        })
      }
    })
  }
  // For un-scoped multi-subject elementary class records without activeSubjectId, include all subjects
  if (Array.isArray(classRecord.subjects) && !classRecord.activeSubjectId) {
    classRecord.subjects.forEach(sub => {
      if (sub.expectations) allClassExps.push(...sub.expectations)
      if (sub.gradebookUnits) {
        sub.gradebookUnits.forEach(u => {
          if (u.expectations) allClassExps.push(...u.expectations)
        })
      }
    })
  }

  const validExpSet = (allClassExps.length > 0)
    ? new Set(allClassExps.map(e => String(e.code || e.expectationId).toLowerCase()))
    : null

  const expectationEvaluations = {}

  // Filter assessments to active subject for elementary classes
  let scopedAssessments = assessments
  if (classRecord.classType === 'elementary' && classRecord.activeSubjectId) {
    const subId = classRecord.activeSubjectId
    const subUnits = new Set((classRecord.gradebookUnits || []).map(u => String(u.unitId)))
    const subExps = new Set((classRecord.expectations || []).map(e => String(e.code || e.expectationId).toLowerCase()))

    scopedAssessments = assessments.filter(a => {
      if (a.subjectId) return String(a.subjectId) === String(subId)
      if (a.unitId && subUnits.has(String(a.unitId))) return true
      const expIds = a.expectationIds || (a.expectationId ? [a.expectationId] : [])
      if (expIds.length > 0 && expIds.some(code => subExps.has(String(code).toLowerCase()))) return true
      if (!a.subjectId && !a.unitId && expIds.length === 0) {
        const firstSubId = classRecord.subjects?.[0]?.subjectId || classRecord.activeSubjectId || 'elem_sub_math'
        return String(subId) === String(firstSubId)
      }
      return false
    })
  }

  scopedAssessments.forEach(ast => {
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

  const isElementary = classRecord.classType === 'elementary'
  const activeSubId = isElementary ? (classRecord.activeSubjectId || null) : null

  // Ensure unassessed expectations that have student overrides are also evaluated
  Object.values(classRecord.students || {}).forEach(st => {
    if (st?.expectationOverrides) {
      Object.keys(st.expectationOverrides).forEach(k => {
        if (isElementary && activeSubId) {
          if (k.startsWith(`${activeSubId}::`)) {
            allExpCodes.add(k.slice(`${activeSubId}::`.length))
          } else if (!k.includes('::')) {
            allExpCodes.add(k)
          }
        } else if (!k.includes('::')) {
          allExpCodes.add(k)
        }
      })
    }
  })

  // Calculate mastery per expectation for each student
  Object.keys(masteryMap).forEach(studentId => {
    const student = classRecord.students?.[studentId]

    allExpCodes.forEach(expCode => {
      const astList = expectationEvaluations[expCode] ? [...expectationEvaluations[expCode]] : []
      const evaluations = []

      astList.forEach(ast => {
        if (ast.target === 'individual' && String(ast.targetStudentId) !== String(studentId)) return

        const st = student
        const isElem = classRecord.classType === 'elementary'
        const targetTag = isElem ? (ast.gradeLevel || ast.targetCourseCode) : (ast.targetCourseCode || ast.gradeLevel)
        const studentCohort = isElem 
          ? (st?.accommodations?.modifiedSubjectGrades?.[classRecord.activeSubjectId] || st?.gradeLevel)
          : st?.courseCode

        if (!isCohortMatch(targetTag, studentCohort)) return

        const rawGrade = gradeMap[ast.assessmentId] || gradeMap[String(ast.assessmentId)] || gradeMap[Number(ast.assessmentId)]
        const grade = (rawGrade && (rawGrade.gradeId !== undefined || (rawGrade.assessmentId !== undefined && rawGrade.studentId !== undefined)))
          ? (String(rawGrade.studentId) === String(studentId) ? rawGrade : null)
          : (rawGrade ? (rawGrade[studentId] || rawGrade[String(studentId)] || rawGrade[Number(studentId)]) : null)
        if (!grade || grade.excluded || grade.missing) return

        let percentage = null
        if (grade.expectationScores && typeof grade.expectationScores === 'object' && Object.keys(grade.expectationScores).length > 0) {
          const directVal = grade.expectationScores[expCode]
          if (directVal != null && directVal !== '' && !isNaN(Number(directVal))) {
            percentage = Number(directVal)
          } else {
            // Case-insensitive & code / UUID alias resolution
            const expCodeLower = String(expCode).toLowerCase()
            const matchingKey = Object.keys(grade.expectationScores).find(k => {
              if (String(k).toLowerCase() === expCodeLower) return true
              const matchedExp = allClassExps.find(e => 
                String(e.code || '').toLowerCase() === expCodeLower || 
                String(e.expectationId || '').toLowerCase() === expCodeLower
              )
              if (matchedExp) {
                const kLower = String(k).toLowerCase()
                return String(matchedExp.code || '').toLowerCase() === kLower || 
                       String(matchedExp.expectationId || '').toLowerCase() === kLower
              }
              return false
            })
            if (matchingKey != null) {
              const aliasVal = grade.expectationScores[matchingKey]
              if (aliasVal != null && aliasVal !== '' && !isNaN(Number(aliasVal))) {
                percentage = Number(aliasVal)
              }
            }
          }
        } else if ((!ast.expectationIds || ast.expectationIds.length <= 1) && grade.masteryLevel != null && grade.masteryLevel !== '' && !isNaN(Number(grade.masteryLevel))) {
          percentage = Number(grade.masteryLevel)
        } else if ((!ast.expectationIds || ast.expectationIds.length <= 1) && grade.resolvedScore != null && grade.resolvedScore !== '' && !isNaN(Number(grade.resolvedScore)) && ast.totalPoints > 0) {
          percentage = (Number(grade.resolvedScore) / ast.totalPoints) * 100
        }

        if (percentage != null && !isNaN(percentage)) {
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

      // Deterministic chronological sort with timestamp/ID tie-breakers
      evaluations.sort((a, b) => {
        const tA = new Date(a.date || a.createdAt || 0).getTime()
        const tB = new Date(b.date || b.createdAt || 0).getTime()
        if (tA !== tB) return tA - tB
        const cA = new Date(a.createdAt || 0).getTime()
        const cB = new Date(b.createdAt || 0).getTime()
        if (cA !== cB) return cA - cB
        return String(a.assessmentId || '').localeCompare(String(b.assessmentId || ''))
      })

      const override = resolveStudentExpectationOverride(student, expCode, activeSubId, allClassExps)

      const expDef = allClassExps.find(e => 
        String(e.code || '').toLowerCase() === String(expCode).toLowerCase() ||
        String(e.expectationId || '').toLowerCase() === String(expCode).toLowerCase()
      )
      const expWeight = (expDef?.weight != null && !isNaN(Number(expDef.weight))) ? Math.max(0, Number(expDef.weight)) : 1.0

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

        if (override) {
          masteryMap[studentId][expCode] = {
            score: override.score,
            badge: getSBARLevelBadge(override.score),
            weight: expWeight,
            trend,
            isProvisional: false,
            isOverridden: true,
            overrideLevel: override.level,
            calculatedScore: finalScore,
            calculatedBadge: getSBARLevelBadge(finalScore),
            overrideNote: override.note || '',
            overrideUpdatedAt: override.updatedAt || null,
            evaluations
          }
        } else {
          masteryMap[studentId][expCode] = {
            score: finalScore,
            badge: getSBARLevelBadge(finalScore),
            weight: expWeight,
            trend,
            isProvisional: !hasSummative,
            isOverridden: false,
            overrideLevel: null,
            calculatedScore: finalScore,
            calculatedBadge: getSBARLevelBadge(finalScore),
            overrideNote: '',
            overrideUpdatedAt: null,
            evaluations
          }
        }
      } else if (override) {
        masteryMap[studentId][expCode] = {
          score: override.score,
          badge: getSBARLevelBadge(override.score),
          weight: expWeight,
          trend: 'steady',
          isProvisional: false,
          isOverridden: true,
          overrideLevel: override.level,
          calculatedScore: null,
          calculatedBadge: null,
          overrideNote: override.note || '',
          overrideUpdatedAt: override.updatedAt || null,
          evaluations: []
        }
      }
    })
  })

  return masteryMap
}

/**
 * Calculates the overall course SBAR mastery score (percentage 0..100) for a student
 * taking into account relative expectation weight multipliers (e.g. 2.0x, 1.0x, 0.5x, 0x).
 */
export function calculateSBARStudentOverallMastery(studentId, classRecord, assessments, gradeMap, algorithm = 'decaying_average', events = [], masteryMapPreRef = null) {
  if (!studentId || !classRecord || !assessments || !gradeMap) return null
  const activeAlgorithm = algorithm || classRecord.sbarAlgorithm || 'decaying_average'
  const shouldIncludeRadial = classRecord.includeRadialInSbar !== false // default true for SBAR
  const eventsToPass = shouldIncludeRadial ? events : []
  const masteryMap = masteryMapPreRef || calculateSBARExpectationMastery(classRecord, assessments, gradeMap, activeAlgorithm, eventsToPass)
  const studentExpMap = masteryMap[studentId] || {}

  let weightedSum = 0
  let totalWeight = 0
  let evaluatedCount = 0

  for (const expData of Object.values(studentExpMap)) {
    if (expData?.score != null && !isNaN(expData.score)) {
      const w = (expData.weight != null && !isNaN(expData.weight)) ? Math.max(0, Number(expData.weight)) : 1.0
      // Expectations with weight 0 are treated as diagnostic/formative-only and excluded from course mastery
      if (w > 0) {
        weightedSum += expData.score * w
        totalWeight += w
        evaluatedCount++
      }
    }
  }

  if (evaluatedCount === 0 || totalWeight <= 0) return null
  return Math.round(weightedSum / totalWeight)
}
