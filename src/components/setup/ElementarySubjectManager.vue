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
                <span class="elementary-subjects__tag">
                  {{ (sub.expectations?.length || 0) }} Expectations ({{ (sub.gradebookUnits?.length || 0) }} Strands{{ getSubjectGrades(sub).length > 1 ? ' • ' + getSubjectGrades(sub).map(g => formatGradeLabel(g)).join('/') : '' }})
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
              v-else-if="!sub.expectations || sub.expectations.length === 0"
              type="button" 
              class="elementary-subjects__btn-ghost"
              style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; padding: 6px 12px; white-space: nowrap; flex-shrink: 0;"
              title="Import Curriculum Expectations"
              @click="openExpectationModal(sub)"
            >
              <Zap :size="14" /> Import Expectations
            </button>

            <button
              v-if="sub.expectations && sub.expectations.length > 0"
              type="button"
              class="elementary-subjects__btn-ghost"
              style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 5px 8px; white-space: nowrap; flex-shrink: 0;"
              title="View & Edit Curriculum Expectations"
              @click="expandedStrandSubjectId = expandedStrandSubjectId === sub.subjectId ? null : sub.subjectId"
            >
              <ChevronDown :size="13" :style="{ transform: expandedStrandSubjectId === sub.subjectId ? 'rotate(180deg)' : 'none' }" />
              <span style="white-space: nowrap;">Expectations ({{ sub.expectations?.length || 0 }})</span>
            </button>

            <button
              v-if="sub.gradingFramework === 'traditional'"
              type="button"
              class="elementary-subjects__btn-ghost"
              style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 5px 8px; white-space: nowrap; flex-shrink: 0;"
              title="Edit Category Weights"
              @click="expandedCategorySubjectId = expandedCategorySubjectId === sub.subjectId ? null : sub.subjectId"
            >
              <ChevronDown :size="13" :style="{ transform: expandedCategorySubjectId === sub.subjectId ? 'rotate(180deg)' : 'none' }" />
              <span style="white-space: nowrap;">Categories ({{ (sub.gradebookCategories && sub.gradebookCategories.length > 0 ? sub.gradebookCategories : DEFAULT_TRADITIONAL_CATEGORIES).length }})</span>
            </button>

            <select 
              :value="sub.gradingFramework || 'sbar'"
              class="elementary-subjects__select"
              @change="e => updateSubjectFramework(sub.subjectId, e.target.value)"
            >
              <optgroup label="Standards-Based (SBAR)">
                <option value="sbar">SBAR (Decaying Avg)</option>
                <option value="sbar_power_law">SBAR (Power Law)</option>
                <option value="sbar_mode">SBAR (Mode)</option>
                <option value="sbar_most_recent">SBAR (Most Recent)</option>
                <option value="sbar_highest">SBAR (Highest Level)</option>
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

        <!-- Expandable Strand & Expectations Editor -->
        <div v-if="expandedStrandSubjectId === sub.subjectId" class="elementary-subjects__strands-editor">
          <div class="elementary-subjects__strands-header-row" style="display: flex; justify-content: space-between; align-items: center; wrap: wrap; gap: 8px;">
            <strong style="font-size: 0.85rem;">Strands &amp; Expectations for {{ sub.name }}:</strong>
            <div style="display: flex; gap: 6px;">
              <button 
                type="button" 
                class="elementary-subjects__btn-ghost" 
                style="font-size: 0.75rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 5px;"
                title="Import from Ontario curriculum presets, CSV, JSON, or text"
                @click="openExpectationModal(sub)"
              >
                <BookOpen :size="13" /> Import Expectations
              </button>
              <button 
                v-if="sub.expectations && sub.expectations.length > 0" 
                type="button" 
                class="elementary-subjects__btn-delete" 
                style="font-size: 0.75rem; padding: 3px 8px;"
                @click="clearSubjectExpectations(sub.subjectId)"
              >
                <Trash2 :size="12" /> Clear {{ (selectedGradeFilters[sub.subjectId] && selectedGradeFilters[sub.subjectId] !== 'all') ? formatGradeLabel(selectedGradeFilters[sub.subjectId]) : 'All' }} ({{ (selectedGradeFilters[sub.subjectId] && selectedGradeFilters[sub.subjectId] !== 'all') ? getSubjectExpectationCountForGrade(sub, selectedGradeFilters[sub.subjectId]) : (sub.expectations?.length || 0) }})
              </button>
            </div>
          </div>

          <div v-if="(!sub.gradebookUnits || sub.gradebookUnits.length === 0) && (!sub.expectations || sub.expectations.length === 0)" style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic; padding: 6px 0;">
            No strands or expectations configured yet. Click <strong>Import Expectations</strong> or <strong>+ Add Strand / Unit</strong> below to begin.
          </div>

          <!-- Toolbar Row: Grade Filter Pills & Search Bar -->
          <div v-if="getSubjectGrades(sub).length > 1 || (sub.expectations?.length || 0) > 5" class="elementary-subjects__toolbar-row">
            <!-- Grade Filter Pills (shown when subject has 2+ distinct grades) -->
            <div v-if="getSubjectGrades(sub).length > 1" class="elementary-subjects__grade-pills">
              <button 
                type="button" 
                :class="['elementary-subjects__grade-pill', (selectedGradeFilters[sub.subjectId] || 'all') === 'all' ? 'elementary-subjects__grade-pill--active' : '']"
                @click="selectedGradeFilters[sub.subjectId] = 'all'"
              >
                All ({{ sub.expectations?.length || 0 }})
              </button>
              <button 
                v-for="grade in getSubjectGrades(sub)" 
                :key="grade"
                :class="['elementary-subjects__grade-pill', selectedGradeFilters[sub.subjectId] === grade ? 'elementary-subjects__grade-pill--active' : '']"
                @click="selectedGradeFilters[sub.subjectId] = grade"
              >
                {{ formatGradeLabel(grade) }} ({{ getSubjectExpectationCountForGrade(sub, grade) }})
              </button>
            </div>

            <!-- Search Bar for Strands/Expectations (if subject has > 5 expectations) -->
            <div v-if="(sub.expectations?.length || 0) > 5" class="elementary-subjects__search-container">
              <div class="elementary-subjects__search-box">
                <Search :size="13" class="elementary-subjects__search-icon" />
                <input 
                  v-model="strandSearchQuery" 
                  type="text" 
                  class="elementary-subjects__search-input" 
                  placeholder="Search strand, code, or description..." 
                />
                <button v-if="strandSearchQuery" type="button" class="elementary-subjects__search-clear" @click="strandSearchQuery = ''">
                  <X :size="12" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty state when grade filter has no strands -->
          <div v-if="getFilteredUnits(sub).length === 0 && (sub.gradebookUnits?.length || 0) > 0" style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic; padding: 16px 0; text-align: center;">
            No strands found for {{ formatGradeLabel(selectedGradeFilters[sub.subjectId]) }}.
          </div>

          <!-- Strands List -->
          <div v-for="unit in getFilteredUnits(sub)" :key="unit.unitId" class="elementary-subjects__strand-block">
            <div class="elementary-subjects__strand-row">
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
              <button 
                type="button" 
                class="elementary-subjects__btn-delete"
                title="Remove Strand"
                @click="removeStrandUnit(sub.subjectId, unit.unitId)"
              >
                <Trash2 :size="14" />
              </button>
            </div>

            <!-- Expectations under this strand -->
            <div class="elementary-subjects__exp-list">
              <div 
                v-for="exp in getUnitExpectations(sub, unit)" 
                :key="exp.expectationId" 
                class="elementary-subjects__exp-item"
                :class="{ 'elementary-subjects__exp-item--editing': editingExpId === exp.expectationId }"
              >
                <!-- Inline Edit Form -->
                <template v-if="editingExpId === exp.expectationId">
                  <div class="elementary-subjects__inline-edit-form">
                    <input 
                      v-model="editingExpCode" 
                      type="text" 
                      class="elementary-subjects__exp-input-code" 
                      placeholder="Code (A1.1)" 
                      @keydown.enter="saveEditExp(sub.subjectId, exp)"
                      @keydown.esc="cancelEditExp"
                    />
                    <input 
                      v-model="editingExpDesc" 
                      type="text" 
                      class="elementary-subjects__exp-input-desc" 
                      placeholder="Expectation description..." 
                      @keydown.enter="saveEditExp(sub.subjectId, exp)"
                      @keydown.esc="cancelEditExp"
                    />
                    <button 
                      type="button" 
                      class="elementary-subjects__btn-save-inline" 
                      title="Save Changes" 
                      @click="saveEditExp(sub.subjectId, exp)"
                    >
                      <Check :size="13" />
                    </button>
                    <button 
                      type="button" 
                      class="elementary-subjects__btn-ghost" 
                      style="font-size: 0.75rem; padding: 2px 6px;" 
                      title="Cancel" 
                      @click="cancelEditExp"
                    >
                      <X :size="13" />
                    </button>
                  </div>
                </template>

                <!-- Normal View -->
                <template v-else>
                  <span class="elementary-subjects__exp-code">{{ exp.code }}</span>
                  <span class="elementary-subjects__exp-desc">{{ exp.description }}</span>
                  <div class="elementary-subjects__exp-actions">
                    <button 
                      type="button" 
                      class="elementary-subjects__btn-ghost" 
                      style="font-size: 0.75rem; padding: 2px 6px;" 
                      title="Edit Expectation" 
                      @click="startEditExp(exp)"
                    >
                      <Edit2 :size="12" />
                    </button>
                    <button 
                      type="button" 
                      class="elementary-subjects__btn-delete" 
                      title="Delete Expectation" 
                      @click="removeExpectation(sub.subjectId, exp.expectationId)"
                    >
                      <Trash2 :size="12" />
                    </button>
                  </div>
                </template>
              </div>

              <!-- Inline Add Expectation Form -->
              <div class="elementary-subjects__add-exp-form">
                <input 
                  v-model="newExpForms[`${sub.subjectId}_${unit.unitId}_code`]"
                  type="text" 
                  class="elementary-subjects__exp-input-code" 
                  placeholder="Code (A1.1)" 
                />
                <input 
                  v-model="newExpForms[`${sub.subjectId}_${unit.unitId}_desc`]"
                  type="text" 
                  class="elementary-subjects__exp-input-desc" 
                  placeholder="Expectation description..." 
                  @keydown.enter="submitAddExp(sub.subjectId, unit.unitId)"
                />
                <button 
                  type="button" 
                  class="elementary-subjects__btn-ghost" 
                  style="font-size: 0.75rem; padding: 2px 8px;"
                  @click="submitAddExp(sub.subjectId, unit.unitId)"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          <!-- Unassigned / General Expectations Block -->
          <div v-if="getUnassignedExpectations(sub).length > 0" class="elementary-subjects__strand-block">
            <div class="elementary-subjects__strand-header" style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary);">
              Additional Subject Expectations:
            </div>
            <div class="elementary-subjects__exp-list">
              <div 
                v-for="exp in getUnassignedExpectations(sub)" 
                :key="exp.expectationId" 
                class="elementary-subjects__exp-item"
                :class="{ 'elementary-subjects__exp-item--editing': editingExpId === exp.expectationId }"
              >
                <!-- Inline Edit Form -->
                <template v-if="editingExpId === exp.expectationId">
                  <div class="elementary-subjects__inline-edit-form">
                    <input 
                      v-model="editingExpCode" 
                      type="text" 
                      class="elementary-subjects__exp-input-code" 
                      placeholder="Code (B1)" 
                      @keydown.enter="saveEditExp(sub.subjectId, exp)"
                      @keydown.esc="cancelEditExp"
                    />
                    <input 
                      v-model="editingExpDesc" 
                      type="text" 
                      class="elementary-subjects__exp-input-desc" 
                      placeholder="Expectation description..." 
                      @keydown.enter="saveEditExp(sub.subjectId, exp)"
                      @keydown.esc="cancelEditExp"
                    />
                    <button 
                      type="button" 
                      class="elementary-subjects__btn-save-inline" 
                      title="Save Changes" 
                      @click="saveEditExp(sub.subjectId, exp)"
                    >
                      <Check :size="13" />
                    </button>
                    <button 
                      type="button" 
                      class="elementary-subjects__btn-ghost" 
                      style="font-size: 0.75rem; padding: 2px 6px;" 
                      title="Cancel" 
                      @click="cancelEditExp"
                    >
                      <X :size="13" />
                    </button>
                  </div>
                </template>

                <!-- Normal View -->
                <template v-else>
                  <span class="elementary-subjects__exp-code">{{ exp.code }}</span>
                  <span class="elementary-subjects__exp-desc">{{ exp.description }}</span>
                  <div class="elementary-subjects__exp-actions">
                    <button 
                      type="button" 
                      class="elementary-subjects__btn-ghost" 
                      style="font-size: 0.75rem; padding: 2px 6px;" 
                      title="Edit Expectation" 
                      @click="startEditExp(exp)"
                    >
                      <Edit2 :size="12" />
                    </button>
                    <button 
                      type="button" 
                      class="elementary-subjects__btn-delete" 
                      title="Delete Expectation" 
                      @click="removeExpectation(sub.subjectId, exp.expectationId)"
                    >
                      <Trash2 :size="12" />
                    </button>
                  </div>
                </template>
              </div>

              <!-- Inline Add Unassigned Expectation Form -->
              <div class="elementary-subjects__add-exp-form">
                <input 
                  v-model="newExpForms[`${sub.subjectId}_general_code`]"
                  type="text" 
                  class="elementary-subjects__exp-input-code" 
                  placeholder="Code (B1)" 
                />
                <input 
                  v-model="newExpForms[`${sub.subjectId}_general_desc`]"
                  type="text" 
                  class="elementary-subjects__exp-input-desc" 
                  placeholder="Expectation description..." 
                  @keydown.enter="submitAddExp(sub.subjectId, 'general')"
                />
                <button 
                  type="button" 
                  class="elementary-subjects__btn-ghost" 
                  style="font-size: 0.75rem; padding: 2px 8px;"
                  @click="submitAddExp(sub.subjectId, 'general')"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-start;">
            <button type="button" class="elementary-subjects__btn-ghost" style="font-size: 0.8rem; padding: 4px 10px;" @click="addStrandUnit(sub.subjectId)">
              + Add Strand / Unit
            </button>
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
      :existing-count="activeImportSubject?.expectations?.length || 0"
      :initial-preset-id="getSubjectPresetMatch(activeImportSubject)?.presetId"
      :class-type="'elementary'"
      @import="handleExpectationImport"
      @clear="handleClearFromModal"
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
import { ref, computed, reactive } from 'vue'
import { Plus, Check, Trash2, Zap, BookOpen, ChevronDown, Edit2, X, Search } from 'lucide-vue-next'
import SubjectIcon from '../SubjectIcon.vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'
import { DEFAULT_ELEMENTARY_SUBJECTS, DEFAULT_TRADITIONAL_CATEGORIES } from '../../utils/elementarySubjects.js'
import { 
  getAssessmentsByClass, 
  getGradesByClass, 
  getExpectationUsageCounts, 
  cascadeRenameExpectation, 
  detachExpectationFromAssessmentsAndGrades 
} from '../../db/gradebookService.js'
import { detachEventsForDeletedExpectation } from '../../db/eventService.js'
import { 
  parseGradesFromClass,
  detectGradeFromClassName, 
  populateSubjectFromPreset, 
  populateSubjectFromPresets,
  findElementaryPreset, 
  findElementaryPresets,
  cleanUnitName
} from '../../composables/useElementary.js'

import ExpectationImportModal from './ExpectationImportModal.vue'
import { useMessage } from '../../composables/useMessage.js'
import { cleanExpectationText } from '../../utils/textUtils.js'

const { confirm: confirmMessage } = useMessage()

const { activeClass, updateActiveClass } = useClassroom()

const showAddModal = ref(false)
const showExpectationModal = ref(false)
const activeImportSubject = ref(null)
const expandedStrandSubjectId = ref(null)
const expandedCategorySubjectId = ref(null)
const newExpForms = reactive({})

const strandSearchQuery = ref('')
const editingExpId = ref(null)
const editingExpCode = ref('')
const editingExpDesc = ref('')

function startEditExp(exp) {
  editingExpId.value = exp.expectationId
  editingExpCode.value = exp.code || ''
  editingExpDesc.value = exp.description || ''
}

function cancelEditExp() {
  editingExpId.value = null
  editingExpCode.value = ''
  editingExpDesc.value = ''
}

async function saveEditExp(subjectId, exp) {
  const newCode = (editingExpCode.value || '').trim().toUpperCase()
  const newDesc = (editingExpDesc.value || '').trim()
  if (!newCode) return

  const oldCode = (exp.code || '').trim().toUpperCase()
  const codeChanged = oldCode && oldCode !== newCode

  if (codeChanged && activeClass.value?.classId) {
    const usage = await getExpectationUsageCounts(activeClass.value.classId, oldCode, exp.expectationId)
    if (usage.totalCount > 0) {
      const ok = await confirmMessage(
        `Expectation code changed from "${oldCode}" to "${newCode}". Update ${usage.assessmentCount} assessment(s), ${usage.gradeCount} student score(s), and ${usage.eventCount} observation(s) across the class?`,
        `Rename Expectation — ${oldCode}`,
        { confirmLabel: 'Update & Cascade Rename' }
      )
      if (!ok) return

      await cascadeRenameExpectation(activeClass.value.classId, oldCode, newCode, exp.expectationId)
    }
  }

  const cleanCode = cleanExpectationText(newCode).toUpperCase()
  const cleanDesc = cleanExpectationText(newDesc)

  const updated = currentSubjects.value.map(s => {
    if (s.subjectId !== subjectId) return s
    const exps = (s.expectations || []).map(e => {
      if (e.expectationId === exp.expectationId) {
        return { ...e, code: cleanCode, description: cleanDesc }
      }
      return e
    })
    return { ...s, expectations: exps }
  })

  cancelEditExp()
  await updateActiveClass({ subjects: updated })
}

const selectedGradeFilters = reactive({})

function getSubjectGrades(sub) {
  if (!sub) return []
  const grades = new Set()
  if (sub.gradebookUnits) {
    sub.gradebookUnits.forEach(u => {
      if (u.gradeLevel && typeof u.gradeLevel === 'string') {
        const clean = u.gradeLevel.trim()
        if (clean) grades.add(clean)
      }
    })
  }
  if (sub.expectations) {
    sub.expectations.forEach(e => {
      if (e.gradeLevel && typeof e.gradeLevel === 'string') {
        const clean = e.gradeLevel.trim()
        if (clean) grades.add(clean)
      }
    })
  }
  return Array.from(grades).sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, '') || '0', 10)
    const numB = parseInt(b.replace(/[^0-9]/g, '') || '0', 10)
    if (numA !== numB) return numA - numB
    return a.localeCompare(b)
  })
}

function formatGradeLabel(grade) {
  if (!grade) return 'Grade'
  const trimmed = grade.trim()
  if (/^grade\s*\d+/i.test(trimmed)) {
    return trimmed.replace(/^grade\s*/i, 'Gr ')
  }
  if (/^\d+$/.test(trimmed)) {
    return `Gr ${trimmed}`
  }
  return trimmed
}

function getSubjectExpectationCountForGrade(sub, grade) {
  if (!sub || !sub.expectations) return 0
  if (grade === 'all') return sub.expectations.length

  const gNorm = (grade || '').toLowerCase().trim()
  const gNum = grade.replace(/[^0-9]/g, '')
  const matchingUnits = new Set(
    (sub.gradebookUnits || [])
      .filter(u => {
        const uG = (u.gradeLevel || '').toLowerCase().trim()
        return uG === gNorm || (gNum && uG.replace(/[^0-9]/g, '') === gNum)
      })
      .map(u => u.unitId)
  )

  return sub.expectations.filter(e => {
    const eG = (e.gradeLevel || '').toLowerCase().trim()
    if (eG === gNorm || (gNum && eG.replace(/[^0-9]/g, '') === gNum)) return true
    if (e.unitId && matchingUnits.has(e.unitId)) return true
    return false
  }).length
}

function getFilteredUnits(sub) {
  if (!sub || !sub.gradebookUnits) return []
  const filter = selectedGradeFilters[sub.subjectId] || 'all'
  if (filter === 'all') return sub.gradebookUnits

  const gNorm = filter.toLowerCase().trim()
  const gNum = filter.replace(/[^0-9]/g, '')

  return sub.gradebookUnits.filter(u => {
    const uG = (u.gradeLevel || '').toLowerCase().trim()
    if (uG === gNorm) return true
    if (gNum && uG.replace(/[^0-9]/g, '') === gNum) return true

    // Check if unit has expectations for this grade
    const unitExps = (sub.expectations || []).filter(e => e.unitId === u.unitId)
    if (unitExps.some(e => {
      const eG = (e.gradeLevel || '').toLowerCase().trim()
      return eG === gNorm || (gNum && eG.replace(/[^0-9]/g, '') === gNum)
    })) {
      return true
    }

    return false
  })
}

function getUnitExpectations(sub, unit) {
  if (!sub || !sub.expectations) return []
  const uId = unit.unitId
  const uNameLower = (cleanUnitName(unit.name) || '').toLowerCase()
  const q = strandSearchQuery.value.toLowerCase().trim()
  const filter = selectedGradeFilters[sub.subjectId] || 'all'
  const gNorm = filter.toLowerCase().trim()
  const gNum = filter.replace(/[^0-9]/g, '')

  return sub.expectations.filter(e => {
    let matchesUnit = false
    if (e.unitId && e.unitId === uId) matchesUnit = true
    else if (e.strandName && cleanUnitName(e.strandName).toLowerCase() === uNameLower) matchesUnit = true
    else if (e.code && uNameLower && uNameLower.length > 0) {
      const strandLetter = uNameLower.charAt(0).toUpperCase()
      if (/^[A-Z]/.test(strandLetter) && e.code.toUpperCase().startsWith(strandLetter)) {
        matchesUnit = true
      }
    }

    if (!matchesUnit) return false

    if (filter !== 'all') {
      const eG = (e.gradeLevel || '').toLowerCase().trim()
      const uG = (unit.gradeLevel || '').toLowerCase().trim()
      if (eG && eG !== gNorm && (!gNum || eG.replace(/[^0-9]/g, '') !== gNum)) return false
      if (!eG && uG && uG !== gNorm && (!gNum || uG.replace(/[^0-9]/g, '') !== gNum)) return false
    }

    if (!q) return true
    return (e.code || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q) || uNameLower.includes(q)
  })
}

function getUnassignedExpectations(sub) {
  if (!sub || !sub.expectations || sub.expectations.length === 0) return []
  const assignedIds = new Set()
  if (sub.gradebookUnits) {
    sub.gradebookUnits.forEach(u => {
      const uId = u.unitId
      const uNameLower = (cleanUnitName(u.name) || '').toLowerCase()
      sub.expectations.forEach(e => {
        if (e.unitId && e.unitId === uId) assignedIds.add(e.expectationId)
        else if (e.strandName && cleanUnitName(e.strandName).toLowerCase() === uNameLower) assignedIds.add(e.expectationId)
        else if (e.code && uNameLower && uNameLower.length > 0) {
          const strandLetter = uNameLower.charAt(0).toUpperCase()
          if (/^[A-Z]/.test(strandLetter) && e.code.toUpperCase().startsWith(strandLetter)) {
            assignedIds.add(e.expectationId)
          }
        }
      })
    })
  }

  const unassigned = sub.expectations.filter(e => !assignedIds.has(e.expectationId))
  const filter = selectedGradeFilters[sub.subjectId] || 'all'
  const gNorm = filter.toLowerCase().trim()
  const gNum = filter.replace(/[^0-9]/g, '')

  return unassigned.filter(e => {
    if (filter !== 'all') {
      const eG = (e.gradeLevel || '').toLowerCase().trim()
      if (eG && eG !== gNorm && (!gNum || eG.replace(/[^0-9]/g, '') !== gNum)) return false
    }
    const q = strandSearchQuery.value.toLowerCase().trim()
    if (!q) return true
    return (e.code || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q)
  })
}

async function removeExpectation(subjectId, expectationId) {
  const sub = currentSubjects.value.find(s => s.subjectId === subjectId)
  if (!sub) return
  
  const targetExp = (sub.expectations || []).find(e => e.expectationId === expectationId)
  if (!targetExp) return

  const classId = activeClass.value?.classId
  if (classId) {
    const usage = await getExpectationUsageCounts(classId, targetExp.code, expectationId)
    if (usage.totalCount > 0) {
      const ok = await confirmMessage(
        `Delete expectation "${targetExp.code}"? Warning: It is referenced in ${usage.assessmentCount} assessment(s), ${usage.gradeCount} recorded student score(s), and ${usage.eventCount} observation(s). Deleting it will detach it from future grading calculations.`,
        `Delete Assessed Expectation — ${targetExp.code}`,
        { confirmLabel: 'Delete Expectation', danger: true }
      )
      if (!ok) return

      await detachExpectationFromAssessmentsAndGrades(classId, targetExp.code, expectationId)
      await detachEventsForDeletedExpectation(classId, expectationId)
    } else {
      if (!await confirmMessage(`Delete expectation "${targetExp.code || 'this expectation'}"?`)) return
    }
  }

  const updated = currentSubjects.value.map(s => {
    if (s.subjectId !== subjectId) return s
    const exps = (s.expectations || []).filter(e => e.expectationId !== expectationId)
    return { ...s, expectations: exps }
  })
  await updateActiveClass({ subjects: updated })
}

function addExpectationToUnit(subjectId, unitId, code, description) {
  if (!code.trim() && !description.trim()) return
  const currentGrade = selectedGradeFilters[subjectId]
  const sub = currentSubjects.value.find(s => s.subjectId === subjectId)
  const unit = sub?.gradebookUnits?.find(u => u.unitId === unitId)
  const gradeLevel = unit?.gradeLevel || ((currentGrade && currentGrade !== 'all') ? currentGrade : undefined)

  const newExp = {
    expectationId: crypto.randomUUID(),
    code: code.trim().toUpperCase(),
    description: description.trim(),
    gradeLevel,
    unitId: unitId === 'general' ? undefined : unitId
  }
  const updated = currentSubjects.value.map(s => {
    if (s.subjectId !== subjectId) return s
    const exps = [...(s.expectations || []), newExp]
    return { ...s, expectations: exps }
  })
  updateActiveClass({ subjects: updated })
}

function submitAddExp(subjectId, unitId) {
  const codeKey = `${subjectId}_${unitId}_code`
  const descKey = `${subjectId}_${unitId}_desc`
  const code = newExpForms[codeKey] || ''
  const desc = newExpForms[descKey] || ''
  if (!code.trim() && !desc.trim()) return
  addExpectationToUnit(subjectId, unitId, code, desc)
  newExpForms[codeKey] = ''
  newExpForms[descKey] = ''
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

async function addStrandUnit(subjectId) {
  const currentGrade = selectedGradeFilters[subjectId]
  const gradeLevel = (currentGrade && currentGrade !== 'all') ? currentGrade : undefined

  const existing = currentSubjects.value.map(s => {
    if (s.subjectId === subjectId) {
      const units = s.gradebookUnits ? [...s.gradebookUnits] : []
      units.push({
        unitId: `unit_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        name: `Strand ${units.length + 1}`,
        gradeLevel,
        weight: 0
      })
      return { ...s, gradebookUnits: units }
    }
    return s
  })
  await updateActiveClass({ subjects: existing })
}

async function removeStrandUnit(subjectId, unitId) {
  const classId = activeClass.value?.classId
  if (classId) {
    try {
      const assessments = await getAssessmentsByClass(classId)
      const hasAssessments = assessments.some(a => (a.subjectId === subjectId || !a.subjectId) && a.unitId === unitId)
      if (hasAssessments) {
        const sub = currentSubjects.value.find(s => s.subjectId === subjectId)
        const unit = sub?.gradebookUnits?.find(u => u.unitId === unitId)
        await confirmMessage(
          `Cannot delete strand "${unit?.name || 'this strand'}" because it has assessments assigned to it. Remove or reassign all assessments in this strand before deleting.`,
          `Strand in Use`,
          { confirmLabel: 'OK' }
        )
        return
      }
    } catch (e) {
      console.warn('Failed checking assessments for strand deletion', e)
    }
  }

  const existing = currentSubjects.value.map(s => {
    if (s.subjectId === subjectId) {
      const units = (s.gradebookUnits || []).filter(u => u.unitId !== unitId)
      return { ...s, gradebookUnits: units }
    }
    return s
  })
  await updateActiveClass({ subjects: existing })
}

async function removeSubjectCategory(subjectId, categoryId) {
  const classId = activeClass.value?.classId
  if (classId) {
    try {
      const assessments = await getAssessmentsByClass(classId)
      const hasAssessments = assessments.some(a => (a.subjectId === subjectId || !a.subjectId) && a.categoryId === categoryId)
      if (hasAssessments) {
        const sub = currentSubjects.value.find(s => s.subjectId === subjectId)
        const cat = (sub?.gradebookCategories || DEFAULT_TRADITIONAL_CATEGORIES).find(c => c.categoryId === categoryId)
        await confirmMessage(
          `Cannot delete category "${cat?.name || 'this category'}" because it has assessments assigned to it. Remove or reassign all assessments in this category before deleting.`,
          `Category in Use`,
          { confirmLabel: 'OK' }
        )
        return
      }
    } catch (e) {
      console.warn('Failed checking assessments for category deletion', e)
    }
  }

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

const newSubject = ref({
  name: '',
  code: '',
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
  openExpectationModal(sub)
}

function openExpectationModal(sub) {
  activeImportSubject.value = sub
  showExpectationModal.value = true
}

async function clearSubjectExpectations(subjectId) {
  const sub = currentSubjects.value.find(s => s.subjectId === subjectId)
  if (!sub) return
  const activeGrade = selectedGradeFilters[subjectId]
  const isFiltered = activeGrade && activeGrade !== 'all'
  const gradeLabel = isFiltered ? formatGradeLabel(activeGrade) : ''
  const count = isFiltered ? getSubjectExpectationCountForGrade(sub, activeGrade) : (sub.expectations?.length || 0)

  const ok = await confirmMessage(
    isFiltered
      ? `Clear all ${count} ${gradeLabel} expectations for ${sub.name}? (Expectations for other grades will be preserved)`
      : `Clear all ${count} expectations for ${sub.name}?`,
    `Clear Expectations — ${sub.name}`,
    { confirmLabel: isFiltered ? `Clear ${gradeLabel} Expectations` : 'Clear All Expectations', danger: true }
  )
  if (!ok) return

  const updated = currentSubjects.value.map(s => {
    if (s.subjectId === subjectId) {
      if (isFiltered) {
        const gNorm = activeGrade.toLowerCase().trim()
        const gNum = activeGrade.replace(/[^0-9]/g, '')
        const matchingUnits = new Set(
          (s.gradebookUnits || [])
            .filter(u => {
              const uG = (u.gradeLevel || '').toLowerCase().trim()
              return uG === gNorm || (gNum && uG.replace(/[^0-9]/g, '') === gNum)
            })
            .map(u => u.unitId)
        )
        const keptExps = (s.expectations || []).filter(e => {
          const eG = (e.gradeLevel || '').toLowerCase().trim()
          if (eG === gNorm || (gNum && eG.replace(/[^0-9]/g, '') === gNum)) return false
          if (e.unitId && matchingUnits.has(e.unitId)) return false
          return true
        })
        return { ...s, expectations: keptExps }
      } else {
        return { ...s, expectations: [] }
      }
    }
    return s
  })
  await updateActiveClass({ subjects: updated })
}

async function handleClearFromModal() {
  if (!activeImportSubject.value) return
  await clearSubjectExpectations(activeImportSubject.value.subjectId)
  showExpectationModal.value = false
}

async function handleExpectationImport(payload) {
  const targetSubId = payload.targetSubjectId || activeImportSubject.value?.subjectId
  if (!targetSubId) return

  const existing = currentSubjects.value.map(sub => {
    if (sub.subjectId !== targetSubId) return sub

    const isReplace = payload.importBehavior === 'replace'
    const targetSub = isReplace ? { ...sub, gradebookUnits: [], expectations: [] } : sub

    if (payload.mode === 'auto-units') {
      return populateSubjectFromPreset(targetSub, payload.preset, payload.granularity)
    }

    if (payload.mode === 'auto-paste-strands') {
      const units = isReplace ? [] : [...(sub.gradebookUnits || [])]
      const existingExps = isReplace ? [] : [...(sub.expectations || [])]
      const newExps = []

      payload.strands.forEach((s, sIdx) => {
        let targetUnit = units.find(u => cleanUnitName(u.name).toLowerCase() === cleanUnitName(s.name).toLowerCase())
        if (!targetUnit) {
          targetUnit = {
            unitId: `unit_${Date.now()}_${sIdx}`,
            name: cleanExpectationText(s.name),
            weight: 0
          }
          units.push(targetUnit)
        }

        (s.expectations || []).forEach(e => {
          newExps.push({
            expectationId: `exp_${Date.now()}_${e.code}`,
            unitId: targetUnit.unitId,
            code: cleanExpectationText(e.code),
            description: cleanExpectationText(e.description),
            isOverall: e.isOverall ?? false
          })
        })
      })

      return {
        ...sub,
        gradebookUnits: units,
        expectations: [...existingExps, ...newExps]
      }
    }

    if (payload.mode === 'attach-expectations') {
      let units = isReplace ? [] : [...(sub.gradebookUnits || [])]
      let targetUnitId = payload.targetUnitChoice

      if (targetUnitId === 'new' || !targetUnitId) {
        targetUnitId = `unit_${Date.now()}`
        units.push({ unitId: targetUnitId, name: cleanExpectationText(payload.newUnitName || 'Unit 1'), weight: 0 })
      }

      const existingExps = isReplace ? [] : [...(sub.expectations || [])]
      const newExps = (payload.expectations || []).map(e => ({
        expectationId: `exp_${Date.now()}_${e.code}`,
        unitId: targetUnitId,
        code: cleanExpectationText(e.code),
        description: cleanExpectationText(e.description),
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
    await removeSubject(preset.subjectId)
  } else {
    const toAdd = JSON.parse(JSON.stringify(preset))
    const presets = getSubjectPresetMatches(toAdd)
    const populated = presets.length > 0 ? populateSubjectFromPresets(toAdd, presets, 'all') : toAdd
    existing.push(populated)
    await updateActiveClass({ subjects: existing })
  }
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
  if (currentSubjects.value.length <= 1) {
    await confirmMessage(
      'Homeroom rosters must retain at least one active subject. Please add another subject before removing this one.',
      'Cannot Remove Subject'
    )
    return
  }

  const sub = currentSubjects.value.find(s => s.subjectId === subjectId)
  if (!sub) return

  const expCount = sub.expectations?.length || 0
  const strandCount = sub.gradebookUnits?.length || 0

  let asmtCount = 0
  if (activeClass.value?.classId) {
    try {
      const asmts = await getAssessmentsByClass(activeClass.value.classId)
      asmtCount = asmts.filter(a => a.subjectId === subjectId || a.subject === sub.name).length
    } catch (e) {
      console.warn('Could not check subject assessments:', e)
    }
  }

  let confirmMsg = `Are you sure you want to remove ${sub.name}?`
  if (expCount > 0 || strandCount > 0 || asmtCount > 0) {
    const details = []
    if (asmtCount > 0) details.push(`${asmtCount} gradebook assessment(s)`)
    if (expCount > 0) details.push(`${expCount} expectation(s)`)
    if (strandCount > 0) details.push(`${strandCount} strand(s)/unit(s)`)
    confirmMsg = `Remove ${sub.name}? Warning: This subject has ${details.join(', ')} configured. Removing it will delete all units, strands, categories, expectations, and grade data for this subject.`
  }

  const ok = await confirmMessage(
    confirmMsg,
    `Remove Subject — ${sub.name}`,
    { confirmLabel: 'Remove Subject', danger: true }
  )
  if (!ok) return

  const existing = currentSubjects.value.filter(s => s.subjectId !== subjectId)
  await updateActiveClass({ subjects: existing })
}

async function saveCustomSubject() {
  if (!newSubject.value.name.trim()) return
  const created = {
    subjectId: `subj_${Date.now()}`,
    name: newSubject.value.name.trim(),
    code: (newSubject.value.code || newSubject.value.name.slice(0, 4)).toUpperCase(),
    gradingFramework: newSubject.value.gradingFramework || 'sbar',
    sbarAlgorithm: 'decaying_average',
    sbarInputMode: 'fine',
    gradebookCategories: [],
    gradebookUnits: []
  }
  const existing = [...currentSubjects.value, created]
  await updateActiveClass({ subjects: existing })
  showAddModal.value = false
  newSubject.value = { name: '', code: '', gradingFramework: 'sbar' }
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
  gap: 12px;
  flex-wrap: wrap;
}

.elementary-subjects__card--active {
  border-color: var(--primary);
}

.elementary-subjects__card-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
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
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.elementary-subjects__select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  color: var(--text);
  padding: 5px 8px;
  font-size: 0.78rem;
  font-weight: 500;
  max-width: 175px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}

.elementary-subjects__btn-delete {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 5px;
  cursor: pointer;
  border-radius: var(--radius-sm, 6px);
  transition: all 0.15s;
  flex-shrink: 0;
}

.elementary-subjects__btn-delete:hover:not(:disabled) {
  color: var(--state-out, #ef4444);
  background: rgba(239, 68, 68, 0.08);
}

.elementary-subjects__btn-delete:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.elementary-subjects__btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 5px 8px;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
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

.elementary-subjects__strand-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.elementary-subjects__exp-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 4px;
}

.elementary-subjects__exp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
}

.elementary-subjects__exp-code {
  font-weight: 700;
  font-size: 0.72rem;
  color: var(--primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.elementary-subjects__exp-desc {
  flex: 1;
  color: var(--text);
  line-height: 1.3;
}

.elementary-subjects__add-exp-form {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.elementary-subjects__exp-input-code {
  width: 90px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text);
}

.elementary-subjects__exp-input-desc {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px 6px;
  font-size: 0.78rem;
  color: var(--text);
}

/* Search Box */
.elementary-subjects__search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}
.elementary-subjects__search-icon {
  position: absolute;
  left: 8px;
  color: var(--text-secondary);
  pointer-events: none;
}
.elementary-subjects__search-input {
  width: 100%;
  padding: 4px 26px 4px 28px;
  font-size: 0.78rem;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text);
  box-sizing: border-box;
}
.elementary-subjects__search-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
}

.elementary-subjects__search-clear {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.elementary-subjects__search-clear:hover {
  color: var(--text);
  background: var(--bg-hover);
}

/* Toolbar & Grade Pills */
.elementary-subjects__toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.elementary-subjects__grade-pills {
  display: inline-flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  padding: 3px;
  gap: 3px;
}

.elementary-subjects__grade-pill {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.elementary-subjects__grade-pill:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.elementary-subjects__grade-pill--active {
  background: var(--primary);
  color: #ffffff !important;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.elementary-subjects__search-container {
  flex: 1;
  min-width: 200px;
}

/* Expectation Actions & Inline Edit */
.elementary-subjects__exp-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.elementary-subjects__exp-item--editing {
  background: var(--bg-hover);
  border-color: var(--primary);
  padding: 4px 6px;
}
.elementary-subjects__inline-edit-form {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.elementary-subjects__btn-save-inline {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.elementary-subjects__btn-save-inline:hover {
  background: #10b981;
  color: #ffffff;
}
</style>

