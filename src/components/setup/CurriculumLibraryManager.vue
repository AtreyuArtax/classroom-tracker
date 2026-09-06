<template>
  <div class="curriculum-manager">
    <!-- Header Area -->
    <div class="curriculum-manager__header">
      <div class="curriculum-manager__title-group">
        <h2 class="curriculum-manager__title">
          <BookOpen :size="20" class="curriculum-manager__title-icon" />
          Master Curriculum Library
        </h2>
        <p class="curriculum-manager__subtitle">
          Define master curriculum standards, descriptions, and weight multipliers across school years and classes.
        </p>
      </div>

      <!-- Quick Preset Search -->
      <div class="curriculum-manager__search-box">
        <Search :size="14" class="search-icon" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search standards, codes, subjects..." 
          class="curriculum-manager__search-input"
        />
        <button v-if="searchQuery" type="button" class="clear-search-btn" @click="searchQuery = ''">
          <X :size="12" />
        </button>
      </div>
    </div>

    <!-- Panel & Grade Selector Toolbar -->
    <div class="curriculum-manager__nav-bar">
      <!-- Elementary vs Secondary Toggle -->
      <div class="curriculum-manager__segmented">
        <button 
          type="button" 
          class="curriculum-manager__seg-btn"
          :class="{ 'curriculum-manager__seg-btn--active': activePanel === 'elementary' }"
          @click="selectPanel('elementary')"
        >
          <School :size="15" /> Elementary (K–8)
        </button>
        <button 
          type="button" 
          class="curriculum-manager__seg-btn"
          :class="{ 'curriculum-manager__seg-btn--active': activePanel === 'secondary' }"
          @click="selectPanel('secondary')"
        >
          <GraduationCap :size="15" /> Secondary (9–12)
        </button>
      </div>

      <!-- Grade Level Pills (for Elementary) -->
      <div v-if="activePanel === 'elementary'" class="curriculum-manager__grade-pills">
        <button 
          v-for="g in ['1', '2', '3', '4', '5', '6', '7', '8']" 
          :key="g"
          type="button"
          class="curriculum-manager__grade-pill"
          :class="{ 'curriculum-manager__grade-pill--active': activeGrade === g }"
          @click="selectGrade(g)"
        >
          Grade {{ g }}
        </button>
      </div>
    </div>

    <!-- Subject Cards Grid (Selector) -->
    <div class="curriculum-manager__subjects-section">
      <div class="curriculum-manager__section-header">
        <h3 class="curriculum-manager__section-title">
          {{ activePanel === 'elementary' ? `Grade ${activeGrade} Subjects` : 'Secondary Course Blueprints' }}
        </h3>
        <span class="curriculum-manager__count-badge">
          {{ availablePresets.length }} Subject Preset{{ availablePresets.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <div v-if="availablePresets.length === 0" class="curriculum-manager__empty-presets">
        No curriculum presets match your selection or search query.
      </div>

      <div v-else class="curriculum-manager__preset-grid">
        <div 
          v-for="p in availablePresets" 
          :key="p.presetId"
          class="curriculum-manager__preset-card"
          :class="{ 'curriculum-manager__preset-card--selected': selectedPreset?.presetId === p.presetId }"
          @click="loadPresetToEditor(p)"
        >
          <div class="preset-card__top">
            <div class="preset-card__info">
              <span class="preset-card__title">{{ p.title }}</span>
              <span class="preset-card__code">({{ p.subjectCode || 'SUBJ' }})</span>
            </div>
            <span v-if="isMasterCustomized(p.presetId)" class="preset-card__custom-badge" title="You have customized this master blueprint">
              <Star :size="11" /> Customized Master
            </span>
          </div>

          <div class="preset-card__meta">
            <span class="preset-card__stat">
              {{ countPresetStrands(p) }} Strands
            </span>
            <span class="preset-card__stat-divider">•</span>
            <span class="preset-card__stat">
              {{ countPresetExpectations(p) }} Expectations
            </span>
            <span v-if="countPresetWeighted(p) > 0" class="preset-card__stat-weighted">
              ({{ countPresetWeighted(p) }} Weighted)
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Master Preset Editor Panel (When a subject is selected) -->
    <div v-if="selectedPreset" class="curriculum-manager__editor-card">
      <div class="curriculum-editor__header">
        <div class="curriculum-editor__title-row">
          <div class="curriculum-editor__title-info">
            <h3 class="curriculum-editor__subject-name">{{ currentEditorPreset.title }}</h3>
            <span class="curriculum-editor__meta-tag">
              {{ currentEditorPreset.panel === 'elementary' ? `Elementary Grade ${currentEditorPreset.grade}` : 'Secondary' }} • {{ currentEditorPreset.subjectCode }}
            </span>
            <span v-if="isMasterCustomized(currentEditorPreset.presetId)" class="preset-card__custom-badge">
              <Star :size="11" /> Active Master Blueprint
            </span>
            <span v-else class="curriculum-editor__standard-badge">
              Official Ontario Ministry Baseline
            </span>
          </div>

          <!-- Top Editor Actions -->
          <div class="curriculum-editor__actions">
            <button 
              type="button" 
              class="setup__btn-primary" 
              :disabled="isSaving"
              @click="handleSaveMasterPreset"
            >
              <Save :size="14" /> {{ isSaving ? 'Saving...' : 'Save as My Master Preset' }}
            </button>
            <button 
              v-if="isMasterCustomized(currentEditorPreset.presetId)"
              type="button" 
              class="setup__btn-ghost text-danger" 
              title="Revert all expectations and weights to official Ministry baseline"
              @click="handleResetToMinistry"
            >
              <RotateCcw :size="13" /> Reset to Ministry Baseline
            </button>
          </div>
        </div>

        <p class="curriculum-editor__instructions">
          Adjust expectation wording and assign <strong>Weight Multipliers</strong> (e.g. <code>2x</code> double weight, <code>0.5x</code> half weight, or <code>0x</code> for diagnostic/formative-only). These standards and weights will automatically load whenever you teach this subject.
        </p>

        <!-- Save Banner / Notice -->
        <div v-if="editorNotice.text" class="curriculum-editor__banner" :class="`curriculum-editor__banner--${editorNotice.type}`">
          <CheckCircle2 v-if="editorNotice.type === 'success'" :size="15" />
          <AlertCircle v-else :size="15" />
          <span>{{ editorNotice.text }}</span>
        </div>
      </div>

      <!-- Strands & Expectations List -->
      <div class="curriculum-editor__strands-container">
        <div 
          v-for="(strand, sIdx) in editorStrands" 
          :key="strand.id || sIdx" 
          class="curriculum-strand-block"
        >
          <!-- Strand Header -->
          <div class="curriculum-strand-header">
            <div class="strand-title-group">
              <Layers :size="15" class="strand-icon" />
              <input 
                v-model="strand.name" 
                type="text" 
                class="strand-name-input" 
                placeholder="Strand / Unit Name (e.g. Strand B: Number Sense)" 
              />
            </div>
            <div class="strand-header-meta">
              <span class="strand-exp-count">
                {{ strand.expectations.length }} Expectation{{ strand.expectations.length !== 1 ? 's' : '' }}
              </span>
              <button 
                type="button" 
                class="strand-delete-btn" 
                title="Remove Strand"
                @click="removeEditorStrand(sIdx)"
              >
                <Trash2 :size="13" />
              </button>
            </div>
          </div>

          <!-- Expectations in this Strand -->
          <div class="curriculum-strand-exps">
            <div 
              v-for="(exp, eIdx) in strand.expectations" 
              :key="exp.id || eIdx"
              class="curriculum-exp-row"
              :class="{ 'curriculum-exp-row--weighted': Number(exp.weight) !== 1.0 }"
            >
              <div class="exp-col-code">
                <input 
                  v-model="exp.code" 
                  type="text" 
                  class="exp-input-code" 
                  placeholder="Code (B1.1)" 
                />
              </div>

              <div class="exp-col-desc">
                <textarea 
                  v-model="exp.description" 
                  rows="2" 
                  class="exp-input-desc" 
                  placeholder="Expectation description or student-friendly success criteria..."
                ></textarea>
              </div>

              <div class="exp-col-weight">
                <div class="weight-control-box">
                  <span class="weight-label">Weight:</span>
                  <div class="weight-input-wrapper">
                    <input 
                      v-model.number="exp.weight" 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="10" 
                      class="exp-input-weight" 
                      placeholder="1.0" 
                    />
                    <span class="weight-unit">×</span>
                  </div>

                  <!-- Quick Multiplier Buttons -->
                  <div class="weight-quick-btns">
                    <button 
                      type="button" 
                      class="weight-btn" 
                      :class="{ 'weight-btn--active': exp.weight === 2.0 }"
                      title="Double Weight (2x)"
                      @click="exp.weight = 2.0"
                    >2x</button>
                    <button 
                      type="button" 
                      class="weight-btn" 
                      :class="{ 'weight-btn--active': exp.weight === 1.0 || exp.weight == null }"
                      title="Standard Weight (1x)"
                      @click="exp.weight = 1.0"
                    >1x</button>
                    <button 
                      type="button" 
                      class="weight-btn" 
                      :class="{ 'weight-btn--active': exp.weight === 0.5 }"
                      title="Half Weight (0.5x)"
                      @click="exp.weight = 0.5"
                    >0.5x</button>
                    <button 
                      type="button" 
                      class="weight-btn weight-btn--diag" 
                      :class="{ 'weight-btn--active': exp.weight === 0 }"
                      title="Diagnostic / Formative Only (0x - excluded from course mark)"
                      @click="exp.weight = 0"
                    >0x</button>
                  </div>
                </div>

                <ExpectationWeightBadge :weight="exp.weight" :show-default="true" :compact="true" />
              </div>

              <div class="exp-col-actions">
                <button 
                  type="button" 
                  class="exp-remove-btn" 
                  title="Remove Expectation"
                  @click="removeEditorExpectation(sIdx, eIdx)"
                >
                  <Trash2 :size="13" />
                </button>
              </div>
            </div>

            <!-- Add Expectation to this Strand -->
            <div class="curriculum-add-exp-row">
              <button 
                type="button" 
                class="add-exp-btn"
                @click="addEditorExpectation(sIdx)"
              >
                <Plus :size="13" /> Add Expectation to {{ strand.name || 'this strand' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Add New Strand Button -->
        <div class="curriculum-add-strand-row">
          <button 
            type="button" 
            class="setup__btn-ghost setup__btn--full"
            @click="addEditorStrand"
          >
            <Plus :size="14" /> Add New Strand / Unit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import {
  BookOpen,
  Search,
  X,
  School,
  GraduationCap,
  Star,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Layers,
  Plus,
  Trash2
} from 'lucide-vue-next'
import { useCurriculumLibrary } from '../../composables/useCurriculumLibrary.js'
import ExpectationWeightBadge from './ExpectationWeightBadge.vue'
import { cleanExpectationText } from '../../utils/textUtils.js'

const {
  initCurriculumLibrary,
  getMergedCurriculumPresets,
  isMasterCustomized,
  saveMasterPreset,
  resetMasterPreset
} = useCurriculumLibrary()

const activePanel = ref('elementary')
const activeGrade = ref('8')
const searchQuery = ref('')
const selectedPreset = ref(null)
const isSaving = ref(false)
const editorNotice = reactive({ text: '', type: 'success' })

// Editable Working Copy of Selected Preset
const currentEditorPreset = ref(null)
const editorStrands = ref([])

onMounted(async () => {
  await initCurriculumLibrary()
  // Select default preset if available
  if (availablePresets.value.length > 0) {
    loadPresetToEditor(availablePresets.value[0])
  }
})

function selectPanel(panel) {
  activePanel.value = panel
  if (panel === 'elementary' && !activeGrade.value) {
    activeGrade.value = '8'
  }
  // Auto-select first preset in new panel
  if (availablePresets.value.length > 0) {
    loadPresetToEditor(availablePresets.value[0])
  } else {
    selectedPreset.value = null
  }
}

function selectGrade(grade) {
  activeGrade.value = grade
  if (availablePresets.value.length > 0) {
    loadPresetToEditor(availablePresets.value[0])
  } else {
    selectedPreset.value = null
  }
}

const availablePresets = computed(() => {
  const merged = getMergedCurriculumPresets(activePanel.value)
  let list = merged

  if (activePanel.value === 'elementary' && activeGrade.value) {
    const gNorm = String(activeGrade.value).trim()
    list = list.filter(p => String(p.grade || '').replace(/[^0-9]/g, '') === gNorm)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p => {
      if ((p.title || '').toLowerCase().includes(q)) return true
      if ((p.subjectCode || '').toLowerCase().includes(q)) return true
      // Check strands and expectations
      return (p.strands || []).some(s => {
        if ((s.name || '').toLowerCase().includes(q)) return true
        return (s.expectations || s.overalls || []).some(e => {
          if ((e.code || '').toLowerCase().includes(q)) return true
          if ((e.description || '').toLowerCase().includes(q)) return true
          return false
        })
      })
    })
  }

  return list
})

function countPresetStrands(preset) {
  return preset.strands?.length || 0
}

function countPresetExpectations(preset) {
  let count = 0
  ;(preset.strands || []).forEach(s => {
    if (s.expectations) count += s.expectations.length
    else if (s.overalls) {
      s.overalls.forEach(ov => {
        if (ov.specifics && ov.specifics.length > 0) count += ov.specifics.length
        else count += 1
      })
    }
  })
  return count
}

function countPresetWeighted(preset) {
  let weighted = 0
  ;(preset.strands || []).forEach(s => {
    ;(s.expectations || []).forEach(e => {
      if (e.weight != null && Number(e.weight) !== 1.0) weighted++
    })
  })
  return weighted
}

function loadPresetToEditor(preset) {
  selectedPreset.value = preset
  currentEditorPreset.value = JSON.parse(JSON.stringify(preset))
  
  // Transform strands into uniform editable format with expectations array
  const strandsList = []
  ;(preset.strands || []).forEach((s, sIdx) => {
    const exps = []
    if (s.expectations && Array.isArray(s.expectations)) {
      s.expectations.forEach(e => {
        exps.push({
          id: e.expectationId || e.id || `exp-${sIdx}-${crypto.randomUUID().slice(0, 6)}`,
          code: e.code || '',
          description: e.description || '',
          weight: e.weight != null ? Number(e.weight) : 1.0,
          active: e.active !== false
        })
      })
    } else if (s.overalls) {
      s.overalls.forEach((ov, ovIdx) => {
        if (ov.specifics && ov.specifics.length > 0) {
          ov.specifics.forEach((sp, spIdx) => {
            exps.push({
              id: `exp-${sIdx}-${ovIdx}-${spIdx}`,
              code: sp.code || '',
              description: sp.description || '',
              weight: sp.weight != null ? Number(sp.weight) : 1.0,
              active: true
            })
          })
        } else {
          exps.push({
            id: `exp-${sIdx}-${ovIdx}`,
            code: ov.code || '',
            description: ov.description || ov.name || '',
            weight: ov.weight != null ? Number(ov.weight) : 1.0,
            active: true
          })
        }
      })
    }

    strandsList.push({
      id: s.id || `strand-${sIdx}`,
      name: cleanExpectationText(s.name || `Strand ${sIdx + 1}`),
      expectations: exps
    })
  })

  editorStrands.value = strandsList
  editorNotice.text = ''
}

function addEditorStrand() {
  editorStrands.value.push({
    id: `strand-${crypto.randomUUID().slice(0, 6)}`,
    name: 'New Strand / Unit',
    expectations: []
  })
}

function removeEditorStrand(idx) {
  editorStrands.value.splice(idx, 1)
}

function addEditorExpectation(strandIdx) {
  const targetStrand = editorStrands.value[strandIdx]
  if (!targetStrand) return
  targetStrand.expectations.push({
    id: `exp-${crypto.randomUUID().slice(0, 6)}`,
    code: '',
    description: '',
    weight: 1.0,
    active: true
  })
}

function removeEditorExpectation(strandIdx, expIdx) {
  const targetStrand = editorStrands.value[strandIdx]
  if (targetStrand) {
    targetStrand.expectations.splice(expIdx, 1)
  }
}

async function handleSaveMasterPreset() {
  if (!currentEditorPreset.value) return
  isSaving.value = true
  editorNotice.text = ''

  try {
    // Construct standardized master preset object
    const updatedPreset = {
      ...currentEditorPreset.value,
      isCustomMaster: true,
      updatedAt: new Date().toISOString(),
      strands: editorStrands.value.map(s => ({
        name: cleanExpectationText(s.name),
        expectations: s.expectations.map(e => ({
          expectationId: e.id || crypto.randomUUID(),
          code: cleanExpectationText(e.code).toUpperCase(),
          description: cleanExpectationText(e.description),
          weight: e.weight != null && !isNaN(Number(e.weight)) ? Math.max(0, Number(e.weight)) : 1.0,
          active: e.active !== false
        }))
      }))
    }

    await saveMasterPreset(updatedPreset)
    selectedPreset.value = updatedPreset
    editorNotice.text = `Master Blueprint for "${updatedPreset.title}" saved successfully! It will now auto-load in all classes.`
    editorNotice.type = 'success'
  } catch (err) {
    console.error('[CurriculumLibraryManager] Error saving master preset:', err)
    editorNotice.text = 'Failed to save master preset. Please check console logs.'
    editorNotice.type = 'error'
  } finally {
    isSaving.value = false
  }
}

async function handleResetToMinistry() {
  if (!currentEditorPreset.value) return
  const title = currentEditorPreset.value.title
  if (!confirm(`Reset "${title}" to official Ministry baseline? This will remove your custom expectation weights and wording.`)) return

  try {
    await resetMasterPreset(currentEditorPreset.value.presetId)
    // Reload built-in preset
    const builtIn = getMergedCurriculumPresets(activePanel.value).find(p => p.presetId === currentEditorPreset.value.presetId)
    if (builtIn) {
      loadPresetToEditor(builtIn)
    }
    editorNotice.text = `"${title}" has been reset to official Ministry baseline.`
    editorNotice.type = 'success'
  } catch (err) {
    console.error('[CurriculumLibraryManager] Error resetting preset:', err)
  }
}
</script>

<style scoped>
.curriculum-manager {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.curriculum-manager__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.curriculum-manager__title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.curriculum-manager__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.curriculum-manager__title-icon {
  color: var(--primary);
}

.curriculum-manager__subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.curriculum-manager__search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  padding: 6px 12px;
  min-width: 280px;
}

.curriculum-manager__search-input {
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.85rem;
  width: 100%;
  outline: none;
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
}

/* Nav Bar */
.curriculum-manager__nav-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.curriculum-manager__segmented {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  padding: 3px;
  gap: 4px;
}

.curriculum-manager__seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.curriculum-manager__seg-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.curriculum-manager__grade-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.curriculum-manager__grade-pill {
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.curriculum-manager__grade-pill:hover {
  border-color: var(--primary);
  color: var(--text);
}

.curriculum-manager__grade-pill--active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

/* Section Header */
.curriculum-manager__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.curriculum-manager__section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.curriculum-manager__count-badge {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
}

/* Preset Cards Grid */
.curriculum-manager__preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.curriculum-manager__preset-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curriculum-manager__preset-card:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}

.curriculum-manager__preset-card--selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light, rgba(99, 102, 241, 0.3));
  background: rgba(99, 102, 241, 0.04);
}

.preset-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.preset-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preset-card__title {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--text);
}

.preset-card__code {
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.preset-card__custom-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #f59e0b;
  white-space: nowrap;
}

.preset-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.preset-card__stat-weighted {
  color: #818cf8;
  font-weight: 600;
}

/* Editor Card */
.curriculum-manager__editor-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.curriculum-editor__header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curriculum-editor__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.curriculum-editor__title-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.curriculum-editor__subject-name {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.curriculum-editor__meta-tag {
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.curriculum-editor__standard-badge {
  font-size: 10px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.curriculum-editor__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.curriculum-editor__instructions {
  margin: 0;
  font-size: 0.84rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.curriculum-editor__instructions code {
  color: var(--primary);
  font-weight: 600;
}

.curriculum-editor__banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 4px;
}

.curriculum-editor__banner--success {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
}

.curriculum-editor__banner--error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #ef4444;
}

/* Strands & Expectations */
.curriculum-editor__strands-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.curriculum-strand-block {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  overflow: hidden;
}

.curriculum-strand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border);
}

.strand-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 600px;
}

.strand-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.strand-name-input {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text);
  font-size: 0.92rem;
  font-weight: 700;
  width: 100%;
  padding: 3px 6px;
  border-radius: 4px;
}

.strand-name-input:focus {
  border-color: var(--primary);
  background: var(--surface);
  outline: none;
}

.strand-header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.strand-exp-count {
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.strand-delete-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.strand-delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* Expectations inside Strand */
.curriculum-strand-exps {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curriculum-exp-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  transition: all 0.15s ease;
}

.curriculum-exp-row--weighted {
  border-left: 3px solid #818cf8;
}

.exp-col-code {
  width: 90px;
  flex-shrink: 0;
}

.exp-input-code {
  width: 100%;
  padding: 4px 6px;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text);
  border-radius: 4px;
}

.exp-col-desc {
  flex: 1;
}

.exp-input-desc {
  width: 100%;
  padding: 4px 8px;
  font-size: 0.83rem;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text);
  border-radius: 4px;
  resize: vertical;
  min-height: 40px;
  font-family: inherit;
}

.exp-col-weight {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.weight-control-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.weight-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.weight-input-wrapper {
  display: inline-flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 4px;
}

.exp-input-weight {
  width: 44px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 700;
  text-align: right;
  outline: none;
  padding: 2px 0;
}

.weight-unit {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-left: 2px;
}

.weight-quick-btns {
  display: flex;
  gap: 2px;
}

.weight-btn {
  padding: 1px 4px;
  font-size: 9px;
  font-weight: 700;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.weight-btn:hover {
  border-color: var(--primary);
  color: var(--text);
}

.weight-btn--active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.weight-btn--diag.weight-btn--active {
  background: #64748b;
  border-color: #64748b;
}

.exp-col-actions {
  flex-shrink: 0;
  padding-top: 4px;
}

.exp-remove-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
}

.exp-remove-btn:hover {
  color: #ef4444;
}

.curriculum-add-exp-row {
  display: flex;
  padding-top: 4px;
}

.add-exp-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-exp-btn:hover {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.08);
}
</style>
