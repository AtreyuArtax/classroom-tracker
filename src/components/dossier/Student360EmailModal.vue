<template>
  <BaseModal
    :show="show"
    title="Configure Email Report"
    :z-index="3000"
    :max-width="showPreview ? '1080px' : '520px'"
    @close="$emit('close')"
  >
    <template #header>
      <div class="header-content">
        <Mail class="header-icon" :size="24" />
        <div>
          <h3 class="header-title">Configure Email Report</h3>
          <p class="header-subtitle">Select recipients and data points to include.</p>
        </div>
      </div>
    </template>

    <div class="email-config-modal-body" :class="{ 'email-config-modal-body--with-preview': showPreview }">
      <!-- Left Column: Controls (Recipients + Report Options) -->
      <div class="config-controls-pane">
        <!-- Recipients Selection -->
        <div class="config-section">
          <h4 class="config-section-title">Recipients</h4>
          <div class="recipient-list">
            <div 
              v-for="r in emailRecipients" 
              :key="r.email" 
              class="recipient-item"
              :class="{ 'recipient-item--active': selectedRecipientEmails.has(r.email) }"
              @click="toggleRecipient(r.email)"
            >
              <div class="recipient-info">
                <span class="recipient-label">{{ r.label }}</span>
                <span class="recipient-email">{{ r.email }}</span>
              </div>
              <div class="recipient-checkbox">
                <CheckCircle2 v-if="selectedRecipientEmails.has(r.email)" :size="20" class="icon-checked" />
                <div v-else class="checkbox-placeholder"></div>
              </div>
            </div>
            <div v-if="emailRecipients.length === 0" class="recipient-empty">
              No email addresses found for this student or their parents.
            </div>
          </div>
        </div>

        <!-- Content Options -->
        <div class="config-section">
          <div class="config-section-header">
            <h4 class="config-section-title" style="margin-bottom: 0;">Include in Report</h4>
            <button 
              type="button" 
              class="reports__btn-preview" 
              @click="showPreview = !showPreview"
            >
              {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
            </button>
          </div>
          <div class="options-list">
            <label class="option-item">
              <input type="checkbox" v-model="emailConfig.content.grade" />
              <span class="option-label">{{ isSBAR ? 'Current SBAR Overall Level' : 'Current Overall Grade' }}</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="emailConfig.content.assessments" />
              <span class="option-label">{{ isSBAR ? 'Expectation Mastery & Progression' : 'Detailed Assessment List & Attempts' }}</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="emailConfig.content.missing" />
              <span class="option-label">Missing Assessments List</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="emailConfig.content.attendance" />
              <span class="option-label">Attendance Summary</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="emailConfig.content.washroom" />
              <span class="option-label">Out-of-Class Activity</span>
            </label>
            <label class="option-item" v-if="includeWorkingHoursStatement">
              <input type="checkbox" v-model="emailConfig.content.workingHours" />
              <span class="option-label">Working Hours Statement</span>
            </label>
          </div>
        </div>

        <!-- Collapsed Preview Notice -->
        <div v-if="!showPreview" class="report-preview-mini">
          <p>Live preview is hidden. Click <strong>Show Preview</strong> to review the generated email draft side-by-side.</p>
        </div>
      </div>

      <!-- Right Column: Live Email Preview (Matching Documents & Communication Hub) -->
      <div v-if="showPreview" class="reports__print-preview-area">
        <header class="preview-banner">
          <div class="preview-banner__left">
            <Activity :size="14" />
            <span>LIVE EMAIL PREVIEW</span>
          </div>
          <button 
            type="button" 
            class="btn-copy-preview"
            @click="copyEmailBody"
            title="Copy draft text to clipboard"
          >
            <component :is="copied ? Check : Copy" :size="13" />
            <span>{{ copied ? 'Copied!' : 'Copy Text' }}</span>
          </button>
        </header>
        <div class="preview-content">
          <div class="email-preview-paper">
            <pre class="email-preview-text">{{ emailBody }}</pre>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn-cancel" @click="$emit('close')">Cancel</button>
      <button 
        class="btn-generate" 
        :disabled="selectedRecipientEmails.size === 0"
        @click="generateEmailLink"
      >
        <span>Open in Mail</span>
        <ChevronRight :size="18" />
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, toRef } from 'vue'
import { Mail, CheckCircle2, ChevronRight, Copy, Check, Activity } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { formatLocalDisplay } from '../../utils/dates.js'
import { toMinutes } from '../../utils/timeUtils.js'
import { 
  generateMobileSafeEmail, 
  generateMobileSafeEmailBody, 
  copyRichEmailToClipboard
} from '../../utils/emailFormatter.js'
import { activeClassRecord, gradeMap, assessments } from '../../composables/useGradebook.js'
import { useSBarPrintOptions } from '../../composables/useSBarPrintOptions.js'
import { getEffectiveClassRecord } from '../../composables/useElementary.js'
import { 
  activeSubjectId, 
  teacherTitle, 
  schoolName, 
  teacherEmail, 
  includeWorkingHoursStatement 
} from '../../composables/useClassroomState.js'
import { useActionAlerts } from '../../composables/useActionAlerts.js'
import { suggestEmailContent, buildContactNote } from '../../utils/actionAlerts.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  studentId: { type: String, default: '' },
  classId: { type: String, default: '' },
  student: { type: Object, required: true },
  formattedGrade: { type: String, default: 'N/A' },
  allDossierAssessments: { type: Array, default: () => [] },
  classAssessments: { type: Array, default: () => [] },
  individualAssessments: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({ absences: 0, lates: 0 }) },
  washroomCount: { type: Number, default: 0 },
  attendanceAverages: { type: Object, default: () => ({}) },
  outOfClassEvents: { type: Array, default: () => [] },
  selectedPeriod: { type: String, default: 'semester' },
  teacherName: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const targetStudentId = computed(() => props.studentId || props.student?.id || props.student?.studentId || '')

const { getStudentOverallSBarBadge, prepareSBarReportData } = useSBarPrintOptions()

const effectiveClass = computed(() => {
  return getEffectiveClassRecord(activeClassRecord.value, activeSubjectId.value)
})

const isSBAR = computed(() => {
  const fw = effectiveClass.value?.gradingFramework
  return fw === 'sbar' || (typeof fw === 'string' && fw.startsWith('sbar'))
})

const sbarOverallBadge = computed(() => {
  if (!targetStudentId.value) return null
  return getStudentOverallSBarBadge(targetStudentId.value, effectiveClass.value, assessments.value, gradeMap.value)
})

const DEFAULT_CONTENT = { 
  grade: true, 
  missing: true, 
  attendance: true, 
  washroom: false, 
  assessments: true, 
  workingHours: includeWorkingHoursStatement.value || false 
}
const emailConfig = ref({
  recipients: { student: true, parents: true },
  content: { ...DEFAULT_CONTENT }
})

const { alertFor, pendingEmailFor, setPendingEmail } = useActionAlerts(toRef(props, 'classId'))

const periodDisplay = computed(() => {
  const p = props.selectedPeriod || 'semester'
  if (p === 'week') return 'This Week'
  if (p === 'last_week') return 'Last Week'
  if (p === 'month') return 'This Month'
  if (p === 'semester') return 'This Semester'
  return p.charAt(0).toUpperCase() + p.slice(1)
})

const emailRecipients = computed(() => {
  const list = []
  if (props.student.studentEmail) {
    list.push({ id: 'student', label: 'Student', email: props.student.studentEmail })
  }
  if (props.student.parentContacts) {
    props.student.parentContacts.forEach((pc, idx) => {
      if (pc.email) {
        list.push({ id: `parent_${idx}`, label: pc.name || `Parent ${idx + 1}`, email: pc.email })
      }
    })
  }
  return list
})

const selectedRecipientEmails = ref(new Set())
const copied = ref(false)
const showPreview = ref(true)

// Reopening restores the last choices; otherwise preselect sections matching the alert
watch(() => props.show, (open) => {
  if (!open) return
  copied.value = false
  showPreview.value = true
  const pending = pendingEmailFor(targetStudentId.value)
  if (pending) {
    selectedRecipientEmails.value = new Set(pending.recipients || [])
    emailConfig.value.content = { ...DEFAULT_CONTENT, ...pending.content }
    return
  }
  selectedRecipientEmails.value = new Set(emailRecipients.value.map(r => r.email))
  const suggested = suggestEmailContent(alertFor(targetStudentId.value)?.kinds)
  emailConfig.value.content = { ...DEFAULT_CONTENT, ...(suggested || {}) }
})

/** Remembers the email so the dossier can ask whether it was actually sent. */
function recordPendingEmail() {
  const recipients = Array.from(selectedRecipientEmails.value)
  const recipientLabels = emailRecipients.value
    .filter(r => selectedRecipientEmails.value.has(r.email))
    .map(r => r.id === 'student' ? 'student' : `${r.label} (parent)`)
  const reason = alertFor(targetStudentId.value)?.reason || ''
  const content = { ...emailConfig.value.content }
  setPendingEmail(targetStudentId.value, {
    recipients,
    content,
    reason,
    note: buildContactNote({ recipientLabels, content, reason })
  })
}

function toggleRecipient(email) {
  if (selectedRecipientEmails.value.has(email)) {
    selectedRecipientEmails.value.delete(email)
  } else {
    selectedRecipientEmails.value.add(email)
  }
}

const studentEmailData = computed(() => {
  const fullName = `${props.student.firstName || ''} ${props.student.lastName || ''}`.trim() || 'Student'
  
  const isNonAdmin = a => (
    a &&
    !a.excluded &&
    a.purpose !== 'administrative' &&
    String(a.category || '').trim().toLowerCase() !== 'admin' &&
    String(a.category || '').trim().toLowerCase() !== 'administrative'
  )

  // Format recent assessments (exclude admin tasks and non-graded items)
  const recentAssessments = [...props.allDossierAssessments]
    .filter(a => a.score !== null && isNonAdmin(a))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(a => ({
      date: formatLocalDisplay(a.date, { month: 'short', day: 'numeric' }),
      name: a.name,
      score: a.score,
      totalPoints: a.totalPoints,
      category: a.category
    }))

  // Missing assessments (exclude administrative checklists)
  let missing = [
    ...props.classAssessments.filter(a => (a.missing || a.score === null) && isNonAdmin(a)),
    ...props.individualAssessments.filter(a => (a.missing || a.score === null) && isNonAdmin(a))
  ]
  if (isSBAR.value) {
    missing = missing.filter(a => {
      const hasExp = (a.expectationIds && a.expectationIds.length > 0) || a.expectationId
      const isSbarMode = a.isSbar || a.gradingFramework === 'sbar' || a.assessmentType === 'sbar'
      return hasExp || isSbarMode
    })
  }

  // Deduplicate and format missing assessments with names and dates
  const seenMissingIds = new Set()
  const formattedMissing = []
  for (const a of missing) {
    const id = a.assessmentId || a.id
    if (!id || !seenMissingIds.has(id)) {
      if (id) seenMissingIds.add(id)
      formattedMissing.push({
        name: a.name || a.title || 'Untitled Assessment',
        date: a.date ? formatLocalDisplay(a.date, { month: 'short', day: 'numeric' }) : '',
        category: a.category || ''
      })
    }
  }

  // SBAR expectations if applicable
  let sbarExpectations = []
  if (isSBAR.value) {
    const sbarUnits = prepareSBarReportData(
      targetStudentId.value,
      effectiveClass.value,
      assessments.value,
      gradeMap.value,
      [],
      'assessed'
    )
    sbarUnits.forEach(u => {
      if (u.expectations) sbarExpectations.push(...u.expectations)
    })
  }

  const washCount = props.washroomCount || 0
  const washMins = props.attendanceAverages?.washroomTotal ?? (props.stats?.washroomMinutes ?? 0)

  return {
    name: fullName,
    course: effectiveClass.value?.name,
    teacher: props.teacherName || 'Teacher',
    teacherTitle: teacherTitle.value || '',
    schoolName: schoolName.value || '',
    teacherEmail: teacherEmail.value || '',
    includeWorkingHoursStatement: emailConfig.value.content.workingHours !== undefined ? emailConfig.value.content.workingHours : (includeWorkingHoursStatement.value || false),
    overallGrade: props.formattedGrade,
    isSbar: isSBAR.value,
    sbarOverallBadge: sbarOverallBadge.value,
    sbarExpectations,
    recentAssessments,
    missingCount: formattedMissing.length,
    missingAssessments: formattedMissing,
    attendance: {
      rate: props.stats?.attendanceRate,
      absences: props.stats?.absences ?? 0,
      lates: props.stats?.lates ?? 0
    },
    outOfClass: {
      trips: washCount,
      minutes: washMins
    },
    recipients: Array.from(selectedRecipientEmails.value)
  }
})

const emailBody = computed(() => {
  return generateMobileSafeEmailBody(studentEmailData.value, {
    includeGrade: emailConfig.value.content.grade,
    includeAssessments: emailConfig.value.content.assessments,
    includeMissing: emailConfig.value.content.missing,
    includeAttendance: emailConfig.value.content.attendance,
    includeWashroom: emailConfig.value.content.washroom
  })
})

async function copyEmailBody() {
  try {
    await copyRichEmailToClipboard(studentEmailData.value, {
      includeGrade: emailConfig.value.content.grade,
      includeAssessments: emailConfig.value.content.assessments,
      includeMissing: emailConfig.value.content.missing,
      includeAttendance: emailConfig.value.content.attendance,
      includeWashroom: emailConfig.value.content.washroom
    })
    copied.value = true
    recordPendingEmail()
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy email draft:', err)
  }
}

async function generateEmailLink() {
  // Automatically put the styled rich HTML card on the clipboard
  // so the user can easily Cmd+V / Ctrl+V paste it into Outlook/Gmail if they prefer the visual card
  try {
    await copyRichEmailToClipboard(studentEmailData.value, {
      includeGrade: emailConfig.value.content.grade,
      includeAssessments: emailConfig.value.content.assessments,
      includeMissing: emailConfig.value.content.missing,
      includeAttendance: emailConfig.value.content.attendance,
      includeWashroom: emailConfig.value.content.washroom
    })
  } catch (err) {
    console.warn('Could not copy rich HTML to clipboard:', err)
  }

  // Open native mail client with mobile-safe plain text
  const result = generateMobileSafeEmail(studentEmailData.value, {
    includeGrade: emailConfig.value.content.grade,
    includeAssessments: emailConfig.value.content.assessments,
    includeMissing: emailConfig.value.content.missing,
    includeAttendance: emailConfig.value.content.attendance,
    includeWashroom: emailConfig.value.content.washroom
  })
  recordPendingEmail()
  window.location.href = result.mailtoUrl
  emit('close')
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

.email-config-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.email-config-modal-body--with-preview {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  height: min(680px, 72vh);
  overflow: hidden;
}

@media (max-width: 900px) {
  .email-config-modal-body--with-preview {
    grid-template-columns: 1fr;
    height: auto;
    overflow-y: auto;
  }
}

.config-controls-pane {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
}

.email-config-modal-body--with-preview .config-controls-pane {
  overflow-y: auto;
  padding-right: 6px;
}

.config-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
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
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.reports__btn-preview:hover {
  background: var(--surface-hover);
  border-color: var(--primary);
}

.recipient-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.recipient-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.recipient-item:hover {
  border-color: var(--primary);
}

.recipient-item--active {
  background: var(--surface);
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.recipient-info {
  display: flex;
  flex-direction: column;
}

.recipient-label {
  font-weight: 600;
  font-size: 0.9rem;
}

.recipient-email {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.recipient-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  text-align: center;
}

.icon-checked {
  color: var(--primary);
}

.checkbox-placeholder {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-radius: 50%;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  cursor: pointer;
}

.report-preview-mini {
  padding: 14px 16px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.report-preview-mini p {
  margin: 0;
}

/* ── Live Email Preview Area (Documents & Communication style) ─────── */
.reports__print-preview-area {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg-secondary);
}

.preview-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.preview-banner__left {
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-copy-preview {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy-preview:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
  border-color: var(--primary);
}

.preview-content {
  padding: 16px;
  background: #cbd5e1;
  overflow-y: auto !important;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

:root[data-theme='dark'] .preview-content,
.dark .preview-content {
  background: #1e293b;
}

.email-preview-paper {
  background: var(--surface, #ffffff);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 20px 22px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.email-preview-text {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-primary, #0f172a);
  white-space: pre-wrap;
  word-break: break-word;
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

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
