<template>
  <Teleport to="body">
    <div v-if="showAddAssessmentModal" class="add-assessment-modal-backdrop">
      <div class="add-assessment-modal" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h3 class="modal-title">{{ isEditingAssessment ? 'Edit Assessment' : 'New Assessment' }}</h3>
          <button class="icon-btn" @click="closeAddAssessment"><X :size="20" /></button>
        </header>
        
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
              <option value="Highest">Highest Attempt</option>
              <option value="Latest">Latest Attempt</option>
              <option value="Average">Average of Attempts</option>
              <option value="Manual">Manual Selection</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="closeAddAssessment">Cancel</button>
            <button type="submit" class="btn-primary">{{ isEditingAssessment ? 'Update Assessment' : 'Create Assessment' }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
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

const { sortedRoster } = useClassroom()
</script>

<style scoped>
.add-assessment-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500; /* Above everything */
}

.add-assessment-modal {
  background: var(--surface);
  width: min(500px, 95vw);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 95vh;
  animation: modal-enter 0.3s ease-out;
}

@keyframes modal-enter {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.modal-form {
  padding: 1.5rem;
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

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: var(--bg-secondary);
}
</style>
