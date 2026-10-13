/**
 * src/utils/curriculumCompetencies.js
 *
 * Authentic Ontario Curriculum & Success Criteria competency mapping.
 * Translates raw gradebook assessment titles and descriptions into rich, professional
 * pedagogical skill phrases based on Ministry of Education curriculum strands.
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
 * Evaluates an assessment (with title and optional description) and extracts
 * all matching course competencies ranked by match score.
 *
 * @param {Object|string} assessment  Either { name, description } object or string title
 * @param {string} rawCourseCode
 * @returns {Array<{ label: string, phrase: string, score: number }>}
 */
export function extractCompetenciesFromAssessment(assessment, rawCourseCode) {
  const title = typeof assessment === 'string' ? assessment : (assessment?.name || assessment?.title || '')
  const description = typeof assessment === 'object' ? (assessment?.description || '') : ''
  const competencies = getCourseCompetencies(rawCourseCode)

  if (!competencies || competencies.length === 0) return []

  const scored = []
  for (const comp of competencies) {
    const score = scoreCompetencyMatch(comp, title, description)
    if (score > 0) {
      scored.push({
        label: comp.label,
        phrase: comp.phrase,
        score
      })
    }
  }

  return scored.sort((a, b) => b.score - a.score)
}

/**
 * Intelligently translates a raw assessment title (and optional description)
 * into an authentic curriculum competency phrase based on course code.
 *
 * If the title already matches a known competency phrase, it is returned intact.
 * Uses word-boundary matching and checks descriptions when available.
 * If no keywords match, falls back to the cleaned task title.
 */
export function mapAssessmentToCompetency(rawTitle, rawCourseCode, rawDescription = '') {
  if (!rawTitle) return ''
  const trimmed = String(rawTitle).trim()
  if (!trimmed) return ''

  // 1. Direct match check: did the user already pick a competency phrase or label?
  const competencies = getCourseCompetencies(rawCourseCode)
  const existingComp = competencies.find(c => c.phrase === trimmed || c.label === trimmed)
  if (existingComp) return existingComp.phrase

  // Also check if trimmed is already a known competency phrase across all courses
  for (const list of Object.values(COURSE_COMPETENCIES)) {
    const directMatch = list.find(c => c.phrase === trimmed || c.label === trimmed)
    if (directMatch) return directMatch.phrase
  }

  // 2. Keyword match with word-boundaries across title and description
  const matches = extractCompetenciesFromAssessment(
    { name: trimmed, description: rawDescription },
    rawCourseCode
  )

  if (matches.length > 0) {
    return matches[0].phrase
  }

  // 3. Fallback: Strip common evaluation wrappers ("Unit 1 - ", "Test", "Quiz", "Lab")
  let fallback = trimmed
    .replace(/^(unit|ch\.|chapter|module|section|strand)\s*\d+[\s:–—-]+/i, '')
    .replace(/\s+(unit\s+test|test|quiz|exam|inquiry\s+lab|lab\s+report|lab|assignment|worksheet|problem\s+set|evaluation|checkpoint)\b/gi, '')
    .trim()

  return fallback || trimmed
}
