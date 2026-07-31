/**
 * src/utils/elementarySubjects.js
 *
 * Pre-populated subject templates and icons for Elementary K-8 Homerooms.
 */

export const DEFAULT_ELEMENTARY_SUBJECTS = [
  {
    subjectId: 'subj_math',
    name: 'Mathematics',
    code: 'MATH',
    icon: 'Calculator',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits: []
  },
  {
    subjectId: 'subj_lang',
    name: 'Language',
    code: 'LANG',
    icon: 'BookOpen',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits: []
  },
  {
    subjectId: 'subj_sci',
    name: 'Science & Technology',
    code: 'SCI',
    icon: 'FlaskConical',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits: []
  },
  {
    subjectId: 'subj_soc',
    name: 'Social Studies',
    code: 'SOC',
    icon: 'Globe',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits: []
  },
  {
    subjectId: 'subj_art',
    name: 'The Arts',
    code: 'ART',
    icon: 'Palette',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits: []
  },
  {
    subjectId: 'subj_hpe',
    name: 'Health & Phys Ed',
    code: 'HPE',
    icon: 'Activity',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits: []
  },
  {
    subjectId: 'subj_fsl',
    name: 'Core French',
    code: 'FSL',
    icon: 'Languages',
    gradingFramework: 'sbar',
    sbarAlgorithm: 'decaying_average',
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits: []
  }
]

export function createDefaultElementarySubjects(selectedSubjectIds = null) {
  if (!selectedSubjectIds || !Array.isArray(selectedSubjectIds) || selectedSubjectIds.length === 0) {
    return JSON.parse(JSON.stringify(DEFAULT_ELEMENTARY_SUBJECTS))
  }
  return DEFAULT_ELEMENTARY_SUBJECTS
    .filter(s => selectedSubjectIds.includes(s.subjectId))
    .map(s => JSON.parse(JSON.stringify(s)))
}
