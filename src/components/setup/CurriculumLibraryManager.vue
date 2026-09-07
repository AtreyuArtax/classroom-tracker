<template>
  <div class="curriculum-manager">
    <!-- Header & Controls Card -->
    <div class="curriculum-manager__header-card">
      <div class="curriculum-manager__header-top">
        <div class="curriculum-manager__title-group">
          <h2 class="curriculum-manager__title">
            <BookOpen :size="20" class="curriculum-manager__title-icon" />
            Master Curriculum Library
          </h2>
          <p class="curriculum-manager__subtitle">
            Define master curriculum standards, descriptions, and weight multipliers across school years and classes.
          </p>
        </div>

        <div class="curriculum-manager__header-actions">
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

          <!-- Import Course Blueprint Button -->
          <button 
            type="button" 
            class="curriculum-manager__import-btn"
            @click="isImportModalOpen = true"
            title="Import or create a new course blueprint using AI prompts, JSON, or CSV"
          >
            <BookPlus :size="15" />
            <span>Import Course</span>
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
            type="button" 
            class="curriculum-manager__grade-pill"
            :class="{ 'curriculum-manager__grade-pill--active': activeGrade === 'all' }"
            @click="selectGrade('all')"
          >
            All Grades
          </button>
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

        <!-- Grade Level Pills (for Secondary) -->
        <div v-else class="curriculum-manager__grade-pills">
          <button 
            type="button" 
            class="curriculum-manager__grade-pill"
            :class="{ 'curriculum-manager__grade-pill--active': activeGrade === 'all' }"
            @click="selectGrade('all')"
          >
            All Grades
          </button>
          <button 
            v-for="g in ['9', '10', '11', '12']" 
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
    </div>

    <!-- Subject Cards Grid (Course Blueprints Selector) -->
    <div class="curriculum-manager__subjects-section">
      <div class="curriculum-manager__section-header">
        <h3 class="curriculum-manager__section-title">
          {{ activePanel === 'elementary' ? (activeGrade === 'all' ? 'All Elementary Subjects' : `Grade ${activeGrade} Subjects`) : (activeGrade === 'all' ? 'All Secondary Course Blueprints' : `Grade ${activeGrade} Course Blueprints`) }}
        </h3>
        <span class="curriculum-manager__count-badge">
          {{ availableBlueprints.length }} Course Blueprint{{ availableBlueprints.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <div v-if="availableBlueprints.length === 0" class="curriculum-manager__empty-presets">
        No curriculum blueprints match your selection or search query.
      </div>

      <div v-else class="curriculum-manager__preset-grid">
        <div 
          v-for="b in availableBlueprints" 
          :key="b.presetId"
          class="curriculum-manager__preset-card"
          :class="{ 'curriculum-manager__preset-card--selected': selectedBlueprint?.presetId === b.presetId }"
          @click="handleBlueprintCardClick(b, activeVariant)"
        >
          <div class="preset-card__top">
            <div class="preset-card__info">
              <span class="preset-card__title">{{ b.title }}</span>
              <span class="preset-card__code">({{ b.courseCode }})</span>
            </div>
            <span 
              v-if="b.variants.specific.isCustomized || b.variants.overall.isCustomized || b.variants.success_criteria.isCustomized" 
              class="preset-card__custom-badge" 
              title="You have customized master standards or weights for this course"
            >
              <Star :size="11" /> Customized Master
            </span>
          </div>

          <div class="preset-card__meta">
            <span class="preset-card__stat">
              {{ b.strandsCount }} Strands
            </span>
            <span class="preset-card__stat-divider">•</span>
            <span class="preset-card__stat">
              {{ b.grade || (b.panel === 'elementary' ? 'Elementary' : 'Secondary') }}
            </span>
            <template v-if="b.department">
              <span class="preset-card__stat-divider">•</span>
              <span class="preset-card__stat">{{ b.department }}</span>
            </template>
          </div>

          <!-- 3 Curriculum Format Chips / Mini Pills -->
          <div class="preset-card__variants" @click.stop>
            <button 
              type="button"
              class="variant-pill"
              :class="{ 
                'variant-pill--active': selectedBlueprint?.presetId === b.presetId && activeVariant === 'specific',
                'variant-pill--custom': b.variants.specific.isCustomized
              }"
              title="Work with Specific Expectations"
              @click="handleBlueprintCardClick(b, 'specific')"
            >
              <span>Specific ({{ b.variants.specific.count }})</span>
              <Star v-if="b.variants.specific.isCustomized" :size="9" class="pill-star" />
            </button>

            <button 
              type="button"
              class="variant-pill"
              :class="{ 
                'variant-pill--active': selectedBlueprint?.presetId === b.presetId && activeVariant === 'overall',
                'variant-pill--custom': b.variants.overall.isCustomized
              }"
              title="Work with Overall Expectations Only"
              @click="handleBlueprintCardClick(b, 'overall')"
            >
              <span>Overall ({{ b.variants.overall.count }})</span>
              <Star v-if="b.variants.overall.isCustomized" :size="9" class="pill-star" />
            </button>

            <button 
              type="button"
              class="variant-pill"
              :class="{ 
                'variant-pill--active': selectedBlueprint?.presetId === b.presetId && activeVariant === 'success_criteria',
                'variant-pill--disabled': !b.variants.success_criteria.available,
                'variant-pill--custom': b.variants.success_criteria.isCustomized
              }"
              :disabled="!b.variants.success_criteria.available"
              :title="b.variants.success_criteria.available ? 'Work with Success Criteria' : 'Success criteria preset not available for this course'"
              @click="b.variants.success_criteria.available && handleBlueprintCardClick(b, 'success_criteria')"
            >
              <span>Success Criteria ({{ b.variants.success_criteria.available ? b.variants.success_criteria.count : 'N/A' }})</span>
              <Star v-if="b.variants.success_criteria.isCustomized" :size="9" class="pill-star" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Master Preset Editor Panel (When a subject is selected) -->
    <div v-if="selectedBlueprint && currentEditorPreset" class="curriculum-manager__editor-card">
      <div class="curriculum-editor__header">
        <div class="curriculum-editor__title-row">
          <div class="curriculum-editor__title-info">
            <h3 class="curriculum-editor__subject-name">{{ selectedBlueprint.title }}</h3>
            <span class="curriculum-editor__meta-tag">
              {{ currentEditorPreset.panel === 'elementary' ? `Elementary Grade ${currentEditorPreset.grade}` : 'Secondary' }} • {{ selectedBlueprint.courseCode }}
            </span>
            <span v-if="isMasterCustomized(currentEditorPreset.presetId)" class="preset-card__custom-badge">
              <Star :size="11" /> Active Master Blueprint ({{ activeVariant === 'overall' ? 'Overall Only' : activeVariant === 'success_criteria' ? 'Success Criteria' : 'Specific' }})
            </span>
            <span v-else class="curriculum-editor__standard-badge">
              Official Ontario Ministry Baseline
            </span>
          </div>

          <!-- Top Editor Actions -->
          <div class="curriculum-editor__actions">
            <div v-if="isDirty" class="curriculum-editor__dirty-pill" title="You have unsaved changes to multipliers or expectations">
              <span class="dirty-dot"></span> Unsaved Changes
            </div>

            <button 
              type="button" 
              class="setup__btn-ghost" 
              :class="{ 'text-amber': isDirty }"
              :title="isDirty ? 'Discard unsaved changes and reload preset from baseline' : 'Reload preset from baseline'"
              @click="handleDiscardEdits"
            >
              <RotateCcw :size="13" /> {{ isDirty ? 'Discard Edits' : 'Discard & Reload' }}
            </button>

            <button 
              type="button" 
              class="setup__btn-ghost" 
              style="color: var(--primary); border-color: rgba(59, 130, 246, 0.35);"
              title="Push this master blueprint's expectations and weights to existing classes"
              @click="openPushToClassesModal"
            >
              <ArrowUpRight :size="13" /> Push to Classes
            </button>

            <button 
              type="button" 
              class="setup__btn-primary" 
              :class="{ 'setup__btn-primary--dirty': isDirty }"
              :disabled="isSaving"
              @click="handleSaveMasterPreset"
            >
              <Save :size="14" /> {{ isSaving ? 'Saving...' : (isDirty ? 'Save as My Master Preset' : 'Saved to Master') }}
            </button>

            <button 
              v-if="isMasterCustomized(currentEditorPreset.presetId)"
              type="button" 
              class="setup__btn-ghost text-danger" 
              title="Revert expectations and weights for this format to official Ministry baseline"
              @click="handleResetToMinistry"
            >
              <RotateCcw :size="13" /> Reset to Ministry Baseline
            </button>
          </div>
        </div>

        <!-- Segmented Curriculum Format Selector -->
        <div class="curriculum-editor__variant-bar">
          <span class="variant-bar__label">Curriculum Format:</span>
          <div class="curriculum-editor__segmented-formats">
            <button 
              type="button" 
              class="format-btn"
              :class="{ 'format-btn--active': activeVariant === 'specific' }"
              @click="switchVariant('specific')"
            >
              <Target :size="14" />
              <span>Specific Expectations</span>
              <span class="format-count">({{ selectedBlueprint.variants?.specific?.count || 0 }})</span>
              <Star v-if="selectedBlueprint.variants?.specific?.isCustomized" :size="11" class="format-star" title="Customized master" />
            </button>

            <button 
              type="button" 
              class="format-btn"
              :class="{ 'format-btn--active': activeVariant === 'overall' }"
              @click="switchVariant('overall')"
            >
              <Layers :size="14" />
              <span>Overall Only</span>
              <span class="format-count">({{ selectedBlueprint.variants?.overall?.count || 0 }})</span>
              <Star v-if="selectedBlueprint.variants?.overall?.isCustomized" :size="11" class="format-star" title="Customized master" />
            </button>

            <button 
              type="button" 
              class="format-btn"
              :class="{ 
                'format-btn--active': activeVariant === 'success_criteria',
                'format-btn--disabled': !selectedBlueprint.variants?.success_criteria?.available
              }"
              :disabled="!selectedBlueprint.variants?.success_criteria?.available"
              :title="selectedBlueprint.variants?.success_criteria?.available ? 'Student-friendly success criteria' : 'Success criteria preset not available for this course'"
              @click="switchVariant('success_criteria')"
            >
              <Sparkles :size="14" />
              <span>Success Criteria ("I Can...")</span>
              <span class="format-count">({{ selectedBlueprint.variants?.success_criteria?.available ? selectedBlueprint.variants.success_criteria.count : 'N/A' }})</span>
              <Star v-if="selectedBlueprint.variants?.success_criteria?.isCustomized" :size="11" class="format-star" title="Customized master" />
            </button>
          </div>
        </div>

        <p class="curriculum-editor__instructions">
          <template v-if="activeVariant === 'overall'">
            Viewing <strong>Overall Expectations Only</strong>. Streamlined course-level curriculum outcomes (e.g. <code>A1</code>, <code>B2</code>), ideal for term summaries and streamlined reporting.
          </template>
          <template v-else-if="activeVariant === 'success_criteria'">
            Viewing <strong>Success Criteria ("I Can..." Statements)</strong>. Student-friendly outcomes designed for standards-based descriptive feedback and student self-assessment.
          </template>
          <template v-else>
            Viewing <strong>Specific Expectations</strong>. Full granular Ministry curriculum standards (e.g. <code>A1.1</code>, <code>B2.3</code>) for detailed assessment tracking.
          </template>
          Adjust expectation wording and assign <strong>Weight Multipliers</strong> (e.g. <code>2x</code> double weight, <code>0.5x</code> half weight, or <code>0x</code> for diagnostic-only).
        </p>

        <!-- Information Notice Banner -->
        <div v-if="hasGlobalUndo && lastUndoNotice" class="curriculum-editor__undo-banner">
          <div class="undo-banner__text">
            <AlertCircle :size="14" />
            <span>{{ lastUndoNotice }}</span>
          </div>
        </div>

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
            <!-- Empty Strand State with Restore Button -->
            <div v-if="strand.expectations.length === 0" class="curriculum-strand-empty">
              <div class="strand-empty-msg">
                <AlertCircle :size="14" />
                <span>No expectations in this strand.</span>
              </div>
              <button 
                type="button" 
                class="restore-strand-btn"
                @click="restoreStrandFromBaseline(sIdx)"
                title="Restore all expectations for this strand from the official Ministry baseline"
              >
                <RotateCcw :size="12" /> Restore Expectations from Baseline
              </button>
            </div>

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

    <!-- Import Course Blueprint Modal -->
    <CurriculumBlueprintImportModal
      v-model="isImportModalOpen"
      @saved="handleBlueprintImported"
    />

    <!-- Push to Classes Synchronization Modal -->
    <CurriculumSyncModal
      v-model="isSyncModalOpen"
      mode="master-to-classes"
      :preset="syncModalPreset"
      :matching-classes="syncModalClasses"
      @applied="handleSyncApplied"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
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
  Trash2,
  Undo2,
  Target,
  Sparkles,
  BookPlus,
  ArrowUpRight
} from 'lucide-vue-next'
import CurriculumBlueprintImportModal from './CurriculumBlueprintImportModal.vue'
import CurriculumSyncModal from './CurriculumSyncModal.vue'
import { 
  useCurriculumLibrary, 
  syncPresetToClass,
  findMatchingClassesForPreset,
  getCourseBlueprints,
  getMasterPreset,
  deriveOverallPreset,
  deriveSpecificPreset,
  getSuccessCriteriaPreset,
  curriculumEditorDirty,
  curriculumEditorTitle,
  curriculumEditorSaveHandler,
  curriculumEditorDiscardHandler
} from '../../composables/useCurriculumLibrary.js'
import { curriculumPresets } from '../../data/curriculum/index.js'
import { useMessage } from '../../composables/useMessage.js'
import { useUndo } from '../../composables/useUndo.js'
import { getAllClasses, saveClass } from '../../db/classService.js'
import ExpectationWeightBadge from './ExpectationWeightBadge.vue'
import { cleanExpectationText } from '../../utils/textUtils.js'

const { confirm: confirmMessage, select: selectMessage } = useMessage()
const { push: pushGlobalUndo, undo: triggerGlobalUndo, canUndo: hasGlobalUndo, clear: clearGlobalUndo } = useUndo()

const {
  initCurriculumLibrary,
  getMergedCurriculumPresets,
  isMasterCustomized,
  saveMasterPreset,
  resetMasterPreset
} = useCurriculumLibrary()

const activePanel = ref('secondary')
const activeGrade = ref('all')
const activeVariant = ref('specific')
const searchQuery = ref('')
const selectedBlueprint = ref(null)
const currentEditorPreset = ref(null)
const editorStrands = ref([])
const isSaving = ref(false)
const editorNotice = reactive({ text: '', type: 'info' })
const undoStack = ref([])
const lastUndoNotice = ref('')
const isImportModalOpen = ref(false)
const isSyncModalOpen = ref(false)
const syncModalClasses = ref([])
const syncModalPreset = ref(null)

// ─── Dirty-state tracking & Unsaved Changes Protection ─────────────
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

watch(isDirty, (dirty) => {
  curriculumEditorDirty.value = dirty
  curriculumEditorTitle.value = selectedBlueprint.value?.title || 'Course Blueprint'
}, { immediate: true, flush: 'sync' })

function discardEdits() {
  if (!selectedBlueprint.value) return
  loadBlueprintToEditor(selectedBlueprint.value, activeVariant.value)
  clearGlobalUndo()
  undoStack.value = []
  lastUndoNotice.value = ''
  loadedPresetSnapshot.value = getEditorSnapshot()
  curriculumEditorDirty.value = false
  editorNotice.text = 'Unsaved changes discarded. Blueprint reloaded.'
  editorNotice.type = 'info'
}

async function confirmLeaveIfDirty(actionDesc = 'switch blueprints') {
  if (!isDirty.value) return true
  const courseTitle = selectedBlueprint.value?.title || 'this course blueprint'
  const choice = await selectMessage(
    `You have unsaved multiplier and text changes for "${courseTitle}". What would you like to do before you ${actionDesc}?`,
    [
      { label: 'Save Changes to Master Library', value: 'save' },
      { label: 'Discard Unsaved Changes', value: 'discard' }
    ],
    'Unsaved Blueprint Changes',
    { cancelLabel: 'Keep Editing' }
  )

  if (choice === 'save') {
    await handleSaveMasterPreset()
    return true
  } else if (choice === 'discard') {
    discardEdits()
    return true
  }
  return false
}

function handleBeforeUnload(e) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
    return ''
  }
}

async function openPushToClassesModal() {
  if (!currentEditorPreset.value || !selectedBlueprint.value) return
  const preset = currentEditorPreset.value
  const allClasses = await getAllClasses()
  const matches = findMatchingClassesForPreset(preset, allClasses)
  syncModalPreset.value = preset
  syncModalClasses.value = matches.filter(m => m.changesCount > 0)
  
  if (syncModalClasses.value.length === 0) {
    if (matches.length > 0) {
      editorNotice.text = `All ${matches.length} active class(es) teaching this course are already up to date!`
      editorNotice.type = 'info'
    } else {
      editorNotice.text = 'No active classes are currently teaching this curriculum.'
      editorNotice.type = 'info'
    }
    return
  }
  isSyncModalOpen.value = true
}

function handleSyncApplied(result) {
  editorNotice.text = `Master Blueprint successfully synchronized to ${result.count} active class(es)!`
  editorNotice.type = 'success'
}

async function handleBlueprintImported(newPresetId) {
  await initCurriculumLibrary()
  const allB = getCourseBlueprints('all')
  const baseId = newPresetId ? newPresetId.replace(/-success-criteria$/, '').replace(/-overall$/, '') : ''
  const found = allB.find(b => b.presetId === baseId || b.presetId === newPresetId)
  if (found) {
    activePanel.value = found.panel || 'secondary'
    activeGrade.value = 'all'
    const variantToUse = newPresetId && newPresetId.endsWith('-success-criteria') ? 'success_criteria' : 'specific'
    loadBlueprintToEditor(found, variantToUse)
  }

  // Check if any active classes teach this newly imported blueprint and offer push
  try {
    const allClasses = await getAllClasses()
    const importedPreset = getMasterPreset(newPresetId)
    if (importedPreset) {
      const matches = findMatchingClassesForPreset(importedPreset, allClasses)
      const classesWithChanges = matches.filter(m => m.changesCount > 0)
      if (classesWithChanges.length > 0) {
        syncModalPreset.value = importedPreset
        syncModalClasses.value = classesWithChanges
        isSyncModalOpen.value = true
      }
    }
  } catch (syncErr) {
    console.warn('[CurriculumLibraryManager] Error checking class sync on import:', syncErr)
  }
}

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  curriculumEditorSaveHandler.value = () => handleSaveMasterPreset()
  curriculumEditorDiscardHandler.value = () => discardEdits()
  await initCurriculumLibrary()
  // Select default blueprint if available
  if (availableBlueprints.value.length > 0) {
    loadBlueprintToEditor(availableBlueprints.value[0], 'specific')
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  curriculumEditorDirty.value = false
  curriculumEditorSaveHandler.value = null
  curriculumEditorDiscardHandler.value = null
})

async function selectPanel(panel) {
  if (panel === activePanel.value) return
  const ok = await confirmLeaveIfDirty('switch panel')
  if (!ok) return

  activePanel.value = panel
  if (panel === 'elementary') {
    activeGrade.value = '8'
  } else {
    activeGrade.value = 'all'
  }
  // Auto-select first blueprint in new panel
  if (availableBlueprints.value.length > 0) {
    loadBlueprintToEditor(availableBlueprints.value[0], activeVariant.value)
  } else {
    selectedBlueprint.value = null
    currentEditorPreset.value = null
  }
}

async function selectGrade(grade) {
  if (grade === activeGrade.value) return
  const ok = await confirmLeaveIfDirty('switch grades')
  if (!ok) return

  activeGrade.value = grade
  if (availableBlueprints.value.length > 0) {
    loadBlueprintToEditor(availableBlueprints.value[0], activeVariant.value)
  } else {
    selectedBlueprint.value = null
    currentEditorPreset.value = null
  }
}

async function handleBlueprintCardClick(blueprint, variant = activeVariant.value) {
  if (selectedBlueprint.value?.presetId === blueprint.presetId && activeVariant.value === variant) return
  const ok = await confirmLeaveIfDirty(`open ${blueprint.title}`)
  if (!ok) return
  loadBlueprintToEditor(blueprint, variant)
}

const availableBlueprints = computed(() => {
  const list = getCourseBlueprints(activePanel.value)
  let filtered = list

  // Grade filtering: Works for BOTH Elementary (1-8) and Secondary (9-12)!
  if (activeGrade.value && activeGrade.value !== 'all') {
    const gNorm = String(activeGrade.value).trim()
    filtered = filtered.filter(b => String(b.grade || '').replace(/[^0-9]/g, '') === gNorm)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(b => {
      if ((b.title || '').toLowerCase().includes(q)) return true
      if ((b.courseCode || '').toLowerCase().includes(q)) return true
      return (b.basePreset?.strands || []).some(s => {
        if ((s.name || '').toLowerCase().includes(q)) return true
        return (s.expectations || s.overalls || []).some(e => {
          if ((e.code || '').toLowerCase().includes(q)) return true
          if ((e.description || '').toLowerCase().includes(q)) return true
          return false
        })
      })
    })
  }

  return filtered
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

function loadBlueprintToEditor(blueprint, variant = activeVariant.value) {
  if (!blueprint) return
  selectedBlueprint.value = blueprint

  // Validate variant availability
  if (variant && blueprint.variants?.[variant]?.available) {
    activeVariant.value = variant
  } else if (blueprint.variants?.specific?.available) {
    activeVariant.value = 'specific'
  } else if (blueprint.variants?.overall?.available) {
    activeVariant.value = 'overall'
  }

  let targetPresetId = blueprint.presetId
  if (activeVariant.value === 'overall') {
    targetPresetId = `${blueprint.presetId}-overall`
  } else if (activeVariant.value === 'success_criteria') {
    targetPresetId = `${blueprint.presetId}-success-criteria`
  }

  const preset = getMasterPreset(targetPresetId)
  if (preset) {
    loadPresetToEditor(preset)
  }
}

async function switchVariant(newVariant) {
  if (!selectedBlueprint.value) return
  if (newVariant === activeVariant.value) return
  if (!selectedBlueprint.value.variants?.[newVariant]?.available) return

  const ok = await confirmLeaveIfDirty('switch curriculum format')
  if (!ok) return

  loadBlueprintToEditor(selectedBlueprint.value, newVariant)
}

function loadPresetToEditor(preset) {
  currentEditorPreset.value = JSON.parse(JSON.stringify(preset))
  clearGlobalUndo()
  undoStack.value = []
  lastUndoNotice.value = ''
  
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
          active: e.active !== false,
          isOverall: e.isOverall === true || activeVariant.value === 'overall'
        })
      })
    } else if (s.overalls) {
      s.overalls.forEach((ov, ovIdx) => {
        if (activeVariant.value === 'overall') {
          exps.push({
            id: `exp-${sIdx}-${ovIdx}`,
            code: ov.code || '',
            description: ov.description || ov.name || '',
            weight: ov.weight != null ? Number(ov.weight) : 1.0,
            active: true,
            isOverall: true
          })
        } else if (ov.specifics && ov.specifics.length > 0) {
          ov.specifics.forEach((sp, spIdx) => {
            exps.push({
              id: `exp-${sIdx}-${ovIdx}-${spIdx}`,
              code: sp.code || '',
              description: sp.description || '',
              weight: sp.weight != null ? Number(sp.weight) : 1.0,
              active: true,
              isOverall: false
            })
          })
        } else {
          exps.push({
            id: `exp-${sIdx}-${ovIdx}`,
            code: ov.code || '',
            description: ov.description || ov.name || '',
            weight: ov.weight != null ? Number(ov.weight) : 1.0,
            active: true,
            isOverall: true
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
  loadedPresetSnapshot.value = getEditorSnapshot()
  curriculumEditorDirty.value = false
}

function addEditorStrand() {
  editorStrands.value.push({
    id: `strand-${crypto.randomUUID().slice(0, 6)}`,
    name: 'New Strand / Unit',
    expectations: []
  })
}

async function removeEditorStrand(idx) {
  const strand = editorStrands.value[idx]
  if (!strand) return
  const expCount = strand.expectations?.length || 0
  const ok = await confirmMessage(
    `Are you sure you want to delete strand "${strand.name}"${expCount > 0 ? ` and its ${expCount} expectation(s)` : ''}?`,
    'Delete Strand',
    { confirmLabel: 'Delete Strand', cancelLabel: 'Cancel', danger: true }
  )
  if (!ok) return

  const strandItem = JSON.parse(JSON.stringify(strand))
  const strandName = strand.name || 'Strand'
  const strandIdx = idx

  pushGlobalUndo(async () => {
    editorStrands.value.splice(strandIdx, 0, strandItem)
    lastUndoNotice.value = `Restored strand "${strandName}".`
  })

  undoStack.value.push({
    type: 'strand',
    strandIdx: idx,
    item: strandItem,
    label: strandName
  })
  lastUndoNotice.value = `Removed strand "${strand.name}". Click the ↶ icon in the top toolbar or press ⌘Z to restore.`
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

async function removeEditorExpectation(strandIdx, expIdx) {
  const targetStrand = editorStrands.value[strandIdx]
  if (!targetStrand) return
  const exp = targetStrand.expectations[expIdx]
  const expLabel = exp?.code ? `expectation "${exp.code}"` : 'this expectation'
  const ok = await confirmMessage(
    `Are you sure you want to remove ${expLabel} from ${targetStrand.name || 'this strand'}?`,
    'Delete Expectation',
    { confirmLabel: 'Delete', cancelLabel: 'Cancel', danger: true }
  )
  if (!ok) return

  const expItem = JSON.parse(JSON.stringify(exp))
  const targetStrandIdx = strandIdx
  const targetExpIdx = expIdx
  const itemLabel = exp?.code ? `expectation "${exp.code}"` : 'expectation'

  pushGlobalUndo(async () => {
    const s = editorStrands.value[targetStrandIdx]
    if (s) {
      if (!s.expectations) s.expectations = []
      s.expectations.splice(targetExpIdx, 0, expItem)
      lastUndoNotice.value = `Restored ${itemLabel}.`
    }
  })

  undoStack.value.push({
    type: 'expectation',
    strandIdx,
    expIdx,
    item: expItem,
    label: itemLabel
  })
  lastUndoNotice.value = `Removed ${exp?.code ? `"${exp.code}"` : 'expectation'}. Click the ↶ icon in the top toolbar or press ⌘Z to restore.`
  targetStrand.expectations.splice(expIdx, 1)
}

async function handleUndo() {
  await triggerGlobalUndo()
}

async function handleDiscardEdits() {
  if (!selectedBlueprint.value) return
  if (isDirty.value) {
    const ok = await confirmMessage(
      'Discard any unsaved edits and reload this format from its saved master or baseline preset?',
      'Discard Unsaved Edits',
      { confirmLabel: 'Discard & Reload', cancelLabel: 'Keep Editing', danger: true }
    )
    if (!ok) return
  }
  discardEdits()
}

function restoreStrandFromBaseline(strandIdx) {
  if (!currentEditorPreset.value || !selectedBlueprint.value) return
  let rawPreset = null
  if (activeVariant.value === 'overall') {
    const baseRaw = curriculumPresets.find(p => p.presetId === selectedBlueprint.value.presetId)
    rawPreset = deriveOverallPreset(baseRaw)
  } else if (activeVariant.value === 'success_criteria') {
    const baseRaw = curriculumPresets.find(p => p.presetId === selectedBlueprint.value.presetId)
    rawPreset = getSuccessCriteriaPreset(baseRaw)
  } else {
    const baseRaw = curriculumPresets.find(p => p.presetId === selectedBlueprint.value.presetId)
    rawPreset = deriveSpecificPreset(baseRaw) || baseRaw
  }

  if (!rawPreset || !rawPreset.strands) return

  const currentStrand = editorStrands.value[strandIdx]
  const rawStrand = rawPreset.strands[strandIdx] || rawPreset.strands.find(s => 
    cleanExpectationText(s.name || '').toLowerCase() === cleanExpectationText(currentStrand?.name || '').toLowerCase()
  )
  if (!rawStrand) return

  const restoredExps = []
  if (rawStrand.expectations && Array.isArray(rawStrand.expectations)) {
    rawStrand.expectations.forEach(e => {
      restoredExps.push({
        id: e.expectationId || e.id || `exp-${strandIdx}-${crypto.randomUUID().slice(0, 6)}`,
        code: e.code || '',
        description: e.description || '',
        weight: e.weight != null ? Number(e.weight) : 1.0,
        active: e.active !== false,
        isOverall: e.isOverall === true || activeVariant.value === 'overall'
      })
    })
  } else if (rawStrand.overalls) {
    rawStrand.overalls.forEach((ov, ovIdx) => {
      if (activeVariant.value === 'overall') {
        restoredExps.push({
          id: `exp-${strandIdx}-${ovIdx}`,
          code: ov.code || '',
          description: ov.description || ov.name || '',
          weight: ov.weight != null ? Number(ov.weight) : 1.0,
          active: true,
          isOverall: true
        })
      } else if (ov.specifics && ov.specifics.length > 0) {
        ov.specifics.forEach((sp, spIdx) => {
          restoredExps.push({
            id: `exp-${strandIdx}-${ovIdx}-${spIdx}`,
            code: sp.code || '',
            description: sp.description || '',
            weight: sp.weight != null ? Number(sp.weight) : 1.0,
            active: true,
            isOverall: false
          })
        })
      } else {
        restoredExps.push({
          id: `exp-${strandIdx}-${ovIdx}`,
          code: ov.code || '',
          description: ov.description || ov.name || '',
          weight: ov.weight != null ? Number(ov.weight) : 1.0,
          active: true,
          isOverall: true
        })
      }
    })
  }

  if (editorStrands.value[strandIdx]) {
    editorStrands.value[strandIdx].expectations = restoredExps
    editorNotice.text = `Restored ${restoredExps.length} expectation(s) for ${editorStrands.value[strandIdx].name} from official Ministry baseline.`
    editorNotice.type = 'info'
  }
}

async function handleSaveMasterPreset() {
  if (!currentEditorPreset.value || !selectedBlueprint.value) return
  isSaving.value = true
  editorNotice.text = ''

  try {
    const b = selectedBlueprint.value
    let targetPresetId = b.presetId
    let targetTitle = b.title
    let isOverallOnly = false
    let isSuccessCriteria = false

    if (activeVariant.value === 'overall') {
      targetPresetId = `${b.presetId}-overall`
      targetTitle = `${b.courseCode || b.title} — Overall Expectations`
      isOverallOnly = true
    } else if (activeVariant.value === 'success_criteria') {
      targetPresetId = `${b.presetId}-success-criteria`
      targetTitle = `${b.courseCode || b.title} — Success Criteria`
      isSuccessCriteria = true
    }

    // Construct standardized master preset object with both expectations and overalls
    const updatedPreset = {
      ...currentEditorPreset.value,
      presetId: targetPresetId,
      title: targetTitle,
      subjectCode: b.courseCode,
      panel: b.panel,
      grade: b.grade,
      isCustomMaster: true,
      isOverallOnly,
      isSuccessCriteria,
      updatedAt: new Date().toISOString(),
      strands: editorStrands.value.map(s => {
        const exps = s.expectations.map(e => ({
          expectationId: e.id || crypto.randomUUID(),
          code: cleanExpectationText(e.code).toUpperCase(),
          description: cleanExpectationText(e.description),
          weight: e.weight != null && !isNaN(Number(e.weight)) ? Math.max(0, Number(e.weight)) : 1.0,
          active: e.active !== false,
          isOverall: isOverallOnly || e.isOverall === true
        }))
        return {
          id: s.id,
          name: cleanExpectationText(s.name),
          expectations: exps,
          overalls: exps.map(e => ({
            code: e.code,
            name: e.code,
            description: e.description,
            weight: e.weight,
            specifics: []
          }))
        }
      })
    }

    await saveMasterPreset(updatedPreset)
    currentEditorPreset.value = JSON.parse(JSON.stringify(updatedPreset))
    loadedPresetSnapshot.value = getEditorSnapshot()
    curriculumEditorDirty.value = false

    // Refresh blueprint state
    const blueprints = getCourseBlueprints(activePanel.value)
    const refreshed = blueprints.find(bp => bp.presetId === b.presetId)
    if (refreshed) selectedBlueprint.value = refreshed

    clearGlobalUndo()
    undoStack.value = []
    lastUndoNotice.value = ''
    editorNotice.text = `Master Blueprint for "${updatedPreset.title}" saved successfully! It will now auto-load in all classes.`
    editorNotice.type = 'success'

    // Smart Class Synchronization: Check if any active classes teach this subject with pending diffs
    try {
      const allClasses = await getAllClasses()
      const matches = findMatchingClassesForPreset(updatedPreset, allClasses)
      const classesWithChanges = matches.filter(m => m.changesCount > 0)

      if (classesWithChanges.length > 0) {
        syncModalPreset.value = updatedPreset
        syncModalClasses.value = classesWithChanges
        isSyncModalOpen.value = true
      }
    } catch (syncErr) {
      console.warn('[CurriculumLibraryManager] Error checking class sync:', syncErr)
    }
  } catch (err) {
    console.error('[CurriculumLibraryManager] Error saving master preset:', err)
    editorNotice.text = 'Failed to save master preset. Please check console logs.'
    editorNotice.type = 'error'
  } finally {
    isSaving.value = false
  }
}

async function handleResetToMinistry() {
  if (!currentEditorPreset.value || !selectedBlueprint.value) return
  const targetId = currentEditorPreset.value.presetId
  const variantLabel = activeVariant.value === 'overall' ? 'Overall Only' : activeVariant.value === 'success_criteria' ? 'Success Criteria' : 'Specific Expectations'
  const ok = await confirmMessage(
    `Reset "${selectedBlueprint.value.title} (${variantLabel})" to official Ministry baseline? This will remove your custom expectation weights and custom text for this format.`,
    'Reset to Official Ministry Baseline',
    { confirmLabel: 'Reset to Baseline', cancelLabel: 'Cancel', danger: true }
  )
  if (!ok) return

  try {
    await resetMasterPreset(targetId)
    // Reload built-in preset
    const builtIn = getMasterPreset(targetId)
    if (builtIn) {
      loadPresetToEditor(builtIn)
    }
    // Refresh blueprint
    const blueprints = getCourseBlueprints(activePanel.value)
    const refreshed = blueprints.find(bp => bp.presetId === selectedBlueprint.value.presetId)
    if (refreshed) selectedBlueprint.value = refreshed

    clearGlobalUndo()
    undoStack.value = []
    lastUndoNotice.value = ''
    editorNotice.text = `"${selectedBlueprint.value.title} (${variantLabel})" has been reset to official Ministry baseline.`
    editorNotice.type = 'success'
  } catch (err) {
    console.error('[CurriculumLibraryManager] Error resetting preset:', err)
  }
}
</script>

<style scoped>
.curriculum-manager {
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-sizing: border-box;
}

.curriculum-manager__header-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.curriculum-manager__header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 16px;
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

.curriculum-manager__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.curriculum-manager__import-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary-light, rgba(37, 99, 235, 0.08));
  color: var(--primary, #2563eb);
  border: 1px solid var(--primary, #2563eb);
  border-radius: var(--radius-sm, 8px);
  padding: 7px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.curriculum-manager__import-btn:hover {
  background: var(--primary, #2563eb);
  color: #ffffff;
}

.curriculum-manager__search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  padding: 6px 12px;
  min-width: 240px;
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

.preset-card__variants {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.variant-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 12px;
  background: var(--bg-surface-secondary, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.variant-pill:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--text);
  background: rgba(99, 102, 241, 0.08);
}

.variant-pill--active {
  background: var(--primary) !important;
  border-color: var(--primary) !important;
  color: white !important;
  font-weight: 600;
}

.variant-pill--custom:not(.variant-pill--active) {
  border-color: rgba(245, 158, 11, 0.5);
  color: #f59e0b;
}

.variant-pill--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pill-star {
  color: #f59e0b;
}

/* Editor Card */
.curriculum-manager__editor-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.curriculum-editor__variant-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.variant-bar__label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.curriculum-editor__segmented-formats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-surface-secondary, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border);
  padding: 3px;
  border-radius: var(--radius-sm, 8px);
}

.format-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.format-btn:hover:not(:disabled) {
  color: var(--text);
  background: rgba(255, 255, 255, 0.04);
}

.format-btn--active {
  background: var(--surface, #ffffff) !important;
  color: var(--primary) !important;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.format-btn--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.format-count {
  font-size: 0.75rem;
  opacity: 0.8;
}

.format-star {
  color: #f59e0b;
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
  flex-wrap: wrap;
}

.curriculum-editor__dirty-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 12px;
  padding: 3px 10px;
  letter-spacing: 0.2px;
  animation: pulse-border 2s infinite ease-in-out;
}

.dirty-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.8);
}

.setup__btn-primary--dirty {
  background: #f59e0b !important;
  border-color: #d97706 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4) !important;
}

.setup__btn-primary--dirty:hover {
  background: #d97706 !important;
}

@keyframes pulse-border {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0);
  }
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

.curriculum-editor__btn-undo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: var(--primary, #3b82f6);
  border-radius: var(--radius-sm, 6px);
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.curriculum-editor__btn-undo:hover {
  background: rgba(59, 130, 246, 0.2);
}

.curriculum-editor__undo-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--radius-md, 8px);
  padding: 10px 16px;
  font-size: 0.85rem;
  color: var(--text);
  margin-top: 4px;
}

.undo-banner__text {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary, #3b82f6);
  font-weight: 600;
}

.undo-banner__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary, #3b82f6);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}

.undo-banner__btn:hover {
  opacity: 0.9;
}

.curriculum-strand-empty {
  padding: 14px 18px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm, 8px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.84rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.strand-empty-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.restore-strand-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--primary, #3b82f6);
  cursor: pointer;
  transition: all 0.15s ease;
}

.restore-strand-btn:hover {
  border-color: var(--primary, #3b82f6);
  background: rgba(59, 130, 246, 0.08);
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

.curriculum-editor__banner--info {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--primary, #3b82f6);
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
