<template>
  <BaseModal
    :show="show"
    title="Class Broadcast &amp; BCC Email"
    max-width="680px"
    :z-index="3000"
    @close="$emit('close')"
  >
    <template #header>
      <div class="ce-header">
        <div class="ce-header__icon-box">
          <Mail :size="22" class="ce-header__icon" />
        </div>
        <div class="ce-header__title-group">
          <h3 class="ce-header__title">Class Broadcast &amp; BCC Email</h3>
          <p class="ce-header__subtitle">
            {{ classRecord?.name || 'Active Class' }} · {{ activeAudienceSummary }}
          </p>
        </div>
      </div>
    </template>

    <div class="ce-modal-body">
      <!-- ── Sub-Cohort / Split Class Selector (if applicable) ────────── -->
      <div v-if="isSplitClass" class="ce-section ce-cohort-section">
        <div class="ce-cohort-header">
          <span class="ce-section-title">Cohort / Section</span>
          <span class="ce-cohort-badge">{{ cohortTypeLabel }} Selection</span>
        </div>
        <div class="ce-cohort-pills">
          <button
            v-for="c in availableSubCohorts"
            :key="c"
            type="button"
            class="ce-cohort-pill"
            :class="{ 'ce-cohort-pill--active': selectedCohort === c }"
            @click="selectedCohort = c"
          >
            {{ c === 'all' ? `Entire Class (${totalStudentsCount})` : `${c} (${countForCohort(c)})` }}
          </button>
        </div>
      </div>

      <!-- ── Target Audience Toggle Cards ─────────────────────────────── -->
      <div class="ce-section">
        <span class="ce-section-title">Target Audience</span>
        <div class="ce-audience-grid">
          <!-- Parent / Guardian Option -->
          <label 
            class="ce-audience-card"
            :class="{ 'ce-audience-card--active': includeParents }"
          >
            <div class="ce-audience-card__checkbox-wrap">
              <input 
                type="checkbox" 
                v-model="includeParents" 
                class="ce-checkbox"
              />
            </div>
            <div class="ce-audience-card__content">
              <div class="ce-audience-card__header">
                <Users :size="17" class="ce-audience-icon" />
                <span class="ce-audience-name">Parents &amp; Guardians</span>
              </div>
              <p class="ce-audience-meta">
                {{ totalParentEmailsCount }} email{{ totalParentEmailsCount === 1 ? '' : 's' }} across {{ activeStudents.length }} students
              </p>
            </div>
            <span class="ce-audience-count-pill">{{ totalParentEmailsCount }}</span>
          </label>

          <!-- Student Option -->
          <label 
            class="ce-audience-card"
            :class="{ 'ce-audience-card--active': includeStudents }"
          >
            <div class="ce-audience-card__checkbox-wrap">
              <input 
                type="checkbox" 
                v-model="includeStudents" 
                class="ce-checkbox"
              />
            </div>
            <div class="ce-audience-card__content">
              <div class="ce-audience-card__header">
                <GraduationCap :size="17" class="ce-audience-icon" />
                <span class="ce-audience-name">Students</span>
              </div>
              <p class="ce-audience-meta">
                {{ totalStudentEmailsCount }} student email{{ totalStudentEmailsCount === 1 ? '' : 's' }} on file
              </p>
            </div>
            <span class="ce-audience-count-pill">{{ totalStudentEmailsCount }}</span>
          </label>
        </div>
      </div>

      <!-- ── Missing Contacts Audit Notice ────────────────────────────── -->
      <div v-if="missingContactsList.length > 0" class="ce-missing-alert">
        <div class="ce-missing-alert__header" @click="showMissingDetails = !showMissingDetails">
          <div class="ce-missing-alert__title-group">
            <AlertCircle :size="17" class="ce-missing-icon" />
            <span class="ce-missing-text">
              <strong>{{ missingContactsList.length }} student{{ missingContactsList.length === 1 ? '' : 's' }}</strong> missing contact information
            </span>
          </div>
          <button type="button" class="ce-missing-toggle-btn">
            {{ showMissingDetails ? 'Hide' : 'Review' }}
            <component :is="showMissingDetails ? ChevronUp : ChevronDown" :size="14" />
          </button>
        </div>

        <div v-if="showMissingDetails" class="ce-missing-list">
          <div 
            v-for="item in missingContactsList" 
            :key="item.studentId" 
            class="ce-missing-item"
          >
            <span class="ce-missing-name">{{ item.lastName }}, {{ item.firstName }}</span>
            <div class="ce-missing-tags">
              <span v-if="!item.hasParent" class="ce-missing-tag ce-missing-tag--parent">No Parent Email</span>
              <span v-if="!item.hasStudent" class="ce-missing-tag ce-missing-tag--student">No Student Email</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Subject & Message Details ─────────────────────────────────── -->
      <div class="ce-section">
        <span class="ce-section-title">Message Details</span>
        <div class="ce-form-group">
          <label class="ce-label">
            Email Subject
            <input 
              v-model="emailSubject" 
              type="text" 
              class="ce-input" 
              placeholder="e.g. Important Class Update"
            />
          </label>
          <label class="ce-label" style="margin-top: 10px;">
            Optional Message Template / Notes
            <textarea 
              v-model="emailBody" 
              class="ce-input ce-textarea" 
              rows="3" 
              placeholder="Type initial greeting or notes to pre-fill into your email client..."
            ></textarea>
          </label>
        </div>
      </div>

      <!-- ── Recipient List Preview & Individual Toggles ───────────────── -->
      <div class="ce-section">
        <div class="ce-recipient-header">
          <span class="ce-section-title">
            Recipients ({{ selectedRecipientsList.length }} BCC Addresses)
          </span>
          <button 
            type="button" 
            class="ce-toggle-list-btn"
            @click="showRecipientList = !showRecipientList"
          >
            {{ showRecipientList ? 'Collapse List' : 'Review Individual Recipients' }}
            <component :is="showRecipientList ? ChevronUp : ChevronDown" :size="14" />
          </button>
        </div>

        <!-- Recipient Count Pills Bar -->
        <div class="ce-stats-bar">
          <div class="ce-stat-chip">
            <span class="ce-stat-dot ce-stat-dot--parent"></span>
            <span>{{ parentRecipientsCount }} Parents</span>
          </div>
          <div class="ce-stat-chip">
            <span class="ce-stat-dot ce-stat-dot--student"></span>
            <span>{{ studentRecipientsCount }} Students</span>
          </div>
          <div class="ce-stat-chip ce-stat-chip--total">
            <span>Total: <strong>{{ selectedRecipientsList.length }}</strong> BCC Recipients</span>
          </div>
        </div>

        <!-- Expandable Recipient Checklist -->
        <div v-if="showRecipientList" class="ce-recipient-scroll">
          <div 
            v-for="rec in allAvailableRecipients" 
            :key="rec.uniqueKey"
            class="ce-recipient-row"
            :class="{ 'ce-recipient-row--excluded': excludedKeys.has(rec.uniqueKey) }"
            @click="toggleRecipient(rec.uniqueKey)"
          >
            <div class="ce-recipient-row__left">
              <input 
                type="checkbox" 
                :checked="!excludedKeys.has(rec.uniqueKey)" 
                class="ce-checkbox"
                @click.stop="toggleRecipient(rec.uniqueKey)"
              />
              <div class="ce-recipient-row__info">
                <div class="ce-recipient-row__name-line">
                  <span class="ce-recipient-row__name">{{ rec.name }}</span>
                  <span 
                    class="ce-role-badge"
                    :class="rec.role === 'parent' ? 'ce-role-badge--parent' : 'ce-role-badge--student'"
                  >
                    {{ rec.roleLabel }}
                  </span>
                </div>
                <span class="ce-recipient-row__email">{{ rec.email }}</span>
              </div>
            </div>
            <span class="ce-recipient-row__student-ref">
              Student: {{ rec.studentLastName }}, {{ rec.studentFirstName }}
            </span>
          </div>

          <div v-if="allAvailableRecipients.length === 0" class="ce-empty-recipients">
            No email addresses found for the selected audience.
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal Footer with Dual Actions ──────────────────────────────── -->
    <template #footer>
      <div class="ce-footer">
        <button 
          type="button" 
          class="ce-btn-ghost" 
          @click="$emit('close')"
        >
          Cancel
        </button>

        <div class="ce-footer__actions">
          <!-- Copy All BCC Addresses (Essential for webmail & URL limits) -->
          <button 
            type="button" 
            class="ce-btn-secondary" 
            :disabled="selectedRecipientsList.length === 0"
            @click="copyAllBccEmails"
            :title="`Copy ${selectedRecipientsList.length} BCC email addresses to clipboard`"
          >
            <component :is="isCopied ? Check : Copy" :size="16" />
            <span>{{ isCopied ? `Copied (${selectedRecipientsList.length})!` : 'Copy All BCC Addresses' }}</span>
          </button>

          <!-- Launch Default Mail Client via mailto: BCC -->
          <button 
            type="button" 
            class="ce-btn-primary" 
            :disabled="selectedRecipientsList.length === 0"
            @click="openDefaultMailClient"
          >
            <Mail :size="16" />
            <span>Open in Mail Client</span>
            <ExternalLink :size="14" style="opacity: 0.8;" />
          </button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { 
  Mail, 
  Users, 
  GraduationCap, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import { usePrintOptions } from '../composables/usePrintOptions.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  classRecord: { type: Object, required: true },
  teacherName: { type: String, default: '' },
  initialCohort: { type: String, default: 'all' }
})

const emit = defineEmits(['close'])

const classRecordRef = computed(() => props.classRecord)
const { 
  selectedCohort, 
  isSplitClass, 
  availableSubCohorts, 
  filterStudents, 
  cohortTypeLabel,
  isElementary 
} = usePrintOptions(classRecordRef, props.initialCohort)

// Toggles & form inputs
const includeParents = ref(true)
const includeStudents = ref(true)
const emailSubject = ref('')
const emailBody = ref('')
const showMissingDetails = ref(false)
const showRecipientList = ref(false)
const isCopied = ref(false)
const excludedKeys = ref(new Set())

// Initialize subject line when modal opens
watch(() => props.show, (isOpen) => {
  if (isOpen) {
    const clsName = props.classRecord?.name || 'Class'
    emailSubject.value = `[${clsName}] Important Class Update`
    emailBody.value = `Hello,\n\nI am sharing an update with students and families for ${clsName}.\n\nBest regards,\n${props.teacherName || 'Teacher'}`
    isCopied.value = false
    excludedKeys.value = new Set()
  }
})

// All active students enrolled in class
const allStudentsList = computed(() => {
  if (!props.classRecord?.students) return []
  return Object.entries(props.classRecord.students)
    .filter(([_, s]) => !s.archived)
    .map(([id, s]) => ({ studentId: id, ...s }))
})

const totalStudentsCount = computed(() => allStudentsList.value.length)

function countForCohort(cohortTag) {
  const isElem = isElementary.value
  return allStudentsList.value.filter(s => {
    const tag = isElem ? s.gradeLevel : s.courseCode
    return tag === cohortTag
  }).length
}

// Filtered student list based on active cohort selection
const activeStudents = computed(() => {
  return filterStudents(allStudentsList.value, selectedCohort.value)
})

// Summary subtitle
const activeAudienceSummary = computed(() => {
  const count = activeStudents.value.length
  if (selectedCohort.value && selectedCohort.value !== 'all') {
    return `${count} Students in ${selectedCohort.value}`
  }
  return `${count} Students Enrolled`
})

// Missing contacts audit
const missingContactsList = computed(() => {
  const missing = []
  activeStudents.value.forEach(s => {
    const hasStudent = !!(s.studentEmail || s.email)?.trim()
    const hasParent = Array.isArray(s.parentContacts) && s.parentContacts.some(pc => pc?.email?.trim())
    if (!hasStudent || !hasParent) {
      missing.push({
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        hasStudent,
        hasParent
      })
    }
  })
  return missing
})

// Counts
const totalParentEmailsCount = computed(() => {
  let count = 0
  activeStudents.value.forEach(s => {
    if (Array.isArray(s.parentContacts)) {
      s.parentContacts.forEach(pc => {
        if (pc?.email?.trim()) count++
      })
    }
  })
  return count
})

const totalStudentEmailsCount = computed(() => {
  return activeStudents.value.filter(s => !!(s.studentEmail || s.email)?.trim()).length
})

// Available recipients based on checkboxes (Parents / Students)
const allAvailableRecipients = computed(() => {
  const list = []

  activeStudents.value.forEach(s => {
    // 1. Parent contacts
    if (includeParents.value && Array.isArray(s.parentContacts)) {
      s.parentContacts.forEach((pc, idx) => {
        const email = pc?.email?.trim()
        if (email) {
          const roleLabel = pc.relationship 
            ? `${pc.relationship}` 
            : (pc.name ? `Parent: ${pc.name}` : `Parent / Guardian`)
          list.push({
            uniqueKey: `parent_${s.studentId}_${idx}_${email.toLowerCase()}`,
            email,
            name: pc.name || `Parent of ${s.firstName}`,
            role: 'parent',
            roleLabel,
            studentFirstName: s.firstName,
            studentLastName: s.lastName,
            studentId: s.studentId
          })
        }
      })
    }

    // 2. Student email
    if (includeStudents.value) {
      const email = (s.studentEmail || s.email)?.trim()
      if (email) {
        list.push({
          uniqueKey: `student_${s.studentId}_${email.toLowerCase()}`,
          email,
          name: `${s.firstName} ${s.lastName}`,
          role: 'student',
          roleLabel: 'Student',
          studentFirstName: s.firstName,
          studentLastName: s.lastName,
          studentId: s.studentId
        })
      }
    }
  })

  return list
})

// Active selected recipient items (excluding unchecked ones)
const activeRecipients = computed(() => {
  return allAvailableRecipients.value.filter(r => !excludedKeys.value.has(r.uniqueKey))
})

// Distinct list of email strings for BCC
const selectedRecipientsList = computed(() => {
  const set = new Set()
  activeRecipients.value.forEach(r => {
    if (r.email) set.add(r.email.trim())
  })
  return Array.from(set)
})

const parentRecipientsCount = computed(() => {
  return activeRecipients.value.filter(r => r.role === 'parent').length
})

const studentRecipientsCount = computed(() => {
  return activeRecipients.value.filter(r => r.role === 'student').length
})

function toggleRecipient(uniqueKey) {
  if (excludedKeys.value.has(uniqueKey)) {
    excludedKeys.value.delete(uniqueKey)
  } else {
    excludedKeys.value.add(uniqueKey)
  }
}

// Copy to clipboard action
async function copyAllBccEmails() {
  if (selectedRecipientsList.value.length === 0) return
  const emailsText = selectedRecipientsList.value.join(', ')

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(emailsText)
    } else {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = emailsText
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2500)
  } catch (err) {
    console.error('Failed to copy emails:', err)
  }
}

// Open default mail client with BCC
function openDefaultMailClient() {
  if (selectedRecipientsList.value.length === 0) return

  const bccEmails = selectedRecipientsList.value.join(',')
  const subject = emailSubject.value || `Important Class Update`
  const body = emailBody.value || ''

  const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = mailtoUrl
  emit('close')
}
</script>

<style scoped>
.ce-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ce-header__icon-box {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ce-header__icon {
  color: #3b82f6;
}

.ce-header__title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ce-header__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
}

.ce-header__subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.ce-modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ce-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ce-section-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Sub-Cohort Selection */
.ce-cohort-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}

.ce-cohort-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.ce-cohort-badge {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.ce-cohort-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ce-cohort-pill {
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ce-cohort-pill:hover {
  border-color: var(--primary);
}

.ce-cohort-pill--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* Audience Grid */
.ce-audience-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.ce-audience-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.ce-audience-card:hover {
  border-color: var(--primary);
}

.ce-audience-card--active {
  background: var(--surface);
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.ce-audience-card__checkbox-wrap {
  display: flex;
  align-items: center;
}

.ce-checkbox {
  width: 17px;
  height: 17px;
  cursor: pointer;
  accent-color: var(--primary);
}

.ce-audience-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ce-audience-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ce-audience-icon {
  color: var(--primary);
}

.ce-audience-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
}

.ce-audience-meta {
  margin: 0;
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.ce-audience-count-pill {
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 12px;
  color: var(--text);
}

/* Missing Contacts Alert */
.ce-missing-alert {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-md);
  padding: 10px 14px;
}

.ce-missing-alert__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.ce-missing-alert__title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ce-missing-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

.ce-missing-text {
  font-size: 0.825rem;
  color: var(--text);
}

.ce-missing-toggle-btn {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #f59e0b;
  cursor: pointer;
  padding: 2px 6px;
}

.ce-missing-list {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(245, 158, 11, 0.3);
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 130px;
  overflow-y: auto;
}

.ce-missing-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.ce-missing-name {
  font-weight: 600;
  color: var(--text);
}

.ce-missing-tags {
  display: flex;
  gap: 6px;
}

.ce-missing-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.ce-missing-tag--parent {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.ce-missing-tag--student {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

/* Form inputs */
.ce-form-group {
  display: flex;
  flex-direction: column;
}

.ce-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ce-input {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.875rem;
  transition: border-color 0.15s ease;
}

.ce-input:focus {
  outline: none;
  border-color: var(--primary);
}

.ce-textarea {
  resize: vertical;
  line-height: 1.4;
  font-family: inherit;
}

/* Recipients List & Toggles */
.ce-recipient-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ce-toggle-list-btn {
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}

.ce-stats-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.ce-stat-chip {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ce-stat-chip--total {
  margin-left: auto;
  color: var(--text);
}

.ce-stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.ce-stat-dot--parent { background: #3b82f6; }
.ce-stat-dot--student { background: #10b981; }

.ce-recipient-scroll {
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  display: flex;
  flex-direction: column;
}

.ce-recipient-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 12px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.1s ease;
  font-size: 0.8rem;
}

.ce-recipient-row:last-child {
  border-bottom: none;
}

.ce-recipient-row:hover {
  background: var(--surface-hover);
}

.ce-recipient-row--excluded {
  opacity: 0.45;
  background: var(--bg-secondary);
}

.ce-recipient-row__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ce-recipient-row__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ce-recipient-row__name-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ce-recipient-row__name {
  font-weight: 600;
  color: var(--text);
}

.ce-role-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.ce-role-badge--parent {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.ce-role-badge--student {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.ce-recipient-row__email {
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.ce-recipient-row__student-ref {
  font-size: 0.74rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-left: 12px;
}

.ce-empty-recipients {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.825rem;
}

/* Footer & Buttons */
.ce-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.ce-footer__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ce-btn-ghost {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ce-btn-ghost:hover {
  background: var(--surface-hover);
}

.ce-btn-secondary {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ce-btn-secondary:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--surface-hover);
}

.ce-btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ce-btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.ce-btn-primary:hover:not(:disabled) {
  opacity: 0.92;
}

.ce-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .ce-audience-grid {
    grid-template-columns: 1fr;
  }
  
  .ce-footer {
    flex-direction: column;
    gap: 12px;
  }
  
  .ce-footer__actions {
    width: 100%;
    flex-direction: column;
  }
  
  .ce-btn-secondary, .ce-btn-primary, .ce-btn-ghost {
    width: 100%;
    justify-content: center;
  }
}
</style>
