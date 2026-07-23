<template>
  <div class="student-360__pane student-360__pane--profile">
    <div class="profile-section">
      <h3 class="profile-section__title">Demographics</h3>
      <div class="profile-grid">
        <div class="profile-item">
          <span class="profile-item__label">Age / DOB</span>
          <span class="profile-item__value" :class="{ 'profile-item__value--adult': isAdult }">
            <ShieldCheck v-if="isAdult" :size="14" class="adult-icon" />
            {{ student.birthDate ? `${computeAge(student.birthDate)} (${student.birthDate})` : '—' }}
          </span>
        </div>
        <div class="profile-item">
          <span class="profile-item__label">Student Email</span>
          <span class="profile-item__value">
            <a :href="'mailto:' + student.studentEmail" v-if="student.studentEmail">{{ student.studentEmail }}</a>
            <span v-else>—</span>
          </span>
        </div>
        <div class="profile-item">
          <span class="profile-item__label">Living With</span>
          <span class="profile-item__value">{{ student.livingWith || '—' }}</span>
        </div>
        <div class="profile-item">
          <span class="profile-item__label">Custody</span>
          <span class="profile-item__value">{{ student.custody || '—' }}</span>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <h3 class="profile-section__title">Parent / Guardian Contacts</h3>
      <div v-if="!student.parentContacts?.length" class="text-muted">No contacts on file.</div>
      <div v-else class="contacts-list">
        <div v-for="(c, i) in student.parentContacts" :key="i" class="contact-card">
          <div class="contact-card__name">{{ c.name }}</div>
          <div class="contact-card__meta">
            <a :href="'mailto:' + c.email" v-if="c.email">{{ c.email }}</a>
            <span v-if="c.phone">{{ c.phone }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <h3 class="profile-section__title">General Notes</h3>
      <textarea 
        class="student-360__notes-area"
        placeholder="Seating needs, accommodations, etc..."
        v-model="localGeneralNote"
        @blur="updateGeneralNoteLocal"
      ></textarea>
    </div>

    <div class="profile-actions">
      <div class="profile-actions__label">
        <ClipboardList :size="14" />
        Copy for Report Card Comment
      </div>
      <div class="profile-actions__buttons">
        <button class="btn-copy-report btn-copy-report--anon" @click="copyForReportCard(false)">
          <ShieldCheck :size="15" />
          {{ isCopiedAnon ? '✓ Copied!' : 'Without Name' }}
        </button>
        <button class="btn-copy-report btn-copy-report--named" @click="copyForReportCard(true)">
          <ClipboardList :size="15" />
          {{ isCopiedNamed ? '✓ Copied!' : 'With Name' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ShieldCheck, ClipboardList } from 'lucide-vue-next'
import { formatLocalDisplay } from '../../utils/dates.js'
import { useMessage } from '../../composables/useMessage.js'

const props = defineProps({
  student: { type: Object, required: true },
  stats: { type: Object, default: () => ({ absences: 0, lates: 0 }) },
  allDossierAssessments: { type: Array, default: () => [] },
  activeClass: { type: Object, default: null },
  activeClassRecord: { type: Object, default: null },
  filteredMilestones: { type: Array, default: () => [] },
  globalMilestones: { type: Array, default: () => [] },
  activeStudentEvents: { type: Array, default: () => [] },
  academicCategories: { type: Array, default: () => [] },
  formattedGrade: { type: String, default: 'N/A' }
})

const emit = defineEmits(['update-note'])

const { confirm } = useMessage()

const isAdult = computed(() => {
  if (!props.student.birthDate) return false
  return computeAge(props.student.birthDate) >= 18
})

function computeAge(dob) {
  if (!dob) return ''
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

const localGeneralNote = ref('')

watch(() => props.student?.generalNote, (v) => {
  localGeneralNote.value = v || ''
}, { immediate: true })

function updateGeneralNoteLocal() {
  emit('update-note', localGeneralNote.value.trim())
}

const isCopiedAnon = ref(false)
const isCopiedNamed = ref(false)

async function copyForReportCard(includeName = false) {
  const s = props.student
  const absences = props.stats.absences
  const lates = props.stats.lates
  
  const isFinal = await confirm(
    'Select the report card term for this comment copy.',
    'Select Report Type',
    { confirmLabel: 'Final', cancelLabel: 'Midterm' }
  )
  const reportType = isFinal ? 'Final' : 'Midterm'
  
  const midtermMs = props.filteredMilestones?.find(m => m.name?.toLowerCase() === 'midterm') || 
                    props.globalMilestones?.find(m => m.name?.toLowerCase() === 'midterm')
  const midtermDate = midtermMs?.date || 'N/A'
  
  const academicList = [...props.allDossierAssessments]
    .filter(a => !a.excluded && (a.score !== null || a.missing || a.attempts?.some(att => att.comment?.trim())))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const classCode = props.activeClass?.courseCode ? ` (${props.activeClass.courseCode})` : ''
  const header = includeName
    ? `Student Name: ${s.firstName} ${s.lastName}${classCode}`
    : `Student${classCode} — Progress Summary`

  let boundaryInserted = false
  const academicLines = []
  academicList.forEach(a => {
    if (midtermDate !== 'N/A' && a.date > midtermDate && !boundaryInserted) {
      academicLines.push('--- MIDTERM CUTOFF BOUNDARY ---')
      boundaryInserted = true
    }
    const date = formatLocalDisplay(a.date, { month: 'short', day: 'numeric' })
    const classObj = props.activeClassRecord || props.activeClass
    const unit = classObj?.gradebookUnits?.find(u => u.unitId === a.unitId)
    const unitPrefix = unit ? `[${unit.name}] ` : ''
    
    let line = `- ${date} - ${unitPrefix}${a.name}: `
    if (a.missing) {
      line += 'Missing'
    } else if (a.score !== null) {
      line += `${Math.round((a.score / (a.totalPoints || 1)) * 100)}%`
    } else {
      line += 'Ungraded'
    }

    if (a.attempts?.length > 1) {
      const history = a.attempts
        .map(att => {
          if (att.pointsEarned === null || att.pointsEarned === undefined) return 'Ungraded'
          return Math.round((att.pointsEarned / (a.totalPoints || 1)) * 100) + '%'
        })
        .join(', ')
      line += ` (Attempts history: ${history})`
    }
    const comments = (a.attempts || [])
      .map((att, idx) => {
        const trimmed = att.comment?.trim()
        if (!trimmed) return null
        if ((a.attempts || []).length === 1) return `[Note] ${trimmed}`
        if (att.pointsEarned === null || att.pointsEarned === undefined) {
          return `[Note - Attempt ${idx + 1}] ${trimmed}`
        }
        const pct = Math.round((att.pointsEarned / (a.totalPoints || 1)) * 100)
        return `[Note - Attempt ${idx + 1} (${pct}%)] ${trimmed}`
      })
      .filter(Boolean)
    
    comments.forEach(c => {
      line += `\n  ↳ ${c}`
    })
    academicLines.push(line)
  })

  const textLines = [
    header
  ]
  const courseCode = props.activeClassRecord?.courseCode || props.activeClass?.courseCode
  if (courseCode) {
    textLines.push(`Course: ${courseCode}`)
  }
  textLines.push(`Current Grade: ${props.formattedGrade}`)
  if (midtermDate !== 'N/A') {
    textLines.push(`Midterm Cutoff Date: ${midtermDate}`)
  }
  textLines.push(`Report Type: ${reportType}`)
  textLines.push(`Attendance: ${absences} Absences, ${lates} Lates`)
  textLines.push('')
  textLines.push('Gradebook Log (Chronological):')
  textLines.push(...academicLines)
  textLines.push('')
  textLines.push('Category Averages:')
  textLines.push(...props.academicCategories.map(c => `- ${c.name}: ${c.score !== null ? Math.round(c.score) + '%' : 'N/A'}`))
  textLines.push('')
  textLines.push('Professional Judgment (Observations & Conversations):')
  const rawAcEvents = props.activeStudentEvents
    .filter(e => e.code === 'ac')
    .sort((a, b) => (b.ts || b.timestamp) - (a.ts || a.timestamp))
    .slice(0, 5)

  if (rawAcEvents.length === 0) {
    textLines.push('None')
  } else {
    rawAcEvents.forEach(e => {
      textLines.push(`- [${formatLocalDisplay(e.timestamp || e.date, { month: 'short', day: 'numeric' })}] ${e.note || e.title || 'Observation'}`)
    })
  }

  const fullText = textLines.join('\n')
  await navigator.clipboard.writeText(fullText)
  if (includeName) {
    isCopiedNamed.value = true
    setTimeout(() => { isCopiedNamed.value = false }, 2000)
  } else {
    isCopiedAnon.value = true
    setTimeout(() => { isCopiedAnon.value = false }, 2000)
  }
}
</script>

<style scoped>
.student-360__pane--profile {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
}

.profile-section__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px 0;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.profile-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-item__label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.profile-item__value {
  font-size: 0.9rem;
  font-weight: 600;

  display: flex;
  align-items: center;
  gap: 4px;
}

.profile-item__value--adult {
  color: #10b981;
}

.contacts-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.contact-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-card__name {
  font-weight: 600;
  font-size: 0.85rem;
}

.contact-card__meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
}

.student-360__notes-area {
  width: 100%;
  min-height: 80px;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.85rem;
  resize: vertical;
}

.profile-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
}

.profile-actions__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.85rem;
}

.profile-actions__buttons {
  display: flex;
  gap: 8px;
}

.btn-copy-report {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy-report--anon {
  background: var(--bg-secondary);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-copy-report--named {
  background: var(--primary);
  color: white;
}

.text-muted {
  color: var(--text-secondary);
  font-size: 0.85rem;
}
</style>
