<template>
  <BaseModal
    :show="show"
    title="Import Student Learning Skills Survey"
    max-width="780px"
    @close="$emit('close')"
  >
    <div class="lsim-container">
      <!-- Section 1: Target Term Selection -->
      <div class="lsim-term-selector">
        <label class="lsim-label">Target Reporting Period:</label>
        <div class="lsim-pill-group">
          <button
            v-for="termOption in defaultTerms"
            :key="termOption"
            type="button"
            class="lsim-term-pill"
            :class="{ 'lsim-term-pill--active': selectedTerm === termOption }"
            @click="selectedTerm = termOption"
          >
            {{ termOption }}
          </button>
        </div>
      </div>

      <!-- Section 2: CSV Upload Dropzone -->
      <div 
        class="lsim-dropzone"
        :class="{ 'lsim-dropzone--drag': isDragging, 'lsim-dropzone--loaded': parsedResult }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <input 
          id="lsim-file-input"
          type="file" 
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
          class="lsim-file-input"
          @change="onFileSelected" 
        />
        <label for="lsim-file-input" class="lsim-dropzone-label">
          <UploadCloud :size="28" class="lsim-icon-upload" />
          <div class="lsim-dropzone-text">
            <span class="lsim-primary-txt">
              {{ parsedResult ? 'Choose a different file' : 'Click to select or drag & drop Microsoft Forms Excel (.xlsx) or CSV' }}
            </span>
            <span class="lsim-secondary-txt">
              Automatically matches student login email or full name against this class roster
            </span>
          </div>
        </label>
      </div>

      <!-- Setup Guide Helper Link -->
      <div class="lsim-guide-callout">
        <Info :size="14" class="lsim-guide-icon" />
        <span>Need to set up your Microsoft Form?</span>
        <button type="button" class="lsim-guide-link" @click="emit('open-guide')">
          View Setup Guide &amp; Template &rarr;
        </button>
      </div>

      <!-- Error banner if CSV parsing failed -->
      <div v-if="parseError" class="lsim-alert lsim-alert--error">
        <AlertTriangle :size="16" />
        <span>{{ parseError }}</span>
      </div>

      <!-- Section 3: Import Preview & Match Summary -->
      <div v-if="parsedResult" class="lsim-preview">
        <!-- Summary Stats Banner -->
        <div class="lsim-stats-grid">
          <div class="lsim-stat-card lsim-stat-card--success">
            <CheckCircle :size="18" />
            <div>
              <div class="lsim-stat-val">{{ parsedResult.matchedRecords.length }}</div>
              <div class="lsim-stat-lab">Matched Students</div>
            </div>
          </div>
          <div v-if="parsedResult.unmatchedRows.length > 0" class="lsim-stat-card lsim-stat-card--warning">
            <AlertCircle :size="18" />
            <div>
              <div class="lsim-stat-val">{{ parsedResult.unmatchedRows.length }}</div>
              <div class="lsim-stat-lab">Unmatched Submissions</div>
            </div>
          </div>
          <div v-if="parsedResult.duplicateCount > 0" class="lsim-stat-card lsim-stat-card--neutral">
            <RefreshCw :size="18" />
            <div>
              <div class="lsim-stat-val">{{ parsedResult.duplicateCount }}</div>
              <div class="lsim-stat-lab">Duplicates Resolved</div>
            </div>
          </div>
        </div>

        <!-- Options Row -->
        <div class="lsim-options">
          <label class="lsim-checkbox-label">
            <input type="checkbox" v-model="prefillTeacherRatings" />
            <span>Pre-fill Teacher Ratings with Student Self-Ratings as baseline</span>
          </label>
        </div>

        <!-- Matched Students Table Preview -->
        <div class="lsim-table-wrapper">
          <table class="lsim-table">
            <thead>
              <tr>
                <th>Student</th>
                <th style="width: 40px;" title="Responsibility">R</th>
                <th style="width: 40px;" title="Organization">O</th>
                <th style="width: 40px;" title="Independent Work">I</th>
                <th style="width: 40px;" title="Collaboration">C</th>
                <th style="width: 40px;" title="Initiative">I</th>
                <th style="width: 40px;" title="Self-Regulation">S</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rec in parsedResult.matchedRecords" :key="rec.studentId">
                <td class="lsim-student-name">
                  <div class="lsim-name-txt">{{ rec.lastName }}, {{ rec.firstName }}</div>
                  <div class="lsim-email-txt">{{ rec.studentEmail }}</div>
                </td>
                <td v-for="skill in ['responsibility', 'organization', 'independentWork', 'collaboration', 'initiative', 'selfRegulation']" :key="skill" class="text-center">
                  <span v-if="rec.studentEval[skill]" :class="['lsim-badge', `lsim-badge--${rec.studentEval[skill]}`]">
                    {{ rec.studentEval[skill] }}
                  </span>
                  <span v-else class="lsim-badge-empty">—</span>
                </td>
                <td class="lsim-col-action">
                  <button 
                    type="button" 
                    class="lsim-row-del-btn" 
                    title="Remove from import"
                    @click="onRemoveMatchedRecord(idx)"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Unmatched Rows with Interactive Match Dropdown -->
        <div v-if="parsedResult.unmatchedRows.length > 0" class="lsim-unmatched-notice">
          <div class="lsim-unmatched-header">
            <div class="lsim-unmatched-title">
              <AlertTriangle :size="15" /> Unmatched Submissions ({{ parsedResult.unmatchedRows.length }})
            </div>
            <span class="lsim-unmatched-subtitle">
              Select a student to link their responses:
            </span>
          </div>

          <div class="lsim-unmatched-table-wrap">
            <table class="lsim-unmatched-table">
              <thead>
                <tr>
                  <th>Entered Info</th>
                  <th>Ratings</th>
                  <th>Assign to Student</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(u, uIdx) in parsedResult.unmatchedRows" :key="uIdx">
                  <td>
                    <div class="lsim-unmatched-entry">
                      <strong>{{ u.rawName || 'No Name' }}</strong>
                      <span v-if="u.rawEmail" class="lsim-unmatched-sub">{{ u.rawEmail }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="lsim-unmatched-ratings-preview">
                      <span v-for="skill in skillCategories" :key="skill" class="lsim-mini-pill">
                        {{ skill.charAt(0).toUpperCase() }}: {{ u.studentEval[skill] || '—' }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <select 
                      class="lsim-select-student"
                      @change="onManualAssignStudent(uIdx, $event.target.value)"
                    >
                      <option value="">-- Choose Student --</option>
                      <option 
                        v-for="st in rosterStudents" 
                        :key="st.studentId" 
                        :value="st.studentId"
                      >
                        {{ st.lastName }}, {{ st.firstName }}
                      </option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="lsim-footer">
        <button type="button" class="lsim-btn-ghost" @click="$emit('close')">
          Cancel
        </button>
        <button 
          type="button" 
          class="lsim-btn-primary" 
          :disabled="!parsedResult || parsedResult.matchedRecords.length === 0 || isSaving"
          @click="commitImport"
        >
          <Save :size="16" />
          {{ isSaving ? 'Saving...' : `Import ${parsedResult?.matchedRecords.length || 0} Evaluations` }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseModal from '../BaseModal.vue'
import { 
  LEARNING_SKILL_CATEGORIES,
  LEARNING_SKILL_TERMS,
  saveBatchLearningSkills 
} from '../../db/learningSkillsService.js'
import { parseLearningSkillsCsv, parseLearningSkillsWorkbook } from '../../utils/learningSkillsCsvParser.js'
import { 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Save,
  Info 
} from 'lucide-vue-next'

const props = defineProps({
  show: { type: Boolean, required: true },
  classId: { type: String, required: true },
  rosterStudents: { type: Array, default: () => [] },
  initialTerm: { type: String, default: 'Progress Report' }
})

const emit = defineEmits(['close', 'imported', 'open-guide'])

const defaultTerms = LEARNING_SKILL_TERMS
const selectedTerm = ref(props.initialTerm || 'Progress Report')
const isDragging = ref(false)
const parsedResult = ref(null)
const parseError = ref(null)
const prefillTeacherRatings = ref(true)
const isSaving = ref(false)

function resetState() {
  parsedResult.value = null
  parseError.value = null
}

function processFile(file) {
  if (!file) return
  resetState()

  const isXlsx = /\.(xlsx|xls)$/i.test(file.name)
  const reader = new FileReader()

  reader.onload = async (e) => {
    try {
      if (isXlsx) {
        const buffer = e.target.result
        const result = await parseLearningSkillsWorkbook(buffer, props.rosterStudents)
        parsedResult.value = result
      } else {
        const text = e.target.result
        const result = parseLearningSkillsCsv(text, props.rosterStudents)
        parsedResult.value = result
      }
    } catch (err) {
      parseError.value = err.message || 'Failed to parse responses file.'
    }
  }

  reader.onerror = () => {
    parseError.value = 'Failed to read the selected file.'
  }

  if (isXlsx) {
    reader.readAsArrayBuffer(file)
  } else {
    reader.readAsText(file)
  }
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (file) processFile(file)
}

function onDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

const skillCategories = [
  'responsibility',
  'organization',
  'independentWork',
  'collaboration',
  'initiative',
  'selfRegulation'
]

function onManualAssignStudent(unmatchedIndex, targetStudentId) {
  if (!targetStudentId || !parsedResult.value) return
  const targetStudent = props.rosterStudents.find(s => s.studentId === targetStudentId)
  if (!targetStudent) return

  const unmatched = parsedResult.value.unmatchedRows[unmatchedIndex]
  if (!unmatched) return

  const existingIdx = parsedResult.value.matchedRecords.findIndex(r => r.studentId === targetStudentId)
  const newRecord = {
    studentId: targetStudent.studentId,
    firstName: targetStudent.firstName || '',
    lastName: targetStudent.lastName || '',
    studentEmail: targetStudent.studentEmail || unmatched.rawEmail || '',
    matchType: 'manual',
    date: unmatched.dateStr || new Date().toISOString().slice(0, 10),
    studentEval: unmatched.studentEval
  }

  if (existingIdx !== -1) {
    parsedResult.value.matchedRecords.splice(existingIdx, 1, newRecord)
  } else {
    parsedResult.value.matchedRecords.push(newRecord)
  }

  // Remove from unmatched
  parsedResult.value.unmatchedRows.splice(unmatchedIndex, 1)
}

function onRemoveMatchedRecord(recordIndex) {
  if (!parsedResult.value) return
  const removed = parsedResult.value.matchedRecords.splice(recordIndex, 1)[0]
  if (removed) {
    parsedResult.value.unmatchedRows.push({
      rowIndex: -1,
      rawName: `${removed.lastName}, ${removed.firstName}`,
      rawEmail: removed.studentEmail,
      dateStr: removed.date,
      studentEval: removed.studentEval
    })
  }
}

async function commitImport() {
  if (!parsedResult.value || !props.classId) return

  isSaving.value = true
  try {
    const rawRecords = parsedResult.value.matchedRecords.map(item => ({
      classId: String(props.classId),
      studentId: String(item.studentId),
      term: String(selectedTerm.value),
      date: String(item.date || new Date().toISOString().slice(0, 10)),
      studentEval: {
        responsibility: item.studentEval?.responsibility || null,
        organization: item.studentEval?.organization || null,
        independentWork: item.studentEval?.independentWork || null,
        collaboration: item.studentEval?.collaboration || null,
        initiative: item.studentEval?.initiative || null,
        selfRegulation: item.studentEval?.selfRegulation || null
      },
      teacherEval: prefillTeacherRatings.value ? {
        responsibility: item.studentEval?.responsibility || null,
        organization: item.studentEval?.organization || null,
        independentWork: item.studentEval?.independentWork || null,
        collaboration: item.studentEval?.collaboration || null,
        initiative: item.studentEval?.initiative || null,
        selfRegulation: item.studentEval?.selfRegulation || null
      } : {
        responsibility: null,
        organization: null,
        independentWork: null,
        collaboration: null,
        initiative: null,
        selfRegulation: null
      }
    }))

    const cleanRecords = JSON.parse(JSON.stringify(rawRecords))
    await saveBatchLearningSkills(cleanRecords)
    emit('imported', {
      term: selectedTerm.value,
      count: cleanRecords.length
    })
    emit('close')
  } catch (err) {
    console.error('Import save error:', err)
    parseError.value = `Failed to save learning skills: ${err.message}`
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.lsim-container {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.lsim-term-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lsim-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.lsim-pill-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.lsim-term-pill {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lsim-term-pill:hover {
  background: var(--surface);
  color: var(--text);
}

.lsim-term-pill--active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.lsim-dropzone {
  position: relative;
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  padding: 24px 16px;
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
}

.lsim-dropzone:hover,
.lsim-dropzone--drag {
  border-color: var(--primary);
  background: var(--primary-light);
}

.lsim-dropzone--loaded {
  border-style: solid;
  border-color: var(--border);
  padding: 16px;
  background: var(--surface);
}

.lsim-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.lsim-dropzone-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  pointer-events: none;
}

.lsim-icon-upload {
  color: var(--primary);
}

.lsim-dropzone-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.lsim-primary-txt {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.lsim-secondary-txt {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.lsim-guide-callout {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.lsim-guide-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.lsim-guide-link {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.lsim-guide-link:hover {
  opacity: 0.85;
}

.lsim-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
}

.lsim-alert--error {
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger);
  color: var(--color-danger-text);
}

.lsim-preview {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lsim-stats-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.lsim-stat-card {
  flex: 1;
  min-width: 130px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
}

.lsim-stat-card--success {
  color: var(--color-success-text);
  border-color: var(--color-success);
  background: var(--color-success-bg);
}

.lsim-stat-card--warning {
  color: var(--color-warn-text);
  border-color: var(--color-warn);
  background: var(--color-warn-bg);
}

.lsim-stat-card--neutral {
  color: var(--color-neutral-text);
  border-color: var(--border);
  background: var(--color-neutral-bg);
}

.lsim-stat-val {
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.1;
}

.lsim-stat-lab {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.lsim-options {
  display: flex;
  align-items: center;
}

.lsim-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  user-select: none;
}

.lsim-table-wrapper {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.lsim-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.lsim-table th {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  color: var(--text);
  font-weight: 700;
  padding: 10px 12px;
  text-align: left;
  border-bottom: 2px solid var(--border);
  z-index: 1;
}

.lsim-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.text-center {
  text-align: center;
}

.lsim-student-name {
  max-width: 200px;
}

.lsim-name-txt {
  font-weight: 600;
  color: var(--text);
}

.lsim-email-txt {
  font-size: 0.72rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lsim-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  font-weight: 800;
  font-size: 0.75rem;
}

.lsim-badge--E { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
.lsim-badge--G { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.lsim-badge--S { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
.lsim-badge--N { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

.lsim-badge-empty {
  color: var(--text-secondary);
  opacity: 0.4;
}

.lsim-col-action {
  width: 32px;
  text-align: center;
  padding: 4px 6px !important;
}

.lsim-row-del-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.lsim-row-del-btn:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.lsim-unmatched-notice {
  padding: 12px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
  font-size: 0.82rem;
}

.lsim-unmatched-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.lsim-unmatched-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #b45309;
  font-weight: 700;
  font-size: 0.85rem;
}

.lsim-unmatched-subtitle {
  color: #78350f;
  font-size: 0.76rem;
}

.lsim-unmatched-table-wrap {
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid #fde68a;
  border-radius: var(--radius-sm);
  background: #ffffff;
}

.lsim-unmatched-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.lsim-unmatched-table th {
  position: sticky;
  top: 0;
  background: #fef3c7;
  color: #92400e;
  font-weight: 700;
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid #fde68a;
}

.lsim-unmatched-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

.lsim-unmatched-entry {
  display: flex;
  flex-direction: column;
  max-width: 160px;
}

.lsim-unmatched-entry strong {
  color: var(--text);
}

.lsim-unmatched-sub {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.lsim-unmatched-ratings-preview {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.lsim-mini-pill {
  padding: 1px 4px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #374151;
}

.lsim-select-student {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

.lsim-select-student:focus {
  border-color: var(--primary);
}

.lsim-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.lsim-btn-ghost {
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.86rem;
  transition: all 0.15s ease;
}

.lsim-btn-ghost:hover {
  background: var(--bg-secondary);
  border-color: var(--primary);
  color: var(--primary);
}

.lsim-btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: var(--primary);
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.86rem;
  transition: opacity 0.15s ease;
}

.lsim-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
