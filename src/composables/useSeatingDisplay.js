/**
 * src/composables/useSeatingDisplay.js
 *
 * Singleton reactive state and preferences for dashboard seating chart visual indicators:
 * - Student headshots (re-exported from useStudentPhotos for unified display state)
 * - Accommodations (IEP / Gifted) dot
 * - Academic At-Risk dot
 */

import { ref, watch } from 'vue'
import { showDeskPhotos } from './useStudentPhotos.js'
import * as settingsService from '../db/settingsService.js'

// Accommodations dot visibility on desk tiles (defaults to true)
export const showIepDot = ref(localStorage.getItem('showIepDot') !== 'false')
watch(showIepDot, (val) => localStorage.setItem('showIepDot', String(val)))

// Academic at-risk dot visibility on desk tiles (defaults to true)
export const showAtRiskDot = ref(localStorage.getItem('showAtRiskDot') !== 'false')
watch(showAtRiskDot, (val) => localStorage.setItem('showAtRiskDot', String(val)))

// At-risk percentage threshold (reactive ref initialized from DB or default 60)
export const atRiskThreshold = ref(60)

export async function initThresholds() {
  const current = await settingsService.getThresholds()
  if (current?.atRiskThreshold !== undefined && current?.atRiskThreshold !== null) {
    atRiskThreshold.value = Number(current.atRiskThreshold)
  }
}

export async function updateAtRiskThreshold(val) {
  const num = Math.max(30, Math.min(95, Number(val) || 50))
  atRiskThreshold.value = num
  await settingsService.saveThresholds({ atRiskThreshold: num })
}

// Auto-initialize threshold on load
initThresholds()

export function useSeatingDisplay() {
  return {
    showDeskPhotos,
    showIepDot,
    showAtRiskDot,
    atRiskThreshold,
    updateAtRiskThreshold,
  }
}
