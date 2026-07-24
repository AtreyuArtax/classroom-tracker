<template>
  <div>
    <!-- Batch Print Configuration Modal -->
    <div v-if="show" class="reports__modal-overlay">
      <div class="reports__print-modal reports__print-modal--wide">
        <header class="reports__modal-header">
          <div class="header-content">
            <Printer class="header-icon" :size="24" />
            <div>
              <h3 class="header-title">Batch Print Progress Reports</h3>
              <p class="header-subtitle">Generating professional reports for {{ sidebarStudents.length }} students.</p>
            </div>
          </div>
          <button class="header-close" @click="$emit('close')">
            <X :size="20" />
          </button>
        </header>

        <div class="reports__modal-body">
          <div class="config-section">
            <div class="config-section-header">
              <h4 class="config-section-title">Include in Documents</h4>
              <button class="reports__btn-preview" @click="showPreview = !showPreview">
                {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
              </button>
            </div>
            <div class="print-modal__options">
              <div class="print-modal__section-title">Report Content</div>
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
            </div>
          </div>

          <!-- Live Preview Section -->
          <div v-if="showPreview" class="reports__print-preview-area">
            <header class="preview-banner">
              <Activity :size="14" /> LIVE PREVIEW (First Student)
            </header>
            <div class="preview-content">
              <ProgressReport 
                v-if="sidebarStudents.length > 0"
                :student-id="sidebarStudents[0].studentId" 
                :class-id="sidebarClassId" 
                :config="printConfig" 
                :is-batch="false"
              />
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
            v-for="s in sidebarStudents" 
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
import { ref, reactive, watch, nextTick } from 'vue'
import { Printer, X, Activity } from 'lucide-vue-next'
import ProgressReport from '../dossier/ProgressReport.vue'
import { loadGradebook } from '../../composables/useGradebook.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  sidebarStudents: { type: Array, default: () => [] },
  sidebarClassId: { type: String, required: true },
  reportClass: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const showPreview = ref(false)
const isSystemPrinting = ref(false)

watch(isSystemPrinting, (newValue) => {
  if (newValue) {
    document.body.classList.add('is-printing')
  } else {
    document.body.classList.remove('is-printing')
  }
})

const printConfig = reactive({
  reportType: 'progress',
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
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reports__print-modal--wide {
  max-width: 700px;
}

.reports__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
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
  margin-top: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  max-height: 350px;
  overflow-y: auto;
}

.preview-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-secondary);
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
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
