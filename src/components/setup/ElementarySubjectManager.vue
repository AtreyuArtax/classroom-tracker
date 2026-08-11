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
              type="button"
              class="elementary-subjects__btn-ghost"
              style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; padding: 6px 10px;"
              title="Edit Strand & Unit Names"
              @click="expandedStrandSubjectId = expandedStrandSubjectId === sub.subjectId ? null : sub.subjectId"
            >
              <ChevronDown :size="14" :style="{ transform: expandedStrandSubjectId === sub.subjectId ? 'rotate(180deg)' : 'none' }" />
              <span>Strands ({{ sub.gradebookUnits?.length || 0 }})</span>
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

        <!-- Expandable Strand & Expectations Editor -->
        <div v-if="expandedStrandSubjectId === sub.subjectId" class="elementary-subjects__strands-editor">
          <div class="elementary-subjects__strands-header-row" style="display: flex; justify-content: space-between; align-items: center; wrap: wrap; gap: 8px;">
            <strong style="font-size: 0.85rem;">Strands &amp; Expectations for {{ sub.name }}:</strong>
            <div style="display: flex; gap: 6px;">
              <button 
                type="button" 
                class="elementary-subjects__btn-auto" 
                style="font-size: 0.75rem; padding: 3px 8px;"
                @click="openExpectationModal(sub)"
              >
                <Zap :size="12" /> Preset / Importer
              </button>
              <button 
                v-if="sub.expectations && sub.expectations.length > 0" 
                type="button" 
                class="elementary-subjects__btn-delete" 
                style="font-size: 0.75rem; padding: 3px 8px;"
                @click="clearSubjectExpectations(sub.subjectId)"
              >
                <Trash2 :size="12" /> Clear All ({{ sub.expectations.length }})
              </button>
            </div>
          </div>

          <div v-if="(!sub.gradebookUnits || sub.gradebookUnits.length === 0) && (!sub.expectations || sub.expectations.length === 0)" style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic; padding: 6px 0;">
            No strands or expectations configured yet. Click <strong>Preset / Importer</strong> or <strong>+ Add Strand / Unit</strong> below to begin.
          </div>

          <!-- Strands List -->
          <div v-for="unit in (sub.gradebookUnits || [])" :key="unit.unitId" class="elementary-subjects__strand-block">
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
              <div v-for="exp in getUnitExpectations(sub, unit)" :key="exp.expectationId" class="elementary-subjects__exp-item">
                <span class="elementary-subjects__exp-code">{{ exp.code }}</span>
                <span class="elementary-subjects__exp-desc">{{ exp.description }}</span>
                <button 
                  type="button" 
                  class="elementary-subjects__btn-delete" 
                  title="Delete Expectation" 
                  @click="removeExpectation(sub.subjectId, exp.expectationId)"
                >
                  <Trash2 :size="12" />
                </button>
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
              <div v-for="exp in getUnassignedExpectations(sub)" :key="exp.expectationId" class="elementary-subjects__exp-item">
                <span class="elementary-subjects__exp-code">{{ exp.code }}</span>
                <span class="elementary-subjects__exp-desc">{{ exp.description }}</span>
                <button 
                  type="button" 
                  class="elementary-subjects__btn-delete" 
                  title="Delete Expectation" 
                  @click="removeExpectation(sub.subjectId, exp.expectationId)"
                >
                  <Trash2 :size="12" />
                </button>
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
import { ref, computed, reactive } from 'vue'
import { Plus, Check, Trash2, Zap, BookOpen, ChevronDown } from 'lucide-vue-next'
import SubjectIcon from '../SubjectIcon.vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'
import { DEFAULT_ELEMENTARY_SUBJECTS, DEFAULT_TRADITIONAL_CATEGORIES } from '../../utils/elementarySubjects.js'
import { getAssessmentsByClass } from '../../db/gradebookService.js'
import { 
  parseGradesFromClass,
  detectGradeFromClassName, 
  populateSubjectFromPreset, 
  populateSubjectFromPresets,
  findElementaryPreset, 
  findElementaryPresets 
} from '../../composables/useElementary.js'
import ExpectationImportModal from './ExpectationImportModal.vue'
import { useMessage } from '../../composables/useMessage.js'

const { confirm: confirmMessage } = useMessage()

const { activeClass, updateActiveClass } = useClassroom()

const showAddModal = ref(false)
const showExpectationModal = ref(false)
const activeImportSubject = ref(null)
const expandedStrandSubjectId = ref(null)
const expandedCategorySubjectId = ref(null)
const newExpForms = reactive({})

function getUnitExpectations(sub, unit) {
  if (!sub || !sub.expectations) return []
  const uId = unit.unitId
  const uNameLower = (cleanUnitName(unit.name) || '').toLowerCase()
  return sub.expectations.filter(e => {
    if (e.unitId && e.unitId === uId) return true
    if (e.strandName && cleanUnitName(e.strandName).toLowerCase() === uNameLower) return true
    if (e.code && uNameLower && uNameLower.length > 0) {
      const strandLetter = uNameLower.charAt(0).toUpperCase()
      if (/^[A-Z]/.test(strandLetter) && e.code.toUpperCase().startsWith(strandLetter)) {
        return true
      }
    }
    return false
  })
}

function getUnassignedExpectations(sub) {
  if (!sub || !sub.expectations || sub.expectations.length === 0) return []
  const assignedIds = new Set()
  if (sub.gradebookUnits) {
    sub.gradebookUnits.forEach(u => {
      getUnitExpectations(sub, u).forEach(e => assignedIds.add(e.expectationId))
    })
  }
  return sub.expectations.filter(e => !assignedIds.has(e.expectationId))
}

async function removeExpectation(subjectId, expectationId) {
  const sub = currentSubjects.value.find(s => s.subjectId === subjectId)
  if (!sub) return
  
  const targetExp = (sub.expectations || []).find(e => e.expectationId === expectationId)
  if (!targetExp) return

  // Check if any recorded grade or assessment refers to this expectation
  const classId = activeClass.value?.classId
  let hasRecordedGrades = false

  if (classId) {
    try {
      const [assessments, grades] = await Promise.all([
        getAssessmentsByClass(classId),
        getGradesByClass(classId)
      ])

      const expCodeUpper = (targetExp.code || '').toUpperCase()

      // Check recorded student grades
      const usedInGrades = grades.some(g => {
        if (g.expectationScores) {
          return Object.keys(g.expectationScores).some(k => k.toUpperCase() === expCodeUpper || k === expectationId)
        }
        return false
      })

      // Check assessment configs
      const usedInAssessments = assessments.some(a => {
        if (a.expectationIds && a.expectationIds.includes(expectationId)) return true
        if (a.expectationCodes && a.expectationCodes.map(c => c.toUpperCase()).includes(expCodeUpper)) return true
        return false
      })

      hasRecordedGrades = usedInGrades || usedInAssessments
    } catch (e) {
      console.warn('Failed checking grades before expectation deletion', e)
    }
  }

  if (hasRecordedGrades) {
    const ok = await confirmMessage(
      `Expectation "${targetExp.code}" has recorded student grades. Deleting it will remove it from future grading grids and curriculum reports, but existing logs will remain in database history. Do you want to proceed?`,
      `Delete Expectation — ${targetExp.code}`,
      { confirmLabel: 'Delete Expectation', danger: true }
    )
    if (!ok) return
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
  const newExp = {
    expectationId: crypto.randomUUID(),
    code: code.trim().toUpperCase(),
    description: description.trim(),
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

async function addStrandUnit(subjectId) {
  const existing = currentSubjects.value.map(s => {
    if (s.subjectId === subjectId) {
      const units = s.gradebookUnits ? [...s.gradebookUnits] : []
      units.push({
        unitId: `unit_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        name: `Strand ${units.length + 1}`,
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
  openExpectationModal(sub)
}

function openExpectationModal(sub) {
  activeImportSubject.value = sub
  showExpectationModal.value = true
}

async function clearSubjectExpectations(subjectId) {
  const sub = currentSubjects.value.find(s => s.subjectId === subjectId)
  if (!sub) return
  const ok = await confirmMessage(
    `Clear all ${sub.expectations?.length || 0} expectations for ${sub.name}?`,
    `Clear Expectations — ${sub.name}`,
    { confirmLabel: 'Clear Expectations', danger: true }
  )
  if (!ok) return

  const updated = currentSubjects.value.map(s => {
    if (s.subjectId === subjectId) {
      return { ...s, expectations: [] }
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

    if (payload.mode === 'attach-expectations') {
      let units = isReplace ? [] : [...(sub.gradebookUnits || [])]
      let targetUnitId = payload.targetUnitChoice

      if (targetUnitId === 'new' || !targetUnitId) {
        targetUnitId = `unit_${Date.now()}`
        units.push({ unitId: targetUnitId, name: payload.newUnitName || 'Unit 1', weight: 0 })
      }

      const existingExps = isReplace ? [] : [...(sub.expectations || [])]
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
</style>
