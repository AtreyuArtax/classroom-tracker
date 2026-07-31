import snc1w from './secondary/ontario-snc1w.json'
import mth1w from './secondary/ontario-mth1w.json'
import sph3u from './secondary/ontario-sph3u.json'
import sph4u from './secondary/ontario-sph4u.json'
import gr7science from './elementary/ontario-gr7-science.json'
import gr8science from './elementary/ontario-gr8-science.json'

export const curriculumPresets = [
  snc1w,
  mth1w,
  sph3u,
  sph4u,
  gr7science,
  gr8science
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

    if (normCode && (pCodeLower === normCode || titleLower.includes(normCode))) return true
    if (normName && titleLower.includes(normName)) return true

    // Common subject keywords
    if (normName.includes('science') || normCode.includes('sci')) {
      return titleLower.includes('science')
    }
    if (normName.includes('math') || normCode.includes('mat')) {
      return titleLower.includes('math')
    }
    if (normName.includes('language') || normCode.includes('lan')) {
      return titleLower.includes('language')
    }
    if (normName.includes('social') || normCode.includes('soc')) {
      return titleLower.includes('social')
    }

    return false
  }) || null
}

export function findElementaryPresets(gradesList, subjectCode, subjectName = '') {
  if (!gradesList || !gradesList.length) return []
  const presets = []
  gradesList.forEach(g => {
    const p = findElementaryPreset(g, subjectCode, subjectName)
    if (p && !presets.some(existing => existing.presetId === p.presetId)) {
      presets.push(p)
    }
  })
  return presets
}


