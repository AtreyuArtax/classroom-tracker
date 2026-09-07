<template>
  <div v-if="modelValue" class="eim-overlay" @click.self="onClose">
    <div class="eim-modal">
      <!-- Header -->
      <div class="eim-header">
        <div class="eim-header__title">
          <BookOpen :size="20" class="eim-header__icon" />
          <h3>Import Expectations into {{ targetSubjectName || 'Subject' }}</h3>
        </div>
        <div class="eim-header__actions">
          <button 
            type="button" 
            class="eim-header__library-link" 
            @click="goToCurriculumLibrary"
            title="Open Master Curriculum Library to import whole courses or generate standards with AI"
          >
            <Sparkles :size="14" />
            <span>Master Curriculum Library</span>
            <ExternalLink :size="12" />
          </button>
          <button class="eim-close-btn" @click="onClose" title="Close">
            <X :size="18" />
          </button>
        </div>
      </div>

      <!-- Body Content -->
      <div class="eim-body">
        <div class="eim-section">
          
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
              @click="selectBlueprint(p)"
            >
              <div class="eim-preset-card__header">
                <div class="eim-preset-card__badges">
                  <span class="eim-preset-badge eim-preset-badge--grade">{{ p.grade }}</span>
                  <span v-if="p.courseCode || p.subjectCode" class="eim-preset-badge eim-preset-badge--code">{{ p.courseCode || p.subjectCode }}</span>
                  <span v-if="isAnyVariantCustomized(p)" class="eim-preset-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 700;">★ Master Library</span>
                </div>
                <span v-if="selectedPresetId === p.presetId" class="eim-preset-card__check">
                  <Check :size="14" /> Selected
                </span>
              </div>
              <h4 class="eim-preset-card__title">{{ p.title }}</h4>

              <!-- Quick Variant Pills -->
              <div v-if="p.variants" class="eim-blueprint-variants">
                <button 
                  type="button" 
                  class="eim-variant-pill"
                  :class="{ 'eim-variant-pill--active': selectedPresetId === p.presetId && granularity === 'all' }"
                  @click.stop="selectBlueprintVariant(p, 'all')"
                  title="Specific Expectations"
                >
                  Specific ({{ p.variants.specific.count }})
                </button>
                <button 
                  type="button" 
                  class="eim-variant-pill"
                  :class="{ 'eim-variant-pill--active': selectedPresetId === p.presetId && granularity === 'overall' }"
                  @click.stop="selectBlueprintVariant(p, 'overall')"
                  title="Overall Expectations Only"
                >
                  Overall ({{ p.variants.overall.count }})
                </button>
                <button 
                  v-if="p.variants.success_criteria.available"
                  type="button" 
                  class="eim-variant-pill eim-variant-pill--sc"
                  :class="{ 'eim-variant-pill--active': selectedPresetId === p.presetId && granularity === 'success_criteria' }"
                  @click.stop="selectBlueprintVariant(p, 'success_criteria')"
                  title="Success Criteria ('I Can...' Statements)"
                >
                  Success Criteria ({{ p.variants.success_criteria.count }})
                </button>
              </div>

              <div class="eim-preset-card__footer">
                <span>{{ p.strandsCount || (p.strands ? p.strands.length : 0) }} Strands</span>
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

          <!-- Master Curriculum Library Link Banner -->
          <div class="eim-library-shortcut-card">
            <div class="eim-library-shortcut-info">
              <div class="eim-library-shortcut-title">
                <Sparkles :size="15" class="eim-library-shortcut-sparkle" />
                <span>Looking to import a syllabus (.json / .csv) or create a custom course?</span>
              </div>
              <p class="eim-library-shortcut-desc">
                Full-course imports, starter boilerplate templates, and AI prompts live in the <strong>Master Curriculum Library</strong>.
              </p>
            </div>
            <button 
              type="button" 
              class="eim-library-shortcut-btn"
              @click="goToCurriculumLibrary"
            >
              Open Curriculum Library &rarr;
            </button>
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
import { 
  BookOpen, X, Zap, Search, Check, Filter, Trash2, 
  Sparkles, ExternalLink
} from 'lucide-vue-next'
import { 
  useCurriculumLibrary, 
  getCourseBlueprints, 
  getMasterPreset, 
  deriveOverallPreset, 
  getSuccessCriteriaPreset, 
  getMergedCurriculumPresets 
} from '../../composables/useCurriculumLibrary.js'
import { cleanExpectationText } from '../../utils/textUtils.js'

const { initCurriculumLibrary } = useCurriculumLibrary()
initCurriculumLibrary()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  existingUnits: { type: Array, default: () => [] },
  existingCount: { type: Number, default: 0 },
  targetSubjectId: { type: String, default: null },
  targetSubjectName: { type: String, default: '' },
  initialPresetId: { type: String, default: null },
  classType: { type: String, default: 'secondary' } // 'elementary' | 'secondary'
})

const emit = defineEmits(['update:modelValue', 'import', 'clear', 'open-curriculum-library'])

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
  let list = getCourseBlueprints(panelFilter.value || 'all')
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
  let list = getCourseBlueprints(panelFilter.value || 'all')

  // 1. Grade filter
  if (gradeFilter.value && gradeFilter.value !== 'all') {
    const gNorm = String(gradeFilter.value).replace(/[^0-9]/g, '')
    list = list.filter(b => String(b.grade || '').replace(/[^0-9]/g, '') === gNorm)
  }

  // 2. Subject filter (Department level)
  if (subjectFilter.value && subjectFilter.value !== 'all') {
    const s = subjectFilter.value.toLowerCase()
    list = list.filter(b => {
      const dept = (b.department || '').toLowerCase()
      const title = (b.title || '').toLowerCase()
      const code = (b.courseCode || b.subjectCode || '').toLowerCase()
      const pId = (b.presetId || '').toLowerCase()

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

  // 3. Text search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(b => 
      (b.title || '').toLowerCase().includes(q) ||
      (b.presetId || '').toLowerCase().includes(q) ||
      (b.grade || '').toLowerCase().includes(q) ||
      (b.courseCode || b.subjectCode || '').toLowerCase().includes(q)
    )
  }

  return list
})

function selectBlueprint(b) {
  selectedPresetId.value = b.presetId
}

function selectBlueprintVariant(b, varKey) {
  selectedPresetId.value = b.presetId
  granularity.value = varKey
}

function isAnyVariantCustomized(b) {
  if (!b || !b.variants) return false
  return b.variants.specific?.isCustomized || b.variants.overall?.isCustomized || b.variants.success_criteria?.isCustomized
}

function countPresetExpectations(b) {
  if (!b) return 0
  if (granularity.value === 'overall') return b.variants?.overall?.count || 0
  if (granularity.value === 'success_criteria') return b.variants?.success_criteria?.count || 0
  return b.variants?.specific?.count || 0
}

const selectedBlueprint = computed(() => {
  if (!selectedPresetId.value) return null
  const allB = getCourseBlueprints('all')
  const baseId = selectedPresetId.value.replace(/-success-criteria$/, '').replace(/-overall$/, '')
  return allB.find(b => b.presetId === baseId || b.presetId === selectedPresetId.value)
})

const selectedPreset = computed(() => {
  return selectedBlueprint.value?.basePreset || null
})

const hasSuccessCriteriaAvailable = computed(() => {
  return !!selectedBlueprint.value?.variants?.success_criteria?.available
})

watch(hasSuccessCriteriaAvailable, (available) => {
  if (!available && granularity.value === 'success_criteria') {
    granularity.value = 'all'
  }
})

const effectivePresetToUse = computed(() => {
  if (!selectedBlueprint.value) return null
  const b = selectedBlueprint.value
  if (granularity.value === 'overall') {
    return getMasterPreset(b.variants.overall.presetId) || deriveOverallPreset(b.basePreset)
  }
  if (granularity.value === 'success_criteria') {
    return getSuccessCriteriaPreset(b.basePreset) || b.basePreset
  }
  return getMasterPreset(b.variants.specific.presetId) || b.basePreset
})

function getStrandExpectations(strand, currGranularity = granularity.value) {
  if (!strand) return []
  if (strand.expectations && Array.isArray(strand.expectations)) {
    return strand.expectations.map(e => ({
      code: e.code || '',
      description: e.description || '',
      isOverall: e.isOverall !== false,
      weight: e.weight != null ? Number(e.weight) : 1.0
    }))
  }
  if (!strand.overalls) return []
  const list = []
  strand.overalls.forEach(ov => {
    const ovWeight = (ov.weight != null) ? Number(ov.weight) : 1.0
    if (currGranularity === 'overall') {
      list.push({ code: ov.code, description: ov.description, isOverall: true, weight: ovWeight })
    } else if ((currGranularity === 'all' || currGranularity === 'success_criteria') && ov.specifics && ov.specifics.length > 0) {
      ov.specifics.forEach(sp => {
        const spWeight = (sp.weight != null) ? Number(sp.weight) : ovWeight
        list.push({ code: sp.code, description: sp.description, isOverall: false, weight: spWeight })
      })
    } else {
      list.push({ code: ov.code, description: ov.description || ov.name, isOverall: true, weight: ovWeight })
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

const canSubmit = computed(() => {
  if (!selectedPreset.value) return false
  if (props.classType === 'elementary' || targetUnitChoice.value === 'auto') return true
  if (selectedExpectations.value.length === 0) return false
  if (targetUnitChoice.value === 'new' && !newUnitName.value.trim()) return false
  return true
})

function onClose() {
  emit('update:modelValue', false)
}

function goToCurriculumLibrary() {
  onClose()
  window.dispatchEvent(new CustomEvent('switch-setup-tab', { detail: 'curriculum' }))
  emit('open-curriculum-library')
}

function onSubmit() {
  if (!canSubmit.value) return

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

  onClose()
  selectedExpectations.value = []
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

.eim-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.eim-header__library-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary-light, rgba(79, 70, 229, 0.08));
  color: var(--primary, #4f46e5);
  border: 1px solid var(--primary-border, rgba(79, 70, 229, 0.25));
  padding: 6px 12px;
  border-radius: var(--radius-md, 6px);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-header__library-link:hover {
  background: var(--primary, #4f46e5);
  color: #fff;
  border-color: var(--primary, #4f46e5);
}

.eim-library-shortcut-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: var(--bg-secondary, #f8fafc);
  border: 1px dashed var(--border, #cbd5e1);
  border-radius: var(--radius-md, 8px);
  margin-top: 20px;
}

.eim-library-shortcut-info {
  flex: 1;
}

.eim-library-shortcut-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text, #1e293b);
  margin-bottom: 3px;
}

.eim-library-shortcut-sparkle {
  color: #a855f7;
}

.eim-library-shortcut-desc {
  font-size: 0.8rem;
  color: var(--text-secondary, #64748b);
  margin: 0;
  line-height: 1.4;
}

.eim-library-shortcut-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--radius-md, 6px);
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #cbd5e1);
  color: var(--primary, #4f46e5);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.eim-library-shortcut-btn:hover {
  background: var(--primary, #4f46e5);
  color: #ffffff;
  border-color: var(--primary, #4f46e5);
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

/* Bulk Paste / CSV Importer Enhancements */
.eim-format-guide-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.eim-guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.eim-guide-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.eim-guide-icon {
  color: var(--primary);
}

.eim-sample-buttons-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.eim-sample-buttons-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.eim-sample-buttons-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.eim-sample-btn {
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-sample-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--bg-hover);
}

.eim-sample-btn code {
  font-size: 0.7rem;
  opacity: 0.85;
}

.eim-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 20px;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-dropzone:hover, .eim-dropzone--active {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.04);
}

.eim-dropzone-icon {
  color: var(--primary);
}

.eim-dropzone-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.eim-dropzone-text strong {
  color: var(--primary);
}

.eim-paste-controls-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.eim-preview-table-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.eim-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.eim-preview-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--text);
}

.eim-preview-success-icon {
  color: #10b981;
}

.eim-preview-duplicate-warning {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 700;
}

.eim-preview-strand-badge {
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 700;
}

.eim-preview-edit-hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.eim-table-scroll-wrapper {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.eim-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.eim-preview-table th {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  padding: 8px 10px;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  z-index: 1;
}

.eim-preview-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
}

.eim-preview-table tr:last-child td {
  border-bottom: none;
}

.eim-tr--duplicate {
  background: rgba(239, 68, 68, 0.05);
}

.eim-td-num {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-align: center;
}

.eim-table-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font-size: 0.8rem;
  font-family: inherit;
  box-sizing: border-box;
}

.eim-table-input:hover {
  border-color: var(--border);
  background: var(--bg-secondary);
}

.eim-table-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
}

.eim-table-input--code {
  font-weight: 700;
  color: var(--primary);
}

.eim-table-btn-delete {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.eim-table-btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* AI Prompts & JSON Templates Tab Styles */
.eim-ai-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eim-ai-hero-card {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(59, 130, 246, 0.08));
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eim-ai-hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eim-ai-hero-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eim-ai-sparkle-icon {
  color: #a855f7;
}

.eim-ai-hero-title h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.eim-ai-hero-desc {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.eim-ai-steps-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgba(168, 85, 247, 0.15);
  flex-wrap: wrap;
}

.eim-ai-step-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eim-ai-step-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #a855f7;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
}

.eim-ai-step-text {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
}

.eim-ai-step-text strong {
  color: var(--text);
}

.eim-ai-step-text span {
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.eim-ai-step-arrow {
  color: var(--text-secondary);
  font-size: 0.9rem;
  opacity: 0.6;
}

.eim-templates-download-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eim-templates-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.eim-templates-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.eim-templates-icon {
  color: var(--primary);
}

.eim-templates-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.eim-templates-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.eim-template-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-template-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--bg-hover);
}

.eim-ai-prompts-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.eim-section-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.eim-prompt-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s ease;
}

.eim-prompt-card:hover {
  border-color: rgba(168, 85, 247, 0.4);
}

.eim-prompt-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.eim-prompt-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eim-prompt-card__meta h6 {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.eim-prompt-tag {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
}

.eim-prompt-tag--json {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.eim-prompt-tag--purple {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.eim-prompt-tag--blue {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.eim-copy-prompt-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(168, 85, 247, 0.4);
  background: rgba(168, 85, 247, 0.08);
  color: #a855f7;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.eim-copy-prompt-btn:hover {
  background: #a855f7;
  color: #ffffff;
  border-color: #a855f7;
}

.eim-copy-prompt-btn--copied {
  background: #10b981 !important;
  color: #ffffff !important;
  border-color: #10b981 !important;
}

.eim-prompt-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.eim-prompt-code-preview {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  overflow-x: auto;
}

.eim-prompt-code-preview pre {
  margin: 0;
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.35;
}

.eim-ai-shortcut-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(168, 85, 247, 0.06);
  border: 1px dashed rgba(168, 85, 247, 0.3);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.eim-ai-shortcut-icon {
  color: #a855f7;
  flex-shrink: 0;
}

.eim-inline-link {
  background: transparent;
  border: none;
  color: #a855f7;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
}

.eim-inline-link:hover {
  color: #9333ea;
}

/* Course Blueprint Variant Mini-Pills */
.eim-blueprint-variants {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0;
}

.eim-variant-pill {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--border, #cbd5e1);
  background: var(--bg-secondary, #f8fafc);
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
}

.eim-variant-pill:hover {
  border-color: var(--primary, #2563eb);
  color: var(--primary, #2563eb);
}

.eim-variant-pill--active {
  background: var(--primary, #2563eb) !important;
  color: #ffffff !important;
  border-color: var(--primary, #2563eb) !important;
}

.eim-variant-pill--sc.eim-variant-pill--active {
  background: #9333ea !important;
  border-color: #9333ea !important;
}

/* Master Library Direct Link Card */
.eim-master-link-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(37, 99, 235, 0.05);
  border: 1px solid rgba(37, 99, 235, 0.25);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 4px;
}

.eim-master-link-icon {
  color: var(--primary, #2563eb);
  flex-shrink: 0;
  margin-top: 2px;
}

.eim-master-link-body strong {
  display: block;
  font-size: 0.85rem;
  color: var(--text, #0f172a);
  margin-bottom: 2px;
}

.eim-master-link-body p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary, #475569);
  line-height: 1.4;
}
</style>

