import snc1w from './secondary/ontario-snc1w.json'
import mth1w from './secondary/ontario-mth1w.json'
import gr7science from './elementary/ontario-gr7-science.json'

export const curriculumPresets = [
  snc1w,
  mth1w,
  gr7science
]

export function getPresetsByPanel() {
  return {
    secondary: curriculumPresets.filter(p => p.panel === 'secondary'),
    elementary: curriculumPresets.filter(p => p.panel === 'elementary')
  }
}
