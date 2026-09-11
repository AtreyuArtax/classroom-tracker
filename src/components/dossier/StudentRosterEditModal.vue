<template>
  <BaseModal
    :show="show"
    :title="`Edit Official Roster Name — ${student.firstName || ''} ${student.lastName || ''}`"
    max-width="520px"
    @close="emit('close')"
  >
    <div class="srem-container">
      <div class="srem-banner">
        <UserCheck :size="16" class="srem-banner__icon" />
        <div class="srem-banner__text">
          Update this student's official roster identity. Changes update immediately across all seating plans, attendance tracking, and gradebook records.
        </div>
      </div>

      <form class="srem-form" @submit.prevent="saveStudent">
        <!-- Student ID (Read Only) -->
        <div class="form-group">
          <label class="srem-label">
            <span>Student ID</span>
            <span class="srem-hint"><Lock :size="11" /> Official record ID (fixed)</span>
          </label>
          <input
            type="text"
            :value="student.studentId"
            disabled
            class="srem-input srem-input--disabled"
          />
        </div>

        <!-- First Name -->
        <div class="form-group">
          <div class="srem-label-row">
            <label class="srem-label" for="srem-first-name">
              First Name <span class="srem-required">*</span>
            </label>
            <button
              v-if="canQuickFillPreferred"
              type="button"
              class="srem-quick-fill-btn"
              @click="applyPreferredName"
              title="Click to copy preferred name into official first name field"
            >
              <Sparkles :size="11" />
              Use Preferred Name: "{{ cleanPreferredName }}"
            </button>
          </div>
          <input
            id="srem-first-name"
            type="text"
            v-model="form.firstName"
            placeholder="First Name"
            required
            class="srem-input"
            :class="{ 'srem-input--error': error && !form.firstName.trim() }"
          />
        </div>

        <!-- Last Name -->
        <div class="form-group">
          <label class="srem-label" for="srem-last-name">
            Last Name <span class="srem-required">*</span>
          </label>
          <input
            id="srem-last-name"
            type="text"
            v-model="form.lastName"
            placeholder="Last Name"
            required
            class="srem-input"
            :class="{ 'srem-input--error': error && !form.lastName.trim() }"
          />
        </div>

        <!-- Elementary Grade Level (if applicable) -->
        <div v-if="isElementary" class="form-group">
          <label class="srem-label">Student Grade Level</label>
          <select v-model="form.gradeLevel" class="srem-select">
            <option value="">Auto (Homeroom Grade)</option>
            <option value="Grade 1">Grade 1</option>
            <option value="Grade 2">Grade 2</option>
            <option value="Grade 3">Grade 3</option>
            <option value="Grade 4">Grade 4</option>
            <option value="Grade 5">Grade 5</option>
            <option value="Grade 6">Grade 6</option>
            <option value="Grade 7">Grade 7</option>
            <option value="Grade 8">Grade 8</option>
          </select>
        </div>

        <!-- Secondary Course Code / Cohort (if present) -->
        <div v-else-if="student.courseCode || student.cohort" class="form-group">
          <label class="srem-label">Course Code / Cohort</label>
          <input
            type="text"
            v-model="form.courseCode"
            placeholder="e.g. MPM2D-01"
            class="srem-input"
          />
        </div>

        <div v-if="error" class="srem-error-msg">
          <AlertTriangle :size="14" /> {{ error }}
        </div>
      </form>
    </div>

    <template #footer>
      <div class="srem-footer">
        <button type="button" class="srem-btn srem-btn--ghost" @click="emit('close')">
          Cancel
        </button>
        <button
          type="button"
          class="srem-btn srem-btn--primary"
          :disabled="isSaving || !isValid"
          @click="saveStudent"
        >
          {{ isSaving ? 'Saving Changes...' : 'Update Roster Name' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '../BaseModal.vue'
import { Lock, Sparkles, UserCheck, AlertTriangle } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  student: { type: Object, required: true },
  preferredName: { type: String, default: '' }
})

const emit = defineEmits(['close', 'saved'])

const { activeClass, updateStudentProfile } = useClassroom()

const isSaving = ref(false)
const error = ref('')

const form = ref({
  firstName: '',
  lastName: '',
  gradeLevel: '',
  courseCode: ''
})

const isElementary = computed(() => {
  return activeClass.value?.classType === 'elementary'
})

const cleanPreferredName = computed(() => {
  return (props.preferredName || props.student?.preferredName || props.student?.intakeSurvey?.preferredName || '').trim()
})

const canQuickFillPreferred = computed(() => {
  if (!cleanPreferredName.value) return false
  return form.value.firstName.trim().toLowerCase() !== cleanPreferredName.value.toLowerCase()
})

const isValid = computed(() => {
  return form.value.firstName.trim().length > 0 && form.value.lastName.trim().length > 0
})

function initForm() {
  error.value = ''
  form.value = {
    firstName: props.student?.firstName || '',
    lastName: props.student?.lastName || '',
    gradeLevel: props.student?.gradeLevel || '',
    courseCode: props.student?.courseCode || props.student?.cohort || ''
  }
}

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    initForm()
  }
}, { immediate: true })

function applyPreferredName() {
  if (cleanPreferredName.value) {
    form.value.firstName = cleanPreferredName.value
  }
}

async function saveStudent() {
  const cleanFirst = form.value.firstName.trim()
  const cleanLast = form.value.lastName.trim()

  if (!cleanFirst || !cleanLast) {
    error.value = 'First Name and Last Name are required.'
    return
  }

  if (!props.student?.studentId) return

  isSaving.value = true
  error.value = ''

  try {
    const updates = {
      firstName: cleanFirst,
      lastName: cleanLast
    }

    if (form.value.gradeLevel !== undefined) {
      updates.gradeLevel = form.value.gradeLevel
    }
    if (form.value.courseCode !== undefined) {
      updates.courseCode = form.value.courseCode.trim()
    }

    await updateStudentProfile(props.student.studentId, updates)
    emit('saved', updates)
    emit('close')
  } catch (err) {
    console.error('Failed to update student profile:', err)
    error.value = 'Failed to save changes. Please try again.'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.srem-container {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.srem-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.03));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  font-size: 0.825rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

.srem-banner__icon {
  color: var(--primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.srem-banner__text {
  flex: 1;
}

.srem-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.srem-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.srem-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text);
}

.srem-required {
  color: var(--danger, #ff3b30);
}

.srem-hint {
  font-size: 0.75rem;
  font-weight: normal;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
}

.srem-quick-fill-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(88, 86, 214, 0.1);
  color: #5856d6;
  border: 1px solid rgba(88, 86, 214, 0.25);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.725rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.srem-quick-fill-btn:hover {
  background: #5856d6;
  color: #ffffff;
  border-color: #5856d6;
}

.srem-input,
.srem-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.875rem;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
}

.srem-input:focus,
.srem-select:focus {
  outline: none;
  border-color: var(--primary);
}

.srem-input--disabled {
  background: var(--bg-secondary, rgba(0, 0, 0, 0.04));
  color: var(--text-secondary);
  cursor: not-allowed;
  border-style: dashed;
}

.srem-input--error {
  border-color: var(--danger, #ff3b30);
}

.srem-error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255, 59, 48, 0.1);
  color: var(--danger, #ff3b30);
  font-size: 0.8rem;
  font-weight: 500;
}

.srem-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

.srem-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: var(--radius-sm, 8px);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 38px;
  transition: all 0.15s ease;
}

.srem-btn--primary {
  background: var(--primary);
  color: #ffffff;
  border: none;
}

.srem-btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.srem-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.srem-btn--ghost {
  background: transparent;
  border: none;
  color: var(--text-secondary);
}

.srem-btn--ghost:hover {
  color: var(--text);
}
</style>
