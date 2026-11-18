/**
 * src/utils/commentGenerator.js
 *
 * Deterministic report card comment generator for Ontario curriculum and universal grading.
 * Compliant with Ontario's Growing Success framework & SCDSB APM A1460:
 *   - Core Triad: [Level-Qualified Strength] + [Specific Diagnostic Growth Gap] + [Concept-Matched Tool/Strategy]
 *   - 6 Syntactic Blueprints (mixing 3-sentence diagnostic layouts and 2-sentence merged pivots)
 *   - Strict secondary SIS character budget (target 300-385 chars, strictly <= 400 chars)
 *   - Expanded elementary narrative mode (target ~800-1200 characters)
 *   - Retest/attempt history, teacher note, and reporting-period cutoff aware evidence extraction
 *   - Pronoun modes: 'preferred' (he/she/they), 'name-only' (uses first name, avoids pronouns), 'roster'
 *
 * Pure utility function: no database imports, no side-effects, 100% unit-testable.
 */

import {
  mapAssessmentToCompetency,
  mapAssessmentToShortTopic,
  mapAssessmentToTool,
  extractCompetenciesFromAssessment,
  resolveCompetencyObject,
  pickCompetencyPhrase,
  pickCompetencyShortTopic,
  pickCompetencyTool,
  condenseCurriculumExpectation
} from './curriculumCompetencies.js'
import { enforceCanadianSpelling } from './canadianSpelling.js'
import { isFormativeAssessment } from './gradeCalc.js'

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
 * @returns {{ name: string, subject: string, subjectLower: string, object: string, possessive: string, possessiveCapital: string, reflexive: string, isPlural: boolean }}
 */
export function getPronounTokens(student, pronounMode = 'preferred') {
  let resolvedFirst = ''
  const rosterFirst = (student?.firstName || '').trim()
  const prefName = (student?.preferredName || '').trim()

  if (prefName) {
    if (rosterFirst && prefName.toLowerCase() === rosterFirst.toLowerCase()) {
      resolvedFirst = rosterFirst
    } else {
      resolvedFirst = prefName
    }
  } else {
    resolvedFirst = rosterFirst || 'The student'
  }

  const firstName = resolvedFirst
    ? resolvedFirst.charAt(0).toUpperCase() + resolvedFirst.slice(1)
    : 'The student'

  if (pronounMode === 'name-only') {
    return {
      name: firstName,
      subject: firstName,
      subjectLower: firstName,
      object: firstName,
      possessive: `${firstName}'s`,
      possessiveCapital: `${firstName}'s`,
      reflexive: 'themselves',
      isPlural: false,
    }
  }

  const raw = String(student?.pronouns || '').toLowerCase()
  const gender = String(student?.gender || '').toLowerCase()

  if (/\b(they|them|their)\b/i.test(raw)) {
    return {
      name: firstName,
      subject: 'They',
      subjectLower: 'they',
      object: 'them',
      possessive: 'their',
      possessiveCapital: 'Their',
      reflexive: 'themselves',
      isPlural: true,
    }
  }

  if (/\b(she|her)\b/i.test(raw) || gender === 'f' || gender === 'female') {
    return {
      name: firstName,
      subject: 'She',
      subjectLower: 'she',
      object: 'her',
      possessive: 'her',
      possessiveCapital: 'Her',
      reflexive: 'herself',
      isPlural: false,
    }
  }

  if (/\b(he|him|his)\b/i.test(raw) || gender === 'm' || gender === 'male') {
    return {
      name: firstName,
      subject: 'He',
      subjectLower: 'he',
      object: 'him',
      possessive: 'his',
      possessiveCapital: 'His',
      reflexive: 'himself',
      isPlural: false,
    }
  }

  if (pronounMode === 'preferred') {
    return {
      name: firstName,
      subject: 'They',
      subjectLower: 'they',
      object: 'them',
      possessive: 'their',
      possessiveCapital: 'Their',
      reflexive: 'themselves',
      isPlural: true,
    }
  }

  return {
    name: firstName,
    subject: firstName,
    subjectLower: firstName,
    object: firstName,
    possessive: `${firstName}'s`,
    possessiveCapital: `${firstName}'s`,
    reflexive: 'themselves',
    isPlural: false,
  }
}

// ─── Grammar & Department Utilities ──────────────────────────────────────────

const GERUND_START_REGEX = /^(analyzing|analysing|evaluating|investigating|solving|explaining|describing|comparing|identifying|calculating|determining|constructing|designing|conducting|compiling|communicating|applying|modeling|modelling|predicting|measuring|interpreting|formulating|using|selecting|drawing|verifying|assessing|adding|subtracting|multiplying|dividing|composing|decomposing|creating|exploring|demonstrating|representing|classifying|examining|resolving|mapping|building|balancing|writing|simplifying|expanding|factoring|graphing|tracing|connecting|relating|converting|diagnosing|distinguishing|preparing|debugging|translating|testing|optimizing|completing|working|finding|structuring|organizing|synthesizing)\b/i

function isGerundPhrase(text) {
  return Boolean(text && GERUND_START_REGEX.test(String(text).trim()))
}

function getDepartmentGroup(courseCode = '') {
  const code = String(courseCode || '').trim().toUpperCase()
  if (/^S/.test(code)) return 'science'
  if (/^M/.test(code)) return 'math'
  return 'general'
}

function v(tokens, singular, plural) {
  return tokens?.isPlural ? plural : singular
}

function capitalizeFirst(str) {
  const s = String(str || '').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

// ─── Elementary / Legacy Sentence Banks (Preserved for Elementary Mode) ──────

function getStrengthPhrases(tokens, level, taskName, variant = 0, options = {}) {
  const isCompact = Boolean(options?.compact)
  const dept = getDepartmentGroup(options?.courseCode)
  const isScience = dept === 'science'
  const isMath = dept === 'math'
  const cleanTask = formatCurriculumTopic(taskName || 'course learning goals')
  const isGerund = isGerundPhrase(cleanTask)
  const capTask = isGerund ? capitalizeFirst(cleanTask) : ''
  const whenTask = isGerund ? cleanTask : makeGerund(cleanTask)
  const onTask = isGerund ? `when ${cleanTask}` : `on ${cleanTask}`

  const isBelowStandard = options?.overallLevelKey === 'R' || options?.overallLevelKey === '1'
  if (isBelowStandard && !['1', 'R'].includes(level.key)) {
    const relList = isCompact
      ? [
          `${tokens.name} showed ${tokens.possessive} strongest understanding when ${whenTask}.`,
          `${tokens.name} achieved ${tokens.possessive} best results when ${whenTask}.`,
          `Relative to overall progress, ${tokens.name} performed strongest ${onTask}.`,
          `${tokens.name}'s clearest grasp of concepts appeared when ${whenTask}.`
        ]
      : [
          `${tokens.name} showed ${tokens.possessive} strongest understanding when ${whenTask}.`,
          `Within an emerging overall performance, ${tokens.name} achieved ${tokens.possessive} best results when ${whenTask}.`,
          `${tokens.name} demonstrated ${tokens.possessive} strongest capability in ${cleanTask}.`,
          `Among recent evaluations, ${tokens.name} performed best when ${whenTask}.`,
          `Relative to other course tasks, ${tokens.name} showed stronger engagement ${onTask}.`,
          `${tokens.name}'s most consistent work this term came when ${whenTask}.`
        ]
    return relList[Math.abs(variant) % relList.length]
  }

  const inquiryContext = isScience
    ? 'During laboratory investigations'
    : (isMath ? 'During classroom problem-solving tasks' : 'During classroom inquiries')
  const problemContext = isScience || isMath
    ? 'During classroom problem-solving tasks'
    : 'Across course assignments and inquiries'
  const evalContext = isScience
    ? 'Across unit labs and evaluations'
    : (isMath ? 'Across unit assessments' : 'Across unit tasks and evaluations')

  const standardTemplates = {
    '4+': [
      isGerund
        ? `${capTask}, ${tokens.name} excels with thorough insight and understanding.`
        : `${tokens.name} excels with thorough insight, particularly when ${whenTask}.`,
      `${inquiryContext}, ${tokens.name} shows thorough understanding when ${whenTask}.`,
      `${tokens.name} applies critical thinking skills with thorough insight, particularly ${onTask}.`,
      `${problemContext}, ${tokens.name} exhibits thorough precision when ${whenTask}.`
    ],
    '4': [
      isGerund
        ? `${capTask}, ${tokens.name} demonstrates strong analytical skills with high effectiveness.`
        : `${tokens.name} excels with a high degree of skill when ${whenTask}.`,
      `During classroom inquiries, ${tokens.name} applies concepts with thorough consistency when ${whenTask}.`,
      `${tokens.name} exhibits commendable analytical skill and consistency, particularly ${onTask}.`,
      `${evalContext}, ${tokens.name} consistently produces high-quality work when ${whenTask}.`
    ],
    '3': [
      isGerund
        ? `${capTask}, ${tokens.name} shows competent understanding and solid skills.`
        : `${tokens.name} shows competent understanding and solid skills when ${whenTask}.`,
      `During unit tasks, ${tokens.name} applies core course concepts reliably when ${whenTask}.`,
      `${tokens.name} produces good quality work and communicates ideas clearly when ${whenTask}.`,
      `${evalContext}, ${tokens.name} meets expectations reliably when ${whenTask}.`
    ],
    '2': [
      isGerund
        ? `With emerging consistency in ${cleanTask}, ${tokens.name} shows developing understanding of core procedures.`
        : `${tokens.name} shows developing understanding of key concepts in ${cleanTask}.`,
      `With guided practice, ${tokens.name} demonstrates emerging capability when ${whenTask}.`,
      `${tokens.name} is making steady progress in foundational skills, showing promise when ${whenTask}.`,
      `${tokens.name} is building confidence with core ideas when ${whenTask}.`
    ],
    '1': [
      `With ongoing teacher support, ${tokens.name} is working to develop foundational skills in ${cleanTask}.`,
      `During class inquiries, ${tokens.name} shows emerging familiarity when ${whenTask} with structured guidance.`,
      `${tokens.name} benefits from structured scaffolding to build confidence when ${whenTask}.`,
      `Guided examples help ${tokens.name} engage with essential concepts when ${whenTask}.`
    ],
    'R': [
      `With direct teacher guidance, ${tokens.name} is working to build foundational understanding when ${whenTask}.`,
      `With structured scaffolding, ${tokens.name} is developing familiarity with core concepts in ${cleanTask}.`,
      `Through step-by-step support, ${tokens.name} is working toward foundational skills in ${cleanTask}.`,
      `${tokens.name} is currently building entry-level familiarity when ${whenTask}.`
    ]
  }

  const list = standardTemplates[level.key] || standardTemplates['3']
  return list[Math.abs(variant) % list.length]
}

function getWorkHabitPhrases(tokens, learningSkills = {}, variant = 0, options = {}) {
  const isCompact = Boolean(options?.compact)
  const skills = learningSkills || {}
  const collab = skills.collaboration || ''
  const init = skills.initiative || ''
  const org = skills.organization || ''
  const ind = skills.independentWork || ''
  const resp = skills.responsibility || ''

  const isStrong = [collab, init, org, ind, resp].some(s => s === 'E' || s === 'G')
  const needsWork = [resp, org, ind].some(s => s === 'N' || s === 'S')

  if (isCompact) {
    if (isStrong && !needsWork) {
      const list = [
        `${tokens.subject} ${v(tokens, 'works', 'work')} diligently and ${v(tokens, 'collaborates', 'collaborate')} constructively with peers.`,
        `${tokens.subject} ${v(tokens, 'demonstrates', 'demonstrate')} strong initiative and ${v(tokens, 'uses', 'use')} class time effectively.`
      ]
      return list[Math.abs(variant) % list.length]
    }
    if (needsWork) {
      const list = [
        `${tokens.subject} would benefit from using class time more productively and meeting deadlines.`,
        `Developing consistent organizational habits will support ${tokens.possessive} progress.`
      ]
      return list[Math.abs(variant) % list.length]
    }
    const list = [
      `${tokens.subject} ${v(tokens, 'participates', 'participate')} cooperatively and ${v(tokens, 'completes', 'complete')} assigned tasks.`,
      `${tokens.subject} ${v(tokens, 'demonstrates', 'demonstrate')} satisfactory work habits during class.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (isStrong && !needsWork) {
    const list = [
      `${tokens.subject} ${v(tokens, 'works', 'work')} diligently in class and ${v(tokens, 'collaborates', 'collaborate')} constructively with peers.`,
      `${tokens.subject} ${v(tokens, 'demonstrates', 'demonstrate')} strong initiative and consistently ${v(tokens, 'uses', 'use')} class time effectively.`,
      `${tokens.subject} ${v(tokens, 'is', 'are')} a self-directed learner who approaches independent tasks with focused dedication.`,
      `${tokens.subject} actively ${v(tokens, 'participates', 'participate')} in discussions and ${v(tokens, 'manages', 'manage')} course responsibilities responsibly.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (needsWork) {
    const list = [
      `${tokens.subject} ${v(tokens, 'is', 'are')} encouraged to stay focused during independent work time to keep pace with deadlines.`,
      `${tokens.subject} would benefit from maintaining a detailed schedule and using class time more productively.`,
      `Developing more consistent organizational habits and self-advocating when questions arise will support ${tokens.possessive} progress.`,
      `Focusing on regular assignment completion and minimizing classroom distractions will foster greater success.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  const list = [
    `${tokens.subject} ${v(tokens, 'participates', 'participate')} cooperatively in class activities and ${v(tokens, 'completes', 'complete')} assigned tasks.`,
    `${tokens.subject} ${v(tokens, 'demonstrates', 'demonstrate')} satisfactory work habits and generally ${v(tokens, 'manages', 'manage')} class time appropriately.`,
    `${tokens.subject} ${v(tokens, 'works', 'work')} well in collaborative groups and ${v(tokens, 'shows', 'show')} positive engagement.`,
    `${tokens.subject} ${v(tokens, 'is', 'are')} respectful in class and ${v(tokens, 'strives', 'strive')} to complete independent work.`
  ]
  return list[Math.abs(variant) % list.length]
}

function getCurriculumApplicationPhrases(tokens, level, variant = 0, options = {}) {
  const profileFocus = options?.profileFocus || 'curriculum_general'

  if (profileFocus === 'work_habits' && options?.mode !== 'secondary') {
    return getWorkHabitPhrases(tokens, options?.learningSkills, variant, options)
  }

  const standardTemplates = {
    '4+': [
      `${tokens.subject} ${v(tokens, 'applies', 'apply')} critical thinking skills to analyze complex scenarios and ${v(tokens, 'communicates', 'communicate')} reasoning with precision.`,
      `${tokens.subject} ${v(tokens, 'evaluates', 'evaluate')} evidence and ${v(tokens, 'interprets', 'interpret')} complex theoretical models with precision.`
    ],
    '4': [
      `${tokens.subject} ${v(tokens, 'applies', 'apply')} learned concepts reliably to multi-step problems and ${v(tokens, 'communicates', 'communicate')} reasoning clearly.`,
      `${tokens.subject} ${v(tokens, 'exhibits', 'exhibit')} strong analytical capability during classroom inquiries and investigation tasks.`
    ],
    '3': [
      `${tokens.subject} ${v(tokens, 'applies', 'apply')} core procedures with competence, communicating intermediate solution steps clearly.`,
      `${tokens.subject} ${v(tokens, 'shows', 'show')} sound problem-solving skills during classroom investigations and evaluations.`
    ],
    '2': [
      `${tokens.subject} ${v(tokens, 'shows', 'show')} developing consistency when applying standard procedures to multi-step problem solving.`,
      `With guided practice, ${tokens.subjectLower} ${v(tokens, 'interprets', 'interpret')} core relationships with emerging accuracy.`
    ],
    '1': [
      `With ongoing teacher support, ${tokens.subjectLower} ${v(tokens, 'is', 'are')} working to apply basic principles and complete multi-step solutions.`,
      `Guided templates help ${tokens.object} break basic problems into manageable steps.`
    ],
    'R': [
      `${tokens.subject} ${v(tokens, 'requires', 'require')} comprehensive guidance to interpret core concepts and complete basic procedures.`,
      `Structured one-on-one scaffolding is essential to help ${tokens.object} engage with core expectations.`
    ]
  }

  const list = standardTemplates[level.key] || standardTemplates['3']
  return list[Math.abs(variant) % list.length]
}

/**
 * Condenses overly long compound curriculum topics for natural Next Step phrasing.
 */
export function condenseTopicForNextStep(task) {
  if (!task || typeof task !== 'string') return ''
  const t = task.trim()
  if (t.length <= 60) return t

  const threePartMatch = t.match(/^(.*?)(?:,\s*[^,]+),\s*and\s+(.*)$/i)
  if (threePartMatch && threePartMatch[1] && threePartMatch[2]) {
    const candidate = `${threePartMatch[1]} and ${threePartMatch[2]}`.trim()
    if (candidate.length <= 65) return candidate
  }

  return t
}

function getNextStepPhrases(tokens, level, growthTaskName, variant = 0, options = {}) {
  const isFinal = typeof options === 'boolean' ? options : Boolean(options?.isFinal)
  const dept = getDepartmentGroup(options?.courseCode)
  const isStem = dept === 'science' || dept === 'math'
  const formattedTask = formatCurriculumTopic(growthTaskName || '')
  const cleanTask = condenseTopicForNextStep(formattedTask)
  const lower = cleanTask.toLowerCase().trim()

  const isGeneric = !cleanTask || cleanTask === 'multi-step problem solving' || cleanTask === 'course learning goals' || isGenericTitle(cleanTask)
  const isGerund = isGerundPhrase(lower)
  const inTopic = isGeneric ? '' : (isGerund ? ` when ${cleanTask}` : ` in ${cleanTask}`)
  const relatedTopic = isGeneric ? '' : (isGerund ? ` focused on ${cleanTask}` : ` related to ${cleanTask}`)
  const focusedTopic = isGeneric ? '' : (isGerund ? ` focused on ${cleanTask}` : ` in ${cleanTask}`)

  const termTemplates = {
    '4+': [
      `Moving forward, ${tokens.name} is encouraged to explore extension questions${focusedTopic} to deepen conceptual understanding.`,
      `Tackling novel, non-routine problems${relatedTopic} will further enhance ${tokens.possessive} critical insight.`
    ],
    '4': [
      isStem
        ? `Utilizing a structured problem-solving template will support ${tokens.name} in organizing multi-step solutions${inTopic}.`
        : `Utilizing a structured planning organizer will support ${tokens.name} in organizing detailed responses${inTopic}.`,
      `To reach the highest standard, ${tokens.subjectLower} should continue refining written justifications${inTopic}.`
    ],
    '3': [
      isStem
        ? `Utilizing a step-by-step checklist will help ${tokens.name} verify calculations${inTopic}.`
        : `Utilizing a step-by-step revision checklist will help ${tokens.name} organize ideas${inTopic}.`,
      `Moving forward, ${tokens.name} should practice ${isStem ? 'multi-step problem solving' : 'structured analysis'}${relatedTopic}.`
    ],
    '2': [
      isStem
        ? `Utilizing a structured reference checklist will help ${tokens.name} organize solution steps${inTopic}.`
        : `Utilizing a structured graphic organizer will help ${tokens.name} organize responses${inTopic}.`,
      `Regular review of core concepts and completing sample exercises${relatedTopic} will support ${tokens.possessive} progress.`
    ],
    '1': [
      `Utilizing a structured step-by-step organizer and attending regular extra help${focusedTopic} will support ${tokens.name}.`,
      `Working through foundational examples with teacher feedback${focusedTopic} will help ${tokens.name} gain confidence.`
    ],
    'R': [
      `Completing missing summative work and reviewing core concepts${focusedTopic} will support progress toward credit expectations.`,
      `Consistent foundational practice and attending extra help${focusedTopic} will support ${tokens.name} toward the provincial standard.`
    ]
  }

  const finalTemplates = {
    '4+': [
      `Moving forward into senior coursework, ${tokens.name} is encouraged to continue exploring extension questions and independent inquiry.`
    ],
    '4': [
      `Moving forward into senior courses, ${tokens.name} should continue refining structured problem-solving justifications.`
    ],
    '3': [
      `Moving forward into subsequent studies, consistent review and practice${relatedTopic} will reinforce ${tokens.name}'s ongoing success.`
    ],
    '2': [
      `Prior to enrolling in subsequent courses, ${tokens.name} is encouraged to review foundational concepts${inTopic} independently.`
    ],
    '1': [
      `Prior to advancing to subsequent courses, ${tokens.name} requires focused review of core expectations${inTopic}.`
    ],
    'R': [
      `To work toward credit recovery, ${tokens.name} should consult with guidance regarding summer school or remediation.`
    ]
  }

  const templates = isFinal ? finalTemplates : termTemplates
  const list = templates[level.key] || templates['3']
  return list[Math.abs(variant) % list.length]
}

// ─── Helpers & Sanitizers ───────────────────────────────────────────────────

/**
 * Normalizes and cleans an assessment or expectation title for parent-friendly sentences.
 */
export function sanitizeTaskTitle(rawTitle) {
  if (!rawTitle) return ''
  let t = String(rawTitle).trim()

  t = t.replace(/^(unit|ch\.|chapter|module|section|strand)\s*\d+[\s:–—-]+/i, '')
  t = t.replace(/\s*[\(\[][^)\]]*(oct|nov|dec|jan|feb|mar|apr|may|jun|pts|marks|\d{1,2}\/\d{1,2})[^)\]]*[\)\]]/gi, '')

  if (t.length > 3 && t === t.toUpperCase() && /[A-Z]/.test(t)) {
    t = t.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
  }

  const ADMIN_CONTAINERS = /\b(?:submission|submissions|dropbox|drop\s*box|hand-in|handin|turn-in|turnin|homework|hw|worksheet|worksheets|problem\s+set|packet|sheet|sheets|check-in|checkin|draft|final\s+draft|gizmo|gizmos|activity|activities|task|tasks)\b/gi
  t = t.replace(ADMIN_CONTAINERS, ' ').replace(/\s*#?\d+\s*$/, '').replace(/[\s:–—-]+$/, '').trim()

  return t
}

/**
 * Normalizes a raw assessment title or curriculum topic for natural pedagogical phrasing.
 */
export function formatCurriculumTopic(rawTitle) {
  if (!rawTitle) return ''
  let t = sanitizeTaskTitle(rawTitle)
  t = t.replace(/^(?:the|a|an)\s+/i, '')

  const lower = t.toLowerCase().trim()

  const TOPIC_EXPANSIONS = {
    'projectile': 'projectile motion',
    'projectiles': 'projectile motion',
    'light theory': 'light theory',
    'friction': 'friction and forces',
    'kinematics': 'kinematics',
    'dynamics': 'forces and dynamics',
    'forces': 'forces and motion',
    'circuits': 'electric circuits',
    'circuit': 'electric circuits',
    'waves': 'wave properties',
    'wave': 'wave properties',
    'optics': 'optics and light',
    'energy': 'conservation of energy',
    'heat': 'thermal energy',
    'thermal': 'thermal energy',
    'work & energy': 'work and energy',
    'work and energy': 'work and energy',
    'electricity': 'current electricity',
    'momentum': 'momentum and collisions',
    'rotational': 'rotational motion',
    'circular motion': 'uniform circular motion',
    'gravitation': 'universal gravitation',
    'sound': 'sound and acoustic waves',
    'standing waves': 'standing waves and resonance'
  }

  if (TOPIC_EXPANSIONS[lower]) {
    return TOPIC_EXPANSIONS[lower]
  }

  if (/\b(test|quiz|lab|exam|assignment|checkpoint|project)\b/i.test(t)) {
    return t
  }

  const PROPER_PRESERVE = /\b(1d|2d|3d|newton'?s?|ohm'?s?|kirchhoff'?s?|hooke'?s?|kepler'?s?|boyle'?s?|charles'?s?|snell'?s?|le\s+chatelier'?s?|avogadro'?s?|bohr-rutherford|bohr|rutherford|mendelian|mendel|punnett|coulomb'?s?|lorentz|lenz'?s?|planck'?s?|de\s+broglie|young'?s?|sohcahtoa|bedmas|iupac|dna|ph|stp|satp|si|salt|cartesian|pythagorean|doppler|einstein|galileo|archimedes|canada|canadian|indigenous|first nations|inuit|m[eé]tis|french|english|ontario)\b/gi

  const formatted = lower.replace(PROPER_PRESERVE, match => {
    const m = match.toLowerCase()
    if (m === '1d') return '1D'
    if (m === '2d') return '2D'
    if (m === '3d') return '3D'
    if (m === 'dna') return 'DNA'
    if (m === 'ph') return 'pH'
    if (m === 'stp') return 'STP'
    if (m === 'satp') return 'SATP'
    if (m === 'si') return 'SI'
    if (m === 'salt') return 'SALT'
    if (m === 'sohcahtoa') return 'SOHCAHTOA'
    if (m === 'bedmas') return 'BEDMAS'
    if (m === 'iupac') return 'IUPAC'
    if (m === 'bohr-rutherford') return 'Bohr-Rutherford'
    if (m === 'de broglie') return 'de Broglie'
    if (m.startsWith('le chatelier')) return 'Le Chatelier' + match.slice(12)
    return match.charAt(0).toUpperCase() + match.slice(1)
  })

  return formatted
}

/**
 * Checks if a title is too generic (e.g. "Quiz 1", "Lab 2", "Test 3", "Unit 1 Test").
 */
export function isGenericTitle(title) {
  if (!title) return true
  const raw = String(title).trim().toLowerCase()
  if (/^(quiz|test|lab|assignment|task|eval|unit test|checkpoint|check|submission|dropbox|hand-in|activity|gizmo|worksheet)\s*#?\d*$/i.test(raw)) return true
  const clean = sanitizeTaskTitle(raw).trim().toLowerCase()
  if (!clean || /^(quiz|test|lab|assignment|task|eval|unit test|checkpoint|check|submission|dropbox|hand-in|activity|gizmo|worksheet)\s*#?\d*$/i.test(clean)) return true
  if (/^(unit|ch\.|chapter|module|section|strand)\s*\d+[\s:–—-]*(quiz|test|lab|assignment|task|eval|checkpoint|check)?\s*#?\d*$/i.test(raw)) return true
  if (/^(assessment|evaluation|test|quiz|lab|assignment|homework|check|submission|dropbox|hand-in)\s*#?\d*$/i.test(raw)) return true
  return false
}

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

export const NON_ACADEMIC_CATEGORIES = new Set([
  'attendance',
  'participation',
  'attendance and participation',
  'attendance & participation',
  'attendance / participation',
  'homework',
  'admin',
  'checklist',
  'behavior',
  'behaviour',
  'effort',
  'learning skills'
])

export function isNonAcademicCategory(name) {
  if (!name || typeof name !== 'string') return false
  const lower = name.trim().toLowerCase()
  if (NON_ACADEMIC_CATEGORIES.has(lower)) return true
  if (lower.includes('attendance') || lower.includes('participation')) return true
  if (lower.includes('homework') || lower.includes('behaviour') || lower.includes('behavior')) return true
  return false
}

export function isCommentExcludedAssessment(assessment, classRecord = null) {
  if (!assessment) return false
  if (isFormativeAssessment(assessment, classRecord)) return true

  if (isNonAcademicCategory(assessment.name) || isNonAcademicCategory(assessment.category)) {
    return true
  }

  const categories = [
    ...(classRecord?.gradebookCategories || []),
    ...(classRecord?.categories || []),
    ...Object.values(classRecord?.courseFrameworks || {}).flatMap(f => f?.gradebookCategories || [])
  ]

  if (categories.length > 0 && assessment.categoryId) {
    const cat = categories.find(c => String(c.categoryId) === String(assessment.categoryId) || (c.name && c.name === assessment.categoryId))
    if (cat && isNonAcademicCategory(cat.name)) {
      return true
    }
  }

  return false
}

/**
 * Converts a task title into a smooth parent-friendly gerund phrase.
 */
export function makeGerund(task) {
  if (!task) return 'completing assignments'
  const clean = formatCurriculumTopic(task)
  const lower = clean.toLowerCase()

  if (isGerundPhrase(lower)) {
    return clean
  }

  if (lower.includes('lab') || lower.includes('inquiry') || lower.includes('investigation')) {
    return lower.startsWith('the ') ? `conducting ${clean}` : `conducting the ${clean}`
  }
  if (lower.includes('test') || lower.includes('quiz') || lower.includes('exam')) {
    return lower.startsWith('the ') ? `completing ${clean}` : `completing the ${clean}`
  }

  if (lower.includes('theory') || lower.includes('concept') || lower.includes('law') || lower.includes('principle')) {
    return `applying ${clean} concepts`
  }
  if (lower.includes('motion') || lower.includes('projectile') || lower.includes('kinematic')) {
    return `analyzing ${clean}`
  }
  if (lower.includes('problem') || lower.includes('calculation') || lower.includes('equation')) {
    return `solving ${clean} problems`
  }

  return `investigating ${clean}`
}

/**
 * Resolves a non-generic curriculum task name from an assessment object.
 */
export function resolveAssessmentTaskName(ass, courseCode = '', variantIndex = 0) {
  if (!ass) return ''

  if (courseCode) {
    const allMatches = extractCompetenciesFromAssessment(ass, courseCode)
    if (allMatches.length > 0 && allMatches[0].phrase) {
      return pickCompetencyPhrase(allMatches[0], variantIndex)
    }
  }

  if (Array.isArray(ass.expectations) && ass.expectations.length > 0) {
    const firstExp = ass.expectations[0]
    const condensed = condenseCurriculumExpectation(firstExp)
    if (condensed) {
      const mapped = courseCode ? mapAssessmentToCompetency(condensed, courseCode, '', variantIndex) : ''
      return mapped || condensed
    }
  }

  if (ass.unitName && !isGenericTitle(ass.unitName)) {
    const cleanUnit = sanitizeTaskTitle(ass.unitName)
    if (cleanUnit && cleanUnit.length > 2) {
      const mapped = courseCode ? mapAssessmentToCompetency(cleanUnit, courseCode, '', variantIndex) : ''
      return mapped || cleanUnit
    }
  }

  if (ass.description && !isGenericTitle(ass.description)) {
    const cleanDesc = sanitizeTaskTitle(ass.description)
    if (cleanDesc && cleanDesc.length > 3) {
      const mapped = courseCode ? mapAssessmentToCompetency(cleanDesc, courseCode, '', variantIndex) : ''
      return mapped || cleanDesc
    }
  }

  if (ass.name && !isGenericTitle(ass.name)) {
    const cleanName = sanitizeTaskTitle(ass.name)
    if (cleanName && !isGenericTitle(cleanName)) {
      const mapped = courseCode ? mapAssessmentToCompetency(cleanName, courseCode, '', variantIndex) : ''
      return mapped || cleanName
    }
  }

  if (ass.categoryName || ass.category) {
    const cat = (ass.categoryName || ass.category).toLowerCase().trim()
    if (CATEGORY_NORMALIZER[cat]) {
      return CATEGORY_NORMALIZER[cat]
    }
  }

  const cleanFallback = sanitizeTaskTitle(ass.name || '')
  return isGenericTitle(cleanFallback) ? '' : cleanFallback
}

// ─── Attempt / Retest & Teacher Note Extraction Helpers ──────────────────────

function extractAttemptPercent(entry, defaultMaxPoints = 100) {
  if (typeof entry === 'number' && !isNaN(entry)) return entry
  if (!entry || typeof entry !== 'object') return null
  if (typeof entry.scorePercent === 'number' && !isNaN(entry.scorePercent)) return entry.scorePercent
  if (typeof entry.percentage === 'number' && !isNaN(entry.percentage)) return entry.percentage
  const max = Number(entry.maxPoints || entry.maxScore || defaultMaxPoints)
  if (typeof entry.pointsEarned === 'number' && !isNaN(entry.pointsEarned) && max > 0) {
    return (entry.pointsEarned / max) * 100
  }
  if (typeof entry.score === 'number' && !isNaN(entry.score) && max > 0) {
    return (entry.score / max) * 100
  }
  return null
}

/**
 * Inspects attempt history or retest fields on an assessment to detect mastered retests
 * (e.g. 49% -> 90% improvement).
 */
export function getAssessmentAttemptInfo(ass) {
  const defaultMax = Number(ass?.maxPoints || ass?.maxScore || 100)
  const rawList = Array.isArray(ass?.attempts)
    ? ass.attempts
    : (Array.isArray(ass?.attemptHistory) ? ass.attemptHistory : [])

  const scores = rawList.map(e => extractAttemptPercent(e, defaultMax)).filter(s => s !== null)

  if (scores.length === 0 && typeof ass?.initialScore === 'number' && typeof (ass?.retestScore ?? ass?.scorePercent) === 'number') {
    scores.push(ass.initialScore, ass.retestScore ?? ass.scorePercent)
  }

  if (scores.length < 2) {
    return {
      hasRetest: false,
      isMasteredViaRetest: false,
      firstScore: scores[0] ?? ass?.scorePercent ?? null,
      latestScore: ass?.scorePercent ?? scores[scores.length - 1] ?? null,
      improvement: 0
    }
  }

  const firstScore = scores[0]
  const latestAttempt = scores[scores.length - 1]
  const resolvedScore = typeof ass?.scorePercent === 'number' ? Math.max(ass.scorePercent, latestAttempt) : latestAttempt
  const improvement = resolvedScore - firstScore
  const isMasteredViaRetest = resolvedScore >= 75 && improvement >= 15

  return {
    hasRetest: true,
    isMasteredViaRetest,
    firstScore,
    latestScore: resolvedScore,
    improvement
  }
}

const DISCIPLINARY_NOTE_REGEX = /\b(phone|cellphone|cell\s*phone|late|tardy|absent|attendance|chatting|talking|disruptive|uniform|hall\s*pass|washroom|device|earbuds|headphones|sleeping|detention|misbehav(?:ed|ing|iour|ior))\b/i
const DIAGNOSTIC_GAP_CUE_REGEX = /\b(need|needs|review|practice|revisit|focus|check|verify|error|errors|mistake|mistakes|missed|gap|gaps|help|support|confused|confusion|incomplete|difficulty|work\s+on|build|consolidate|struggle|weak|incorrect|forgot|forgets|omitted)\b/i
const PRAISE_ONLY_CUE_REGEX = /\b(strong|excel|excels|mastered|impressive|great|accurate|thorough|exceptional|clear\s+mastery)\b/i

/**
 * Strips disciplinary/non-academic clauses from teacher observation notes and extracts
 * curriculum competency matches when present.
 */
function extractCompetencyFromTeacherNote(noteText, courseCode, assessment = null) {
  if (!noteText || typeof noteText !== 'string' || !courseCode) return null
  const clauses = noteText
    .split(/[.;\n]+/)
    .map(c => c.trim())
    .filter(Boolean)

  const academicClauses = clauses.filter(clause => {
    if (!DISCIPLINARY_NOTE_REGEX.test(clause)) return true
    // Only retain a clause mentioning non-academic words if it also explicitly carries diagnostic academic language
    return DIAGNOSTIC_GAP_CUE_REGEX.test(clause)
  })

  if (academicClauses.length === 0) return null
  const cleanedNote = academicClauses.join('. ')
  const matches = extractCompetenciesFromAssessment({ name: cleanedNote, description: cleanedNote }, courseCode)
  if (matches.length === 0) return null

  // If the note is purely praising and on a high-scoring task (>= 82%), don't treat it as a growth gap
  const score = assessment?.scorePercent
  const hasGapCue = DIAGNOSTIC_GAP_CUE_REGEX.test(cleanedNote)
  const hasPraiseOnly = PRAISE_ONLY_CUE_REGEX.test(cleanedNote) && !hasGapCue
  if (hasPraiseOnly && (score == null || score >= 82)) {
    return null
  }

  return {
    competency: resolveCompetencyObject(matches[0].phrase, courseCode) || matches[0],
    cleanedNote,
    hasGapCue,
    score: typeof score === 'number' ? score : null
  }
}

// ─── Pedagogical Student Profile Focus ────────────────────────────────────────

export function deriveStudentProfileFocus(gradeData = {}, learningSkills = {}, options = {}) {
  if (options?.profileFocus && options.profileFocus !== 'auto') {
    const manualMap = {
      inquiry_practical: { key: 'modality_practical', label: 'Hands-on Labs & Inquiry', badge: 'Practical Inquiry' },
      modality_practical: { key: 'modality_practical', label: 'Hands-on Labs & Inquiry', badge: 'Practical Inquiry' },
      analytical_theory: { key: 'modality_analytical', label: 'Analytical Problem Solving', badge: 'Analytical Focus' },
      modality_analytical: { key: 'modality_analytical', label: 'Analytical Problem Solving', badge: 'Analytical Focus' },
      growth_trajectory: { key: 'trajectory_improving', label: 'Rising Momentum', badge: 'Improving Trend' },
      trajectory_improving: { key: 'trajectory_improving', label: 'Rising Momentum', badge: 'Improving Trend' },
      consistent_rigor: { key: 'consistency_high', label: 'Consistent Performance', badge: 'High Consistency' },
      consistency_high: { key: 'consistency_high', label: 'Consistent Performance', badge: 'High Consistency' },
      category_thinking: { key: 'category_thinking', label: 'Critical Thinking', badge: 'Critical Thinking' },
      category_communication: { key: 'category_communication', label: 'Technical Communication', badge: 'Communication' },
      category_application: { key: 'category_application', label: 'Real-World Application', badge: 'Application' },
      qualitative_evidence: { key: 'qualitative_triangulation', label: 'Triangulation (Observations/Conversations)', badge: 'Observations' },
      qualitative_triangulation: { key: 'qualitative_triangulation', label: 'Triangulation (Observations/Conversations)', badge: 'Observations' },
      learning_skills: { key: 'work_habits', label: 'Learning Skills & Work Habits', badge: 'Work Habits' },
      work_habits: { key: 'work_habits', label: 'Learning Skills & Work Habits', badge: 'Work Habits' },
      curriculum_general: { key: 'curriculum_general', label: 'Curriculum Application', badge: 'Curriculum Focus' }
    }
    const found = manualMap[options.profileFocus] || { key: options.profileFocus, label: options.profileFocus, badge: 'Selected Focus' }
    if (options?.mode === 'secondary' && (found.key === 'work_habits' || found.key === 'learning_skills')) {
      return { key: 'curriculum_general', label: 'Curriculum Application', badge: 'Curriculum Focus', metric: '' }
    }
    return { ...found, metric: '' }
  }

  if (options?.includeWorkHabits && options?.mode !== 'secondary') {
    return { key: 'work_habits', label: 'Learning Skills & Work Habits', badge: 'Work Habits', metric: '' }
  }

  const assessments = Array.isArray(gradeData?.assessments)
    ? gradeData.assessments.filter(a => typeof a.scorePercent === 'number' && !isCommentExcludedAssessment(a, gradeData))
    : []

  // 1. Trajectory / Rising Momentum
  const sbar = Array.isArray(gradeData?.sbarExpectations) ? gradeData.sbarExpectations : []
  const improvingExpectations = sbar.filter(e => e.trend === 'improving' || e.trend === '+')
  if (improvingExpectations.length >= 2 || (improvingExpectations.length >= 1 && sbar.length <= 3)) {
    return {
      key: 'trajectory_improving',
      label: 'Rising Momentum',
      badge: 'Improving Trend',
      metric: `${improvingExpectations.length} expectations rising`
    }
  }

  if (assessments.length >= 3) {
    const sortedByDate = [...assessments].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    const mid = Math.floor(sortedByDate.length / 2)
    const earlier = sortedByDate.slice(0, mid)
    const recent = sortedByDate.slice(mid)
    const avgEarlier = earlier.reduce((sum, a) => sum + a.scorePercent, 0) / earlier.length
    const avgRecent = recent.reduce((sum, a) => sum + a.scorePercent, 0) / recent.length
    const diff = Math.round(avgRecent - avgEarlier)

    if (diff >= 7) {
      return {
        key: 'trajectory_improving',
        label: `Rising Momentum (+${diff}%)`,
        badge: 'Improving Trend',
        metric: `+${diff}% recently`
      }
    }
  }

  if (assessments.some(a => getAssessmentAttemptInfo(a).isMasteredViaRetest)) {
    const bestGain = Math.max(...assessments.map(a => Math.round(getAssessmentAttemptInfo(a).improvement || 0)))
    return {
      key: 'trajectory_improving',
      label: `Rising Momentum (+${bestGain}% retest)`,
      badge: 'Improving Trend',
      metric: `+${bestGain}% via reassessment`
    }
  }

  // 2. Modality comparison (Practical Inquiry vs Analytical Problem Solving)
  if (assessments.length >= 2) {
    const labAssessments = assessments.filter(a => {
      const name = (a.name || '').toLowerCase()
      const cat = (a.categoryName || a.category || '').toLowerCase()
      return name.includes('lab') || name.includes('inquiry') || name.includes('investigation') || cat.includes('lab')
    })
    const testAssessments = assessments.filter(a => {
      const name = (a.name || '').toLowerCase()
      const cat = (a.categoryName || a.category || '').toLowerCase()
      return name.includes('test') || name.includes('quiz') || name.includes('exam') || cat.includes('test')
    })

    if (labAssessments.length > 0 && testAssessments.length > 0) {
      const avgLab = labAssessments.reduce((sum, a) => sum + a.scorePercent, 0) / labAssessments.length
      const avgTest = testAssessments.reduce((sum, a) => sum + a.scorePercent, 0) / testAssessments.length
      const labAdvantage = Math.round(avgLab - avgTest)

      if (labAdvantage >= 6) {
        return {
          key: 'modality_practical',
          label: `Stronger in Practical/Labs (+${labAdvantage}%)`,
          badge: 'Practical Inquiry',
          metric: `${Math.round(avgLab)}% labs vs ${Math.round(avgTest)}% tests`
        }
      }
      if (labAdvantage <= -6) {
        const testAdvantage = Math.abs(labAdvantage)
        return {
          key: 'modality_analytical',
          label: `Stronger in Analytical/Tests (+${testAdvantage}%)`,
          badge: 'Analytical Focus',
          metric: `${Math.round(avgTest)}% tests vs ${Math.round(avgLab)}% labs`
        }
      }
    }
  }

  // 3. Achievement Chart Categories
  const catSource = (Array.isArray(gradeData.categories) && gradeData.categories.length > 0)
    ? gradeData.categories
    : (gradeData.categoryResults ? Object.values(gradeData.categoryResults).filter(Boolean).map(c => ({
        name: c.name,
        average: c.percentage,
        weight: c.weight
      })) : [])

  const academicCats = catSource.filter(c => typeof c.average === 'number' && !isNonAcademicCategory(c.name) && (c.weight === undefined || Number(c.weight) > 0))
  if (academicCats.length >= 2) {
    const sortedCats = [...academicCats].sort((a, b) => b.average - a.average)
    const topCat = sortedCats[0]
    const lowestCat = sortedCats[sortedCats.length - 1]
    const catDiff = Math.round(topCat.average - lowestCat.average)

    if (catDiff >= 8) {
      const catName = (topCat.name || '').toLowerCase()
      if (catName.includes('think') || catName.includes('inquiry')) {
        return {
          key: 'category_thinking',
          label: `Thinking & Inquiry Strength (${Math.round(topCat.average)}%)`,
          badge: 'Critical Thinking',
          metric: `${Math.round(topCat.average)}% in Thinking`
        }
      }
      if (catName.includes('comm')) {
        return {
          key: 'category_communication',
          label: `Communication Strength (${Math.round(topCat.average)}%)`,
          badge: 'Communication',
          metric: `${Math.round(topCat.average)}% in Communication`
        }
      }
      if (catName.includes('app')) {
        return {
          key: 'category_application',
          label: `Application Strength (${Math.round(topCat.average)}%)`,
          badge: 'Application',
          metric: `${Math.round(topCat.average)}% in Application`
        }
      }
    }
  }

  // 4. High Consistency (SD <= 5% across assessments with mark >= 70%)
  if (assessments.length >= 3) {
    const scores = assessments.map(a => a.scorePercent)
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)

    if (stdDev <= 5 && mean >= 70) {
      return {
        key: 'consistency_high',
        label: `High Consistency (±${Math.round(stdDev)}%)`,
        badge: 'High Consistency',
        metric: `Consistent ${Math.round(mean)}%`
      }
    }
  }

  // 5. Qualitative Triangulation
  const hasObservations = (gradeData?.observations && gradeData.observations.length > 0) ||
    assessments.some(a => (a.assessmentType === 'observation' || a.modality === 'observation') && a.scorePercent >= 75) ||
    (gradeData?.events && gradeData.events.some(e => e.type === 'observation' || e.eventType === 'observation'))
  const hasConversations = (gradeData?.conversations && gradeData.conversations.length > 0) ||
    assessments.some(a => (a.assessmentType === 'conversation' || a.modality === 'conversation') && a.scorePercent >= 75) ||
    (gradeData?.events && gradeData.events.some(e => e.type === 'conversation' || e.eventType === 'conversation'))

  if (hasObservations || hasConversations) {
    return {
      key: 'qualitative_triangulation',
      label: 'Triangulation of Evidence',
      badge: 'Triangulated Evidence',
      metric: (hasObservations && hasConversations) ? 'Conversations + Observations' : (hasConversations ? 'Classroom Conversations' : 'Teacher Observations')
    }
  }

  return {
    key: 'curriculum_general',
    label: 'Curriculum Application',
    badge: 'Curriculum Focus',
    metric: ''
  }
}

// ─── Evidence Extraction Engine ──────────────────────────────────────────────

/**
 * Extracts best strength, growth, shortTopics, and concept-matched tool evidence
 * from available gradebook data (SBAR expectations, assessments with retest & cutoff
 * awareness, inline teacher notes, and category averages).
 */
export function extractEvidenceFromGrades(gradeData = {}, courseCode = '', options = {}) {
  const { sbarExpectations = [], assessments = [], categories = [] } = gradeData
  const resolvedCourseCode = courseCode || gradeData.courseCode || ''
  const variantSeed = Math.abs(Math.floor(Number(options?.variantSeed) || 0))
  const isFinalPeriod = Boolean(
    options?.isFinal ||
    options?.reportingPeriod === 'Final' ||
    gradeData?.isFinal ||
    gradeData?.reportingPeriod === 'Final'
  )

  let strengthTask = null
  let strengthShortTopic = null
  let strengthComp = null
  let strengthSource = 'holistic'
  let strengthScore = null
  let strengthModality = 'general'

  let growthTask = null
  let growthShortTopic = null
  let growthComp = null
  let growthSource = 'holistic'
  let growthScore = null
  let growthModality = 'general'

  const retestMasteredTasks = []

  // 1. Try SBAR Expectations first
  if (Array.isArray(sbarExpectations) && sbarExpectations.length > 0) {
    const sorted = [...sbarExpectations].filter(e => e.average != null || e.masteryLevel != null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))

    if (sorted.length > 0) {
      const top = sorted[0]
      const condensedTop = condenseCurriculumExpectation(top)
      const rawTop = condensedTop || top.title || top.description || (top.code ? `Expectation ${top.code}` : null)
      strengthComp = resolvedCourseCode ? resolveCompetencyObject(rawTop, resolvedCourseCode) : null
      const mappedTop = strengthComp ? pickCompetencyPhrase(strengthComp, variantSeed) : ''
      strengthTask = mappedTop || sanitizeTaskTitle(rawTop)
      strengthShortTopic = strengthComp ? pickCompetencyShortTopic(strengthComp, variantSeed) : strengthTask
      strengthSource = 'sbar'
      strengthScore = top.average ?? (top.masteryLevel ? Number(top.masteryLevel) * 25 : null)
      strengthModality = 'expectation'

      const strengthLower = (strengthTask || '').trim().toLowerCase()
      for (let i = sorted.length - 1; i >= 1; i--) {
        const low = sorted[i]
        const condensedLow = condenseCurriculumExpectation(low)
        const rawLow = condensedLow || low.title || low.description || (low.code ? `Expectation ${low.code}` : null)
        const candComp = resolvedCourseCode ? resolveCompetencyObject(rawLow, resolvedCourseCode) : null
        const mappedLow = candComp ? pickCompetencyPhrase(candComp, variantSeed === 0 ? 0 : variantSeed + 1) : ''
        const candidateGrowth = mappedLow || sanitizeTaskTitle(rawLow)
        const sameComp = strengthComp && candComp && strengthComp.label === candComp.label
        if (candidateGrowth && !sameComp && candidateGrowth.trim().toLowerCase() !== strengthLower) {
          growthComp = candComp
          growthTask = candidateGrowth
          growthShortTopic = candComp ? pickCompetencyShortTopic(candComp, variantSeed === 0 ? 0 : variantSeed + 1) : candidateGrowth
          growthSource = 'sbar'
          growthScore = low.average ?? (low.masteryLevel ? Number(low.masteryLevel) * 25 : null)
          growthModality = 'expectation'
          break
        }
      }
    }
  }

  // 2. Fall back to Individual Assessments if SBAR not present
  if (!strengthTask && Array.isArray(assessments) && assessments.length > 0) {
    const validRaw = assessments
      .map((a, idx) => ({ ...a, _origIndex: idx, _attemptInfo: getAssessmentAttemptInfo(a) }))
      .filter(a => typeof a.scorePercent === 'number' && !isCommentExcludedAssessment(a, gradeData))

    validRaw.forEach(a => {
      if (a._attemptInfo.isMasteredViaRetest && a.name) {
        retestMasteredTasks.push(a.name)
      }
    })

    // Tag post-midterm / second-half assessments when Final period and >= 4 assessments
    if (isFinalPeriod && validRaw.length >= 4) {
      const hasExplicitTermTag = validRaw.some(a =>
        a.isPostMidterm !== undefined ||
        /final|term\s*2|post-midterm/i.test(String(a.term || a.reportingPeriod || ''))
      )
      if (hasExplicitTermTag) {
        validRaw.forEach(a => {
          a._isPostMidterm = Boolean(
            a.isPostMidterm ||
            /final|term\s*2|post-midterm/i.test(String(a.term || a.reportingPeriod || ''))
          )
        })
      } else {
        const chrono = [...validRaw].sort((a, b) => {
          if (a.date && b.date) {
            const diff = new Date(a.date) - new Date(b.date)
            if (diff !== 0) return diff
          }
          return a._origIndex - b._origIndex
        })
        const cutoffIdx = Math.floor(chrono.length / 2)
        const postSet = new Set(chrono.slice(cutoffIdx))
        validRaw.forEach(a => {
          a._isPostMidterm = postSet.has(a)
        })
      }
    }

    const valid = [...validRaw].sort((a, b) => b.scorePercent - a.scorePercent)

    if (valid.length > 0) {
      const strengthRankScore = (a) => {
        let score = a.scorePercent
        if (typeof a.classMedian === 'number' && !isNaN(a.classMedian)) {
          score += (a.scorePercent - a.classMedian) * 0.75
        }
        if (typeof a.weight === 'number' && a.weight > 0) {
          score += Math.min(8, Math.log1p(a.weight) * 2)
        }
        if (isFinalPeriod && a._isPostMidterm) {
          score += 12
        }
        return score
      }

      const rankedForStrength = [...valid].sort((a, b) => strengthRankScore(b) - strengthRankScore(a))
      const topAss = rankedForStrength[0]
      const topMatches = resolvedCourseCode ? extractCompetenciesFromAssessment(topAss, resolvedCourseCode) : []
      strengthComp = topMatches.length > 0
        ? (resolveCompetencyObject(topMatches[0].phrase, resolvedCourseCode) || topMatches[0])
        : null
      strengthTask = strengthComp
        ? pickCompetencyPhrase(strengthComp, variantSeed)
        : resolveAssessmentTaskName(topAss, resolvedCourseCode, variantSeed)
      strengthShortTopic = strengthComp
        ? pickCompetencyShortTopic(strengthComp, variantSeed)
        : formatCurriculumTopic(strengthTask)
      strengthSource = 'assessment'
      strengthScore = topAss.scorePercent
      strengthModality = topAss.assessmentType || (topAss.name?.toLowerCase().includes('lab') ? 'practical' : 'analytical')

      const strengthLower = (strengthTask || '').trim().toLowerCase()
      const growthVariant = variantSeed === 0 ? 0 : variantSeed + 1

      // 2a. Check Inline Teacher Notes / Observations first for diagnostic curriculum gaps
      const noteCandidates = []
      if (resolvedCourseCode) {
        const globalNotes = [
          gradeData.teacherNote,
          gradeData.note,
          ...(Array.isArray(gradeData.observations) ? gradeData.observations.map(o => (typeof o === 'string' ? o : o?.note || o?.comment || o?.text || '')) : []),
          ...(Array.isArray(gradeData.events) ? gradeData.events.filter(e => e.type === 'observation' || e.eventType === 'observation' || e.type === 'note').map(e => e.note || e.comment || e.description || '') : [])
        ].filter(Boolean)

        for (const gn of globalNotes) {
          const hit = extractCompetencyFromTeacherNote(gn, resolvedCourseCode, null)
          if (hit) noteCandidates.push({ ...hit, priority: hit.hasGapCue ? 2 : 1, isPostMidterm: true })
        }

        for (const ass of valid) {
          const attemptNotes = Array.isArray(ass.attempts)
            ? ass.attempts.map(at => at?.comment || at?.note || '').filter(Boolean)
            : []
          const rawNotes = [ass.note, ass.comment, ass.teacherNote, ...attemptNotes].filter(Boolean)
          for (const rn of rawNotes) {
            const hit = extractCompetencyFromTeacherNote(rn, resolvedCourseCode, ass)
            if (hit && (hit.hasGapCue || ass.scorePercent < 82)) {
              noteCandidates.push({
                ...hit,
                priority: (hit.hasGapCue ? 3 : 1) + (ass._isPostMidterm ? 1 : 0),
                isPostMidterm: Boolean(ass._isPostMidterm)
              })
            }
          }
        }
      }

      if (noteCandidates.length > 0) {
        noteCandidates.sort((a, b) => b.priority - a.priority || (a.score ?? 100) - (b.score ?? 100))
        for (const cand of noteCandidates) {
          const sameComp = strengthComp && cand.competency?.label === strengthComp.label
          const candPhrase = pickCompetencyPhrase(cand.competency, growthVariant)
          if (!sameComp && candPhrase.trim().toLowerCase() !== strengthLower) {
            growthComp = cand.competency
            growthTask = candPhrase
            growthShortTopic = pickCompetencyShortTopic(cand.competency, growthVariant)
            growthSource = 'teacher_note'
            growthScore = cand.score
            growthModality = 'observation'
            break
          }
        }
      }

      // 2b. Select lowest non-retest-mastered assessment (prioritizing post-midterm on Final >= 4 assessments)
      if (!growthTask) {
        const growthCandidates = valid
          .filter(a => a !== topAss && a.name !== topAss.name)
          .sort((a, b) => {
            // Avoid selecting retest-mastered assessments when other non-retest tasks exist
            if (a._attemptInfo.isMasteredViaRetest !== b._attemptInfo.isMasteredViaRetest) {
              return a._attemptInfo.isMasteredViaRetest ? 1 : -1
            }
            // On Final with >= 4 assessments, prioritize second-half / post-midterm assessments
            const aEff = a.scorePercent - (isFinalPeriod && a._isPostMidterm ? 12 : 0)
            const bEff = b.scorePercent - (isFinalPeriod && b._isPostMidterm ? 12 : 0)
            return aEff - bEff
          })

        for (const lowAss of growthCandidates) {
          const allMatches = resolvedCourseCode ? extractCompetenciesFromAssessment(lowAss, resolvedCourseCode) : []
          let matchedComp = allMatches.length > 0
            ? (resolveCompetencyObject(allMatches[0].phrase, resolvedCourseCode) || allMatches[0])
            : null

          // If top match collides with strengthComp, try secondary competency match on the same assessment
          if (matchedComp && strengthComp && matchedComp.label === strengthComp.label && allMatches.length > 1) {
            matchedComp = resolveCompetencyObject(allMatches[1].phrase, resolvedCourseCode) || allMatches[1]
          }

          if (matchedComp && strengthComp && matchedComp.label === strengthComp.label) {
            continue
          }

          const candidateGrowth = matchedComp
            ? pickCompetencyPhrase(matchedComp, growthVariant)
            : resolveAssessmentTaskName(lowAss, resolvedCourseCode, growthVariant)

          if (candidateGrowth && candidateGrowth.trim().toLowerCase() !== strengthLower) {
            growthComp = matchedComp
            growthTask = candidateGrowth
            growthShortTopic = matchedComp
              ? pickCompetencyShortTopic(matchedComp, growthVariant)
              : formatCurriculumTopic(candidateGrowth)
            growthSource = 'assessment'
            growthScore = lowAss.scorePercent
            growthModality = lowAss.assessmentType || (lowAss.name?.toLowerCase().includes('lab') ? 'practical' : 'analytical')
            break
          }
        }
      }

      // 2c. Single comprehensive assessment fallback: pick second-best competency on that assessment
      if (!growthTask && valid.length === 1 && resolvedCourseCode) {
        const allMatches = extractCompetenciesFromAssessment(topAss, resolvedCourseCode)
        if (allMatches.length > 1) {
          const secondComp = resolveCompetencyObject(allMatches[1].phrase, resolvedCourseCode) || allMatches[1]
          const secondPhrase = pickCompetencyPhrase(secondComp, growthVariant)
          if (secondPhrase.trim().toLowerCase() !== strengthLower) {
            growthComp = secondComp
            growthTask = secondPhrase
            growthShortTopic = pickCompetencyShortTopic(secondComp, growthVariant)
            growthSource = 'assessment'
            growthScore = topAss.scorePercent
          }
        }
      }
    }
  }

  // 3. Fall back to Categories
  const catSource = (Array.isArray(categories) && categories.length > 0)
    ? categories
    : (gradeData.categoryResults ? Object.values(gradeData.categoryResults).filter(Boolean).map(c => ({
        name: c.name,
        average: c.percentage,
        weight: c.weight
      })) : [])

  if (!strengthTask && Array.isArray(catSource) && catSource.length > 0) {
    const validCats = catSource.filter(c => {
      if (typeof c.average !== 'number') return false
      if (isNonAcademicCategory(c.name)) return false
      const nameLower = (c.name || '').trim().toLowerCase()
      if (nameLower.includes('formative') || nameLower.includes('diagnostic') || nameLower.includes('practice')) return false
      if (c.weight !== undefined && Number(c.weight) <= 0) return false
      return true
    }).sort((a, b) => b.average - a.average)

    if (validCats.length > 0) {
      const topCat = validCats[0]
      const catLower = (topCat.name || '').trim().toLowerCase()
      strengthTask = CATEGORY_NORMALIZER[catLower] || topCat.name
      strengthShortTopic = strengthTask
      strengthSource = 'category'
      strengthScore = topCat.average

      const lowCat = validCats[validCats.length - 1]
      if (validCats.length > 1 && lowCat) {
        const lowCatLower = (lowCat.name || '').trim().toLowerCase()
        growthTask = CATEGORY_NORMALIZER[lowCatLower] || lowCat.name
        growthShortTopic = growthTask
        growthSource = 'category'
        growthScore = lowCat.average
      }
    }
  }

  const recommendedTool = growthComp
    ? pickCompetencyTool(growthComp, variantSeed)
    : mapAssessmentToTool(growthTask || '', resolvedCourseCode, '', variantSeed)

  const profile = deriveStudentProfileFocus(gradeData, {}, options)

  return {
    strengthTask,
    strengthShortTopic,
    strengthLabel: strengthComp?.label || null,
    strengthSource,
    strengthScore,
    strengthModality,
    growthTask,
    growthShortTopic,
    growthLabel: growthComp?.label || null,
    growthSource,
    growthScore,
    growthModality,
    recommendedTool,
    retestMasteredTasks,
    profileFocus: profile.key
  }
}

// ─── Anti-Repetition & Seeding Utilities ─────────────────────────────────────

/**
 * Detects if Sentence 1 and Sentence 2 share the same evaluative main verb.
 */
export function hasVerbClash(s1, s2) {
  if (!s1 || !s2) return false
  const verbs = [
    'demonstrates?',
    'shows?',
    'applies?',
    'exhibits?',
    'excels?',
    'continues?'
  ]
  for (const verb of verbs) {
    const re = new RegExp(`\\b${verb}\\b`, 'i')
    if (re.test(s1) && re.test(s2)) return true
  }
  return false
}

export function computeStudentVariantSeed(student = {}, contextKey = '', rosterIndex = -1) {
  let contextOffset = 0
  const cleanCtx = String(contextKey || '').trim()
  if (cleanCtx === 'Midterm' || cleanCtx === 'Term 1') {
    contextOffset = 1
  } else if (cleanCtx === 'Final' || cleanCtx === 'Term 2') {
    contextOffset = 2
  } else if (cleanCtx && cleanCtx !== 'Progress Report') {
    let h = 2166136261
    for (let i = 0; i < cleanCtx.length; i++) {
      h ^= cleanCtx.charCodeAt(i)
      h = Math.imul(h, 16777619) >>> 0
    }
    contextOffset = h % 512
  }

  if (typeof rosterIndex === 'number' && rosterIndex >= 0) {
    return (rosterIndex * 5 + contextOffset) % 512
  }

  const idStr = String(
    student?.studentId ||
    student?.id ||
    `${student?.firstName || ''}_${student?.lastName || ''}_${student?.preferredName || ''}`
  ).trim()

  if (!idStr || idStr === '__') {
    return contextOffset % 512
  }

  let hash = 2166136261
  for (let i = 0; i < idStr.length; i++) {
    hash ^= idStr.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }

  return (hash + contextOffset) % 512
}

export function normalizeCommentTemplate(commentText = '', student = {}) {
  if (!commentText) return ''
  const tokens = getPronounTokens(student, 'preferred')
  let norm = String(commentText).trim()

  if (tokens.name && tokens.name.length > 1) {
    const escapedName = tokens.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    norm = norm.replace(new RegExp(`\\b${escapedName}'s\\b`, 'gi'), '{POSS}')
    norm = norm.replace(new RegExp(`\\b${escapedName}\\b`, 'gi'), '{NAME}')
  }

  norm = norm
    .replace(/\b(he|she|they)\b/gi, '{SUBJ}')
    .replace(/\b(him|her|them)\b/gi, '{OBJ}')
    .replace(/\b(his|hers|their|theirs)\b/gi, '{POSS}')
    .replace(/\b(himself|herself|themselves)\b/gi, '{REFL}')

  return norm.toLowerCase()
}

// ─── ORCCG Core Triad & 6 Syntactic Blueprints (Secondary) ──────────────────

function getProfileBlueprintContext(profileKey, dept, isBelowStandard, variant = 0) {
  const isSci = dept === 'science'
  const isMath = dept === 'math'
  const idx = Math.abs(variant)

  const pick = (arr) => arr[idx % arr.length]

  if (isBelowStandard) {
    if (profileKey === 'modality_practical') {
      return {
        opener: pick(['During hands-on activities,', 'In guided practical tasks,']),
        tail: 'engaging steadily during practical inquiries',
        shortTail: ''
      }
    }
    return {
      opener: pick(['With structured guidance,', 'During guided classroom tasks,']),
      tail: 'engaging with foundational concepts through step-by-step support',
      shortTail: ''
    }
  }

  switch (profileKey) {
    case 'modality_practical':
      return {
        opener: isSci
          ? pick(['During hands-on lab inquiries,', 'In practical investigations,'])
          : (isMath ? pick(['During hands-on modelling tasks,', 'In exploratory class tasks,']) : pick(['During interactive workshops,', 'In collaborative inquiries,'])),
        tail: isSci
          ? 'connecting experimental observations to core principles'
          : (isMath ? 'connecting concrete models to algebraic concepts' : 'connecting class inquiries to core course themes'),
        shortTail: isSci ? ' during lab inquiries' : ''
      }
    case 'modality_analytical':
      return {
        opener: isSci || isMath
          ? pick(['Across quantitative problem solving,', 'During analytical evaluations,'])
          : pick(['During close textual analysis,', 'In analytical writing tasks,']),
        tail: isSci || isMath
          ? 'organizing multi-step reasoning with clear precision'
          : 'structuring textual analysis with clear reasoning',
        shortTail: ' in analytical tasks'
      }
    case 'trajectory_improving':
      return {
        opener: pick(['Across recent units,', 'Building momentum across recent tasks,']),
        tail: 'showing clear upward growth across recent evaluations',
        shortTail: ' with steady recent growth'
      }
    case 'consistency_high':
      return {
        opener: pick(['Across unit evaluations,', 'Maintaining steady precision,']),
        tail: isSci || isMath
          ? 'producing accurate, well-organized solutions across units'
          : 'producing thoughtful, well-organized work across units',
        shortTail: ' consistently across units'
      }
    case 'category_thinking':
      return {
        opener: pick(['During critical-thinking inquiries,', 'When analyzing unfamiliar problems,']),
        tail: 'evaluating evidence with thoughtful critical reasoning',
        shortTail: ' through critical inquiry'
      }
    case 'category_communication':
      return {
        opener: isSci || isMath
          ? pick(['Using clear technical terminology,', 'Communicating reasoning clearly,'])
          : pick(['Communicating ideas clearly,', 'In written and seminar responses,']),
        tail: isSci || isMath
          ? 'communicating intermediate steps and terminology clearly'
          : 'articulating arguments with clarity and precision',
        shortTail: ' with clear communication'
      }
    case 'category_application':
      return {
        opener: pick(['Connecting concepts to real contexts,', 'When tackling applied scenarios,']),
        tail: 'transferring learned principles to practical applications',
        shortTail: ' across applied contexts'
      }
    case 'qualitative_triangulation':
      return {
        opener: pick(['Through classroom discussions,', 'During class observations and dialogue,']),
        tail: 'articulating conceptual understanding clearly in dialogue',
        shortTail: ' in classroom discussions'
      }
    default:
      return {
        opener: isSci
          ? pick(['During unit labs and evaluations,', 'Across scientific inquiries,'])
          : (isMath ? pick(['During unit assessments,', 'Across problem-solving tasks,']) : pick(['Across written tasks and seminars,', 'During course inquiries,'])),
        tail: isSci || isMath
          ? 'organizing multi-step reasoning logically'
          : 'supporting written ideas with clear evidence',
        shortTail: ''
      }
  }
}

function getStrengthQualifierPhrase(level, isBelowStandard, variant = 0) {
  const idx = Math.abs(variant)
  if (isBelowStandard) {
    const rel = [
      'relative strength and clearer focus',
      'greater confidence on structured tasks',
      'their clearest grasp of concepts this term'
    ]
    return rel[idx % rel.length]
  }
  const map = {
    '4+': ['exceptional analytical depth', 'thorough conceptual mastery', 'consistent insight and clarity'],
    '4': ['thorough conceptual understanding', 'strong analytical skill and clarity', 'commendable accuracy and skill'],
    '3': ['considerable competence and clarity', 'solid conceptual understanding', 'reliable skill and organization'],
    '2': ['developing consistency', 'emerging understanding with guidance', 'growing familiarity with core ideas'],
    '1': ['emerging capability with support', 'developing familiarity through scaffolding'],
    'R': ['initial engagement with direct guidance', 'foundational familiarity with structured support']
  }
  const list = map[level.key] || map['3']
  return list[idx % list.length]
}

function getGrowthGapPhrasing(tokens, growthLevel, overallLevel, gGerund, gShort, isCompact, variant = 0) {
  const idx = Math.abs(variant)
  const gIsGerund = isGerundPhrase(gGerund)
  const shortIsGerund = isGerundPhrase(gShort)
  const prepWithShort = shortIsGerund ? `when ${gShort}` : `with ${gShort}`
  const prepInShort = shortIsGerund ? `when ${gShort}` : `in ${gShort}`
  const nounForConsolidate = shortIsGerund ? `skills when ${gShort}` : gShort

  if (overallLevel.key === 'R' || overallLevel.key === '1') {
    const belowBridge = idx % 2 === 0
      ? 'while overall achievement remains below the provincial standard'
      : 'although foundational gaps remain'

    return {
      diagnosticSentence: isCompact
        ? `Building consistency ${prepWithShort} is a priority, ${belowBridge}.`
        : `Building foundational skills ${prepWithShort} remains an essential focus, ${belowBridge}.`,
      pivotClause: `overall achievement remains below the provincial standard and ${prepInShort.startsWith('when ') ? `fluency ${prepInShort}` : gShort} requires guided reinforcement`,
      consolidationSentence: `Developing core familiarity ${prepWithShort} is key, ${belowBridge}.`,
      whileClause: `overall achievement remains below the provincial standard as ${tokens.subjectLower} ${v(tokens, 'builds', 'build')} skills ${prepWithShort}`,
      prepWithShort,
      prepInShort
    }
  }

  switch (growthLevel.key) {
    case '4+':
      return {
        diagnosticSentence: isCompact
          ? `Extending reasoning ${prepInShort} will deepen mastery.`
          : `Extending critical reasoning to unfamiliar scenarios ${prepInShort} will deepen mastery.`,
        pivotClause: `tackling open-ended extensions ${prepInShort} offers room to stretch mastery`,
        consolidationSentence: `Exploring advanced extensions ${prepInShort} is a great next focus.`,
        whileClause: `${tokens.subjectLower} ${v(tokens, 'continues', 'continue')} extending conceptual depth ${prepInShort}`,
        prepWithShort,
        prepInShort
      }
    case '4':
      return {
        diagnosticSentence: isCompact
          ? `${tokens.possessiveCapital} next focus is refining precision ${prepInShort}.`
          : `${tokens.possessiveCapital} next milestone is refining written justifications ${prepInShort}.`,
        pivotClause: `refining full justifications ${prepInShort} will elevate work toward Level 4+`,
        consolidationSentence: `Sharpening full justifications ${prepInShort} is a valuable focus for growth.`,
        whileClause: `${tokens.subjectLower} ${v(tokens, 'refines', 'refine')} multi-step justifications ${prepInShort}`,
        prepWithShort,
        prepInShort
      }
    case '3':
      return {
        diagnosticSentence: idx % 2 === 0
          ? `${tokens.possessiveCapital} next focus is ${gIsGerund && isCompact === false ? gGerund : `building consistency ${prepWithShort}`}.`
          : `Further practice is helpful when ${gGerund} to build greater precision.`,
        pivotClause: `strengthening consistency ${prepWithShort} remains an area for continued focus`,
        consolidationSentence: `Consolidating ${nounForConsolidate} is an important focus for ongoing growth.`,
        whileClause: `${tokens.subjectLower} ${v(tokens, 'is', 'are')} continuing to build consistency ${prepWithShort}`,
        prepWithShort,
        prepInShort
      }
    case '2':
      return {
        diagnosticSentence: idx % 2 === 0
          ? `Building steadier accuracy ${prepWithShort} is ${tokens.possessive} next learning milestone.`
          : `Further guided practice is needed when ${gGerund} to build confidence.`,
        pivotClause: `consolidating accuracy ${prepWithShort} remains an area for continued growth`,
        consolidationSentence: `Consolidating ${nounForConsolidate} with regular practice is a key focus.`,
        whileClause: `${tokens.subjectLower} ${v(tokens, 'works', 'work')} to consolidate accuracy ${prepWithShort}`,
        prepWithShort,
        prepInShort
      }
    default: // '1' or 'R' when overall is higher
      return {
        diagnosticSentence: `Targeted practice ${prepWithShort} is needed to strengthen foundational accuracy.`,
        pivotClause: `building foundational familiarity ${prepWithShort} requires guided support`,
        consolidationSentence: `Strengthening ${nounForConsolidate} through structured practice is a priority.`,
        whileClause: `${tokens.subjectLower} ${v(tokens, 'builds', 'build')} foundational confidence ${prepWithShort}`,
        prepWithShort,
        prepInShort
      }
  }
}

function getToolGoalSuffix(growthLevel, dept, isFinal, tokens, gShort, variant = 0) {
  const isStem = dept === 'science' || dept === 'math'
  const idx = Math.abs(variant)
  const shortIsGerund = isGerundPhrase(gShort)
  const inShort = shortIsGerund ? `when ${gShort}` : `in ${gShort}`

  if (isFinal) {
    if (growthLevel.key === 'R') {
      return {
        outcome: 'rebuild core expectations toward credit recovery',
        finalFull: null // Handled explicitly for Level R credit recovery
      }
    }
    const finalMap = {
      '4+': ['carry deep analytical insight into senior courses', 'tackle rigorous inquiries in subsequent studies'],
      '4': ['sustain high precision in senior courses', 'excel across multi-step challenges in subsequent studies'],
      '3': ['consolidate core skills for subsequent studies', 'transition smoothly into higher-level coursework'],
      '2': ['reinforce core concepts for future academic studies', 'build readiness prior to subsequent courses'],
      '1': ['review foundational skills before subsequent courses', 'solidify essential concepts for future academic studies']
    }
    const list = finalMap[growthLevel.key] || finalMap['3']
    return { outcome: list[idx % list.length], finalFull: null }
  }

  const termMap = {
    '4+': [
      'extend mastery to non-routine challenges',
      'justify nuanced conclusions clearly',
      'explore complex applications independently'
    ],
    '4': isStem
      ? [
          'verify multi-step solutions and reach Level 4+ consistency',
          'articulate full reasoning on evaluations',
          'refine technical explanations to Level 4+ depth'
        ]
      : [
          'refine supporting evidence and reach Level 4+ consistency',
          'elevate analytical depth on evaluations',
          'polish nuanced arguments across evaluations'
        ],
    '3': isStem
      ? [
          'verify intermediate steps systematically',
          'consolidate accuracy before evaluations',
          'organize key steps and check solutions',
          'strengthen precision during unit practice'
        ]
      : [
          'organize supporting evidence clearly',
          'strengthen clarity before evaluations',
          'structure analytical arguments consistently',
          'refine written depth during practice'
        ],
    '2': isStem
      ? [
          'break multi-step problems into clear steps',
          'build steadier confidence during practice',
          'organize core procedures and check accuracy'
        ]
      : [
          'structure written ideas clearly',
          'build steadier confidence during practice',
          'connect key evidence to main points'
        ],
    '1': [
      'organize foundational steps with extra help',
      'build confidence alongside guided practice',
      'reinforce core skills step by step'
    ],
    'R': [
      'complete essential tasks and build toward the provincial standard',
      'strengthen core skills with tutorial support',
      'rebuild foundational competencies step by step'
    ]
  }
  const list = termMap[growthLevel.key] || termMap['3']
  return { outcome: list[idx % list.length], finalFull: null }
}

function formatToolPhrase(tool) {
  const clean = String(tool || 'a structured revision checklist').trim()
  if (/^(?:using|utilizing|listing|reviewing|checking)\b/i.test(clean)) {
    return clean.replace(/^(?:using|utilizing)\s+/i, '')
  }
  return clean
}

/**
 * Generates a single secondary report card comment candidate using one of 6 ORCCG Syntactic Blueprints.
 */
function buildSecondaryBlueprintCandidate({
  blueprintIdx,
  tier, // 'standard' | 'compact' | 'ultraCompact'
  stemVariant,
  tokens,
  overallLevel,
  strengthLevel,
  growthLevel,
  strengthTask,
  strengthShortTopic,
  growthTask,
  growthShortTopic,
  recommendedTool,
  profileKey,
  dept,
  isFinal,
  seedNum
}) {
  const isCompact = tier === 'compact' || tier === 'ultraCompact'
  const isUltra = tier === 'ultraCompact'
  const isBelowStandard = overallLevel.key === 'R' || overallLevel.key === '1'

  const rawS = strengthTask || (dept === 'math' ? 'solving core mathematical problems' : (dept === 'science' ? 'analyzing core scientific concepts' : 'analyzing core course texts'))
  const rawG = growthTask || (dept === 'math' ? 'organizing multi-step mathematical solutions' : (dept === 'science' ? 'verifying scientific problem steps' : 'supporting written arguments with evidence'))

  const sGerund = toGerundPhraseSafe(rawS)
  const gGerund = toGerundPhraseSafe(rawG)

  const sShortRaw = strengthShortTopic || formatCurriculumTopic(rawS) || 'core concepts'
  const gShortRaw = growthShortTopic || formatCurriculumTopic(rawG) || 'core skills'

  const sShort = isUltra ? condenseTopicForNextStep(sShortRaw) : sShortRaw
  const gShort = isUltra ? condenseTopicForNextStep(gShortRaw) : gShortRaw

  const tool = formatToolPhrase(recommendedTool)
  const prof = getProfileBlueprintContext(profileKey, dept, isBelowStandard, stemVariant)
  const strengthQual = getStrengthQualifierPhrase(
    isBelowStandard && !['1', 'R'].includes(strengthLevel.key) ? ACHIEVEMENT_LEVELS.LEVEL_3 : strengthLevel,
    isBelowStandard,
    stemVariant
  ).replace(/\btheir\b/gi, tokens.possessive)

  const growthGap = getGrowthGapPhrasing(tokens, growthLevel, overallLevel, gGerund, gShort, isCompact, stemVariant)
  const goal = getToolGoalSuffix(growthLevel, dept, isFinal, tokens, gShort, stemVariant)

  // Special Level R Final Sentence (Ontario credit recovery / summer school / guidance mandate)
  const finalLevelRNextStep = isCompact
    ? `To work toward credit recovery, ${tokens.name} should consult guidance regarding summer school and use ${tool}.`
    : `To work toward credit recovery, ${tokens.name} should consult with guidance about summer school and use ${tool} ${growthGap.prepInShort}.`

  const buildS3 = (starter = 'Using') => {
    if (isFinal && overallLevel.key === 'R') {
      return finalLevelRNextStep
    }
    if (isFinal) {
      if (starter === 'Moving forward') {
        return `Moving forward into senior courses, ${tokens.subjectLower} can use ${tool} to ${goal.outcome}.`
      }
      return `${starter} ${tool} will help ${tokens.obj || tokens.object} ${goal.outcome}.`
    }
    if (starter === 'Moving forward') {
      return `Moving forward, ${tokens.subjectLower} would benefit from using ${tool} to ${goal.outcome}.`
    }
    return `${starter} ${tool} will support ${tokens.name} to ${goal.outcome}.`
  }

  // Note: tokens.object is the property name
  const objTok = tokens.object

  // When seedNum === 0 and blueprintIdx === 0 (standard), emit exact legacy-compatible Core Triad 3-sentence form
  if (seedNum === 0 && blueprintIdx === 0 && tier === 'standard') {
    const s1 = isBelowStandard
      ? `${tokens.name} showed ${tokens.possessive} strongest understanding when ${sGerund}.`
      : `${capitalizeFirst(sGerund)}, ${tokens.name} ${v(tokens, 'demonstrates', 'demonstrate')} ${strengthQual}.`

    let s2 = ''
    if (isBelowStandard) {
      s2 = isGerundPhrase(gGerund)
        ? `Developing consistency when ${gGerund} is needed, while overall achievement remains below the provincial standard.`
        : `Building foundational skills in ${gShort} is needed, while overall achievement remains below the provincial standard.`
    } else if (isGerundPhrase(rawG)) {
      s2 = `${tokens.possessiveCapital} next learning focus is ${rawG}.`
    } else {
      s2 = `${tokens.possessiveCapital} next learning focus is strengthening consistency with ${gShort}.`
    }

    const s3 = (isFinal && overallLevel.key === 'R')
      ? finalLevelRNextStep
      : (isFinal
        ? `As ${tokens.name} advances to senior courses, using ${tool} will help ${objTok} ${goal.outcome}.`
        : `Using ${tool} will help ${objTok} ${goal.outcome}.`)

    const text = [s1, s2, s3].join(' ')
    return { blueprintId: 'blueprint-1', s1, s2, s3: s3, text }
  }

  let s1 = ''
  let s2 = ''
  let s3 = ''

  switch (blueprintIdx) {
    case 0: {
      // Blueprint 1: 3-Sentence (Context/Gerund Strength -> Diagnostic Growth Milestone -> Tool-First Next Step)
      s1 = isBelowStandard
        ? `${tokens.name} showed ${tokens.possessive} strongest understanding when ${sGerund}.`
        : (isCompact
          ? `${tokens.name} ${v(tokens, 'shows', 'show')} ${strengthQual} when ${sGerund}.`
          : `${prof.opener} ${tokens.name} ${v(tokens, 'demonstrates', 'demonstrate')} ${strengthQual} when ${sGerund}.`)
      s2 = growthGap.diagnosticSentence
      s3 = (isFinal && overallLevel.key === 'R')
        ? finalLevelRNextStep
        : (isFinal
          ? `Using ${tool} in subsequent studies will help ${objTok} ${goal.outcome}.`
          : `Using ${tool} will help ${objTok} ${goal.outcome}.`)
      return { blueprintId: 'blueprint-1', s1, s2, s3, text: [s1, s2, s3].join(' ') }
    }

    case 1: {
      // Blueprint 2: 2-Sentence Merged (Name-First `though` Pivot -> Actionable Tool)
      const sLead = isBelowStandard
        ? `${tokens.name} achieved ${tokens.possessive} best results when ${sGerund}`
        : `${tokens.name} ${v(tokens, 'tackles', 'tackle')} ${isGerundPhrase(sShort) ? `tasks when ${sShort}` : sShort} with ${strengthQual}`
      s1 = `${sLead}, though ${growthGap.pivotClause}.`
      if (isFinal && overallLevel.key === 'R') {
        s2 = finalLevelRNextStep
      } else if (isFinal) {
        s2 = `To prepare for subsequent studies, ${tokens.subjectLower} ${v(tokens, 'is', 'are')} encouraged to use ${tool} to ${goal.outcome}.`
      } else {
        s2 = isCompact
          ? `Using ${tool} will help ${objTok} ${goal.outcome}.`
          : `For continued growth, ${tokens.subjectLower} ${v(tokens, 'is', 'are')} encouraged to use ${tool} to ${goal.outcome}.`
      }
      return { blueprintId: 'blueprint-2', s1, s2, s3: '', text: [s1, s2].join(' ') }
    }

    case 2: {
      // Blueprint 3: 3-Sentence (Modality/Profile Opener -> Diagnostic Growth Area -> Strategy Recommendation)
      s1 = isBelowStandard
        ? `${prof.opener} ${tokens.name} showed ${strengthQual} when ${sGerund}.`
        : `${prof.opener} ${tokens.name} ${v(tokens, 'applies', 'apply')} ${strengthLevel.adjective} skill when ${sGerund}.`
      s2 = isBelowStandard
        ? growthGap.diagnosticSentence
        : (isCompact
          ? `Further practice is needed ${growthGap.prepInShort}.`
          : `Further practice is needed when ${gGerund} to build steadier accuracy.`)
      s3 = (isFinal && overallLevel.key === 'R')
        ? finalLevelRNextStep
        : (isFinal
          ? `Utilizing ${tool} will support ${tokens.name} as ${tokens.subjectLower} ${v(tokens, 'transitions', 'transition')} to higher-level coursework.`
          : `Utilizing ${tool} will help ${tokens.name} ${goal.outcome}.`)
      return { blueprintId: 'blueprint-3', s1, s2, s3, text: [s1, s2, s3].join(' ') }
    }

    case 3: {
      // Blueprint 4: 2-Sentence Merged (Strength + Profile Clause -> Merged Growth + Tool via `by using`)
      s1 = isBelowStandard
        ? `${tokens.name} showed ${strengthQual} when ${sGerund}, ${growthGap.pivotClause}.`
        : (isCompact
          ? `${tokens.name} ${v(tokens, 'demonstrates', 'demonstrate')} ${strengthQual} when ${sGerund}.`
          : `${tokens.name} ${v(tokens, 'demonstrates', 'demonstrate')} ${strengthQual} when ${sGerund}, ${prof.tail}.`)
      if (isFinal && overallLevel.key === 'R') {
        s2 = finalLevelRNextStep
      } else if (isFinal) {
        s2 = `In future academic studies, ${tokens.subjectLower} can strengthen accuracy ${growthGap.prepInShort} by using ${tool} to ${goal.outcome}.`
      } else {
        s2 = `${tokens.subject} can strengthen ${tokens.possessive} accuracy ${growthGap.prepWithShort} by using ${tool} to ${goal.outcome}.`
      }
      return { blueprintId: 'blueprint-4', s1, s2, s3: '', text: [s1, s2].join(' ') }
    }

    case 4: {
      // Blueprint 5: 3-Sentence (Participial/Qualifier Opener -> Growth Focus -> Forward Next Step)
      const verbChoice = isBelowStandard
        ? `showed ${tokens.possessive} clearest grasp`
        : `${v(tokens, 'excels', 'excel')} with ${strengthQual}`
      s1 = (isBelowStandard || isCompact)
        ? `${tokens.name} ${verbChoice} when ${sGerund}.`
        : `Working with ${strengthQual}, ${tokens.name} ${v(tokens, 'performs', 'perform')} effectively when ${sGerund}.`
      s2 = growthGap.consolidationSentence
      s3 = (isFinal && overallLevel.key === 'R')
        ? finalLevelRNextStep
        : buildS3('Moving forward')
      return { blueprintId: 'blueprint-5', s1, s2, s3, text: [s1, s2, s3].join(' ') }
    }

    default: {
      // Blueprint 6: 2-Sentence Merged (`When`-Strength Opener -> `While`-Pivot Growth + Tool in Sentence 2)
      s1 = isBelowStandard
        ? `When ${sGerund}, ${tokens.name} showed ${strengthQual}.`
        : `When ${sGerund}, ${tokens.name} ${v(tokens, 'applies', 'apply')} course concepts with ${strengthQual}${isCompact ? '' : prof.shortTail}.`
      if (isFinal && overallLevel.key === 'R') {
        s2 = `While ${growthGap.whileClause}, ${tokens.name} should consult with guidance regarding credit recovery or summer school.`
      } else if (isFinal) {
        s2 = `While ${growthGap.whileClause}, utilizing ${tool} in senior courses will help ${objTok} ${goal.outcome}.`
      } else {
        s2 = `While ${growthGap.whileClause}, utilizing ${tool} will help ${objTok} ${goal.outcome}.`
      }
      return { blueprintId: 'blueprint-6', s1, s2, s3: '', text: [s1, s2].join(' ') }
    }
  }
}

function toGerundPhraseSafe(task) {
  const clean = formatCurriculumTopic(task)
  if (!clean) return 'applying core course concepts'
  return isGerundPhrase(clean) ? clean : makeGerund(clean)
}

// ─── Main Public Generator Function ──────────────────────────────────────────

/**
 * Generates a complete, compliant report card comment for a student.
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
    variantSeed,
    includeWorkHabits = false,
    courseCode = '',
    reportingPeriod = 'Midterm',
    isFinal = false,
    profileFocus = 'auto'
  } = options

  const resolvedIsFinal = Boolean(isFinal || reportingPeriod === 'Final')
  const resolvedCourseCode = courseCode || gradeData.courseCode || student.courseCode || ''
  const dept = getDepartmentGroup(resolvedCourseCode)

  const overallLevel = getAchievementLevel(gradeData.level || gradeData.percentage)
  const tokens = getPronounTokens(student, pronounMode)

  let seedNum = 0
  if (typeof variantSeed === 'number' && !isNaN(variantSeed)) {
    seedNum = Math.abs(Math.floor(variantSeed))
  } else if (typeof variantSeed === 'string' && variantSeed.length > 0) {
    seedNum = computeStudentVariantSeed({ studentId: variantSeed }, reportingPeriod)
  } else if (student?.studentId || student?.id) {
    seedNum = computeStudentVariantSeed(student, reportingPeriod)
  }

  // Extract evidence with retest, cutoff, note, and tool awareness
  const autoEvidence = extractEvidenceFromGrades(gradeData, resolvedCourseCode, {
    isFinal: resolvedIsFinal,
    reportingPeriod,
    variantSeed: seedNum
  })

  const rawStrength = featuredStrength || autoEvidence.strengthTask || ''
  const rawGrowth = featuredNextStep || autoEvidence.growthTask || ''
  const strengthCompVariant = seedNum
  const growthCompVariant = seedNum === 0 ? 0 : seedNum + 1
  const toolVariant = seedNum + Math.floor(seedNum / 6)

  const strengthTask = (resolvedCourseCode ? mapAssessmentToCompetency(rawStrength, resolvedCourseCode, '', strengthCompVariant) : '') || rawStrength
  const growthTask = (resolvedCourseCode ? mapAssessmentToCompetency(rawGrowth, resolvedCourseCode, '', growthCompVariant) : '') || rawGrowth

  const strengthShortTopic = (resolvedCourseCode ? mapAssessmentToShortTopic(rawStrength, resolvedCourseCode, '', strengthCompVariant) : '') || autoEvidence.strengthShortTopic || formatCurriculumTopic(strengthTask)
  const growthShortTopic = (resolvedCourseCode ? mapAssessmentToShortTopic(rawGrowth, resolvedCourseCode, '', growthCompVariant) : '') || autoEvidence.growthShortTopic || formatCurriculumTopic(growthTask)
  const recommendedTool = featuredNextStep
    ? mapAssessmentToTool(rawGrowth, resolvedCourseCode, '', toolVariant)
    : (autoEvidence.recommendedTool || mapAssessmentToTool(rawGrowth, resolvedCourseCode, '', toolVariant))

  // Resolve manual task scores when overridden
  const findSelectedScore = (selectedLabel) => {
    if (!selectedLabel || !Array.isArray(gradeData?.assessments)) return null
    const targetLower = String(selectedLabel).trim().toLowerCase()
    const match = gradeData.assessments.find(a => {
      if (typeof a?.scorePercent !== 'number') return false
      if (String(a.name || '').trim().toLowerCase() === targetLower) return true
      const resolved = resolveAssessmentTaskName(a, resolvedCourseCode)
      return resolved && resolved.trim().toLowerCase() === targetLower
    })
    return match ? match.scorePercent : null
  }

  const manualStrengthScore = featuredStrength ? findSelectedScore(featuredStrength) : null
  const sScore = manualStrengthScore !== null ? manualStrengthScore : autoEvidence.strengthScore
  let strengthLevel = (typeof sScore === 'number' && !isNaN(sScore)) ? getAchievementLevel(sScore) : overallLevel
  if ((overallLevel.key === '3' || overallLevel.key === '4' || overallLevel.key === '4+') && (strengthLevel.key === '1' || strengthLevel.key === 'R')) {
    strengthLevel = overallLevel
  }
  if (overallLevel.key === '2' && (strengthLevel.key === '4+' || strengthLevel.key === '4')) {
    strengthLevel = ACHIEVEMENT_LEVELS.LEVEL_3
  }

  const manualGrowthScore = featuredNextStep ? findSelectedScore(featuredNextStep) : null
  const gScore = manualGrowthScore !== null ? manualGrowthScore : autoEvidence.growthScore
  const growthLevel = (typeof gScore === 'number' && !isNaN(gScore)) ? getAchievementLevel(gScore) : overallLevel

  const resolvedProfileFocus = (profileFocus && profileFocus !== 'auto') ? profileFocus : (autoEvidence.profileFocus || 'curriculum_general')
  const profile = deriveStudentProfileFocus(gradeData, learningSkills, {
    ...options,
    profileFocus: resolvedProfileFocus
  })

  let fullComment = ''
  let selectedBlueprintId = 'elementary'

  if (mode === 'elementary') {
    const s1 = getStrengthPhrases(tokens, strengthLevel, strengthTask, seedNum, { compact: false, courseCode: resolvedCourseCode, overallLevelKey: overallLevel.key })
    const s2 = (includeWorkHabits || profile.key === 'work_habits')
      ? getWorkHabitPhrases(tokens, learningSkills, seedNum + 1, { compact: false })
      : getCurriculumApplicationPhrases(tokens, overallLevel, seedNum + 1, {
          profileFocus: profile.key,
          learningSkills,
          compact: false,
          mode,
          courseCode: resolvedCourseCode
        })
    const s3 = getNextStepPhrases(tokens, growthLevel, growthTask, seedNum + 2, {
      isFinal: resolvedIsFinal,
      courseCode: resolvedCourseCode,
      compact: false
    })
    const para1 = [s1, s2].filter(Boolean).join(' ')
    const para2 = [
      s3,
      `Continued partnership between home and school will support ${tokens.name}'s ongoing learning.`
    ].join(' ')
    fullComment = `${para1}\n\n${para2}`
  } else {
    const startBp = seedNum % 6
    const startStem = Math.floor(seedNum / 6)
    const targetMin = charLimit >= 360 ? 295 : Math.max(120, Math.floor(charLimit * 0.6))

    const tiers = ['standard', 'compact', 'ultraCompact']
    let bestInRange = null
    let bestShort = null
    let bestWithClash = null

    for (const tier of tiers) {
      for (let bpOff = 0; bpOff < 6; bpOff++) {
        const bpIdx = (startBp + bpOff) % 6
        for (let stemOff = 0; stemOff < 3; stemOff++) {
          const cand = buildSecondaryBlueprintCandidate({
            blueprintIdx: bpIdx,
            tier,
            stemVariant: startStem + stemOff,
            tokens,
            overallLevel,
            strengthLevel,
            growthLevel,
            strengthTask,
            strengthShortTopic,
            growthTask,
            growthShortTopic,
            recommendedTool,
            profileKey: profile.key === 'work_habits' ? 'curriculum_general' : profile.key,
            dept,
            isFinal: resolvedIsFinal,
            seedNum: (bpOff === 0 && stemOff === 0) ? seedNum : (seedNum || 1)
          })

          const normalizedText = enforceCanadianSpelling(cand.text)
          const len = normalizedText.length
          const clash = hasVerbClash(cand.s1, cand.s2)

          if (len <= charLimit) {
            if (!clash && len >= targetMin) {
              bestInRange = { ...cand, text: normalizedText }
              break
            }
            if (!clash && (!bestShort || len > bestShort.text.length)) {
              bestShort = { ...cand, text: normalizedText }
            }
            if (!bestWithClash) {
              bestWithClash = { ...cand, text: normalizedText }
            }
          }
        }
        if (bestInRange) break
      }
      if (bestInRange) break
    }

    const chosen = bestInRange || bestShort || bestWithClash
    if (chosen) {
      fullComment = chosen.text
      selectedBlueprintId = chosen.blueprintId
    } else {
      // Emergency ultra-short Core Triad fallback strictly <= charLimit (e.g. charLimit <= 220)
      const shortS = condenseTopicForNextStep(strengthShortTopic || 'core concepts')
      const shortG = condenseTopicForNextStep(growthShortTopic || 'core skills')
      const shortTool = formatToolPhrase(recommendedTool)
      const emergencyBridge = (overallLevel.key === 'R' || overallLevel.key === '1')
        ? 'though achievement remains below standard'
        : `though ${shortG} needs practice`
      const em1 = `${tokens.name} showed skill in ${shortS}, ${emergencyBridge}.`
      const em2 = (resolvedIsFinal && overallLevel.key === 'R')
        ? `Consulting guidance on credit recovery is advised.`
        : `Using ${shortTool} will support progress.`
      fullComment = `${em1} ${em2}`
      selectedBlueprintId = 'blueprint-2'
    }
  }

  fullComment = enforceCanadianSpelling(fullComment)

  const charCount = fullComment.length
  const wordCount = fullComment.trim().split(/\s+/).filter(Boolean).length

  return {
    text: fullComment,
    charCount,
    wordCount,
    isOverLimit: charCount > charLimit,
    charLimit,
    achievementLevel: overallLevel,
    strengthLevel,
    growthLevel,
    strengthSource: featuredStrength ? 'manual' : autoEvidence.strengthSource,
    growthSource: featuredNextStep ? 'manual' : autoEvidence.growthSource,
    strengthTask,
    growthTask,
    strengthShortTopic,
    growthShortTopic,
    recommendedTool,
    blueprintId: selectedBlueprintId,
    strengthScore: autoEvidence.strengthScore,
    growthScore: autoEvidence.growthScore,
    profileFocus: profile.key,
    profileFocusLabel: profile.label,
    profileBadge: profile.badge,
    profileMetric: profile.metric
  }
}
