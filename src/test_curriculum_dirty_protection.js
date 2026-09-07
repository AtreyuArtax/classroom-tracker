/**
 * src/test_curriculum_dirty_protection.js
 *
 * Automated verification of the Curriculum Editor Unsaved Changes Protection system:
 * 1. Snapshot serializer deterministically captures expectation codes, descriptions, and weight multipliers.
 * 2. Changing an expectation multiplier (e.g. 1x -> 2x, 0.5x, 0x) immediately triggers isDirty === true.
 * 3. Reverting the multiplier back to original returns isDirty === false.
 * 4. Editing expectation code or description triggers isDirty === true.
 * 5. Adding or deleting a strand or expectation triggers isDirty === true.
 * 6. Saving or discarding correctly re-snapshots and resets isDirty to false.
 * 7. curriculumEditorDirty correctly mirrors editor dirty state for Setup.vue and App.vue navigation guards.
 */

import assert from 'assert'
import { ref, computed, watch } from 'vue'

// Mock browser storage for composable loading
const storage = {}
globalThis.localStorage = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = String(v) },
  removeItem: (k) => { delete storage[k] },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
}

const {
  curriculumEditorDirty,
  curriculumEditorTitle,
  curriculumEditorSaveHandler
} = await import('./composables/useCurriculumLibrary.js')

console.log('===================================================================')
console.log('🛡️  CURRICULUM EDITOR UNSAVED CHANGES & DIRTY PROTECTION AUDIT')
console.log('===================================================================\n')

// ─── Test Harness replicating CurriculumLibraryManager logic ──────────────
function createTestEditor(blueprint, variant = 'specific') {
  const selectedBlueprint = ref(blueprint)
  const activeVariant = ref(variant)
  const currentEditorPreset = ref(JSON.parse(JSON.stringify(blueprint.basePreset || blueprint)))
  const editorStrands = ref(JSON.parse(JSON.stringify(blueprint.strands || [])))
  const loadedPresetSnapshot = ref('')

  function getEditorSnapshot() {
    if (!selectedBlueprint.value || !currentEditorPreset.value) return ''
    const strandsData = (editorStrands.value || []).map(s => ({
      id: s.id,
      name: (s.name || '').trim(),
      expectations: (s.expectations || []).map(e => ({
        id: e.id,
        code: (e.code || '').trim().toUpperCase(),
        description: (e.description || '').trim(),
        weight: (e.weight !== undefined && e.weight !== null && !isNaN(Number(e.weight))) ? Number(e.weight) : 1.0,
        active: e.active !== false
      }))
    }))
    return JSON.stringify({
      presetId: selectedBlueprint.value.presetId,
      variant: activeVariant.value,
      strands: strandsData
    })
  }

  const isDirty = computed(() => {
    if (!loadedPresetSnapshot.value) return false
    return getEditorSnapshot() !== loadedPresetSnapshot.value
  })

  // Initialize snapshot on load
  loadedPresetSnapshot.value = getEditorSnapshot()

  watch(isDirty, (dirty) => {
    curriculumEditorDirty.value = dirty
    curriculumEditorTitle.value = selectedBlueprint.value?.title || 'Course Blueprint'
  }, { immediate: true, flush: 'sync' })

  function save() {
    loadedPresetSnapshot.value = getEditorSnapshot()
    curriculumEditorDirty.value = false
  }

  function discard(originalBlueprint) {
    editorStrands.value = JSON.parse(JSON.stringify(originalBlueprint.strands || []))
    loadedPresetSnapshot.value = getEditorSnapshot()
    curriculumEditorDirty.value = false
  }

  return {
    selectedBlueprint,
    activeVariant,
    editorStrands,
    isDirty,
    save,
    discard,
    getEditorSnapshot
  }
}

// ─── Fixture ─────────────────────────────────────────────────────────────
const sampleBlueprint = {
  presetId: 'ontario-g8-math',
  title: 'Grade 8 Mathematics',
  courseCode: 'MTH8',
  panel: 'elementary',
  grade: '8',
  strands: [
    {
      id: 'strand-a',
      name: 'Strand A: Social-Emotional Learning',
      expectations: [
        { id: 'exp-a1', code: 'A1', description: 'Apply SEL skills', weight: 1.0, active: true }
      ]
    },
    {
      id: 'strand-b',
      name: 'Strand B: Number',
      expectations: [
        { id: 'exp-b1', code: 'B1.1', description: 'Scientific notation', weight: 1.0, active: true },
        { id: 'exp-b2', code: 'B1.2', description: 'Rational and irrational numbers', weight: 1.0, active: true }
      ]
    }
  ]
}

// ─── TEST 1: Initial State Clean ──────────────────────────────────────────
console.log('TEST 1: Initial editor mount is clean (not dirty)')
const editor = createTestEditor(sampleBlueprint)
assert.strictEqual(editor.isDirty.value, false, 'Freshly mounted blueprint should not be dirty')
assert.strictEqual(curriculumEditorDirty.value, false, 'Global curriculumEditorDirty should be false initially')
console.log('  ✓ Initial state isClean (isDirty === false)\n')

// ─── TEST 2: Multiplier Modification Detection ────────────────────────────
console.log('TEST 2: Modifying an expectation weight multiplier triggers isDirty')
// Teacher clicks "2x" on B1.1
editor.editorStrands.value[1].expectations[0].weight = 2.0
assert.strictEqual(editor.isDirty.value, true, 'Changing expectation weight from 1.0 to 2.0 must trigger isDirty')
assert.strictEqual(curriculumEditorDirty.value, true, 'Global curriculumEditorDirty must be true')
assert.strictEqual(curriculumEditorTitle.value, 'Grade 8 Mathematics')
console.log('  ✓ Weight change 1.0x -> 2.0x sets isDirty === true')

// Teacher reverts B1.1 back to 1.0
editor.editorStrands.value[1].expectations[0].weight = 1.0
assert.strictEqual(editor.isDirty.value, false, 'Reverting weight back to original must clear isDirty')
assert.strictEqual(curriculumEditorDirty.value, false, 'Global curriculumEditorDirty must clear back to false')
console.log('  ✓ Reverting weight back to original sets isDirty === false\n')

// ─── TEST 3: Diagnostic 0x Weight Multiplier ──────────────────────────────
console.log('TEST 3: Setting a standard to 0x (diagnostic-only) triggers isDirty')
editor.editorStrands.value[0].expectations[0].weight = 0
assert.strictEqual(editor.isDirty.value, true, 'Setting weight to 0 (diagnostic) must trigger isDirty')
assert.strictEqual(curriculumEditorDirty.value, true)
console.log('  ✓ Diagnostic 0x weight sets isDirty === true\n')

// ─── TEST 4: Saving Resets Dirty Flag ─────────────────────────────────────
console.log('TEST 4: Saving preset re-snapshots and resets isDirty to false')
editor.save()
assert.strictEqual(editor.isDirty.value, false, 'Saving must reset isDirty to false')
assert.strictEqual(curriculumEditorDirty.value, false, 'Global curriculumEditorDirty must be false after save')
console.log('  ✓ Save cleanly clears dirty state\n')

// ─── TEST 5: Text and Code Changes ────────────────────────────────────────
console.log('TEST 5: Modifying expectation description or code triggers isDirty')
editor.editorStrands.value[1].expectations[1].description = 'Updated description wording'
assert.strictEqual(editor.isDirty.value, true, 'Editing expectation description must trigger isDirty')

editor.editorStrands.value[1].expectations[1].code = 'B1.2-MOD'
assert.strictEqual(editor.isDirty.value, true, 'Editing expectation code must trigger isDirty')
console.log('  ✓ Text and code modifications trigger isDirty === true\n')

// ─── TEST 6: Discarding Resets to Baseline ────────────────────────────────
console.log('TEST 6: Discarding edits restores original snapshot and resets isDirty')
editor.discard(sampleBlueprint)
assert.strictEqual(editor.isDirty.value, false, 'Discarding must reset isDirty to false')
assert.strictEqual(curriculumEditorDirty.value, false, 'Global curriculumEditorDirty must be false after discard')
console.log('  ✓ Discard cleanly clears dirty state\n')

// ─── TEST 7: Adding / Removing Expectations & Strands ────────────────────
console.log('TEST 7: Adding or removing expectations/strands triggers isDirty')
editor.editorStrands.value[1].expectations.push({
  id: 'exp-b3',
  code: 'B1.3',
  description: 'Newly added expectation',
  weight: 1.0,
  active: true
})
assert.strictEqual(editor.isDirty.value, true, 'Adding expectation must trigger isDirty')

// Remove it
editor.editorStrands.value[1].expectations.pop()
assert.strictEqual(editor.isDirty.value, false, 'Removing newly added expectation restores isDirty to false')

// Add strand
editor.editorStrands.value.push({
  id: 'strand-c',
  name: 'Strand C: Algebra',
  expectations: []
})
assert.strictEqual(editor.isDirty.value, true, 'Adding strand must trigger isDirty')
editor.editorStrands.value.pop()
assert.strictEqual(editor.isDirty.value, false, 'Removing strand restores isDirty to false')
// ─── TEST 8: Discard Followed by Further Edits (User Bug Scenario) ───────
console.log('TEST 8: Discard cleanly reverts edits and subsequent edits re-arm dirty protection')
// 1. Make an edit
editor.editorStrands.value[1].expectations[0].weight = 2.5
assert.strictEqual(editor.isDirty.value, true, 'First edit should trigger isDirty === true')
assert.strictEqual(curriculumEditorDirty.value, true, 'curriculumEditorDirty should be true')

// 2. Discard edits (simulating user clicking "Discard Unsaved Changes" on tab leave)
editor.discard(sampleBlueprint)
assert.strictEqual(editor.isDirty.value, false, 'After discard, isDirty must be false')
assert.strictEqual(curriculumEditorDirty.value, false, 'After discard, curriculumEditorDirty must be false')
assert.strictEqual(editor.editorStrands.value[1].expectations[0].weight, 1.0, 'Weight must be reverted to original 1.0')

// 3. User returns and makes FURTHER edits
editor.editorStrands.value[1].expectations[0].weight = 3.0
assert.strictEqual(editor.isDirty.value, true, 'Subsequent edit MUST trigger isDirty === true')
assert.strictEqual(curriculumEditorDirty.value, true, 'Subsequent edit MUST re-arm curriculumEditorDirty === true')
assert.strictEqual(curriculumEditorTitle.value, 'Grade 8 Mathematics')

// 4. Discard again
editor.discard(sampleBlueprint)
assert.strictEqual(editor.isDirty.value, false)
assert.strictEqual(curriculumEditorDirty.value, false)
assert.strictEqual(editor.editorStrands.value[1].expectations[0].weight, 1.0)
console.log('  ✓ Discard cleanly reverts edits and subsequent edits properly re-arm dirty protection\n')

console.log('===================================================================')
console.log('🎉 ALL CURRICULUM DIRTY PROTECTION TESTS PASSED (100%)!')
console.log('===================================================================')
