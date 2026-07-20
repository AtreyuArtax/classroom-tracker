import snc1w from './secondary/ontario-snc1w.json'
import mth1w from './secondary/ontario-mth1w.json'
import sph3u from './secondary/ontario-sph3u.json'
import sph4u from './secondary/ontario-sph4u.json'
import gr7science from './elementary/ontario-gr7-science.json'

export const curriculumPresets = [
  snc1w,
  mth1w,
  sph3u,
  sph4u,
  gr7science
]

export function getPresetsByPanel() {
  return {
    secondary: curriculumPresets.filter(p => p.panel === 'secondary'),
    elementary: curriculumPresets.filter(p => p.panel === 'elementary')
  }
}
