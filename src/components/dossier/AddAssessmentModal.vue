<template>
  <BaseModal
    :show="showAddAssessmentModal"
    @close="closeAddAssessment"
    :title="isEditingAssessment ? 'Edit Assessment' : 'New Assessment'"
    max-width="500px"
    :z-index="3000"
  >
    <form class="modal-form" @submit.prevent="saveAssessment">
      <!-- Target Toggle -->
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
        <label class="form-label">Name</label>
        <input v-model="newAssessment.name" class="form-input" placeholder="e.g. Unit 1 Test" required />
      </div>
      
      <div class="form-group">
        <label class="form-label">Description (Optional)</label>
        <textarea v-model="newAssessment.description" class="form-input" placeholder="Extra details about this assessment..." rows="2"></textarea>
      </div>

      <!-- Traditional Mode Fields: Category & Points -->
      <template v-if="activeClassRecord?.gradingFramework !== 'sbar'">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Category</label>
            <select v-model="newAssessment.categoryId" class="form-input" required>
              <option v-for="cat in activeClassRecord?.gradebookCategories" :key="cat.categoryId" :value="cat.categoryId">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select v-model="newAssessment.assessmentType" class="form-input" required>
              <option v-for="type in assessmentTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date</label>
            <input v-model="newAssessment.date" type="date" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Unit</label>
            <select 
              v-model="newAssessment.unitId" 
              class="form-input"
              :disabled="!activeClassRecord?.gradebookUnits?.length"
            >
              <option :value="null">Unassigned</option>
              <option v-for="u in sortedUnits" :key="u.unitId" :value="u.unitId">
                {{ u.name }}
              </option>
            </select>
          </div>
        </div>
      </template>

      <!-- SBAR Dedicated Mode Fields -->
      <template v-else>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Evidence Type (Triangulation)</label>
            <select v-model="newAssessment.assessmentType" class="form-input" required>
              <option value="product">Product (Test, Lab, Assignment)</option>
              <option value="observation">Observation (Classroom Lab, Practical)</option>
              <option value="conversation">Conversation (Oral Interview, Discussion)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date</label>
            <input v-model="newAssessment.date" type="date" class="form-input" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Unit</label>
          <select 
            v-model="newAssessment.unitId" 
            class="form-input"
            :disabled="!activeClassRecord?.gradebookUnits?.length"
          >
            <option :value="null">Unassigned</option>
            <option v-for="u in sortedUnits" :key="u.unitId" :value="u.unitId">
              {{ u.name }}
            </option>
          </select>
        </div>
      </template>

      <!-- Expectation Tagging (Optional Multi-Select) -->
      <div v-if="allAvailableExpectations.length" class="form-group">
        <label class="form-label">Curriculum Expectations Tagged (Target Standards)</label>
        <div class="exp-pill-selector">
          <label 
            v-for="exp in allAvailableExpectations" 
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
            <strong>{{ exp.code }}</strong> — {{ exp.name || exp.description }}
          </label>
        </div>
      </div>

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

      <div class="form-group">
        <label class="form-label">Retest Policy</label>
        <select v-model="newAssessment.retestPolicy" class="form-input">
          <option value="highest">Highest Attempt</option>
          <option value="latest">Latest Attempt</option>
          <option value="average">Average of Attempts</option>
          <option value="manual">Manual Selection</option>
        </select>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-ghost" @click="closeAddAssessment">Cancel</button>
        <button type="submit" class="btn-primary">{{ isEditingAssessment ? 'Update Assessment' : 'Create Assessment' }}</button>
      </div>
    </form>
  </BaseModal>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import {
  showAddAssessmentModal,
  isEditingAssessment,
  newAssessment,
  assessmentTypes,
  sortedUnits,
  activeClassRecord,
  closeAddAssessment,
  onTargetChange,
  saveAssessment
} from '../../composables/useGradebook.js'
import { useClassroom } from '../../composables/useClassroom.js'
import BaseModal from '../BaseModal.vue'

const { sortedRoster } = useClassroom()

const unitExpectations = computed(() => {
  if (!newAssessment.value.unitId || !activeClassRecord.value?.gradebookUnits) return []
  const unit = activeClassRecord.value.gradebookUnits.find(u => u.unitId === newAssessment.value.unitId)
  const rawExps = unit?.expectations || []
  const hasSpecifics = rawExps.some(e => e.code && e.code.includes('.'))
  if (hasSpecifics) {
    return rawExps.filter(e => e.code && e.code.includes('.'))
  }
  return rawExps
})

const allAvailableExpectations = computed(() => {
  if (unitExpectations.value.length > 0) return unitExpectations.value
  return activeClassRecord.value?.curriculumExpectations || [
    { code: 'A1.1', name: 'Inquiry & Experimentation', description: 'Formulate hypotheses and execute laboratory inquiries.' },
    { code: 'A1.2', name: 'Data Analysis', description: 'Analyze experimental data using statistical tools.' },
    { code: 'B2.1', name: 'Kinematics Equations', description: 'Apply 1D/2D displacement and velocity equations.' },
    { code: 'B2.2', name: 'Force & Motion', description: 'Evaluate Newton laws of motion in dynamics problems.' },
    { code: 'C1.1', name: 'Conservation of Energy', description: 'Calculate kinetic, potential, and thermal energy transfers.' }
  ]
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
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

.toggle-group {
  display: flex;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-md);
  gap: 4px;
}

.toggle-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
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

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn-ghost {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  flex: 2;
  padding: 0.75rem;
  border: none;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius-md);
  font-weight: 700;
  cursor: pointer;
}

.exp-preview-card {
  margin-top: 10px;
  padding: 10px 14px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  line-height: 1.45;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.exp-preview-code {
  font-weight: 700;
  color: var(--primary);
  background: rgba(52, 152, 219, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.exp-preview-desc {
  color: var(--text);
  flex: 1;
}

.exp-pill-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px;
  background: var(--bg-secondary);
}

.exp-checkbox-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.exp-checkbox-pill:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.exp-checkbox-pill--active {
  background: rgba(59, 130, 246, 0.12);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}
</style>
