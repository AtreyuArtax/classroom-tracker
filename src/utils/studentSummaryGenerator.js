/**
 * src/utils/studentSummaryGenerator.js
 *
 * Pure, deterministic summary narrative generator for a student's standing in a course.
 * Designed for the Student360 dossier, parent updates, and teacher briefings.
 * 
 * Complies with:
 * - Zero external/database dependencies
 * - Pure functions with safe fallback handling
 * - Canadian spelling enforcement
 * - Dual audience modes: 'parent' (constructive, shareable) and 'teacher' (comprehensive briefing)
 */

import { getAchievementLevel, getPronounTokens } from './commentGenerator.js'
import { enforceCanadianSpelling } from './canadianSpelling.js'
import { isFormativeAssessment } from './gradeCalc.js'
import { formatLostTime } from './studentRiskMath.js'
import { detectStudentAttendancePatterns, getActiveClassDates } from './attendancePatterns.js'

/**
 * Generates an executive summary narrative for a student.
 * 
 * @param {Object} data
 * @param {Object} data.student
 * @param {number|null} [data.overallGrade]
 * @param {number|null} [data.weightedMedian]
 * @param {boolean} [data.isSbar]
 * @param {string|number|null} [data.sbarOverallLevel]
 * @param {string} [data.className]
 * @param {Array<Object>} [data.categories]
 * @param {Array<Object>} [data.assessments]
 * @param {Object} [data.stats]
 * @param {Object} [data.attendanceAverages]
 * @param {number} [data.washroomCount]
 * @param {number} [data.redirectCount]
 * @param {Array<Object>} [data.events]
 * @param {Object|null} [data.learningSkillsRecord]
 * 
 * @param {Object} [options]
 * @param {'parent'|'teacher'} [options.audience='parent']
 * @param {'preferred'|'name-only'} [options.pronounMode='preferred']
 * 
 * @returns {Object} { headline, tone, badges, sections, plainText }
 */
export function generateStudentCourseSummary(data = {}, options = {}) {
  const {
    student = {},
    overallGrade = null,
    weightedMedian = null,
    isSbar = false,
    sbarOverallLevel = null,
    className = '',
    categories = [],
    assessments = [],
    stats = {},
    attendanceAverages = {},
    washroomCount = 0,
    redirectCount = 0,
    events = [],
    learningSkillsRecord = null
  } = data

  const audience = options.audience || 'parent'
  const pronounMode = options.pronounMode || 'preferred'
  const tokens = getPronounTokens(student, pronounMode)
  const name = tokens.name || 'The student'

  // 1. Core Metrics & Pre-calculations
  const hasGrade = overallGrade !== null && !isNaN(overallGrade)
  const levelObj = hasGrade ? getAchievementLevel(overallGrade) : null
  const roundedGrade = hasGrade ? Math.round(overallGrade) : null
  const roundedMedian = (weightedMedian !== null && !isNaN(weightedMedian)) ? Math.round(weightedMedian) : null

  const absences = stats.absences || 0
  const lates = stats.lates || 0
  const testDayAbsences = stats.testDayAbsences || 0
  const attendanceRate = stats.attendanceRate != null ? Math.round(stats.attendanceRate) : null

  // Summative & Non-excluded assessments
  const activeAssessments = assessments.filter(a => a && !a.excluded)
  const summativeAssessments = activeAssessments.filter(a => !isFormativeAssessment(a))
  const missingAssessments = activeAssessments.filter(a => Boolean(a.missing))
  const missingCount = missingAssessments.length

  const multipleAttemptAssessments = activeAssessments.filter(a => Array.isArray(a.attempts) && a.attempts.length > 1)
  const retestCount = multipleAttemptAssessments.length

  // Recent momentum
  const gradedSummatives = summativeAssessments
    .filter(a => a.score != null && !isNaN(a.score) && a.maxPoints > 0)
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))

  let momentum = 'steady'
  let momentumDiff = 0
  if (gradedSummatives.length >= 4) {
    const recent = gradedSummatives.slice(-3)
    const earlier = gradedSummatives.slice(0, -3)
    const recentAvg = recent.reduce((sum, a) => sum + (a.score / a.maxPoints) * 100, 0) / recent.length
    const earlierAvg = earlier.reduce((sum, a) => sum + (a.score / a.maxPoints) * 100, 0) / earlier.length
    momentumDiff = Math.round(recentAvg - earlierAvg)

    if (momentumDiff >= 5) momentum = 'improving'
    else if (momentumDiff <= -5) momentum = 'slipping'
  }

  // Attendance Patterns
  const activeDates = getActiveClassDates(events)
  const patternResult = detectStudentAttendancePatterns(student.studentId || '', events, activeDates)
  const detectedPatterns = patternResult?.patterns || []

  // 2. Determine Tone, Headline, & Badges
  let tone = 'neutral'
  if (
    (hasGrade && roundedGrade < 60) ||
    absences >= 6 ||
    missingCount >= 3 ||
    testDayAbsences >= 2
  ) {
    tone = 'danger'
  } else if (
    (hasGrade && roundedGrade < 70) ||
    absences >= 3 ||
    missingCount >= 1 ||
    lates >= 4
  ) {
    tone = 'warning'
  } else if (
    (hasGrade && roundedGrade >= 80) &&
    absences <= 2 &&
    missingCount === 0
  ) {
    tone = 'positive'
  }

  // Badges
  const badges = []
  if (hasGrade) {
    badges.push({
      label: `${roundedGrade}% · ${levelObj?.key ? 'Level ' + levelObj.key : ''}`.trim(),
      tone: roundedGrade >= 80 ? 'positive' : roundedGrade >= 70 ? 'neutral' : roundedGrade >= 60 ? 'warning' : 'danger'
    })
  } else if (isSbar && sbarOverallLevel) {
    badges.push({ label: `Level ${sbarOverallLevel}`, tone: 'neutral' })
  }

  if (momentum === 'improving') {
    badges.push({ label: `Trending Up (+${momentumDiff}%)`, tone: 'positive' })
  } else if (momentum === 'slipping') {
    badges.push({ label: `Recent Dip (${momentumDiff}%)`, tone: 'warning' })
  }

  if (missingCount > 0) {
    badges.push({ label: `${missingCount} Missing Task${missingCount !== 1 ? 's' : ''}`, tone: 'danger' })
  } else if (gradedSummatives.length >= 3) {
    badges.push({ label: 'All Tasks Submitted', tone: 'positive' })
  }

  if (absences >= 4) {
    badges.push({ label: `${absences} Absences`, tone: 'warning' })
  } else if (absences > 0 && absences < 4) {
    badges.push({ label: `${absences} Absence${absences !== 1 ? 's' : ''}`, tone: 'neutral' })
  } else if (absences === 0 && lates === 0 && events.length > 5) {
    badges.push({ label: 'Perfect Attendance', tone: 'positive' })
  }

  if (lates >= 4) {
    badges.push({ label: `${lates} Lates`, tone: 'warning' })
  }

  // Headline
  let headline = ''
  if (hasGrade) {
    const levelKey = levelObj?.key ? `Level ${levelObj.key}` : ''
    const standingStr = `${name} is currently achieving ${roundedGrade}%${levelKey ? ` (${levelKey})` : ''}`
    const attendStr = absences > 0 ? `${absences} absence${absences !== 1 ? 's' : ''}` : 'steady attendance'
    const missStr = missingCount > 0 ? `${missingCount} missing` : 'all work in'
    headline = `${standingStr} · ${attendStr} · ${missStr}.`
  } else if (isSbar && sbarOverallLevel) {
    headline = `${name} is currently working at Level ${sbarOverallLevel} with ongoing skill progression.`
  } else {
    headline = `${name} is actively participating in coursework with formal evaluations underway.`
  }

  // 3. Build Narrative Sections
  const sections = []

  // --- Section 1: Academic Progress ---
  const academicSentences = []
  const courseReference = className ? `in ${className}` : 'in this course'

  if (hasGrade) {
    const levelDescriptor = levelObj?.label ? `(${levelObj.label})` : `(Level ${levelObj?.key})`
    let baseSentence = `${name} is currently holding an overall grade of ${roundedGrade}% ${levelDescriptor} ${courseReference}.`
    if (roundedMedian !== null && Math.abs(roundedMedian - roundedGrade) >= 4) {
      if (roundedMedian > roundedGrade) {
        baseSentence += ` Notably, ${tokens.possessive} weighted median is higher at ${roundedMedian}%, indicating that one or two lower scores are weighing down an otherwise stronger baseline.`
      } else {
        baseSentence += ` With a weighted median of ${roundedMedian}%, ${tokens.possessive} typical performance aligns closely across course evaluations.`
      }
    }
    academicSentences.push(baseSentence)

    if (momentum === 'improving') {
      academicSentences.push(`${tokens.subject} demonstrates positive upward momentum, gaining approximately ${momentumDiff}% over recent evaluations compared to early tasks.`)
    } else if (momentum === 'slipping') {
      academicSentences.push(`Recent tasks reflect a slight decline (${momentumDiff}% compared to earlier baselines), suggesting a need to revisit foundational concepts.`)
    }
  } else if (isSbar && sbarOverallLevel) {
    academicSentences.push(`${name} is presently demonstrating Level ${sbarOverallLevel} overall mastery across curriculum expectations ${courseReference}.`)
  } else {
    academicSentences.push(`${name} is working through introductory curriculum units ${courseReference}, with formative feedback supporting initial skill acquisition.`)
  }

  // Category & Task Highlights
  const scoredCategories = categories
    .filter(c => c && c.score != null && !isNaN(c.score))
    .sort((a, b) => b.score - a.score)

  if (scoredCategories.length >= 2) {
    const topCat = scoredCategories[0]
    const lowestCat = scoredCategories[scoredCategories.length - 1]
    const spread = Math.round(topCat.score - lowestCat.score)

    const topWeightNote = topCat.weight === 0 ? ' (0% weight)' : ''
    const lowWeightNote = lowestCat.weight === 0 ? ' (0% weight)' : ''

    const possessiveCap = tokens.possessiveCapital || (tokens.possessive.charAt(0).toUpperCase() + tokens.possessive.slice(1))
    let catSentence = `${possessiveCap} strongest category performance is in ${topCat.name}${topWeightNote} (${Math.round(topCat.score)}%).`
    if (spread >= 10) {
      catSentence += ` Conversely, ${lowestCat.name}${lowWeightNote} (${Math.round(lowestCat.score)}%) represents the primary curriculum area for ongoing development.`
    }
    academicSentences.push(catSentence)
  }

  // Best task highlight
  if (gradedSummatives.length > 0) {
    const bestTask = [...gradedSummatives].sort((a, b) => (b.score / b.maxPoints) - (a.score / a.maxPoints))[0]
    const bestPct = Math.round((bestTask.score / bestTask.maxPoints) * 100)
    if (bestPct >= 75) {
      const possessiveCap = tokens.possessiveCapital || (tokens.possessive.charAt(0).toUpperCase() + tokens.possessive.slice(1))
      academicSentences.push(`${possessiveCap} standout result was on "${bestTask.name}", earning ${bestPct}%.`)
    }
  }

  // Completion & Retests
  if (missingCount > 0) {
    academicSentences.push(`Currently, there ${missingCount === 1 ? 'is 1 evaluation' : `are ${missingCount} evaluations`} marked missing; completing and submitting ${missingCount === 1 ? 'this item' : 'these items'} will immediately support an accurate reflection of ${tokens.possessive} ability.`)
  } else if (gradedSummatives.length >= 3) {
    academicSentences.push(`${tokens.subject} has maintained 100% submission consistency across all scheduled course evaluations.`)
  }

  if (retestCount > 0) {
    academicSentences.push(`${tokens.subject} has shown commendable initiative by utilizing second-chance attempts and revision opportunities on ${retestCount} task${retestCount !== 1 ? 's' : ''}.`)
  }

  sections.push({
    id: 'academic',
    title: 'Academic Progress',
    text: enforceCanadianSpelling(academicSentences.join(' '))
  })

  // --- Section 2: Presence & Classroom Habits ---
  const habitsSentences = []
  const totalLatesMins = attendanceAverages.latesTotal || 0
  const totalWashMins = attendanceAverages.washroomTotal || 0
  const lostInstructional = totalLatesMins + totalWashMins

  // Format clean human durations without redundant "lost" or "missed" words
  const formatDurationClean = (mins) => {
    const raw = formatLostTime(mins)
    return raw.replace(/\s*lost\s*$/i, '').trim()
  }

  if (absences === 0 && lates === 0 && washroomCount <= 2) {
    habitsSentences.push(`${name} has demonstrated exemplary attendance and engaged presence with zero recorded absences or lates.`)
  } else {
    const attendParts = []
    if (absences > 0) attendParts.push(`${absences} absence${absences !== 1 ? 's' : ''}`)
    if (lates > 0) {
      const lateStr = `${lates} late arrival${lates !== 1 ? 's' : ''}${totalLatesMins > 0 ? ` (${formatDurationClean(totalLatesMins)} missed)` : ''}`
      attendParts.push(lateStr)
    }

    if (attendParts.length > 0) {
      const presenceStr = attendanceRate != null ? ` (${attendanceRate}% attendance rate)` : ''
      habitsSentences.push(`To date, ${name} has recorded ${attendParts.join(' and ')}${presenceStr}.`)
    }

    if (washroomCount >= 4 && totalWashMins >= 25) {
      habitsSentences.push(`Additionally, ${tokens.subjectLower} has stepped out of class ${washroomCount} times, totaling ${formatDurationClean(totalWashMins)} of missed instruction.`)
    }
  }

  // Attendance pattern notes
  const clusterPattern = detectedPatterns.find(p => p.type === 'day_of_week_cluster')
  const consecPattern = detectedPatterns.find(p => p.type === 'consecutive_absences')
  const lateStreakPattern = detectedPatterns.find(p => p.type === 'consecutive_lates')

  if (clusterPattern) {
    habitsSentences.push(`Absences have shown a recurring trend on ${clusterPattern.dayName}s (${clusterPattern.count} missed).`)
  }
  if (consecPattern && consecPattern.streak >= 3) {
    habitsSentences.push(`Attendance records include an extended absence stretch of ${consecPattern.streak} consecutive school days.`)
  }
  if (lateStreakPattern && lateStreakPattern.streak >= 3) {
    habitsSentences.push(`Punctuality has been impacted by a recent streak of ${lateStreakPattern.streak} consecutive late arrivals.`)
  }

  // Learning Skills summary
  if (learningSkillsRecord?.teacherEval) {
    const evals = learningSkillsRecord.teacherEval
    const skills = [
      { key: 'resp', name: 'Responsibility' },
      { key: 'org', name: 'Organization' },
      { key: 'indw', name: 'Independent Work' },
      { key: 'coll', name: 'Collaboration' },
      { key: 'init', name: 'Initiative' },
      { key: 'self', name: 'Self-Regulation' }
    ]

    const strong = skills.filter(s => evals[s.key] === 'E' || evals[s.key] === 'G')
    const needsWork = skills.filter(s => evals[s.key] === 'S' || evals[s.key] === 'N')

    if (strong.length > 0) {
      const strongNames = strong.map(s => `${s.name} (${evals[s.key]})`).slice(0, 2).join(' and ')
      habitsSentences.push(`In classroom learning habits, ${tokens.subjectLower} demonstrates solid ${strongNames}.`)
    }
    if (needsWork.length > 0) {
      const workNames = needsWork.map(s => `${s.name} (${evals[s.key]})`).slice(0, 2).join(' and ')
      habitsSentences.push(`Ongoing focus should be placed on strengthening ${workNames}.`)
    }
  }

  sections.push({
    id: 'habits',
    title: 'Presence & Classroom Habits',
    text: enforceCanadianSpelling(habitsSentences.join(' '))
  })

  // --- Section 3: Recommended Focus ---
  const focusSentences = []
  if (missingCount > 0) {
    focusSentences.push(`Immediate priority: Submit the ${missingCount} outstanding evaluation${missingCount !== 1 ? 's' : ''} to recover lost credit opportunities.`)
  }

  // Attendance & Punctuality Focus (Calibrated to Academic Standing)
  if (hasGrade && roundedGrade >= 85) {
    if (absences >= 4) {
      focusSentences.push(`Given ${tokens.possessive} strong academic standing, ensuring ${tokens.subjectLower} proactively touches base after absences to verify missed lesson content or lab work will keep ${tokens.possessive} progress seamless.`)
    } else if (lates >= 4) {
      focusSentences.push(`Arriving promptly for class starts will ensure ${tokens.subjectLower} catches essential introductory demonstrations and instructions.`)
    }
  } else {
    if (lates >= 4 && absences >= 4) {
      focusSentences.push(`Maximizing in-class instructional minutes and minimizing late arrivals will ensure ${tokens.subjectLower} does not miss essential lesson pacing.`)
    } else if (lates >= 4) {
      focusSentences.push(`Improving punctuality and minimizing late arrivals will ensure ${tokens.subjectLower} is present for essential opening instructions.`)
    } else if (absences >= 4) {
      focusSentences.push(`Prioritizing regular attendance will ensure ${tokens.subjectLower} does not miss essential lesson pacing and hands-on activities.`)
    } else if (lostInstructional >= 60) {
      focusSentences.push(`Maximizing in-class instructional minutes will help ${tokens.subjectLower} stay fully aligned with course pacing.`)
    }
  }

  if (scoredCategories.length >= 2) {
    const lowestCat = scoredCategories[scoredCategories.length - 1]
    if (lowestCat.score < 70) {
      const is0Pct = lowestCat.weight === 0
      if (is0Pct) {
        focusSentences.push(`Academic next step: Use feedback on ${lowestCat.name} tasks to identify and bridge concept gaps prior to major summative evaluations.`)
      } else {
        focusSentences.push(`Academic next step: Review rubric expectations for ${lowestCat.name} tasks and consult with the teacher for targeted feedback prior to submission.`)
      }
    }
  }

  if (focusSentences.length === 0) {
    if (hasGrade && roundedGrade >= 80) {
      focusSentences.push(`Maintain current disciplined study habits, and seek extension opportunities to apply concepts in advanced problem-solving contexts.`)
    } else {
      focusSentences.push(`Continue engaging consistently with lesson activities, participate actively in class discussions, and ask clarifying questions early.`)
    }
  }

  sections.push({
    id: 'focus',
    title: 'Recommended Focus',
    text: enforceCanadianSpelling(focusSentences.join(' '))
  })

  // --- Section 4: Internal Teacher Briefing (Only when audience === 'teacher') ---
  if (audience === 'teacher') {
    const teacherBullets = []

    if (testDayAbsences > 0) {
      teacherBullets.push(`⚠️ ${testDayAbsences} absence${testDayAbsences !== 1 ? 's' : ''} occurred on scheduled test/assessment days.`)
    }
    if (redirectCount > 0) {
      teacherBullets.push(`Behavior: ${redirectCount} redirect event${redirectCount !== 1 ? 's' : ''} recorded during this term.`)
    }
    if (student.hasIEP) {
      const accCount = Array.isArray(student.accommodations) ? student.accommodations.length : 0
      teacherBullets.push(`IEP on file (${student.iepType || 'Standard'}) · ${accCount} active accommodation${accCount !== 1 ? 's' : ''}.`)
    }

    // Learning skills self vs teacher gap
    if (learningSkillsRecord?.studentEval && learningSkillsRecord?.teacherEval) {
      const sEval = learningSkillsRecord.studentEval
      const tEval = learningSkillsRecord.teacherEval
      const rank = { E: 4, G: 3, S: 2, N: 1 }
      const gaps = []

      for (const [key, tRating] of Object.entries(tEval)) {
        const sRating = sEval[key]
        if (sRating && tRating && rank[sRating] - rank[tRating] >= 2) {
          gaps.push(`${key.toUpperCase()} (Self: ${sRating} vs Teacher: ${tRating})`)
        }
      }
      if (gaps.length > 0) {
        teacherBullets.push(`Perception gap in self-evaluation: ${gaps.join(', ')}.`)
      }
    }

    if (student.generalNote) {
      teacherBullets.push(`Teacher note: "${student.generalNote}"`)
    }

    const qualitativeNotes = events.filter(e => e && e.code === 'ac' && !e.superseded)
    if (qualitativeNotes.length > 0) {
      teacherBullets.push(`${qualitativeNotes.length} qualitative observation/conversation record${qualitativeNotes.length !== 1 ? 's' : ''} logged.`)
    }

    if (teacherBullets.length > 0) {
      sections.push({
        id: 'teacher',
        title: 'Internal Teacher Briefing',
        text: teacherBullets.join('\n')
      })
    }
  }

  // 4. Plain Text Generation for Clipboard Copy
  const plainTextParts = []
  plainTextParts.push(`STUDENT COURSE SUMMARY: ${name.toUpperCase()} ${className ? `(${className})` : ''}`)
  plainTextParts.push(`Standing: ${headline}`)
  plainTextParts.push('')

  sections.forEach(sec => {
    plainTextParts.push(`${sec.title.toUpperCase()}:`)
    plainTextParts.push(sec.text)
    plainTextParts.push('')
  })

  const plainText = plainTextParts.join('\n').trim()

  return {
    headline: enforceCanadianSpelling(headline),
    tone,
    badges,
    sections,
    plainText
  }
}
