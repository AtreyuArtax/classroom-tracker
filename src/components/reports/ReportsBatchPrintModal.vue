<template>
  <div>
    <!-- Batch Print Configuration Modal -->
    <div v-if="show" class="reports__modal-overlay">
      <div 
        class="reports__print-modal"
        :class="{ 'reports__print-modal--preview-open': showPreview, 'reports__print-modal--compact': !showPreview }"
      >
        <header class="reports__modal-header">
          <div class="header-content">
            <Printer class="header-icon" :size="24" />
            <div>
              <h3 class="header-title">Batch Print Progress Reports</h3>
              <p class="header-subtitle">Generating professional reports for {{ filteredBatchStudents.length }} students.</p>
            </div>
          </div>
          <button class="header-close" @click="$emit('close')">
            <X :size="20" />
          </button>
        </header>

        <div class="reports__modal-body" :class="{ 'reports__modal-body--with-preview': showPreview }">
          <div class="config-section">
            <div class="config-section-header">
              <h4 class="config-section-title">Include in Documents</h4>
              <button class="reports__btn-preview" @click="showPreview = !showPreview">
                {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
              </button>
            </div>
            <div class="print-modal__options">
              <label v-if="isSplitClass" class="setup__label" style="margin-bottom: 8px;">
                Students to Include
                <select v-model="selectedCohort" class="setup__input">
                  <option value="all">Entire Class Roster ({{ sidebarStudents.length }})</option>
                  <option v-for="c in cohortOptionsOnly" :key="c" :value="c">
                    {{ c }} Only ({{ countForCohort(c) }})
                  </option>
                </select>
              </label>

              <div class="print-modal__section-title">{{ isSBAR ? 'SBAR Content & Scope' : 'Report Content' }}</div>

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
                  Attendance Table
                </label>
                <label class="print-modal__option">
                  <input type="checkbox" v-model="printConfig.includeBehavior" />
                  Out-of-Class Table
                </label>
              </template>
            </div>
          </div>

          <!-- Live Preview Section -->
          <div v-if="showPreview" class="reports__print-preview-area">
            <header class="preview-banner">
              <Activity :size="14" /> LIVE PREVIEW (First Student)
            </header>
            <div class="preview-content">
              <div class="preview-content-wrapper">
                <ProgressReport 
                  v-if="filteredBatchStudents.length > 0"
                  :student-id="filteredBatchStudents[0].studentId" 
                  :class-id="sidebarClassId" 
                  :config="printConfig" 
                  :is-batch="false"
                />
              </div>
            </div>
          </div>

          <div v-else class="report-preview-mini">
            <p>Each student's report will start on a new page. Ideal for printing or saving as a single class PDF.</p>
          </div>
        </div>

        <footer class="reports__modal-footer">
          <button class="reports__btn-ghost" @click="$emit('close')">Cancel</button>
          <button class="reports__btn-primary" @click="triggerBatchPrint">
            Open Print Dialog
            <Printer :size="18" />
          </button>
        </footer>
      </div>
    </div>

    <!-- Hidden/Active Batch Print Container -->
    <Teleport to="body">
      <div class="print-only-container" :class="{ 'print-only-container--active': isSystemPrinting }">
        <template v-if="isSystemPrinting">
          <ProgressReport 
            v-for="s in filteredBatchStudents" 
            :key="s.studentId"
            :student-id="s.studentId" 
            :class-id="sidebarClassId" 
            :config="printConfig" 
            :is-batch="true"
          />
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, nextTick } from 'vue'
import { Printer, X, Activity } from 'lucide-vue-next'
import ProgressReport from '../dossier/ProgressReport.vue'
import { loadGradebook } from '../../composables/useGradebook.js'
import { usePrintOptions } from '../../composables/usePrintOptions.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  sidebarStudents: { type: Array, default: () => [] },
  sidebarClassId: { type: String, default: null },
  reportClass: { type: Object, default: null },
  initialCohort: { type: String, default: 'all' }
})

const emit = defineEmits(['close'])

const classRecordRef = computed(() => props.reportClass)
const { selectedCohort, isSplitClass, availableSubCohorts, filterStudents, isElementary } = usePrintOptions(classRecordRef, props.initialCohort)

const cohortOptionsOnly = computed(() => {
  return availableSubCohorts.value.filter(c => c !== 'all')
})

function countForCohort(cohortTag) {
  const isElem = isElementary.value
  return props.sidebarStudents.filter(s => {
    const tag = isElem ? s.gradeLevel : s.courseCode
    return tag === cohortTag
  }).length
}

const filteredBatchStudents = computed(() => {
  return filterStudents(props.sidebarStudents, selectedCohort.value)
})

const showPreview = ref(false)
const isSystemPrinting = ref(false)

watch(isSystemPrinting, (newValue) => {
  if (newValue) {
    document.body.classList.add('is-printing')
  } else {
    document.body.classList.remove('is-printing')
  }
})

import { activeClassRecord } from '../../composables/useGradebook.js'
import { getEffectiveClassRecord } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'

const effectiveClass = computed(() => {
  return getEffectiveClassRecord(props.reportClass || activeClassRecord.value, activeSubjectId.value)
})

const isSBAR = computed(() => {
  const fw = effectiveClass.value?.gradingFramework
  return fw === 'sbar' || (typeof fw === 'string' && fw.startsWith('sbar'))
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

async function triggerBatchPrint() {
  emit('close')
  isSystemPrinting.value = true
  
  if (props.reportClass) {
    await loadGradebook(props.reportClass)
  }
  
  nextTick(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500))
    window.print()
    isSystemPrinting.value = false
  })
}
</script>

<style scoped>
.reports__modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.reports__print-modal {
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-xl);
  width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.reports__print-modal--compact {
  max-width: 520px;
  height: auto;
}

.reports__print-modal--preview-open {
  max-width: 1150px;
  height: min(850px, 88vh);
}

.reports__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

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

.header-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}

.reports__modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.reports__modal-body--with-preview {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 20px;
  overflow: hidden;
  padding: 20px;
}

@media (max-width: 900px) {
  .reports__modal-body--with-preview {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
}

.config-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.reports__modal-body--with-preview .config-section {
  overflow-y: auto;
  padding-right: 6px;
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

.reports__btn-preview {
  padding: 4px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.print-modal__options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
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
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.reports__modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.reports__btn-ghost {
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.reports__btn-primary {
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
