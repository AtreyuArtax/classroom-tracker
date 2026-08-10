<template>
  <div>
    <!-- Print Report Configuration Modal -->
    <BaseModal
      :show="show"
      title="Print Report"
      :max-width="showPrintPreview ? '1150px' : '540px'"
      :z-index="3000"
      @close="$emit('close')"
    >
      <template #header>
        <div class="header-content">
          <Printer class="header-icon" :size="24" />
          <div>
            <h3 class="header-title">Print Report</h3>
            <p class="header-subtitle">Format a professional document for this student.</p>
          </div>
        </div>
      </template>

      <div class="email-config-modal-body" :class="{ 'email-config-modal-body--with-preview': showPrintPreview }">
        <div class="config-section">
          <div class="config-section-header">
            <h4 class="config-section-title">Report Type</h4>
            <div class="report-type-toggle">
              <button 
                class="reports__toggle-btn" 
                :class="{ 'reports__toggle-btn--active': printConfig.reportType === 'progress' }"
                @click="printConfig.reportType = 'progress'"
              >Progress</button>
              <button 
                class="reports__toggle-btn" 
                :class="{ 'reports__toggle-btn--active': printConfig.reportType === 'attendance' }"
                @click="printConfig.reportType = 'attendance'"
              >Attendance</button>
            </div>
          </div>

          <div v-if="printConfig.reportType === 'progress'" class="print-modal__options" style="margin-top: 1rem;">
            <div class="print-modal__section-title">{{ isSBAR ? 'SBAR Content & Scope' : 'Include in Document' }}</div>
            
            <template v-if="isSBAR">
              <label class="setup__label" style="margin-bottom: 8px; font-weight: 600; font-size: 0.85rem;">
                Expectation Scope
                <select v-model="printConfig.expectationScope" class="setup__input" style="margin-top: 4px; padding: 6px 10px; font-size: 0.85rem;">
                  <option value="assessed">Assessed Expectations Only (Recommended)</option>
                  <option value="overall">Overall Expectations / Success Criteria</option>
                  <option value="all">All Course Expectations</option>
                </select>
              </label>
              <label class="setup__label" style="margin-bottom: 8px; font-weight: 600; font-size: 0.85rem;">
                Layout Density
                <select v-model="printConfig.layoutColumns" class="setup__input" style="margin-top: 4px; padding: 6px 10px; font-size: 0.85rem;">
                  <option value="2">2-Column Grid (Compact)</option>
                  <option value="1">Single Column (Full Width)</option>
                </select>
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeProgression" />
                Evaluation Progression Timeline (L2 ➔ L3 ➔ L4)
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeOverallBadge" />
                Overall SBAR Level Badge
              </label>
              <div class="print-modal__divider"></div>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeAttendance" />
                Attendance Summary
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeBehavior" />
                Out-of-Class Summary
              </label>
            </template>

            <template v-else>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeOverallGrade" />
                Overall Grade Badge
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeMedians" />
                Weighted Median & Consistent Grade
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeGradeTrend" />
                Performance Trend Graph
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeTriangulation" />
                Evidence Triangulation (Pie)
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeCategorySummary" />
                Category Performance Summary
              </label>
              <div class="print-modal__divider"></div>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeAttendance" />
                Attendance Summary
              </label>
              <label class="print-modal__option">
                <input type="checkbox" v-model="printConfig.includeBehavior" />
                Out-of-Class Summary
              </label>
            </template>
          </div>

          <div v-else class="print-modal__options" style="margin-top: 1rem;">
             <div class="print-modal__section-title">Report Content</div>
             <p class="setup__hint">The Attendance & Activity report generates a visual 5-month grid for the current semester based on your School Calendar settings.</p>
          </div>

          <div class="config-section-header" style="margin-top: 1.5rem;">
            <h4 class="config-section-title">Preview</h4>
            <button class="reports__btn-preview" @click="showPrintPreview = !showPrintPreview">
              {{ showPrintPreview ? 'Hide Preview' : 'Show Preview' }}
            </button>
          </div>
        </div>

        <!-- Live Preview Section -->
        <div v-if="showPrintPreview" class="reports__print-preview-area">
          <header class="preview-banner">
            <Activity :size="14" /> LIVE PREVIEW ({{ printConfig.reportType === 'progress' ? 'Progress' : 'Attendance' }})
          </header>
          <div class="preview-content">
            <div class="preview-content-wrapper">
              <ProgressReport 
                v-if="printConfig.reportType === 'progress'"
                :student-id="studentId" 
                :class-id="classId" 
                :config="printConfig" 
                :is-batch="false"
              />
              <AttendanceActivityReport
                v-else
                :student-id="studentId"
                :class-id="classId"
                :is-batch="false"
              />
            </div>
          </div>
        </div>

        <div v-else class="report-preview-mini">
          <p v-if="printConfig.reportType === 'progress'">This will generate a formal PDF/Print document containing overall grades, performance trends, and assessment history.</p>
          <p v-else>This will generate a visual 5-month attendance calendar with behavioral metrics and totals.</p>
        </div>
      </div>

      <template #footer>
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-generate" @click="triggerPrint">
          Open Print Dialog
          <Printer :size="18" />
        </button>
      </template>
    </BaseModal>

    <!-- Hidden/Active Print Container -->
    <Teleport to="body">
      <div class="print-only-container" :class="{ 'print-only-container--active': isSystemPrinting }">
        <ProgressReport 
          v-if="printConfig.reportType === 'progress'"
          :student-id="studentId" 
          :class-id="classId" 
          :config="printConfig" 
        />
        <AttendanceActivityReport
          v-else
          :student-id="studentId"
          :class-id="classId"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, nextTick } from 'vue'
import { Printer, Activity } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import ProgressReport from './ProgressReport.vue'
import AttendanceActivityReport from './AttendanceActivityReport.vue'
import { activeClassRecord } from '../../composables/useGradebook.js'
import { getEffectiveClassRecord } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  studentId: { type: String, required: true },
  classId: { type: String, required: true }
})

const emit = defineEmits(['close'])

const showPrintPreview = ref(false)
const isSystemPrinting = ref(false)

const effectiveClass = computed(() => {
  return getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
})

const isSBAR = computed(() => {
  const fw = effectiveClass.value?.gradingFramework
  return fw === 'sbar' || (typeof fw === 'string' && fw.startsWith('sbar'))
})

watch(isSystemPrinting, (newValue) => {
  if (newValue) {
    document.body.classList.add('is-printing')
  } else {
    document.body.classList.remove('is-printing')
  }
})

const printConfig = reactive({
  reportType: 'progress',
  expectationScope: 'assessed',
  layoutColumns: '2',
  includeProgression: true,
  includeOverallBadge: true,
  includeAttendance: true,
  includeBehavior: false,
  includeOverallGrade: true,
  includeMedians: false,
  includeGradeTrend: true,
  includeTriangulation: false,
  includeCategorySummary: true
})

async function triggerPrint() {
  emit('close')
  isSystemPrinting.value = true
  
  nextTick(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500))
    window.print()
    isSystemPrinting.value = false
  })
}
</script>

<style scoped>
.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-icon {
  color: var(--primary);
}
.header-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.header-subtitle {
  margin: 2px 0 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.config-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.report-type-toggle {
  display: flex;
  background: var(--bg-secondary);
  padding: 3px;
  border-radius: var(--radius-md);
  gap: 4px;
}

.reports__toggle-btn {
  padding: 6px 14px;
  border: none;
  background: none;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.reports__toggle-btn--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.print-modal__options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.print-modal__section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.print-modal__option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  cursor: pointer;
}

.print-modal__divider {
  height: 1px;
  background: var(--border);
  margin: 8px 0;
}

.reports__btn-preview {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.email-config-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.email-config-modal-body--with-preview {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 20px;
  height: min(720px, 75vh);
  overflow: hidden;
}

@media (max-width: 900px) {
  .email-config-modal-body--with-preview {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
}

.email-config-modal-body--with-preview .config-section {
  overflow-y: auto;
  padding-right: 6px;
}

.reports__print-preview-area {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #cbd5e1;
}

.preview-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.preview-content {
  padding: 20px 10px;
  background: #cbd5e1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex: 1;
  min-height: 0;
}

.preview-content-wrapper {
  transform: scale(0.68);
  transform-origin: top center;
  width: 210mm;
  margin-bottom: -130px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  border-radius: 4px;
  background: #ffffff;
}

.report-preview-mini {
  margin-top: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.btn-generate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

/* Teleport container for printing */
.print-only-container {
  display: none;
}

.print-only-container--active {
  display: block;
  position: fixed;
  inset: 0;
  background: white;
  z-index: 999999;
}
</style>
