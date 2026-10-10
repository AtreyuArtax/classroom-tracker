/**
 * src/utils/commentGenerator.js
 *
 * Deterministic report card comment generator for Ontario curriculum and universal grading.
 * Compliant with Ontario's Growing Success framework:
 *   [Strength + Specific Task Evidence] + [Learning Skills / Work Habits] + [Actionable Next Step]
 *
 * Supports:
 *  - Strict secondary SIS character budget (target <= 400 characters, configurable limit)
 *  - Expanded elementary narrative mode (target ~800-1200 characters)
 *  - Graceful fallback cascade: SBAR Expectations -> Category Strengths (K/T/C/A) -> Holistic Level
 *  - Pronoun modes: 'preferred' (he/she/they), 'name-only' (uses first name, avoids pronouns), 'roster'
 *  - Combinatorial variations: 4+ unique stylistic phrasings per level with deterministic rerolling
 *
 * Pure utility function: no database imports, no side-effects, 100% unit-testable.
 */

// ─── Achievement Level Descriptors (Growing Success) ─────────────────────────

export const ACHIEVEMENT_LEVELS = {
  LEVEL_4_PLUS: { key: '4+', minPercent: 95, label: 'Level 4+ (Exceptional)', adjective: 'exceptional', adverb: 'exceptionally well' },
  LEVEL_4:      { key: '4',  minPercent: 80, label: 'Level 4 (Thorough)',     adjective: 'thorough',    adverb: 'consistently well' },
  LEVEL_3:      { key: '3',  minPercent: 70, label: 'Level 3 (Considerable)', adjective: 'considerable',adverb: 'competently' },
  LEVEL_2:      { key: '2',  minPercent: 60, label: 'Level 2 (Developing)',   adjective: 'developing',  adverb: 'with emerging consistency' },
  LEVEL_1:      { key: '1',  minPercent: 50, label: 'Level 1 (Limited)',      adjective: 'emerging',    adverb: 'with regular guidance' },
  LEVEL_R:      { key: 'R',  minPercent: 0,  label: 'Below Level 1 (Needs Improvement)', adjective: 'inconsistent', adverb: 'with directed support' },
}

/**
 * Maps a percentage (0-100) or letter/level string to an achievement level object.
 * @param {number|string} mark
 * @returns {typeof ACHIEVEMENT_LEVELS.LEVEL_3}
 */
export function getAchievementLevel(mark) {
  if (typeof mark === 'number' && !isNaN(mark)) {
    if (mark >= 95) return ACHIEVEMENT_LEVELS.LEVEL_4_PLUS
    if (mark >= 80) return ACHIEVEMENT_LEVELS.LEVEL_4
    if (mark >= 70) return ACHIEVEMENT_LEVELS.LEVEL_3
    if (mark >= 60) return ACHIEVEMENT_LEVELS.LEVEL_2
    if (mark >= 50) return ACHIEVEMENT_LEVELS.LEVEL_1
    return ACHIEVEMENT_LEVELS.LEVEL_R
  }

  const str = String(mark || '').trim().toUpperCase()
  if (str.startsWith('4+') || str === 'A+') return ACHIEVEMENT_LEVELS.LEVEL_4_PLUS
  if (str.startsWith('4') || str.startsWith('A')) return ACHIEVEMENT_LEVELS.LEVEL_4
  if (str.startsWith('3') || str.startsWith('B')) return ACHIEVEMENT_LEVELS.LEVEL_3
  if (str.startsWith('2') || str.startsWith('C')) return ACHIEVEMENT_LEVELS.LEVEL_2
  if (str.startsWith('1') || str.startsWith('D')) return ACHIEVEMENT_LEVELS.LEVEL_1
  return ACHIEVEMENT_LEVELS.LEVEL_3 // safe default
}

// ─── Pronoun Normalization ───────────────────────────────────────────────────

/**
 * Generates pronoun / name replacement tokens for a student.
 * @param {Object} student
 * @param {'preferred'|'name-only'|'roster'} pronounMode
 * @returns {{ name: string, subject: string, subjectLower: string, object: string, possessive: string, isPlural: boolean }}
 */
export function getPronounTokens(student, pronounMode = 'preferred') {
  const firstName = (student?.preferredName || student?.firstName || 'The student').trim()

  if (pronounMode === 'name-only') {
    return {
      name: firstName,
      subject: firstName,
      subjectLower: firstName,
      object: firstName,
      possessive: `${firstName}'s`,
      isPlural: false,
    }
  }

  const raw = String(student?.pronouns || '').toLowerCase()

  if (raw.includes('she') || raw.includes('her')) {
    return {
      name: firstName,
      subject: 'She',
      subjectLower: 'she',
      object: 'her',
      possessive: 'her',
      isPlural: false,
    }
  }

  if (raw.includes('he') || raw.includes('him')) {
    return {
      name: firstName,
      subject: 'He',
      subjectLower: 'he',
      object: 'him',
      possessive: 'his',
      isPlural: false,
    }
  }

  // Default to neutral / they
  if (raw.includes('they') || raw.includes('them') || pronounMode === 'preferred') {
    return {
      name: firstName,
      subject: 'They',
      subjectLower: 'they',
      object: 'them',
      possessive: 'their',
      isPlural: true,
    }
  }

  // Fallback to name-only if no pronouns detected
  return {
    name: firstName,
    subject: firstName,
    subjectLower: firstName,
    object: firstName,
    possessive: `${firstName}'s`,
    isPlural: false,
  }
}

// ─── Sentence Matrix (Ontario Growing Success Bank) ──────────────────────────

/**
 * Returns strength sentence variations based on achievement level and specific task.
 */
function getStrengthPhrases(tokens, level, taskName, variant = 0) {
  const cleanTask = taskName ? taskName.trim() : 'course learning goals'
  const isGeneric = !taskName

  const templates = {
    '4+': [
      `${tokens.name} demonstrates an exceptional grasp of course concepts, excelling at ${cleanTask}.`,
      `${tokens.name} consistently exhibits outstanding analytical skill, demonstrating mastery when ${makeGerund(cleanTask)}.`,
      `Throughout the term, ${tokens.name} has produced exemplary work, demonstrating deep insight in ${cleanTask}.`,
      `${tokens.name} applies critical thinking skills with high effectiveness, particularly on ${cleanTask}.`
    ],
    '4': [
      `${tokens.name} demonstrates a thorough grasp of course concepts, excelling at ${cleanTask}.`,
      `In class, ${tokens.name} exhibits strong problem-solving skills, particularly on ${cleanTask}.`,
      `${tokens.name} has achieved a high standard this term, demonstrating consistent strength in ${cleanTask}.`,
      `${tokens.name} applies learned skills with considerable precision, showing confidence when ${makeGerund(cleanTask)}.`
    ],
    '3': [
      `${tokens.name} demonstrates a solid and competent understanding of course material, especially in ${cleanTask}.`,
      `${tokens.name} applies core concepts effectively, producing good quality work on ${cleanTask}.`,
      `During classroom evaluations, ${tokens.name} has shown consistent achievement when ${makeGerund(cleanTask)}.`,
      `${tokens.name} demonstrates good comprehension of foundational topics, performing reliably on ${cleanTask}.`
    ],
    '2': [
      `${tokens.name} demonstrates developing understanding of course concepts, with emerging skills in ${cleanTask}.`,
      `${tokens.name} is making steady progress in foundational skills, showing promise when ${makeGerund(cleanTask)}.`,
      `With guided practice, ${tokens.name} demonstrates some understanding of key concepts in ${cleanTask}.`,
      `${tokens.name} has shown developing capability when working on ${cleanTask}, though consistency varies.`
    ],
    '1': [
      `${tokens.name} demonstrates limited understanding of course expectations, requiring frequent assistance with ${cleanTask}.`,
      `With ongoing teacher support, ${tokens.name} is working to develop foundational skills in ${cleanTask}.`,
      `${tokens.name} has demonstrated emerging familiarity with basic concepts, but finds ${cleanTask} challenging.`,
      `${tokens.name} requires structured guidance to apply fundamental concepts effectively on ${cleanTask}.`
    ],
    'R': [
      `${tokens.name} is experiencing significant difficulty meeting curriculum expectations in ${cleanTask}.`,
      `${tokens.name} requires intensive support to grasp fundamental principles, especially regarding ${cleanTask}.`,
      `At this time, ${tokens.name} has not yet demonstrated basic competency in ${cleanTask}.`,
      `${tokens.name} requires substantial intervention and review to achieve credit expectations in ${cleanTask}.`
    ]
  }

  const list = templates[level.key] || templates['3']
  const idx = Math.abs(variant) % list.length
  return list[idx]
}

/**
 * Returns learning skills sentence variations.
 */
function getWorkHabitPhrases(tokens, learningSkills = {}, variant = 0) {
  // Check for highlighted skills (E or G ratings)
  const skills = learningSkills || {}
  const collab = skills.collaboration || ''
  const init = skills.initiative || ''
  const org = skills.organization || ''
  const ind = skills.independentWork || ''
  const resp = skills.responsibility || ''

  const isStrong = [collab, init, org, ind, resp].some(s => s === 'E' || s === 'G')
  const needsWork = [resp, org, ind].some(s => s === 'N' || s === 'S')

  if (isStrong && !needsWork) {
    const list = [
      `${tokens.subject} ${tokens.isPlural ? 'work' : 'works'} diligently in class and ${tokens.isPlural ? 'collaborate' : 'collaborates'} constructively with peers.`,
      `${tokens.subject} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} strong initiative and consistently ${tokens.isPlural ? 'use' : 'uses'} class time effectively.`,
      `${tokens.subject} ${tokens.isPlural ? 'are' : 'is'} a self-directed learner who approaches independent tasks with focused dedication.`,
      `${tokens.subject} actively ${tokens.isPlural ? 'participate' : 'participates'} in discussions and ${tokens.isPlural ? 'manage' : 'manages'} course responsibilities responsibly.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (needsWork) {
    const list = [
      `${tokens.subject} ${tokens.isPlural ? 'are' : 'is'} encouraged to stay focused during independent work time to keep pace with deadlines.`,
      `${tokens.subject} would benefit from maintaining a detailed schedule and using class time more productively.`,
      `Developing more consistent organizational habits and self-advocating when questions arise will support ${tokens.possessive} progress.`,
      `Focusing on regular assignment completion and minimizing classroom distractions will foster greater success.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  // Neutral / Balanced
  const list = [
    `${tokens.subject} ${tokens.isPlural ? 'participate' : 'participates'} cooperatively in class activities and ${tokens.isPlural ? 'complete' : 'completes'} assigned tasks.`,
    `${tokens.subject} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} satisfactory work habits and generally ${tokens.isPlural ? 'manage' : 'manages'} class time appropriately.`,
    `${tokens.subject} ${tokens.isPlural ? 'work' : 'works'} well in collaborative groups and ${tokens.isPlural ? 'show' : 'shows'} positive engagement.`,
    `${tokens.subject} ${tokens.isPlural ? 'are' : 'is'} respectful in class and ${tokens.isPlural ? 'strive' : 'strives'} to complete independent work.`
  ]
  return list[Math.abs(variant) % list.length]
}

/**
 * Returns actionable next step variations based on level and specific growth task.
 */
function getNextStepPhrases(tokens, level, growthTaskName, variant = 0) {
  const cleanTask = growthTaskName ? growthTaskName.trim() : 'multi-step problem solving'

  const templates = {
    '4+': [
      `Next step: ${tokens.name} is encouraged to explore advanced extension questions to deepen ${tokens.possessive} conceptual synthesis.`,
      `To extend learning, ${tokens.subjectLower} should seek opportunities to articulate reasoning and justify complex conclusions.`,
      `Next step: Tackling novel, non-routine problems will further enhance ${tokens.possessive} critical insight.`,
      `For ongoing growth, ${tokens.name} should continue challenging ${tokens.object} with independent enrichment inquiries.`
    ],
    '4': [
      `Next step: ${tokens.name} is encouraged to focus on clear written justifications when solving ${cleanTask}.`,
      `To reach the highest standard, ${tokens.subjectLower} should review feedback and refine details when completing ${cleanTask}.`,
      `Next step: Continuing to practice multi-step problem solving on ${cleanTask} will further solidify mastery.`,
      `For future assessments, ${tokens.name} should ensure thorough explanations accompany all multi-step solutions.`
    ],
    '3': [
      `Next step: ${tokens.name} should practice multi-step problem solving on ${cleanTask} before unit assessments.`,
      `To advance to Level 4, ${tokens.subjectLower} is encouraged to review notes daily and seek clarification on ${cleanTask}.`,
      `Next step: ${tokens.name} would benefit from demonstrating complete steps and clear units on ${cleanTask}.`,
      `For continued improvement, consistent completion of homework practice related to ${cleanTask} is recommended.`
    ],
    '2': [
      `Next step: ${tokens.name} is encouraged to seek timely extra help and practice foundational skills in ${cleanTask}.`,
      `To improve achievement, ${tokens.subjectLower} should review teacher feedback carefully and complete all practice on ${cleanTask}.`,
      `Next step: Regular review of core terminology and dedicated study for quizzes will support ${tokens.possessive} progress in ${cleanTask}.`,
      `${tokens.name} should focus on organizing study materials and asking clarifying questions during lessons on ${cleanTask}.`
    ],
    '1': [
      `Next step: ${tokens.name} must attend extra help regularly and ensure all outstanding practice on ${cleanTask} is completed.`,
      `To achieve credit expectations, ${tokens.subjectLower} must submit all assignments promptly and review core concepts in ${cleanTask}.`,
      `Next step: Daily review of lesson notes and active participation in class review sessions on ${cleanTask} is essential.`,
      `${tokens.name} is strongly advised to utilize peer study resources and teacher office hours to reinforce ${cleanTask}.`
    ],
    'R': [
      `Immediate next step: ${tokens.name} must meet with the teacher to establish an intervention plan for ${cleanTask}.`,
      `To work toward credit recovery, ${tokens.subjectLower} must submit missing evidence and attend structured remediation on ${cleanTask}.`,
      `Next step: Regular attendance, active class engagement, and completion of foundational catch-up tasks in ${cleanTask} are urgent priorities.`,
      `A parent-teacher consultation is recommended to support ${tokens.name} with consistent homework completion and review of ${cleanTask}.`
    ]
  }

  const list = templates[level.key] || templates['3']
  const idx = Math.abs(variant) % list.length
  return list[idx]
}

// ─── Helpers & Sanitizers ───────────────────────────────────────────────────

/**
 * Normalizes and cleans an assessment or expectation title for parent-friendly sentences.
 * Strips prefixes like "Unit 1 - ", "Ch. 2: ", trailing dates "(Oct 12)", and cleans all-caps.
 */
export function sanitizeTaskTitle(rawTitle) {
  if (!rawTitle) return ''
  let t = String(rawTitle).trim()

  // 1. Strip common prefixes: "Unit 1 - ", "Unit 2: ", "Ch. 3 - ", "Module A: "
  t = t.replace(/^(unit|ch\.|chapter|module|section|strand)\s*\d+[\s:–—-]+/i, '')

  // 2. Strip trailing parenthetical dates or marks: " (Oct 12)", " [10 pts]"
  t = t.replace(/\s*[\(\[][^)\]]*(oct|nov|dec|jan|feb|mar|apr|may|jun|pts|marks|\d{1,2}\/\d{1,2})[^)\]]*[\)\]]/gi, '')

  // 3. Fix all-caps titles: "FORCES LAB" -> "Forces Lab"
  if (t.length > 3 && t === t.toUpperCase() && /[A-Z]/.test(t)) {
    t = t.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
  }

  return t.trim()
}

/**
 * Checks if a title is too generic (e.g. "Quiz 1", "Lab 2", "Test 3").
 */
function isGenericTitle(title) {
  if (!title) return true
  const lower = title.trim().toLowerCase()
  return /^(quiz|test|lab|assignment|task|eval|unit test|check)\s*#?\d*$/i.test(lower)
}

/**
 * Category Normalizer & Non-Academic Blacklist.
 */
const CATEGORY_NORMALIZER = {
  labs: 'laboratory inquiries and experimental work',
  lab: 'laboratory inquiries and experimental work',
  tests: 'summative unit evaluations',
  test: 'summative unit evaluations',
  exam: 'the comprehensive course evaluation',
  'final exam': 'the comprehensive course evaluation',
  quizzes: 'periodic concept check-ins and quizzes',
  quiz: 'periodic concept check-ins and quizzes',
  thinking: 'critical thinking and analytical problem solving',
  inquiry: 'scientific inquiry and critical thinking',
  'thinking & inquiry': 'critical thinking and analytical inquiry',
  communication: 'written and technical communication',
  application: 'practical application of learned principles',
  knowledge: 'understanding of fundamental course knowledge',
  'knowledge & understanding': 'understanding of foundational core concepts'
}

const NON_ACADEMIC_CATEGORIES = new Set([
  'attendance',
  'participation',
  'homework',
  'admin',
  'checklist',
  'attendance & participation',
  'behavior'
])

/**
 * Converts a task title into a smooth parent-friendly gerund phrase.
 */
function makeGerund(task) {
  if (!task) return 'completing assignments'
  const t = sanitizeTaskTitle(task)
  const lower = t.toLowerCase()
  if (lower.startsWith('solving') || lower.startsWith('analyzing') || lower.startsWith('calculating') || lower.startsWith('creating') || lower.startsWith('applying') || lower.startsWith('modeling')) {
    return t
  }
  if (lower.includes('lab') || lower.includes('inquiry') || lower.includes('investigation')) {
    return lower.startsWith('the ') ? `conducting ${t}` : `conducting the ${t}`
  }
  if (lower.includes('test') || lower.includes('quiz') || lower.includes('exam')) {
    return lower.startsWith('the ') ? `completing ${t}` : `completing the ${t}`
  }
  return lower.startsWith('the ') ? `working on ${t}` : `working on the ${t}`
}

/**
 * Extracts best strength and growth evidence from available gradebook data.
 */
export function extractEvidenceFromGrades(gradeData = {}) {
  const { sbarExpectations = [], assessments = [], categories = [] } = gradeData

  let strengthTask = null
  let strengthSource = 'holistic'
  let growthTask = null
  let growthSource = 'holistic'

  // 1. Try SBAR Expectations first
  if (Array.isArray(sbarExpectations) && sbarExpectations.length > 0) {
    const sorted = [...sbarExpectations].filter(e => e.average != null || e.masteryLevel != null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))

    if (sorted.length > 0) {
      const top = sorted[0]
      const rawTop = top.title || top.description || (top.code ? `Expectation ${top.code}` : null)
      strengthTask = sanitizeTaskTitle(rawTop)
      strengthSource = 'sbar'

      const low = sorted[sorted.length - 1]
      if (sorted.length > 1 && low && low !== top) {
        const rawLow = low.title || low.description || (low.code ? `Expectation ${low.code}` : null)
        growthTask = sanitizeTaskTitle(rawLow)
        growthSource = 'sbar'
      }
    }
  }

  // 2. Fall back to Individual Assessments if SBAR not present
  if (!strengthTask && Array.isArray(assessments) && assessments.length > 0) {
    const valid = assessments.filter(a => typeof a.scorePercent === 'number')
      .sort((a, b) => b.scorePercent - a.scorePercent)

    if (valid.length > 0) {
      const topAss = valid[0]
      // If assessment name is generic ("Lab 1") and description is rich, use description!
      const topName = (isGenericTitle(topAss.name) && topAss.description)
        ? topAss.description
        : topAss.name
      strengthTask = sanitizeTaskTitle(topName)
      strengthSource = 'assessment'

      const lowAss = valid[valid.length - 1]
      if (valid.length > 1 && lowAss && lowAss.name !== valid[0].name) {
        const lowName = (isGenericTitle(lowAss.name) && lowAss.description)
          ? lowAss.description
          : lowAss.name
        growthTask = sanitizeTaskTitle(lowName)
        growthSource = 'assessment'
      }
    }
  }

  // 3. Fall back to Categories (filtering non-academic ones & normalizing)
  if (!strengthTask && Array.isArray(categories) && categories.length > 0) {
    const validCats = categories.filter(c => {
      if (typeof c.average !== 'number') return false
      const nameLower = (c.name || '').trim().toLowerCase()
      return !NON_ACADEMIC_CATEGORIES.has(nameLower)
    }).sort((a, b) => b.average - a.average)

    if (validCats.length > 0) {
      const topCat = validCats[0]
      const catLower = (topCat.name || '').trim().toLowerCase()
      strengthTask = CATEGORY_NORMALIZER[catLower] || topCat.name
      strengthSource = 'category'

      const lowCat = validCats[validCats.length - 1]
      if (validCats.length > 1 && lowCat) {
        const lowCatLower = (lowCat.name || '').trim().toLowerCase()
        growthTask = CATEGORY_NORMALIZER[lowCatLower] || lowCat.name
        growthSource = 'category'
      }
    }
  }

  return { strengthTask, strengthSource, growthTask, growthSource }
}

// ─── Main Public Generator Function ──────────────────────────────────────────

/**
 * Generates a complete, compliant report card comment for a student.
 *
 * @param {Object} params
 * @param {Object} params.student            Student record ({ firstName, preferredName, pronouns, ... })
 * @param {Object} [params.gradeData]          Grades object ({ percentage, level, assessments, sbarExpectations, categories })
 * @param {Object} [params.learningSkills]     Ontario Learning Skills ({ responsibility, organization, ... })
 * @param {Object} [params.options]            Configuration options
 * @param {'secondary'|'elementary'} [params.options.mode='secondary']
 * @param {number} [params.options.charLimit=400]
 * @param {'preferred'|'name-only'|'roster'} [params.options.pronounMode='preferred']
 * @param {string} [params.options.featuredStrength]  Manual override for featured strength task
 * @param {string} [params.options.featuredNextStep]  Manual override for featured next step task
 * @param {number|string} [params.options.variantSeed=0]  Seed for varying sentence phrasing
 * @param {boolean} [params.options.includeWorkHabits=true]
 *
 * @returns {{
 *   text: string,
 *   charCount: number,
 *   wordCount: number,
 *   isOverLimit: boolean,
 *   charLimit: number,
 *   achievementLevel: Object,
 *   strengthSource: string,
 *   growthSource: string,
 *   strengthTask: string,
 *   growthTask: string
 * }}
 */
export function generateReportComment({
  student = {},
  gradeData = {},
  learningSkills = {},
  options = {}
} = {}) {
  const {
    mode = 'secondary',
    charLimit = 400,
    pronounMode = 'preferred',
    featuredStrength = '',
    featuredNextStep = '',
    variantSeed = 0,
    includeWorkHabits = true
  } = options

  // 1. Determine level & pronoun tokens
  const level = getAchievementLevel(gradeData.level || gradeData.percentage)
  const tokens = getPronounTokens(student, pronounMode)

  // 2. Resolve specific evidence tasks
  const autoEvidence = extractEvidenceFromGrades(gradeData)
  const strengthTask = featuredStrength || autoEvidence.strengthTask || ''
  const growthTask = featuredNextStep || autoEvidence.growthTask || ''

  // Deterministic variant index
  let seedNum = typeof variantSeed === 'number' ? variantSeed : 0
  if (typeof variantSeed === 'string') {
    for (let i = 0; i < variantSeed.length; i++) seedNum += variantSeed.charCodeAt(i)
  }

  // 3. Assemble Sentences
  const sentence1 = getStrengthPhrases(tokens, level, strengthTask, seedNum)
  const sentence2 = includeWorkHabits ? getWorkHabitPhrases(tokens, learningSkills, seedNum + 1) : ''
  const sentence3 = getNextStepPhrases(tokens, level, growthTask, seedNum + 2)

  let fullComment = ''

  if (mode === 'elementary') {
    // Elementary: Structured two-paragraph narrative
    const para1 = [sentence1, sentence2].filter(Boolean).join(' ')
    const para2 = [
      sentence3,
      `Continued partnership between home and school will support ${tokens.name}'s ongoing learning.`
    ].join(' ')
    fullComment = `${para1}\n\n${para2}`
  } else {
    // Secondary: Strictly concise 3-sentence body within ~400 chars
    fullComment = [sentence1, sentence2, sentence3].filter(Boolean).join(' ')

    // If strictly over the character budget, attempt to produce a compact variant
    if (fullComment.length > charLimit) {
      const compactS1 = getStrengthPhrases(tokens, level, strengthTask, seedNum + 1)
      const compactS3 = getNextStepPhrases(tokens, level, growthTask, seedNum + 3)
      const compactCandidate = [compactS1, sentence2, compactS3].filter(Boolean).join(' ')
      if (compactCandidate.length <= charLimit) {
        fullComment = compactCandidate
      } else {
        // Drop sentence 2 if still exceeding limit to guarantee fitting in SIS box
        const emergency2Sentence = [compactS1, compactS3].join(' ')
        if (emergency2Sentence.length <= charLimit) {
          fullComment = emergency2Sentence
        }
      }
    }
  }

  const charCount = fullComment.length
  const wordCount = fullComment.trim().split(/\s+/).filter(Boolean).length

  return {
    text: fullComment,
    charCount,
    wordCount,
    isOverLimit: charCount > charLimit,
    charLimit,
    achievementLevel: level,
    strengthSource: featuredStrength ? 'manual' : autoEvidence.strengthSource,
    growthSource: featuredNextStep ? 'manual' : autoEvidence.growthSource,
    strengthTask,
    growthTask
  }
}
