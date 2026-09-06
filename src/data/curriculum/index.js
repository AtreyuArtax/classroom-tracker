// Secondary Standard Presets
import snc1w from './ontario/secondary/science/ontario-snc1w.json' with { type: 'json' }
import mth1w from './ontario/secondary/math/ontario-mth1w.json' with { type: 'json' }
import mpm2d from './ontario/secondary/math/ontario-mpm2d.json' with { type: 'json' }
import mfm2p from './ontario/secondary/math/ontario-mfm2p.json' with { type: 'json' }
import snc2d from './ontario/secondary/science/ontario-snc2d.json' with { type: 'json' }
import snc2p from './ontario/secondary/science/ontario-snc2p.json' with { type: 'json' }
import sch3u from './ontario/secondary/science/ontario-sch3u.json' with { type: 'json' }
import sph3u from './ontario/secondary/science/ontario-sph3u.json' with { type: 'json' }
import sph4u from './ontario/secondary/science/ontario-sph4u.json' with { type: 'json' }

// Secondary Success Criteria Presets
import snc1wSuccessCriteria from './ontario/secondary/science/ontario-snc1w-success-criteria.json' with { type: 'json' }
import mth1wSuccessCriteria from './ontario/secondary/math/ontario-mth1w-success-criteria.json' with { type: 'json' }
import mpm2dSuccessCriteria from './ontario/secondary/math/ontario-mpm2d-success-criteria.json' with { type: 'json' }
import mfm2pSuccessCriteria from './ontario/secondary/math/ontario-mfm2p-success-criteria.json' with { type: 'json' }
import snc2dSuccessCriteria from './ontario/secondary/science/ontario-snc2d-success-criteria.json' with { type: 'json' }
import snc2pSuccessCriteria from './ontario/secondary/science/ontario-snc2p-success-criteria.json' with { type: 'json' }
import sch3uSuccessCriteria from './ontario/secondary/science/ontario-sch3u-success-criteria.json' with { type: 'json' }
import sph3uSuccessCriteria from './ontario/secondary/science/ontario-sph3u-success-criteria.json' with { type: 'json' }

// Elementary Grade 7 Presets
import g7arts from './ontario/elementary/grade-7/ontario-g7-arts.json' with { type: 'json' }
import g7coreFrench from './ontario/elementary/grade-7/ontario-g7-core-french.json' with { type: 'json' }
import g7extFrench from './ontario/elementary/grade-7/ontario-g7-extended-french.json' with { type: 'json' }
import g7fi from './ontario/elementary/grade-7/ontario-g7-french-immersion.json' with { type: 'json' }
import g7geo from './ontario/elementary/grade-7/ontario-g7-geography.json' with { type: 'json' }
import g7hist from './ontario/elementary/grade-7/ontario-g7-history.json' with { type: 'json' }
import g7hpe from './ontario/elementary/grade-7/ontario-g7-hpe.json' with { type: 'json' }
import g7lang from './ontario/elementary/grade-7/ontario-g7-language.json' with { type: 'json' }
import g7math from './ontario/elementary/grade-7/ontario-g7-math.json' with { type: 'json' }
import g7sci from './ontario/elementary/grade-7/ontario-g7-science-tech.json' with { type: 'json' }

// Elementary Grade 8 Presets
import g8arts from './ontario/elementary/grade-8/ontario-g8-arts.json' with { type: 'json' }
import g8coreFrench from './ontario/elementary/grade-8/ontario-g8-core-french.json' with { type: 'json' }
import g8extFrench from './ontario/elementary/grade-8/ontario-g8-extended-french.json' with { type: 'json' }
import g8fi from './ontario/elementary/grade-8/ontario-g8-french-immersion.json' with { type: 'json' }
import g8geo from './ontario/elementary/grade-8/ontario-g8-geography.json' with { type: 'json' }
import g8hist from './ontario/elementary/grade-8/ontario-g8-history.json' with { type: 'json' }
import g8hpe from './ontario/elementary/grade-8/ontario-g8-hpe.json' with { type: 'json' }
import g8lang from './ontario/elementary/grade-8/ontario-g8-language.json' with { type: 'json' }
import g8math from './ontario/elementary/grade-8/ontario-g8-math.json' with { type: 'json' }
import g8sci from './ontario/elementary/grade-8/ontario-g8-science-tech.json' with { type: 'json' }

export const curriculumPresets = [
  // Secondary Standard
  snc1w,
  mth1w,
  mpm2d,
  mfm2p,
  snc2d,
  snc2p,
  sch3u,
  sph3u,
  sph4u,
  // Secondary Success Criteria
  snc1wSuccessCriteria,
  mth1wSuccessCriteria,
  mpm2dSuccessCriteria,
  mfm2pSuccessCriteria,
  snc2dSuccessCriteria,
  snc2pSuccessCriteria,
  sch3uSuccessCriteria,
  sph3uSuccessCriteria,
  // Elementary Grade 7
  g7arts,
  g7coreFrench,
  g7extFrench,
  g7fi,
  g7geo,
  g7hist,
  g7hpe,
  g7lang,
  g7math,
  g7sci,
  // Elementary Grade 8
  g8arts,
  g8coreFrench,
  g8extFrench,
  g8fi,
  g8geo,
  g8hist,
  g8hpe,
  g8lang,
  g8math,
  g8sci
]

export function getPresetsByPanel() {
  return {
    secondary: curriculumPresets.filter(p => p.panel === 'secondary'),
    elementary: curriculumPresets.filter(p => p.panel === 'elementary')
  }
}

export function findElementaryPreset(grade, subjectCode, subjectName = '') {
  if (!grade) return null
  const elemPresets = curriculumPresets.filter(p => p.panel === 'elementary')
  
  const normGrade = grade.toLowerCase().replace(/[^a-z0-9]/g, '')
  const normCode = (subjectCode || '').toLowerCase().trim()
  const normName = (subjectName || '').toLowerCase().trim()

  return elemPresets.find(p => {
    const presetGrade = (p.grade || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (presetGrade && !normGrade.includes(presetGrade) && !presetGrade.includes(normGrade)) {
      return false
    }

    const titleLower = (p.title || '').toLowerCase()
    const pCodeLower = (p.subjectCode || '').toLowerCase()
    const pIdLower = (p.presetId || '').toLowerCase()

    if (normCode && (pCodeLower === normCode || titleLower.includes(normCode) || pIdLower.includes(normCode))) return true
    if (normName && (titleLower.includes(normName) || pIdLower.includes(normName))) return true

    // Common subject keyword matches
    if (normName.includes('science') || normCode.includes('sci')) {
      return titleLower.includes('science') || pIdLower.includes('science')
    }
    if (normName.includes('math') || normCode.includes('mat')) {
      return titleLower.includes('math') || pIdLower.includes('math')
    }
    if (normName.includes('language') || normCode.includes('lan')) {
      return titleLower.includes('language') || pIdLower.includes('language')
    }
    if (normName.includes('art') || normCode.includes('art')) {
      return titleLower.includes('arts') || pIdLower.includes('arts')
    }
    if (normName.includes('phys') || normName.includes('health') || normCode.includes('hpe')) {
      return titleLower.includes('health') || pIdLower.includes('hpe')
    }
    if (normName.includes('immersion') || normCode === 'fi') {
      return titleLower.includes('immersion') || pIdLower.includes('french-immersion')
    }
    if (normName.includes('extended') || normCode.includes('ext')) {
      return titleLower.includes('extended') || pIdLower.includes('extended-french')
    }
    if (normName.includes('french') || normCode.includes('fsl')) {
      return titleLower.includes('core french') || pIdLower.includes('core-french') || (titleLower.includes('french') && !titleLower.includes('immersion') && !titleLower.includes('extended'))
    }
    if (normName.includes('social') || normCode.includes('soc')) {
      return titleLower.includes('history') || titleLower.includes('geography')
    }

    return false
  }) || null
}

export function findElementaryPresets(gradesList, subjectCode, subjectName = '') {
  if (!gradesList || !gradesList.length) return []
  const presets = []
  gradesList.forEach(g => {
    const normGrade = g.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normName = (subjectName || '').toLowerCase()
    const normCode = (subjectCode || '').toLowerCase()

    // If Social Studies in Grade 7/8, include both History & Geography if available
    if (normName.includes('social') || normCode === 'soc') {
      const gHistory = curriculumPresets.find(p => 
        p.panel === 'elementary' && 
        (p.grade || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(normGrade) && 
        p.presetId.includes('history')
      )
      const gGeo = curriculumPresets.find(p => 
        p.panel === 'elementary' && 
        (p.grade || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(normGrade) && 
        p.presetId.includes('geography')
      )
      if (gHistory && !presets.some(existing => existing.presetId === gHistory.presetId)) presets.push(gHistory)
      if (gGeo && !presets.some(existing => existing.presetId === gGeo.presetId)) presets.push(gGeo)
    } else {
      const p = findElementaryPreset(g, subjectCode, subjectName)
      if (p && !presets.some(existing => existing.presetId === p.presetId)) {
        presets.push(p)
      }
    }
  })
  return presets
}



