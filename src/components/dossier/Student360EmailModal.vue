<template>
  <BaseModal
    :show="show"
    title="Configure Email Report"
    :z-index="3000"
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

    <div class="email-config-modal-body">
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
        <h4 class="config-section-title">Include in Report</h4>
        <div class="options-grid">
          <label class="option-item">
            <input type="checkbox" v-model="emailConfig.content.grade" />
            <span class="option-label">{{ isSBAR ? 'Current SBAR Overall Level' : 'Current Overall Grade' }}</span>
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="emailConfig.content.missing" />
            <span class="option-label">Missing Assessments List</span>
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="emailConfig.content.washroom" />
            <span class="option-label">Out-of-Class Activity Logs</span>
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="emailConfig.content.assessments" />
            <span class="option-label">{{ isSBAR ? 'Expectation Mastery & Progression' : 'Detailed Assessment List & Attempts' }}</span>
          </label>
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
        Generate Draft & Open Mail
        <ChevronRight :size="18" />
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Mail, CheckCircle2, ChevronRight } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { formatLocalDisplay } from '../../utils/dates.js'
import { activeClassRecord, gradeMap, assessments } from '../../composables/useGradebook.js'
import { useSBarPrintOptions } from '../../composables/useSBarPrintOptions.js'

import { getEffectiveClassRecord } from '../../composables/useElementary.js'
import { activeSubjectId } from '../../composables/useClassroomState.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  studentId: { type: String, default: '' },
  student: { type: Object, required: true },
  formattedGrade: { type: String, default: 'N/A' },
  allDossierAssessments: { type: Array, default: () => [] },
  classAssessments: { type: Array, default: () => [] },
  individualAssessments: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({ absences: 0, lates: 0 }) },
  washroomCount: { type: Number, default: 0 },
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

const emailConfig = ref({
  recipients: { student: true, parents: true },
  content: { grade: true, missing: true, attendance: true, washroom: false, assessments: true }
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

watch(() => props.show, (open) => {
  if (open) {
    selectedRecipientEmails.value = new Set(emailRecipients.value.map(r => r.email))
  }
})

function toggleRecipient(email) {
  if (selectedRecipientEmails.value.has(email)) {
    selectedRecipientEmails.value.delete(email)
  } else {
    selectedRecipientEmails.value.add(email)
  }
}

function generateEmailLink() {
  const emails = Array.from(selectedRecipientEmails.value).join(',')
  const subject = `Progress Report Update: ${props.student.firstName} ${props.student.lastName}`
  
  let body = `Hello,\n\nI am sharing a progress update for ${props.student.firstName}.\n\n`
  
  if (isSBAR.value) {
    if (emailConfig.value.content.grade) {
      const badge = sbarOverallBadge.value
      body += `Current SBAR Overall Level: ${badge?.label || 'Not Assessed'} (${badge?.level || '—'})\n`
    }

    if (emailConfig.value.content.assessments) {
      const sbarUnits = prepareSBarReportData(
        targetStudentId.value,
        effectiveClass.value,
        assessments.value,
        gradeMap.value,
        [],
        'assessed'
      )
      
      const allExps = []
      sbarUnits.forEach(u => {
        if (u.expectations) allExps.push(...u.expectations)
      })

      if (allExps.length > 0) {
        body += `\nCurriculum Expectation Mastery:\n`
        allExps.forEach(exp => {
          let labelStr = exp.code
          if (exp.description && exp.description !== exp.code) {
            labelStr = `${exp.code} (${exp.description})`
          }
          let line = `- ${labelStr}: Level ${exp.badge?.level || '—'} (${exp.badge?.label || 'Unassessed'})`
          if (exp.evaluations && exp.evaluations.length > 0) {
            const history = exp.evaluations.slice(-3).map(e => e.badge?.level || '—').join(' ➔ ')
            line += ` [Progression: ${history}]`
          }
          body += `${line}\n`
        })
      }
    }
  } else {
    if (emailConfig.value.content.grade) {
      body += `Current Overall Grade: ${props.formattedGrade}\n`
    }
    
    if (emailConfig.value.content.assessments) {
      const list = [...props.allDossierAssessments]
        .filter(a => a.score !== null && !a.excluded)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      
      if (list.length > 0) {
        body += `\nAcademic Record & Recent Progress:\n`
        list.forEach(a => {
          const date = formatLocalDisplay(a.date, { month: 'short', day: 'numeric' })
          let line = `${date} - ${a.name}: ${Math.round((a.score / a.totalPoints) * 100)}%`
          if (a.attempts?.length > 1) {
            const history = a.attempts
              .map(att => Math.round((att.pointsEarned / a.totalPoints) * 100) + '%')
              .join(', ')
            line += ` (Attempts history: ${history})`
          }
          body += `- ${line}\n`
        })
      }
    }
  }

  if (emailConfig.value.content.missing) {
    let missing = [
      ...props.classAssessments.filter(a => (a.missing || a.score === null) && !a.excluded),
      ...props.individualAssessments.filter(a => (a.missing || a.score === null) && !a.excluded)
    ]

    if (isSBAR.value) {
      missing = missing.filter(a => {
        const hasExp = (a.expectationIds && a.expectationIds.length > 0) || a.expectationId
        const isSbarMode = a.isSbar || a.gradingFramework === 'sbar' || a.assessmentType === 'sbar'
        return hasExp || isSbarMode
      })
    }

    if (missing.length > 0) {
      body += `\nMissing Assessments:\n`
      missing.forEach(m => body += `- ${m.name}\n`)
    } else {
      body += `\nNo missing assessments at this time.\n`
    }
  }
  
  if (emailConfig.value.content.attendance) {
    body += `\nAttendance Summary:\n`
    body += `- Absences: ${props.stats.absences}\n`
    body += `- Lates: ${props.stats.lates}\n`
  }
  
  if (emailConfig.value.content.washroom) {
    body += `\nOut of Class Logs:\n`
    body += `- Out-of-class trips in period: ${props.washroomCount}\n`
  }
  
  body += `\nPlease let me know if you have any questions.\n\nBest regards,\n${props.teacherName || 'Teacher'}`
  
  const mailto = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = mailto
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
  gap: 20px;
}

.config-section-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px 0;
}

.recipient-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.icon-checked {
  color: var(--primary);
}

.checkbox-placeholder {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-radius: 50%;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  cursor: pointer;
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
