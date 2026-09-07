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
 * Derives an Overall Expectations Only preset from a standard preset.
 * Extracts only the high-level overall curriculum expectations (e.g. A1, A2, B1, B2...).
 *
 * @param {Object} basePreset
 * @returns {Object|null}
 */
export function deriveOverallPreset(basePreset) {
  if (!basePreset) return null
  const clone = JSON.parse(JSON.stringify(basePreset))
  clone.presetId = `${basePreset.presetId}-overall`
  clone.title = `${cleanExpectationText(basePreset.title || '').replace(/\s*—\s*Success Criteria.*$/i, '')} — Overall Expectations`
  clone.isOverallOnly = true
  clone.strands = (basePreset.strands || []).map((s, sIdx) => {
    const overalls = (s.overalls || []).map((ov, ovIdx) => ({
      code: ov.code || `O${ovIdx + 1}`,
      name: ov.title || ov.name || ov.code,
      description: ov.description || ov.name || ov.title || '',
      weight: ov.weight != null ? Number(ov.weight) : 1.0,
      isOverall: true,
      specifics: []
    }))
    return {
      id: s.id || `strand-${sIdx}`,
      name: cleanExpectationText(s.name || `Strand ${sIdx + 1}`),
      expectations: overalls.map((ov, ovIdx) => ({
        id: `exp-${sIdx}-${ovIdx}`,
        code: ov.code,
        description: ov.description,
        weight: ov.weight,
        isOverall: true,
        active: true
      })),
      overalls
    }
  })
  return clone
}

/**
 * Derives a Specific Expectations preset from a standard preset.
 * Extracts all granular specific expectations (e.g. A1.1, A1.2...).
 *
 * @param {Object} basePreset
 * @returns {Object|null}
 */
export function deriveSpecificPreset(basePreset) {
  if (!basePreset) return null
  const clone = JSON.parse(JSON.stringify(basePreset))
  clone.isSpecificOnly = true
  clone.strands = (basePreset.strands || []).map((s, sIdx) => {
    const exps = []
    if (s.expectations && Array.isArray(s.expectations)) {
      s.expectations.forEach(e => exps.push({
        id: e.expectationId || e.id || `exp-${sIdx}-${crypto.randomUUID().slice(0, 6)}`,
        code: e.code || '',
        description: e.description || '',
        weight: e.weight != null ? Number(e.weight) : 1.0,
        active: e.active !== false,
        isOverall: false
      }))
    } else if (s.overalls) {
      s.overalls.forEach((ov, ovIdx) => {
        if (ov.specifics && ov.specifics.length > 0) {
          ov.specifics.forEach((sp, spIdx) => {
            exps.push({
              id: `exp-${sIdx}-${ovIdx}-${spIdx}`,
              code: sp.code || '',
              description: sp.description || '',
              weight: sp.weight != null ? Number(sp.weight) : 1.0,
              active: true,
              isOverall: false
            })
          })
        } else {
          exps.push({
            id: `exp-${sIdx}-${ovIdx}`,
            code: ov.code || '',
            description: ov.description || ov.name || '',
            weight: ov.weight != null ? Number(ov.weight) : 1.0,
            active: true,
            isOverall: true
          })
        }
      })
    }
    return {
      id: s.id || `strand-${sIdx}`,
      name: cleanExpectationText(s.name || `Strand ${sIdx + 1}`),
      expectations: exps
    }
  })
  return clone
}

/**
 * Retrieves the companion Success Criteria preset for a base course preset.
 *
 * @param {Object} basePreset
 * @returns {Object|null}
 */
export function getSuccessCriteriaPreset(basePreset) {
  if (!basePreset) return null
  const scPresetId = `${basePreset.presetId}-success-criteria`
  if (customPresets.value[scPresetId]) {
    return JSON.parse(JSON.stringify(customPresets.value[scPresetId]))
  }
  const sCode = (basePreset.subjectCode || '').toLowerCase().trim()
  const pId = (basePreset.presetId || '').toLowerCase().trim()
  const builtIn = curriculumPresets.find(p => 
    p.presetId === scPresetId ||
    (p.isSuccessCriteria && (
      (sCode && (p.subjectCode || '').toLowerCase().trim() === sCode) ||
      (pId && p.presetId.toLowerCase().startsWith(pId))
    ))
  )
  if (builtIn) {
    return JSON.parse(JSON.stringify(builtIn))
  }
  const customSC = Object.values(customPresets.value || {}).find(p =>
    p && p.isSuccessCriteria && (
      p.presetId === scPresetId ||
      (sCode && (p.subjectCode || '').toLowerCase().trim() === sCode) ||
      (pId && p.presetId.toLowerCase().startsWith(pId))
    )
  )
  if (customSC) {
    return JSON.parse(JSON.stringify(customSC))
  }
  return null
}

/**
 * Retrieves a master preset by ID.
 * Returns the customized master preset if it exists; otherwise clones the built-in Ontario Ministry preset.
 * If requesting an overall variant (`-overall`), dynamically derives it from the base preset.
 * @param {string} presetId
 * @returns {Object|null}
 */
export function getMasterPreset(presetId) {
  if (!presetId) return null
  if (customPresets.value[presetId]) {
    return JSON.parse(JSON.stringify(customPresets.value[presetId]))
  }
  if (presetId.endsWith('-overall')) {
    const baseId = presetId.replace(/-overall$/, '')
    const basePreset = customPresets.value[baseId] || curriculumPresets.find(p => p.presetId === baseId)
    if (basePreset) {
      return deriveOverallPreset(basePreset)
    }
  }
  const builtIn = curriculumPresets.find(p => p.presetId === presetId)
  if (builtIn) {
    return JSON.parse(JSON.stringify(builtIn))
  }
  return null
}

/**
 * Groups curriculum presets into high-level Course Blueprints (e.g. SNC1W),
 * attaching available variants (Specific, Overall only, Success Criteria).
 * Supports both built-in Ministry presets and user-imported custom courses.
 *
 * @param {'all'|'elementary'|'secondary'} [panel='all']
 * @returns {Array<Object>}
 */
export function getCourseBlueprints(panel = 'all') {
  const customMap = customPresets.value || {}
  
  // Base built-in presets: exclude companion success-criteria and derived overalls
  const builtInBase = curriculumPresets.filter(p => {
    if (panel !== 'all' && p.panel !== panel) return false
    if (p.isSuccessCriteria) return false
    if (p.presetId.endsWith('-overall') || p.presetId.endsWith('-success-criteria')) return false
    return true
  })

  // User-created/imported custom courses not in built-in curriculumPresets
  const builtInIds = new Set(curriculumPresets.map(p => p.presetId))
  const customBase = Object.values(customMap).filter(p => {
    if (!p || !p.presetId) return false
    if (builtInIds.has(p.presetId)) return false
    if (panel !== 'all' && p.panel && p.panel !== panel) return false
    if (p.isSuccessCriteria) return false
    if (p.presetId.endsWith('-overall') || p.presetId.endsWith('-success-criteria')) return false
    return true
  })

  const basePresets = [...builtInBase, ...customBase]

  // Group blueprints
  const blueprints = basePresets.map(base => {
    const code = (base.subjectCode || '').toUpperCase().trim() || base.presetId
    const basePresetId = base.presetId

    // Specific variant
    const specificCustom = customMap[basePresetId]
    const specificPreset = specificCustom || deriveSpecificPreset(base)
    const specificCount = (specificPreset?.strands || []).reduce((acc, s) => {
      if (s.expectations) return acc + s.expectations.length
      if (s.overalls) return acc + s.overalls.reduce((a, ov) => a + (ov.specifics ? ov.specifics.length : 1), 0)
      return acc
    }, 0)

    // Overall variant
    const overallPresetId = `${basePresetId}-overall`
    const overallCustom = customMap[overallPresetId]
    const overallPreset = overallCustom || deriveOverallPreset(base)
    const overallCount = (overallPreset?.strands || []).reduce((acc, s) => {
      if (s.expectations) return acc + s.expectations.length
      if (s.overalls) return acc + s.overalls.length
      return acc
    }, 0)

    // Success Criteria variant
    const scPreset = getSuccessCriteriaPreset(base)
    const scPresetId = `${basePresetId}-success-criteria`
    const hasSC = !!scPreset
    const scCount = scPreset ? (scPreset.strands || []).reduce((acc, s) => {
      if (s.expectations) return acc + s.expectations.length
      if (s.overalls) return acc + s.overalls.reduce((a, ov) => a + (ov.specifics ? ov.specifics.length : 1), 0)
      return acc
    }, 0) : 0

    return {
      presetId: basePresetId,
      courseCode: code,
      title: base.title,
      grade: base.grade,
      panel: base.panel,
      department: base.department || '',
      strandsCount: base.strands?.length || 0,
      basePreset: base,
      variants: {
        specific: {
          id: 'specific',
          presetId: basePresetId,
          label: 'Specific',
          fullLabel: 'Specific Expectations',
          count: specificCount,
          isCustomized: !!specificCustom,
          available: true
        },
        overall: {
          id: 'overall',
          presetId: overallPresetId,
          label: 'Overall only',
          fullLabel: 'Overall Expectations Only',
          count: overallCount,
          isCustomized: !!overallCustom,
          available: true
        },
        success_criteria: {
          id: 'success_criteria',
          presetId: scPresetId,
          label: 'Success Criteria',
          fullLabel: 'Success Criteria ("I Can..." Statements)',
          count: scCount,
          isCustomized: !!customMap[scPresetId],
          available: hasSC
        }
      }
    }
  })

  return blueprints
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
 * Helper to match course codes, ignoring spaces, dashes, and section suffixes (e.g. SNC1W-01 vs SNC1W).
 * @param {string} code1
 * @param {string} code2
 * @returns {boolean}
 */
export function isCourseCodeMatch(code1, code2) {
  if (!code1 || !code2) return false
  const c1 = String(code1).toUpperCase().trim().replace(/[^A-Z0-9]/g, '')
  const c2 = String(code2).toUpperCase().trim().replace(/[^A-Z0-9]/g, '')
  if (!c1 || !c2) return false
  if (c1 === c2) return true
  // Match prefix e.g. SNC1W01 and SNC1W
  if (c1.startsWith(c2) || c2.startsWith(c1)) return true
  return false
}

/**
 * Flattens all expectations from a master curriculum preset across its strands,
 * cleanly handling flat strand.expectations, nested strand.overalls.specifics, and overall-only presets.
 *
 * @param {Object} preset
 * @returns {Array<Object>}
 */
export function extractMasterExpectations(preset) {
  if (!preset || !preset.strands) return []
  const masterExps = []

  preset.strands.forEach((strand, sIdx) => {
    const strandName = cleanExpectationText(strand.name || `Strand ${sIdx + 1}`)

    if (strand.expectations && Array.isArray(strand.expectations) && strand.expectations.length > 0) {
      strand.expectations.forEach(e => {
        masterExps.push({
          code: cleanExpectationText(e.code).toUpperCase(),
          description: cleanExpectationText(e.description || e.text || e.name || ''),
          weight: e.weight != null && !isNaN(Number(e.weight)) ? Math.max(0, Number(e.weight)) : 1.0,
          active: e.active !== false,
          isOverall: !!e.isOverall,
          strandName
        })
      })
    } else if (strand.overalls && Array.isArray(strand.overalls)) {
      if (preset.isOverallOnly) {
        strand.overalls.forEach(ov => {
          masterExps.push({
            code: cleanExpectationText(ov.code).toUpperCase(),
            description: cleanExpectationText(ov.description || ov.title || ov.name || ''),
            weight: ov.weight != null && !isNaN(Number(ov.weight)) ? Math.max(0, Number(ov.weight)) : 1.0,
            active: ov.active !== false,
            isOverall: true,
            strandName
          })
        })
      } else {
        strand.overalls.forEach(ov => {
          if (ov.specifics && Array.isArray(ov.specifics) && ov.specifics.length > 0) {
            ov.specifics.forEach(sp => {
              masterExps.push({
                code: cleanExpectationText(sp.code).toUpperCase(),
                description: cleanExpectationText(sp.description || sp.text || sp.name || ''),
                weight: sp.weight != null && !isNaN(Number(sp.weight)) ? Math.max(0, Number(sp.weight)) : (ov.weight != null ? Number(ov.weight) : 1.0),
                active: sp.active !== false,
                isOverall: false,
                strandName
              })
            })
          } else {
            masterExps.push({
              code: cleanExpectationText(ov.code).toUpperCase(),
              description: cleanExpectationText(ov.description || ov.title || ov.name || ''),
              weight: ov.weight != null && !isNaN(Number(ov.weight)) ? Math.max(0, Number(ov.weight)) : 1.0,
              active: ov.active !== false,
              isOverall: true,
              strandName
            })
          }
        })
      }
    }
  })

  return masterExps
}

/**
 * Safely synchronizes a Master Preset's expectation weights, active states,
 * and wording into an existing class record without breaking existing assessments.
 * Supports standard secondary classes, secondary split classes (courseFrameworks),
 * and elementary subjects. Generates a structured list of exact diffs.
 *
 * @param {Object} cls - The class record from IndexedDB
 * @param {Object} preset - The master curriculum preset
 * @param {string|null} [targetSectionKey=null] - Optional specific section key for split classes
 * @returns {{ updatedClass: Object, changesCount: number, subjectName: string, diffs: Array<Object>, sectionKey: string|null }|null}
 */
export function syncPresetToClass(cls, preset, targetSectionKey = null) {
  if (!cls || !preset) return null
  const updatedCls = JSON.parse(JSON.stringify(cls))
  let changesCount = 0
  let subjectName = ''
  const diffs = []

  // Collect all master expectations across strands
  const masterExps = extractMasterExpectations(preset)


  if (cls.classType === 'elementary') {
    if (!updatedCls.subjects || !Array.isArray(updatedCls.subjects)) return null
    
    // Find matching subject in this class
    const pCode = (preset.subjectCode || '').toLowerCase().trim()
    const pTitle = (preset.title || '').toLowerCase()
    
    const targetSub = updatedCls.subjects.find(sub => {
      if (targetSectionKey && sub.subjectId !== targetSectionKey && sub.code !== targetSectionKey) {
        return false
      }
      const resolved = resolveSubjectPreset(cls.gradeLevel || preset.grade, sub.code, sub.name)
      if (resolved && resolved.presetId === preset.presetId) return true
      const sCode = (sub.code || '').toLowerCase().trim()
      if (pCode && (sCode === pCode || isCourseCodeMatch(sCode, pCode))) return true
      const sName = (sub.name || '').toLowerCase().trim()
      if (sName && (pTitle.includes(sName) || sName.includes(pCode))) return true
      return false
    })

    if (!targetSub) return null
    subjectName = targetSub.name || 'Subject'

    if (!targetSub.expectations) targetSub.expectations = []
    if (!targetSub.gradebookUnits) targetSub.gradebookUnits = []

    const matchedMasterCodes = new Set()

    targetSub.expectations.forEach(clsExp => {
      const normClsCode = cleanExpectationText(clsExp.code).toUpperCase()
      const matched = masterExps.find(me => me.code === normClsCode)
      if (matched) {
        matchedMasterCodes.add(matched.code)
        // Check weight difference
        const currentWeight = clsExp.weight != null ? Number(clsExp.weight) : 1.0
        if (currentWeight !== matched.weight) {
          diffs.push({
            type: 'weight',
            code: matched.code,
            strandName: matched.strandName,
            oldVal: currentWeight,
            newVal: matched.weight,
            description: matched.description
          })
          clsExp.weight = matched.weight
          changesCount++
        }
        // Check description difference
        const currentDesc = cleanExpectationText(clsExp.description || clsExp.text || '')
        if (currentDesc !== matched.description && matched.description) {
          diffs.push({
            type: 'description',
            code: matched.code,
            strandName: matched.strandName,
            oldVal: currentDesc,
            newVal: matched.description
          })
          clsExp.description = matched.description
          clsExp.text = matched.description
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
            unitId: `unit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: me.strandName,
            gradeLevel: preset.grade || '',
            weight: 0
          }
          targetSub.gradebookUnits.push(targetUnit)
        }

        targetSub.expectations.push({
          expectationId: `exp_${Date.now()}_${me.code}_${Math.floor(Math.random() * 1000)}`,
          unitId: targetUnit.unitId,
          code: me.code,
          description: me.description,
          text: me.description,
          weight: me.weight,
          active: me.active,
          gradeLevel: preset.grade || '',
          isOverall: me.isOverall
        })

        diffs.push({
          type: 'added',
          code: me.code,
          strandName: me.strandName,
          oldVal: null,
          newVal: me.weight,
          description: me.description
        })
        changesCount++
      }
    })

    return { updatedClass: updatedCls, changesCount, subjectName, diffs, sectionKey: targetSub.subjectId || null }
  } else {
    // Secondary class (supports split class frameworks and standard class)
    const pCode = (preset.subjectCode || '').toUpperCase().trim()
    const pTitle = (preset.title || '').toUpperCase()
    let unitsList = null
    let resolvedSectionKey = null

    if (cls.courseFrameworks && Object.keys(cls.courseFrameworks).length > 0) {
      // Split class: find matching section
      const secKeys = Object.keys(cls.courseFrameworks)
      let targetKey = targetSectionKey
      if (targetKey) {
        // Validate that targetSectionKey actually matches this preset
        const isMatch = isCourseCodeMatch(targetKey, pCode) || pTitle.includes(targetKey.toUpperCase())
        if (!isMatch) return null
      } else {
        targetKey = secKeys.find(k => 
          isCourseCodeMatch(k, pCode) || pTitle.includes(k.toUpperCase())
        )
      }

      if (!targetKey || !cls.courseFrameworks[targetKey]) return null
      resolvedSectionKey = targetKey
      if (!updatedCls.courseFrameworks[targetKey].gradebookUnits) {
        updatedCls.courseFrameworks[targetKey].gradebookUnits = []
      }
      unitsList = updatedCls.courseFrameworks[targetKey].gradebookUnits
      subjectName = `${cls.name || 'Class'} (${targetKey})`
    } else {
      // Standard secondary class
      const courseCode = (cls.courseCode || '').toUpperCase().trim()
      const clsName = (cls.name || '').toUpperCase().trim()
      const isMatch = isCourseCodeMatch(courseCode, pCode) || 
                      isCourseCodeMatch(clsName, pCode) ||
                      (pCode && (courseCode.includes(pCode) || clsName.includes(pCode))) ||
                      (courseCode && pTitle.includes(courseCode))

      if (!isMatch) return null
      subjectName = cls.name || cls.courseCode || pCode
      if (!updatedCls.gradebookUnits) updatedCls.gradebookUnits = []
      unitsList = updatedCls.gradebookUnits
    }

    const matchedMasterCodes = new Set()

    unitsList.forEach(unit => {
      if (unit.expectations) {
        unit.expectations.forEach(exp => {
          const normCode = cleanExpectationText(exp.code).toUpperCase()
          const matched = masterExps.find(me => me.code === normCode)
          if (matched) {
            matchedMasterCodes.add(matched.code)
            const currentWeight = exp.weight != null ? Number(exp.weight) : 1.0
            if (currentWeight !== matched.weight) {
              diffs.push({
                type: 'weight',
                code: matched.code,
                strandName: unit.name,
                oldVal: currentWeight,
                newVal: matched.weight,
                description: matched.description
              })
              exp.weight = matched.weight
              changesCount++
            }
            const currentDesc = cleanExpectationText(exp.description || exp.text || '')
            if (currentDesc !== matched.description && matched.description) {
              diffs.push({
                type: 'description',
                code: matched.code,
                strandName: unit.name,
                oldVal: currentDesc,
                newVal: matched.description
              })
              exp.description = matched.description
              exp.text = matched.description
              changesCount++
            }
          }
        })
      }
    })

    // Add any new expectations from master that aren't in this secondary class yet
    masterExps.forEach(me => {
      if (!matchedMasterCodes.has(me.code)) {
        let targetUnit = unitsList.find(u => 
          cleanExpectationText(u.name).toLowerCase() === me.strandName.toLowerCase()
        )
        if (!targetUnit) {
          targetUnit = {
            unitId: `unit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: me.strandName,
            weight: 0,
            expectations: []
          }
          unitsList.push(targetUnit)
        }
        if (!targetUnit.expectations) targetUnit.expectations = []

        targetUnit.expectations.push({
          expectationId: `exp_${Date.now()}_${me.code}_${Math.floor(Math.random() * 1000)}`,
          unitId: targetUnit.unitId,
          code: me.code,
          description: me.description,
          text: me.description,
          weight: me.weight,
          active: me.active,
          isOverall: me.isOverall
        })

        diffs.push({
          type: 'added',
          code: me.code,
          strandName: me.strandName,
          oldVal: null,
          newVal: me.weight,
          description: me.description
        })
        changesCount++
      }
    })

    return { 
      updatedClass: updatedCls, 
      changesCount, 
      subjectName, 
      diffs, 
      sectionKey: resolvedSectionKey 
    }
  }
}

/**
 * Scans all classes and detects which active classes teach the curriculum of a master preset.
 * Returns each matching class, the exact diffs detected, and the prepared updated class object.
 *
 * @param {Object} preset - The master curriculum preset
 * @param {Array<Object>} allClasses - List of all classes from DB
 * @returns {Array<Object>}
 */
export function findMatchingClassesForPreset(preset, allClasses = []) {
  if (!preset || !Array.isArray(allClasses)) return []
  const matches = []

  allClasses.forEach(cls => {
    if (!cls) return
    if (cls.classType === 'elementary') {
      if (preset.panel && preset.panel !== 'elementary') return
      const res = syncPresetToClass(cls, preset)
      if (res) {
        matches.push({
          classId: cls.classId,
          className: cls.name,
          classType: 'elementary',
          subjectName: res.subjectName,
          sectionKey: null,
          changesCount: res.changesCount,
          diffs: res.diffs,
          updatedClass: res.updatedClass,
          cls
        })
      }
    } else {
      // Secondary
      if (preset.panel && preset.panel !== 'secondary') return
      if (cls.courseFrameworks && Object.keys(cls.courseFrameworks).length > 0) {
        // Split class: inspect each section
        Object.keys(cls.courseFrameworks).forEach(secKey => {
          const res = syncPresetToClass(cls, preset, secKey)
          if (res) {
            matches.push({
              classId: cls.classId,
              className: cls.name,
              classType: 'secondary',
              courseCode: secKey,
              subjectName: `${cls.name} (${secKey})`,
              sectionKey: secKey,
              changesCount: res.changesCount,
              diffs: res.diffs,
              updatedClass: res.updatedClass,
              cls
            })
          }
        })
      } else {
        // Standard secondary class
        const res = syncPresetToClass(cls, preset)
        if (res) {
          matches.push({
            classId: cls.classId,
            className: cls.name,
            classType: 'secondary',
            courseCode: cls.courseCode || cls.name,
            subjectName: cls.name,
            sectionKey: null,
            changesCount: res.changesCount,
            diffs: res.diffs,
            updatedClass: res.updatedClass,
            cls
          })
        }
      }
    }
  })

  return matches
}

/**
 * Compares a class's expectations and weights against its matching Master Curriculum Blueprint.
 * Detects any teacher customizations (custom weights, descriptions, or added expectations)
 * that differ from the master library, and prepares an updated master preset.
 *
 * @param {Object} cls - The class record
 * @param {string|null} [sectionOrSubjectId=null] - Section key (secondary split) or subjectId (elementary)
 * @returns {{ masterPreset: Object|null, hasDiffs: boolean, diffs: Array<Object>, updatedMasterPreset: Object|null, targetCode: string, targetTitle: string }}
 */
export function diffClassAgainstMaster(cls, sectionOrSubjectId = null) {
  if (!cls) return { masterPreset: null, hasDiffs: false, diffs: [], updatedMasterPreset: null, targetCode: '', targetTitle: '' }

  let targetCode = ''
  let targetTitle = ''
  let masterPreset = null
  let classUnits = []

  if (cls.classType === 'elementary') {
    const sub = (cls.subjects || []).find(s => 
      s.subjectId === sectionOrSubjectId || s.code === sectionOrSubjectId || !sectionOrSubjectId
    ) || (cls.subjects?.[0])

    if (!sub) return { masterPreset: null, hasDiffs: false, diffs: [], updatedMasterPreset: null, targetCode: '', targetTitle: '' }
    targetCode = (sub.code || 'SUBJECT').toUpperCase()
    targetTitle = sub.name || targetCode

    masterPreset = resolveSubjectPreset(cls.gradeLevel, sub.code, sub.name)
    const exps = sub.expectations || []
    classUnits = (sub.gradebookUnits || []).map(u => ({
      id: u.unitId,
      name: cleanExpectationText(u.name),
      expectations: exps.filter(e => e.unitId === u.unitId)
    }))
  } else {
    // Secondary
    let targetKey = sectionOrSubjectId
    if (cls.courseFrameworks && Object.keys(cls.courseFrameworks).length > 0) {
      if (!targetKey) targetKey = Object.keys(cls.courseFrameworks)[0]
      const secData = cls.courseFrameworks[targetKey]
      targetCode = (targetKey || '').toUpperCase().trim()
      targetTitle = `${cls.name || ''} (${targetKey})`
      classUnits = secData?.gradebookUnits || []
    } else {
      targetCode = (cls.courseCode || cls.name || 'COURSE').toUpperCase().trim()
      targetTitle = cls.name || targetCode
      classUnits = cls.gradebookUnits || []
    }

    const secPresets = getMergedCurriculumPresets('secondary')
    // Prioritize teacher-customized master presets over built-in Ministry baselines
    masterPreset = secPresets.find(p => {
      if (!p.isCustomMaster) return false
      const pCode = (p.subjectCode || '').toUpperCase().trim()
      return isCourseCodeMatch(pCode, targetCode) || (targetCode && p.presetId.includes(targetCode.toLowerCase()))
    }) || secPresets.find(p => {
      const pCode = (p.subjectCode || '').toUpperCase().trim()
      return isCourseCodeMatch(pCode, targetCode) || (targetCode && p.presetId.includes(targetCode.toLowerCase()))
    })
  }

  // Flatten class expectations
  const classExps = []
  classUnits.forEach(u => {
    (u.expectations || []).forEach(e => {
      classExps.push({
        expectationId: e.expectationId,
        code: cleanExpectationText(e.code).toUpperCase(),
        description: cleanExpectationText(e.description || e.text || ''),
        weight: (e.weight !== undefined && e.weight !== null && !isNaN(e.weight)) ? Number(e.weight) : 1.0,
        active: e.active !== false,
        strandName: cleanExpectationText(u.name)
      })
    })
  })

  // Flatten master expectations
  const masterExpMap = new Map()
  if (masterPreset) {
    const list = extractMasterExpectations(masterPreset)
    list.forEach(me => {
      masterExpMap.set(me.code, me)
    })
  }

  const diffs = []

  // Check each expectation in the class against the master
  classExps.forEach(ce => {
    const me = masterExpMap.get(ce.code)
    if (!me) {
      // New expectation added in class that is not in master
      diffs.push({
        type: 'added',
        code: ce.code,
        strandName: ce.strandName,
        oldVal: null,
        newVal: ce.weight,
        description: ce.description
      })
    } else {
      if (ce.weight !== me.weight) {
        diffs.push({
          type: 'weight',
          code: ce.code,
          strandName: ce.strandName,
          oldVal: me.weight,
          newVal: ce.weight,
          description: ce.description
        })
      }
      if (ce.description && ce.description !== me.description) {
        diffs.push({
          type: 'description',
          code: ce.code,
          strandName: ce.strandName,
          oldVal: me.description,
          newVal: ce.description
        })
      }
    }
  })

  // Build the updated master preset that merges these class customizations
  const presetId = masterPreset?.presetId || `custom-${targetCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`
  const title = masterPreset?.title || `${targetCode} Course Blueprint`
  const panel = cls.classType === 'elementary' ? 'elementary' : 'secondary'
  const grade = cls.gradeLevel || masterPreset?.grade || (panel === 'secondary' ? 'Grade 9' : 'Grade 8')

  const updatedMasterPreset = {
    ...(masterPreset || {}),
    presetId,
    title,
    subjectCode: targetCode,
    panel,
    grade,
    isCustomMaster: true,
    updatedAt: new Date().toISOString(),
    strands: classUnits.map(u => {
      const formatted = (u.expectations || []).map(e => ({
        expectationId: e.expectationId || crypto.randomUUID(),
        code: cleanExpectationText(e.code).toUpperCase(),
        description: cleanExpectationText(e.description || e.text || ''),
        weight: (e.weight !== undefined && e.weight !== null && !isNaN(e.weight)) ? Number(e.weight) : 1.0,
        active: e.active !== false
      }))
      return {
        id: u.unitId || u.id || `strand-${Math.random()}`,
        name: cleanExpectationText(u.name),
        expectations: formatted,
        overalls: formatted.map(e => ({
          code: e.code,
          name: e.code,
          description: e.description,
          weight: e.weight,
          specifics: []
        }))
      }
    })
  }

  return {
    masterPreset,
    hasDiffs: diffs.length > 0,
    diffs,
    updatedMasterPreset,
    targetCode,
    targetTitle
  }
}

/**
 * Pushes expectations and weights from an active class back into the Master Curriculum Library.
 * Saves directly to IndexedDB settings.customCurriculumPresets and updates reactive state.
 *
 * @param {Object} cls - The class record
 * @param {string|null} [sectionOrSubjectId=null] - Optional section or subject identifier
 * @returns {Promise<{ savedPreset: Object, diffs: Array<Object> }>}
 */
export async function exportClassExpectationsToMaster(cls, sectionOrSubjectId = null) {
  const diffResult = diffClassAgainstMaster(cls, sectionOrSubjectId)
  if (!diffResult.updatedMasterPreset) {
    throw new Error('Could not derive master preset from class framework.')
  }
  const savedPreset = await saveMasterPreset(diffResult.updatedMasterPreset)
  return { savedPreset, diffs: diffResult.diffs }
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
    syncPresetToClass,
    findMatchingClassesForPreset,
    diffClassAgainstMaster,
    exportClassExpectationsToMaster
  }
}

