<template>
  <div v-if="modelValue" class="eim-overlay" @click.self="onClose">
    <div class="eim-modal">
      <!-- Header -->
      <div class="eim-header">
        <div class="eim-header__title">
          <BookOpen :size="20" class="eim-header__icon" />
          <h3>Import Expectations into {{ targetSubjectName || 'Subject' }}</h3>
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
          
          <!-- Filter Controls Stack -->
          <div class="eim-filter-stack">
            <!-- Row 1: Panel Segmented Control & Search -->
            <div class="eim-filter-toolbar">
              <div class="eim-segmented-control">
                <button 
                  type="button"
                  :class="['eim-seg-btn', panelFilter === 'elementary' ? 'eim-seg-btn--active' : '']"
                  @click="setPanelFilter('elementary')"
                >
                  Elementary (Grades 1–8)
                </button>
                <button 
                  type="button"
                  :class="['eim-seg-btn', panelFilter === 'secondary' ? 'eim-seg-btn--active' : '']"
                  @click="setPanelFilter('secondary')"
                >
                  Secondary (Grades 9–12)
                </button>
                <button 
                  type="button"
                  :class="['eim-seg-btn', panelFilter === 'all' ? 'eim-seg-btn--active' : '']"
                  @click="setPanelFilter('all')"
                >
                  All Presets
                </button>
              </div>

              <div class="eim-search-box">
                <Search :size="14" class="eim-search-icon" />
                <input 
                  v-model="searchQuery" 
                  type="text" 
                  class="eim-search-input" 
                  placeholder="Search preset, subject, code..." 
                />
                <button v-if="searchQuery" type="button" class="eim-search-clear" @click="searchQuery = ''" title="Clear search">
                  <X :size="12" />
                </button>
              </div>
            </div>

            <!-- Row 2: Grade Level Pills -->
            <div v-if="availableGrades.length > 0" class="eim-pills-row">
              <span class="eim-pills-label">Grade:</span>
              <div class="eim-pills-list">
                <button 
                  type="button"
                  :class="['eim-pill', gradeFilter === 'all' ? 'eim-pill--active' : '']"
                  @click="gradeFilter = 'all'"
                >
                  All Grades
                </button>
                <button 
                  v-for="g in availableGrades" 
                  :key="g"
                  type="button"
                  :class="['eim-pill', gradeFilter === g ? 'eim-pill--active' : '']"
                  @click="gradeFilter = g"
                >
                  {{ g }}
                </button>
              </div>
            </div>

            <!-- Row 3: Subject Category Pills -->
            <div class="eim-pills-row">
              <span class="eim-pills-label">Subject:</span>
              <div class="eim-pills-list">
                <button 
                  v-for="cat in availableSubjectCategories"
                  :key="cat.id"
                  type="button"
                  :class="['eim-pill', subjectFilter === cat.id ? 'eim-pill--active' : '']"
                  @click="subjectFilter = cat.id"
                >
                  {{ cat.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Selector Header & View Toggle -->
          <div class="eim-selector-header">
            <div class="eim-selector-count">
              <strong>{{ filteredPresets.length }}</strong> {{ filteredPresets.length === 1 ? 'preset' : 'presets' }} available
              <span v-if="gradeFilter !== 'all' || subjectFilter !== 'all' || searchQuery" class="eim-active-filter-badge">
                (filtered)
              </span>
            </div>
            <button 
              v-if="gradeFilter !== 'all' || subjectFilter !== 'all' || searchQuery" 
              type="button" 
              class="eim-action-link"
              @click="resetAllFilters"
            >
              Reset Filters
            </button>
          </div>

          <!-- Preset Cards Grid Selector -->
          <div v-if="filteredPresets.length > 0" class="eim-preset-grid">
            <div 
              v-for="p in filteredPresets" 
              :key="p.presetId"
              :class="['eim-preset-card', selectedPresetId === p.presetId ? 'eim-preset-card--selected' : '']"
              @click="selectedPresetId = p.presetId"
            >
              <div class="eim-preset-card__header">
                <div class="eim-preset-card__badges">
                  <span class="eim-preset-badge eim-preset-badge--grade">{{ p.grade }}</span>
                  <span v-if="p.subjectCode" class="eim-preset-badge eim-preset-badge--code">{{ p.subjectCode }}</span>
                  <span v-if="p.isSuccessCriteria" class="eim-preset-badge eim-preset-badge--sc">Success Criteria</span>
                </div>
                <span v-if="selectedPresetId === p.presetId" class="eim-preset-card__check">
                  <Check :size="14" /> Selected
                </span>
              </div>
              <h4 class="eim-preset-card__title">{{ p.title }}</h4>
              <div class="eim-preset-card__footer">
                <span>{{ p.strands ? p.strands.length : 0 }} Strands</span>
                <span>•</span>
                <span>{{ countPresetExpectations(p) }} Expectations</span>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="eim-presets-empty">
            <Filter :size="32" class="eim-empty-icon" />
            <p>No curriculum presets match your current filter criteria.</p>
            <button type="button" class="eim-btn eim-btn--secondary" @click="resetAllFilters">
              Clear All Filters
            </button>
          </div>

          <!-- Preset Details & Mode Selection -->
          <div v-if="selectedPreset" class="eim-preset-preview">
            <div class="eim-preset-summary">
              <strong>{{ (effectivePresetToUse || selectedPreset).title }}</strong> contains {{ totalPresetExpectations }} expectations across {{ (effectivePresetToUse || selectedPreset).strands ? (effectivePresetToUse || selectedPreset).strands.length : 0 }} strands.
            </div>

            <div v-if="granularity === 'success_criteria'" class="eim-preset-info-banner" style="background: rgba(147, 51, 234, 0.08); border-color: rgba(147, 51, 234, 0.25); color: #9333ea;">
              <Zap :size="16" class="eim-info-icon" />
              <span v-if="effectivePresetToUse?.isSuccessCriteria">Loaded Success Criteria ("I Can..." statements) for {{ effectivePresetToUse.subjectCode || effectivePresetToUse.title }}.</span>
              <span v-else>Success Criteria preset file not yet available for this course; using standard expectations.</span>
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
                  <span><strong>Specific Expectations Only</strong> (Full Detail ~40-60 per course)</span>
                </label>
                <label v-if="hasSuccessCriteriaAvailable" class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="granularity" value="success_criteria" />
                  <span><strong>Success Criteria ("I Can..." Statements)</strong> (Student-friendly outcomes)</span>
                </label>
              </div>
            </div>

            <div class="eim-field">
              <label class="eim-label">Import Action</label>
              <div class="eim-radio-group eim-radio-group--row">
                <label class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="importBehavior" value="replace" />
                  <span><strong>Replace existing expectations</strong> (Resets previous list)</span>
                </label>
                <label class="eim-radio-label eim-radio-label--compact">
                  <input type="radio" v-model="importBehavior" value="append" />
                  <span><strong>Append to existing expectations</strong></span>
                </label>
              </div>
            </div>

            <!-- ELEMENTARY: Auto-organizes into strands -->
            <template v-if="classType === 'elementary'">
              <div class="eim-preset-info-banner">
                <Zap :size="16" class="eim-info-icon" />
                <span>Importing this preset will automatically organize expectations into their respective curriculum strands/units.</span>
              </div>
            </template>

            <!-- SECONDARY: Unit picker + expectation checklist -->
            <template v-else>
              <div class="eim-secondary-import">
                <div class="eim-field">
                  <label class="eim-label">Target Unit</label>
                  <select v-model="targetUnitChoice" class="eim-select">
                    <option value="auto">-- Auto-Create Units from Preset Strands --</option>
                    <option value="new">-- Create Single New Unit --</option>
                    <option v-for="u in existingUnits" :key="u.unitId" :value="u.unitId">
                      Attach to: {{ u.name }}
                    </option>
                  </select>
                </div>

                <div v-if="targetUnitChoice === 'auto'" class="eim-preset-info-banner" style="margin-top: 10px;">
                  <Zap :size="16" class="eim-info-icon" />
                  <span>Importing this preset will automatically create units based on the curriculum strands and populate them with expectations.</span>
                </div>

                <div v-if="targetUnitChoice === 'new'" class="eim-field">
                  <label class="eim-label">New Unit Name</label>
                  <input v-model="newUnitName" type="text" class="eim-input" placeholder="e.g. Space & Earth Systems" />
                </div>

                <!-- Checklist of expectations -->
                <div v-if="targetUnitChoice !== 'auto'" class="eim-checklist-section">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <label class="eim-label">Select Expectations to Import</label>
                    <div class="eim-checklist-actions">
                      <button type="button" class="eim-action-link" @click="selectAllGlobal">Select All</button>
                      <span class="eim-action-separator">|</span>
                      <button type="button" class="eim-action-link" @click="deselectAllGlobal">Deselect All</button>
                    </div>
                  </div>
                  
                  <div class="eim-checklist">
                    <div v-for="strand in (effectivePresetToUse?.strands || selectedPreset.strands)" :key="strand.name" class="eim-checklist-strand">
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
            </template>
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
      <div class="eim-footer" style="display: flex; align-items: center; justify-content: space-between;">
        <button 
          v-if="existingCount > 0"
          type="button" 
          class="eim-btn-clear" 
          style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.825rem; padding: 6px 12px; border-radius: 6px; border: 1px solid #fca5a5; background: #fef2f2; color: #dc2626; cursor: pointer; font-weight: 600;"
          @click="emit('clear')"
        >
          <Trash2 :size="14" /> Clear Current Expectations ({{ existingCount }})
        </button>
        <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { BookOpen, X, Zap, Search, Check, Filter, Trash2 } from 'lucide-vue-next'
import { curriculumPresets } from '../../data/curriculum/index.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  existingUnits: { type: Array, default: () => [] },
  existingCount: { type: Number, default: 0 },
  targetSubjectId: { type: String, default: null },
  targetSubjectName: { type: String, default: '' },
  initialPresetId: { type: String, default: null },
  classType: { type: String, default: 'secondary' } // 'elementary' | 'secondary'
})

const emit = defineEmits(['update:modelValue', 'import', 'clear'])

const activeTab = ref('presets') // 'presets' | 'paste'

// Filter toolbar state
const panelFilter = ref(props.classType || 'secondary') // 'elementary' | 'secondary' | 'all'
const gradeFilter = ref('all')
const subjectFilter = ref('all')
const searchQuery = ref('')

// Presets state
const selectedPresetId = ref(null)
const granularity = ref('overall') // 'overall' | 'all'
const importBehavior = ref('replace') // 'replace' | 'append'
const selectedExpectations = ref([])

// Shared unit state
const targetUnitChoice = ref('auto')
const newUnitName = ref('')

// Paste state
const pasteRawText = ref('')

function setPanelFilter(panel) {
  panelFilter.value = panel
  gradeFilter.value = 'all'
}

function resetAllFilters() {
  gradeFilter.value = 'all'
  subjectFilter.value = 'all'
  searchQuery.value = ''
}

watch(() => props.classType, (newVal) => {
  if (newVal) {
    panelFilter.value = newVal
  }
}, { immediate: true })

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    panelFilter.value = props.classType || 'secondary'
    if (props.initialPresetId) {
      selectedPresetId.value = props.initialPresetId
    }
  }
}, { immediate: true })

// Compute dynamic list of available grades based on panel filter
const availableGrades = computed(() => {
  let list = curriculumPresets
  if (panelFilter.value && panelFilter.value !== 'all') {
    list = list.filter(p => p.panel === panelFilter.value)
  }
  const gradesOrder = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
  const gradesSet = new Set(list.map(p => p.grade).filter(Boolean))

  return Array.from(gradesSet).sort((a, b) => {
    const idxA = gradesOrder.indexOf(a)
    const idxB = gradesOrder.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })
})

const availableSubjectCategories = computed(() => [
  { id: 'all', label: 'All Subjects' },
  { id: 'math', label: 'Math' },
  { id: 'sci', label: 'Science' },
  { id: 'lang', label: 'Language' },
  { id: 'french', label: 'French' },
  { id: 'arts', label: 'Arts' },
  { id: 'hpe', label: 'Health & PE' },
  { id: 'soc', label: 'History / Geo' }
])

const filteredPresets = computed(() => {
  let list = curriculumPresets

  // 1. Panel filter
  if (panelFilter.value && panelFilter.value !== 'all') {
    list = list.filter(p => p.panel === panelFilter.value)
  }

  // 2. Grade filter
  if (gradeFilter.value && gradeFilter.value !== 'all') {
    list = list.filter(p => (p.grade || '').toLowerCase() === gradeFilter.value.toLowerCase())
  }

  // 3. Subject filter (Department level)
  if (subjectFilter.value && subjectFilter.value !== 'all') {
    const s = subjectFilter.value.toLowerCase()
    list = list.filter(p => {
      const dept = (p.department || '').toLowerCase()
      const title = (p.title || '').toLowerCase()
      const code = (p.subjectCode || '').toLowerCase()
      const pId = (p.presetId || '').toLowerCase()

      if (s === 'math') {
        return dept === 'math' || title.includes('math') || title.includes('algebra') || title.includes('calculus') || title.includes('functions') || code.includes('mat') || code.startsWith('m') || pId.includes('math') || pId.includes('mth') || pId.includes('mpm') || pId.includes('mfm')
      }
      if (s === 'sci') {
        return dept === 'science' || title.includes('science') || title.includes('chem') || title.includes('physics') || title.includes('bio') || title.includes('earth') || title.includes('environment') || code.includes('sci') || code.startsWith('s') || pId.includes('sci') || pId.includes('sch') || pId.includes('sph') || pId.includes('sbi') || pId.includes('snc') || pId.includes('ses') || pId.includes('svn')
      }
      if (s === 'lang') {
        return dept === 'english' || dept === 'language' || title.includes('language') || title.includes('english') || code.includes('lang') || code.startsWith('eng') || pId.includes('lang')
      }
      if (s === 'french') {
        return dept === 'french' || title.includes('french') || code.includes('fsl') || code.startsWith('f') || code.includes('fi') || pId.includes('french')
      }
      if (s === 'arts') {
        return dept === 'arts' || title.includes('art') || title.includes('music') || title.includes('drama') || title.includes('dance') || code.includes('art') || code.startsWith('a') || pId.includes('art')
      }
      if (s === 'hpe') {
        return dept === 'hpe' || title.includes('health') || title.includes('physical') || title.includes('kinesiology') || code.includes('hpe') || code.startsWith('p') || pId.includes('hpe')
      }
      if (s === 'soc') {
        return dept === 'social' || title.includes('history') || title.includes('geography') || title.includes('civic') || title.includes('social') || code.includes('hist') || code.includes('geo') || code.startsWith('c') || code.startsWith('h')
      }
      return true
    })
  }

  // 4. Text search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p => 
      (p.title || '').toLowerCase().includes(q) ||
      (p.presetId || '').toLowerCase().includes(q) ||
      (p.grade || '').toLowerCase().includes(q) ||
      (p.subjectCode || '').toLowerCase().includes(q)
    )
  }

  // Exclude standalone success criteria entries from preset cards list
  list = list.filter(p => !p.isSuccessCriteria)

  return list
})

function countPresetExpectations(preset) {
  if (!preset || !preset.strands) return 0
  return preset.strands.reduce((acc, s) => {
    if (!s.overalls) return acc
    return acc + s.overalls.reduce((a, ov) => a + 1 + (ov.specifics ? ov.specifics.length : 0), 0)
  }, 0)
}

const selectedPreset = computed(() => {
  if (!selectedPresetId.value) return null
  return curriculumPresets.find(p => p.presetId === selectedPresetId.value)
})

const hasSuccessCriteriaAvailable = computed(() => {
  if (!selectedPreset.value) return false
  if (selectedPreset.value.isSuccessCriteria) return true
  const sCode = (selectedPreset.value.subjectCode || '').toLowerCase()
  const pId = (selectedPreset.value.presetId || '').toLowerCase()
  return curriculumPresets.some(p => p.isSuccessCriteria && (
    (sCode && p.subjectCode && p.subjectCode.toLowerCase() === sCode) ||
    (pId && p.presetId.toLowerCase().startsWith(pId))
  ))
})

watch(hasSuccessCriteriaAvailable, (available) => {
  if (!available && granularity.value === 'success_criteria') {
    granularity.value = 'all'
  }
})

const effectivePresetToUse = computed(() => {
  if (!selectedPreset.value) return null
  if (granularity.value === 'success_criteria') {
    if (selectedPreset.value.isSuccessCriteria) return selectedPreset.value
    const sCode = (selectedPreset.value.subjectCode || '').toLowerCase()
    const pId = (selectedPreset.value.presetId || '').toLowerCase()
    const scMatch = curriculumPresets.find(p => p.isSuccessCriteria && (
      (sCode && p.subjectCode && p.subjectCode.toLowerCase() === sCode) ||
      (pId && p.presetId.toLowerCase().startsWith(pId))
    ))
    if (scMatch) return scMatch
  }
  return selectedPreset.value
})

function getStrandExpectations(strand, currGranularity = granularity.value) {
  if (!strand || !strand.overalls) return []
  const list = []
  strand.overalls.forEach(ov => {
    if (currGranularity === 'overall') {
      list.push({ code: ov.code, description: ov.description, isOverall: true })
    } else if ((currGranularity === 'all' || currGranularity === 'success_criteria') && ov.specifics) {
      ov.specifics.forEach(sp => {
        list.push({ code: sp.code, description: sp.description, isOverall: false })
      })
    }
  })
  return list
}

const totalPresetExpectations = computed(() => {
  const p = effectivePresetToUse.value
  if (!p || !p.strands) return 0
  return p.strands.reduce((acc, s) => acc + getStrandExpectations(s).length, 0)
})

watch(selectedPreset, () => {
  deselectAllGlobal()
})

watch(granularity, () => {
  deselectAllGlobal()
})

function selectAllGlobal() {
  const p = effectivePresetToUse.value
  if (!p || !p.strands) return
  const all = []
  p.strands.forEach(s => {
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
    selectedExpectations.value = selectedExpectations.value.filter(sel => 
      !strandExps.some(e => e.code === sel.code)
    )
  } else {
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

    const matchDelim = trimmed.match(/^([A-Za-z0-9\.-]+)[\t\|:]\s*(.+)$/)
    if (matchDelim) {
      results.push({ code: matchDelim[1].trim(), description: matchDelim[2].trim() })
      return
    }

    const matchSpace = trimmed.match(/^([A-Za-z0-9\.-]{2,8})\s+(.+)$/)
    if (matchSpace) {
      results.push({ code: matchSpace[1].trim(), description: matchSpace[2].trim() })
      return
    }

    results.push({ code: `EXP-${results.length + 1}`, description: trimmed })
  })

  return results
})

const canSubmit = computed(() => {
  if (activeTab.value === 'presets') {
    if (!selectedPreset.value) return false
    if (props.classType === 'elementary' || targetUnitChoice.value === 'auto') return true
    if (selectedExpectations.value.length === 0) return false
    if (targetUnitChoice.value === 'new' && !newUnitName.value.trim()) return false
    return true
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
    if (props.classType === 'elementary' || targetUnitChoice.value === 'auto') {
      emit('import', {
        mode: 'auto-units',
        preset: effectivePresetToUse.value || selectedPreset.value,
        granularity: granularity.value,
        importBehavior: importBehavior.value,
        targetSubjectId: props.targetSubjectId
      })
    } else {
      emit('import', {
        mode: 'attach-expectations',
        targetUnitChoice: targetUnitChoice.value,
        newUnitName: newUnitName.value.trim(),
        expectations: selectedExpectations.value,
        importBehavior: importBehavior.value,
        targetSubjectId: props.targetSubjectId
      })
    }
  } else if (activeTab.value === 'paste') {
    emit('import', {
      mode: 'attach-expectations',
      targetUnitChoice: targetUnitChoice.value,
      newUnitName: newUnitName.value.trim(),
      expectations: parsedPasteExpectations.value,
      importBehavior: importBehavior.value
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

.eim-preset-info-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.08);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.eim-info-icon {
  flex-shrink: 0;
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

.eim-filter-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.eim-filter-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (min-width: 640px) {
  .eim-filter-toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.eim-segmented-control {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 2px;
}

.eim-seg-btn {
  padding: 5px 12px;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.eim-seg-btn:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.eim-seg-btn--active {
  background: var(--primary);
  color: #ffffff;
  font-weight: 700;
}

.eim-seg-btn--active:hover {
  background: var(--primary);
  opacity: 0.95;
}

.eim-search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 320px;
}

.eim-search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  pointer-events: none;
}

.eim-search-input {
  width: 100%;
  padding: 6px 30px 6px 30px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font-size: 0.8rem;
  box-sizing: border-box;
}

.eim-search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.eim-search-clear {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.eim-search-clear:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.eim-pills-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
}

.eim-pills-label {
  font-weight: 700;
  color: var(--text-secondary);
  width: 55px;
  flex-shrink: 0;
}

.eim-pills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.eim-pill {
  padding: 3px 9px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-pill:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.eim-pill--active {
  background: rgba(59, 130, 246, 0.12);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}

.eim-selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.eim-selector-count {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.eim-active-filter-badge {
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 600;
  margin-left: 4px;
}

.eim-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 4px;
  margin-bottom: 14px;
}

.eim-preset-card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eim-preset-card:hover {
  border-color: var(--primary);
  background: var(--bg-hover);

}

.eim-preset-card--selected {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.05);
  box-shadow: 0 0 0 1px var(--primary);
}

.eim-preset-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eim-preset-card__badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.eim-preset-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.eim-preset-badge--grade {
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary);
}

.eim-preset-badge--code {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.eim-preset-badge--sc {
  background: rgba(147, 51, 234, 0.12);
  color: #9333ea;
  border: 1px solid rgba(147, 51, 234, 0.3);
}

.eim-preset-card__check {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.eim-preset-card__title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.25;
}

.eim-preset-card__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: auto;
}

.eim-presets-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  gap: 10px;
  margin-bottom: 14px;
}

.eim-empty-icon {
  color: var(--text-secondary);
  opacity: 0.5;
}

.eim-presets-empty p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}
</style>
