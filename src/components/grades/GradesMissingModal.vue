<template>
  <div v-if="show && currentAssessment" class="grades__modal-backdrop">
    <div class="grades__modal" role="dialog" aria-modal="true">
      <header class="grades__modal-header">
        <h3 class="grades__modal-title">Incomplete & Missing: {{ currentAssessment.name }}</h3>
        <button class="grades__icon-btn" @click="$emit('close')"><X :size="20" /></button>
      </header>
      
      <div class="grades__modal-content" style="max-height: 400px; overflow-y: auto; padding: 0 1.5rem 1.5rem 1.5rem;">
        <table v-if="missingStudentsList.length > 0" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
              <th style="padding: 12px 8px; font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Student</th>
              <th style="padding: 12px 8px; font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
              <th style="padding: 12px 8px; font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in missingStudentsList" :key="student.studentId" style="border-bottom: 1px solid var(--border-color-light); transition: background-color 0.2s;">
              <td style="padding: 12px 8px; font-weight: 500; font-size: 0.95rem;">{{ student.lastName }}, {{ student.firstName }}</td>
              <td style="padding: 12px 8px;">
                <span v-if="student.status === 'missing'" class="grades__cell-missing-badge">MISSING</span>
                <span v-else class="grades__status-badge grades__status-badge--empty">Blank</span>
              </td>
              <td style="padding: 12px 8px; text-align: right;">
                 <button class="grades__btn-ghost" style="padding: 6px 12px; font-size: 0.85rem; background: var(--bg-secondary); border: 1px solid var(--border-color);" @click="$emit('toggle-missing', student.studentId)">
                   {{ student.status === 'missing' ? 'Unmark Missing' : 'Mark Missing' }}
                 </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else style="padding: 3rem 1rem; text-align: center; color: var(--text-secondary); font-size: 1.1rem;">
          All students have a recorded score for this assessment!
        </div>
      </div>
      
      <div class="grades__modal-actions">
        <button type="button" class="grades__btn-ghost" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X } from 'lucide-vue-next'

defineProps({
  show: { type: Boolean, default: false },
  currentAssessment: { type: Object, default: null },
  missingStudentsList: { type: Array, default: () => [] }
})

defineEmits(['close', 'toggle-missing'])
</script>

<style scoped>
.grades__modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.grades__modal {
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-xl);
  width: 90%;
  max-width: 550px;
  overflow: hidden;
}

.grades__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.grades__modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.grades__cell-missing-badge {
  color: var(--danger);
  font-weight: 800;
  font-size: 0.8rem;
}

.grades__status-badge--empty {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.grades__btn-ghost {
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.grades__modal-actions {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.grades__icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}
</style>
