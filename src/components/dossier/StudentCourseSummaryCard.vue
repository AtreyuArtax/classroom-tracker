<template>
  <div 
    class="student-course-summary-card" 
    :class="[
      `student-course-summary-card--${summary.tone}`,
      { 'student-course-summary-card--expanded': isExpanded }
    ]"
  >
    <!-- Collapsible Header Bar -->
    <header 
      class="summary-card__header" 
      tabindex="0"
      role="button"
      :aria-expanded="isExpanded"
      @click="toggleExpand"
      @keydown.enter.space.prevent="toggleExpand"
    >
      <div class="summary-card__header-left">
        <div class="summary-card__icon-wrap">
          <Sparkles v-if="summary.tone === 'positive'" :size="16" />
          <AlertCircle v-else-if="summary.tone === 'danger'" :size="16" />
          <AlertTriangle v-else-if="summary.tone === 'warning'" :size="16" />
          <FileText v-else :size="16" />
        </div>
        <div class="summary-card__title-group">
          <div class="summary-card__title-row">
            <span class="summary-card__title">Course Progress Summary</span>
            <div v-if="!isExpanded" class="summary-card__badges-mini">
              <span 
                v-for="(b, idx) in summary.badges.slice(0, 3)" 
                :key="idx" 
                class="summary-pill"
                :class="`summary-pill--${b.tone}`"
              >
                {{ b.label }}
              </span>
            </div>
          </div>
          <p v-if="!isExpanded" class="summary-card__headline-preview">
            {{ summary.headline }}
          </p>
        </div>
      </div>

      <div class="summary-card__header-right">
        <button 
          type="button" 
          class="summary-card__quick-btn" 
          :title="copied ? 'Copied!' : 'Copy Summary to Clipboard'"
          @click.stop="handleCopy"
        >
          <Check v-if="copied" :size="14" class="text-success" />
          <Copy v-else :size="14" />
          <span class="btn-text">{{ copied ? 'Copied' : 'Copy' }}</span>
        </button>

        <button 
          type="button" 
          class="summary-card__toggle-btn"
          :aria-label="isExpanded ? 'Collapse summary' : 'Expand summary'"
        >
          <ChevronUp v-if="isExpanded" :size="16" />
          <ChevronDown v-else :size="16" />
        </button>
      </div>
    </header>

    <!-- Expanded Body -->
    <transition name="slide-expand">
      <div v-if="isExpanded" class="summary-card__body">
        <!-- Controls & Badges Toolbar -->
        <div class="summary-card__toolbar">
          <div class="summary-card__badges-full">
            <span 
              v-for="(b, idx) in summary.badges" 
              :key="idx" 
              class="summary-pill"
              :class="`summary-pill--${b.tone}`"
            >
              {{ b.label }}
            </span>
          </div>

          <div class="summary-card__controls" @click.stop>
            <div class="audience-toggle">
              <button 
                type="button" 
                class="audience-btn"
                :class="{ 'audience-btn--active': audience === 'parent' }"
                title="Constructive, parent-ready narrative"
                @click="audience = 'parent'"
              >
                Parent-Safe
              </button>
              <button 
                type="button" 
                class="audience-btn"
                :class="{ 'audience-btn--active': audience === 'teacher' }"
                title="Includes internal test absences, redirects, notes, and IEP details"
                @click="audience = 'teacher'"
              >
                Teacher Briefing
              </button>
            </div>
          </div>
        </div>

        <!-- Headline banner -->
        <div class="summary-card__headline-banner">
          <strong>Overview:</strong> {{ summary.headline }}
        </div>

        <!-- Narrative Sections -->
        <div class="summary-card__sections">
          <section 
            v-for="sec in summary.sections" 
            :key="sec.id" 
            class="summary-section"
            :class="{ 'summary-section--teacher': sec.id === 'teacher' }"
          >
            <h5 class="summary-section__title">
              <span class="section-bullet"></span>
              {{ sec.title }}
            </h5>

            <div v-if="sec.id === 'teacher'" class="summary-section__teacher-content">
              <div 
                v-for="(line, lIdx) in sec.text.split('\n')" 
                :key="lIdx" 
                class="teacher-bullet"
              >
                {{ line }}
              </div>
            </div>
            <p v-else class="summary-section__text">
              {{ sec.text }}
            </p>
          </section>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  Sparkles, 
  AlertCircle, 
  AlertTriangle, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check 
} from 'lucide-vue-next'
import { generateStudentCourseSummary } from '../../utils/studentSummaryGenerator.js'

const props = defineProps({
  student:               { type: Object, required: true },
  overallGrade:          { type: Number, default: null },
  weightedMedian:        { type: Number, default: null },
  isSbar:                { type: Boolean, default: false },
  sbarOverallLevel:      { type: [String, Number], default: null },
  className:             { type: String, default: '' },
  academicCategories:    { type: Array, default: () => [] },
  assessments:           { type: Array, default: () => [] },
  stats:                 { type: Object, default: () => ({}) },
  attendanceAverages:    { type: Object, default: () => ({}) },
  washroomCount:         { type: Number, default: 0 },
  redirectCount:         { type: Number, default: 0 },
  events:                { type: Array, default: () => [] },
  learningSkillsRecord:  { type: Object, default: null },
  selectedPeriod:        { type: String, default: 'semester' }
})

const isExpanded = ref(false)
const audience = ref('parent')
const copied = ref(false)
let copyTimeout = null

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

const summary = computed(() => {
  return generateStudentCourseSummary({
    student: props.student,
    overallGrade: props.overallGrade,
    weightedMedian: props.weightedMedian,
    isSbar: props.isSbar,
    sbarOverallLevel: props.sbarOverallLevel,
    className: props.className,
    categories: props.academicCategories,
    assessments: props.assessments,
    stats: props.stats,
    attendanceAverages: props.attendanceAverages,
    washroomCount: props.washroomCount,
    redirectCount: props.redirectCount,
    events: props.events,
    learningSkillsRecord: props.learningSkillsRecord
  }, {
    audience: audience.value,
    pronounMode: 'preferred'
  })
})

async function handleCopy() {
  if (!summary.value?.plainText) return
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(summary.value.plainText)
    } else {
      const el = document.createElement('textarea')
      el.value = summary.value.plainText
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    copied.value = true
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy summary to clipboard:', err)
  }
}
</script>

<style scoped>
.student-course-summary-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
  overflow: hidden;
  margin-bottom: 4px;
}

.student-course-summary-card--positive {
  border-left: 4px solid #10b981;
}

.student-course-summary-card--neutral {
  border-left: 4px solid var(--primary);
}

.student-course-summary-card--warning {
  border-left: 4px solid #f59e0b;
}

.student-course-summary-card--danger {
  border-left: 4px solid #ef4444;
}

/* Header */
.summary-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  background: var(--surface);
  transition: background 0.15s ease;
}

.summary-card__header:hover {
  background: var(--surface-hover);
}

.summary-card__header:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.summary-card__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.summary-card__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text);
  flex-shrink: 0;
}

.student-course-summary-card--positive .summary-card__icon-wrap {
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
}

.student-course-summary-card--warning .summary-card__icon-wrap {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}

.student-course-summary-card--danger .summary-card__icon-wrap {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

.summary-card__title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.summary-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-card__title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-card__headline-preview {
  margin: 0;
  font-size: 0.775rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 650px;
}

.summary-card__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.summary-card__quick-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.summary-card__quick-btn:hover {
  background: var(--bg-secondary);
  color: var(--text);
  border-color: var(--border-hover, var(--primary));
}

.summary-card__toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

/* Pills */
.summary-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text);
  white-space: nowrap;
}

.summary-pill--positive {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.summary-pill--neutral {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.summary-pill--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}

.summary-pill--danger {
  background: rgba(239, 68, 68, 0.14);
  color: #ef4444;
}

/* Expanded Body */
.summary-card__body {
  border-top: 1px solid var(--border);
  padding: 12px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--surface);
}

.summary-card__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-card__badges-full {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.audience-toggle {
  display: inline-flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  padding: 2px;
  border-radius: var(--radius-sm);
  gap: 2px;
}

.audience-btn {
  padding: 3px 8px;
  border: none;
  background: transparent;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.audience-btn:hover {
  color: var(--text);
}

.audience-btn--active {
  background: var(--surface);
  color: var(--primary);
  font-weight: 700;
  box-shadow: var(--shadow-sm);
}

.summary-card__headline-banner {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--text);
  line-height: 1.4;
}

.summary-card__sections {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.summary-section__title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-bullet {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--primary);
  display: inline-block;
}

.summary-section__text {
  margin: 0;
  font-size: 0.83rem;
  color: var(--text);
  line-height: 1.5;
}

.summary-section--teacher {
  background: rgba(139, 92, 246, 0.04);
  border-left: 3px solid #8b5cf6;
  padding: 8px 12px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.summary-section--teacher .section-bullet {
  background: #8b5cf6;
}

.summary-section__teacher-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text);
}

.teacher-bullet {
  line-height: 1.4;
}

.text-success {
  color: #10b981;
}

.slide-expand-enter-active,
.slide-expand-leave-active {
  transition: all 0.2s ease-out;
  overflow: hidden;
}

.slide-expand-enter-from,
.slide-expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
