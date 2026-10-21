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

import { mapAssessmentToCompetency, extractCompetenciesFromAssessment } from './curriculumCompetencies.js'
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
      isPlural: false,
    }
  }

  const raw = String(student?.pronouns || '').toLowerCase()

  if (/\b(they|them|their)\b/i.test(raw)) {
    return {
      name: firstName,
      subject: 'They',
      subjectLower: 'they',
      object: 'them',
      possessive: 'their',
      isPlural: true,
    }
  }

  if (/\b(she|her)\b/i.test(raw)) {
    return {
      name: firstName,
      subject: 'She',
      subjectLower: 'she',
      object: 'her',
      possessive: 'her',
      isPlural: false,
    }
  }

  if (/\b(he|him|his)\b/i.test(raw)) {
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
  if (pronounMode === 'preferred') {
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
  const cleanTask = formatCurriculumTopic(taskName || 'course learning goals')
  const isGerund = /^(analyzing|solving|constructing|applying|investigating|interpreting|evaluating|predicting|classifying|examining|designing|representing|calculating|resolving|measuring|mapping|building)\b/i.test(cleanTask)
  const capTask = isGerund ? (cleanTask.charAt(0).toUpperCase() + cleanTask.slice(1)) : ''
  const whenTask = isGerund ? cleanTask : makeGerund(cleanTask)
  const onTask = isGerund ? `when ${cleanTask}` : `on ${cleanTask}`
  const withTask = isGerund ? `when ${cleanTask}` : `with ${cleanTask}`

  const templates = {
    '4+': [
      isGerund
        ? `${capTask}, ${tokens.name} demonstrates exceptional analytical precision and deep insight.`
        : `${tokens.name} demonstrates exceptional analytical precision, excelling when ${whenTask}.`,
      `In advanced laboratory inquiries, ${tokens.name} demonstrates mastery when ${whenTask}.`,
      `${tokens.name} applies critical thinking skills with exemplary insight, particularly ${onTask}.`,
      `During complex problem-solving tasks, ${tokens.name} exhibits thorough precision when ${whenTask}.`
    ],
    '4': [
      isGerund
        ? `${capTask}, ${tokens.name} demonstrates strong problem-solving skills with high effectiveness.`
        : `${tokens.name} demonstrates a high degree of effectiveness, excelling when ${whenTask}.`,
      `During classroom inquiries and investigations, ${tokens.name} applies concepts with thorough consistency when ${whenTask}.`,
      `${tokens.name} exhibits commendable analytical skill and consistency, particularly ${onTask}.`,
      `In problem-solving tasks, ${tokens.name} applies learned skills with considerable precision when ${whenTask}.`
    ],
    '3': [
      isGerund
        ? `${capTask}, ${tokens.name} demonstrates competent understanding and solid skills.`
        : `${tokens.name} demonstrates competent understanding and solid skills when ${whenTask}.`,
      `During unit investigations, ${tokens.name} applies core course concepts reliably when ${whenTask}.`,
      `${tokens.name} produces good quality work and communicates solution steps clearly when ${whenTask}.`,
      `In classroom evaluations, ${tokens.name} shows sound problem-solving capability when ${whenTask}.`
    ],
    '2': [
      isGerund
        ? `With emerging consistency in ${cleanTask}, ${tokens.name} demonstrates developing understanding of core procedures.`
        : `${tokens.name} demonstrates developing understanding of key concepts in ${cleanTask}.`,
      `With guided practice, ${tokens.name} demonstrates some effectiveness when ${whenTask}.`,
      `${tokens.name} is making steady progress in foundational skills, showing promise when ${whenTask}.`,
      `During classroom activities, ${tokens.name} demonstrates developing capability ${onTask}, though consistency varies.`
    ],
    '1': [
      `With ongoing teacher support, ${tokens.name} is working to develop foundational skills in ${cleanTask}.`,
      `During class inquiries, ${tokens.name} demonstrates emerging familiarity when ${whenTask} with structured guidance.`,
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
 * Returns curriculum thinking, application, and inquiry variations based on achievement level.
 * Under Ontario Growing Success & SCDSB guidelines, secondary subject comments focus on
 * curriculum demonstration (Achievement Chart: Knowledge/Understanding, Thinking, Communication, Application)
 * rather than Learning Skills and Work Habits (which are already reported in the E/G/S/N columns).
 */
function getCurriculumApplicationPhrases(tokens, level, variant = 0) {
  const templates = {
    '4+': [
      `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} critical thinking skills to analyze complex scenarios and ${tokens.isPlural ? 'communicate' : 'communicates'} reasoning with precision.`,
      `${tokens.subject} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} sophisticated problem-solving strategies, interpreting data and justifying theoretical models.`,
      `${tokens.subject} ${tokens.isPlural ? 'synthesize' : 'synthesizes'} concepts effectively and ${tokens.isPlural ? 'express' : 'expresses'} mathematical and scientific reasoning with clarity.`,
      `In inquiry activities, ${tokens.subjectLower} ${tokens.isPlural ? 'evaluate' : 'evaluates'} experimental evidence and ${tokens.isPlural ? 'articulate' : 'articulates'} connections to practical contexts.`
    ],
    '4': [
      `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} learned concepts reliably to multi-step problems and ${tokens.isPlural ? 'communicate' : 'communicates'} reasoning clearly.`,
      `${tokens.subject} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} strong analytical capability during classroom inquiries and investigation tasks.`,
      `During problem solving, ${tokens.subjectLower} ${tokens.isPlural ? 'use' : 'uses'} appropriate conventions and ${tokens.isPlural ? 'explain' : 'explains'} methodology clearly.`,
      `${tokens.subject} effectively ${tokens.isPlural ? 'connect' : 'connects'} theoretical concepts to practical contexts and experimental results.`
    ],
    '3': [
      `${tokens.subject} ${tokens.isPlural ? 'apply' : 'applies'} course concepts with competence and generally ${tokens.isPlural ? 'communicate' : 'communicates'} solution steps clearly.`,
      `${tokens.subject} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} sound problem-solving skills during classroom investigations and evaluations.`,
      `When tackling multi-step tasks, ${tokens.subjectLower} ${tokens.isPlural ? 'use' : 'uses'} established methods and ${tokens.isPlural ? 'interpret' : 'interprets'} data appropriately.`,
      `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} good understanding of foundational procedures and ${tokens.isPlural ? 'explain' : 'explains'} reasoning clearly.`
    ],
    '2': [
      `${tokens.subject} ${tokens.isPlural ? 'show' : 'shows'} developing consistency when applying standard procedures to multi-step problem solving.`,
      `With guided practice, ${tokens.subjectLower} ${tokens.isPlural ? 'interpret' : 'interprets'} core relationships and ${tokens.isPlural ? 'communicate' : 'communicates'} steps with emerging accuracy.`,
      `${tokens.subject} ${tokens.isPlural ? 'demonstrate' : 'demonstrates'} some ability to connect concepts during inquiry tasks, though calculations require verification.`,
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

  const list = templates[level.key] || templates['3']
  const idx = Math.abs(variant) % list.length
  return list[idx]
}

/**
 * Returns actionable next step variations based on level and specific growth task.
 * For Final reports, next steps pivot forward to senior course pathways, future studies,
 * or credit recovery (under Ontario Growing Success & SCDSB guidelines).
 */
function getNextStepPhrases(tokens, level, growthTaskName, variant = 0, options = {}) {
  const isFinal = typeof options === 'boolean' ? options : Boolean(options?.isFinal)
  const cleanTask = formatCurriculumTopic(growthTaskName || 'multi-step problem solving')
  const lower = cleanTask.toLowerCase()
  const isGerund = /^(analyzing|solving|constructing|applying|investigating|interpreting|evaluating|predicting|classifying|examining|designing|representing|calculating)\b/i.test(lower)

  let whenTask = ''
  if (isGerund) {
    whenTask = `when ${cleanTask}`
  } else if (lower.includes('theory') || lower.includes('concept') || lower.includes('law') || lower.includes('principle')) {
    whenTask = `when applying ${cleanTask} concepts`
  } else if (lower.includes('lab') || lower.includes('inquiry') || lower.includes('investigation')) {
    whenTask = `during ${cleanTask}`
  } else if (lower.includes('test') || lower.includes('quiz') || lower.includes('exam')) {
    whenTask = `before ${cleanTask}`
  } else if (lower.includes('problem') || lower.includes('calculation') || lower.includes('equation')) {
    whenTask = `when solving ${cleanTask}`
  } else if (lower.includes('motion') || lower.includes('kinematic')) {
    whenTask = `when analyzing ${cleanTask}`
  } else {
    whenTask = `when working with ${cleanTask}`
  }

  const onTask = isGerund ? `when ${cleanTask}` : `on ${cleanTask}`
  const inTask = isGerund ? `when ${cleanTask}` : `in ${cleanTask}`

  // Standard term / midterm templates (actionable classroom strategies for upcoming units)
  const termTemplates = {
    '4+': [
      `Moving forward, ${tokens.name} is encouraged to explore advanced extension questions to deepen conceptual synthesis.`,
      `To extend learning, ${tokens.subjectLower} should seek opportunities to articulate reasoning and justify complex conclusions ${whenTask}.`,
      `Tackling novel, non-routine problems ${whenTask} will further enhance ${tokens.possessive} critical insight.`,
      `For ongoing growth, ${tokens.name} should continue challenging ${tokens.object} with independent enrichment inquiries ${whenTask}.`
    ],
    '4': [
      `Utilizing a structured problem-solving template will support ${tokens.name} in organizing multi-step solutions ${whenTask}.`,
      `To reach the highest standard, ${tokens.subjectLower} should review feedback and refine written justifications ${whenTask}.`,
      `Continuing to practice multi-step problem solving ${whenTask} will further solidify mastery.`,
      `For future assessments, ${tokens.name} should ensure thorough explanations and clear units accompany solutions ${whenTask}.`
    ],
    '3': [
      `Utilizing a step-by-step problem-solving ledger will help ${tokens.name} organize variables and calculations ${whenTask}.`,
      `Moving forward, ${tokens.name} should practice multi-step problem solving ${whenTask} before unit assessments.`,
      `Using a structured reference checklist will support ${tokens.name} in verifying intermediate steps ${whenTask}.`,
      `For continued improvement, consistent completion of practice problems related to ${cleanTask} is recommended.`
    ],
    '2': [
      `Utilizing a variable-mapping organizer and reference checklist will help ${tokens.name} organize solution steps ${whenTask}.`,
      `With guided practice, ${tokens.subjectLower} should review teacher feedback carefully and complete all practice ${onTask}.`,
      `Using a step-by-step problem-solving template and seeking timely extra help ${inTask} will build confidence.`,
      `Regular review of core concepts and completing sample exercises ${whenTask} will support ${tokens.possessive} progress.`
    ],
    '1': [
      `Utilizing a structured step-by-step organizer and attending regular extra help will support ${tokens.name} ${inTask}.`,
      `To develop consistency, ${tokens.subjectLower} should use guided templates to organize foundational procedures ${whenTask}.`,
      `Daily review of lesson notes and active participation in class review sessions ${whenTask} is essential.`,
      `Consistent completion of practice tasks and guided review ${whenTask} will help ${tokens.name} build required competencies.`
    ],
    'R': [
      `As an immediate priority, ${tokens.name} must meet with the teacher to establish an intervention plan regarding ${cleanTask}.`,
      `To work toward credit recovery, ${tokens.subjectLower} must submit missing evidence and attend structured remediation ${onTask}.`,
      `Regular attendance, active class engagement, and completion of foundational catch-up tasks ${inTask} are urgent priorities.`,
      `A parent-teacher consultation is recommended to support ${tokens.name} with consistent homework completion and review of ${cleanTask}.`
    ]
  }

  // Final report templates: Course has concluded, so next steps pivot forward to senior course
  // pathways, subsequent studies, or credit recovery (Ontario Growing Success & SCDSB guidelines)
  const finalTemplates = {
    '4+': [
      `Moving forward into senior coursework, ${tokens.name} is encouraged to continue exploring advanced extension questions and independent inquiry.`,
      `As ${tokens.name} advances to future studies, maintaining this high standard of critical insight and theoretical justification will ensure continued success.`,
      `In subsequent senior coursework, ${tokens.name} is well prepared to tackle rigorous theoretical challenges and complex problem-solving inquiries.`,
      `For ongoing academic growth, ${tokens.name} should continue challenging ${tokens.object} with non-routine problem solving and conceptual synthesis.`
    ],
    '4': [
      `Moving forward into senior courses, ${tokens.name} should continue utilizing structured problem-solving frameworks to tackle complex investigations.`,
      `To excel in subsequent studies, ${tokens.subjectLower} should maintain thorough written justifications and clear unit communication.`,
      `As ${tokens.name} progresses to higher-level coursework, practicing multi-step problem solving will sustain ${tokens.possessive} high achievement.`,
      `In future academic studies, ${tokens.name} is encouraged to sustain this diligent approach to inquiry and quantitative problem solving.`
    ],
    '3': [
      `To prepare for subsequent courses, ${tokens.name} is encouraged to review core problem-solving templates and verify multi-step calculations.`,
      `In future studies, maintaining regular review habits and practicing multi-step problem solving will support ${tokens.possessive} progress.`,
      `Moving forward into subsequent coursework, consistent application of structured methods will reinforce ${tokens.name}'s ongoing success.`,
      `For future academic pathways, ${tokens.name} should continue consolidating core concepts and seeking early clarification on complex topics.`
    ],
    '2': [
      `Prior to enrolling in subsequent courses, ${tokens.name} is encouraged to review foundational concepts and practice multi-step calculations independently.`,
      `In future coursework, establishing consistent study routines and seeking timely extra help on challenging topics will build confidence.`,
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

  const templates = isFinal ? finalTemplates : termTemplates
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
  'behavior',
  'behaviour'
])

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
 * Extracts best strength and growth evidence from available gradebook data.
 */
export function extractEvidenceFromGrades(gradeData = {}, courseCode = '') {
  const { sbarExpectations = [], assessments = [], categories = [] } = gradeData
  const resolvedCourseCode = courseCode || gradeData.courseCode || ''

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
      const mappedTop = resolvedCourseCode ? mapAssessmentToCompetency(rawTop, resolvedCourseCode) : ''
      strengthTask = mappedTop || sanitizeTaskTitle(rawTop)
      strengthSource = 'sbar'

      const low = sorted[sorted.length - 1]
      if (sorted.length > 1 && low && low !== top) {
        const rawLow = low.title || low.description || (low.code ? `Expectation ${low.code}` : null)
        const mappedLow = resolvedCourseCode ? mapAssessmentToCompetency(rawLow, resolvedCourseCode) : ''
        growthTask = mappedLow || sanitizeTaskTitle(rawLow)
        growthSource = 'sbar'
      }
    }
  }

  // 2. Fall back to Individual Assessments if SBAR not present
  if (!strengthTask && Array.isArray(assessments) && assessments.length > 0) {
    const valid = assessments.filter(a => {
      if (typeof a.scorePercent !== 'number') return false
      if (isFormativeAssessment(a, gradeData)) return false
      return true
    }).sort((a, b) => b.scorePercent - a.scorePercent)

    if (valid.length > 0) {
      const topAss = valid[0]
      // If assessment name is generic ("Lab 1") and description is rich, use description!
      const topName = (isGenericTitle(topAss.name) && topAss.description)
        ? topAss.description
        : topAss.name
      const mappedTop = resolvedCourseCode ? mapAssessmentToCompetency(topName, resolvedCourseCode, topAss.description) : ''
      strengthTask = mappedTop || sanitizeTaskTitle(topName)
      strengthSource = 'assessment'

      const lowAss = valid[valid.length - 1]
      if (valid.length > 1 && lowAss && lowAss.name !== valid[0].name) {
        const lowName = (isGenericTitle(lowAss.name) && lowAss.description)
          ? lowAss.description
          : lowAss.name
        const mappedLow = resolvedCourseCode ? mapAssessmentToCompetency(lowName, resolvedCourseCode, lowAss.description) : ''
        growthTask = mappedLow || sanitizeTaskTitle(lowName)
        growthSource = 'assessment'
      } else if (valid.length === 1 && topAss.description && resolvedCourseCode) {
        // When there is only 1 comprehensive assessment with a rich description,
        // extract the second-highest scoring competency from that assessment for growth!
        const allMatches = extractCompetenciesFromAssessment(topAss, resolvedCourseCode)
        if (allMatches.length > 1 && allMatches[1].phrase !== mappedTop) {
          growthTask = allMatches[1].phrase
          growthSource = 'assessment'
        }
      }
    }
  }

  // 3. Fall back to Categories (filtering non-academic & formative/0% ones & normalizing)
  if (!strengthTask && Array.isArray(categories) && categories.length > 0) {
    const validCats = categories.filter(c => {
      if (typeof c.average !== 'number') return false
      const nameLower = (c.name || '').trim().toLowerCase()
      if (NON_ACADEMIC_CATEGORIES.has(nameLower)) return false
      if (nameLower.includes('formative') || nameLower.includes('diagnostic') || nameLower.includes('practice')) return false
      if (c.weight !== undefined && Number(c.weight) <= 0) return false
      return true
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
    includeWorkHabits = false,
    courseCode = '',
    reportingPeriod = 'Midterm',
    isFinal = false
  } = options

  const resolvedIsFinal = Boolean(isFinal || reportingPeriod === 'Final')
  const resolvedCourseCode = courseCode || gradeData.courseCode || student.courseCode || ''

  // 1. Determine level & pronoun tokens
  const level = getAchievementLevel(gradeData.level || gradeData.percentage)
  const tokens = getPronounTokens(student, pronounMode)

  // 2. Resolve specific evidence tasks
  const autoEvidence = extractEvidenceFromGrades(gradeData, resolvedCourseCode)
  const rawStrength = featuredStrength || autoEvidence.strengthTask || ''
  const rawGrowth = featuredNextStep || autoEvidence.growthTask || ''
  const strengthTask = (resolvedCourseCode ? mapAssessmentToCompetency(rawStrength, resolvedCourseCode) : '') || rawStrength
  const growthTask = (resolvedCourseCode ? mapAssessmentToCompetency(rawGrowth, resolvedCourseCode) : '') || rawGrowth

  // Deterministic variant index
  let seedNum = typeof variantSeed === 'number' ? variantSeed : 0
  if (typeof variantSeed === 'string') {
    for (let i = 0; i < variantSeed.length; i++) seedNum += variantSeed.charCodeAt(i)
  }

  // 3. Assemble Sentences
  const sentence1 = getStrengthPhrases(tokens, level, strengthTask, seedNum)
  
  // Sentence 2: Under Growing Success & SCDSB policy, Secondary comments focus on curriculum
  // demonstration (Thinking & Application). Elementary mode uses Learning Skills.
  const sentence2 = (mode === 'secondary' && !includeWorkHabits)
    ? getCurriculumApplicationPhrases(tokens, level, seedNum + 1)
    : getWorkHabitPhrases(tokens, learningSkills, seedNum + 1)

  const sentence3 = getNextStepPhrases(tokens, level, growthTask, seedNum + 2, {
    isFinal: resolvedIsFinal,
    courseCode: resolvedCourseCode
  })

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

    // If strictly over the character budget, search for a valid combination that fits <= charLimit
    if (fullComment.length > charLimit) {
      let fitted = ''

      // Tier 1: Search across variant combinations of 3 sentences (s1, sentence2, s3)
      for (let s1Offset = 1; s1Offset <= 4; s1Offset++) {
        const altS1 = getStrengthPhrases(tokens, level, strengthTask, seedNum + s1Offset)
        for (let s3Offset = 1; s3Offset <= 4; s3Offset++) {
          const altS3 = getNextStepPhrases(tokens, level, growthTask, seedNum + s3Offset, {
            isFinal: resolvedIsFinal,
            courseCode: resolvedCourseCode
          })
          const candidate3 = [altS1, sentence2, altS3].filter(Boolean).join(' ')
          if (candidate3.length <= charLimit) {
            fitted = candidate3
            break
          }
        }
        if (fitted) break
      }

      // Tier 2: If 3 sentences still exceed charLimit (due to long curriculum strings), drop sentence 2
      if (!fitted) {
        for (let s1Offset = 0; s1Offset < 4; s1Offset++) {
          const altS1 = getStrengthPhrases(tokens, level, strengthTask, seedNum + s1Offset)
          for (let s3Offset = 0; s3Offset < 4; s3Offset++) {
            const altS3 = getNextStepPhrases(tokens, level, growthTask, seedNum + s3Offset, {
              isFinal: resolvedIsFinal,
              courseCode: resolvedCourseCode
            })
            const candidate2 = [altS1, altS3].filter(Boolean).join(' ')
            if (candidate2.length <= charLimit) {
              fitted = candidate2
              break
            }
          }
          if (fitted) break
        }
      }

      // Tier 3: Concise guaranteed emergency fallback
      if (!fitted) {
        const conciseS1 = `${tokens.name} demonstrates ${level.adjective} achievement when working with ${formatCurriculumTopic(strengthTask)}.`
        const conciseS3 = getNextStepPhrases(tokens, level, growthTask, seedNum, {
          isFinal: resolvedIsFinal,
          courseCode: resolvedCourseCode
        })
        fitted = [conciseS1, conciseS3].join(' ')
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
    achievementLevel: level,
    strengthSource: featuredStrength ? 'manual' : autoEvidence.strengthSource,
    growthSource: featuredNextStep ? 'manual' : autoEvidence.growthSource,
    strengthTask,
    growthTask
  }
}
