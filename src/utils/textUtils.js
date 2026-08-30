/**
 * Text and Curriculum String Sanitization Utilities
 * classroom-tracker
 */

/**
 * Decodes and cleans HTML entities, non-breaking spaces, and formatting quirks
 * from curriculum expectations, descriptions, and teacher paste inputs.
 *
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function cleanExpectationText(text) {
  if (typeof text !== 'string') return text || ''

  return text
    // Replace non-breaking spaces (HTML entities, hex, unicode)
    .replace(/&(?:nbsp|#160|#xa0);?/gi, ' ')
    .replace(/\u00a0/g, ' ')
    // Replace common HTML entities from web-scraped ministry text
    .replace(/&(?:amp|#38);?/gi, '&')
    .replace(/&(?:quot|#34);?/gi, '"')
    .replace(/&(?:apos|#39|rsquo|lsquo);?/gi, "'")
    .replace(/&(?:ndash|#8211);?/gi, '–')
    .replace(/&(?:mdash|#8212);?/gi, '—')
    .replace(/&(?:hellip|#8230);?/gi, '…')
    .replace(/&(?:lt|#60);?/gi, '<')
    .replace(/&(?:gt|#62);?/gi, '>')
    // Fix erroneous spaces immediately before punctuation (e.g., "systems ." -> "systems.", "mariachi) ." -> "mariachi).")
    .replace(/\s+([.,;:!?])/g, '$1')
    // Collapse multiple consecutive spaces to a single standard space
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/**
 * Recursively cleans all string fields inside an object or array.
 * Useful for batch cleaning curriculum presets and database records.
 *
 * @param {*} value
 * @returns {*}
 */
export function cleanCurriculumObject(value) {
  if (typeof value === 'string') {
    return cleanExpectationText(value)
  }
  if (Array.isArray(value)) {
    return value.map(item => cleanCurriculumObject(item))
  }
  if (value && typeof value === 'object') {
    const cleaned = {}
    for (const [key, val] of Object.entries(value)) {
      cleaned[key] = cleanCurriculumObject(val)
    }
    return cleaned
  }
  return value
}
