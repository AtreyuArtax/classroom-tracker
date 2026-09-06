import { ref, computed } from 'vue'
import { activeSubjectId, teachingMode } from './useClassroomState.js'
import { DEFAULT_ELEMENTARY_SUBJECTS, DEFAULT_TRADITIONAL_CATEGORIES } from '../utils/elementarySubjects.js'
import { findElementaryPreset, findElementaryPresets } from '../data/curriculum/index.js'
import { isCohortMatch, filterAssessmentsForSubject } from '../db/gradebook/gradeCalc.js'
import { cleanExpectationText } from '../utils/textUtils.js'

export { findElementaryPreset, findElementaryPresets, DEFAULT_ELEMENTARY_SUBJECTS, filterAssessmentsForSubject }


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
      activeSubjectId: null,
      activeSubjectName: null,
      activeSubjectCode: null,
      activeSubjectIcon: null,
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

export function cleanUnitName(name) {
  if (!name) return ''
  let cleaned = String(name).replace(/^\[Grade\s*\d+\]\s*/i, '').trim()
  
  // Specific known curriculum strand transformations to crisp, intuitive labels
  if (/social-emotional|SEL/i.test(cleaned)) return 'SEL Skills'
  if (/foundations of language/i.test(cleaned)) return 'Foundations'
  if (/comprehension/i.test(cleaned)) return 'Comprehension'
  if (/composition/i.test(cleaned)) return 'Composition'
  if (/literacy connections/i.test(cleaned)) return 'Literacy'
  if (/financial literacy/i.test(cleaned)) return 'Financial'
  if (/spatial sense/i.test(cleaned)) return 'Spatial Sense'
  if (/stem skills/i.test(cleaned)) return 'STEM Skills'
  if (/life systems/i.test(cleaned)) return 'Life Systems'
  if (/matter and energy/i.test(cleaned)) return 'Matter & Energy'
  if (/structures and mechanisms/i.test(cleaned)) return 'Structures & Mech'
  if (/earth and space/i.test(cleaned)) return 'Earth & Space'

  // Strip generic "Strand [A-Z]:\s*" prefix if present
  cleaned = cleaned.replace(/^strand\s+[a-z0-9]\s*:\s*/i, '')
  
  // Strip long trailing parenthetical details
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*Skills.*$/i, '')
  cleaned = cleaned.replace(/\s*\(SEL\)\s*/i, ' ')
  
  // Shorten excessively long subtitles after colons
  if (cleaned.length > 24 && cleaned.includes(':')) {
    const parts = cleaned.split(':')
    const topic = parts[0].trim()
    const detail = parts.slice(1).join(':').trim()
    if (topic.length < 15) {
      const shortDetail = detail.split(/\s+/).slice(0, 2).join(' ')
      cleaned = `${topic}: ${shortDetail}`
    } else {
      cleaned = topic
    }
  }
  
  if (cleaned.length > 28) {
    cleaned = cleaned.substring(0, 25).trim() + '…'
  }
  
  return cleaned
}

export function detectGradeFromClassName(name = '') {
  const grades = parseGradesFromClass(name)
  return grades.length > 0 ? grades.join('/') : ''
}

export function getEffectiveGradeLevel(classRecord) {
  if (!classRecord) return ''
  if (classRecord.gradeLevel) return classRecord.gradeLevel
  
  if (classRecord.students && Object.keys(classRecord.students).length > 0) {
    const rawSet = new Set()
    Object.values(classRecord.students).forEach(s => {
      if (s.gradeLevel) {
        rawSet.add(s.gradeLevel.trim())
      }
    })
    const uniqueGrades = Array.from(rawSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    if (uniqueGrades.length === 1) return uniqueGrades[0]
    if (uniqueGrades.length > 1) {
      const cleanNums = uniqueGrades.map(g => g.replace(/^Grade\s+/i, ''))
      return `Grade ${cleanNums.join('/')}`
    }
  }

  return detectGradeFromClassName(classRecord.name || '')
}

/**
 * Resolves a student's effective grade level for a specific subject,
 * taking into account IEP accommodations / modified grade levels.
 * 
 * @param {Object|null} student 
 * @param {string|null} subjectId 
 * @returns {string}
 */
export function getStudentEffectiveGrade(student, subjectId = null) {
  if (!student) return ''
  if (subjectId && student.accommodations?.modifiedSubjectGrades?.[subjectId]) {
    return student.accommodations.modifiedSubjectGrades[subjectId]
  }
  return student.gradeLevel || ''
}

export function populateSubjectFromPresets(subject, presetsList = [], granularity = 'all', options = {}) {
  const list = Array.isArray(presetsList) ? presetsList : (presetsList ? [presetsList] : [])
  if (!subject || list.length === 0) return subject

  let resolvedGranularity = granularity
  let resolvedOptions = options
  if (typeof granularity === 'object' && granularity !== null) {
    resolvedOptions = granularity
    resolvedGranularity = resolvedOptions.granularity || 'all'
  }

  const forceRefresh = Boolean(resolvedOptions.forceRefresh)
  let existingUnits = [...(subject.gradebookUnits || [])]
  let existingExpectations = [...(subject.expectations || [])]

  // Index existing units and expectations to maintain stable IDs across refreshes/imports
  const existingExpMap = new Map()
  ;(subject.expectations || []).forEach(e => {
    if (e.code && e.expectationId) {
      existingExpMap.set(cleanExpectationText(e.code).toUpperCase(), e.expectationId)
    }
  })

  const existingUnitMap = new Map()
  ;(subject.gradebookUnits || []).forEach(u => {
    if (u.name && u.unitId) {
      existingUnitMap.set(cleanExpectationText(u.name).toLowerCase(), u.unitId)
    }
  })

  list.forEach(preset => {
    if (!preset || !preset.strands) return
    const pGrade = preset.grade || ''

    if (forceRefresh && pGrade) {
      // Clean out existing units and expectations ONLY for this specific grade level
      existingUnits = existingUnits.filter(u => getUnitGradeLevel(u).toLowerCase() !== pGrade.toLowerCase())
      existingExpectations = existingExpectations.filter(e => (e.gradeLevel || '').toLowerCase() !== pGrade.toLowerCase())
    } else {
      // Prevent duplicating if this grade's preset is already imported
      const alreadyImported = existingExpectations.some(e => (e.gradeLevel || '').toLowerCase() === pGrade.toLowerCase())
      if (alreadyImported && !forceRefresh) return
    }

    preset.strands.forEach((strand, idx) => {
      const gTag = pGrade.replace(/[^a-z0-9]/gi, '')
      const unitName = (strand.name || '').replace(/^\[Grade\s*\d+\]\s*/i, '').trim()
      const cleanName = cleanExpectationText(unitName)
      const matchedUnitId = existingUnitMap.get(cleanName.toLowerCase())
      const unitId = matchedUnitId || `unit_${Date.now()}_${gTag}_${idx}_${Math.floor(Math.random()*1000)}`

      existingUnits.push({
        unitId,
        name: cleanName,
        gradeLevel: pGrade,
        weight: 0
      })

      const directExpectations = strand.expectations
      const overalls = strand.overalls || strand.overallExpectations

      if (directExpectations && Array.isArray(directExpectations) && directExpectations.length > 0) {
        directExpectations.forEach(exp => {
          if (exp.active === false) return
          const expWeight = (exp.weight !== undefined && exp.weight !== null && !isNaN(exp.weight)) ? Number(exp.weight) : 1.0
          const cleanCode = cleanExpectationText(exp.code).toUpperCase()
          const stableId = existingExpMap.get(cleanCode) || exp.id || exp.expectationId || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `exp_${Date.now()}_${gTag}_${cleanCode}_${Math.floor(Math.random()*10000)}`)
          existingExpectations.push({
            expectationId: stableId,
            unitId,
            code: cleanCode,
            description: cleanExpectationText(exp.description),
            isOverall: exp.isOverall ?? false,
            weight: expWeight,
            gradeLevel: pGrade
          })
        })
      } else if (overalls && overalls.length > 0) {
        overalls.forEach(ov => {
          const ovWeight = (ov.weight !== undefined && ov.weight !== null && !isNaN(ov.weight)) ? Number(ov.weight) : 1.0
          const cleanOvCode = cleanExpectationText(ov.code).toUpperCase()
          const stableOvId = existingExpMap.get(cleanOvCode) || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `exp_${Date.now()}_${gTag}_${cleanOvCode}_${Math.floor(Math.random()*10000)}`)
          const specifics = ov.specifics || ov.specificExpectations || []
          if (resolvedGranularity === 'overall') {
            existingExpectations.push({
              expectationId: stableOvId,
              unitId,
              code: cleanOvCode,
              description: cleanExpectationText(ov.description),
              isOverall: true,
              weight: ovWeight,
              gradeLevel: pGrade
            })
          } else if ((resolvedGranularity === 'all' || resolvedGranularity === 'success_criteria') && specifics.length > 0) {
            specifics.forEach(sp => {
              const spWeight = (sp.weight !== undefined && sp.weight !== null && !isNaN(sp.weight)) ? Number(sp.weight) : ovWeight
              const cleanSpCode = cleanExpectationText(sp.code).toUpperCase()
              const stableSpId = existingExpMap.get(cleanSpCode) || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `exp_${Date.now()}_${gTag}_${cleanSpCode}_${Math.floor(Math.random()*10000)}`)
              existingExpectations.push({
                expectationId: stableSpId,
                unitId,
                code: cleanSpCode,
                description: cleanExpectationText(sp.description),
                isOverall: false,
                weight: spWeight,
                gradeLevel: pGrade
              })
            })
          } else {
            // Preserve overall expectation if no specifics exist
            existingExpectations.push({
              expectationId: stableOvId,
              unitId,
              code: cleanOvCode,
              description: cleanExpectationText(ov.description || ov.name),
              isOverall: true,
              weight: ovWeight,
              gradeLevel: pGrade
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

  const baseRecord = {
    ...classRecord,
    subjects: updatedSubs
  }

  return ensureIEPPresetsForClass(baseRecord)
}

/**
 * Extract grade level from a unit object (e.g. 'Grade 5')
 */
export function getUnitGradeLevel(u) {
  if (!u) return ''
  if (u.gradeLevel) return u.gradeLevel
  if (u.name) {
    const match = u.name.match(/(?:Grade|Gr)\.?\s*([1-8])/i)
    if (match) {
      return `Grade ${match[1]}`
    }
  }
  return ''
}

/**
 * Ensures curriculum presets exist for any IEP modified subject grade levels in an elementary class.
 */
export function ensureIEPPresetsForClass(classRecord) {
  if (!classRecord || classRecord.classType !== 'elementary') return classRecord
  const students = Object.values(classRecord.students || {})
  if (!students.length) return classRecord

  const subs = (classRecord.subjects && classRecord.subjects.length > 0)
    ? classRecord.subjects
    : DEFAULT_ELEMENTARY_SUBJECTS

  let modified = false
  const updatedSubs = subs.map(sub => {
    let currentSub = { ...sub }
    const iepGrades = new Set()

    students.forEach(st => {
      const modGrade = st.accommodations?.modifiedSubjectGrades?.[currentSub.subjectId]
      if (modGrade && modGrade !== 'default') {
        const match = String(modGrade).replace(/\s*\(IEP\)/i, '').match(/(?:Grade|Gr\.?)?\s*([1-8])\b/i)
        if (match) {
          iepGrades.add(`Grade ${match[1]}`)
        }
      }
    })

    const norm = (g) => String(g || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    iepGrades.forEach(gradeStr => {
      const existingExps = currentSub.expectations || []
      const hasGrade = existingExps.some(e => norm(e.gradeLevel) === norm(gradeStr))
      if (!hasGrade) {
        const matchingPresets = findElementaryPresets([gradeStr], currentSub.code, currentSub.name)
        if (matchingPresets && matchingPresets.length > 0) {
          currentSub = populateSubjectFromPresets(currentSub, matchingPresets, 'all')
          modified = true
        }
      }
    })

    return currentSub
  })

  if (!modified) return classRecord
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
    filterAssessmentsForSubject,
    parseGradesFromClass,
    detectGradeFromClassName,
    getEffectiveGradeLevel,
    getStudentEffectiveGrade,
    getUnitGradeLevel,
    ensureIEPPresetsForClass,
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


