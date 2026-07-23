<template>
  <div class="student-360__pane student-360__pane--history">
    <div class="history-container">
      <h3 class="history-title">Academic Journey</h3>
      <p class="history-subtitle">Historical records across all semesters and years.</p>
      
      <div v-if="allTimeHistory.length === 0" class="history-empty">
        <History :size="48" class="history-empty-icon" />
        <p>No historical records found for this student.</p>
      </div>
      
      <div v-else class="history-list">
        <div v-for="h in allTimeHistory" :key="h.classId" class="history-item">
          <div class="history-item__left">
            <div class="history-term-badge">{{ h.year }} • {{ h.semester }}</div>
            <div class="history-class-name">{{ h.name }}</div>
            <div class="history-period" v-if="h.period">Period {{ h.period }}</div>
          </div>
          <div class="history-item__right">
            <div class="history-grade-pill" :style="{ backgroundColor: getGradeColor(h.overallGrade) }">
              {{ h.overallGrade != null ? Math.round(h.overallGrade) + '%' : '—' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { History } from 'lucide-vue-next'
import { getGradeColor } from '../../utils/gradeColors.js'

defineProps({
  allTimeHistory: { type: Array, default: () => [] }
})
</script>

<style scoped>
.history-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.history-title {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.history-subtitle {
  margin: 0 0 20px 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--text-secondary);
}

.history-empty-icon {
  opacity: 0.4;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.history-term-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.history-class-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.history-period {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.history-grade-pill {
  padding: 6px 14px;
  border-radius: var(--radius-pill, 20px);
  color: white;
  font-weight: 800;
  font-size: 0.9rem;
}
</style>
