<template>
  <div class="elementary-subjects">
    <div class="elementary-subjects__header">
      <div>
        <h3 class="elementary-subjects__title">Elementary Subjects &amp; Frameworks</h3>
        <p class="elementary-subjects__subtitle">
          Manage the subjects taught to this homeroom roster. Each subject maintains its own units, expectations, and grading framework.
        </p>
      </div>
      <button 
        type="button" 
        class="elementary-subjects__btn-add"
        @click="showAddModal = true"
      >
        <Plus :size="16" /> Add Subject
      </button>
    </div>

    <!-- Quick Preset Multi-Checklist -->
    <div class="elementary-subjects__presets">
      <span class="elementary-subjects__preset-label">Standard K–8 Presets:</span>
      <div class="elementary-subjects__preset-pills">
        <button
          v-for="preset in DEFAULT_ELEMENTARY_SUBJECTS"
          :key="preset.subjectId"
          type="button"
          class="elementary-subjects__preset-pill"
          :class="{ 'elementary-subjects__preset-pill--active': isSubjectActive(preset.subjectId) }"
          @click="togglePreset(preset)"
        >
          <SubjectIcon :code="preset.code" :icon="preset.icon" :name="preset.name" :size="14" />
          <span>{{ preset.name }}</span>
          <Check v-if="isSubjectActive(preset.subjectId)" :size="14" />
        </button>
      </div>
    </div>

    <!-- Active Subjects Table / Cards -->
    <div class="elementary-subjects__list">
      <div 
        v-for="(sub, index) in currentSubjects" 
        :key="sub.subjectId"
        class="elementary-subjects__card"
        :class="{ 'elementary-subjects__card--active': sub.subjectId === activeSubjectId }"
      >
        <div class="elementary-subjects__card-top">
          <div class="elementary-subjects__card-main">
            <SubjectIcon :code="sub.code" :icon="sub.icon" :name="sub.name" :size="20" class="elementary-subjects__card-icon" />
            <div class="elementary-subjects__card-info">
              <div class="elementary-subjects__card-name">
                {{ sub.name }}
                <span class="elementary-subjects__card-code">({{ sub.code || 'SUBJ' }})</span>
              </div>
              <div class="elementary-subjects__card-meta">
                <span>Framework: <strong>{{ formatFrameworkLabel(sub.gradingFramework) }}</strong></span>
                <span class="elementary-subjects__tag">
                  {{ (sub.expectations?.length || 0) }} Expectations ({{ (sub.gradebookUnits?.length || 0) }} Strands)
                </span>
              </div>
            </div>
          </div>

          <div class="elementary-subjects__card-actions">
            <button 
              v-if="getSubjectPresetMatch(sub) && (!sub.expectations || sub.expectations.length === 0)"
              type="button" 
              class="elementary-subjects__btn-auto"
              title="Auto-populate curriculum strands &amp; expectations for this grade"
              @click="autoPopulateSubject(sub)"
            >
              <Zap :size="14" /> Auto-Populate {{ detectedGrade }}
            </button>

            <button 
              type="button" 
              class="elementary-subjects__btn-ghost"
              style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; padding: 6px 12px;"
              title="Manage Curriculum Expectations"
              @click="openExpectationModal(sub)"
            >
              <BookOpen :size="14" /> Expectations
            </button>

            <button
              v-if="sub.gradebookUnits && sub.gradebookUnits.length > 0"
              type="button"
              class="elementary-subjects__btn-ghost"
              style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; padding: 6px 10px;"
              title="Edit Strand & Unit Names"
              @click="expandedStrandSubjectId = expandedStrandSubjectId === sub.subjectId ? null : sub.subjectId"
            >
              <ChevronDown :size="14" :style="{ transform: expandedStrandSubjectId === sub.subjectId ? 'rotate(180deg)' : 'none' }" />
              <span>Strands</span>
            </button>

            <button
              v-if="sub.gradingFramework === 'traditional'"
              type="button"
              class="elementary-subjects__btn-ghost"
              style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; padding: 6px 10px;"
              title="Edit Category Weights"
              @click="expandedCategorySubjectId = expandedCategorySubjectId === sub.subjectId ? null : sub.subjectId"
            >
              <ChevronDown :size="14" :style="{ transform: expandedCategorySubjectId === sub.subjectId ? 'rotate(180deg)' : 'none' }" />
              <span>Categories ({{ (sub.gradebookCategories && sub.gradebookCategories.length > 0 ? sub.gradebookCategories : DEFAULT_TRADITIONAL_CATEGORIES).length }})</span>
            </button>

            <select 
              :value="sub.gradingFramework || 'sbar'"
              class="elementary-subjects__select"
              @change="e => updateSubjectFramework(sub.subjectId, e.target.value)"
            >
              <optgroup label="Standards-Based (SBAR)">
                <option value="sbar">SBAR — Decaying Average</option>
                <option value="sbar_power_law">SBAR — Power Law (Marzano)</option>
                <option value="sbar_mode">SBAR — Mode / Most Consistent</option>
                <option value="sbar_most_recent">SBAR — Most Recent</option>
                <option value="sbar_highest">SBAR — Highest Level</option>
              </optgroup>
              <optgroup label="Traditional">
                <option value="traditional">Traditional (%)</option>
              </optgroup>
            </select>

            <button 
              type="button" 
              class="elementary-subjects__btn-delete"
              title="Remove Subject"
              :disabled="currentSubjects.length <= 1"
              @click="removeSubject(sub.subjectId)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>

        <!-- Expandable Category & Weight Editor for Traditional Subjects -->
        <div v-if="sub.gradingFramework === 'traditional' && expandedCategorySubjectId === sub.subjectId" class="elementary-subjects__strands-editor">
          <div class="elementary-subjects__strands-header" style="display: flex; justify-content: space-between; align-items: center;">
            <strong>Category Weights for {{ sub.name }}:</strong>
            <span class="elementary-subjects__weight-total" :style="{ color: getSubjectTotalWeight(sub) === 100 ? 'var(--text-secondary)' : '#ef4444' }">
              Total Weight: <strong>{{ getSubjectTotalWeight(sub) }}%</strong>
            </span>
          </div>
          
          <div v-for="cat in (sub.gradebookCategories && sub.gradebookCategories.length > 0 ? sub.gradebookCategories : DEFAULT_TRADITIONAL_CATEGORIES)" :key="cat.categoryId" class="elementary-subjects__strand-row">
            <input 
              v-model="cat.name" 
              type="text" 
              class="elementary-subjects__strand-input"
              placeholder="Category Name"
              @change="saveSubjectCategories(sub.subjectId)"
            />
            <div style="display: flex; align-items: center; gap: 4px;">
              <input 
                v-model.number="cat.weight" 
                type="number" 
                class="elementary-subjects__strand-input"
                style="width: 70px; text-align: right;"
                min="0"
                max="100"
                @change="saveSubjectCategories(sub.subjectId)"
              />
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">%</span>
              <button 
                type="button" 
                class="elementary-subjects__btn-delete"
                title="Remove Category"
                @click="removeSubjectCategory(sub.subjectId, cat.categoryId)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <div style="margin-top: 8px; display: flex; justify-content: flex-start;">
            <button type="button" class="elementary-subjects__btn-ghost" style="font-size: 0.8rem; padding: 4px 10px;" @click="addSubjectCategory(sub.subjectId)">
              + Add Category
            </button>
          </div>
        </div>

        <!-- Expandable Strand / Unit Editor -->
        <div v-if="expandedStrandSubjectId === sub.subjectId && sub.gradebookUnits && sub.gradebookUnits.length > 0" class="elementary-subjects__strands-editor">
          <div class="elementary-subjects__strands-header">
            <strong>Edit Strand &amp; Unit Titles (short names display on Gradebook Pills):</strong>
          </div>
          <div v-for="unit in sub.gradebookUnits" :key="unit.unitId" class="elementary-subjects__strand-row">
            <span v-if="unit.gradeLevel" class="elementary-subjects__strand-grade">{{ unit.gradeLevel.replace('Grade ', 'Gr ') }}</span>
            <input 
              :value="cleanUnitName(unit.name)" 
              type="text" 
              class="elementary-subjects__strand-input"
              placeholder="Strand / Unit Name"
              @input="unit.name = cleanUnitName($event.target.value)"
              @blur="saveStrandName(sub.subjectId, unit.unitId, unit.name)"
              @keyup.enter="saveStrandName(sub.subjectId, unit.unitId, unit.name)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Expectation Import Modal for Subject -->
    <ExpectationImportModal
      v-if="showExpectationModal"
      v-model="showExpectationModal"
      :target-subject-id="activeImportSubject?.subjectId"
      :target-subject-name="activeImportSubject?.name"
      :existing-units="activeImportSubject?.gradebookUnits || []"
      :initial-preset-id="getSubjectPresetMatch(activeImportSubject)?.presetId"
      :class-type="'elementary'"
      @import="handleExpectationImport"
    />

    <!-- Modal: Add Custom Subject -->
    <div v-if="showAddModal" class="elementary-subjects__modal" role="dialog" aria-modal="true">
      <div class="elementary-subjects__modal-box">
        <h3 class="elementary-subjects__modal-title">Add Custom Subject</h3>
        <div class="elementary-subjects__form-group">
          <label>Subject Name</label>
          <input type="text" v-model="newSubject.name" class="elementary-subjects__input" placeholder="e.g., Media Studies" />
        </div>
        <div class="elementary-subjects__form-group">
          <label>Short Code</label>
          <input type="text" v-model="newSubject.code" class="elementary-subjects__input" placeholder="e.g., MED" maxLength="5" />
        </div>
        <div class="elementary-subjects__form-group">
          <label>Icon Emoji</label>
          <input type="text" v-model="newSubject.icon" class="elementary-subjects__input" placeholder="e.g., 🎬" />
        </div>
        <div class="elementary-subjects__form-group">
          <label>Grading Framework</label>
          <select v-model="newSubject.gradingFramework" class="elementary-subjects__input">
            <optgroup label="Standards-Based (SBAR)">
              <option value="sbar">SBAR — Decaying Average</option>
              <option value="sbar_power_law">SBAR — Power Law (Marzano)</option>
              <option value="sbar_mode">SBAR — Mode / Most Consistent</option>
              <option value="sbar_most_recent">SBAR — Most Recent</option>
              <option value="sbar_highest">SBAR — Highest Level</option>
            </optgroup>
            <optgroup label="Traditional">
              <option value="traditional">Traditional (%)</option>
            </optgroup>
          </select>
        </div>
        <div class="elementary-subjects__modal-actions">
          <button type="button" class="elementary-subjects__btn-ghost" @click="showAddModal = false">Cancel</button>
          <button type="button" class="elementary-subjects__btn-primary" :disabled="!newSubject.name" @click="saveCustomSubject">Save Subject</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Check, Trash2, Zap, BookOpen, ChevronDown } from 'lucide-vue-next'
import SubjectIcon from '../SubjectIcon.vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'
import { DEFAULT_ELEMENTARY_SUBJECTS, DEFAULT_TRADITIONAL_CATEGORIES } from '../../utils/elementarySubjects.js'
import { 
  parseGradesFromClass,
  detectGradeFromClassName, 
  populateSubjectFromPreset, 
  populateSubjectFromPresets,
  findElementaryPreset, 
  findElementaryPresets 
} from '../../composables/useElementary.js'
import ExpectationImportModal from './ExpectationImportModal.vue'

const { activeClass, updateActiveClass } = useClassroom()

const showAddModal = ref(false)
const showExpectationModal = ref(false)
const activeImportSubject = ref(null)
const expandedStrandSubjectId = ref(null)
const expandedCategorySubjectId = ref(null)

function cleanUnitName(name) {
  if (!name) return ''
  return name.replace(/^\[Grade\s*\d+\]\s*/i, '').trim()
}

function saveStrandName(subjectId, unitId, newName) {
  const clean = cleanUnitName(newName)
  if (!clean) return
  const updated = currentSubjects.value.map(s => {
    if (s.subjectId !== subjectId) return s
    const units = (s.gradebookUnits || []).map(u => u.unitId === unitId ? { ...u, name: clean } : u)
    return { ...s, gradebookUnits: units }
  })
  updateActiveClass({ subjects: updated })
}

const newSubject = ref({
  name: '',
  code: '',
  icon: '📚',
  gradingFramework: 'sbar'
})

const currentSubjects = computed(() => {
  if (!activeClass.value || !activeClass.value.subjects) return DEFAULT_ELEMENTARY_SUBJECTS
  return activeClass.value.subjects
})

const parsedGrades = computed(() => parseGradesFromClass(activeClass.value?.gradeLevel || activeClass.value?.name || ''))
const detectedGrade = computed(() => parsedGrades.value.join('/') || 'Grade Level')

function getSubjectPresetMatches(sub) {
  if (!sub || !parsedGrades.value.length) return []
  return findElementaryPresets(parsedGrades.value, sub.code, sub.name)
}

function getSubjectPresetMatch(sub) {
  const matches = getSubjectPresetMatches(sub)
  return matches.length > 0 ? matches[0] : null
}

function autoPopulateSubject(sub) {
  const presets = getSubjectPresetMatches(sub)
  if (!presets || presets.length === 0) return
  const populated = populateSubjectFromPresets(sub, presets, 'all')
  const updated = currentSubjects.value.map(s => s.subjectId === sub.subjectId ? populated : s)
  updateActiveClass({ subjects: updated })
}

function openExpectationModal(sub) {
  activeImportSubject.value = sub
  showExpectationModal.value = true
}

async function handleExpectationImport(payload) {
  const targetSubId = payload.targetSubjectId || activeImportSubject.value?.subjectId
  if (!targetSubId) return

  const existing = currentSubjects.value.map(sub => {
    if (sub.subjectId !== targetSubId) return sub

    if (payload.mode === 'auto-units') {
      return populateSubjectFromPreset(sub, payload.preset, payload.granularity)
    }

    if (payload.mode === 'attach-expectations') {
      let units = [...(sub.gradebookUnits || [])]
      let targetUnitId = payload.targetUnitChoice

      if (targetUnitId === 'new') {
        targetUnitId = `unit_${Date.now()}`
        units.push({ unitId: targetUnitId, name: payload.newUnitName || 'Unit 1', weight: 0 })
      }

      const existingExps = [...(sub.expectations || [])]
      const newExps = (payload.expectations || []).map(e => ({
        expectationId: `exp_${Date.now()}_${e.code}`,
        unitId: targetUnitId,
        code: e.code,
        description: e.description,
        isOverall: e.isOverall ?? false
      }))

      return {
        ...sub,
        gradebookUnits: units,
        expectations: [...existingExps, ...newExps]
      }
    }

    return sub
  })

  await updateActiveClass({ subjects: existing })
  showExpectationModal.value = false
}

function isSubjectActive(subjectId) {
  return currentSubjects.value.some(s => s.subjectId === subjectId)
}

function formatAlgorithmName(algo) {
  switch (algo) {
    case 'power_law': return 'Power Law'
    case 'mode': return 'Mode / Most Frequent'
    case 'most_recent': return 'Most Recent'
    case 'highest': return 'Highest Mark'
    default: return 'Decaying Average'
  }
}

function formatFrameworkLabel(fw) {
  switch (fw) {
    case 'traditional': return 'Traditional (%)'
    case 'sbar_power_law': return 'SBAR — Power Law'
    case 'sbar_mode': return 'SBAR — Mode'
    case 'sbar_most_recent': return 'SBAR — Most Recent'
    case 'sbar_highest': return 'SBAR — Highest'
    default: return 'SBAR — Decaying Average'
  }
}

async function togglePreset(preset) {
  const existing = [...currentSubjects.value]
  const idx = existing.findIndex(s => s.subjectId === preset.subjectId)
  if (idx >= 0) {
    if (existing.length <= 1) return // Don't allow removing last subject
    existing.splice(idx, 1)
  } else {
    const toAdd = JSON.parse(JSON.stringify(preset))
    const presets = getSubjectPresetMatches(toAdd)
    const populated = presets.length > 0 ? populateSubjectFromPresets(toAdd, presets, 'all') : toAdd
    existing.push(populated)
  }
  await updateActiveClass({ subjects: existing })
}

function getSubjectTotalWeight(sub) {
  const cats = (sub.gradebookCategories && sub.gradebookCategories.length > 0)
    ? sub.gradebookCategories
    : DEFAULT_TRADITIONAL_CATEGORIES
  return cats.reduce((sum, c) => sum + (c.weight || 0), 0)
}

async function addSubjectCategory(subjectId) {
  const existing = currentSubjects.value.map(s => {
    if (s.subjectId === subjectId) {
      const cats = (s.gradebookCategories && s.gradebookCategories.length > 0)
        ? [...s.gradebookCategories]
        : JSON.parse(JSON.stringify(DEFAULT_TRADITIONAL_CATEGORIES))
      cats.push({
        categoryId: crypto.randomUUID(),
        name: 'New Category',
        weight: 0
      })
      return { ...s, gradebookCategories: cats }
    }
    return s
  })
  await updateActiveClass({ subjects: existing })
}

async function removeSubjectCategory(subjectId, categoryId) {
  const existing = currentSubjects.value.map(s => {
    if (s.subjectId === subjectId) {
      const baseCats = (s.gradebookCategories && s.gradebookCategories.length > 0)
        ? s.gradebookCategories
        : DEFAULT_TRADITIONAL_CATEGORIES
      const cats = baseCats.filter(c => c.categoryId !== categoryId)
      return { ...s, gradebookCategories: cats }
    }
    return s
  })
  await updateActiveClass({ subjects: existing })
}

async function saveSubjectCategories(subjectId) {
  const existing = currentSubjects.value.map(s => {
    if (s.subjectId === subjectId) {
      if (!s.gradebookCategories || s.gradebookCategories.length === 0) {
        s.gradebookCategories = JSON.parse(JSON.stringify(DEFAULT_TRADITIONAL_CATEGORIES))
      }
    }
    return s
  })
  await updateActiveClass({ subjects: existing })
}

async function updateSubjectFramework(subjectId, framework) {
  const existing = currentSubjects.value.map(s => {
    if (s.subjectId === subjectId) {
      const updated = { ...s, gradingFramework: framework }
      if (framework === 'traditional' && (!updated.gradebookCategories || updated.gradebookCategories.length === 0)) {
        updated.gradebookCategories = JSON.parse(JSON.stringify(DEFAULT_TRADITIONAL_CATEGORIES))
      }
      return updated
    }
    return s
  })
  await updateActiveClass({ subjects: existing })
}

async function removeSubject(subjectId) {
  if (currentSubjects.value.length <= 1) return
  const existing = currentSubjects.value.filter(s => s.subjectId !== subjectId)
  await updateActiveClass({ subjects: existing })
}

async function saveCustomSubject() {
  if (!newSubject.value.name.trim()) return
  const created = {
    subjectId: `subj_${Date.now()}`,
    name: newSubject.value.name.trim(),
    code: (newSubject.value.code || newSubject.value.name.slice(0, 4)).toUpperCase(),
    icon: newSubject.value.icon || '📚',
    gradingFramework: newSubject.value.gradingFramework || 'sbar',
    sbarAlgorithm: 'decaying_average',
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits: []
  }
  const existing = [...currentSubjects.value, created]
  await updateActiveClass({ subjects: existing })
  showAddModal.value = false
  newSubject.value = { name: '', code: '', icon: '📚', gradingFramework: 'sbar' }
}
</script>

<style scoped>
.elementary-subjects {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  padding: 20px;
}

.elementary-subjects__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.elementary-subjects__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.elementary-subjects__subtitle {
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.elementary-subjects__btn-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary, #3b82f6);
  color: white;
  border: none;
  border-radius: var(--radius-sm, 8px);
  padding: 8px 14px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.elementary-subjects__btn-add:hover {
  opacity: 0.88;
}

.elementary-subjects__presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--surface-2, rgba(0,0,0,0.03));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  padding: 12px;
}

.elementary-subjects__preset-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.elementary-subjects__preset-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.elementary-subjects__preset-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.elementary-subjects__preset-pill:hover {
  border-color: var(--primary);
  color: var(--text);
}

.elementary-subjects__preset-pill--active {
  background: var(--primary-light, rgba(59, 130, 246, 0.1));
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.elementary-subjects__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.elementary-subjects__card {
  display: flex;
  flex-direction: column;
  background: var(--surface-2, rgba(0,0,0,0.02));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 10px);
  padding: 12px 16px;
  transition: border-color 0.15s;
  box-sizing: border-box;
  width: 100%;
}

.elementary-subjects__card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.elementary-subjects__card--active {
  border-color: var(--primary);
}

.elementary-subjects__card-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.elementary-subjects__card-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.elementary-subjects__card-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text);
}

.elementary-subjects__card-code {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: 4px;
}

.elementary-subjects__card-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.elementary-subjects__tag {
  display: inline-block;
  background: var(--surface-2);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 500;
}

.elementary-subjects__btn-auto {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: var(--state-present, #10b981);
  padding: 6px 12px;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.elementary-subjects__btn-auto:hover {
  background: rgba(16, 185, 129, 0.22);
}

.elementary-subjects__card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.elementary-subjects__select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  color: var(--text);
  padding: 6px 10px;
  font-size: 0.8rem;
}

.elementary-subjects__btn-delete {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 6px;
  cursor: pointer;
  border-radius: var(--radius-sm, 6px);
  transition: all 0.15s;
}

.elementary-subjects__btn-delete:hover:not(:disabled) {
  color: var(--state-out, #ef4444);
  background: rgba(239, 68, 68, 0.08);
}

.elementary-subjects__btn-delete:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Modal */
.elementary-subjects__modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.elementary-subjects__modal-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 12px);
  width: 100%;
  max-width: 400px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}

.elementary-subjects__modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.elementary-subjects__form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.elementary-subjects__form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.elementary-subjects__input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  padding: 8px 12px;
  color: var(--text);
  font-size: 0.9rem;
}

.elementary-subjects__modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.elementary-subjects__btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 8px 14px;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: all 0.15s;
}

.elementary-subjects__btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.elementary-subjects__strands-editor {
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
}

.elementary-subjects__strands-header {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.elementary-subjects__strand-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.elementary-subjects__strand-grade {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.elementary-subjects__strand-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
  font-size: 0.82rem;
  color: var(--text);
}

.elementary-subjects__btn-primary {
  background: var(--primary, #3b82f6);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: var(--radius-sm, 6px);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.elementary-subjects__btn-primary:hover {
  opacity: 0.88;
}

.elementary-subjects__btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
