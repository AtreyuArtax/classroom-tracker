/**
 * src/composables/useCurriculumLibrary.js
 * 
 * Central Composable for the Teacher's Master Curriculum Library.
 * Manages user-customized curriculum presets, expectation weighting multipliers,
 * and automatic inheritance across classes, split grades, and school years.
 */

import { ref, computed } from 'vue'
import {
  getCustomCurriculumPresets,
  saveCustomCurriculumPreset,
  deleteCustomCurriculumPreset
} from '../db/settingsService.js'
import {
  curriculumPresets,
  findElementaryPreset,
  findElementaryPresets,
  getPresetsByPanel
} from '../data/curriculum/index.js'
import { cleanExpectationText } from '../utils/textUtils.js'

// Module-level shared reactive state
const customPresets = ref({})
const isLoaded = ref(false)
const isLoading = ref(false)

/**
 * Initializes and loads custom curriculum presets from IndexedDB.
 */
export async function initCurriculumLibrary() {
  if (isLoaded.value && !isLoading.value) return customPresets.value
  isLoading.value = true
  try {
    const data = await getCustomCurriculumPresets()
    customPresets.value = data || {}
    isLoaded.value = true
  } catch (err) {
    console.error('[useCurriculumLibrary] Failed to load custom presets:', err)
  } finally {
    isLoading.value = false
  }
  return customPresets.value
}

export const initLibrary = initCurriculumLibrary

/**
 * Checks if a specific preset ID has been customized by the teacher.
 * @param {string} presetId
 * @returns {boolean}
 */
export function isMasterCustomized(presetId) {
  if (!presetId) return false
  return !!customPresets.value[presetId]
}

/**
 * Retrieves a master preset by ID.
 * Returns the customized master preset if it exists; otherwise clones the built-in Ontario Ministry preset.
 * @param {string} presetId
 * @returns {Object|null}
 */
export function getMasterPreset(presetId) {
  if (!presetId) return null
  if (customPresets.value[presetId]) {
    return JSON.parse(JSON.stringify(customPresets.value[presetId]))
  }
  const builtIn = curriculumPresets.find(p => p.presetId === presetId)
  if (builtIn) {
    return JSON.parse(JSON.stringify(builtIn))
  }
  return null
}

/**
 * Saves a master preset to global settings (IndexedDB).
 * @param {Object} preset - The curriculum preset object
 * @returns {Promise<Object>}
 */
export async function saveMasterPreset(preset) {
  if (!preset || !preset.presetId) throw new Error('Preset must have a valid presetId')
  const saved = await saveCustomCurriculumPreset(preset)
  customPresets.value[preset.presetId] = saved
  return saved
}

/**
 * Resets a master preset back to official Ministry defaults.
 * @param {string} presetId
 * @returns {Promise<void>}
 */
export async function resetMasterPreset(presetId) {
  if (!presetId) return
  await deleteCustomCurriculumPreset(presetId)
  delete customPresets.value[presetId]
}

/**
 * Resolves an Elementary Subject Preset for a given grade and subject.
 * Prioritizes the teacher's custom master preset over the built-in raw Ministry preset.
 *
 * @param {string|number} grade - Grade (e.g. "8", "Grade 8")
 * @param {string} subjectCode - Subject code (e.g. "MATH", "SCI")
 * @param {string} subjectName - Subject name (e.g. "Mathematics")
 * @returns {Object|null}
 */
export function resolveSubjectPreset(grade, subjectCode, subjectName = '') {
  if (!grade) return null
  const normGrade = String(grade).toLowerCase().replace(/[^a-z0-9]/g, '')
  const normCode = (subjectCode || '').toLowerCase().trim()
  const normName = (subjectName || '').toLowerCase().trim()

  // 1. First check user's customized master presets
  const customList = Object.values(customPresets.value || {})
  const matchedCustom = customList.find(p => {
    if (p.panel && p.panel !== 'elementary') return false
    const presetGrade = String(p.grade || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (presetGrade && !normGrade.includes(presetGrade) && !presetGrade.includes(normGrade)) {
      return false
    }
    const titleLower = (p.title || '').toLowerCase()
    const pCodeLower = (p.subjectCode || '').toLowerCase()
    const pIdLower = (p.presetId || '').toLowerCase()

    if (normCode && (pCodeLower === normCode || titleLower.includes(normCode) || pIdLower.includes(normCode))) return true
    if (normName && (titleLower.includes(normName) || pIdLower.includes(normName))) return true

    if (normName.includes('science') || normCode.includes('sci')) return titleLower.includes('science') || pIdLower.includes('science')
    if (normName.includes('math') || normCode.includes('mat')) return titleLower.includes('math') || pIdLower.includes('math')
    if (normName.includes('language') || normCode.includes('lan')) return titleLower.includes('language') || pIdLower.includes('language')
    if (normName.includes('art') || normCode.includes('art')) return titleLower.includes('arts') || pIdLower.includes('arts')
    if (normName.includes('phys') || normName.includes('health') || normCode.includes('hpe')) return titleLower.includes('health') || pIdLower.includes('hpe')
    if (normName.includes('immersion') || normCode === 'fi') return titleLower.includes('immersion') || pIdLower.includes('french-immersion')
    if (normName.includes('extended') || normCode.includes('ext')) return titleLower.includes('extended') || pIdLower.includes('extended-french')
    if (normName.includes('french') || normCode.includes('fsl')) return titleLower.includes('core french') || pIdLower.includes('core-french') || (titleLower.includes('french') && !titleLower.includes('immersion') && !titleLower.includes('extended'))
    if (normName.includes('social') || normCode.includes('soc')) return titleLower.includes('history') || titleLower.includes('geography')
    return false
  })

  if (matchedCustom) {
    return JSON.parse(JSON.stringify(matchedCustom))
  }

  // 2. Fall back to built-in Ontario Ministry preset
  const builtIn = findElementaryPreset(grade, subjectCode, subjectName)
  return builtIn ? JSON.parse(JSON.stringify(builtIn)) : null
}

/**
 * Returns all presets for a panel (elementary, secondary, or all),
 * merging custom master presets with built-in presets.
 * Customized presets replace built-ins and are flagged with isCustomMaster = true.
 *
 * @param {'all'|'elementary'|'secondary'} [panel='all']
 * @returns {Array<Object>}
 */
export function getMergedCurriculumPresets(panel = 'all') {
  const result = []
  const customMap = customPresets.value || {}

  curriculumPresets.forEach(p => {
    if (panel !== 'all' && p.panel !== panel) return
    if (customMap[p.presetId]) {
      result.push({
        ...customMap[p.presetId],
        isCustomMaster: true
      })
    } else {
      result.push({
        ...p,
        isCustomMaster: false
      })
    }
  })

  // Also include any purely new custom presets created by the teacher
  Object.values(customMap).forEach(cp => {
    if (panel !== 'all' && cp.panel !== panel) return
    const alreadyIncluded = result.some(r => r.presetId === cp.presetId)
    if (!alreadyIncluded) {
      result.push({
        ...cp,
        isCustomMaster: true
      })
    }
  })

  return result
}

/**
 * Normalizes an expectation weight multiplier.
 * Guaranteed to return a valid non-negative number (default: 1.0).
 *
 * @param {*} val
 * @returns {number}
 */
export function normalizeExpectationWeight(val) {
  if (val === null || val === undefined || val === '') return 1.0
  const num = Number(val)
  if (isNaN(num)) return 1.0
  return Math.max(0, Math.min(10, Math.round(num * 10) / 10))
}

/**
 * Safely synchronizes a Master Preset's expectation weights, active states,
 * and wording into an existing class record without breaking existing assessments.
 *
 * @param {Object} cls - The class record from IndexedDB
 * @param {Object} preset - The master curriculum preset
 * @returns {{ updatedClass: Object, changesCount: number, subjectName: string }|null}
 */
export function syncPresetToClass(cls, preset) {
  if (!cls || !preset) return null
  const updatedCls = JSON.parse(JSON.stringify(cls))
  let changesCount = 0
  let subjectName = ''

  if (cls.classType === 'elementary') {
    if (!updatedCls.subjects || !Array.isArray(updatedCls.subjects)) return null
    
    // Find matching subject in this class
    const pCode = (preset.subjectCode || '').toLowerCase().trim()
    const pTitle = (preset.title || '').toLowerCase()
    
    const targetSub = updatedCls.subjects.find(sub => {
      const resolved = resolveSubjectPreset(cls.gradeLevel || preset.grade, sub.code, sub.name)
      if (resolved && resolved.presetId === preset.presetId) return true
      const sCode = (sub.code || '').toLowerCase().trim()
      if (pCode && sCode === pCode) return true
      const sName = (sub.name || '').toLowerCase().trim()
      if (sName && (pTitle.includes(sName) || sName.includes(pCode))) return true
      return false
    })

    if (!targetSub) return null
    subjectName = targetSub.name || 'Subject'

    if (!targetSub.expectations) targetSub.expectations = []
    if (!targetSub.gradebookUnits) targetSub.gradebookUnits = []

    // Collect all master expectations across strands
    const masterExps = []
    ;(preset.strands || []).forEach(strand => {
      const exps = strand.expectations || strand.overalls || []
      exps.forEach(e => {
        masterExps.push({
          code: cleanExpectationText(e.code).toUpperCase(),
          description: cleanExpectationText(e.description || e.name || ''),
          weight: e.weight != null ? Number(e.weight) : 1.0,
          active: e.active !== false,
          strandName: cleanExpectationText(strand.name)
        })
      })
    })

    // Update existing expectations in class
    const matchedMasterCodes = new Set()

    targetSub.expectations.forEach(clsExp => {
      const normClsCode = cleanExpectationText(clsExp.code).toUpperCase()
      const matched = masterExps.find(me => me.code === normClsCode)
      if (matched) {
        matchedMasterCodes.add(matched.code)
        if (clsExp.weight !== matched.weight || clsExp.description !== matched.description) {
          clsExp.weight = matched.weight
          clsExp.description = matched.description
          changesCount++
        }
      }
    })

    // Add any new expectations from master that aren't in class yet
    masterExps.forEach(me => {
      if (!matchedMasterCodes.has(me.code)) {
        let targetUnit = targetSub.gradebookUnits.find(u => 
          cleanExpectationText(u.name).toLowerCase() === me.strandName.toLowerCase()
        )
        if (!targetUnit) {
          targetUnit = {
            unitId: `unit_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            name: me.strandName,
            gradeLevel: preset.grade || '',
            weight: 0
          }
          targetSub.gradebookUnits.push(targetUnit)
        }

        targetSub.expectations.push({
          expectationId: `exp_${Date.now()}_${me.code}_${Math.floor(Math.random()*1000)}`,
          unitId: targetUnit.unitId,
          code: me.code,
          description: me.description,
          weight: me.weight,
          active: me.active,
          gradeLevel: preset.grade || '',
          isOverall: false
        })
        changesCount++
      }
    })

    return { updatedClass: updatedCls, changesCount, subjectName }
  } else {
    // Secondary class
    const pCode = (preset.subjectCode || '').toLowerCase().trim()
    const pTitle = (preset.title || '').toLowerCase()
    const courseCode = (cls.courseCode || '').toLowerCase().trim()
    if (!pCode || (!courseCode.includes(pCode) && !pTitle.includes(courseCode))) return null
    subjectName = cls.name || cls.courseCode

    if (!updatedCls.gradebookUnits) updatedCls.gradebookUnits = []
    
    const masterExps = []
    ;(preset.strands || []).forEach(strand => {
      const exps = strand.expectations || strand.overalls || []
      exps.forEach(e => {
        masterExps.push({
          code: cleanExpectationText(e.code).toUpperCase(),
          text: cleanExpectationText(e.description || e.name || ''),
          weight: e.weight != null ? Number(e.weight) : 1.0,
          strandName: cleanExpectationText(strand.name)
        })
      })
    })

    updatedCls.gradebookUnits.forEach(unit => {
      if (unit.expectations) {
        unit.expectations.forEach(exp => {
          const normCode = cleanExpectationText(exp.code).toUpperCase()
          const matched = masterExps.find(me => me.code === normCode)
          if (matched) {
            if (exp.weight !== matched.weight || exp.text !== matched.text) {
              exp.weight = matched.weight
              exp.text = matched.text
              changesCount++
            }
          }
        })
      }
    })

    return { updatedClass: updatedCls, changesCount, subjectName }
  }
}

/**
 * Main Composable hook for components.
 */
export function useCurriculumLibrary() {
  return {
    customPresets,
    isLoaded,
    isLoading,
    initCurriculumLibrary,
    initLibrary: initCurriculumLibrary,
    isMasterCustomized,
    getMasterPreset,
    saveMasterPreset,
    resetMasterPreset,
    resolveSubjectPreset,
    getMergedCurriculumPresets,
    normalizeExpectationWeight,
    syncPresetToClass
  }
}
