<template>
  <div>
    <!-- Show Sidebar Handle (Visible only when collapsed) -->
    <button 
      v-if="isCollapsed"
      class="student-sidebar__show-btn"
      title="Show Sidebar"
      @click="$emit('toggle-collapse')"
    >
      <ChevronRight :size="18" />
    </button>

    <aside class="student-sidebar" :class="{ 'student-sidebar--collapsed': isCollapsed }">
    <!-- Sidebar Header -->
    <div class="student-sidebar__header">
      <div class="student-sidebar__header-toolbar">
        <h2 class="student-sidebar__title">Classroom</h2>
        <div class="student-sidebar__actions">
          <!-- Privacy Toggle (Only shown if showAcademics is true) -->
          <button 
            v-if="showAcademics"
            class="student-sidebar__icon-btn" 
            :title="isPrivacyMode ? 'Show Grades' : 'Privacy Mode'"
            @click="$emit('toggle-privacy')"
          >
            <Eye v-if="!isPrivacyMode" :size="16" />
            <EyeOff v-else :size="16" />
          </button>
          
          <!-- Collapse Button -->
          <button 
            class="student-sidebar__icon-btn student-sidebar__icon-btn--collapse" 
            title="Collapse Sidebar"
            @click="$emit('toggle-collapse')"
          >
            <ChevronLeft :size="16" />
          </button>
        </div>
      </div>
      <div class="student-sidebar__class-select">
        <ClassSwitcher @navigate="$emit('navigate', $event)" />
      </div>
    </div>

    <!-- Mobile toggle (from Reports.vue) -->
    <button class="student-sidebar__mobile-toggle" @click="isMobileOpen = !isMobileOpen">
      {{ isMobileOpen ? '▲ Hide Students' : '▼ Show Students' }}
    </button>

    <!-- Student List -->
    <div class="student-sidebar__roster-container" :class="{ 'student-sidebar__roster-container--open': isMobileOpen }">
      <ul class="student-sidebar__roster">
        <li 
          v-for="student in students" 
          :key="student.studentId"
          class="student-sidebar__roster-item"
          :class="{ 'student-sidebar__roster-item--active': selectedStudentId === student.studentId }"
          @click="$emit('select-student', student.studentId)"
        >
          <div class="student-sidebar__roster-info">
            <div class="student-sidebar__roster-name-group">
              <span class="student-sidebar__roster-name">{{ student.lastName }}, {{ student.firstName }}</span>
              
              <!-- Sparkline (Only if showAcademics and trends exist) -->
              <div 
                v-if="showAcademics && !isPrivacyMode && studentTrends && studentTrends[student.studentId]?.length > 1" 
                class="student-sidebar__sparkline-mini"
              >
                <svg width="60" height="12" viewBox="0 0 60 12">
                  <path
                    fill="none"
                    :stroke="getGradeColor(studentTrends[student.studentId][studentTrends[student.studentId].length - 1])"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :d="getSparklinePath(studentTrends[student.studentId], 60, 12)"
                  />
                </svg>
              </div>
            </div>

            <!-- Grade Display (Only if showAcademics is true) -->
            <template v-if="showAcademics">
              <span 
                v-if="classGrades && classGrades[student.studentId]" 
                class="student-sidebar__roster-grade"
                :style="{ color: isPrivacyMode ? 'var(--text-secondary)' : getGradeColor(classGrades[student.studentId].overallGrade) }"
              >
                <template v-if="isPrivacyMode">**</template>
                <template v-else>{{ formatGrade(classGrades[student.studentId].overallGrade) }}</template>
              </span>
              <span v-else class="student-sidebar__roster-grade student-sidebar__roster-grade--empty">
                —
              </span>
            </template>
          </div>
        </li>
        <li v-if="students.length === 0" class="student-sidebar__roster-empty">No students</li>
      </ul>
    </div>
    </aside>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import ClassSwitcher from './ClassSwitcher.vue'

const props = defineProps({
  students: {
    type: Array,
    required: true,
    default: () => []
  },
  selectedStudentId: {
    type: [String, Number],
    default: null
  },
  showAcademics: {
    type: Boolean,
    default: false
  },
  isPrivacyMode: {
    type: Boolean,
    default: false
  },
  classGrades: {
    type: Object,
    default: () => ({})
  },
  studentTrends: {
    type: Object,
    default: () => ({})
  },
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select-student', 'navigate', 'toggle-privacy', 'toggle-collapse'])

const isMobileOpen = ref(false)

// --- Helper Methods (Standardized from Grades.vue) ---

function getGradeColor(grade) {
  if (grade === null || grade === undefined) return 'var(--text-secondary)'
  if (grade >= 80) return '#1a6b3a' // muted green
  if (grade >= 70) return '#1a5276' // muted blue
  if (grade >= 60) return '#7d6608' // muted amber
  return '#c0392b' // muted red
}

function formatGrade(grade) {
  if (grade === null || grade === undefined) return '—'
  return Math.round(grade * 10) / 10 + '%'
}

function getSparklinePath(data, width, height) {
  if (!data || data.length < 2) return ""
  const xStep = width / (data.length - 1)
  const points = data.map((val, i) => {
    const x = i * xStep
    const y = height - (val / 100) * height
    return { x, y }
  })

  // Simple quadratic curve interpolation
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const midX = (p0.x + p1.x) / 2
    d += ` Q ${p0.x} ${p0.y}, ${midX} ${(p0.y + p1.y) / 2}`
    if (i === points.length - 2) {
      d += ` T ${p1.x} ${p1.y}`
    }
  }
  return d
}
</script>

<style scoped>
.student-sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 240px; /* Standardized width */
  height: 100%;
  z-index: 10;
  background: var(--surface);
  transition: transform 0.3s ease, width 0.3s ease;
}

.student-sidebar--collapsed {
  width: 0;
  overflow: hidden;
  border-right: none;
  pointer-events: none; /* Prevent interaction while hidden */
}

/* Show Handle Styles */
.student-sidebar__show-btn {
  position: fixed;
  left: 0;
  top: 80px; /* Position below header */
  width: 32px;
  height: 48px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: none;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  cursor: pointer;
  z-index: 100;
  box-shadow: var(--shadow-md);
  transition: all 0.2s;
}

.student-sidebar__show-btn:hover {
  width: 36px;
  background: var(--primary-light);
}

.student-sidebar__header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-primary, var(--surface));
  display: flex;
  flex-direction: column; /* Stacked layout */
  gap: 12px;
}

.student-sidebar__header-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.student-sidebar__title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin: 0;
}

.student-sidebar__class-select {
  width: 100%;
}

.student-sidebar__class-select :deep(.class-switcher__trigger) {
  width: 100%;
  justify-content: space-between;
}

.student-sidebar__actions {
  display: flex;
  gap: 8px;
}

.student-sidebar__icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.student-sidebar__icon-btn:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}

.student-sidebar__mobile-toggle {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--surface);
  border: none;
  border-bottom: 1px solid var(--border);
  width: 100%;
  font-weight: 600;
  color: var(--primary);
  font-size: 0.9rem;
  cursor: pointer;
}

@media (max-width: 767px) {
  .student-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  
  .student-sidebar__mobile-toggle {
    display: flex;
  }
  
  .student-sidebar__roster-container {
    display: none;
  }
  
  .student-sidebar__roster-container--open {
    display: block;
    max-height: 300px;
    overflow-y: auto;
  }
}

.student-sidebar__roster-container {
  flex: 1;
  overflow-y: auto;
}

.student-sidebar__roster {
  list-style: none;
  padding: 0;
  margin: 0;
}

.student-sidebar__roster-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--bg-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
}

.student-sidebar__roster-item:hover {
  background: var(--bg-secondary);
}

.student-sidebar__roster-item--active {
  background: var(--primary-light);
  border-left-color: var(--primary);
  font-weight: 600;
}

.student-sidebar__roster-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 12px;
}

.student-sidebar__roster-name-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.student-sidebar__roster-name {
  font-size: 0.9rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-sidebar__roster-grade {
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
}

.student-sidebar__roster-grade--empty {
  color: var(--text-secondary);
  font-weight: 400;
}

.student-sidebar__sparkline-mini {
  display: flex;
  align-items: center;
  opacity: 0.7;
  margin-top: 2px;
}

.student-sidebar__roster-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}
</style>
