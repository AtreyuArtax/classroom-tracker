import { ref, computed } from 'vue'
import { activeSubjectId, teachingMode } from './useClassroomState.js'
import { DEFAULT_ELEMENTARY_SUBJECTS, DEFAULT_TRADITIONAL_CATEGORIES } from '../utils/elementarySubjects.js'
import { findElementaryPreset, findElementaryPresets } from '../data/curriculum/index.js'

export { findElementaryPreset, findElementaryPresets }


/**
 * Elementary Mode Sub-Composable
 * 
 * Manages elementary-specific state and transforms homeroom class records
 * into effective single-subject records for gradebook, dashboard, and dossier views.
 */

/**
 * Given an elementary homeroom class record, derives an effective single-subject class record
 * based on the active subject.
 * Returns non-elementary class records untouched.
 * 
 * @param {Object|null} classRecord 
 * @param {string|null} targetSubjectId 
 * @returns {Object|null}
 */
export function getEffectiveClassRecord(classRecord, targetSubjectId = null, targetCourseCode = null) {
  if (!classRecord) return null
  if (classRecord.classType !== 'elementary') {
    let cats = (classRecord.gradebookCategories && classRecord.gradebookCategories.length > 0)
      ? classRecord.gradebookCategories
      : DEFAULT_TRADITIONAL_CATEGORIES
    let units = classRecord.gradebookUnits || []

    if (targetCourseCode && targetCourseCode !== 'all' && classRecord.courseFrameworks?.[targetCourseCode]) {
      const fw = classRecord.courseFrameworks[targetCourseCode]
      if (fw.gradebookCategories && fw.gradebookCategories.length > 0) cats = fw.gradebookCategories
      if (fw.gradebookUnits && fw.gradebookUnits.length > 0) units = fw.gradebookUnits
    } else if ((!targetCourseCode || targetCourseCode === 'all') && classRecord.courseFrameworks && Object.keys(classRecord.courseFrameworks).length > 0) {
      const unitList = []
      const seenIds = new Set()
      for (const [code, fw] of Object.entries(classRecord.courseFrameworks)) {
        if (fw.gradebookUnits && Array.isArray(fw.gradebookUnits)) {
          fw.gradebookUnits.forEach(u => {
            if (u && u.unitId && !seenIds.has(u.unitId)) {
              seenIds.add(u.unitId)
              unitList.push({
                ...u,
                courseCode: code
              })
            }
          })
        }
      }
      if (unitList.length > 0) {
        units = unitList
      }
    }

    return {
      ...classRecord,
      gradebookCategories: cats,
      gradebookUnits: units
    }
  }

  const subs = classRecord.subjects && classRecord.subjects.length > 0
    ? classRecord.subjects
    : DEFAULT_ELEMENTARY_SUBJECTS

  const subId = targetSubjectId || activeSubjectId.value || subs[0]?.subjectId
  const activeSub = subs.find(s => s.subjectId === subId) || subs[0]
  if (!activeSub) return classRecord

  const effectiveCategories = (activeSub.gradebookCategories && activeSub.gradebookCategories.length > 0)
    ? activeSub.gradebookCategories
    : DEFAULT_TRADITIONAL_CATEGORIES

  return {
    ...classRecord,
    activeSubjectId: activeSub.subjectId,
    activeSubjectName: activeSub.name,
    activeSubjectCode: activeSub.code,
    activeSubjectIcon: activeSub.icon,
    gradingFramework: activeSub.gradingFramework || 'sbar',
    sbarAlgorithm: activeSub.sbarAlgorithm || 'decaying_average',
    sbarInputMode: activeSub.sbarInputMode || 'fine',
    gradebookCategories: effectiveCategories,
    gradebookUnits: activeSub.gradebookUnits || [],
    expectations: activeSub.expectations || []
  }
}

export function parseGradesFromClass(str = '') {
  if (!str) return []
  const matches = str.match(/(?:Grade|Gr)?\s*([1-8])\s*[\/\-&]\s*(?:Grade|Gr)?\s*([1-8])/i)
  if (matches) {
    return [`Grade ${matches[1]}`, `Grade ${matches[2]}`]
  }
  const single = str.match(/Grade\s*([1-8])|Gr\s*([1-8])|\b([1-8])[A-Z]?\b/i)
  if (single) {
    const grNum = single[1] || single[2] || single[3]
    return [`Grade ${grNum}`]
  }
  if (str.includes('Kindergarten') || str.toLowerCase().includes('jk') || str.toLowerCase().includes('sk')) {
    return ['Kindergarten']
  }
  return []
}

export function detectGradeFromClassName(name = '') {
  const grades = parseGradesFromClass(name)
  return grades.length > 0 ? grades.join('/') : ''
}

export function getEffectiveGradeLevel(classRecord) {
  if (!classRecord) return ''
  if (classRecord.gradeLevel) return classRecord.gradeLevel
  return detectGradeFromClassName(classRecord.name || '')
}

export function populateSubjectFromPresets(subject, presetsList = [], granularity = 'all') {
  if (!subject || !presetsList || presetsList.length === 0) return subject

  const existingUnits = [...(subject.gradebookUnits || [])]
  const existingExpectations = [...(subject.expectations || [])]

  presetsList.forEach(preset => {
    if (!preset || !preset.strands) return
    const pGrade = preset.grade || ''

    // Prevent duplicating if this grade's preset is already imported
    const alreadyImported = existingExpectations.some(e => e.gradeLevel === pGrade)
    if (alreadyImported) return

    preset.strands.forEach((strand, idx) => {
      const gTag = pGrade.replace(/[^a-z0-9]/gi, '')
      const unitId = `unit_${Date.now()}_${gTag}_${idx}_${Math.floor(Math.random()*1000)}`
      const unitName = (strand.name || '').replace(/^\[Grade\s*\d+\]\s*/i, '').trim()
      existingUnits.push({
        unitId,
        name: unitName,
        gradeLevel: pGrade,
        weight: 0
      })

      if (strand.overalls) {
        strand.overalls.forEach(ov => {
          existingExpectations.push({
            expectationId: `exp_${Date.now()}_${gTag}_${ov.code}`,
            unitId,
            code: ov.code,
            description: ov.description,
            isOverall: true,
            gradeLevel: pGrade
          })

          if (granularity === 'all' && ov.specifics) {
            ov.specifics.forEach(sp => {
              existingExpectations.push({
                expectationId: `exp_${Date.now()}_${gTag}_${sp.code}`,
                unitId,
                code: sp.code,
                description: sp.description,
                isOverall: false,
                gradeLevel: pGrade
              })
            })
          }
        })
      }
    })
  })

  return {
    ...subject,
    gradebookUnits: existingUnits,
    expectations: existingExpectations
  }
}

export function populateSubjectFromPreset(subject, preset, granularity = 'all') {
  if (!preset) return subject
  return populateSubjectFromPresets(subject, [preset], granularity)
}

export function autoPopulateAllElementarySubjects(classRecord) {
  if (!classRecord || classRecord.classType !== 'elementary') return classRecord
  const gradesList = parseGradesFromClass(classRecord.gradeLevel || classRecord.name || '')
  if (!gradesList.length) return classRecord

  const subs = (classRecord.subjects && classRecord.subjects.length > 0)
    ? classRecord.subjects
    : DEFAULT_ELEMENTARY_SUBJECTS

  const updatedSubs = subs.map(sub => {
    if (sub.expectations && sub.expectations.length > 0) return sub
    const matchingPresets = findElementaryPresets(gradesList, sub.code, sub.name)
    if (matchingPresets.length > 0) {
      return populateSubjectFromPresets(sub, matchingPresets, 'all')
    }
    return sub
  })

  return {
    ...classRecord,
    subjects: updatedSubs
  }
}


export function useElementary() {
  const isElementaryMode = computed(() => teachingMode.value === 'elementary')

  function formatAlgorithmName(algo) {
    switch (algo) {
      case 'power_law': return 'Power Law'
      case 'mode': return 'Mode / Most Frequent'
      case 'most_recent': return 'Most Recent'
      case 'highest': return 'Highest Mark'
      default: return 'Decaying Average'
    }
  }

  function formatFrameworkLabel(fw) {
    switch (fw) {
      case 'traditional': return 'Traditional (%)'
      case 'sbar_power_law': return 'SBAR — Power Law'
      case 'sbar_mode': return 'SBAR — Mode'
      case 'sbar_most_recent': return 'SBAR — Most Recent'
      case 'sbar_highest': return 'SBAR — Highest'
      default: return 'SBAR — Decaying Average'
    }
  }

  return {
    teachingMode,
    activeSubjectId,
    isElementaryMode,
    getEffectiveClassRecord,
    parseGradesFromClass,
    detectGradeFromClassName,
    getEffectiveGradeLevel,
    populateSubjectFromPreset,
    populateSubjectFromPresets,
    autoPopulateAllElementarySubjects,
    findElementaryPreset,
    findElementaryPresets,
    formatAlgorithmName,
    formatFrameworkLabel,
    DEFAULT_ELEMENTARY_SUBJECTS
  }
}

