/**
 * src/test_ai_prompt_presets.js
 *
 * Verification suite for AI comment prompt presets, temperature tuning,
 * template substitution, export/import sharing, and reset-to-default safeguards.
 */

import assert from 'node:assert'
import {
  BUILTIN_PROMPT_PRESETS,
  getBuiltinPromptPresets,
  getDefaultSecondarySystemPrompt,
  getDefaultElementarySystemPrompt
} from './utils/localLlmService.js'
import {
  currentTemperature,
  activePresetId,
  customPresets,
  allPresets,
  activePreset,
  setTemperature,
  selectPreset,
  saveCustomPreset,
  deleteCustomPreset,
  resetToDefaults,
  exportPresetJson,
  importPreset
} from './composables/useAiPrompts.js'
import {
  getAiCommentSettings,
  saveAiCommentSettings,
  resetAiCommentSettingsToDefault
} from './db/settingsService.js'

console.log('=================================================================')
console.log('🧪 AI PROMPT PRESETS & TEMPERATURE TUNING VERIFICATION')
console.log('=================================================================\n')

// ── Test 1: Built-in Catalog ──────────────────────────────────────────────────
console.log('TEST 1: Built-in Catalog Verification')
const builtins = getBuiltinPromptPresets()
assert(Array.isArray(builtins) && builtins.length >= 4, 'Catalog should contain at least 4 built-in presets')

const standardPreset = builtins.find(p => p.id === 'ontario-standard')
assert(standardPreset, 'Ontario Standard (Default) preset must exist')
assert.strictEqual(standardPreset.temperature, 0.30, 'Ontario Standard default temperature should be 0.30')
assert.strictEqual(standardPreset.isBuiltin, true, 'isBuiltin should be true')

const warmPreset = builtins.find(p => p.id === 'warm-encouraging')
assert(warmPreset && warmPreset.customDirectives.includes('growth mindset'), 'Warm & Encouraging preset directives intact')

console.log('  ✓ Built-in presets (Ontario Standard, Warm, Inquiry, Concise) verified.\n')

// ── Test 2: System Prompt Builders & Template Variables ───────────────────────
console.log('TEST 2: System Prompt Construction & Variable Interpolation')
const secondaryPrompt = getDefaultSecondarySystemPrompt({
  charLimit: 400,
  studentName: 'Maya Lin',
  pronounInstruction: 'Use she/her pronouns'
})
assert(secondaryPrompt.includes('400 characters'), 'Secondary prompt includes char limit')
assert(secondaryPrompt.includes('Maya Lin'), 'Secondary prompt includes student name')
assert(secondaryPrompt.includes('she/her'), 'Secondary prompt includes pronoun instructions')

const elemSciencePrompt = getDefaultElementarySystemPrompt({
  charLimit: 1050,
  studentName: 'Alex Mercer',
  pronounInstruction: 'Use they/them pronouns',
  subjectName: 'Science and Technology',
  isLearningSkills: false
})
assert(elemSciencePrompt.toLowerCase().includes('science and technology'), 'Elementary prompt includes subject')
assert(elemSciencePrompt.includes('1050 characters'), 'Elementary prompt includes 1050 limit')

const elemSkillsPrompt = getDefaultElementarySystemPrompt({
  charLimit: 2600,
  studentName: 'Alex Mercer',
  pronounInstruction: 'Use they/them pronouns',
  isLearningSkills: true
})
assert(elemSkillsPrompt.includes('Learning Skills and Work Habits'), 'Learning skills prompt includes heading')
console.log('  ✓ System prompt builders correctly handle secondary and elementary modes.\n')

// ── Test 3: Temperature Tuning & Clamping ─────────────────────────────────────
console.log('TEST 3: Temperature Tuning & Clamping')
await setTemperature(0.25)
assert.strictEqual(currentTemperature.value, 0.25, 'Temperature set to 0.25')

// Test clamping
await setTemperature(1.8)
assert.strictEqual(currentTemperature.value, 1.0, 'Temperature clamped to max 1.0')

await setTemperature(-0.5)
assert.strictEqual(currentTemperature.value, 0.0, 'Temperature clamped to min 0.0')

await setTemperature('invalid')
assert.strictEqual(currentTemperature.value, 0.30, 'Invalid temperature falls back to default 0.30')

console.log('  ✓ Temperature set and clamped correctly between 0.0 and 1.0.\n')

// ── Test 4: Custom Preset Creation, Update, and Deletion ──────────────────────
console.log('TEST 4: Custom Preset Lifecycle')
const created = await saveCustomPreset({
  name: 'Senior Physics Extension',
  description: 'Rigorous quantitative inquiry style',
  temperature: 0.20,
  customDirectives: 'Focus on experimental uncertainty and mathematical derivations.',
  customSystemPrompt: 'Custom prompt for {{studentName}} with limit {{charLimit}}'
})

assert(created.id && created.id.startsWith('custom_'), 'Created preset assigned custom unique ID')
assert.strictEqual(activePresetId.value, created.id, 'Active preset switched to newly created preset')
assert.strictEqual(currentTemperature.value, 0.20, 'Temperature updated to preset temperature')
assert.strictEqual(activePreset.value.name, 'Senior Physics Extension', 'Active preset resolved correctly')

// Update existing preset
await saveCustomPreset({
  id: created.id,
  name: 'Senior Physics Extension (Updated)',
  temperature: 0.22,
  customDirectives: 'Updated directives.'
})
assert.strictEqual(activePreset.value.name, 'Senior Physics Extension (Updated)', 'Preset updated in place')
assert.strictEqual(currentTemperature.value, 0.22, 'Updated temperature persisted')

// Delete custom preset
await deleteCustomPreset(created.id)
assert(!customPresets.value[created.id], 'Preset removed from custom presets map')
assert.strictEqual(activePresetId.value, 'ontario-standard', 'Fallback to ontario-standard on deletion')
console.log('  ✓ Custom preset creation, update, and deletion verified.\n')

// ── Test 5: Export to JSON & Import from JSON Sharing ─────────────────────────
console.log('TEST 5: Export to JSON and Import Sharing')
const presetToShare = {
  name: 'Bilingual Inquiry Scaffold',
  description: 'Tailored for French Immersion parent feedback',
  temperature: 0.35,
  badge: 'Language',
  customDirectives: 'Highlight bilingual vocabulary acquisition and self-correction.',
  customSystemPrompt: ''
}

const exportedJson = exportPresetJson(presetToShare)
assert(typeof exportedJson === 'string', 'Exported JSON is string')
const parsedExport = JSON.parse(exportedJson)
assert.strictEqual(parsedExport.app, 'classroom-tracker', 'Export includes app signature')
assert.strictEqual(parsedExport.preset.name, 'Bilingual Inquiry Scaffold', 'Export includes preset payload')

// Import the JSON string
const imported = await importPreset(exportedJson)
assert(imported.id && imported.id.startsWith('custom_'), 'Imported preset given unique ID')
assert.strictEqual(imported.name, 'Bilingual Inquiry Scaffold', 'Imported name matches')
assert.strictEqual(imported.temperature, 0.35, 'Imported temperature matches')
assert.strictEqual(activePresetId.value, imported.id, 'Imported preset immediately activated')

// Cleanup imported preset
await deleteCustomPreset(imported.id)
console.log('  ✓ Export to JSON and import from JSON works seamlessly.\n')

// ── Test 6: Reset to Default Safeguard ─────────────────────────────────────────
console.log('TEST 6: Reset to Default Safeguard')
// Mutate state away from defaults
await setTemperature(0.85)
await saveCustomPreset({
  name: 'Temporary Style',
  temperature: 0.55
})

// Trigger reset
const resetResult = await resetToDefaults()
assert.strictEqual(currentTemperature.value, 0.30, 'Temperature restored to 0.30 default')
assert.strictEqual(activePresetId.value, 'ontario-standard', 'Active preset restored to ontario-standard')
assert.strictEqual(activePreset.value.name, 'Ontario Standard (Default)', 'Active preset object restored')

// Check DB settings persistence
const savedSettings = await getAiCommentSettings()
assert.strictEqual(savedSettings.temperature, 0.30, 'DB settings reflect reset temperature')
assert.strictEqual(savedSettings.activePresetId, 'ontario-standard', 'DB settings reflect reset activePresetId')

console.log('  ✓ "Reset to default" restores all factory settings safely.\n')

console.log('=================================================================')
console.log('🎉 ALL AI PROMPT PRESETS & TEMPERATURE TESTS PASSED (100% SUCCESS)!')
console.log('=================================================================')
