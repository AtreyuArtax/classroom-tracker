// Secondary Presets
import snc1w from './secondary/ontario-snc1w.json'
import mth1w from './secondary/ontario-mth1w.json'
import mpm2d from './secondary/ontario-mpm2d.json'
import mfm2p from './secondary/ontario-mfm2p.json'
import snc2d from './secondary/ontario-snc2d.json'
import snc2p from './secondary/ontario-snc2p.json'
import sch3u from './secondary/ontario-sch3u.json'
import sph3u from './secondary/ontario-sph3u.json'
import sph4u from './secondary/ontario-sph4u.json'

// Elementary Grade 7 Presets
import g7arts from './elementary/ontario-g7-arts.json'
import g7coreFrench from './elementary/ontario-g7-core-french.json'
import g7extFrench from './elementary/ontario-g7-extended-french.json'
import g7fi from './elementary/ontario-g7-french-immersion.json'
import g7geo from './elementary/ontario-g7-geography.json'
import g7hist from './elementary/ontario-g7-history.json'
import g7hpe from './elementary/ontario-g7-hpe.json'
import g7lang from './elementary/ontario-g7-language.json'
import g7math from './elementary/ontario-g7-math.json'
import g7sci from './elementary/ontario-g7-science-tech.json'

// Elementary Grade 8 Presets
import g8arts from './elementary/ontario-g8-arts.json'
import g8coreFrench from './elementary/ontario-g8-core-french.json'
import g8extFrench from './elementary/ontario-g8-extended-french.json'
import g8fi from './elementary/ontario-g8-french-immersion.json'
import g8geo from './elementary/ontario-g8-geography.json'
import g8hist from './elementary/ontario-g8-history.json'
import g8hpe from './elementary/ontario-g8-hpe.json'
import g8lang from './elementary/ontario-g8-language.json'
import g8math from './elementary/ontario-g8-math.json'
import g8sci from './elementary/ontario-g8-science-tech.json'

export const curriculumPresets = [
  // Secondary
  snc1w,
  mth1w,
  mpm2d,
  mfm2p,
  snc2d,
  snc2p,
  sch3u,
  sph3u,
  sph4u,
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
    if (normName.includes('french') || normCode.includes('fsl')) {
      return titleLower.includes('french') || pIdLower.includes('french')
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



