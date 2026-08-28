<template>
  <aside class="student-sidebar" :class="{ 'student-sidebar--collapsed': isCollapsed }">
    <!-- Show Sidebar Handle (Visible only when collapsed) -->
    <button 
      v-if="isCollapsed"
      type="button"
      class="student-sidebar__show-btn"
      title="Show Sidebar"
      @click="$emit('toggle-collapse')"
    >
      <ChevronRight :size="18" />
    </button>
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
          <!-- Line 1: Full Width Student Name -->
          <div class="student-sidebar__name-row" :title="`${student.lastName}, ${student.firstName}`">
            <span class="student-sidebar__roster-lastname">{{ student.lastName }},</span>
            <span class="student-sidebar__roster-firstname">{{ student.firstName }}</span>
          </div>

          <!-- Line 2: Metrics & Badges Row (Grade + Sparkline + Tag) -->
          <div v-if="showAcademics || (availableSubCohorts.length > 1 && studentDisplayMap[student.studentId]?.tag)" class="student-sidebar__metrics-row">
            <template v-if="showAcademics">
              <!-- Grade / Mastery Badge -->
              <span 
                v-if="studentDisplayMap[student.studentId]?.hasGrade" 
                class="student-sidebar__grade-pill"
                :class="{ 'student-sidebar__grade-pill--privacy': isPrivacyMode }"
                :style="isPrivacyMode ? {} : { 
                  color: studentDisplayMap[student.studentId].gradeColor, 
                  borderColor: studentDisplayMap[student.studentId].gradeColor + '40', 
                  backgroundColor: studentDisplayMap[student.studentId].gradeColor + '15' 
                }"
              >
                {{ isPrivacyMode ? '···' : studentDisplayMap[student.studentId].gradeText }}
              </span>
              <span v-else class="student-sidebar__grade-pill student-sidebar__grade-pill--empty">—</span>

              <!-- Sparkline Curve -->
              <div 
                v-if="!isPrivacyMode && studentDisplayMap[student.studentId]?.sparklinePath" 
                class="student-sidebar__sparkline-container"
              >
                <svg width="50" height="12" viewBox="0 0 50 12">
                  <path
                    fill="none"
                    :stroke="studentDisplayMap[student.studentId].sparklineColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :d="studentDisplayMap[student.studentId].sparklinePath"
                  />
                </svg>
              </div>
            </template>

            <!-- Subcohort / Grade Tag -->
            <span 
              v-if="availableSubCohorts.length > 1 && studentDisplayMap[student.studentId]?.tag" 
              class="student-sidebar__course-tag"
            >
              {{ studentDisplayMap[student.studentId].tag }}
            </span>
          </div>
        </li>
        <li v-if="students.length === 0" class="student-sidebar__roster-empty">No students</li>
      </ul>
    </div>
    </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
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

import { activeClassRecord, availableSubCohorts } from '../composables/useGradebook.js'
import { getSBARLevelBadge } from '../db/gradebook/gradeCalcSBAR.js'

const isMobileOpen = ref(false)

const isSBAR = computed(() => activeClassRecord.value?.gradingFramework === 'sbar')

function getStudentTag(student) {
  if (!student) return ''
  const isElem = activeClassRecord.value?.classType === 'elementary'
  if (isElem) {
    if (student.gradeLevel) {
      return student.gradeLevel.replace(/^Grade\s+/i, 'Gr. ')
    }
    if (student.grade) {
      return student.grade.replace(/^Grade\s+/i, 'Gr. ')
    }
  }
  return student.courseCode || student.gradeLevel || ''
}

/** Precomputed dictionary for fast template rendering */
const studentDisplayMap = computed(() => {
  const map = {}
  const list = props.students || []
  const grades = props.classGrades || {}
  const trends = props.studentTrends || {}
  const sbar = isSBAR.value

  for (let i = 0; i < list.length; i++) {
    const s = list[i]
    const sId = s.studentId
    const tag = getStudentTag(s)

    const trendData = trends[sId]
    let sparklinePath = ''
    let sparklineColor = ''
    if (trendData && trendData.length > 1) {
      sparklinePath = getSparklinePath(trendData, 50, 12)
      sparklineColor = getGradeColor(trendData[trendData.length - 1])
    }

    const sg = grades[sId]
    let gradeText = '—'
    let gradeColor = 'var(--text-secondary)'
    const hasGrade = sg && sg.overallGrade !== null && sg.overallGrade !== undefined
    if (hasGrade) {
      if (sbar) {
        const badge = getSBARLevelBadge(sg.overallGrade)
        gradeText = badge.level
        gradeColor = badge.color
      } else {
        gradeText = formatGrade(sg.overallGrade)
        gradeColor = getGradeColor(sg.overallGrade)
      }
    }

    map[sId] = { tag, sparklinePath, sparklineColor, gradeText, gradeColor, hasGrade }
  }
  return map
})

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
  return Math.round(grade) + '%'
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
  width: 200px; /* Streamlined compact width */
  min-width: 0;
  height: 100%;
  position: relative;
  z-index: 10;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.student-sidebar--collapsed {
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  border-right: none !important;
  overflow: visible;
  pointer-events: none;
}

.student-sidebar--collapsed > *:not(.student-sidebar__show-btn) {
  display: none !important;
}

@media (max-width: 1280px) {
  .student-sidebar {
    width: 180px;
  }
}

/* Show Handle Styles */
.student-sidebar__show-btn {
  position: fixed;
  left: 0;
  top: 90px; /* Position below header */
  width: 28px;
  height: 44px;
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
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  pointer-events: auto;
  transition: all 0.2s;
}

.student-sidebar__show-btn:hover {
  width: 34px;
  background: var(--primary-light, rgba(37, 99, 235, 0.1));
}

.student-sidebar__header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-primary, var(--surface));
  display: flex;
  flex-direction: column; /* Stacked layout */
  gap: 10px;
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
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.student-sidebar__class-select :deep(.class-switcher-wrapper) {
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  gap: 6px !important;
}

.student-sidebar__class-select :deep(.class-switcher) {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

.student-sidebar__class-select :deep(.subject-switcher) {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

.student-sidebar__class-select :deep(.class-switcher__trigger) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box;
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
  padding: 10px 12px;
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
  padding: 8px 12px;
  border-bottom: 1px solid var(--bg-secondary);
  display: flex;
  flex-direction: column;
  gap: 3px;
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

.student-sidebar__name-row {
  display: block;
  width: 100%;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}

.student-sidebar__roster-lastname {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text);
  margin-right: 4px;
}

.student-sidebar__roster-firstname {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.student-sidebar__metrics-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.student-sidebar__grade-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid transparent;
  flex-shrink: 0;
  line-height: 1.2;
  transition: filter 0.2s ease, opacity 0.2s ease;
}

.student-sidebar__grade-pill--privacy {
  filter: blur(4px);
  user-select: none;
  background: var(--bg-secondary);
  border-color: var(--border);
  color: var(--text-secondary);
}

.student-sidebar__grade-pill--empty {
  color: var(--text-secondary);
  background: transparent;
  border: none;
  padding: 0 2px;
  font-weight: 400;
}

.student-sidebar__sparkline-container {
  display: flex;
  align-items: center;
  opacity: 0.85;
  flex-shrink: 0;
}

.student-sidebar__sparkline-container svg {
  display: block;
}

.student-sidebar__course-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.3);
  line-height: 1.2;
  flex-shrink: 0;
  margin-left: auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
}

.student-sidebar__roster-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.9rem;
}
</style>
