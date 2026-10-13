/**
 * src/composables/useAiPrompts.js
 *
 * Reactive state and management for Local AI comment prompt presets and temperature tuning.
 * Provides:
 *  - Temperature tuning (0.0 - 1.0, default 0.3)
 *  - Built-in & custom prompt presets (Ontario Standard, Warm & Encouraging, etc.)
 *  - Custom directive and full template editing
 *  - Export to JSON and import / clipboard sharing
 *  - Instant "Reset to Default"
 *
 * Persisted to IndexedDB via settingsService with reactive fallback.
 */

import { ref, computed } from 'vue'
import {
  BUILTIN_PROMPT_PRESETS,
  getBuiltinPromptPresets
} from '../utils/localLlmService.js'
import {
  getAiCommentSettings,
  saveAiCommentSettings,
  resetAiCommentSettingsToDefault
} from '../db/settingsService.js'

// ── Shared Module-Level Reactive State ─────────────────────────────────────────

export const currentTemperature = ref(0.30)
export const activePresetId = ref('ontario-standard')
export const customPresets = ref({})
export const isAiPromptsInitialized = ref(false)

// ── Computed Properties ───────────────────────────────────────────────────────

export const allPresets = computed(() => {
  const customList = Object.values(customPresets.value || {})
  return [...BUILTIN_PROMPT_PRESETS, ...customList]
})

export const activePreset = computed(() => {
  const found = allPresets.value.find(p => p.id === activePresetId.value)
  return found || BUILTIN_PROMPT_PRESETS[0]
})

// ── Storage Synchronization ───────────────────────────────────────────────────

/**
 * Loads AI settings from database (or fallback) into reactive state.
 */
export async function initAiPrompts() {
  if (isAiPromptsInitialized.value) return

  try {
    const data = await getAiCommentSettings()
    if (data) {
      if (typeof data.temperature === 'number' && !isNaN(data.temperature)) {
        currentTemperature.value = Math.max(0.0, Math.min(1.0, Math.round(data.temperature * 100) / 100))
      }
      if (data.activePresetId) {
        activePresetId.value = data.activePresetId
      }
      if (data.customPresets && typeof data.customPresets === 'object') {
        customPresets.value = { ...data.customPresets }
      }
    }
  } catch (err) {
    console.warn('Failed to load AI comment settings, using defaults:', err)
  } finally {
    isAiPromptsInitialized.value = true
  }
}

/**
 * Saves current reactive state to persistence store.
 */
async function persistCurrentState() {
  try {
    await saveAiCommentSettings({
      temperature: currentTemperature.value,
      activePresetId: activePresetId.value,
      customPresets: JSON.parse(JSON.stringify(customPresets.value))
    })
  } catch (err) {
    console.warn('Could not persist AI prompt settings:', err)
  }
}

// ── Mutation Actions ──────────────────────────────────────────────────────────

/**
 * Updates the response generation temperature (clamped between 0.0 and 1.0).
 *
 * @param {number} temp
 */
export async function setTemperature(temp) {
  const num = typeof temp === 'number' ? temp : parseFloat(temp)
  const clamped = isNaN(num) ? 0.30 : Math.max(0.0, Math.min(1.0, Math.round(num * 100) / 100))
  currentTemperature.value = clamped
  await persistCurrentState()
  return clamped
}

/**
 * Selects an active preset by ID.
 * Optionally applies the preset's preferred temperature if specified.
 *
 * @param {string} presetId
 */
export async function selectPreset(presetId) {
  if (!presetId) return
  activePresetId.value = presetId
  const preset = allPresets.value.find(p => p.id === presetId)
  if (preset && typeof preset.temperature === 'number') {
    currentTemperature.value = preset.temperature
  }
  await persistCurrentState()
}

/**
 * Saves or updates a custom preset.
 *
 * @param {Object} preset
 * @returns {Promise<Object>} The saved preset object
 */
export async function saveCustomPreset(preset) {
  if (!preset) throw new Error('Preset object is required')
  const name = (preset.name || '').trim() || 'Untitled Custom Preset'

  let id = preset.id
  const isExistingCustom = id && customPresets.value[id]

  // If modifying a built-in or creating new, assign a unique custom id
  if (!id || id.startsWith('ontario-') || id === 'warm-encouraging' || id === 'inquiry-investigation' || id === 'concise-direct') {
    id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  }

  const cleanPreset = {
    id,
    name,
    badge: preset.badge || 'Custom',
    isBuiltin: false,
    description: (preset.description || '').trim(),
    temperature: typeof preset.temperature === 'number' ? preset.temperature : currentTemperature.value,
    customDirectives: (preset.customDirectives || '').trim(),
    customSystemPrompt: (preset.customSystemPrompt || '').trim(),
    updatedAt: new Date().toISOString()
  }

  customPresets.value = {
    ...customPresets.value,
    [id]: cleanPreset
  }
  activePresetId.value = id
  if (typeof cleanPreset.temperature === 'number') {
    currentTemperature.value = cleanPreset.temperature
  }

  await persistCurrentState()
  return cleanPreset
}

/**
 * Deletes a custom preset.
 *
 * @param {string} presetId
 */
export async function deleteCustomPreset(presetId) {
  if (!presetId || !customPresets.value[presetId]) return

  const updated = { ...customPresets.value }
  delete updated[presetId]
  customPresets.value = updated

  if (activePresetId.value === presetId) {
    activePresetId.value = 'ontario-standard'
    currentTemperature.value = 0.30
  }

  await persistCurrentState()
}

/**
 * Resets temperature, active preset, and prompt settings back to factory defaults.
 * Built-in Ontario Standard is restored.
 */
export async function resetToDefaults() {
  await resetAiCommentSettingsToDefault()
  currentTemperature.value = 0.30
  activePresetId.value = 'ontario-standard'
  customPresets.value = {}
  return {
    temperature: 0.30,
    activePresetId: 'ontario-standard'
  }
}

// ── Export & Import (Sharing) ─────────────────────────────────────────────────

/**
 * Formats a preset into an exportable JSON payload.
 *
 * @param {Object} preset
 * @returns {string} JSON string
 */
export function exportPresetJson(preset = activePreset.value) {
  const payload = {
    app: 'classroom-tracker',
    type: 'ai-comment-preset',
    version: 1,
    exportedAt: new Date().toISOString(),
    preset: {
      name: preset.name || 'Shared Preset',
      description: preset.description || '',
      badge: preset.badge || 'Shared',
      temperature: typeof preset.temperature === 'number' ? preset.temperature : 0.30,
      customDirectives: preset.customDirectives || '',
      customSystemPrompt: preset.customSystemPrompt || ''
    }
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * Triggers a file download for a preset (.json).
 *
 * @param {Object} preset
 */
export function downloadPresetFile(preset = activePreset.value) {
  const jsonStr = exportPresetJson(preset)
  const safeName = (preset.name || 'ai_prompt_preset')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName || 'preset'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Imports a preset from a JSON string or object.
 *
 * @param {string|Object} rawInput
 * @returns {Promise<Object>} The imported custom preset
 */
export async function importPreset(rawInput) {
  let data = rawInput
  if (typeof rawInput === 'string') {
    try {
      data = JSON.parse(rawInput.trim())
    } catch {
      throw new Error('Invalid JSON format. Please ensure you pasted valid preset JSON.')
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid preset structure.')
  }

  // Handle wrapped { app: "classroom-tracker", preset: {...} } or bare preset object
  const p = data.preset || data

  if (!p || typeof p !== 'object') {
    throw new Error('Preset data is missing from JSON.')
  }

  const name = (p.name || 'Imported Preset').trim()
  const customDirectives = (p.customDirectives || '').trim()
  const customSystemPrompt = (p.customSystemPrompt || '').trim()
  const temperature = (typeof p.temperature === 'number' && !isNaN(p.temperature))
    ? Math.max(0.0, Math.min(1.0, p.temperature))
    : 0.30

  const newPreset = {
    name,
    badge: p.badge || 'Imported',
    description: (p.description || 'Imported preset from colleague').trim(),
    temperature,
    customDirectives,
    customSystemPrompt
  }

  return await saveCustomPreset(newPreset)
}

/**
 * Composable entry point.
 */
export function useAiPrompts() {
  return {
    currentTemperature,
    activePresetId,
    customPresets,
    allPresets,
    activePreset,
    initAiPrompts,
    setTemperature,
    selectPreset,
    saveCustomPreset,
    deleteCustomPreset,
    resetToDefaults,
    exportPresetJson,
    downloadPresetFile,
    importPreset
  }
}
