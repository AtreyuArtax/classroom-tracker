<template>
  <BaseModal
    :show="showAddAssessmentModal"
    @close="closeAddAssessment"
    :title="isEditingAssessment ? 'Edit Assessment' : 'New Assessment'"
    max-width="750px"
    :z-index="3000"
  >
    <form class="modal-form modal-form--wide" @submit.prevent="saveAssessment">
      <div class="modal-body-grid">
        <!-- LEFT COLUMN: Metadata & Setup -->
        <div class="modal-col modal-col--left">
          <!-- Target Scope Toggle -->
          <div class="form-group">
            <label class="form-label">Scope</label>
            <div class="toggle-group toggle-group--large">
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': newAssessment.target === 'class' }"
                @click="newAssessment.target = 'class'; onTargetChange()"
              >Class Assessment</button>
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': newAssessment.target === 'individual' }"
                @click="newAssessment.target = 'individual'; onTargetChange()"
              >Individual Assessment</button>
            </div>
          </div>

          <!-- Assessment Purpose (Formative vs Summative - SBAR Mode Only) -->
          <div class="form-group" v-if="activeClassRecord?.gradingFramework === 'sbar'">
            <label class="form-label">Assessment Purpose</label>
            <div class="toggle-group toggle-group--large">
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': (newAssessment.purpose || 'summative') === 'summative' }"
                @click="newAssessment.purpose = 'summative'; newAssessment.isFormative = false"
              >
                Summative (Official)
              </button>
              <button 
                type="button" 
                class="toggle-btn" 
                :class="{ 'toggle-btn--active': newAssessment.purpose === 'formative' }"
                @click="newAssessment.purpose = 'formative'; newAssessment.isFormative = true"
              >
                Formative (Practice)
              </button>
            </div>
          </div>

          <!-- Student Picker (Individual Only) -->
          <div v-if="newAssessment.target === 'individual'" class="form-group">
            <label class="form-label">Target Student</label>
            <select v-model="newAssessment.targetStudentId" class="form-input" required>
              <option :value="null" disabled>Select student...</option>
              <option v-for="s in sortedRoster" :key="s.studentId" :value="s.studentId">
                {{ s.lastName }}, {{ s.firstName }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Name *</label>
            <input v-model="newAssessment.name" class="form-input" placeholder="e.g. Unit 1 Test" required />
          </div>

          <!-- Date & Evidence Type / Category -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input v-model="newAssessment.date" type="date" class="form-input" required />
            </div>

            <div class="form-group" v-if="activeClassRecord?.gradingFramework === 'sbar'">
              <label class="form-label">Evidence Type</label>
              <select v-model="newAssessment.assessmentType" class="form-input" required>
                <option value="product">Product (Test/Lab)</option>
                <option value="observation">Observation (Practical)</option>
                <option value="conversation">Conversation (Oral)</option>
              </select>
            </div>

            <div class="form-group" v-else>
              <label class="form-label">Category</label>
              <select v-model="newAssessment.categoryId" class="form-input" required>
                <option v-for="cat in activeClassRecord?.gradebookCategories" :key="cat.categoryId" :value="cat.categoryId">
                  {{ cat.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Unit & Retest Policy (Traditional Mode) -->
          <div class="form-row" v-if="activeClassRecord?.gradingFramework !== 'sbar'">
            <div class="form-group">
              <label class="form-label">Unit</label>
              <select 
                v-model="newAssessment.unitId" 
                class="form-input"
                :disabled="!activeClassRecord?.gradebookUnits?.length"
              >
                <option :value="null">Unassigned</option>
                <option v-for="u in filteredUnits" :key="u.unitId" :value="u.unitId">
                  {{ selectedGradeFilter === 'all' && u.gradeLevel ? '[' + u.gradeLevel + '] ' + u.name : u.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Retest Policy</label>
              <select v-model="newAssessment.retestPolicy" class="form-input">
                <option value="highest">Highest Attempt</option>
                <option value="latest">Latest Attempt</option>
                <option value="average">Average of Attempts</option>
                <option value="manual">Manual Selection</option>
              </select>
            </div>
          </div>

          <!-- Unit Field (SBAR Mode: Retest Policy Hidden) -->
          <div class="form-group" v-else>
            <label class="form-label">Unit</label>
            <select 
              v-model="newAssessment.unitId" 
              class="form-input"
              :disabled="!activeClassRecord?.gradebookUnits?.length"
            >
              <option :value="null">Unassigned</option>
              <option v-for="u in filteredUnits" :key="u.unitId" :value="u.unitId">
                {{ selectedGradeFilter === 'all' && u.gradeLevel ? '[' + u.gradeLevel + '] ' + u.name : u.name }}
              </option>
            </select>
          </div>

          <!-- Traditional Points Fields (Non-SBAR Mode Only) -->
          <div v-if="activeClassRecord?.gradingFramework !== 'sbar'" class="form-row">
            <div class="form-group">
              <label class="form-label">Total Points</label>
              <input v-model.number="newAssessment.totalPoints" type="number" min="1" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Scaled Total (Optional)</label>
              <input v-model.number="newAssessment.scaledTotal" type="number" min="1" class="form-input" placeholder="Raw" />
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Curriculum Standards Tagging & Description -->
        <div class="modal-col modal-col--right">
          <!-- Expectation Tagging -->
          <div v-if="allAvailableExpectations.length" class="form-group exp-section">
            <div class="exp-section-header">
              <label class="form-label">Tagged Standards (Expectations)</label>
              <span class="exp-count-badge" v-if="selectedExpCount > 0">{{ selectedExpCount }} selected</span>
            </div>

            <!-- Split Class Grade Filter Pills -->
            <div v-if="availableGradeFilters.length > 1" class="exp-grade-filters">
              <button
                v-for="gFilter in availableGradeFilters"
                :key="gFilter"
                type="button"
                class="exp-grade-btn"
                :class="{ 'exp-grade-btn--active': selectedGradeFilter === gFilter }"
                @click="selectedGradeFilter = gFilter"
              >
                {{ gFilter === 'all' ? 'All Grades' : gFilter }}
              </button>
            </div>

            <div class="exp-pill-selector">
              <label 
                v-for="exp in filteredAvailableExpectations" 
                :key="exp.code"
                class="exp-checkbox-pill"
                :class="{ 'exp-checkbox-pill--active': isExpSelected(exp.code) }"
              >
                <input 
                  type="checkbox" 
                  :value="exp.code"
                  :checked="isExpSelected(exp.code)"
                  @change="toggleExpSelection(exp.code)"
                  style="display: none;"
                />
                <span v-if="exp.gradeLevel" class="exp-grade-tag">{{ exp.gradeLevel.replace('Grade ', 'Gr ') }}</span>
                <span class="exp-code-pill">{{ exp.code }}</span>
                <span class="exp-desc-pill">{{ exp.name || exp.description }}</span>
              </label>
            </div>
          </div>
          <div v-else class="form-group exp-section">
            <label class="form-label">Tagged Standards (Expectations)</label>
            <div class="exp-empty-box">
              <BookOpen :size="20" class="exp-empty-icon" />
              <div>
                <div>No expectations loaded for <strong>{{ activeClassRecord?.activeSubjectName || 'this subject' }}</strong> yet.</div>
                <div class="exp-empty-sub">Load expectations under Setup ➔ Class Settings ➔ Subject Expectations.</div>
              </div>
            </div>
          </div>

          <!-- Description (Optional) -->
          <div class="form-group">
            <label class="form-label">Description (Optional)</label>
            <textarea 
              v-model="newAssessment.description" 
              class="form-input form-textarea" 
              placeholder="Extra details about this assessment task..." 
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Footer Modal Actions -->
      <div class="modal-actions">
        <button type="button" class="btn-ghost" @click="closeAddAssessment">Cancel</button>
        <button type="submit" class="btn-primary">{{ isEditingAssessment ? 'Update Assessment' : 'Create Assessment' }}</button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { BookOpen } from 'lucide-vue-next'
import {
  showAddAssessmentModal,
  isEditingAssessment,
  newAssessment,
  assessmentTypes,
  sortedUnits,
  activeClassRecord,
  activeGradeFilter,
  closeAddAssessment,
  onTargetChange,
  saveAssessment
} from '../../composables/useGradebook.js'
import { useClassroom } from '../../composables/useClassroom.js'
import BaseModal from '../BaseModal.vue'

import { getEffectiveClassRecord } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'

const { sortedRoster } = useClassroom()

const effectiveClass = computed(() => {
  if (!activeClassRecord.value) return null
  if (activeClassRecord.value.classType === 'elementary') {
    return getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
  }
  return activeClassRecord.value
})

const allAvailableExpectations = computed(() => {
  const cls = effectiveClass.value
  if (!cls) return []

  const expMap = {}

  // 1. From gradebookUnits
  if (cls.gradebookUnits && Array.isArray(cls.gradebookUnits)) {
    cls.gradebookUnits.forEach(u => {
      const uGrade = u.gradeLevel || (u.name && u.name.includes('Grade 7') ? 'Grade 7' : (u.name && u.name.includes('Grade 8') ? 'Grade 8' : ''))
      ;(u.expectations || []).forEach(e => {
        if (!e.code) return
        const key = `${u.unitId}::${e.code}`
        expMap[key] = {
          ...e,
          unitId: e.unitId || u.unitId,
          gradeLevel: e.gradeLevel || uGrade
        }
      })
    })
  }

  // 2. From flat expectations list
  const flatExps = cls.expectations || cls.curriculumExpectations || []
  if (flatExps.length > 0) {
    flatExps.forEach(e => {
      if (!e.code) return
      const key = `${e.unitId || 'flat'}::${e.code}`
      if (!expMap[key]) {
        expMap[key] = { ...e }
      }
    })
  }

  const list = Object.values(expMap)
  if (list.length > 0) return list

  if (cls.classType !== 'elementary') {
    return [
      { code: 'A1.1', name: 'Inquiry & Experimentation', description: 'Formulate hypotheses and execute laboratory inquiries.' },
      { code: 'A1.2', name: 'Data Analysis', description: 'Analyze experimental data using statistical tools.' },
      { code: 'B2.1', name: 'Kinematics Equations', description: 'Apply 1D/2D displacement and velocity equations.' },
      { code: 'B2.2', name: 'Force & Motion', description: 'Evaluate Newton laws of motion in dynamics problems.' },
      { code: 'C1.1', name: 'Conservation of Energy', description: 'Calculate kinetic, potential, and thermal energy transfers.' }
    ]
  }

  return []
})

const selectedGradeFilter = ref('all')

const availableGradeFilters = computed(() => {
  const grades = new Set(allAvailableExpectations.value.map(e => e.gradeLevel).filter(Boolean))
  if (grades.size <= 1) return []
  return ['all', ...Array.from(grades).sort()]
})

watch(showAddAssessmentModal, (open) => {
  if (open) {
    if (activeGradeFilter.value && availableGradeFilters.value.includes(activeGradeFilter.value)) {
      selectedGradeFilter.value = activeGradeFilter.value
    } else {
      selectedGradeFilter.value = 'all'
    }
    if (!newAssessment.value.categoryId && activeClassRecord.value?.gradebookCategories?.length > 0) {
      newAssessment.value.categoryId = activeClassRecord.value.gradebookCategories[0].categoryId
    }
  }
}, { immediate: true })

const filteredUnits = computed(() => {
  let units = sortedUnits.value || []
  if (selectedGradeFilter.value !== 'all' && availableGradeFilters.value.length > 1) {
    const targetG = selectedGradeFilter.value.toLowerCase()
    units = units.filter(u => {
      const uGrade = u.gradeLevel || (u.name && u.name.includes('Grade 7') ? 'Grade 7' : (u.name && u.name.includes('Grade 8') ? 'Grade 8' : ''))
      if (uGrade && uGrade.toLowerCase() === targetG) return true
      if (u.expectations && u.expectations.some(e => e.gradeLevel && e.gradeLevel.toLowerCase() === targetG)) return true
      return !uGrade
    })
  }
  return units
})

watch(selectedGradeFilter, () => {
  if (newAssessment.value.unitId) {
    const exists = filteredUnits.value.some(u => String(u.unitId) === String(newAssessment.value.unitId))
    if (!exists) {
      newAssessment.value.unitId = null
    }
  }
})

const filteredAvailableExpectations = computed(() => {
  let list = allAvailableExpectations.value

  // 1. Filter by Grade Pill (if split class)
  if (selectedGradeFilter.value !== 'all' && availableGradeFilters.value.length > 1) {
    const targetG = selectedGradeFilter.value.toLowerCase()
    list = list.filter(e => e.gradeLevel && e.gradeLevel.toLowerCase() === targetG)
  }

  // 2. Filter by Selected Unit / Strand Dropdown
  if (newAssessment.value.unitId) {
    const selectedUnitIdStr = String(newAssessment.value.unitId)
    list = list.filter(e => e.unitId && String(e.unitId) === selectedUnitIdStr)
  }

  // Prefer specific expectations (e.g. A1.1, A1.2) over overalls if specifics exist
  const specifics = list.filter(e => e.code && e.code.includes('.'))
  return specifics.length > 0 ? specifics : list
})

const selectedExpCount = computed(() => {
  if (Array.isArray(newAssessment.value.expectationIds)) {
    return newAssessment.value.expectationIds.length
  }
  return newAssessment.value.expectationId ? 1 : 0
})

function isExpSelected(code) {
  if (Array.isArray(newAssessment.value.expectationIds)) {
    return newAssessment.value.expectationIds.includes(code)
  }
  return newAssessment.value.expectationId === code
}

function toggleExpSelection(code) {
  if (!Array.isArray(newAssessment.value.expectationIds)) {
    newAssessment.value.expectationIds = newAssessment.value.expectationId ? [newAssessment.value.expectationId] : []
  }
  const idx = newAssessment.value.expectationIds.indexOf(code)
  if (idx > -1) {
    newAssessment.value.expectationIds.splice(idx, 1)
  } else {
    newAssessment.value.expectationIds.push(code)
  }
  newAssessment.value.expectationId = newAssessment.value.expectationIds[0] || null
}
</script>

<style scoped>
.modal-form--wide {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-body-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 700px) {
  .modal-body-grid {
    grid-template-columns: 1fr;
  }
}

.modal-col {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.form-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  font-size: 0.9rem;
  color: var(--text);
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-textarea {
  resize: vertical;
  min-height: 85px;
}

.toggle-group {
  display: flex;
  background: var(--bg-secondary);
  padding: 3px;
  border-radius: var(--radius-md);
  gap: 3px;
}

.toggle-btn {
  flex: 1;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.toggle-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.exp-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exp-count-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.12);
  padding: 2px 8px;
  border-radius: 12px;
}

.exp-grade-filters {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.exp-grade-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.exp-grade-btn:hover {
  color: var(--text);
  border-color: var(--primary);
}

.exp-grade-btn--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.exp-grade-tag {
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.15);
  color: var(--primary);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.exp-pill-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px;
  background: var(--bg-secondary);
}

.exp-checkbox-pill {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.82rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.exp-checkbox-pill:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.exp-checkbox-pill--active {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--primary);
  color: var(--primary);
}

.exp-code-pill {
  font-weight: 700;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.exp-empty-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.83rem;
  line-height: 1.4;
}

.exp-empty-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
  opacity: 0.7;
}

.exp-empty-sub {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
  margin-top: 2px;
}

.exp-checkbox-pill--active .exp-code-pill {
  background: var(--primary);
  color: white;
}

.exp-desc-pill {
  line-height: 1.35;
  flex: 1;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}

.btn-ghost {
  flex: 1;
  padding: 0.65rem;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  flex: 2;
  padding: 0.65rem;
  border: none;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius-md);
  font-weight: 700;
  cursor: pointer;
}
</style>
