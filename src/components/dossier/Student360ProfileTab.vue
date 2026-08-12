<template>
  <div class="student-360__pane student-360__pane--profile">
    <!-- Custody & Safety Alert Callout (If imported from SIS CSV) -->
    <div v-if="student.notes" class="profile-section">
      <div class="profile-alert-card">
        <div class="profile-alert-card__header">
          <AlertTriangle :size="18" class="profile-alert-card__icon" />
          <h3 class="profile-alert-card__title">Safety &amp; Custody Alerts</h3>
        </div>
        <p class="profile-alert-card__body">{{ student.notes }}</p>
      </div>
    </div>

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
      <div class="profile-section__header-row">
        <h3 class="profile-section__title">Parent / Guardian Contacts</h3>
        <button class="btn-edit-contacts" @click="openEditModal">
          <Edit2 :size="13" /> Edit Contacts
        </button>
      </div>

      <div v-if="!normalizedContacts.length" class="text-muted">No contacts on file.</div>
      <div v-else class="contacts-list">
        <div v-for="(c, i) in normalizedContacts" :key="i" class="contact-card">
          <div class="contact-card__name">{{ c.name || `Contact ${i + 1}` }}</div>
          <div class="contact-card__meta">
            <a :href="'mailto:' + c.email" v-if="c.email" class="contact-email">
              <Mail :size="12" /> {{ c.email }}
            </a>
            <div v-if="c.phones && c.phones.length" class="contact-phones">
              <div v-for="(p, pi) in c.phones" :key="pi" class="contact-phone-item">
                <span class="phone-type-badge">{{ p.type || 'Phone' }}</span>
                <a :href="'tel:' + p.number" class="phone-number">{{ p.number }}</a>
              </div>
            </div>
            <span v-else-if="c.phone" class="contact-phone-item">
              <span class="phone-type-badge">Phone</span>
              <a :href="'tel:' + c.phone" class="phone-number">{{ c.phone }}</a>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Contacts Modal -->
    <BaseModal
      :show="showEditModal"
      title="Edit Parent / Guardian Contacts"
      maxWidth="620px"
      :z-index="3000"
      @close="showEditModal = false"
    >
      <div class="edit-contacts-modal">
        <div v-if="!editingContacts.length" class="empty-edit-state">
          <p>No contacts configured for this student yet.</p>
        </div>

        <div v-for="(contact, cIdx) in editingContacts" :key="cIdx" class="edit-contact-block">
          <div class="edit-contact-header">
            <span class="edit-contact-title">Contact #{{ cIdx + 1 }}</span>
            <button class="btn-icon-danger" @click="removeContact(cIdx)" title="Remove contact">
              <Trash2 :size="15" />
            </button>
          </div>

          <div class="edit-form-grid">
            <div class="form-group">
              <label>Name</label>
              <input type="text" v-model="contact.name" placeholder="Full Name (e.g. Jane Doe)" class="input-text" />
            </div>

            <div class="form-group">
              <label>Email</label>
              <input type="email" v-model="contact.email" placeholder="email@example.com" class="input-text" />
            </div>
          </div>

          <div class="phones-section">
            <div class="phones-section__header">
              <label>Phone Numbers</label>
              <button class="btn-add-sub" @click="addPhoneToContact(cIdx)">
                <Plus :size="12" /> Add Phone
              </button>
            </div>

            <div v-if="!contact.phones.length" class="text-muted text-small">No phone numbers added.</div>
            <div v-for="(phone, pIdx) in contact.phones" :key="pIdx" class="phone-edit-row">
              <select v-model="phone.type" class="select-phone-type">
                <option value="Mobile">Mobile</option>
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
              <input type="tel" v-model="phone.number" placeholder="(555) 000-0000" class="input-text phone-input" />
              <button class="btn-icon-danger-sub" @click="removePhoneFromContact(cIdx, pIdx)">
                <X :size="14" />
              </button>
            </div>
          </div>
        </div>

        <div class="modal-actions-row">
          <button class="btn-secondary" @click="addNewContact">
            <Plus :size="14" /> Add New Contact Card
          </button>
        </div>

        <div class="modal-footer">
          <button class="btn-ghost" @click="showEditModal = false">Cancel</button>
          <button class="btn-primary" @click="saveContacts">Save Contacts</button>
        </div>
      </div>
    </BaseModal>

    <!-- Accommodations & Modified Grade Levels Modal -->
    <BaseModal
      :show="showAccommodationsModal"
      title="Adjust Expectations & Grade Levels (IEP)"
      maxWidth="680px"
      :z-index="3100"
      @close="showAccommodationsModal = false"
    >
      <div class="accommodations-modal-body">
        <p class="accommodations-modal-desc">
          Configure modified grade-level expectations for <strong>{{ student.firstName }} {{ student.lastName }}</strong>.
          For example, if this student is in Grade 7 but working on Grade 5 Math, set Mathematics to <code>Grade 5</code>.
        </p>

        <div class="accommodations-subject-list">
          <div 
            v-for="sub in availableSubjects" 
            :key="sub.subjectId" 
            class="acc-subject-card"
          >
            <div class="acc-subject-info">
              <SubjectIcon :code="sub.code" :icon="sub.icon" :name="sub.name" :size="18" />
              <div class="acc-subject-name">{{ sub.name }}</div>
            </div>

            <div class="acc-subject-controls">
              <select 
                v-model="localModifiedSubjectGrades[sub.subjectId]" 
                class="acc-select-grade"
              >
                <option value="default">Default ({{ student.gradeLevel || 'Class Grade' }})</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
              </select>

              <!-- Granularity Picker & Auto Import Preset Action -->
              <template v-if="localModifiedSubjectGrades[sub.subjectId] && localModifiedSubjectGrades[sub.subjectId] !== 'default'">
                <select 
                  v-model="localGranularity[sub.subjectId]" 
                  class="acc-select-granularity" 
                  title="Select Expectation Level to Import"
                  style="font-size: 0.8rem; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);"
                >
                  <option value="all">Specific Expectations</option>
                  <option value="overall">Overall Expectations</option>
                  <option value="success_criteria" :disabled="!hasSuccessCriteriaAvailable(sub, localModifiedSubjectGrades[sub.subjectId])">
                    {{ hasSuccessCriteriaAvailable(sub, localModifiedSubjectGrades[sub.subjectId]) ? 'Success Criteria' : 'Success Criteria (N/A)' }}
                  </option>
                </select>

                <div v-if="hasLoadedPresetForGrade(sub, localModifiedSubjectGrades[sub.subjectId])" style="display: flex; align-items: center; gap: 6px;">
                  <div class="acc-status-tag acc-status-tag--ok" :title="`${localModifiedSubjectGrades[sub.subjectId]} Ontario Curriculum Expectations loaded`">
                    <CheckCircle2 :size="13" /> Presets Loaded
                  </div>
                  <button 
                    type="button" 
                    class="btn-auto-import-preset"
                    style="background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 2px 8px; font-size: 0.75rem;"
                    :disabled="importingSubjectId === sub.subjectId"
                    @click="autoImportPresets(sub, localModifiedSubjectGrades[sub.subjectId])"
                    title="Re-import presets with selected granularity"
                  >
                    Re-import
                  </button>
                </div>
                <button 
                  v-else
                  type="button" 
                  class="btn-auto-import-preset"
                  :disabled="importingSubjectId === sub.subjectId"
                  @click="autoImportPresets(sub, localModifiedSubjectGrades[sub.subjectId])"
                >
                  <Zap :size="13" /> {{ importingSubjectId === sub.subjectId ? 'Importing...' : `Import ${localModifiedSubjectGrades[sub.subjectId]} Presets` }}
                </button>
              </template>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-ghost" @click="showAccommodationsModal = false">Cancel</button>
          <button class="btn-primary" @click="saveAccommodationsConfig">Save Accommodations</button>
        </div>
      </div>
    </BaseModal>

    <div class="profile-section">
      <h3 class="profile-section__title">Student Support &amp; Accommodations</h3>
      <div class="profile-iep-card">
        <div class="iep-toggle-header">
          <label class="iep-toggle-label">
            <input 
              type="checkbox" 
              class="iep-checkbox" 
              :checked="student.hasIEP" 
              @change="toggleIEP($event.target.checked)" 
            />
            <span class="iep-toggle-title">Student has IEP / Accommodations Plan</span>
          </label>

          <button 
            v-if="student.hasIEP && activeClassRecord?.classType === 'elementary'"
            type="button" 
            class="btn-edit-accommodations" 
            @click="openAccommodationsModal"
          >
            <Sliders :size="13" /> Adjust Expectations / Grades
          </button>
        </div>
        <p class="iep-toggle-desc">
          Enabling this adds a subtle discreet indicator on the teacher's seating plan for quick accommodation reference.
        </p>

        <!-- Configured Subject Modifications List -->
        <div v-if="student.hasIEP && activeClassRecord?.classType === 'elementary'" class="iep-active-modifications">
          <div class="iep-mods-title">Modified Subject Grade Expectations:</div>
          <div v-if="!hasActiveModifications" class="text-muted text-small">
            All subjects currently set to standard grade level ({{ student.gradeLevel || 'Class Grade' }}).
          </div>
          <div v-else class="iep-mods-list">
            <span v-for="(gr, subId) in activeSubjectModifications" :key="subId" class="iep-mod-badge">
              <strong>{{ getSubjectName(subId) }}:</strong> {{ gr }}
            </span>
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
import { 
  ShieldCheck, 
  ClipboardList, 
  AlertTriangle, 
  Edit2, 
  Plus, 
  Trash2, 
  X, 
  Mail,
  Sliders,
  Zap,
  CheckCircle2
} from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import SubjectIcon from '../SubjectIcon.vue'

import { formatLocalDisplay } from '../../utils/dates.js'
import { useMessage } from '../../composables/useMessage.js'
import { formatQualitativeEvidenceForReport } from '../../utils/reportFormatter.js'
import { 
  DEFAULT_ELEMENTARY_SUBJECTS, 
  findElementaryPresets, 
  populateSubjectFromPresets 
} from '../../composables/useElementary.js'
import { loadGradebook } from '../../composables/useGradebook.js'
import * as classService from '../../db/classService.js'

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

const emit = defineEmits(['update-note', 'update-iep', 'update-accommodations', 'update-contacts'])

const showAccommodationsModal = ref(false)
const localModifiedSubjectGrades = ref({})
const localGranularity = ref({})
const importingSubjectId = ref(null)

const availableSubjects = computed(() => {
  if (props.activeClassRecord?.subjects && props.activeClassRecord.subjects.length > 0) {
    return props.activeClassRecord.subjects
  }
  return DEFAULT_ELEMENTARY_SUBJECTS
})

function getSubjectName(subId) {
  const sub = availableSubjects.value.find(s => s.subjectId === subId)
  return sub ? sub.name : subId
}

const activeSubjectModifications = computed(() => {
  const mods = props.student?.accommodations?.modifiedSubjectGrades || {}
  const res = {}
  for (const [subId, gr] of Object.entries(mods)) {
    if (gr && gr !== 'default') {
      res[subId] = gr
    }
  }
  return res
})

const hasActiveModifications = computed(() => {
  return Object.keys(activeSubjectModifications.value).length > 0
})

function openAccommodationsModal() {
  const current = props.student?.accommodations?.modifiedSubjectGrades || {}
  const copy = {}
  const granCopy = {}
  availableSubjects.value.forEach(sub => {
    copy[sub.subjectId] = current[sub.subjectId] || 'default'
    granCopy[sub.subjectId] = 'all'
  })
  localModifiedSubjectGrades.value = copy
  localGranularity.value = granCopy
  showAccommodationsModal.value = true
}

function hasLoadedPresetForGrade(subject, targetGrade) {
  if (!subject || !targetGrade || targetGrade === 'default') return true
  const expectations = subject.expectations || []
  if (!expectations.length) return false
  return expectations.some(e => e.gradeLevel === targetGrade)
}

function hasSuccessCriteriaAvailable(subject, targetGrade) {
  if (!subject || !targetGrade || targetGrade === 'default') return false
  const matchingPresets = findElementaryPresets([targetGrade], subject.code, subject.name)
  if (!matchingPresets || matchingPresets.length === 0) return false
  return matchingPresets.some(p => p.isSuccessCriteria)
}

async function autoImportPresets(subject, targetGrade) {
  if (!props.activeClassRecord || !subject || !targetGrade) return
  importingSubjectId.value = subject.subjectId
  try {
    const matchingPresets = findElementaryPresets([targetGrade], subject.code, subject.name)
    if (!matchingPresets || matchingPresets.length === 0) {
      const { alert } = useMessage()
      await alert(`No standard curriculum presets found for ${targetGrade} ${subject.name}.`)
      return
    }
    const selectedGranularity = localGranularity.value[subject.subjectId] || 'all'
    const updatedSub = populateSubjectFromPresets(subject, matchingPresets, selectedGranularity, { forceRefresh: true })
    const subs = (props.activeClassRecord.subjects || []).length > 0
      ? props.activeClassRecord.subjects
      : DEFAULT_ELEMENTARY_SUBJECTS

    const updatedSubjects = subs.map(s => s.subjectId === updatedSub.subjectId ? updatedSub : s)
    const updatedClass = {
      ...props.activeClassRecord,
      subjects: updatedSubjects
    }
    await classService.saveClass(updatedClass)
    await loadGradebook(updatedClass)
    const { alert } = useMessage()
    await alert(`Successfully imported ${targetGrade} curriculum expectations into ${subject.name}!`)
  } catch (err) {
    console.error('autoImportPresets failed:', err)
  } finally {
    importingSubjectId.value = null
  }
}

function saveAccommodationsConfig() {
  const cleanedGrades = {}
  for (const [subId, gr] of Object.entries(localModifiedSubjectGrades.value)) {
    if (gr && gr !== 'default') {
      cleanedGrades[subId] = gr
    }
  }
  const accObj = {
    hasIEP: Boolean(props.student.hasIEP),
    modifiedSubjectGrades: cleanedGrades
  }
  emit('update-accommodations', accObj)
  showAccommodationsModal.value = false
}

const showEditModal = ref(false)
const editingContacts = ref([])

const normalizedContacts = computed(() => {
  if (!props.student.parentContacts || !Array.isArray(props.student.parentContacts)) return []
  return props.student.parentContacts.map(c => {
    const phones = Array.isArray(c.phones) ? [...c.phones] : []
    if (!phones.length && c.phone) {
      phones.push({ type: 'Mobile', number: c.phone })
    }
    return {
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || (phones[0]?.number || ''),
      phones
    }
  })
})

function openEditModal() {
  editingContacts.value = JSON.parse(JSON.stringify(normalizedContacts.value))
  showEditModal.value = true
}

function addNewContact() {
  editingContacts.value.push({
    name: '',
    email: '',
    phone: '',
    phones: [{ type: 'Mobile', number: '' }]
  })
}

function removeContact(idx) {
  editingContacts.value.splice(idx, 1)
}

function addPhoneToContact(contactIdx) {
  if (editingContacts.value[contactIdx]) {
    if (!editingContacts.value[contactIdx].phones) {
      editingContacts.value[contactIdx].phones = []
    }
    editingContacts.value[contactIdx].phones.push({ type: 'Mobile', number: '' })
  }
}

function removePhoneFromContact(contactIdx, phoneIdx) {
  if (editingContacts.value[contactIdx]?.phones) {
    editingContacts.value[contactIdx].phones.splice(phoneIdx, 1)
  }
}

function saveContacts() {
  const cleaned = editingContacts.value.map(c => {
    const validPhones = (c.phones || [])
      .map(p => ({ type: p.type || 'Mobile', number: (p.number || '').trim() }))
      .filter(p => p.number !== '')
    
    return {
      name: (c.name || '').trim(),
      email: (c.email || '').trim(),
      phone: validPhones[0]?.number || (c.phone || '').trim(),
      phones: validPhones
    }
  }).filter(c => c.name || c.email || c.phones.length > 0)

  emit('update-contacts', cleaned)
  showEditModal.value = false
}

function toggleIEP(val) {
  emit('update-iep', Boolean(val))
}

const { confirm, select } = useMessage()

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
  
  const reportType = await select(
    'Select the report card term for this comment copy.',
    ['Midterm', 'Final'],
    'Select Report Type'
  )
  if (!reportType) return
  
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
  if (s.hasIEP) {
    const curSubId = props.activeClassRecord?.activeSubjectId
    const modGrade = s.accommodations?.modifiedSubjectGrades?.[curSubId]
    if (modGrade) {
      textLines.push(`Accommodations: IEP Modified Expectations (${modGrade})`)
    } else {
      textLines.push(`Accommodations: IEP Plan Active`)
    }
  }
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
  const classObj = props.activeClassRecord || props.activeClass
  const judgmentLines = formatQualitativeEvidenceForReport(props.activeStudentEvents, classObj)
  textLines.push(...judgmentLines)

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

.profile-iep-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}

.iep-toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.iep-checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
}

.iep-toggle-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.iep-toggle-desc {
  margin: 6px 0 0 28px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.35;
}

/* Safety & Custody Alerts Card */
.profile-alert-card {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-left: 4px solid #ef4444;
  border-radius: var(--radius-md);
  padding: 14px 16px;
}

.profile-alert-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.profile-alert-card__icon {
  color: #ef4444;
}

.profile-alert-card__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #fca5a5;
}

.profile-section__header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.profile-section__header-row .profile-section__title {
  margin-bottom: 0;
}

.btn-edit-contacts {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-edit-contacts:hover {
  background: var(--surface-hover, rgba(255, 255, 255, 0.08));
  border-color: var(--primary);
  color: var(--primary);
}

.contact-email {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--primary);
  text-decoration: none;
  margin-bottom: 4px;
}

.contact-email:hover {
  text-decoration: underline;
}

.contact-phones {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}

.contact-phone-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
}

.phone-type-badge {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border-radius: 4px;
}

.phone-number {
  color: var(--text);
  text-decoration: none;
}

.phone-number:hover {
  text-decoration: underline;
}

/* Edit Contacts Modal Styling */
.edit-contacts-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-edit-state {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.edit-contact-block {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-contact-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.edit-contact-title {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.btn-icon-danger {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.btn-icon-danger:hover {
  background: rgba(239, 68, 68, 0.15);
}

.edit-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.input-text {
  width: 100%;
  padding: 7px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.85rem;
}

.input-text:focus {
  outline: none;
  border-color: var(--primary);
}

.phones-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phones-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.phones-section__header label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.btn-add-sub {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  background: transparent;
  border: none;
  cursor: pointer;
}

.btn-add-sub:hover {
  text-decoration: underline;
}

.phone-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-phone-type {
  width: 110px;
  padding: 7px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.82rem;
}

.phone-input {
  flex: 1;
}

.btn-icon-danger-sub {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-danger-sub:hover {
  color: #ef4444;
}

.text-small {
  font-size: 0.78rem;
}

.modal-actions-row {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.btn-ghost {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-ghost:hover {
  color: var(--text);
}

.btn-primary {
  padding: 8px 18px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.iep-toggle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.btn-edit-accommodations {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-edit-accommodations:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--primary);
}

.iep-active-modifications {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
}

.iep-mods-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.iep-mods-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.iep-mod-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--primary);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  font-size: 0.75rem;
}

.accommodations-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.accommodations-modal-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}

.accommodations-subject-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.acc-subject-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  gap: 12px;
}

.acc-subject-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 0.9rem;
}

.acc-subject-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.acc-select-grade {
  padding: 6px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.82rem;
  outline: none;
}

.acc-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.acc-status-tag--ok {
  color: var(--success, #22c55e);
}

.btn-auto-import-preset {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-auto-import-preset:hover {
  background: rgba(245, 158, 11, 0.22);
}
</style>

