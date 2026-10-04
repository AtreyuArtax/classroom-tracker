/**
 * src/utils/categoryUtils.js
 *
 * Utilities for formatting and abbreviating assessment categories
 * across gradebooks, reports, and dossier views.
 */

const KNOWN_CATEGORY_MAP = [
  // Culminating / Culminating Task / Culminating Activity
  { pattern: /\bculm/i, code: 'Culm' },

  // Activities / Class Activity
  { pattern: /\bactivit/i, code: 'Act' },

  // Assignments / Assignment
  { pattern: /\bassign/i, code: 'Asmt' },

  // Projects / Project
  { pattern: /\bproject/i, code: 'Proj' },

  // Labs / Laboratory
  { pattern: /\b(labs?|laborat)/i, code: 'Lab' },

  // Examinations / Exam / Final Exam
  { pattern: /\bexam/i, code: 'Exam' },

  // Tests / Unit Tests / Tests & Quizzes
  { pattern: /\btests?\s*(&|and)\s*quizz?es?/i, code: 'Test' },
  { pattern: /\btest/i, code: 'Test' },

  // Quizzes / Quiz
  { pattern: /\bquiz/i, code: 'Quiz' },

  // Midterm
  { pattern: /\bmidterm/i, code: 'Mid' },

  // Presentations / Presentation
  { pattern: /\bpresent/i, code: 'Pres' },

  // Homework
  { pattern: /\bhome\s*work/i, code: 'HW' },

  // Ontario Growing Success Achievement Chart Categories
  { pattern: /\bknow/i, code: 'K&U' },
  { pattern: /\b(think|inquir)/i, code: 'T&I' },
  { pattern: /\bcomm/i, code: 'Comm' },
  { pattern: /\bapp/i, code: 'App' },

  // Portfolio
  { pattern: /\bportfol/i, code: 'Port' },

  // Journal
  { pattern: /\bjourn/i, code: 'Jour' },

  // Investigation
  { pattern: /\binvestig/i, code: 'Inv' },

  // Participation
  { pattern: /\bpartic/i, code: 'Part' },

  // Interview / Conference
  { pattern: /\binterview/i, code: 'Intv' },
  { pattern: /\bconf/i, code: 'Conf' },

  // Evaluations / Summative
  { pattern: /\bsummat/i, code: 'Summ' },
  { pattern: /\beval/i, code: 'Eval' },

  // Pedagogical Evidence Types
  { pattern: /\bobserv/i, code: 'Obs' },
  { pattern: /\bconvers/i, code: 'Conv' },
  { pattern: /\bprod/i, code: 'Prod' }
]

/**
 * Derives a clean, intelligent short-form code (3–4 characters)
 * for a category name to fit tightly in printed progress reports
 * without CSS ellipsis dots ('Culmi...', 'Activi...').
 *
 * @param {string|object} category - Category string name or category object
 * @returns {string} 3-4 character abbreviation
 */
export function formatCategoryShortCode(category) {
  if (!category) return 'Misc'

  // If a category object was passed, respect explicit shortCode/code if defined
  if (typeof category === 'object') {
    if (category.shortCode && typeof category.shortCode === 'string' && category.shortCode.trim()) {
      return category.shortCode.trim()
    }
    if (category.code && typeof category.code === 'string' && category.code.trim()) {
      return category.code.trim()
    }
    category = category.name || ''
  }

  const trimmed = String(category).trim()
  if (!trimmed) return 'Misc'

  // Check known dictionary patterns first
  for (const entry of KNOWN_CATEGORY_MAP) {
    if (entry.pattern.test(trimmed)) {
      return entry.code
    }
  }

  // If already 4 characters or fewer (e.g. Oral, Task, Work, Case), return as-is
  if (trimmed.length <= 4) {
    return trimmed
  }

  // Multi-word fallback: take initials if 2+ words (e.g. "Class Work" -> "CW")
  const words = trimmed.split(/[\s\-_/&]+/).filter(Boolean)
  if (words.length >= 2) {
    const initials = words.map(w => w[0].toUpperCase()).join('')
    if (initials.length >= 2 && initials.length <= 4) {
      return initials
    }
  }

  // Single word fallback: truncate cleanly at 4 chars with capitalized first letter
  const cleanWord = words[0]
  return cleanWord.slice(0, 1).toUpperCase() + cleanWord.slice(1, 4).toLowerCase()
}
