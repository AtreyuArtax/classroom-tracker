<template>
  <BaseModal
    :show="show"
    title="Student Information &amp; Intake Survey"
    max-width="840px"
    @close="emit('close')"
  >
    <div class="sism-container">
      <!-- Top Tab Navigation -->
      <div class="sism-tabs">
        <button
          type="button"
          class="sism-tab"
          :class="{ 'sism-tab--active': activeTab === 'import' }"
          @click="activeTab = 'import'"
        >
          <UploadCloud :size="15" /> Import Survey Data
        </button>
        <button
          type="button"
          class="sism-tab"
          :class="{ 'sism-tab--active': activeTab === 'setup' }"
          @click="activeTab = 'setup'"
        >
          <FileText :size="15" /> Microsoft Forms Setup &amp; Template
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- TAB 1: IMPORT SURVEY DATA                                 -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'import'" class="sism-tab-content">
        <!-- Dropzone -->
        <div
          class="sism-dropzone"
          :class="{ 'sism-dropzone--drag': isDragging, 'sism-dropzone--loaded': parsedResult }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <input
            id="sism-file-input"
            type="file"
            accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="sism-file-input"
            @change="onFileSelected"
          />
          <label for="sism-file-input" class="sism-dropzone-label">
            <UploadCloud :size="28" class="sism-icon-upload" />
            <div class="sism-dropzone-text">
              <span class="sism-primary-txt">
                {{ parsedResult ? 'Choose or drop a different file' : 'Click to select or drag & drop Microsoft Forms Excel (.xlsx) or CSV' }}
              </span>
              <span class="sism-secondary-txt">
                Automatically matches students by school email, student ID, or full name
              </span>
            </div>
          </label>
        </div>

        <!-- Setup Helper Callout -->
        <div class="sism-guide-callout">
          <Info :size="14" class="sism-guide-icon" />
          <span>Haven't created your Microsoft Form yet?</span>
          <button type="button" class="sism-guide-link" @click="activeTab = 'setup'">
            Download Word Template (.docx) &rarr;
          </button>
        </div>

        <!-- Error Banner -->
        <div v-if="parseError" class="sism-alert sism-alert--error">
          <AlertTriangle :size="16" />
          <span>{{ parseError }}</span>
        </div>

        <!-- Parsed Results Preview -->
        <div v-if="parsedResult" class="sism-preview">
          <!-- Summary Metrics -->
          <div class="sism-stats-grid">
            <div class="sism-stat-card sism-stat-card--success">
              <CheckCircle2 :size="18" />
              <div>
                <div class="sism-stat-val">{{ parsedResult.matchedRecords.length }}</div>
                <div class="sism-stat-lab">Matched Students</div>
              </div>
            </div>
            <div v-if="parsedResult.unmatchedRows.length > 0" class="sism-stat-card sism-stat-card--warning">
              <AlertCircle :size="18" />
              <div>
                <div class="sism-stat-val">{{ parsedResult.unmatchedRows.length }}</div>
                <div class="sism-stat-lab">Unmatched Submissions</div>
              </div>
            </div>
            <div v-if="parsedResult.duplicateCount > 0" class="sism-stat-card sism-stat-card--neutral">
              <RefreshCw :size="18" />
              <div>
                <div class="sism-stat-val">{{ parsedResult.duplicateCount }}</div>
                <div class="sism-stat-lab">Duplicates Resolved</div>
              </div>
            </div>
          </div>

          <!-- Matched Students Table Preview -->
          <div class="sism-table-wrapper">
            <table class="sism-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Preferred Name</th>
                  <th>Pronouns</th>
                  <th>Target Goal</th>
                  <th>Confidence</th>
                  <th>Seating</th>
                  <th style="width: 40px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(rec, idx) in parsedResult.matchedRecords" :key="rec.studentId">
                  <td class="sism-student-name">
                    <div class="sism-name-txt">{{ rec.lastName }}, {{ rec.firstName }}</div>
                    <div class="sism-email-txt">{{ rec.studentEmail || rec.studentId }}</div>
                  </td>
                  <td>
                    <span v-if="rec.surveyData.preferredName" class="sism-badge sism-badge--name">
                      "{{ rec.surveyData.preferredName }}"
                    </span>
                    <span v-else class="sism-empty">—</span>
                  </td>
                  <td>
                    <div v-if="rec.surveyData.pronouns" class="sism-pronoun-wrap">
                      <span class="sism-badge sism-badge--pronoun">{{ rec.surveyData.pronouns }}</span>
                      <span v-if="isClassOnlyComms(rec.surveyData.parentCommunication)" class="sism-badge-icon" title="Only in class — use official name with parents">
                        <Lock :size="11" />
                      </span>
                    </div>
                    <span v-else class="sism-empty">—</span>
                  </td>
                  <td>
                    <span v-if="rec.surveyData.targetGrade" class="sism-badge sism-badge--goal">
                      {{ formatShortGoal(rec.surveyData.targetGrade) }}
                    </span>
                    <span v-else class="sism-empty">—</span>
                  </td>
                  <td>
                    <span v-if="rec.surveyData.courseConfidence" class="sism-badge sism-badge--conf" :class="`sism-badge--conf-${rec.surveyData.courseConfidence}`">
                      <span class="sism-mini-meter">
                        <span v-for="i in 5" :key="i" class="sism-mini-meter__bar" :class="{ 'sism-mini-meter__bar--filled': rec.surveyData.courseConfidence >= i }"></span>
                      </span>
                      {{ rec.surveyData.courseConfidence }}/5
                    </span>
                    <span v-else class="sism-empty">—</span>
                  </td>
                  <td>
                    <span v-if="rec.surveyData.seatingPreference" class="sism-seat-txt" :title="rec.surveyData.seatingPreference">
                      {{ rec.surveyData.seatingPreference }}
                    </span>
                    <span v-else class="sism-empty">—</span>
                  </td>
                  <td class="sism-col-action">
                    <button
                      type="button"
                      class="sism-row-del-btn"
                      title="Remove from import"
                      @click="removeMatchedRecord(idx)"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Unmatched Submissions Interactive Matcher -->
          <div v-if="parsedResult.unmatchedRows.length > 0" class="sism-unmatched-card">
            <div class="sism-unmatched-header">
              <AlertTriangle :size="15" />
              <strong>Unmatched Submissions ({{ parsedResult.unmatchedRows.length }})</strong>
              <span class="sism-unmatched-sub">Match these responses manually to a student on your roster:</span>
            </div>
            <div class="sism-unmatched-list">
              <div v-for="(unm, uIdx) in parsedResult.unmatchedRows" :key="uIdx" class="sism-unmatched-item">
                <div class="sism-unmatched-meta">
                  <span class="sism-unmatched-name">{{ unm.submittedNames.join(' / ') || 'Unknown Name' }}</span>
                  <span class="sism-unmatched-email">{{ unm.submittedEmails.join(' / ') || 'No email' }}</span>
                  <span v-if="unm.surveyData.preferredName" class="sism-unmatched-pref">Prefers: "{{ unm.surveyData.preferredName }}"</span>
                </div>
                <div class="sism-unmatched-assign">
                  <select
                    class="sism-select-student"
                    @change="e => assignUnmatchedToStudent(uIdx, e.target.value)"
                  >
                    <option value="">-- Select Student to Assign --</option>
                    <option
                      v-for="st in availableRosterStudents"
                      :key="st.studentId"
                      :value="st.studentId"
                    >
                      {{ st.lastName }}, {{ st.firstName }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════ -->
      <!-- TAB 2: MICROSOFT FORMS SETUP & TEMPLATE                   -->
      <!-- ══════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'setup'" class="sism-tab-content">
        <!-- Banner -->
        <div class="sism-banner">
          <div class="sism-banner-icon">
            <Sparkles :size="22" />
          </div>
          <div class="sism-banner-text">
            <h4 class="sism-banner-title">Create your Day 1 Form in 30 Seconds</h4>
            <p class="sism-banner-desc">
              Download our pre-formatted Word template and upload it straight to Microsoft Forms' <strong>Quick Import</strong>.
            </p>
          </div>
        </div>

        <!-- 3-Step Guide -->
        <div class="sism-steps">
          <!-- Step 1 -->
          <div class="sism-step">
            <div class="sism-step-badge">1</div>
            <div class="sism-step-body">
              <h5 class="sism-step-title">Download the Word (.docx) Template</h5>
              <p class="sism-step-desc">
                Contains the 8 standardized questions formatted with multiple choice options (a., b., c.) and text fields.
              </p>
              <div class="sism-step-actions">
                <button
                  type="button"
                  class="sism-btn sism-btn--primary"
                  :disabled="isGeneratingDocx"
                  @click="downloadTemplate"
                >
                  <Download :size="15" /> {{ isGeneratingDocx ? 'Generating...' : 'Download Word Template (.docx)' }}
                </button>
                <button
                  type="button"
                  class="sism-btn sism-btn--secondary"
                  @click="copyQuestionsText"
                >
                  <Clipboard :size="15" /> {{ copiedText ? 'Copied Questions!' : 'Copy Questions Text' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="sism-step">
            <div class="sism-step-badge">2</div>
            <div class="sism-step-body">
              <h5 class="sism-step-title">Quick Import in Microsoft Forms</h5>
              <p class="sism-step-desc">
                Go to <a href="https://forms.cloud.microsoft/" target="_blank" rel="noopener noreferrer" class="sism-link">forms.cloud.microsoft</a>, click <strong>Quick import</strong> &rarr; <strong>Upload</strong>, and choose the downloaded <code>.docx</code> file. Forms will automatically generate all 8 questions.
              </p>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="sism-step sism-step--alert">
            <div class="sism-step-badge sism-step-badge--alert">3</div>
            <div class="sism-step-body">
              <div class="sism-alert-title-row">
                <ShieldCheck :size="16" class="sism-alert-icon" />
                <h5 class="sism-step-title">Ensure School Organization Login is ON</h5>
              </div>
              <p class="sism-step-desc">
                In Microsoft Forms, open <strong>&hellip; (Settings)</strong> and ensure <em>"Only people in my organization can respond"</em> is selected with <strong>Record name</strong> checked. This allows automated matching by school email!
              </p>
            </div>
          </div>
        </div>

        <!-- Question Preview Accordion -->
        <div class="sism-questions-preview">
          <button
            type="button"
            class="sism-preview-toggle"
            @click="showQuestionsList = !showQuestionsList"
          >
            <span>Preview the 8 Survey Questions</span>
            <component :is="showQuestionsList ? ChevronUp : ChevronDown" :size="16" />
          </button>
          <div v-if="showQuestionsList" class="sism-questions-list">
            <pre class="sism-pre">{{ STUDENT_INFO_QUESTIONS_TEXT }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Footer Actions -->
    <template #footer>
      <div class="sism-footer">
        <button type="button" class="sism-btn sism-btn--ghost" @click="emit('close')">
          Cancel
        </button>
        <button
          v-if="activeTab === 'import' && parsedResult && parsedResult.matchedRecords.length > 0"
          type="button"
          class="sism-btn sism-btn--primary"
          :disabled="isSaving"
          @click="applyImport"
        >
          <Check :size="15" /> {{ isSaving ? 'Saving...' : `Import Data for ${parsedResult.matchedRecords.length} Students` }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseModal from '../BaseModal.vue'
import { saveAs } from 'file-saver'
import {
  UploadCloud,
  FileText,
  Sparkles,
  Download,
  Clipboard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  ChevronDown,
  ChevronUp,
  Check,
  Info
} from 'lucide-vue-next'

import { parseCsvRows, parseXlsxToRows } from '../../utils/learningSkillsCsvParser.js'
import { parseStudentInfoRows } from '../../utils/studentInfoCsvParser.js'
import { generateStudentInfoDocx, STUDENT_INFO_QUESTIONS_TEXT } from '../../utils/studentInfoDocxExport.js'
import { useClassroom } from '../../composables/useClassroom.js'
import { useMessage } from '../../composables/useMessage.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  initialTab: { type: String, default: 'import' }
})

const emit = defineEmits(['close', 'imported'])

const activeTab = ref(props.initialTab || 'import')
const isDragging = ref(false)
const isGeneratingDocx = ref(false)
const copiedText = ref(false)
const showQuestionsList = ref(false)
const isSaving = ref(false)

const parsedResult = ref(null)
const parseError = ref(null)

const { sortedRoster, activeClass, importStudentSurveys } = useClassroom()
const { alert } = useMessage()

const availableRosterStudents = computed(() => {
  return sortedRoster.value || []
})

function isClassOnlyComms(val) {
  if (!val) return false
  return /only.*class|privately/i.test(val)
}

function formatShortGoal(val) {
  if (!val) return '—'
  const match = val.match(/^(\d+%\s*[–-]\s*\d+%)/)
  if (match) return match[1]
  if (/confidence|improve/i.test(val)) return 'Improve/Pass'
  return val.slice(0, 16)
}

async function downloadTemplate() {
  try {
    isGeneratingDocx.value = true
    const blob = await generateStudentInfoDocx()
    saveAs(blob, 'Student_Information_Survey_Template.docx')
  } catch (err) {
    console.error('Failed to generate docx template:', err)
    await alert('Failed to generate template. Please try copying the text instead.')
  } finally {
    isGeneratingDocx.value = false
  }
}

async function copyQuestionsText() {
  try {
    await navigator.clipboard.writeText(STUDENT_INFO_QUESTIONS_TEXT)
    copiedText.value = true
    setTimeout(() => { copiedText.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy questions text:', err)
  }
}

async function handleFile(file) {
  parseError.value = null
  parsedResult.value = null
  if (!file) return

  try {
    let rows = []
    const ext = file.name.split('.').pop().toLowerCase()
    
    if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer()
      rows = await parseXlsxToRows(buffer)
    } else {
      const text = await file.text()
      rows = parseCsvRows(text)
    }

    if (!rows || rows.length < 2) {
      throw new Error('The selected file does not contain any survey data rows.')
    }

    const res = parseStudentInfoRows(rows, availableRosterStudents.value)
    parsedResult.value = res
  } catch (err) {
    console.error('Failed to parse survey file:', err)
    parseError.value = err.message || 'Failed to parse file. Please verify it is a valid Microsoft Forms export.'
  }
}

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (file) handleFile(file)
  e.target.value = ''
}

function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function removeMatchedRecord(idx) {
  if (parsedResult.value && parsedResult.value.matchedRecords) {
    parsedResult.value.matchedRecords.splice(idx, 1)
  }
}

function assignUnmatchedToStudent(unmatchedIdx, studentId) {
  if (!studentId || !parsedResult.value) return
  const st = availableRosterStudents.value.find(s => s.studentId === studentId)
  if (!st) return

  const unmatched = parsedResult.value.unmatchedRows[unmatchedIdx]
  if (!unmatched) return

  // Remove existing matched record for this student if any
  parsedResult.value.matchedRecords = parsedResult.value.matchedRecords.filter(r => r.studentId !== studentId)

  // Add new matched record
  parsedResult.value.matchedRecords.push({
    studentId: st.studentId,
    firstName: st.firstName,
    lastName: st.lastName,
    studentEmail: st.studentEmail || (unmatched.submittedEmails[0] || ''),
    surveyData: unmatched.surveyData,
    matchMethod: 'manual_override'
  })

  // Remove from unmatched
  parsedResult.value.unmatchedRows.splice(unmatchedIdx, 1)
}

async function applyImport() {
  if (!parsedResult.value || !parsedResult.value.matchedRecords.length) return
  if (!activeClass.value?.classId) return

  isSaving.value = true
  try {
    const payload = parsedResult.value.matchedRecords.map(r => ({
      studentId: r.studentId,
      surveyData: r.surveyData
    }))

    await importStudentSurveys(activeClass.value.classId, payload)
    emit('imported', payload.length)
    emit('close')
    await alert(`Successfully imported intake survey data for ${payload.length} students!`, 'Import Complete')
  } catch (err) {
    console.error('Failed to import surveys:', err)
    await alert('Failed to save survey data. Please try again.')
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.sism-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Tabs */
.sism-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.sism-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 8px);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sism-tab:hover {
  background: var(--bg-secondary);
  color: var(--text);
}

.sism-tab--active {
  background: var(--primary-light, rgba(70, 99, 172, 0.1));
  color: var(--primary);
  font-weight: 600;
}

/* Dropzone */
.sism-dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius-md, 12px);
  background: var(--bg-secondary);
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sism-dropzone:hover,
.sism-dropzone--drag {
  border-color: var(--primary);
  background: var(--primary-light, rgba(70, 99, 172, 0.08));
}

.sism-dropzone--loaded {
  border-style: solid;
  border-color: rgba(52, 199, 89, 0.4);
  background: rgba(52, 199, 89, 0.04);
  padding: 1.25rem;
}

.sism-file-input {
  display: none;
}

.sism-dropzone-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.sism-icon-upload {
  color: var(--primary);
}

.sism-dropzone-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sism-primary-txt {
  font-weight: 600;
  color: var(--text);
  font-size: 0.95rem;
}

.sism-secondary-txt {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Guide Callout */
.sism-guide-callout {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: var(--radius-sm, 8px);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.sism-guide-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.sism-guide-link {
  background: transparent;
  border: none;
  color: var(--primary);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

/* Alerts */
.sism-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-sm, 8px);
  font-size: 0.875rem;
}

.sism-alert--error {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  border: 1px solid rgba(255, 59, 48, 0.2);
}

/* Stats */
.sism-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 1rem 0;
}

.sism-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--border);
  background: var(--surface);
}

.sism-stat-card--success {
  border-color: rgba(52, 199, 89, 0.3);
  color: #34c759;
}

.sism-stat-card--warning {
  border-color: rgba(255, 149, 0, 0.3);
  color: #ff9500;
}

.sism-stat-card--neutral {
  color: var(--text-secondary);
}

.sism-stat-val {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
}

.sism-stat-lab {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Table */
.sism-table-wrapper {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
}

.sism-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;
  text-align: left;
}

.sism-table th {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  padding: 8px 10px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  z-index: 1;
}

.sism-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.sism-student-name {
  min-width: 130px;
}

.sism-name-txt {
  font-weight: 600;
  color: var(--text);
}

.sism-email-txt {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.sism-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.sism-badge--name {
  background: rgba(70, 99, 172, 0.1);
  color: var(--primary);
  font-weight: 600;
}

.sism-badge--pronoun {
  background: var(--bg-secondary);
  color: var(--text);
  border: 1px solid var(--border);
}

.sism-badge--goal {
  background: rgba(88, 86, 214, 0.1);
  color: #5856d6;
  font-weight: 600;
}

.sism-badge--conf {
  background: var(--bg-secondary);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sism-mini-meter {
  display: inline-flex;
  align-items: center;
  gap: 1.5px;
  height: 8px;
}

.sism-mini-meter__bar {
  width: 2.5px;
  height: 8px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0.25;
}

.sism-mini-meter__bar--filled {
  opacity: 1;
}

.sism-badge--conf-5,
.sism-badge--conf-4 {
  background: rgba(52, 199, 89, 0.12);
  color: #248a3d;
}

.sism-badge--conf-3 {
  background: rgba(255, 149, 0, 0.12);
  color: #c97500;
}

.sism-badge--conf-2,
.sism-badge--conf-1 {
  background: rgba(255, 59, 48, 0.12);
  color: #d70015;
}

.sism-pronoun-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sism-badge-icon {
  color: #ff9500;
  display: inline-flex;
  align-items: center;
}

.sism-seat-txt {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

.sism-empty {
  color: var(--text-secondary);
  opacity: 0.4;
}

.sism-row-del-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.sism-row-del-btn:hover {
  color: #ff3b30;
}

/* Unmatched */
.sism-unmatched-card {
  margin-top: 1rem;
  padding: 12px;
  border-radius: var(--radius-sm, 8px);
  background: rgba(255, 149, 0, 0.06);
  border: 1px solid rgba(255, 149, 0, 0.25);
}

.sism-unmatched-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #c97500;
  font-size: 0.85rem;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.sism-unmatched-sub {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-left: auto;
}

.sism-unmatched-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sism-unmatched-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--surface);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.sism-unmatched-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sism-unmatched-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text);
}

.sism-unmatched-email {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.sism-unmatched-pref {
  font-size: 0.75rem;
  color: var(--primary);
  font-style: italic;
}

.sism-select-student {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.825rem;
}

/* Setup Tab */
.sism-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 1rem 1.25rem;
  background: var(--primary-light, rgba(70, 99, 172, 0.1));
  border-radius: var(--radius-md, 12px);
}

.sism-banner-icon {
  color: var(--primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.sism-banner-title {
  margin: 0 0 2px 0;
  font-size: 0.95rem;
  color: var(--text);
}

.sism-banner-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.sism-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 1.25rem 0;
}

.sism-step {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  background: var(--surface);
}

.sism-step--alert {
  border-color: rgba(52, 199, 89, 0.4);
  background: rgba(52, 199, 89, 0.04);
}

.sism-step-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
}

.sism-step-badge--alert {
  background: #34c759;
}

.sism-step-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.sism-step-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.sism-step-desc {
  margin: 0;
  font-size: 0.825rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.sism-step-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.sism-alert-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sism-alert-icon {
  color: #34c759;
}

.sism-link {
  color: var(--primary);
  font-weight: 600;
  text-decoration: underline;
}

.sism-questions-preview {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  overflow: hidden;
}

.sism-preview-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}

.sism-questions-list {
  padding: 12px 14px;
  background: var(--surface);
  max-height: 200px;
  overflow-y: auto;
}

.sism-pre {
  margin: 0;
  font-family: inherit;
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  line-height: 1.5;
}

/* Footer & Buttons */
.sism-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}

.sism-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-sm, 8px);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 38px;
}

.sism-btn--primary {
  background: var(--primary);
  color: #ffffff;
  border: none;
}

.sism-btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.sism-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sism-btn--secondary {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.sism-btn--secondary:hover {
  background: var(--bg-secondary);
}

.sism-btn--ghost {
  background: transparent;
  border: none;
  color: var(--text-secondary);
}

.sism-btn--ghost:hover {
  color: var(--text);
}
</style>
