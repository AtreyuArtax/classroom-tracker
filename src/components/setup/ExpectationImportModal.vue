<template>
  <div v-if="modelValue" class="eim-overlay" @click.self="onClose">
    <div class="eim-modal">
      <!-- Header -->
      <div class="eim-header">
        <div class="eim-header__title">
          <BookOpen :size="20" class="eim-header__icon" />
          <h3>Import Curriculum Expectations</h3>
        </div>
        <button class="eim-close-btn" @click="onClose" title="Close">
          <X :size="18" />
        </button>
      </div>

      <!-- Tabs Navigation -->
      <div class="eim-tabs">
        <button 
          :class="['eim-tab', activeTab === 'presets' ? 'eim-tab--active' : '']" 
          @click="activeTab = 'presets'"
        >
          Curriculum Presets Library
        </button>
        <button 
          :class="['eim-tab', activeTab === 'paste' ? 'eim-tab--active' : '']" 
          @click="activeTab = 'paste'"
        >
          Bulk Paste / CSV Importer
        </button>
      </div>

      <!-- Body Content -->
      <div class="eim-body">
        <!-- TAB 1: PRESET CURRICULUM LIBRARY -->
        <div v-if="activeTab === 'presets'" class="eim-section">
          <div class="eim-field">
            <label class="eim-label">Select Course Standard</label>
            <select v-model="selectedPresetId" class="eim-select">
              <option :value="null" disabled>Choose a curriculum preset...</option>
              <optgroup label="Secondary (Grades 9–12)">
                <option 
                  v-for="p in panels.secondary" 
                  :key="p.presetId" 
                  :value="p.presetId"
                >
                  {{ p.title }}
                </option>
              </optgroup>
              <optgroup label="Elementary (Grades 1–8)">
                <option 
                  v-for="p in panels.elementary" 
                  :key="p.presetId" 
                  :value="p.presetId"
                >
                  {{ p.title }}
                </option>
              </optgroup>
            </select>
          </div>

          <!-- Preset Details & Mode Selection -->
          <div v-if="selectedPreset" class="eim-preset-preview">
            <div class="eim-preset-summary">
              <strong>{{ selectedPreset.title }}</strong> contains {{ totalPresetExpectations }} expectations across {{ selectedPreset.strands.length }} strands.
            </div>

            <div class="eim-field">
              <label class="eim-label">Granularity (Expectation Level)</label>
              <div class="eim-radio-group eim-radio-group--row">
                <label class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="granularity" value="overall" />
                  <span><strong>Overall Expectations Only</strong> (Streamlined ~10-15 per course)</span>
                </label>
                <label class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="granularity" value="all" />
                  <span><strong>Overall & Specific Expectations</strong> (Full Detail ~40-60 per course)</span>
                </label>
              </div>
            </div>

            <div class="eim-field">
              <label class="eim-label">Import Mode</label>
              <div class="eim-radio-group">
                <label class="eim-radio-label">
                  <input type="radio" v-model="presetImportMode" value="auto-units" />
                  <div>
                    <strong>Auto-Create Units from Curriculum Strands (Recommended)</strong>
                    <p class="eim-hint">Automatically creates units for each strand in the course and populates all expectations under them.</p>
                  </div>
                </label>

                <label class="eim-radio-label">
                  <input type="radio" v-model="presetImportMode" value="existing-unit" />
                  <div>
                    <strong>Import Expectations into a Single Unit</strong>
                    <p class="eim-hint">Select a specific unit and choose which expectations to attach to it.</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Single Unit Selection for Mode B -->
            <div v-if="presetImportMode === 'existing-unit'" class="eim-unit-selection">
              <div class="eim-field">
                <label class="eim-label">Target Unit</label>
                <select v-model="targetUnitChoice" class="eim-select">
                  <option value="new">-- Create New Unit --</option>
                  <option v-for="u in existingUnits" :key="u.unitId" :value="u.unitId">
                    Attach to: {{ u.name }}
                  </option>
                </select>
              </div>

              <div v-if="targetUnitChoice === 'new'" class="eim-field">
                <label class="eim-label">New Unit Name</label>
                <input v-model="newUnitName" type="text" class="eim-input" placeholder="e.g. Ecology Foundations" />
              </div>

              <!-- Checklist of expectations -->
              <div class="eim-checklist-section">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <label class="eim-label">Select Expectations to Import</label>
                  <div class="eim-checklist-actions">
                    <button type="button" class="eim-action-link" @click="selectAllGlobal">Select All</button>
                    <span class="eim-action-separator">|</span>
                    <button type="button" class="eim-action-link" @click="deselectAllGlobal">Deselect All</button>
                  </div>
                </div>
                
                <div class="eim-checklist">
                  <div v-for="strand in selectedPreset.strands" :key="strand.name" class="eim-checklist-strand">
                    <div class="eim-strand-header">
                      <h5 class="eim-strand-name">{{ strand.name }}</h5>
                      <button 
                        type="button" 
                        class="eim-action-link eim-action-link--small" 
                        @click="toggleStrandSelection(strand)"
                      >
                        {{ isStrandFullySelected(strand) ? 'Deselect Strand' : 'Select Strand' }}
                      </button>
                    </div>
                    <label 
                      v-for="exp in getStrandExpectations(strand)" 
                      :key="exp.code" 
                      :class="['eim-checkbox-item', exp.isOverall ? 'eim-checkbox-item--overall' : 'eim-checkbox-item--specific']"
                    >
                      <input 
                        type="checkbox" 
                        :value="exp" 
                        v-model="selectedExpectations" 
                      />
                      <span>
                        <strong :class="{ 'eim-code-overall': exp.isOverall }">{{ exp.code }}:</strong> 
                        {{ exp.description }}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: BULK PASTE / CSV -->
        <div v-if="activeTab === 'paste'" class="eim-section">
          <div class="eim-field">
            <label class="eim-label">Target Unit</label>
            <select v-model="targetUnitChoice" class="eim-select">
              <option value="new">-- Create New Unit --</option>
              <option v-for="u in existingUnits" :key="u.unitId" :value="u.unitId">
                Attach to: {{ u.name }}
              </option>
            </select>
          </div>

          <div v-if="targetUnitChoice === 'new'" class="eim-field">
            <label class="eim-label">New Unit Name</label>
            <input v-model="newUnitName" type="text" class="eim-input" placeholder="e.g. Unit 1: Chemistry" />
          </div>

          <div class="eim-field">
            <label class="eim-label">Paste Expectations (Code | Description)</label>
            <p class="eim-hint">Paste rows copied from Word, PDF, or Excel. Supported formats: <code>A1.1 | Description</code> or <code>A1.1: Description</code> or tab-separated.</p>
            <textarea 
              v-model="pasteRawText" 
              class="eim-textarea" 
              rows="6" 
              placeholder="A1.1 | Apply scientific processes and skills&#10;A1.2 | Apply engineering design processes&#10;B1.1 | Assess impacts of human activities"
            ></textarea>
          </div>

          <!-- Live Preview Table -->
          <div v-if="parsedPasteExpectations.length > 0" class="eim-preview-table-container">
            <label class="eim-label">Parsed Expectations Preview ({{ parsedPasteExpectations.length }} found)</label>
            <table class="eim-preview-table">
              <thead>
                <tr>
                  <th style="width: 80px;">Code</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in parsedPasteExpectations" :key="idx">
                  <td><span class="eim-code-badge">{{ item.code }}</span></td>
                  <td>{{ item.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="eim-footer">
        <button class="eim-btn eim-btn--secondary" @click="onClose">Cancel</button>
        <button 
          class="eim-btn eim-btn--primary" 
          :disabled="!canSubmit" 
          @click="onSubmit"
        >
          Import Expectations
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { BookOpen, X } from 'lucide-vue-next'
import { curriculumPresets, getPresetsByPanel } from '../../data/curriculum/index.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  existingUnits: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'import'])

const activeTab = ref('presets') // 'presets' | 'paste'
const panels = getPresetsByPanel()

// Presets state
const selectedPresetId = ref(null)
const presetImportMode = ref('auto-units') // 'auto-units' | 'existing-unit'
const granularity = ref('overall') // 'overall' | 'all'
const selectedExpectations = ref([])

// Shared unit state
const targetUnitChoice = ref('new')
const newUnitName = ref('')

// Paste state
const pasteRawText = ref('')

const selectedPreset = computed(() => {
  if (!selectedPresetId.value) return null
  return curriculumPresets.find(p => p.presetId === selectedPresetId.value)
})

function getStrandExpectations(strand, currGranularity = granularity.value) {
  if (!strand || !strand.overalls) return []
  const list = []
  strand.overalls.forEach(ov => {
    list.push({ code: ov.code, description: ov.description, isOverall: true })
    if (currGranularity === 'all' && ov.specifics) {
      ov.specifics.forEach(sp => {
        list.push({ code: sp.code, description: sp.description, isOverall: false })
      })
    }
  })
  return list
}

const totalPresetExpectations = computed(() => {
  if (!selectedPreset.value) return 0
  return selectedPreset.value.strands.reduce((acc, s) => acc + getStrandExpectations(s).length, 0)
})

watch(selectedPreset, () => {
  deselectAllGlobal()
})

watch(granularity, () => {
  deselectAllGlobal()
})

function selectAllGlobal() {
  if (!selectedPreset.value) return
  const all = []
  selectedPreset.value.strands.forEach(s => {
    getStrandExpectations(s).forEach(e => all.push(e))
  })
  selectedExpectations.value = all
}

function deselectAllGlobal() {
  selectedExpectations.value = []
}

function isStrandFullySelected(strand) {
  const strandExps = getStrandExpectations(strand)
  if (!strandExps.length) return false
  return strandExps.every(e => 
    selectedExpectations.value.some(sel => sel.code === e.code)
  )
}

function toggleStrandSelection(strand) {
  const strandExps = getStrandExpectations(strand)
  const isSelected = isStrandFullySelected(strand)
  if (isSelected) {
    // Remove all expectations of this strand
    selectedExpectations.value = selectedExpectations.value.filter(sel => 
      !strandExps.some(e => e.code === sel.code)
    )
  } else {
    // Add missing expectations of this strand
    const current = [...selectedExpectations.value]
    strandExps.forEach(e => {
      if (!current.some(sel => sel.code === e.code)) {
        current.push(e)
      }
    })
    selectedExpectations.value = current
  }
}

// Parsed text logic
const parsedPasteExpectations = computed(() => {
  if (!pasteRawText.value.trim()) return []
  const lines = pasteRawText.value.split('\n')
  const results = []

  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return

    // Pattern 1: Code | Description or Code : Description or Code \t Description
    const matchDelim = trimmed.match(/^([A-Za-z0-9\.-]+)[\t\|:]\s*(.+)$/)
    if (matchDelim) {
      results.push({ code: matchDelim[1].trim(), description: matchDelim[2].trim() })
      return
    }

    // Pattern 2: Code space Description (e.g. "A1.1 Apply scientific processes...")
    const matchSpace = trimmed.match(/^([A-Za-z0-9\.-]{2,8})\s+(.+)$/)
    if (matchSpace) {
      results.push({ code: matchSpace[1].trim(), description: matchSpace[2].trim() })
      return
    }

    // Fallback: entire line as description with auto code
    results.push({ code: `EXP-${results.length + 1}`, description: trimmed })
  })

  return results
})

const canSubmit = computed(() => {
  if (activeTab.value === 'presets') {
    if (!selectedPreset.value) return false
    if (presetImportMode.value === 'auto-units') return true
    if (presetImportMode.value === 'existing-unit') {
      if (selectedExpectations.value.length === 0) return false
      if (targetUnitChoice.value === 'new' && !newUnitName.value.trim()) return false
      return true
    }
  }

  if (activeTab.value === 'paste') {
    if (parsedPasteExpectations.value.length === 0) return false
    if (targetUnitChoice.value === 'new' && !newUnitName.value.trim()) return false
    return true
  }

  return false
})

function onClose() {
  emit('update:modelValue', false)
}

function onSubmit() {
  if (!canSubmit.value) return

  if (activeTab.value === 'presets') {
    if (presetImportMode.value === 'auto-units') {
      emit('import', {
        mode: 'auto-units',
        preset: selectedPreset.value,
        granularity: granularity.value
      })
    } else {
      emit('import', {
        mode: 'attach-expectations',
        targetUnitChoice: targetUnitChoice.value,
        newUnitName: newUnitName.value.trim(),
        expectations: selectedExpectations.value
      })
    }
  } else if (activeTab.value === 'paste') {
    emit('import', {
      mode: 'attach-expectations',
      targetUnitChoice: targetUnitChoice.value,
      newUnitName: newUnitName.value.trim(),
      expectations: parsedPasteExpectations.value
    })
  }

  onClose()
}
</script>

<style scoped>
.eim-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.eim-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 95vw;
  max-width: 900px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.eim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.eim-header__title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.eim-header__icon {
  color: var(--primary);
}

.eim-header__title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.eim-close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.eim-close-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.eim-tabs {
  display: flex;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.eim-tab {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.eim-tab:hover {
  color: var(--text);
}

.eim-tab--active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  background: var(--surface);
}

.eim-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eim-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eim-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
}

.eim-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}

.eim-select, .eim-input, .eim-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.85rem;
  box-sizing: border-box;
}

.eim-textarea {
  font-family: inherit;
  resize: vertical;
}

.eim-preset-preview {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eim-preset-summary {
  font-size: 0.85rem;
  color: var(--text);
  background: var(--bg-hover);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--primary);
}

.eim-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.eim-radio-label {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}

.eim-radio-label:hover {
  background: var(--bg-hover);
}

.eim-checklist-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.eim-radio-group--row {
  flex-direction: row;
  gap: 12px;
}

.eim-radio-label--compact {
  flex: 1;
  padding: 8px 12px;
  font-size: 0.8rem;
}

.eim-checklist {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-secondary);
}

.eim-checkbox-item--overall {
  background: var(--bg-hover);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
}

.eim-checkbox-item--specific {
  padding-left: 24px;
}

.eim-code-overall {
  color: var(--primary);
  font-weight: 800;
}

.eim-strand-name {
  margin: 0 0 6px 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.eim-checkbox-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.8rem;
  color: var(--text);
  cursor: pointer;
}

.eim-preview-table-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

.eim-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  border: 1px solid var(--border);
}

.eim-preview-table th, .eim-preview-table td {
  padding: 6px 10px;
  border: 1px solid var(--border);
  text-align: left;
}

.eim-preview-table th {
  background: var(--bg-secondary);
  font-weight: 700;
  color: var(--text-secondary);
}

.eim-code-badge {
  font-weight: 700;
  background: var(--bg-hover);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.eim-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.eim-btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.eim-btn--secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.eim-btn--secondary:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.eim-btn--primary {
  background: var(--primary);
  color: #fff;
}

.eim-btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.eim-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.eim-checklist-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.eim-action-link {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  transition: opacity 0.15s ease;
}

.eim-action-link:hover {
  opacity: 0.8;
}

.eim-action-link--small {
  font-size: 0.7rem;
  text-decoration: none;
}

.eim-action-separator {
  font-size: 0.75rem;
  color: var(--border);
}

.eim-strand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}
</style>
