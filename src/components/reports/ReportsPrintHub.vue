<template>
  <div class="print-hub">
    <!-- Header banner -->
    <div class="print-hub__header">
      <div class="print-hub__title-group">
        <h2 class="print-hub__title">Document &amp; Print Hub</h2>
        <p class="print-hub__subtitle">Generate, customize, and print official class reports, progress sheets, and exportable data packages.</p>
      </div>
      <div v-if="reportClass" class="print-hub__class-badge">
        <GraduationCap :size="16" />
        <span>{{ reportClass.name }}</span>
      </div>
    </div>

    <!-- Main Grid of Document Templates -->
    <div class="print-hub__grid">

      <!-- Card 1: Batch Progress Reports -->
      <div class="print-hub__card">
        <div class="print-hub__card-header">
          <div class="print-hub__icon-wrapper print-hub__icon-wrapper--primary">
            <FileText :size="22" />
          </div>
          <div>
            <h3 class="print-hub__card-title">Student Progress Reports</h3>
            <p class="print-hub__card-desc">Individual performance summaries for parent-teacher interviews or midterm updates.</p>
          </div>
        </div>
        
        <div class="print-hub__card-body">
          <div class="print-hub__stat-row">
            <span class="print-hub__stat-label">Target Audience:</span>
            <span class="print-hub__stat-value">{{ sidebarStudents.length }} Students enrolled</span>
          </div>
          <div v-if="isSBAR" class="print-hub__features-list">
            <span class="print-hub__chip">SBAR Level Badges</span>
            <span class="print-hub__chip">Expectation Mastery</span>
            <span class="print-hub__chip">Progression Timeline</span>
            <span class="print-hub__chip">Attendance Markers</span>
          </div>
          <div v-else class="print-hub__features-list">
            <span class="print-hub__chip">Overall Grade Badge</span>
            <span class="print-hub__chip">Evidence Triangulation</span>
            <span class="print-hub__chip">Attendance &amp; Behavior</span>
            <span class="print-hub__chip">Trend Line</span>
          </div>
        </div>

        <div class="print-hub__card-footer">
          <button class="print-hub__btn-action" @click="$emit('open-batch-print')">
            <Printer :size="16" /> Configure &amp; Batch Print
          </button>
        </div>
      </div>

      <!-- Card 2: Final Markbook & Grades Grid -->
      <div class="print-hub__card">
        <div class="print-hub__card-header">
          <div class="print-hub__icon-wrapper print-hub__icon-wrapper--success">
            <Grid :size="22" />
          </div>
          <div>
            <h3 class="print-hub__card-title">Class Markbook &amp; Grades Grid</h3>
            <p class="print-hub__card-desc">Full class markbook matrix formatted for physical binders or office submissions.</p>
          </div>
        </div>

        <div class="print-hub__card-body">
          <div class="print-hub__stat-row">
            <span class="print-hub__stat-label">Columns Included:</span>
            <span class="print-hub__stat-value">Assessments, Categories &amp; Final Mark</span>
          </div>
          <div class="print-hub__features-list">
            <span class="print-hub__chip">Compact Grid Layout</span>
            <span class="print-hub__chip">Privacy Anonymizer</span>
            <span class="print-hub__chip">Teacher Signature Line</span>
          </div>
        </div>

        <div class="print-hub__card-footer">
          <button class="print-hub__btn-action" @click="$emit('open-print-grid')">
            <Printer :size="16" /> Print Grades Grid
          </button>
        </div>
      </div>

      <!-- Card 3: Expectations & Curriculum Mastery Audit -->
      <div class="print-hub__card">
        <div class="print-hub__card-header">
          <div class="print-hub__icon-wrapper print-hub__icon-wrapper--warning">
            <BookOpen :size="22" />
          </div>
          <div>
            <h3 class="print-hub__card-title">Expectation Mastery Audit</h3>
            <p class="print-hub__card-desc">Curriculum expectations breakdown showing class mastery rates per standard.</p>
          </div>
        </div>

        <div class="print-hub__card-body">
          <div class="print-hub__stat-row">
            <span class="print-hub__stat-label">Expectations Assessed:</span>
            <span class="print-hub__stat-value">{{ totalExpectationsCount }} Specific Expectations</span>
          </div>
          <div class="print-hub__features-list">
            <span class="print-hub__chip">Strand Summaries</span>
            <span class="print-hub__chip">Mastery Levels (1-4)</span>
            <span class="print-hub__chip">Admin Ready</span>
          </div>
        </div>

        <div class="print-hub__card-footer">
          <button class="print-hub__btn-action" @click="handlePrintExpectations">
            <Printer :size="16" /> Print Expectation Audit
          </button>
        </div>
      </div>

      <!-- Card 5: Class Roster & Sign-In Sheet -->
      <div class="print-hub__card">
        <div class="print-hub__card-header">
          <div class="print-hub__icon-wrapper print-hub__icon-wrapper--primary">
            <Users :size="22" />
          </div>
          <div>
            <h3 class="print-hub__card-title">Class Roster &amp; Sign-In Sheets</h3>
            <p class="print-hub__card-desc">Printable roster sheets with customizable blank tracking columns for sub plans or field trips.</p>
          </div>
        </div>

        <div class="print-hub__card-body">
          <div class="print-hub__stat-row">
            <span class="print-hub__stat-label">Roster Size:</span>
            <span class="print-hub__stat-value">{{ sidebarStudents.length }} Students</span>
          </div>
          <div class="print-hub__features-list">
            <span class="print-hub__chip">Custom Blank Columns</span>
            <span class="print-hub__chip">Auto-fill Rows</span>
            <span class="print-hub__chip">Sub Plan Ready</span>
          </div>
        </div>

        <div class="print-hub__card-footer">
          <button class="print-hub__btn-action" @click="emit('open-print-classlist')">
            <Printer :size="16" /> Print Class Roster
          </button>
        </div>
      </div>

      <!-- Card 6: Semester Calendar Schedule -->
      <div class="print-hub__card">
        <div class="print-hub__card-header">
          <div class="print-hub__icon-wrapper print-hub__icon-wrapper--warning">
            <Calendar :size="22" />
          </div>
          <div>
            <h3 class="print-hub__card-title">Semester Calendar Schedule</h3>
            <p class="print-hub__card-desc">Printable 1-page or 2-page duplex semester calendar schedule for student binders or wall posting.</p>
          </div>
        </div>

        <div class="print-hub__card-body">
          <div class="print-hub__stat-row">
            <span class="print-hub__stat-label">Print Format:</span>
            <span class="print-hub__stat-value">1-Page or 2-Page Duplex</span>
          </div>
          <div class="print-hub__features-list">
            <span class="print-hub__chip">Multi-class Batching</span>
            <span class="print-hub__chip">Day 1/2 Schedule</span>
            <span class="print-hub__chip">Binder Layout</span>
          </div>
        </div>

        <div class="print-hub__card-footer">
          <button class="print-hub__btn-action" @click="emit('open-print-calendar')">
            <Printer :size="16" /> Configure &amp; Print Calendar
          </button>
        </div>
      </div>

      <!-- Card 4: Export CSV & Data Center -->
      <div class="print-hub__card">
        <div class="print-hub__card-header">
          <div class="print-hub__icon-wrapper print-hub__icon-wrapper--info">
            <Download :size="22" />
          </div>
          <div>
            <h3 class="print-hub__card-title">Data Exports &amp; Report Card Comments</h3>
            <p class="print-hub__card-desc">Download CSV spreadsheets for school administration or report card comment systems.</p>
          </div>
        </div>

        <div class="print-hub__card-body">
          <div class="print-hub__export-options">
            <button class="print-hub__export-item" @click="$emit('download-csv', 'attendance')">
              <Download :size="14" /> Attendance Summary CSV
            </button>
            <button class="print-hub__export-item" @click="$emit('download-csv', 'washroom')">
              <Download :size="14" /> Washroom Usage CSV
            </button>
            <button class="print-hub__export-item" @click="$emit('download-csv', 'behavior')">
              <Download :size="14" /> Behavior Logs CSV
            </button>
            <button class="print-hub__export-item" @click="$emit('download-comments', true)">
              <Download :size="14" /> Report Card Comments (With Names)
            </button>
            <button class="print-hub__export-item" @click="$emit('download-comments', false)">
              <Download :size="14" /> Report Card Comments (Anonymous)
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FileText, Grid, BookOpen, Download, Printer, GraduationCap, Users, Calendar } from 'lucide-vue-next'

import { getEffectiveClassRecord } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'

const props = defineProps({
  reportClass: { type: Object, default: null },
  sidebarStudents: { type: Array, default: () => [] }
})

const effectiveClass = computed(() => {
  return getEffectiveClassRecord(props.reportClass, activeSubjectId.value)
})

const isSBAR = computed(() => {
  const fw = effectiveClass.value?.gradingFramework
  return fw === 'sbar' || (typeof fw === 'string' && fw.startsWith('sbar'))
})

const emit = defineEmits([
  'open-batch-print',
  'open-print-grid',
  'open-print-expectations',
  'open-print-classlist',
  'open-print-calendar',
  'download-csv',
  'download-comments'
])

const totalExpectationsCount = computed(() => {
  if (!props.reportClass?.gradebookUnits) return 0
  return props.reportClass.gradebookUnits.reduce((acc, u) => acc + (u.expectations?.length || 0), 0)
})

function handlePrintExpectations() {
  emit('open-print-expectations')
}
</script>

<style scoped>
.print-hub {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.print-hub__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
}

.print-hub__title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.print-hub__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.print-hub__subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.print-hub__class-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary);
}

.print-hub__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.print-hub__card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.print-hub__card:hover {
  border-color: var(--primary);
}

.print-hub__card-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.print-hub__icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.print-hub__icon-wrapper--primary { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.print-hub__icon-wrapper--success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.print-hub__icon-wrapper--warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.print-hub__icon-wrapper--info    { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

.print-hub__card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px 0;
}

.print-hub__card-desc {
  font-size: 0.825rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.35;
}

.print-hub__card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.print-hub__stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.825rem;
}

.print-hub__stat-label { color: var(--text-secondary); }
.print-hub__stat-value { font-weight: 600; color: var(--text); }

.print-hub__features-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.print-hub__chip {
  font-size: 0.75rem;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.print-hub__card-footer {
  margin-top: auto;
  padding-top: 8px;
}

.print-hub__btn-action {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--primary);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.print-hub__btn-action:hover {
  opacity: 0.92;
}

.print-hub__btn-action:active {
  transform: scale(0.99);
}

.print-hub__export-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.print-hub__export-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 0.825rem;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.print-hub__export-item:hover {
  background: var(--border);
  color: var(--primary);
}
</style>
