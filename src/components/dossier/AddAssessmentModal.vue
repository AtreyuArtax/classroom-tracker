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

      <!-- Expectation Tagging (Optional) -->
      <div v-if="newAssessment.unitId && unitExpectations.length" class="form-group">
        <label class="form-label">Expectation (Optional)</label>
        <select v-model="newAssessment.expectationId" class="form-input">
          <option :value="null">General / Unit-Level Assessment</option>
          <option v-for="exp in unitExpectations" :key="exp.expectationId || exp.code" :value="exp.expectationId || exp.code">
            {{ exp.code }}: {{ exp.description }}
          </option>
        </select>
      </div>

      <div class="form-row">
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
  const hasSpecifics = rawExps.some(e => e.code.includes('.'))
  if (hasSpecifics) {
    return rawExps.filter(e => e.code.includes('.'))
  }
  return rawExps
})

watch(() => newAssessment.value.unitId, () => {
  newAssessment.value.expectationId = null
})
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
</style>
