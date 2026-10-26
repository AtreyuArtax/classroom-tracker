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

import { mapAssessmentToCompetency, extractCompetenciesFromAssessment, condenseCurriculumExpectation } from './curriculumCompetencies.js'
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
      reflexive: 'himself',
      isPlural: false,
    }
  }

  // Default to neutral / they
  if (pronounMode === 'preferred') {
    return {
      name: firstName,
      subject: 'They',
      subjectLower: 'they',
      object: 'them',
      possessive: 'their',
      reflexive: 'themselves',
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
    reflexive: 'themselves',
    isPlural: false,
  }
}

// ─── Sentence Matrix (Ontario Growing Success Bank) ──────────────────────────

/**
 * Returns strength sentence variations based on achievement level and specific task.
 */
function getStrengthPhrases(tokens, level, taskName, variant = 0, options = {}) {
  const isCompact = Boolean(options?.compact)
  const cleanTask = formatCurriculumTopic(taskName || 'course learning goals')
  const isGerund = /^(analyzing|solving|constructing|applying|investigating|interpreting|evaluating|predicting|classifying|examining|designing|representing|calculating|resolving|measuring|mapping|building)\b/i.test(cleanTask)
  const capTask = isGerund ? (cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1)) : ''
  const whenTask = isGerund ? cleanTask : makeGerund(cleanTask)
  const onTask = isGerund ? `when ${cleanTask}` : `on ${cleanTask}`

  const standardTemplates = {
    '4+': [
      isGerund
        ? `${capTask}, ${tokens.name} excels with thorough insight and understanding.`
        : `${tokens.name} excels with thorough insight, particularly when ${whenTask}.`,
      `During laboratory investigations, ${tokens.name} shows thorough understanding when ${whenTask}.`,
      `${tokens.name} applies critical thinking skills with thorough insight, particularly ${onTask}.`,
      `During classroom problem-solving tasks, ${tokens.name} exhibits thorough precision when ${whenTask}.`
    ],
    '4': [
      isGerund
        ? `${capTask}, ${tokens.name} demonstrates strong problem-solving skills with high effectiveness.`
        : `${tokens.name} excels with a high degree of skill when ${whenTask}.`,
      `During classroom inquiries and investigations, ${tokens.name} applies concepts with thorough consistency when ${whenTask}.`,
      `${tokens.name} exhibits commendable analytical skill and consistency, particularly ${onTask}.`,
      `In problem-solving tasks, ${tokens.name} applies learned skills with considerable precision when ${whenTask}.`
    ],
    '3': [
      isGerund
        ? `${capTask}, ${tokens.name} shows competent understanding and solid skills.`
        : `${tokens.name} shows competent understanding and solid skills when ${whenTask}.`,
      `During unit investigations, ${tokens.name} applies core course concepts reliably when ${whenTask}.`,
      `${tokens.name} produces good quality work and communicates solution steps clearly when ${whenTask}.`,
      `In classroom evaluations, ${tokens.name} demonstrates sound problem-solving capability when ${whenTask}.`
    ],
    '2': [
      isGerund
        ? `With emerging consistency in ${cleanTask}, ${tokens.name} shows developing understanding of core procedures.`
        : `${tokens.name} shows developing understanding of key concepts in ${cleanTask}.`,
      `With guided practice, ${tokens.name} demonstrates emerging capability when ${whenTask}.`,
      `${tokens.name} is making steady progress in foundational skills, showing promise when ${whenTask}.`,
      `During classroom activities, ${tokens.name} displays developing capability ${onTask}, though consistency varies.`
    ],
    '1': [
      `With ongoing teacher support, ${tokens.name} is working to develop foundational skills in ${cleanTask}.`,
      `During class inquiries, ${tokens.name} shows emerging familiarity when ${whenTask} with structured guidance.`,
      `${tokens.name} is working to apply basic principles, but finds ${cleanTask} challenging.`,
      `${tokens.name} requires structured scaffolding to build confidence when ${whenTask}.`
    ],
    'R': [
      `To meet curriculum expectations in ${cleanTask}, ${tokens.name} requires intensive support and guided practice.`,
      `At this stage, ${tokens.name} requires direct assistance to interpret foundational concepts in ${cleanTask}.`,
      `Substantial remediation in ${cleanTask} is necessary to develop required credit competencies.`,
      `Focused intervention is needed to support ${tokens.name} with core expectations in ${cleanTask}.`
    ]
  }

  const compactTemplates = {
    '4+': [
      `${tokens.name} excels with thorough insight when ${whenTask}.`,
      `${tokens.name} shows a thorough understanding when ${whenTask}.`,
      `In inquiry tasks, ${tokens.name} works with thorough insight when ${whenTask}.`
    ],
    '4': [
      `${tokens.name} excels when ${whenTask}.`,
      `${tokens.name} shows strong capability and high effectiveness when ${whenTask}.`,
      `${tokens.name} consistently applies learned concepts with thorough skill when ${whenTask}.`,
      `During class inquiries, ${tokens.name} works with commendable precision when ${whenTask}.`
    ],
    '3': [
      `${tokens.name} shows competent understanding and solid skills when ${whenTask}.`,
      `${tokens.name} applies core course concepts reliably when ${whenTask}.`,
      `In class activities, ${tokens.name} demonstrates sound capability when ${whenTask}.`
    ],
    '2': [
      `${tokens.name} shows developing understanding when ${whenTask}.`,
      `With guided practice, ${tokens.name} displays steady progress when ${whenTask}.`,
      `${tokens.name} is building foundational skills in ${cleanTask}.`
    ],
    '1': [
      `With regular guidance, ${tokens.name} is developing basic skills in ${cleanTask}.`,
      `${tokens.name} shows emerging familiarity when ${whenTask} with support.`
    ],
    'R': [
      `With directed support, ${tokens.name} is working to grasp core concepts in ${cleanTask}.`,
      `${tokens.name} requires structured guidance to build competencies in ${cleanTask}.`
    ]
  }

  const templates = isCompact ? compactTemplates : standardTemplates
  const list = templates[level.key] || templates['3']
  const idx = Math.abs(variant) % list.length
  return list[idx]
}

/**
 * Returns learning skills sentence variations.
 */
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
        `${tokens.subject} ${tokens.isPlural ? 'work' : 'works'} diligently and ${tokens.isPlural ? 'collaborate' : 'collaborates'} constructively with peers.`,
        `${tokens.subject} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} strong initiative and ${tokens.isPlural ? 'use' : 'uses'} class time effectively.`
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
      `${tokens.subject} ${tokens.isPlural ? 'participate' : 'participates'} cooperatively and ${tokens.isPlural ? 'complete' : 'completes'} assigned tasks.`,
      `${tokens.subject} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} satisfactory work habits during class.`
    ]
    return list[Math.abs(variant) % list.length]
  }

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
 * Returns curriculum thinking, application, and inquiry variations based on achievement level
 * and pedagogical student profile focus (e.g. practical inquiry, analytical problem solving, rising trajectory, etc.).
 */
function getCurriculumApplicationPhrases(tokens, level, variant = 0, options = {}) {
  const isCompact = Boolean(options?.compact)
  const profileFocus = options?.profileFocus || 'curriculum_general'

  if (profileFocus === 'work_habits') {
    if (options?.mode === 'secondary') {
      // In Ontario secondary reporting, subject comments must strictly report on curriculum
      // expectations and Achievement Chart categories (Knowledge, Thinking, Communication, Application).
      // Learning Skills & Work Habits are strictly prohibited from subject comment boxes.
      const templates = isCompact ? compactTemplates : standardTemplates
      const list = templates[level.key] || templates['3']
      return list[Math.abs(variant) % list.length]
    }
    return getWorkHabitPhrases(tokens, options?.learningSkills, variant, options)
  }

  // Profile-specific sentence banks (grounded in real student evidence)
  if (profileFocus === 'modality_practical') {
    if (isCompact) {
      const list = [
        `${tokens.subject} ${tokens.isPlural ? 'excel' : 'excels'} in hands-on inquiry and experimental lab investigations.`,
        `In laboratory inquiries, ${tokens.subjectLower} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} strong practical and observational skills.`
      ]
      return list[Math.abs(variant) % list.length]
    }
    const list = [
      `${tokens.subject} ${tokens.isPlural ? 'excel' : 'excels'} in laboratory investigations, collecting accurate data and connecting findings to theory.`,
      `In hands-on inquiry tasks, ${tokens.subjectLower} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} keen observational skill and methodical lab technique.`,
      `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} strong practical capability, interpreting experimental results and following protocols with precision.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (profileFocus === 'modality_analytical') {
    if (isCompact) {
      const list = [
        `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} analytical reasoning and multi-step problem solving effectively.`,
        `${tokens.subject} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} strong quantitative problem solving and conceptual clarity.`
      ]
      return list[Math.abs(variant) % list.length]
    }
    const list = [
      `${tokens.subject} ${tokens.isPlural ? 'exhibit' : 'exhibits'} strong analytical reasoning, interpreting abstract relationships and applying theoretical models with precision.`,
      `During quantitative problem solving, ${tokens.subjectLower} ${tokens.isPlural ? 'apply' : 'applies'} mathematical relationships and multi-step formulas with clarity.`,
      `${tokens.subject} ${tokens.isPlural ? 'synthesize' : 'synthesizes'} theoretical principles effectively, demonstrating deep conceptual problem-solving ability.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (profileFocus === 'trajectory_improving') {
    if (isCompact) {
      const list = [
        `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} clear growth across recent units, solving multi-step problems with increasing precision.`,
        `${tokens.subject} ${tokens.isPlural ? 'exhibit' : 'exhibits'} rising capability when interpreting data and explaining core relationships.`,
        `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} theoretical principles with increasing precision and analytical clarity.`,
        `${tokens.subject} ${tokens.isPlural ? 'refine' : 'refines'} problem-solving strategies effectively, tackling new inquiries with confidence.`
      ]
      return list[Math.abs(variant) % list.length]
    }
    const list = [
      `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} noticeable growth across recent units, consolidating theoretical principles with increasing accuracy.`,
      `${tokens.subject} ${tokens.isPlural ? 'exhibit' : 'exhibits'} rising capability in analyzing complex scenarios and communicating logical problem-solving steps.`,
      `${tokens.subject} ${tokens.isPlural ? 'refine' : 'refines'} investigative methods effectively, approaching multi-step inquiries with growing independence.`,
      `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} core course principles with increasing precision when solving unfamiliar problems.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (profileFocus === 'consistency_high') {
    const isScience = /^S/i.test(options?.courseCode || '')
    const isMath = /^M/i.test(options?.courseCode || '')

    if (isCompact) {
      if (isScience) {
        const list = [
          `${tokens.subject} reliably ${tokens.isPlural ? 'produce' : 'produces'} accurate, well-structured solutions across all scientific inquiries.`,
          `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} scientific conventions and formulas with dependable accuracy.`,
          `${tokens.subject} consistently ${tokens.isPlural ? 'connect' : 'connects'} experimental observations to theory with clear reasoning.`,
          `${tokens.subject} ${tokens.isPlural ? 'solve' : 'solves'} multi-step inquiry problems with dependable precision.`
        ]
        return list[Math.abs(variant) % list.length]
      }
      if (isMath) {
        const list = [
          `${tokens.subject} reliably ${tokens.isPlural ? 'produce' : 'produces'} accurate, well-organized solutions across multi-step mathematical tasks.`,
          `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} formulas and algebraic conventions with dependable accuracy.`,
          `${tokens.subject} consistently ${tokens.isPlural ? 'verify' : 'verifies'} intermediate calculations with clear logical steps.`,
          `${tokens.subject} ${tokens.isPlural ? 'solve' : 'solves'} multi-step problems with dependable accuracy and precision.`
        ]
        return list[Math.abs(variant) % list.length]
      }
      const list = [
        `${tokens.subject} reliably ${tokens.isPlural ? 'produce' : 'produces'} accurate, well-structured solutions across all unit tasks.`,
        `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} learned methods and conventions with dependable accuracy.`,
        `${tokens.subject} consistently ${tokens.isPlural ? 'organize' : 'organizes'} multi-step solutions with clear, logical reasoning.`,
        `${tokens.subject} ${tokens.isPlural ? 'solve' : 'solves'} multi-step problems with dependable accuracy and thorough reasoning.`
      ]
      return list[Math.abs(variant) % list.length]
    }

    if (isScience) {
      const list = [
        `${tokens.subject} reliably ${tokens.isPlural ? 'produce' : 'produces'} thorough, accurate work across diverse laboratory and classroom inquiries.`,
        `${tokens.subject} ${tokens.isPlural ? 'exhibit' : 'exhibits'} dependable precision when applying scientific formulas, conventions, and theoretical models.`,
        `${tokens.subject} consistently ${tokens.isPlural ? 'connect' : 'connects'} experimental observations to scientific principles with clear analytical reasoning.`,
        `During problem solving and inquiry, ${tokens.subjectLower} ${tokens.isPlural ? 'explain' : 'explains'} reasoning clearly and ${tokens.isPlural ? 'apply' : 'applies'} core principles with dependable accuracy.`
      ]
      return list[Math.abs(variant) % list.length]
    }

    if (isMath) {
      const list = [
        `${tokens.subject} reliably ${tokens.isPlural ? 'produce' : 'produces'} accurate, well-organized solutions across multi-step mathematical problems.`,
        `${tokens.subject} ${tokens.isPlural ? 'exhibit' : 'exhibits'} dependable precision when applying mathematical formulas, algebraic rules, and conventions.`,
        `${tokens.subject} consistently ${tokens.isPlural ? 'organize' : 'organizes'} calculations and ${tokens.isPlural ? 'justify' : 'justifies'} intermediate steps with clear logical reasoning.`,
        `During quantitative problem solving, ${tokens.subjectLower} ${tokens.isPlural ? 'apply' : 'applies'} mathematical relationships with dependable accuracy.`
      ]
      return list[Math.abs(variant) % list.length]
    }

    const list = [
      `${tokens.subject} reliably ${tokens.isPlural ? 'produce' : 'produces'} accurate, well-structured solutions across diverse classroom inquiries.`,
      `${tokens.subject} ${tokens.isPlural ? 'exhibit' : 'exhibits'} thorough precision when applying learned methods, conventions, and models across all units.`,
      `${tokens.subject} consistently ${tokens.isPlural ? 'organize' : 'organizes'} multi-step solutions and ${tokens.isPlural ? 'explain' : 'explains'} reasoning with clarity.`,
      `Across diverse evaluations, ${tokens.subjectLower} ${tokens.isPlural ? 'apply' : 'applies'} core course principles with dependable accuracy and sound methodology.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (profileFocus === 'category_thinking') {
    if (isCompact) {
      const list = [
        `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} strong critical thinking to analyze complex scenarios.`,
        `During classroom investigations, ${tokens.subjectLower} ${tokens.isPlural ? 'evaluate' : 'evaluates'} evidence with thoughtful inquiry skills.`
      ]
      return list[Math.abs(variant) % list.length]
    }
    const list = [
      `${tokens.subject} ${tokens.isPlural ? 'formulate' : 'formulates'} thoughtful questions and evaluates complex concepts with sound critical thinking.`,
      `During classroom investigations, ${tokens.subjectLower} ${tokens.isPlural ? 'apply' : 'applies'} inquiry skills to analyze multi-faceted problems systematically.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (profileFocus === 'category_communication') {
    if (isCompact) {
      const list = [
        `${tokens.subject} ${tokens.isPlural ? 'communicate' : 'communicates'} reasoning clearly using appropriate technical terminology.`,
        `In technical explanations, ${tokens.subjectLower} ${tokens.isPlural ? 'express' : 'expresses'} solution steps with precision and clarity.`
      ]
      return list[Math.abs(variant) % list.length]
    }
    const list = [
      `${tokens.subject} ${tokens.isPlural ? 'communicate' : 'communicates'} solution pathways clearly, using appropriate terminology, conventions, and units.`,
      `In written and technical explanations, ${tokens.subjectLower} ${tokens.isPlural ? 'articulate' : 'articulates'} reasoning with precision and structural clarity.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (profileFocus === 'category_application') {
    if (isCompact) {
      const list = [
        `${tokens.subject} effectively ${tokens.isPlural ? 'connect' : 'connects'} learned concepts to practical real-world applications.`,
        `When solving problems, ${tokens.subjectLower} ${tokens.isPlural ? 'apply' : 'applies'} course concepts to authentic contexts.`
      ]
      return list[Math.abs(variant) % list.length]
    }
    const list = [
      `${tokens.subject} ${tokens.isPlural ? 'connect' : 'connects'} classroom theory to practical, real-world contexts and technological applications effectively.`,
      `When presented with authentic scenarios, ${tokens.subjectLower} ${tokens.isPlural ? 'transfer' : 'transfers'} learned principles with sound insight.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  if (profileFocus === 'qualitative_triangulation') {
    if (isCompact) {
      const list = [
        `Through classroom dialogue and observation, ${tokens.name} articulates understanding clearly.`,
        `Through class conversations, ${tokens.name} explains reasoning and grasps core concepts effectively.`
      ]
      return list[Math.abs(variant) % list.length]
    }
    const list = [
      `Through active classroom dialogue and observation, ${tokens.name} articulates understanding and explains concepts effectively.`,
      `In classroom discussions and inquiries, ${tokens.name} contributes thoughtful ideas and explains reasoning clearly.`
    ]
    return list[Math.abs(variant) % list.length]
  }

  // General Ontario Achievement Chart Level-Calibrated Sentences
  const standardTemplates = {
    '4+': [
      `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} critical thinking skills to analyze complex scenarios and ${tokens.isPlural ? 'communicate' : 'communicates'} reasoning with precision.`,
      `${tokens.subject} ${tokens.isPlural ? 'evaluate' : 'evaluates'} experimental evidence and interprets complex theoretical models with precision.`,
      `${tokens.subject} ${tokens.isPlural ? 'synthesize' : 'synthesizes'} concepts effectively and ${tokens.isPlural ? 'express' : 'expresses'} mathematical and scientific reasoning with clarity.`,
      `In inquiry activities, ${tokens.subjectLower} ${tokens.isPlural ? 'analyze' : 'analyzes'} data insightfully and ${tokens.isPlural ? 'articulate' : 'articulates'} connections to practical contexts.`
    ],
    '4': [
      `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} learned concepts reliably to multi-step problems and ${tokens.isPlural ? 'communicate' : 'communicates'} reasoning clearly.`,
      `${tokens.subject} ${tokens.isPlural ? 'exhibit' : 'exhibits'} strong analytical capability during classroom inquiries and investigation tasks.`,
      `During problem solving, ${tokens.subjectLower} ${tokens.isPlural ? 'use' : 'uses'} appropriate conventions and ${tokens.isPlural ? 'explain' : 'explains'} methodology clearly.`,
      `${tokens.subject} effectively ${tokens.isPlural ? 'connect' : 'connects'} theoretical concepts to practical contexts and experimental results.`
    ],
    '3': [
      `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} core procedures with competence, communicating intermediate solution steps clearly.`,
      `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} sound problem-solving skills during classroom investigations and evaluations.`,
      `When tackling multi-step tasks, ${tokens.subjectLower} ${tokens.isPlural ? 'use' : 'uses'} established methods and ${tokens.isPlural ? 'interpret' : 'interprets'} data appropriately.`,
      `${tokens.subject} ${tokens.isPlural ? 'explain' : 'explains'} foundational procedures and reasoning with sound clarity.`
    ],
    '2': [
      `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} developing consistency when applying standard procedures to multi-step problem solving.`,
      `With guided practice, ${tokens.subjectLower} ${tokens.isPlural ? 'interpret' : 'interprets'} core relationships and ${tokens.isPlural ? 'communicate' : 'communicates'} steps with emerging accuracy.`,
      `${tokens.subject} ${tokens.isPlural ? 'display' : 'displays'} emerging capability during inquiry tasks, though calculations require verification.`,
      `${tokens.subject} ${tokens.isPlural ? 'are' : 'is'} continuing to build confidence when explaining reasoning and applying methods to new problems.`
    ],
    '1': [
      `With ongoing teacher support, ${tokens.subjectLower} ${tokens.isPlural ? 'are' : 'is'} working to apply basic principles and complete multi-step solutions.`,
      `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} emerging capability with core procedures, though additional practice is required to communicate reasoning clearly.`,
      `During inquiry and problem-solving activities, ${tokens.subjectLower} ${tokens.isPlural ? 'require' : 'requires'} structured scaffolding to select and apply correct methods.`,
      `${tokens.subject} ${tokens.isPlural ? 'are' : 'is'} developing foundational familiarity with course formulas and terminology.`
    ],
    'R': [
      `${tokens.subject} ${tokens.isPlural ? 'require' : 'requires'} comprehensive guidance to interpret core concepts and complete basic problem-solving procedures.`,
      `Substantial support is needed to understand fundamental curriculum terminology and apply standard methods.`,
      `At this stage, ${tokens.subjectLower} ${tokens.isPlural ? 'struggle' : 'struggles'} to demonstrate consistent application of essential course expectations.`,
      `Extensive review of foundational material is necessary to build required curriculum competencies.`
    ]
  }

  const compactTemplates = {
    '4+': [
      `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} critical thinking skills to analyze complex scenarios with precision.`,
      `${tokens.subject} ${tokens.isPlural ? 'exhibit' : 'exhibits'} strong problem-solving strategies and clear insight.`
    ],
    '4': [
      `${tokens.subject} ${tokens.isPlural ? 'solve' : 'solves'} multi-step problems with conceptual clarity and analytical precision.`,
      `${tokens.subject} ${tokens.isPlural ? 'exhibit' : 'exhibits'} strong analytical capability during classroom inquiries.`
    ],
    '3': [
      `${tokens.subject} ${tokens.isPlural ? 'solve' : 'solves'} standard multi-step problems reliably and explains reasoning clearly.`,
      `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} sound problem-solving skills during classroom tasks.`
    ],
    '2': [
      `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} developing consistency when applying standard procedures.`,
      `With guided practice, ${tokens.subjectLower} ${tokens.isPlural ? 'interpret' : 'interprets'} core relationships with emerging accuracy.`
    ],
    '1': [
      `With ongoing guidance, ${tokens.subjectLower} ${tokens.isPlural ? 'are' : 'is'} developing familiarity with core formulas.`,
      `${tokens.subject} ${tokens.isPlural ? 'require' : 'requires'} structured scaffolding to apply basic methods.`
    ],
    'R': [
      `${tokens.subject} ${tokens.isPlural ? 'require' : 'requires'} comprehensive guidance to interpret fundamental concepts.`,
      `Extensive review of core material is necessary to build credit competencies.`
    ]
  }

  const templates = isCompact ? compactTemplates : standardTemplates
  const list = templates[level.key] || templates['3']
  const idx = Math.abs(variant) % list.length
  return list[idx]
}

/**
 * Condenses overly long compound curriculum topics for natural Next Step phrasing.
 * If a topic is a 3-part list (e.g. "A, B, and C") and exceeds 60 characters,
 * condenses to "A and C" so Sentence 3 remains natural and doesn't squeeze out Sentence 2.
 */
export function condenseTopicForNextStep(task) {
  if (!task || typeof task !== 'string') return ''
  let t = task.trim()
  if (t.length <= 60) return t

  // If 3-part list: "A, B, and C" -> "A and C"
  const threePartMatch = t.match(/^(.*?)(?:,\s*[^,]+),\s*and\s+(.*)$/i)
  if (threePartMatch && threePartMatch[1] && threePartMatch[2]) {
    const candidate = `${threePartMatch[1]} and ${threePartMatch[2]}`.trim()
    if (candidate.length <= 65) return candidate
  }

  return t
}

/**
 * Returns actionable next step variations based on level and specific growth task.
 * For Final reports, next steps pivot forward to senior course pathways, future studies,
 * or credit recovery (under Ontario Growing Success & SCDSB guidelines).
 */
function getNextStepPhrases(tokens, level, growthTaskName, variant = 0, options = {}) {
  const isFinal = typeof options === 'boolean' ? options : Boolean(options?.isFinal)
  const isCompact = Boolean(options?.compact)
  const formattedTask = formatCurriculumTopic(growthTaskName || '')
  const cleanTask = condenseTopicForNextStep(formattedTask)
  const lower = cleanTask.toLowerCase().trim()

  const isGeneric = !cleanTask || cleanTask === 'multi-step problem solving' || cleanTask === 'course learning goals' || isGenericTitle(cleanTask)
  const isGerund = /^(analyzing|solving|constructing|applying|investigating|interpreting|evaluating|predicting|classifying|examining|designing|representing|calculating|conducting|modeling|modelling)\b/i.test(lower)
  const isEvaluation = /\b(test|quiz|exam|checkpoint|evaluation)\b/i.test(lower)
  const isLab = /\b(lab|inquiry|investigation|experiment)\b/i.test(lower)

  // Natural grammar-adapted modifiers:
  // inTopic: used after solutions, justifications, extra help ("in kinematics", "during investigations in optics", "when analyzing motion")
  let inTopic = ''
  // relatedTopic: used after problems, practice, concepts ("related to kinematics", "when analyzing motion")
  let relatedTopic = ''
  // onTopic: used after practice, remediation ("on unit evaluations", "in kinematics", "when analyzing motion")
  let onTopic = ''

  if (!isGeneric) {
    if (isGerund) {
      inTopic = ` when ${cleanTask}`
      relatedTopic = ` when ${cleanTask}`
      onTopic = ` when ${cleanTask}`
    } else if (isEvaluation) {
      inTopic = ` on unit evaluations`
      relatedTopic = ` for upcoming evaluations on ${cleanTask}`
      onTopic = ` on upcoming evaluations on ${cleanTask}`
    } else if (isLab) {
      inTopic = ` during investigations in ${cleanTask}`
      relatedTopic = ` during investigations in ${cleanTask}`
      onTopic = ` in laboratory investigations`
    } else {
      // Academic concept or topic noun phrase (e.g. "sustainable ecosystems", "kinematics", "quadratic relations")
      inTopic = ` in ${cleanTask}`
      relatedTopic = ` related to ${cleanTask}`
      onTopic = ` in ${cleanTask}`
    }
  }

  // Standard term / midterm templates
  const termTemplates = {
    '4+': [
      `Moving forward, ${tokens.name} is encouraged to explore extension questions to deepen conceptual understanding.`,
      `To extend learning, ${tokens.subjectLower} should seek opportunities to articulate reasoning and justify complex conclusions${inTopic}.`,
      `Tackling novel, non-routine problems${relatedTopic} will further enhance ${tokens.possessive} critical insight.`,
      `For ongoing growth, ${tokens.name} should continue challenging ${tokens.reflexive || tokens.object} with independent enrichment inquiries${inTopic}.`
    ],
    '4': [
      `Utilizing a structured problem-solving template will support ${tokens.name} in organizing multi-step solutions${inTopic}.`,
      `To reach the highest standard, ${tokens.subjectLower} should continue refining written justifications and verifying multi-step solutions${inTopic}.`,
      `Continuing to practice multi-step problem solving${relatedTopic} will further consolidate understanding.`,
      `For future assessments, ${tokens.name} should ensure thorough explanations and clear units accompany solutions${inTopic}.`
    ],
    '3': [
      `Utilizing a step-by-step problem-solving ledger will help ${tokens.name} organize variables and calculations${inTopic}.`,
      `Moving forward, ${tokens.name} should practice multi-step problem solving${relatedTopic}.`,
      `Using a structured reference checklist will support ${tokens.name} in verifying intermediate steps${inTopic}.`,
      `For continued improvement, consistent completion of practice problems${relatedTopic || ` related to ${cleanTask || 'core concepts'}`} is recommended.`
    ],
    '2': [
      `Utilizing a variable-mapping organizer and reference checklist will help ${tokens.name} organize solution steps${inTopic}.`,
      `With guided practice, ${tokens.subjectLower} should focus on applying structured problem-solving frameworks and verifying calculations${onTopic}.`,
      `Using a step-by-step problem-solving template and seeking timely extra help${inTopic} will build confidence.`,
      `Regular review of core concepts and completing sample exercises${relatedTopic} will support ${tokens.possessive} progress.`
    ],
    '1': [
      `Utilizing a structured step-by-step organizer and attending regular extra help will support ${tokens.name}${inTopic}.`,
      `To develop consistency, ${tokens.subjectLower} should use guided templates to organize foundational procedures${inTopic}.`,
      `Regular review of core concept notes and guided calculation practice${inTopic} will support ongoing progress.`,
      `Consistent completion of practice tasks and guided review${relatedTopic} will help ${tokens.name} build required competencies.`
    ],
    'R': [
      `As an immediate priority, ${tokens.name} must meet with the teacher to establish an intervention plan${relatedTopic || ` regarding ${cleanTask || 'course expectations'}`}.`,
      `To work toward credit recovery, ${tokens.subjectLower} must submit missing evidence and attend structured remediation${onTopic}.`,
      `Engaging in targeted teacher-guided review and completing foundational remediation tasks${inTopic} are urgent priorities.`,
      `A parent-teacher consultation is recommended to support ${tokens.name} with structured review of ${cleanTask || 'course expectations'}.`
    ]
  }

  const compactTermTemplates = {
    '4+': [
      `Moving forward, ${tokens.name} is encouraged to tackle extension questions${inTopic}.`,
      `To extend learning, ${tokens.subjectLower} should seek opportunities to justify complex conclusions${inTopic}.`
    ],
    '4': [
      `Utilizing a structured template will support ${tokens.name} in organizing multi-step solutions${inTopic}.`,
      `To reach the highest level, ${tokens.subjectLower} should refine written justifications and verify solutions${inTopic}.`
    ],
    '3': [
      `Utilizing a step-by-step problem ledger will help ${tokens.name} verify intermediate calculations${inTopic}.`,
      `Moving forward, ${tokens.name} should complete regular practice problems${relatedTopic}.`
    ],
    '2': [
      `Focusing on structured problem-solving frameworks and practicing sample exercises${relatedTopic} will support ${tokens.possessive} progress.`,
      `Using a structured reference checklist and seeking timely extra help${inTopic} will build confidence.`,
      `Regular practice and verifying intermediate steps${inTopic} will support ${tokens.possessive} progress.`
    ],
    '1': [
      `Utilizing guided problem templates and attending regular extra help${inTopic} will support ${tokens.name}.`,
      `Reviewing core concepts and practicing foundational procedures${relatedTopic} will build consistency.`
    ],
    'R': [
      `Meeting with the teacher to establish an immediate intervention plan regarding ${cleanTask || 'course expectations'} is strongly recommended.`,
      `Submitting missing evidence and attending extra help sessions${onTopic} are urgent priorities.`
    ]
  }

  // Final report templates: Course has concluded, so next steps pivot forward to senior course
  // pathways, subsequent studies, or credit recovery (Ontario Growing Success & SCDSB guidelines)
  const finalTemplates = {
    '4+': [
      `Moving forward into senior coursework, ${tokens.name} is encouraged to continue exploring extension questions and independent inquiry.`,
      `As ${tokens.name} advances to future studies, maintaining this high standard of critical insight and theoretical justification will ensure continued success.`,
      `In subsequent senior coursework, ${tokens.name} is well prepared to tackle rigorous theoretical challenges and complex problem-solving inquiries.`,
      `For ongoing academic growth, ${tokens.name} should continue challenging ${tokens.reflexive || tokens.object} with non-routine problem solving and conceptual synthesis.`
    ],
    '4': [
      `Moving forward into senior courses, ${tokens.name} should continue utilizing structured problem-solving frameworks to tackle complex investigations.`,
      `To excel in subsequent studies, ${tokens.subjectLower} should maintain thorough written justifications and clear unit communication.`,
      `As ${tokens.name} progresses to higher-level coursework, practicing multi-step problem solving will sustain ${tokens.possessive} high achievement.`,
      `In future academic studies, ${tokens.name} is encouraged to sustain this rigorous approach to inquiry and quantitative problem solving.`
    ],
    '3': [
      `Moving forward into senior courses, ${tokens.name} is encouraged to review core problem-solving templates and verify multi-step calculations.`,
      `In future studies, maintaining structured review and practicing multi-step problem solving will support ${tokens.possessive} progress.`,
      `Moving forward into subsequent studies, consistent application of structured methods will reinforce ${tokens.name}'s ongoing success.`,
      `For future academic studies, ${tokens.name} should continue consolidating core concepts and seeking early clarification on complex topics.`
    ],
    '2': [
      `Prior to enrolling in subsequent courses, ${tokens.name} is encouraged to review foundational concepts and practice multi-step calculations independently.`,
      `In future coursework, establishing structured review routines and seeking timely clarification on challenging topics will build confidence.`,
      `Consolidating core procedures and formula applications will be key as ${tokens.name} transitions into subsequent academic studies.`,
      `To ensure success in future courses, ${tokens.name} would benefit from reinforcing foundational problem-solving strategies.`
    ],
    '1': [
      `Prior to advancing to subsequent courses in this subject, ${tokens.name} requires focused review of core curriculum expectations.`,
      `To prepare for future academic pathways, ${tokens.subjectLower} should review foundational concepts and strengthen basic problem-solving procedures.`,
      `Consistent practice with core formulas and terminology is strongly recommended before advancing to higher-level studies.`,
      `Seeking additional tutorial support to solidify essential concepts will be critical for ${tokens.name}'s future coursework.`
    ],
    'R': [
      `To work toward credit recovery, ${tokens.name} must consult with guidance to discuss remediation or summer school options.`,
      `Enrolling in credit recovery or repeating the course is strongly recommended to establish required curriculum competencies.`,
      `A consultation with guidance and student success is recommended to explore appropriate pathway options and credit recovery.`,
      `To satisfy diploma requirements, ${tokens.name} should attend summer school or enroll in credit recovery to complete essential expectations.`
    ]
  }

  const compactFinalTemplates = {
    '4+': [
      `In senior coursework, ${tokens.name} is encouraged to explore extension questions${inTopic}.`,
      `As ${tokens.name} advances to future studies, maintaining deep insight${inTopic} will ensure success.`
    ],
    '4': [
      `Moving forward into senior courses, ${tokens.name} should continue using structured problem frameworks${inTopic}.`,
      `In future studies, practicing multi-step problem solving${relatedTopic} will sustain high achievement.`
    ],
    '3': [
      `To prepare for subsequent courses, ${tokens.name} should review core problem templates${inTopic}.`,
      `In future coursework, consistent practice${relatedTopic} will reinforce ${tokens.possessive} success.`
    ],
    '2': [
      `Prior to subsequent courses, ${tokens.name} is encouraged to review foundational concepts${inTopic} independently.`,
      `In future studies, establishing consistent review routines${inTopic} will build confidence.`
    ],
    '1': [
      `Prior to advancing to subsequent courses, ${tokens.name} requires focused review${inTopic}.`,
      `Consistent practice${relatedTopic} is strongly recommended before advancing to subsequent studies.`
    ],
    'R': [
      `To work toward credit recovery, ${tokens.name} should consult with guidance regarding remediation in ${cleanTask || 'core curriculum expectations'}.`,
      `Enrolling in credit recovery or summer school is recommended to complete core expectations in ${cleanTask || 'this subject'}.`
    ]
  }

  const templates = isFinal
    ? (isCompact ? compactFinalTemplates : finalTemplates)
    : (isCompact ? compactTermTemplates : termTemplates)
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

  // 4. Strip trailing administrative / delivery container suffixes (" - Submission", " Submission", " Dropbox", " Worksheet #2", " Activity Sheet")
  const ADMIN_CONTAINERS = /\b(?:submission|submissions|dropbox|drop\s*box|hand-in|handin|turn-in|turnin|homework|hw|worksheet|worksheets|problem\s+set|packet|sheet|sheets|check-in|checkin|draft|final\s+draft|gizmo|gizmos|activity|activities|task|tasks)\b/gi
  t = t.replace(ADMIN_CONTAINERS, ' ').replace(/\s*#?\d+\s*$/, '').replace(/[\s:–—-]+$/, '').trim()

  return t
}

/**
 * Normalizes a raw assessment title or curriculum topic for natural pedagogical phrasing.
 * Strips awkward leading articles, expands bare topic keywords (e.g. "Projectile" -> "projectile motion"),
 * lowercases academic concepts, and preserves proper nouns/acronyms (e.g., "Newton's laws", "1D", "2D").
 */
export function formatCurriculumTopic(rawTitle) {
  if (!rawTitle) return ''
  let t = sanitizeTaskTitle(rawTitle)

  // Strip leading articles: "the Projectile" -> "Projectile", "a Lab" -> "Lab"
  t = t.replace(/^(?:the|a|an)\s+/i, '')

  const lower = t.toLowerCase().trim()

  // Shorthand or bare topic expansions common in Ontario secondary curriculum
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

  // Preserve explicit evaluation titles like "1D Kinematics Test" or "Forces & Friction Lab"
  if (/\b(test|quiz|lab|exam|assignment|checkpoint|project)\b/i.test(t)) {
    return t
  }

  // Otherwise, format as lowercase curriculum concept while preserving recognized proper nouns/acronyms
  const PROPER_PRESERVE = /\b(1d|2d|3d|newton'?s?|ohm'?s?|kirchhoff'?s?|hooke'?s?|kepler'?s?|boyle'?s?|charles'?s?|snell'?s?|cartesian|pythagorean|doppler|einstein|galileo|archimedes|canada|canadian|indigenous|first nations|inuit|m[eé]tis|french|english|ontario)\b/gi

  let formatted = lower.replace(PROPER_PRESERVE, match => {
    const m = match.toLowerCase()
    if (m === '1d') return '1D'
    if (m === '2d') return '2D'
    if (m === '3d') return '3D'
    return match.charAt(0).toUpperCase() + match.slice(1)
  })

  return formatted
}

/**
 * Checks if a title is too generic (e.g. "Quiz 1", "Lab 2", "Test 3", "Unit 1 Test", "Chapter 2 Quiz").
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

/**
 * Checks whether a category or task name represents non-academic tracking
 * (e.g. attendance, participation, homework, behavior).
 */
export function isNonAcademicCategory(name) {
  if (!name || typeof name !== 'string') return false
  const lower = name.trim().toLowerCase()
  if (NON_ACADEMIC_CATEGORIES.has(lower)) return true
  if (lower.includes('attendance') || lower.includes('participation')) return true
  if (lower.includes('homework') || lower.includes('behaviour') || lower.includes('behavior')) return true
  return false
}

/**
 * Determines whether an assessment should be excluded from report card comment evidence.
 * Excludes:
 * - Formative, diagnostic, or administrative tasks
 * - Tasks with 0% category weight
 * - Non-academic tasks (attendance, participation, homework, behavior)
 */
export function isCommentExcludedAssessment(assessment, classRecord = null) {
  if (!assessment) return false
  if (isFormativeAssessment(assessment, classRecord)) return true

  // Check assessment direct name or category
  if (isNonAcademicCategory(assessment.name) || isNonAcademicCategory(assessment.category)) {
    return true
  }

  // Check category lookup in classRecord / gradeData
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

  // 1. If already starts with an action gerund
  if (/^(analyzing|solving|calculating|creating|applying|modeling|investigating|conducting|constructing|interpreting|evaluating|representing)\b/i.test(lower)) {
    return clean
  }

  // 2. Specific evaluation events (e.g. "1D Kinematics Test", "Forces Lab")
  if (lower.includes('lab') || lower.includes('inquiry') || lower.includes('investigation')) {
    return lower.startsWith('the ') ? `conducting ${clean}` : `conducting the ${clean}`
  }
  if (lower.includes('test') || lower.includes('quiz') || lower.includes('exam')) {
    return lower.startsWith('the ') ? `completing ${clean}` : `completing the ${clean}`
  }

  // 3. Curriculum concepts & topics (e.g. "projectile motion", "light theory", "kinematics")
  if (lower.includes('theory') || lower.includes('concept') || lower.includes('law') || lower.includes('principle')) {
    return `applying ${clean} concepts`
  }
  if (lower.includes('motion') || lower.includes('projectile') || lower.includes('kinematic')) {
    return `analyzing ${clean}`
  }
  if (lower.includes('problem') || lower.includes('calculation') || lower.includes('equation')) {
    return `solving ${clean} problems`
  }

  // 4. Default natural phrasing (never "working on the [topic]")
  return `investigating ${clean}`
}

/**
 * Resolves a non-generic curriculum task name from an assessment object.
 * If the assessment name is generic ("Unit 1 Test", "Lab 2", "Module 1"), resolves from:
 * 1. Tagged curriculum expectations
 * 2. Assessment description
 * 3. Unit name
 * 4. Category name
 */
export function resolveAssessmentTaskName(ass, courseCode = '') {
  if (!ass) return ''

  // 1. Try matching course competency from the entire assessment (name, description, unitName, expectations)
  if (courseCode) {
    const allMatches = extractCompetenciesFromAssessment(ass, courseCode)
    if (allMatches.length > 0 && allMatches[0].phrase) {
      return allMatches[0].phrase
    }
  }

  // 2. If assessment has tagged expectations, use the top expectation
  if (Array.isArray(ass.expectations) && ass.expectations.length > 0) {
    const firstExp = ass.expectations[0]
    const condensed = condenseCurriculumExpectation(firstExp)
    if (condensed) {
      const mapped = courseCode ? mapAssessmentToCompetency(condensed, courseCode) : ''
      return mapped || condensed
    }
  }

  // 3. If unit name is available and non-generic, use unit topic
  if (ass.unitName && !isGenericTitle(ass.unitName)) {
    const cleanUnit = sanitizeTaskTitle(ass.unitName)
    if (cleanUnit && cleanUnit.length > 2) {
      const mapped = courseCode ? mapAssessmentToCompetency(cleanUnit, courseCode) : ''
      return mapped || cleanUnit
    }
  }

  // 4. If description is rich and non-generic, use description
  if (ass.description && !isGenericTitle(ass.description)) {
    const cleanDesc = sanitizeTaskTitle(ass.description)
    if (cleanDesc && cleanDesc.length > 3) {
      const mapped = courseCode ? mapAssessmentToCompetency(cleanDesc, courseCode) : ''
      return mapped || cleanDesc
    }
  }

  // 5. If assessment name is non-generic, sanitize and format
  if (ass.name && !isGenericTitle(ass.name)) {
    const cleanName = sanitizeTaskTitle(ass.name)
    if (cleanName && !isGenericTitle(cleanName)) {
      const mapped = courseCode ? mapAssessmentToCompetency(cleanName, courseCode) : ''
      return mapped || cleanName
    }
  }

  // 6. Fallback to category name if available
  if (ass.categoryName || ass.category) {
    const cat = (ass.categoryName || ass.category).toLowerCase().trim()
    if (CATEGORY_NORMALIZER[cat]) {
      return CATEGORY_NORMALIZER[cat]
    }
  }

  // 7. Final fallback to cleaned title if anything remains
  const cleanFallback = sanitizeTaskTitle(ass.name || '')
  return isGenericTitle(cleanFallback) ? '' : cleanFallback
}

/**
 * Derives a pedagogical profile focus for the student based on actual classroom evidence.
 * Detects:
 *  - 'qualitative_triangulation': Teacher observations / conversations recorded
 *  - 'trajectory_improving': Clear upward trend across recent assessments (+7% or SBAR rising)
 *  - 'modality_practical': Hands-on lab/inquiry performance >= 6% above test performance
 *  - 'modality_analytical': Analytical test/problem performance >= 6% above practical work
 *  - 'category_thinking' / 'category_communication' / 'category_application': Distinct Achievement Chart strengths
 *  - 'consistency_high': Standard deviation <= 5% across assessments with grade >= 70%
 *  - 'work_habits': When explicitly requested or elementary mode
 *  - 'curriculum_general': Standard level-calibrated Ontario Achievement Chart synthesis
 */
export function deriveStudentProfileFocus(gradeData = {}, learningSkills = {}, options = {}) {
  // If user explicitly specified a profile focus (other than 'auto'), honor it
  if (options?.profileFocus && options.profileFocus !== 'auto') {
    const manualMap = {
      inquiry_practical: { key: 'modality_practical', label: 'Hands-on Labs & Inquiry', badge: '🔬 Practical Inquiry' },
      modality_practical: { key: 'modality_practical', label: 'Hands-on Labs & Inquiry', badge: '🔬 Practical Inquiry' },
      analytical_theory: { key: 'modality_analytical', label: 'Analytical Problem Solving', badge: '📐 Analytical Focus' },
      modality_analytical: { key: 'modality_analytical', label: 'Analytical Problem Solving', badge: '📐 Analytical Focus' },
      growth_trajectory: { key: 'trajectory_improving', label: 'Rising Momentum', badge: '📈 Improving Trend' },
      trajectory_improving: { key: 'trajectory_improving', label: 'Rising Momentum', badge: '📈 Improving Trend' },
      consistent_rigor: { key: 'consistency_high', label: 'Consistent Performance', badge: '🎯 High Consistency' },
      consistency_high: { key: 'consistency_high', label: 'Consistent Performance', badge: '🎯 High Consistency' },
      category_thinking: { key: 'category_thinking', label: 'Critical Thinking', badge: '💡 Critical Thinking' },
      category_communication: { key: 'category_communication', label: 'Technical Communication', badge: '💬 Communication' },
      category_application: { key: 'category_application', label: 'Real-World Application', badge: '🌍 Application' },
      qualitative_evidence: { key: 'qualitative_triangulation', label: 'Triangulation (Observations/Conversations)', badge: '🗣️ Observations' },
      qualitative_triangulation: { key: 'qualitative_triangulation', label: 'Triangulation (Observations/Conversations)', badge: '🗣️ Observations' },
      learning_skills: { key: 'work_habits', label: 'Learning Skills & Work Habits', badge: '📋 Work Habits' },
      work_habits: { key: 'work_habits', label: 'Learning Skills & Work Habits', badge: '📋 Work Habits' },
      curriculum_general: { key: 'curriculum_general', label: 'Curriculum Application', badge: '📚 Curriculum Focus' }
    }
    const found = manualMap[options.profileFocus] || { key: options.profileFocus, label: options.profileFocus, badge: '📌 Selected Focus' }
    if (options?.mode === 'secondary' && (found.key === 'work_habits' || found.key === 'learning_skills')) {
      return { key: 'curriculum_general', label: 'Curriculum Application', badge: '📚 Curriculum Focus', metric: '' }
    }
    return { ...found, metric: '' }
  }

  if (options?.includeWorkHabits && options?.mode !== 'secondary') {
    return { key: 'work_habits', label: 'Learning Skills & Work Habits', badge: '📋 Work Habits', metric: '' }
  }

  const assessments = Array.isArray(gradeData?.assessments)
    ? gradeData.assessments.filter(a => typeof a.scorePercent === 'number' && !isCommentExcludedAssessment(a, gradeData))
    : []

  // 1. Trajectory / Rising Momentum
  // A. Check SBAR trends
  const sbar = Array.isArray(gradeData?.sbarExpectations) ? gradeData.sbarExpectations : []
  const improvingExpectations = sbar.filter(e => e.trend === 'improving' || e.trend === '+')
  if (improvingExpectations.length >= 2 || (improvingExpectations.length >= 1 && sbar.length <= 3)) {
    return {
      key: 'trajectory_improving',
      label: 'Rising Momentum',
      badge: '📈 Improving Trend',
      metric: `${improvingExpectations.length} expectations rising`
    }
  }

  // B. Check chronological assessment trajectory (if 3+ assessments)
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
        badge: '📈 Improving Trend',
        metric: `+${diff}% recently`
      }
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
          badge: '🔬 Practical Inquiry',
          metric: `${Math.round(avgLab)}% labs vs ${Math.round(avgTest)}% tests`
        }
      }
      if (labAdvantage <= -6) {
        const testAdvantage = Math.abs(labAdvantage)
        return {
          key: 'modality_analytical',
          label: `Stronger in Analytical/Tests (+${testAdvantage}%)`,
          badge: '📐 Analytical Focus',
          metric: `${Math.round(avgTest)}% tests vs ${Math.round(avgLab)}% labs`
        }
      }
    }
  }

  // 3. Achievement Chart Categories (Knowledge, Thinking, Communication, Application)
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
          badge: '💡 Critical Thinking',
          metric: `${Math.round(topCat.average)}% in Thinking`
        }
      }
      if (catName.includes('comm')) {
        return {
          key: 'category_communication',
          label: `Communication Strength (${Math.round(topCat.average)}%)`,
          badge: '💬 Communication',
          metric: `${Math.round(topCat.average)}% in Communication`
        }
      }
      if (catName.includes('app')) {
        return {
          key: 'category_application',
          label: `Application Strength (${Math.round(topCat.average)}%)`,
          badge: '🌍 Application',
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
        badge: '🎯 High Consistency',
        metric: `Consistent ${Math.round(mean)}%`
      }
    }
  }

  // 5. Qualitative Triangulation (Student-specific Observations / Conversations)
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
      badge: '🗣️ Triangulated Evidence',
      metric: (hasObservations && hasConversations) ? 'Conversations + Observations' : (hasConversations ? 'Classroom Conversations' : 'Teacher Observations')
    }
  }

  // 6. Default fallback: Level-calibrated Ontario Achievement Chart synthesis
  return {
    key: 'curriculum_general',
    label: 'Curriculum Application',
    badge: '📚 Curriculum Focus',
    metric: ''
  }
}

/**
 * Extracts best strength and growth evidence from available gradebook data.
 */
export function extractEvidenceFromGrades(gradeData = {}, courseCode = '') {
  const { sbarExpectations = [], assessments = [], categories = [] } = gradeData
  const resolvedCourseCode = courseCode || gradeData.courseCode || ''

  let strengthTask = null
  let strengthSource = 'holistic'
  let strengthScore = null
  let strengthModality = 'general'
  let growthTask = null
  let growthSource = 'holistic'
  let growthScore = null
  let growthModality = 'general'

  // 1. Try SBAR Expectations first
  if (Array.isArray(sbarExpectations) && sbarExpectations.length > 0) {
    const sorted = [...sbarExpectations].filter(e => e.average != null || e.masteryLevel != null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))

    if (sorted.length > 0) {
      const top = sorted[0]
      const condensedTop = condenseCurriculumExpectation(top)
      const rawTop = condensedTop || top.title || top.description || (top.code ? `Expectation ${top.code}` : null)
      const mappedTop = resolvedCourseCode ? mapAssessmentToCompetency(rawTop, resolvedCourseCode) : ''
      strengthTask = mappedTop || sanitizeTaskTitle(rawTop)
      strengthSource = 'sbar'
      strengthScore = top.average ?? (top.masteryLevel ? Number(top.masteryLevel) * 25 : null)
      strengthModality = 'expectation'

      const low = sorted[sorted.length - 1]
      if (sorted.length > 1 && low && low !== top) {
        const condensedLow = condenseCurriculumExpectation(low)
        const rawLow = condensedLow || low.title || low.description || (low.code ? `Expectation ${low.code}` : null)
        const mappedLow = resolvedCourseCode ? mapAssessmentToCompetency(rawLow, resolvedCourseCode) : ''
        growthTask = mappedLow || sanitizeTaskTitle(rawLow)
        growthSource = 'sbar'
        growthScore = low.average ?? (low.masteryLevel ? Number(low.masteryLevel) * 25 : null)
        growthModality = 'expectation'
      }
    }
  }

  // 2. Fall back to Individual Assessments if SBAR not present
  if (!strengthTask && Array.isArray(assessments) && assessments.length > 0) {
    const valid = assessments.filter(a => {
      if (typeof a.scorePercent !== 'number') return false
      if (isCommentExcludedAssessment(a, gradeData)) return false
      return true
    }).sort((a, b) => b.scorePercent - a.scorePercent)

    if (valid.length > 0) {
      const topAss = valid[0]
      strengthTask = resolveAssessmentTaskName(topAss, resolvedCourseCode)
      strengthSource = 'assessment'
      strengthScore = topAss.scorePercent
      strengthModality = topAss.assessmentType || (topAss.name?.toLowerCase().includes('lab') ? 'practical' : 'analytical')

      const lowAss = valid[valid.length - 1]
      if (valid.length > 1 && lowAss && lowAss.name !== valid[0].name) {
        growthTask = resolveAssessmentTaskName(lowAss, resolvedCourseCode)
        growthSource = 'assessment'
        growthScore = lowAss.scorePercent
        growthModality = lowAss.assessmentType || (lowAss.name?.toLowerCase().includes('lab') ? 'practical' : 'analytical')
      } else if (valid.length === 1 && topAss.description && resolvedCourseCode) {
        // When there is only 1 comprehensive assessment with a rich description,
        // extract the second-highest scoring competency from that assessment for growth!
        const allMatches = extractCompetenciesFromAssessment(topAss, resolvedCourseCode)
        if (allMatches.length > 1 && allMatches[1].phrase !== strengthTask) {
          growthTask = allMatches[1].phrase
          growthSource = 'assessment'
          growthScore = topAss.scorePercent
        }
      }
    }
  }

  // 3. Fall back to Categories (filtering non-academic & formative/0% ones & normalizing)
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
      strengthSource = 'category'
      strengthScore = topCat.average

      const lowCat = validCats[validCats.length - 1]
      if (validCats.length > 1 && lowCat) {
        const lowCatLower = (lowCat.name || '').trim().toLowerCase()
        growthTask = CATEGORY_NORMALIZER[lowCatLower] || lowCat.name
        growthSource = 'category'
        growthScore = lowCat.average
      }
    }
  }

  const profile = deriveStudentProfileFocus(gradeData)

  return {
    strengthTask,
    strengthSource,
    strengthScore,
    strengthModality,
    growthTask,
    growthSource,
    growthScore,
    growthModality,
    profileFocus: profile.key
  }
}

/**
 * Detects if Sentence 1 and Sentence 2 share the same evaluative main verb
 * (e.g. "demonstrates" in S1 and "demonstrates" in S2), preventing repetitive phrasing.
 */
export function hasVerbClash(s1, s2) {
  if (!s1 || !s2) return false
  const verbs = [
    'demonstrates?',
    'shows?',
    'applies?',
    'exhibits?',
    'excels?'
  ]
  for (const v of verbs) {
    const re = new RegExp(`\\b${v}\\b`, 'i')
    if (re.test(s1) && re.test(s2)) return true
  }
  return false
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
 * @param {boolean} [params.options.includeWorkHabits=false]
 * @param {string} [params.options.courseCode='']
 * @param {string} [params.options.reportingPeriod='Midterm']
 * @param {boolean} [params.options.isFinal=false]
 * @param {string} [params.options.profileFocus='auto']
 *
 * @returns {{
 *   text: string,
 *   charCount: number,
 *   wordCount: number,
 *   isOverLimit: boolean,
 *   charLimit: number,
 *   achievementLevel: Object,
 *   strengthLevel: Object,
 *   growthLevel: Object,
 *   strengthSource: string,
 *   growthSource: string,
 *   strengthTask: string,
 *   growthTask: string,
 *   strengthScore: number|null,
 *   growthScore: number|null,
 *   profileFocus: string,
 *   profileFocusLabel: string,
 *   profileBadge: string,
 *   profileMetric: string
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
    includeWorkHabits = false,
    courseCode = '',
    reportingPeriod = 'Midterm',
    isFinal = false,
    profileFocus = 'auto'
  } = options

  const resolvedIsFinal = Boolean(isFinal || reportingPeriod === 'Final')
  const resolvedCourseCode = courseCode || gradeData.courseCode || student.courseCode || ''

  // 1. Determine level & pronoun tokens
  const overallLevel = getAchievementLevel(gradeData.level || gradeData.percentage)
  const tokens = getPronounTokens(student, pronounMode)

  // 2. Resolve specific evidence tasks & calibrate levels
  const autoEvidence = extractEvidenceFromGrades(gradeData, resolvedCourseCode)
  const rawStrength = featuredStrength || autoEvidence.strengthTask || ''
  const rawGrowth = featuredNextStep || autoEvidence.growthTask || ''
  const strengthTask = (resolvedCourseCode ? mapAssessmentToCompetency(rawStrength, resolvedCourseCode) : '') || rawStrength
  const growthTask = (resolvedCourseCode ? mapAssessmentToCompetency(rawGrowth, resolvedCourseCode) : '') || rawGrowth

  // Calibrate strength sentence to strengthScore if available
  const sScore = autoEvidence.strengthScore
  let strengthLevel = (typeof sScore === 'number' && !isNaN(sScore)) ? getAchievementLevel(sScore) : overallLevel
  // If overall mark is Level 2+, strength task shouldn't use Level 1/R phrasing
  if ((overallLevel.key === '3' || overallLevel.key === '4' || overallLevel.key === '4+') && (strengthLevel.key === '1' || strengthLevel.key === 'R')) {
    strengthLevel = overallLevel
  }

  // Calibrate growth sentence to growthScore if available
  const gScore = autoEvidence.growthScore
  let growthLevel = (typeof gScore === 'number' && !isNaN(gScore)) ? getAchievementLevel(gScore) : overallLevel

  // Derive pedagogical profile focus
  const resolvedProfileFocus = (profileFocus && profileFocus !== 'auto') ? profileFocus : (autoEvidence.profileFocus || 'curriculum_general')
  const profile = deriveStudentProfileFocus(gradeData, learningSkills, {
    ...options,
    profileFocus: resolvedProfileFocus
  })

  // Deterministic variant index
  let seedNum = typeof variantSeed === 'number' ? variantSeed : 0
  if (typeof variantSeed === 'string') {
    for (let i = 0; i < variantSeed.length; i++) seedNum += variantSeed.charCodeAt(i)
  }

  // Helper generator functions for standard and compact sentences
  const getS1 = (compact, offset = 0) => getStrengthPhrases(tokens, strengthLevel, strengthTask, seedNum + offset, { compact })
  const getS2 = (compact, offset = 1) => {
    if (mode === 'secondary') {
      return getCurriculumApplicationPhrases(tokens, overallLevel, seedNum + offset, {
        profileFocus: (profile.key === 'work_habits' ? 'curriculum_general' : profile.key),
        learningSkills,
        compact,
        mode: 'secondary',
        courseCode: resolvedCourseCode
      })
    }
    if (includeWorkHabits || profile.key === 'work_habits') {
      return getWorkHabitPhrases(tokens, learningSkills, seedNum + offset, { compact })
    }
    return getCurriculumApplicationPhrases(tokens, overallLevel, seedNum + offset, {
      profileFocus: profile.key,
      learningSkills,
      compact,
      mode,
      courseCode: resolvedCourseCode
    })
  }
  const getS3 = (compact, offset = 2) => getNextStepPhrases(tokens, growthLevel, growthTask, seedNum + offset, {
    isFinal: resolvedIsFinal,
    courseCode: resolvedCourseCode,
    compact
  })

  let fullComment = ''

  if (mode === 'elementary') {
    // Elementary: Structured two-paragraph narrative
    const sentence1 = getS1(false, 0)
    const sentence2 = getS2(false, 1)
    const sentence3 = getS3(false, 2)
    const para1 = [sentence1, sentence2].filter(Boolean).join(' ')
    const para2 = [
      sentence3,
      `Continued partnership between home and school will support ${tokens.name}'s ongoing learning.`
    ].join(' ')
    fullComment = `${para1}\n\n${para2}`
  } else {
    // Secondary: Strictly concise 3-sentence body within charLimit (~400 chars)
    // Combinatorial Solver: ALWAYS preserves all 3 Growing Success sentences without dropping Sentence 2!
    // Evaluates across s1Offset (0..3), s2Offset (0..3), and s3Offset (0..3)
    // Enforces <= charLimit AND avoids repetitive verbs between Sentence 1 and Sentence 2!
    const stdS1 = getS1(false, 0)
    const stdS2 = getS2(false, 1)
    const stdS3 = getS3(false, 2)
    const initialCand = [stdS1, stdS2, stdS3].filter(Boolean).join(' ')

    if (initialCand.length <= charLimit && !hasVerbClash(stdS1, stdS2)) {
      fullComment = initialCand
    } else {
      let fitted = ''

      // Helper to evaluate candidates across offsets (s1Offset, s2Offset, s3Offset)
      const findBestCandidate = (compactS1, compactS2, compactS3) => {
        let candidateAny = ''
        for (let s1Offset = 0; s1Offset < 4; s1Offset++) {
          const altS1 = getS1(compactS1, s1Offset)
          for (let s2Offset = 0; s2Offset < 4; s2Offset++) {
            const altS2 = getS2(compactS2, s2Offset)
            const clash = hasVerbClash(altS1, altS2)
            for (let s3Offset = 0; s3Offset < 4; s3Offset++) {
              const altS3 = getS3(compactS3, s3Offset)
              const cand = [altS1, altS2, altS3].filter(Boolean).join(' ')
              if (cand.length <= charLimit) {
                if (!clash) {
                  return cand // Immediate return: fits <= charLimit and zero verb clash!
                }
                if (!candidateAny) {
                  candidateAny = cand
                }
              }
            }
          }
        }
        return candidateAny
      }

      // Tier 1: Standard S1 + Standard S2 + Standard S3 (prioritizing no verb clash)
      fitted = findBestCandidate(false, false, false)

      // Tier 2: Standard S1 + Compact S2 + Standard S3
      if (!fitted) {
        fitted = findBestCandidate(false, true, false)
      }

      // Tier 3: Standard S1 + Compact S2 + Compact S3
      if (!fitted) {
        fitted = findBestCandidate(false, true, true)
      }

      // Tier 4: Compact S1 + Compact S2 + Compact S3
      if (!fitted) {
        fitted = findBestCandidate(true, true, true)
      }

      // Tier 5: Emergency 3-sentence guarantee (ultra-compact, guaranteed <= 200 chars)
      if (!fitted) {
        const shortCleanStrength = formatCurriculumTopic(strengthTask)
        const shortCleanGrowth = formatCurriculumTopic(growthTask)
        const emergencyS1 = `${tokens.name} excels with ${strengthLevel.adjective} capability in ${shortCleanStrength}.`
        const emergencyS2 = `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} concepts with ${overallLevel.adjective} consistency.`
        const emergencyS3 = `Regular review of ${shortCleanGrowth} will support ongoing success.`
        fitted = [emergencyS1, emergencyS2, emergencyS3].join(' ')
      }

      fullComment = fitted
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
    strengthScore: autoEvidence.strengthScore,
    growthScore: autoEvidence.growthScore,
    profileFocus: profile.key,
    profileFocusLabel: profile.label,
    profileBadge: profile.badge,
    profileMetric: profile.metric
  }
}
