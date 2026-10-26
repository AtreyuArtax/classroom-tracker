/**
 * src/utils/elementaryCommentGenerator.js
 *
 * Dedicated, deterministic comment generator for Ontario Elementary (K-8) report cards.
 * Tailored to:
 *  - SCDSB Character Budgets (1050 Science, 1200 Math/Language, 2600 Learning Skills, 600 History/Health, 300 Arts)
 *  - Elementary SBAR Expectation Mastery (Highest Mastery Strength, Developing Expectation Next Step)
 *  - Authentic Science Strands (Grade 8 Cells, Fluids, Systems, Water Systems)
 *  - Full 6 Learning Skills Synthesis (Responsibility, Organization, Independent Work, Collaboration, Initiative, Self-Regulation)
 *  - Three reporting periods: 'Progress Report' (Fall), 'Term 1' (Winter), 'Term 2' (Spring)
 */

import { getPronounTokens, getAchievementLevel } from './commentGenerator.js'
import { getScdsbCharacterLimit } from '../data/comments/scdsbCharacterLimits.js'
import { GRADE_8_SCIENCE_STRANDS, resolveScienceStrand } from '../data/comments/elementaryScienceBank.js'
import { GRADE_8_MATH_STRANDS, resolveMathStrand } from '../data/comments/elementaryMathBank.js'
import { GRADE_8_LANGUAGE_STRANDS, resolveLanguageStrand } from '../data/comments/elementaryLanguageBank.js'
import { GRADE_8_HISTORY_STRANDS, resolveHistoryStrand } from '../data/comments/elementaryHistoryBank.js'
import { GRADE_8_GEOGRAPHY_STRANDS, resolveGeographyStrand } from '../data/comments/elementaryGeographyBank.js'
import { LEARNING_SKILLS_BANK, LEARNING_SKILL_KEYS } from '../data/comments/learningSkillsCommentBank.js'
import { enforceCanadianSpelling, formatSubjectNameForComment } from './canadianSpelling.js'
import { condenseCurriculumExpectation } from './curriculumCompetencies.js'

export { formatSubjectNameForComment, enforceCanadianSpelling, condenseCurriculumExpectation }

// ─── Action Formatter for Next Steps ──────────────────────────────────────────

/**
 * Transforms an SBAR expectation or task description into a grammatically clean action
 * for Ontario report card Next Steps sentences (e.g. "solving fractions" -> "solve fractions").
 *
 * @param {string} raw
 * @returns {string}
 */
export function formatNextStepAction(raw = '') {
  if (!raw) return 'continue reviewing core concepts and practicing fundamental skills'
  let s = String(raw).trim()
    .replace(/^Next Steps:\s*/i, '')
    .replace(/^is encouraged to\s*/i, '')
    .replace(/^to\s+/i, '')
    .replace(/[.]+$/, '')
    .trim()

  // Map leading gerund to infinitive (e.g. "solving..." -> "solve...")
  const GERUND_TO_BASE = [
    [/^solving\b/i, 'solve'],
    [/^using\b/i, 'use'],
    [/^applying\b/i, 'apply'],
    [/^analyzing\b/i, 'analyze'],
    [/^explaining\b/i, 'explain'],
    [/^describing\b/i, 'describe'],
    [/^identifying\b/i, 'identify'],
    [/^calculating\b/i, 'calculate'],
    [/^determining\b/i, 'determine'],
    [/^modelling\b/i, 'model'],
    [/^evaluating\b/i, 'evaluate'],
    [/^investigating\b/i, 'investigate'],
    [/^constructing\b/i, 'construct'],
    [/^creating\b/i, 'create'],
    [/^practicing\b/i, 'practice'],
    [/^reviewing\b/i, 'review'],
    [/^integrating\b/i, 'integrate'],
    [/^communicating\b/i, 'communicate'],
    [/^representing\b/i, 'represent'],
    [/^organizing\b/i, 'organize'],
    [/^selecting\b/i, 'select'],
    [/^verifying\b/i, 'verify'],
    [/^conducting\b/i, 'conduct'],
    [/^comparing\b/i, 'compare'],
    [/^measuring\b/i, 'measure'],
    [/^estimating\b/i, 'estimate'],
    [/^exploring\b/i, 'explore'],
    [/^demonstrating\b/i, 'demonstrate'],
    [/^adding\b/i, 'add'],
    [/^subtracting\b/i, 'subtract'],
    [/^multiplying\b/i, 'multiply'],
    [/^dividing\b/i, 'divide'],
    [/^simplifying\b/i, 'simplify'],
    [/^converting\b/i, 'convert'],
    [/^composing\b/i, 'compose'],
    [/^decomposing\b/i, 'decompose'],
    [/^drafting\b/i, 'draft'],
    [/^editing\b/i, 'edit'],
    [/^revising\b/i, 'revise'],
    [/^reading\b/i, 'read'],
    [/^writing\b/i, 'write'],
    [/^drawing\b/i, 'draw'],
    [/^building\b/i, 'build'],
    [/^observing\b/i, 'observe'],
    [/^recording\b/i, 'record'],
    [/^testing\b/i, 'test'],
    [/^sorting\b/i, 'sort'],
    [/^classifying\b/i, 'classify'],
    [/^connecting\b/i, 'connect'],
    [/^interpreting\b/i, 'interpret'],
    [/^sharing\b/i, 'share']
  ]

  for (const [pattern, base] of GERUND_TO_BASE) {
    if (pattern.test(s)) {
      return s.replace(pattern, base)
    }
  }

  // If already starts with a common base action verb
  if (/^(solve|use|apply|analyze|explain|describe|identify|calculate|determine|model|evaluate|investigate|construct|create|practice|review|integrate|communicate|represent|organize|select|verify|conduct|compare|measure|estimate|explore|focus|develop|continue|add|subtract|multiply|divide|simplify|convert|compose|decompose|draft|edit|revise|read|write|draw|build|observe|record|test|sort|classify|connect|interpret|share)\b/i.test(s)) {
    return s
  }

  // If a noun phrase, prepend review and practice
  return `review and practice ${s}`
}

// ─── SBAR Expectation & Mastery Extractor ──────────────────────────────────────

function extractSbarStrengthsAndGrowth(gradeData = {}, fallbackStrength = '', fallbackGrowth = '', defaultSubject = '') {
  const sbarList = Array.isArray(gradeData.sbarExpectations) ? gradeData.sbarExpectations : []
  let autoStrengthExp = ''
  let autoStrengthLevel = null
  let autoGrowthExp = ''
  let autoGrowthLevel = null

  const mark = gradeData.percentage ?? gradeData.mark

  if (sbarList.length > 0) {
    const scored = [...sbarList].filter(e => e.average != null || e.masteryLevel != null || e.score != null)
      .sort((a, b) => {
        const scoreB = b.average ?? (b.score != null ? b.score * 25 : (b.masteryLevel != null ? Number(b.masteryLevel) * 25 : 0))
        const scoreA = a.average ?? (a.score != null ? a.score * 25 : (a.masteryLevel != null ? Number(a.masteryLevel) * 25 : 0))
        return scoreB - scoreA
      })

    if (scored.length > 0) {
      const top = scored[0]
      const rawTop = top.description || top.title || (top.code ? `Expectation ${top.code}` : '')
      autoStrengthExp = condenseCurriculumExpectation(rawTop)
      const topScore = top.average ?? (top.score != null ? top.score * 25 : (top.masteryLevel != null ? Number(top.masteryLevel) * 25 : mark))
      autoStrengthLevel = getAchievementLevel(top.masteryLevel || topScore)

      const low = scored[scored.length - 1]
      if (low && low !== top) {
        const rawLow = low.description || low.title || (low.code ? `Expectation ${low.code}` : '')
        autoGrowthExp = condenseCurriculumExpectation(rawLow)
        const lowScore = low.average ?? (low.score != null ? low.score * 25 : (low.masteryLevel != null ? Number(low.masteryLevel) * 25 : mark))
        autoGrowthLevel = getAchievementLevel(low.masteryLevel || lowScore)
      }
    } else {
      // Unscored expectations list fallback
      const first = sbarList[0]
      if (first) {
        autoStrengthExp = condenseCurriculumExpectation(first.description || first.title || first.code)
      }
      const last = sbarList[sbarList.length - 1]
      if (last && last !== first) {
        autoGrowthExp = condenseCurriculumExpectation(last.description || last.title || last.code)
      }
    }
  }

  const rawStrength = fallbackStrength || autoStrengthExp
  const rawGrowth = fallbackGrowth || autoGrowthExp

  const effectiveStrength = rawStrength ? condenseCurriculumExpectation(rawStrength) : ''
  const effectiveGrowth = rawGrowth ? condenseCurriculumExpectation(rawGrowth) : ''

  return {
    effectiveStrength,
    autoStrengthLevel,
    effectiveGrowth,
    autoGrowthLevel
  }
}

// ─── Helper Token Inserter ────────────────────────────────────────────────────

function fillTokens(template = '', tokens = {}, extra = {}) {
  if (!template) return ''
  let text = template

  if (tokens.isPlural) {
    const SINGULAR_TO_PLURAL_VERBS = {
      is: 'are',
      was: 'were',
      has: 'have',
      demonstrates: 'demonstrate',
      applies: 'apply',
      works: 'work',
      utilizes: 'utilize',
      articulates: 'articulate',
      integrates: 'integrate',
      writes: 'write',
      participates: 'participate',
      benefits: 'benefit',
      follows: 'follow',
      uses: 'use',
      makes: 'make',
      refers: 'refer',
      responds: 'respond',
      arrives: 'arrive',
      strives: 'strive',
      manages: 'manage',
      completes: 'complete',
      identifies: 'identify',
      evaluates: 'evaluate',
      solves: 'solve',
      compares: 'compare',
      creates: 'create',
      shows: 'show',
      explains: 'explain'
    }

    text = text.replace(/(\{subject\}|\{subjectLower\})\s+((?:[a-z]+ly\s+)?)([a-z]+)\b/gi, (match, subjTag, adv, verb) => {
      const lowerVerb = verb.toLowerCase()
      if (SINGULAR_TO_PLURAL_VERBS[lowerVerb]) {
        const pluralVerb = SINGULAR_TO_PLURAL_VERBS[lowerVerb]
        const pronoun = subjTag.toLowerCase() === '{subjectlower}' ? 'they' : 'They'
        return `${pronoun} ${adv || ''}${pluralVerb}`
      }
      return match
    })
  }

  const reflexive = tokens.isPlural ? 'themselves' : (tokens.object === 'her' ? 'herself' : 'himself')

  text = text
    .replace(/\{name\}/g, tokens.name || 'The student')
    .replace(/\{subject\}/g, tokens.subject || 'They')
    .replace(/\{subjectLower\}/g, tokens.subjectLower || 'they')
    .replace(/\{object\}/g, tokens.object || 'them')
    .replace(/\{possessive\}/g, tokens.possessive || 'their')
    .replace(/\{reflexive\}/g, reflexive)

  if (extra.project) {
    text = text.replace(/\{project\}/g, extra.project)
  }
  if (extra.expectation) {
    text = text.replace(/\{expectation\}/g, extra.expectation)
  }
  if (extra.topic) {
    text = text.replace(/\{topic\}/g, extra.topic)
  }

  // Capitalize start of sentence if replacement made it lowercase
  text = text.replace(/(^\s*|[.?!]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase())
  return text.trim()
}

// ─── Elementary Science Comment Generation ───────────────────────────────────

/**
 * Generates an authentic Ontario elementary science report card comment.
 */
export function generateElementaryScienceComment({
  student = {},
  gradeData = {},
  options = {}
} = {}) {
  const {
    strandCode = '',
    featuredStrength = '',
    featuredNextStep = '',
    featuredProject = '',
    variantSeed = 0,
    pronounMode = 'preferred',
    reportingPeriod = 'Term 1',
    charLimit = 1050
  } = options

  const mark = gradeData.percentage ?? gradeData.mark
  const level = getAchievementLevel(gradeData.level || mark)
  const tokens = getPronounTokens(student, pronounMode)

  const {
    effectiveStrength,
    autoStrengthLevel,
    effectiveGrowth
  } = extractSbarStrengthsAndGrowth(gradeData, featuredStrength, featuredNextStep, 'Science')

  // Resolve strand from explicit code or featured expectation
  const strand = resolveScienceStrand(strandCode || effectiveStrength || effectiveGrowth || 'B')
  const strengthLvl = autoStrengthLevel || level
  const levelBank = strand.levels[strengthLvl.key] || strand.levels['3']

  const seed = Math.abs(typeof variantSeed === 'number' ? variantSeed : 0)

  // 1. Concept Understanding Sentence
  const conceptTemplates = levelBank.conceptStems || []
  const conceptIdx = seed % (conceptTemplates.length || 1)
  let conceptSentence = fillTokens(conceptTemplates[conceptIdx] || '', tokens)
  if (effectiveStrength && !conceptSentence.toLowerCase().includes(effectiveStrength.toLowerCase())) {
    const connector = /^(using|applying|analyzing|investigating|identifying|explaining|modelling|assessing|conducting|evaluating)\b/i.test(effectiveStrength)
      ? 'when'
      : 'when investigating'
    conceptSentence = `${conceptSentence} ${tokens.name} demonstrated particular proficiency ${connector} ${effectiveStrength}.`
  }

  // 2. In-Class Investigation Sentence
  const investTemplates = levelBank.investigationStems || []
  const investIdx = (seed + 1) % (investTemplates.length || 1)
  const investSentence = fillTokens(investTemplates[investIdx] || '', tokens)

  // 3. STEM Communication / Inquiry Project Sentence
  const projectDefault = strand.researchProjects[seed % strand.researchProjects.length]
  const projectTopic = featuredProject || projectDefault
  const commTemplates = levelBank.communicationStems || []
  const commIdx = (seed + 2) % (commTemplates.length || 1)
  const commSentence = fillTokens(commTemplates[commIdx] || '', tokens, { project: projectTopic })

  // 4. Next Steps Sentences
  let nextStepSentence = ''
  if (effectiveGrowth) {
    const growthAction = formatNextStepAction(effectiveGrowth)
    nextStepSentence = `Next Steps: ${tokens.name} is encouraged to ${growthAction}.`
  } else {
    const nextStepTemplates = levelBank.nextSteps || []
    const nsIdx1 = seed % (nextStepTemplates.length || 1)
    const nsIdx2 = (seed + 1) % (nextStepTemplates.length || 1)
    const ns1 = fillTokens(nextStepTemplates[nsIdx1] || '', tokens)
    const ns2 = (nsIdx1 !== nsIdx2 && nextStepTemplates[nsIdx2]) ? fillTokens(nextStepTemplates[nsIdx2] || '', tokens) : ''
    nextStepSentence = [ns1, ns2].filter(Boolean).join(' ')
    if (!/^Next Steps:/i.test(nextStepSentence)) {
      nextStepSentence = `Next Steps: ${nextStepSentence}`
    }
  }

  // Assemble full comment
  let fullComment = [conceptSentence, investSentence, commSentence, nextStepSentence].filter(Boolean).join(' ')

  // If strictly over character limit, drop commSentence or compress next steps
  if (fullComment.length > charLimit) {
    fullComment = [conceptSentence, investSentence, nextStepSentence].filter(Boolean).join(' ')
  }
  if (fullComment.length > charLimit) {
    fullComment = [conceptSentence, nextStepSentence].filter(Boolean).join(' ')
  }

  fullComment = enforceCanadianSpelling(fullComment)

  return {
    text: fullComment,
    charCount: fullComment.length,
    wordCount: fullComment.trim().split(/\s+/).filter(Boolean).length,
    isOverLimit: fullComment.length > charLimit,
    charLimit,
    strandName: strand.name,
    achievementLevel: level
  }
}

// ─── Elementary Math Comment Generation ───────────────────────────────────────

/**
 * Generates an authentic Ontario elementary mathematics report card comment.
 * Strands: B (Number), C (Algebra), D (Data), E (Spatial Sense), F (Financial Literacy)
 */
export function generateElementaryMathComment({
  student = {},
  gradeData = {},
  options = {}
} = {}) {
  const {
    strandCode = '',
    featuredStrength = '',
    featuredNextStep = '',
    variantSeed = 0,
    pronounMode = 'preferred',
    reportingPeriod = 'Term 1',
    charLimit = 1200
  } = options

  const mark = gradeData.percentage ?? gradeData.mark
  const level = getAchievementLevel(gradeData.level || mark)
  const tokens = getPronounTokens(student, pronounMode)

  const {
    effectiveStrength,
    autoStrengthLevel,
    effectiveGrowth
  } = extractSbarStrengthsAndGrowth(gradeData, featuredStrength, featuredNextStep, 'Mathematics')

  const strand = resolveMathStrand(strandCode || effectiveStrength || effectiveGrowth || 'B')
  const strengthLvl = autoStrengthLevel || level
  const levelBank = strand.levels[strengthLvl.key] || strand.levels['3']
  const seed = Math.abs(typeof variantSeed === 'number' ? variantSeed : 0)

  // 1. Concept Understanding Sentence
  const conceptTemplates = levelBank.conceptStems || []
  const conceptIdx = seed % (conceptTemplates.length || 1)
  let conceptSentence = fillTokens(conceptTemplates[conceptIdx] || '', tokens, { topic: effectiveStrength, expectation: effectiveStrength })
  if (effectiveStrength && !conceptSentence.toLowerCase().includes(effectiveStrength.toLowerCase())) {
    const connector = /^(using|applying|solving|determining|calculating|modelling|representing)\b/i.test(effectiveStrength)
      ? 'when'
      : 'when working with'
    conceptSentence = `${conceptSentence} ${tokens.name} demonstrated particular proficiency ${connector} ${effectiveStrength}.`
  }

  // 2. Mathematical Procedure / Application Sentence
  const procTemplates = levelBank.procedures || []
  const procIdx = (seed + 1) % (procTemplates.length || 1)
  const procSentence = fillTokens(procTemplates[procIdx] || '', tokens, { topic: effectiveStrength, expectation: effectiveStrength })

  // 3. Next Steps Sentence
  let nextStepSentence = ''
  if (effectiveGrowth) {
    const growthAction = formatNextStepAction(effectiveGrowth)
    nextStepSentence = `Next Steps: ${tokens.name} is encouraged to ${growthAction}.`
  } else {
    const nextStepTemplates = levelBank.nextSteps || []
    const nsIdx1 = seed % (nextStepTemplates.length || 1)
    const nsIdx2 = (seed + 1) % (nextStepTemplates.length || 1)
    const ns1 = fillTokens(nextStepTemplates[nsIdx1] || '', tokens)
    const ns2 = (nsIdx1 !== nsIdx2 && nextStepTemplates[nsIdx2]) ? fillTokens(nextStepTemplates[nsIdx2] || '', tokens) : ''
    nextStepSentence = [ns1, ns2].filter(Boolean).join(' ')
    if (!/^Next Steps:/i.test(nextStepSentence)) {
      nextStepSentence = `Next Steps: ${nextStepSentence}`
    }
  }

  let fullComment = [conceptSentence, procSentence, nextStepSentence].filter(Boolean).join(' ')

  if (fullComment.length > charLimit) {
    const nextStepTemplates = levelBank.nextSteps || []
    const singleNs = fillTokens(nextStepTemplates[seed % (nextStepTemplates.length || 1)] || '', tokens)
    const trimmedNs = singleNs.startsWith('Next Steps:') ? singleNs : `Next Steps: ${singleNs}`
    fullComment = [conceptSentence, procSentence, trimmedNs].filter(Boolean).join(' ')
    if (fullComment.length > charLimit) {
      fullComment = [conceptSentence, trimmedNs].filter(Boolean).join(' ')
    }
  }

  fullComment = enforceCanadianSpelling(fullComment)

  return {
    text: fullComment,
    charCount: fullComment.length,
    wordCount: fullComment.trim().split(/\s+/).filter(Boolean).length,
    isOverLimit: fullComment.length > charLimit,
    charLimit,
    strandName: strand.name,
    achievementLevel: level
  }
}

// ─── Elementary Language Comment Generation ───────────────────────────────────

/**
 * Generates an authentic Ontario elementary language (2023) report card comment.
 * Strands: B (Foundations of Language), C (Comprehension), D (Composition)
 */
export function generateElementaryLanguageComment({
  student = {},
  gradeData = {},
  options = {}
} = {}) {
  const {
    strandCode = '',
    featuredStrength = '',
    featuredNextStep = '',
    variantSeed = 0,
    pronounMode = 'preferred',
    reportingPeriod = 'Term 1',
    charLimit = 1200
  } = options

  const mark = gradeData.percentage ?? gradeData.mark
  const level = getAchievementLevel(gradeData.level || mark)
  const tokens = getPronounTokens(student, pronounMode)

  const {
    effectiveStrength,
    autoStrengthLevel,
    effectiveGrowth
  } = extractSbarStrengthsAndGrowth(gradeData, featuredStrength, featuredNextStep, 'Language')

  const strand = resolveLanguageStrand(strandCode || effectiveStrength || effectiveGrowth || 'C')
  const strengthLvl = autoStrengthLevel || level
  const levelBank = strand.levels[strengthLvl.key] || strand.levels['3']
  const seed = Math.abs(typeof variantSeed === 'number' ? variantSeed : 0)

  // 1. Concept Understanding Sentence
  const conceptTemplates = levelBank.conceptStems || []
  const conceptIdx = seed % (conceptTemplates.length || 1)
  let conceptSentence = fillTokens(conceptTemplates[conceptIdx] || '', tokens, { topic: effectiveStrength, expectation: effectiveStrength })
  if (effectiveStrength && !conceptSentence.toLowerCase().includes(effectiveStrength.toLowerCase())) {
    const connector = /^(using|applying|analyzing|interpreting|composing|drafting|reading|communicating)\b/i.test(effectiveStrength)
      ? 'when'
      : 'with'
    conceptSentence = `${conceptSentence} ${tokens.name} demonstrated particular proficiency ${connector} ${effectiveStrength}.`
  }

  // 2. Classroom Application / Evidence Sentence
  const appTemplates = levelBank.applications || []
  const appIdx = (seed + 1) % (appTemplates.length || 1)
  const appSentence = fillTokens(appTemplates[appIdx] || '', tokens, { topic: effectiveStrength, expectation: effectiveStrength })

  // 3. Next Steps Sentence
  let nextStepSentence = ''
  if (effectiveGrowth) {
    const growthAction = formatNextStepAction(effectiveGrowth)
    nextStepSentence = `Next Steps: ${tokens.name} is encouraged to ${growthAction}.`
  } else {
    const nextStepTemplates = levelBank.nextSteps || []
    const nsIdx1 = seed % (nextStepTemplates.length || 1)
    const nsIdx2 = (seed + 1) % (nextStepTemplates.length || 1)
    const ns1 = fillTokens(nextStepTemplates[nsIdx1] || '', tokens)
    const ns2 = (nsIdx1 !== nsIdx2 && nextStepTemplates[nsIdx2]) ? fillTokens(nextStepTemplates[nsIdx2] || '', tokens) : ''
    nextStepSentence = [ns1, ns2].filter(Boolean).join(' ')
    if (!/^Next Steps:/i.test(nextStepSentence)) {
      nextStepSentence = `Next Steps: ${nextStepSentence}`
    }
  }

  let fullComment = [conceptSentence, appSentence, nextStepSentence].filter(Boolean).join(' ')

  if (fullComment.length > charLimit) {
    const nextStepTemplates = levelBank.nextSteps || []
    const singleNs = fillTokens(nextStepTemplates[seed % (nextStepTemplates.length || 1)] || '', tokens)
    const trimmedNs = singleNs.startsWith('Next Steps:') ? singleNs : `Next Steps: ${singleNs}`
    fullComment = [conceptSentence, appSentence, trimmedNs].filter(Boolean).join(' ')
    if (fullComment.length > charLimit) {
      fullComment = [conceptSentence, trimmedNs].filter(Boolean).join(' ')
    }
  }

  fullComment = enforceCanadianSpelling(fullComment)

  return {
    text: fullComment,
    charCount: fullComment.length,
    wordCount: fullComment.trim().split(/\s+/).filter(Boolean).length,
    isOverLimit: fullComment.length > charLimit,
    charLimit,
    strandName: strand.name,
    achievementLevel: level
  }
}

// ─── Elementary History Comment Generation ────────────────────────────────────

/**
 * Generates an authentic Ontario elementary history report card comment.
 * Strands: A (Creating Canada 1850-1890), B (Canada 1890-1914: A Changing Society)
 * Strictly capped at 600 characters (SCDSB limit).
 */
export function generateElementaryHistoryComment({
  student = {},
  gradeData = {},
  options = {}
} = {}) {
  const {
    strandCode = '',
    featuredStrength = '',
    featuredNextStep = '',
    variantSeed = 0,
    pronounMode = 'preferred',
    reportingPeriod = 'Term 1',
    charLimit = 600
  } = options

  const mark = gradeData.percentage ?? gradeData.mark
  const level = getAchievementLevel(gradeData.level || mark)
  const tokens = getPronounTokens(student, pronounMode)

  const {
    effectiveStrength,
    autoStrengthLevel,
    effectiveGrowth
  } = extractSbarStrengthsAndGrowth(gradeData, featuredStrength, featuredNextStep, 'History')

  const strand = resolveHistoryStrand(strandCode || effectiveStrength || effectiveGrowth || 'A')
  const strengthLvl = autoStrengthLevel || level
  const levelBank = strand.levels[strengthLvl.key] || strand.levels['3']
  const seed = Math.abs(typeof variantSeed === 'number' ? variantSeed : 0)

  // 1. Concept Understanding Sentence
  const conceptTemplates = levelBank.conceptStems || []
  const conceptIdx = seed % (conceptTemplates.length || 1)
  let conceptSentence = fillTokens(conceptTemplates[conceptIdx] || '', tokens, { topic: effectiveStrength, expectation: effectiveStrength })
  if (effectiveStrength && !conceptSentence.toLowerCase().includes(effectiveStrength.toLowerCase())) {
    conceptSentence = `${conceptSentence} ${tokens.name} excelled at ${effectiveStrength}.`
  }

  // 2. Inquiry / Research Sentence
  const inqTemplates = levelBank.inquiries || []
  const inqIdx = (seed + 1) % (inqTemplates.length || 1)
  const inqSentence = fillTokens(inqTemplates[inqIdx] || '', tokens, { topic: effectiveStrength, expectation: effectiveStrength })

  // 3. Next Steps Sentence
  let nextStepSentence = ''
  if (effectiveGrowth) {
    const growthAction = formatNextStepAction(effectiveGrowth)
    nextStepSentence = `Next Steps: ${tokens.name} is encouraged to ${growthAction}.`
  } else {
    const nextStepTemplates = levelBank.nextSteps || []
    const nsIdx = seed % (nextStepTemplates.length || 1)
    const ns = fillTokens(nextStepTemplates[nsIdx] || '', tokens)
    nextStepSentence = ns.startsWith('Next Steps:') ? ns : `Next Steps: ${ns}`
  }

  let fullComment = [conceptSentence, inqSentence, nextStepSentence].filter(Boolean).join(' ')

  // Strict 600 character cap
  if (fullComment.length > charLimit) {
    fullComment = [conceptSentence, nextStepSentence].filter(Boolean).join(' ')
  }

  fullComment = enforceCanadianSpelling(fullComment)

  return {
    text: fullComment,
    charCount: fullComment.length,
    wordCount: fullComment.trim().split(/\s+/).filter(Boolean).length,
    isOverLimit: fullComment.length > charLimit,
    charLimit,
    strandName: strand.name,
    achievementLevel: level
  }
}

// ─── Elementary Geography Comment Generation ──────────────────────────────────

/**
 * Generates an authentic Ontario elementary geography report card comment.
 * Strands: A (Patterns & Sustainability), B (Global Inequalities & Quality of Life)
 * Strictly capped at 600 characters (SCDSB limit).
 */
export function generateElementaryGeographyComment({
  student = {},
  gradeData = {},
  options = {}
} = {}) {
  const {
    strandCode = '',
    featuredStrength = '',
    featuredNextStep = '',
    variantSeed = 0,
    pronounMode = 'preferred',
    reportingPeriod = 'Term 1',
    charLimit = 600
  } = options

  const mark = gradeData.percentage ?? gradeData.mark
  const level = getAchievementLevel(gradeData.level || mark)
  const tokens = getPronounTokens(student, pronounMode)

  const {
    effectiveStrength,
    autoStrengthLevel,
    effectiveGrowth
  } = extractSbarStrengthsAndGrowth(gradeData, featuredStrength, featuredNextStep, 'Geography')

  const strand = resolveGeographyStrand(strandCode || effectiveStrength || effectiveGrowth || 'A')
  const strengthLvl = autoStrengthLevel || level
  const levelBank = strand.levels[strengthLvl.key] || strand.levels['3']
  const seed = Math.abs(typeof variantSeed === 'number' ? variantSeed : 0)

  // 1. Concept Understanding Sentence
  const conceptTemplates = levelBank.conceptStems || []
  const conceptIdx = seed % (conceptTemplates.length || 1)
  let conceptSentence = fillTokens(conceptTemplates[conceptIdx] || '', tokens, { topic: effectiveStrength, expectation: effectiveStrength })
  if (effectiveStrength && !conceptSentence.toLowerCase().includes(effectiveStrength.toLowerCase())) {
    conceptSentence = `${conceptSentence} ${tokens.name} excelled at ${effectiveStrength}.`
  }

  // 2. Inquiry / Application Sentence
  const inqTemplates = levelBank.inquiries || []
  const inqIdx = (seed + 1) % (inqTemplates.length || 1)
  const inqSentence = fillTokens(inqTemplates[inqIdx] || '', tokens, { topic: effectiveStrength, expectation: effectiveStrength })

  // 3. Next Steps Sentence
  let nextStepSentence = ''
  if (effectiveGrowth) {
    const growthAction = formatNextStepAction(effectiveGrowth)
    nextStepSentence = `Next Steps: ${tokens.name} is encouraged to ${growthAction}.`
  } else {
    const nextStepTemplates = levelBank.nextSteps || []
    const nsIdx = seed % (nextStepTemplates.length || 1)
    const ns = fillTokens(nextStepTemplates[nsIdx] || '', tokens)
    nextStepSentence = ns.startsWith('Next Steps:') ? ns : `Next Steps: ${ns}`
  }

  let fullComment = [conceptSentence, inqSentence, nextStepSentence].filter(Boolean).join(' ')

  // Strict 600 character cap
  if (fullComment.length > charLimit) {
    fullComment = [conceptSentence, nextStepSentence].filter(Boolean).join(' ')
  }

  fullComment = enforceCanadianSpelling(fullComment)

  return {
    text: fullComment,
    charCount: fullComment.length,
    wordCount: fullComment.trim().split(/\s+/).filter(Boolean).length,
    isOverLimit: fullComment.length > charLimit,
    charLimit,
    strandName: strand.name,
    achievementLevel: level
  }
}

// ─── General Elementary Subject Comment Generation ────────────────────────────

/**
 * Generates an elementary subject comment (Math, Language, Social Studies, The Arts, French, etc.)
 * utilizing available SBAR expectations, student grade, and SCDSB character limits.
 */
export function generateElementarySubjectComment({
  student = {},
  subject = {},
  gradeData = {},
  options = {}
} = {}) {
  const subCode = String(subject.code || subject.subjectId || subject.name || '').toLowerCase()
  const gradeLevel = student.gradeLevel || 8
  const defaultLimit = getScdsbCharacterLimit(subCode, gradeLevel)

  const {
    featuredStrength = '',
    featuredNextStep = '',
    variantSeed = 0,
    pronounMode = 'preferred',
    reportingPeriod = 'Term 1',
    charLimit = defaultLimit
  } = options

  // Dispatch to specialized Grade 8 banks if student is Grade 8 (or unstated)
  const isGrade8 = gradeLevel === 8 || !student.gradeLevel
  if (isGrade8) {
    if (subCode.includes('sci') || subCode.includes('snc')) {
      return generateElementaryScienceComment({
        student,
        gradeData,
        options: {
          ...options,
          charLimit
        }
      })
    }
    if (subCode.includes('math') || subCode.includes('mat')) {
      return generateElementaryMathComment({
        student,
        gradeData,
        options: {
          ...options,
          charLimit
        }
      })
    }
    if (subCode.includes('lang') || subCode.includes('eng') || subCode.includes('ela')) {
      return generateElementaryLanguageComment({
        student,
        gradeData,
        options: {
          ...options,
          charLimit
        }
      })
    }
    if (subCode.includes('hist') || subCode.includes('his')) {
      return generateElementaryHistoryComment({
        student,
        gradeData,
        options: {
          ...options,
          charLimit
        }
      })
    }
    if (subCode.includes('geog') || subCode.includes('geo')) {
      return generateElementaryGeographyComment({
        student,
        gradeData,
        options: {
          ...options,
          charLimit
        }
      })
    }
  }

  const mark = gradeData.percentage ?? gradeData.mark
  const level = getAchievementLevel(gradeData.level || mark)
  const tokens = getPronounTokens(student, pronounMode)
  const seed = Math.abs(typeof variantSeed === 'number' ? variantSeed : 0)

  const subjectName = formatSubjectNameForComment(subject.name || subject.title || 'the curriculum')

  const {
    effectiveStrength,
    autoStrengthLevel,
    effectiveGrowth
  } = extractSbarStrengthsAndGrowth(gradeData, featuredStrength, featuredNextStep, subjectName)

  const strengthTopic = effectiveStrength || `${subjectName} learning goals`
  const growthTopic = effectiveGrowth || `${subjectName} problem-solving tasks`
  const strengthLvl = autoStrengthLevel || level

  const isGerundStrength = /^(using|applying|analyzing|interpreting|composing|creating|performing|demonstrating|investigating|exploring)\b/i.test(strengthTopic)
  const strengthPrep = isGerundStrength ? 'when' : 'when engaging with'

  // 1. Curriculum Strength sentence
  const strengthTemplates = {
    '4+': [
      `${tokens.name} demonstrates exceptional, insightful understanding ${strengthPrep} ${strengthTopic}.`,
      `${tokens.name} consistently shows thorough and sophisticated application of core concepts ${strengthPrep} ${strengthTopic}.`
    ],
    '4': [
      `${tokens.name} demonstrates a thorough and consistent understanding of curriculum expectations ${strengthPrep} ${strengthTopic}.`,
      `${tokens.name} accurately and effectively applies key concepts and procedures ${strengthPrep} ${strengthTopic}.`
    ],
    '3': [
      `${tokens.name} demonstrates a competent and solid understanding ${isGerundStrength ? 'when' : 'of'} ${strengthTopic}.`,
      `${tokens.name} consistently applies learned strategies and skills ${strengthPrep} ${strengthTopic}.`
    ],
    '2': [
      `${tokens.name} demonstrates developing understanding ${strengthPrep} ${strengthTopic}.`,
      `${tokens.name} applies core strategies with emerging consistency during in-class tasks involving ${strengthTopic}.`
    ],
    '1': [
      `${tokens.name} demonstrates emerging knowledge of foundational skills with regular teacher guidance ${strengthPrep} ${strengthTopic}.`,
      `${tokens.name} participates in classroom activities and requires guided assistance ${strengthPrep} ${strengthTopic}.`
    ]
  }

  const sList = strengthTemplates[strengthLvl.key] || strengthTemplates['3']
  const sentence1 = sList[seed % sList.length]

  // 2. Classroom Application / Task Evidence sentence (calibrated to student overall subject level)
  const appTemplates = {
    '4+': [
      `During classroom evaluations and collaborative tasks, {subjectLower} independently integrates advanced problem-solving methods and communicates reasoning with outstanding precision.`,
      `{subject} demonstrates excellent critical thinking during inquiry challenges, regularly making insightful connections across units.`
    ],
    '4': [
      `During daily learning activities, {subjectLower} works diligently, solving problems with precision and communicating findings clearly.`,
      `{subject} actively engages during classroom discussions, using appropriate vocabulary and visual models to justify {possessive} thinking.`
    ],
    '3': [
      `In classroom tasks, {subjectLower} uses guided tools and models effectively to solve problems and share {possessive} thinking.`,
      `{subject} participates well during in-class activities, utilizing available references to complete assignments with care.`
    ],
    '2': [
      `With teacher prompting and guided organizers, {subjectLower} follows structured procedures to complete learning tasks.`,
      `{subject} benefits from small-group modelling and the use of classroom anchor charts to support task completion.`
    ],
    '1': [
      `With ongoing teacher assistance and visual templates, {subjectLower} participates in guided practice and foundational exercises.`,
      `{subject} works with direct support during lessons to complete essential curriculum tasks.`
    ]
  }

  const aList = appTemplates[level.key] || appTemplates['3']
  const sentence2 = fillTokens(aList[(seed + 1) % aList.length], tokens)

  // 3. Actionable Next Step
  let sentence3 = ''
  if (effectiveGrowth) {
    const growthAction = formatNextStepAction(effectiveGrowth)
    sentence3 = `Next Steps: ${tokens.name} is encouraged to ${growthAction}.`
  } else {
    const nextStepTemplates = {
      '4+': [
        `Next Steps: ${tokens.name} is encouraged to challenge {reflexive} with open-ended extension questions and multi-step inquiry problems.`,
        `Next Steps: To foster continued excellence, ${tokens.name} should explore non-routine challenges that connect ${subjectName} to real-world contexts.`
      ],
      '4': [
        `Next Steps: ${tokens.name} is encouraged to continue explaining intermediate steps and justifications thoroughly.`,
        `Next Steps: ${tokens.name} should continue verifying solutions and exploring creative alternative strategies.`
      ],
      '3': [
        `Next Steps: ${tokens.name} is encouraged to review core procedures and verify calculations independently when working with ${growthTopic}.`,
        `Next Steps: Utilizing structured checklists will support ${tokens.name} in organizing intermediate steps when tackling complex problems.`
      ],
      '2': [
        `Next Steps: ${tokens.name} is encouraged to use classroom anchor charts, graphic organizers, and vocabulary aids to build confidence with ${growthTopic}.`,
        `Next Steps: Daily practice with foundational concepts and seeking timely clarification will support ${tokens.possessive} ongoing progress.`
      ],
      '1': [
        `Next Steps: ${tokens.name} is encouraged to use personal glossaries, step-by-step templates, and attend extra help to reinforce core ${subjectName} expectations.`,
        `Next Steps: Consistent review of lesson notes and active participation in guided review sessions will help ${tokens.name} build required competencies.`
      ]
    }
    const nsList = nextStepTemplates[level.key] || nextStepTemplates['3']
    sentence3 = fillTokens(nsList[(seed + 2) % nsList.length], tokens)
  }

  let fullComment = [sentence1, sentence2, sentence3].join(' ')

  // Fit under subject budget
  if (fullComment.length > charLimit) {
    fullComment = [sentence1, sentence3].join(' ')
  }

  fullComment = enforceCanadianSpelling(fullComment)

  return {
    text: fullComment,
    charCount: fullComment.length,
    wordCount: fullComment.trim().split(/\s+/).filter(Boolean).length,
    isOverLimit: fullComment.length > charLimit,
    charLimit,
    subjectName,
    achievementLevel: level
  }
}

// ─── Elementary Learning Skills Comment Generation ───────────────────────────

/**
 * Synthesizes a comprehensive Ontario Growing Success Learning Skills & Work Habits comment.
 *
 * @param {Object} params
 * @param {Object} params.student            Student record
 * @param {Object} [params.skillsRatings]    Map of skill keys to ratings: { responsibility: 'E', organization: 'G', ... }
 * @param {Object} [params.options]          Configuration options
 * @param {'format_a'|'format_b'} [params.options.format='format_a']
 * @param {string[]} [params.options.spotlightStrengths]
 * @param {string[]} [params.options.spotlightNextSteps]
 * @param {number} [params.options.variantSeed=0]
 * @param {number} [params.options.charLimit=2600]
 * @param {string} [params.options.pronounMode='preferred']
 */
export function generateLearningSkillsComment({
  student = {},
  skillsRatings = {},
  options = {}
} = {}) {
  const {
    format = 'format_a', // 'format_a' (Labeled STRENGTHS / NEXT STEPS) | 'format_b' (Flowing paragraph)
    spotlightStrengths = null,
    spotlightNextSteps = null,
    variantSeed = 0,
    charLimit = 2600,
    pronounMode = 'preferred'
  } = options

  const tokens = getPronounTokens(student, pronounMode)
  const seed = Math.abs(typeof variantSeed === 'number' ? variantSeed : 0)

  // Rank skills by rating: E (4) > G (3) > S (2) > N (1)
  const scoreMap = { 'E': 4, 'G': 3, 'S': 2, 'N': 1 }
  const defaultRatings = {
    responsibility: 'G',
    organization: 'G',
    independentWork: 'G',
    collaboration: 'G',
    initiative: 'G',
    selfRegulation: 'G'
  }
  const mergedRatings = { ...defaultRatings, ...skillsRatings }

  // 1. Identify top 2 strength skills
  let strengthKeys = spotlightStrengths && spotlightStrengths.length > 0 ? spotlightStrengths : null
  if (!strengthKeys) {
    const sortedDescending = [...LEARNING_SKILL_KEYS].sort((a, b) => {
      const scoreA = scoreMap[String(mergedRatings[a] || 'G').toUpperCase()] || 2
      const scoreB = scoreMap[String(mergedRatings[b] || 'G').toUpperCase()] || 2
      return scoreB - scoreA
    })
    strengthKeys = [sortedDescending[0], sortedDescending[1]]
  }

  // 2. Identify 1-2 next step skills (from lower ratings, ensuring no duplicate with strengths)
  let nextStepKeys = spotlightNextSteps && spotlightNextSteps.length > 0 ? spotlightNextSteps : null
  if (!nextStepKeys) {
    const availableForGrowth = LEARNING_SKILL_KEYS.filter(k => !strengthKeys.includes(k))
    const sortedAscending = [...availableForGrowth].sort((a, b) => {
      const scoreA = scoreMap[String(mergedRatings[a] || 'G').toUpperCase()] || 2
      const scoreB = scoreMap[String(mergedRatings[b] || 'G').toUpperCase()] || 2
      return scoreA - scoreB
    })
    nextStepKeys = [sortedAscending[0], sortedAscending[1]].filter(Boolean)
  }

  // 3. Assemble Strengths Sentences
  const strengthParagraphs = []
  strengthKeys.forEach((key, idx) => {
    const bank = LEARNING_SKILLS_BANK[key]
    if (!bank) return
    const sGroup = bank.strengths[(seed + idx) % bank.strengths.length]
    if (!sGroup) return
    const stem = fillTokens(sGroup.stem, tokens)
    const example = fillTokens(sGroup.examples[(seed + idx) % sGroup.examples.length] || '', tokens)
    strengthParagraphs.push([stem, example].filter(Boolean).join(' '))
  })

  // 4. Assemble Next Steps Sentences
  const nextStepParagraphs = []
  nextStepKeys.forEach((key, idx) => {
    const bank = LEARNING_SKILLS_BANK[key]
    if (!bank) return
    const nsGroup = bank.nextSteps[(seed + idx) % bank.nextSteps.length]
    if (!nsGroup) return
    const stem = fillTokens(nsGroup.stem, tokens)
    const example = fillTokens(nsGroup.examples[(seed + idx) % nsGroup.examples.length] || '', tokens)
    nextStepParagraphs.push([stem, example].filter(Boolean).join(' '))
  })

  let fullComment = ''

  if (format === 'format_a') {
    // Format A: Labeled sections (very popular in Ontario elementary)
    const strengthsSection = `STRENGTHS: ${strengthParagraphs.join(' ')}`
    const nextStepsSection = `NEXT STEPS: ${nextStepParagraphs.join(' ')}`
    fullComment = `${strengthsSection}\n\n${nextStepsSection}`
  } else {
    // Format B: Flowing narrative without labels
    fullComment = [...strengthParagraphs, ...nextStepParagraphs].join(' ')
  }

  fullComment = enforceCanadianSpelling(fullComment)

  return {
    text: fullComment,
    charCount: fullComment.length,
    wordCount: fullComment.trim().split(/\s+/).filter(Boolean).length,
    isOverLimit: fullComment.length > charLimit,
    charLimit,
    strengthSkills: strengthKeys,
    nextStepSkills: nextStepKeys
  }
}
