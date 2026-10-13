/**
 * src/data/comments/scdsbCharacterLimits.js
 *
 * Official Simcoe County District School Board (SCDSB) elementary report card
 * maximum character limits per subject and reporting area.
 * Source: SCDSB Admissions and Enrolment Department.
 */

export const SCDSB_CHARACTER_LIMITS = {
  // Kindergarten Communication of Learning
  kindergarten: {
    belongingAndContributing: 1700,
    selfRegulationAndWellBeing: 1700,
    demonstratingLiteracyAndMath: 1700,
    problemSolvingAndInnovating: 1700,
    default: 1700
  },

  // Grades 1 to 6
  grades1to6: {
    learningSkills: 2600,
    language: 1200,
    french: 1200,
    nativeLanguage: 1200,
    mathematics: 1200,
    scienceAndTechnology: 1050,
    socialStudies: 1200,
    healthEducation: 600,
    physicalEducation: 600,
    theArts: 300,
    default: 1050
  },

  // Grades 7 and 8
  grades7to8: {
    learningSkills: 2600,
    language: 1200,
    french: 1200,
    nativeLanguage: 1200,
    mathematics: 1200,
    scienceAndTechnology: 1050,
    history: 600,
    geography: 600,
    healthEducation: 600,
    physicalEducation: 600,
    theArts: 300,
    default: 1050
  }
}

/**
 * Returns the official SCDSB character limit for a given subject code/name and student grade level.
 *
 * @param {string} subjectKey - Subject code, name, or 'learning_skills'
 * @param {number|string} [gradeLevel=8] - Student or class grade level (e.g. 1-8, 'K', 'SK')
 * @returns {number} Character limit
 */
export function getScdsbCharacterLimit(subjectKey = '', gradeLevel = 8) {
  const key = String(subjectKey || '').toLowerCase().trim()
  const gradeStr = String(gradeLevel || '').toUpperCase().trim()

  // Kindergarten check
  if (gradeStr === 'K' || gradeStr === 'JK' || gradeStr === 'SK' || gradeStr === '0') {
    return 1700
  }

  const numericGrade = parseInt(gradeStr, 10)
  const isSeniorElementary = !isNaN(numericGrade) && numericGrade >= 7

  if (key === 'learningskills' || key === 'learning_skills' || key === 'ls' || key === 'wh' || key.includes('learning skill')) {
    return 2600
  }

  if (key.includes('sci') || key === 'snc' || key.includes('science')) {
    return 1050
  }

  if (key.includes('math') || key === 'mat') {
    return 1200
  }

  if (key.includes('lang') || key.includes('english') || key === 'eng') {
    return 1200
  }

  if (key.includes('french') || key.includes('fsl')) {
    return 1200
  }

  if (key.includes('social') || key === 'soc') {
    return 1200
  }

  if (key.includes('hist') || key === 'his' || key.includes('history')) {
    return isSeniorElementary ? 600 : 1200
  }

  if (key.includes('geog') || key === 'geo' || key.includes('geography')) {
    return isSeniorElementary ? 600 : 1200
  }

  if (key.includes('health') || key.includes('phys') || key.includes('hpe') || key.includes('gym')) {
    return 600
  }

  if (key.includes('art') || key.includes('music') || key.includes('drama') || key.includes('dance') || key.includes('visual')) {
    return 300
  }

  return 1050
}
