/**
 * src/utils/curriculumCompetencies.js
 *
 * Authentic Ontario Curriculum & Success Criteria competency mapping.
 * Translates raw gradebook assessment titles and descriptions into rich, professional
 * pedagogical skill phrases, concise noun-phrase short topics, and concept-matched tools
 * based on Ministry of Education curriculum strands.
 *
 * Secondary courses are modularized in src/data/comments/secondary/ for easy maintainability.
 */

import {
  COURSE_COMPETENCIES,
  DEPARTMENT_FALLBACKS
} from '../data/comments/secondary/index.js'

export { COURSE_COMPETENCIES, DEPARTMENT_FALLBACKS }

/**
 * Normalizes a course string (e.g. "SPH3U-01", "Grade 11 Physics (SPH3U)", "sph3u")
 * to standard 5-character Ontario course code (e.g. "SPH3U").
 */
export function normalizeCourseCode(raw) {
  if (!raw) return ''
  const str = String(raw).toUpperCase().trim()
  const match = str.match(/\b([A-Z]{3}[0-9][A-Z0-9])\b/)
  if (match) return match[1]

  // Friendly aliases for class names without standard 5-char course codes
  if (str.includes('PHYSIC') && (str.includes('11') || str.includes('3U'))) return 'SPH3U'
  if (str.includes('PHYSIC') && (str.includes('12') || str.includes('4U'))) return 'SPH4U'
  if (str.includes('CHEM') && (str.includes('11') || str.includes('3U'))) return 'SCH3U'
  if (str.includes('BIO') && (str.includes('11') || str.includes('3U'))) return 'SBI3U'
  if (str.includes('SCIENCE') && (str.includes('9') || str.includes('1W') || str.includes('1D'))) return 'SNC1W'
  if (str.includes('SCIENCE') && (str.includes('10') || str.includes('2D') || str.includes('2P'))) return 'SNC2D'
  if (str.includes('MATH') && (str.includes('9') || str.includes('1W'))) return 'MTH1W'
  if (str.includes('MATH') && (str.includes('10') || str.includes('2D'))) return 'MPM2D'

  return str.slice(0, 5)
}

/**
 * Robust word-boundary keyword matcher.
 * Prevents false positives where substrings match inside unrelated words
 * (e.g., "stem" matching inside "systems").
 * Allows common morphological endings (e.g. "force" matches "forces", "friction" matches "frictional").
 */
export function matchesKeyword(text, keyword) {
  if (!text || !keyword) return false
  const escaped = String(keyword).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}(s|es|ed|ing|al)?([^a-zA-Z0-9]|$)`, 'i')
  return regex.test(text)
}

/**
 * Calculates a match score for a given competency against an assessment title and optional description.
 * Title hits are weighted 3x higher than description hits.
 */
export function scoreCompetencyMatch(competency, title = '', description = '') {
  if (!competency || !Array.isArray(competency.keywords)) return 0
  let titleHits = 0
  let descHits = 0

  for (const kw of competency.keywords) {
    if (title && matchesKeyword(title, kw)) {
      titleHits++
    }
    if (description && matchesKeyword(description, kw)) {
      descHits++
    }
  }

  return (titleHits * 3) + descHits
}

/**
 * Returns available curated competencies for a given course code.
 * Falls back to generic science/math competencies if course is unlisted.
 */
export function getCourseCompetencies(rawCourseCode) {
  const code = normalizeCourseCode(rawCourseCode)
  if (COURSE_COMPETENCIES[code]) {
    return COURSE_COMPETENCIES[code]
  }

  // Broad departmental fallback
  if (code.startsWith('S')) {
    return DEPARTMENT_FALLBACKS.science
  }

  if (code.startsWith('M')) {
    return DEPARTMENT_FALLBACKS.math
  }

  return []
}

/**
 * Evaluates an assessment (with title, optional description, unitName, expectations)
 * and extracts all matching course competencies ranked by match score.
 *
 * @param {Object|string} assessment  Either { name, description, unitName, expectations } object or string title
 * @param {string} rawCourseCode
 * @returns {Array<{ label: string, phrase: string, phraseVariants?: string[], shortTopics?: string[], tools?: string[], score: number }>}
 */
export function extractCompetenciesFromAssessment(assessment, rawCourseCode) {
  const title = typeof assessment === 'string' ? assessment : (assessment?.name || assessment?.title || '')
  let description = typeof assessment === 'object' ? (assessment?.description || '') : ''
  if (typeof assessment === 'object') {
    if (assessment?.unitName) {
      description += ` ${assessment.unitName}`
    }
    if (Array.isArray(assessment?.expectations) && assessment.expectations.length > 0) {
      const expText = assessment.expectations.map(e => `${e.title || ''} ${e.description || ''}`).join(' ')
      description += ` ${expText}`
    }
  }
  const competencies = getCourseCompetencies(rawCourseCode)

  if (!competencies || competencies.length === 0) return []

  const scored = []
  for (const comp of competencies) {
    const score = scoreCompetencyMatch(comp, title, description)
    if (score > 0) {
      scored.push({
        label: comp.label,
        phrase: comp.phrase,
        phraseVariants: comp.phraseVariants,
        shortTopics: comp.shortTopics || [],
        tools: comp.tools || [],
        score
      })
    }
  }

  return scored.sort((a, b) => b.score - a.score)
}

/**
 * Condenses an Ontario Ministry expectation description or "I can" Success Criteria string
 * into a parent-friendly, pedagogically authentic gerund/topic phrase strictly under ~65 characters.
 * Ensures report comments never blow the tight 400-character secondary budget.
 *
 * @param {string|Object} rawInput Expectation object or text description
 * @param {string} [rawCourseCode=''] Optional course code for competency matching
 * @returns {string}
 */
export function condenseCurriculumExpectation(rawInput, rawCourseCode = '') {
  if (!rawInput) return ''
  const text = typeof rawInput === 'string'
    ? rawInput
    : (rawInput.title || rawInput.description || rawInput.name || '')
  const trimmed = String(text).trim()
  if (!trimmed) return ''

  // 1. If courseCode provided and matches a curated competency, use it
  if (rawCourseCode) {
    const compMatch = mapAssessmentToCompetency(trimmed, rawCourseCode)
    if (compMatch && compMatch !== trimmed && compMatch.length <= 75) {
      return compMatch
    }
  }

  // 2. If already a clean, concise phrase under 55 chars without boilerplate, return it
  if (trimmed.length <= 55 && !/^(i\s+can|students?\s+will|demonstrate|investigate|analyse|analyze)\b/i.test(trimmed)) {
    return trimmed.replace(/[.]+$/, '').trim()
  }

  let s = trimmed

  // Strip expectation code prefixes like "B2.1: ", "[B1.2] ", "SC.C1.1 - "
  s = s.replace(/^(?:\[[A-Z0-9.]+\][\s:–—-]+|(?:[A-Z]{1,4}\.)?[A-Z0-9]*\d[A-Z0-9.]*[\s:–—-]+|[A-Z]{1,3}[:–—-]\s*)/i, '')

  // Strip standard curriculum boilerplate prefixes
  s = s.replace(/^i\s+can\s+(?:demonstrate\s+(?:an\s+)?understanding\s+of\s+)?/i, '')
  s = s.replace(/^students?\s+will\s+(?:be\s+able\s+to\s+)?/i, '')
  s = s.replace(/^demonstrate\s+(?:an\s+)?understanding\s+of\s+/i, '')
  s = s.replace(/^investigate,?\s+in\s+qualitative\s+and\s+quantitative\s+terms,?\s+/i, '')
  s = s.replace(/^investigate\s+and\s+analyse\s+/i, 'analyzing ')
  s = s.replace(/^analyse\s+and\s+interpret\s+/i, 'interpreting ')

  // Strip parenthetical examples: (e.g., ...) or (such as ...)
  s = s.replace(/\s*\([^)]*\)/g, '')

  // Cut off secondary clauses after semicolons
  if (s.includes(';')) {
    s = s.split(';')[0].trim()
  }

  // If still long, cut off secondary clauses at major conjunctions
  if (s.length > 65) {
    const splitMatch = s.match(/^(.*?)(?:,\s*and\s+|\s+in\s+order\s+to\s+|\s+by\s+measuring\s+|\s+through\s+the\s+use\s+of\s+)/i)
    if (splitMatch && splitMatch[1] && splitMatch[1].length >= 25) {
      s = splitMatch[1].trim()
    }
  }

  // Convert leading base verb into natural action gerund
  const GERUND_MAP = [
    [/^analyse\b/i, 'analyzing'],
    [/^analyze\b/i, 'analyzing'],
    [/^evaluate\b/i, 'evaluating'],
    [/^investigate\b/i, 'investigating'],
    [/^solve\b/i, 'solving'],
    [/^explain\b/i, 'explaining'],
    [/^describe\b/i, 'describing'],
    [/^compare\b/i, 'comparing'],
    [/^identify\b/i, 'identifying'],
    [/^calculate\b/i, 'calculating'],
    [/^determine\b/i, 'determining'],
    [/^construct\b/i, 'constructing'],
    [/^design\b/i, 'designing'],
    [/^conduct\b/i, 'conducting'],
    [/^compile\b/i, 'compiling'],
    [/^communicate\b/i, 'communicating'],
    [/^apply\b/i, 'applying'],
    [/^model\b/i, 'modelling'],
    [/^predict\b/i, 'predicting'],
    [/^measure\b/i, 'measuring'],
    [/^interpret\b/i, 'interpreting'],
    [/^formulate\b/i, 'formulating'],
    [/^use\b/i, 'using'],
    [/^select\b/i, 'selecting'],
    [/^draw\b/i, 'drawing'],
    [/^verify\b/i, 'verifying'],
    [/^assess\b/i, 'assessing'],
    [/^add\b/i, 'adding'],
    [/^subtract\b/i, 'subtracting'],
    [/^multiply\b/i, 'multiplying'],
    [/^divide\b/i, 'dividing'],
    [/^compose\b/i, 'composing'],
    [/^decompose\b/i, 'decomposing'],
    [/^create\b/i, 'creating'],
    [/^explore\b/i, 'exploring'],
    [/^demonstrate\b/i, 'demonstrating']
  ]

  for (const [pattern, replacement] of GERUND_MAP) {
    if (pattern.test(s)) {
      s = s.replace(pattern, replacement)
      break
    }
  }

  // Clean trailing punctuation
  s = s.replace(/[.,;:]+$/, '').trim()

  // Strict length clamp (target <= 65 chars, max 70 at word boundary)
  if (s.length > 68) {
    const cut = s.slice(0, 65)
    const lastSpace = cut.lastIndexOf(' ')
    if (lastSpace > 25) {
      s = cut.slice(0, lastSpace).replace(/\s+(?:and|or|of|in|to|with|the|a|an|for)$/i, '').trim()
    } else {
      s = cut.trim()
    }
  }

  return s
}

/**
 * Selects a gerund competency phrase variant by variantIndex.
 * Variant 0 always returns the primary `comp.phrase`.
 */
export function pickCompetencyPhrase(comp, variantIndex = 0) {
  if (!comp) return ''
  const idx = Math.abs(Math.floor(Number(variantIndex) || 0))
  if (idx > 0 && Array.isArray(comp.phraseVariants) && comp.phraseVariants.length > 0) {
    return comp.phraseVariants[idx % comp.phraseVariants.length] || comp.phrase
  }
  return comp.phrase || ''
}

/**
 * Selects a concise lowercase noun-phrase short topic for preposition contexts (`with ...`, `in ...`).
 */
export function pickCompetencyShortTopic(comp, variantIndex = 0) {
  if (!comp) return ''
  const idx = Math.abs(Math.floor(Number(variantIndex) || 0))
  if (Array.isArray(comp.shortTopics) && comp.shortTopics.length > 0) {
    return comp.shortTopics[idx % comp.shortTopics.length] || comp.phrase
  }
  return comp.phrase || ''
}

/**
 * Selects a concept-matched study tool/strategy noun phrase from a competency.
 */
export function pickCompetencyTool(comp, variantIndex = 0) {
  if (!comp) return ''
  const idx = Math.abs(Math.floor(Number(variantIndex) || 0))
  if (Array.isArray(comp.tools) && comp.tools.length > 0) {
    return comp.tools[idx % comp.tools.length] || ''
  }
  return ''
}

function matchesCompetencyDirectly(comp, trimmed) {
  if (!comp || !trimmed) return false
  return comp.phrase === trimmed ||
    comp.label === trimmed ||
    (Array.isArray(comp.phraseVariants) && comp.phraseVariants.includes(trimmed)) ||
    (Array.isArray(comp.shortTopics) && comp.shortTopics.includes(trimmed))
}

/**
 * Resolves the full competency object for a task title, competency phrase, label, or description.
 */
export function resolveCompetencyObject(rawInput, rawCourseCode = '', rawDescription = '') {
  if (!rawInput) return null
  const trimmed = String(rawInput).trim()
  if (!trimmed) return null

  const competencies = getCourseCompetencies(rawCourseCode)
  const existingComp = competencies.find(c => matchesCompetencyDirectly(c, trimmed))
  if (existingComp) return existingComp

  for (const list of Object.values(COURSE_COMPETENCIES)) {
    const directMatch = list.find(c => matchesCompetencyDirectly(c, trimmed))
    if (directMatch) return directMatch
  }

  for (const list of Object.values(DEPARTMENT_FALLBACKS)) {
    const fallbackMatch = list.find(c => matchesCompetencyDirectly(c, trimmed))
    if (fallbackMatch) return fallbackMatch
  }

  const matches = extractCompetenciesFromAssessment(
    { name: trimmed, description: rawDescription },
    rawCourseCode
  )
  if (matches.length > 0) {
    return competencies.find(c => c.label === matches[0].label) || matches[0]
  }

  return null
}

function stripAdministrativeWrappers(rawTitle) {
  let fallback = String(rawTitle || '').trim()
    .replace(/^(unit|ch\.|chapter|module|section|strand)\s*[a-z0-9]+(?:\s*[\s:–—-]\s*|\s+)/i, '')
    .replace(/\s+(unit\s+test|test|quiz|exam|inquiry\s+lab|lab\s+report|lab|assignment|worksheet|problem\s+set|evaluation|checkpoint|submission|dropbox|hand-in|handin|turn-in|turnin|activity|gizmo|packet|sheet)\b/gi, '')
    .replace(/[\s:–—-]+$/, '')
    .trim()

  if (!fallback || /^(unit|ch\.|chapter|module|section|strand)\s*[a-z0-9]*$/i.test(fallback) || /^(test|quiz|lab|assignment|eval|task|exam|submission|dropbox|hand-in|activity|gizmo|worksheet)$/i.test(fallback)) {
    return ''
  }
  return fallback
}

/**
 * Intelligently translates a raw assessment title (and optional description)
 * into an authentic curriculum competency phrase based on course code.
 *
 * If the title already matches a known competency phrase, it is returned intact.
 * Uses word-boundary matching and checks descriptions when available.
 * If no keywords match, falls back to the cleaned task title.
 */
export function mapAssessmentToCompetency(rawTitle, rawCourseCode, rawDescription = '', variantIndex = 0) {
  if (!rawTitle) return ''
  const trimmed = String(rawTitle).trim()
  if (!trimmed) return ''

  const comp = resolveCompetencyObject(trimmed, rawCourseCode, rawDescription)
  if (comp) {
    return pickCompetencyPhrase(comp, variantIndex)
  }

  return stripAdministrativeWrappers(trimmed)
}

/**
 * Maps a raw assessment title or competency phrase to a concise lowercase noun-phrase shortTopic.
 */
export function mapAssessmentToShortTopic(rawTitle, rawCourseCode, rawDescription = '', variantIndex = 0) {
  if (!rawTitle) return ''
  const trimmed = String(rawTitle).trim()
  if (!trimmed) return ''

  const comp = resolveCompetencyObject(trimmed, rawCourseCode, rawDescription)
  if (comp) {
    return pickCompetencyShortTopic(comp, variantIndex)
  }

  return stripAdministrativeWrappers(trimmed)
}

/**
 * Maps a raw assessment title or competency phrase to a concept-matched study tool/strategy.
 * Falls back to department-appropriate study strategies when no specific competency matches.
 */
export function mapAssessmentToTool(rawTitle, rawCourseCode = '', rawDescription = '', variantIndex = 0) {
  const idx = Math.abs(Math.floor(Number(variantIndex) || 0))
  if (rawTitle) {
    const comp = resolveCompetencyObject(String(rawTitle).trim(), rawCourseCode, rawDescription)
    if (comp) {
      const tool = pickCompetencyTool(comp, idx)
      if (tool) return tool
    }
  }

  const code = normalizeCourseCode(rawCourseCode)
  let fallbackComps = DEPARTMENT_FALLBACKS.general || []
  if (code.startsWith('S')) {
    fallbackComps = DEPARTMENT_FALLBACKS.science || []
  } else if (code.startsWith('M')) {
    fallbackComps = DEPARTMENT_FALLBACKS.math || []
  }

  const toolPool = fallbackComps.flatMap(c => Array.isArray(c.tools) ? c.tools : []).filter(Boolean)
  if (toolPool.length > 0) {
    return toolPool[idx % toolPool.length]
  }
  return 'a structured revision checklist'
}
