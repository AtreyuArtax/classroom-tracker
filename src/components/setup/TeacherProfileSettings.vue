<template>
  <div class="setup__card" id="sec-teacher-profile">
    <div>
      <h2 class="setup__card-title">Teacher Profile</h2>
      <p class="setup__hint">Used in report headers and email sign-offs. Only the name is required.</p>
    </div>

    <div class="setup__form-grid profile__grid">
      <label class="setup__label">
        Teacher Name
        <input v-model="localTeacherName" class="setup__input" placeholder="e.g. Ms. Smith or Alex Smith" @blur="saveTeacherName" />
      </label>
      <label class="setup__label">
        Title / Role
        <input v-model="localTeacherTitle" class="setup__input" placeholder="e.g. Department Head or Teacher" @blur="saveTeacherTitle" />
      </label>
      <label class="setup__label">
        School Name
        <input v-model="localSchoolName" class="setup__input" placeholder="e.g. Maple High School" @blur="saveSchoolName" />
      </label>
      <label class="setup__label">
        School Email
        <input v-model="localTeacherEmail" class="setup__input" type="email" placeholder="e.g. teacher@school.org" @blur="saveTeacherEmail" />
      </label>
    </div>

    <div class="setup__pref-list">
      <div class="setup__pref-row">
        <div class="setup__pref-text">
          <span class="setup__pref-title">Add working hours statement by default</span>
          <span class="setup__pref-desc">Tells families they don't need to reply outside their own hours. You can still turn it on or off for each email.</span>
        </div>
        <label class="setup__switch">
          <input type="checkbox" v-model="localIncludeWorkingHours" @change="saveWorkingHoursPreference" />
          <span class="setup__switch-slider"></span>
        </label>
      </div>
    </div>

    <div class="profile__preview">
      <span class="profile__preview-label">Email sign-off preview</span>
      <div class="profile__preview-body">
        <div>Best regards,</div>
        <div class="profile__preview-name">{{ localTeacherName || 'Your Name' }}</div>
        <div v-if="localTeacherTitle" class="profile__preview-muted">{{ localTeacherTitle }}</div>
        <div v-if="localSchoolName" class="profile__preview-muted">{{ localSchoolName }}</div>
        <div v-if="localTeacherEmail" class="profile__preview-muted">{{ localTeacherEmail }}</div>
        <p v-if="localIncludeWorkingHours" class="profile__preview-note">
          My working hours and your working hours may be different. Please do not feel obligated to reply outside your regular work hours.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'

const {
  teacherName,
  teacherTitle,
  schoolName,
  teacherEmail,
  includeWorkingHoursStatement,
  updateTeacherName,
  updateTeacherTitle,
  updateSchoolName,
  updateTeacherEmail,
  updateIncludeWorkingHoursStatement
} = useClassroom()

// Local copies so typing doesn't write on every keystroke; saved on blur
const localTeacherName = ref(teacherName.value)
const localTeacherTitle = ref(teacherTitle.value)
const localSchoolName = ref(schoolName.value)
const localTeacherEmail = ref(teacherEmail.value)
const localIncludeWorkingHours = ref(includeWorkingHoursStatement.value)

watch(teacherName, (v) => { localTeacherName.value = v }, { immediate: true })
watch(teacherTitle, (v) => { localTeacherTitle.value = v }, { immediate: true })
watch(schoolName, (v) => { localSchoolName.value = v }, { immediate: true })
watch(teacherEmail, (v) => { localTeacherEmail.value = v }, { immediate: true })
watch(includeWorkingHoursStatement, (v) => { localIncludeWorkingHours.value = v }, { immediate: true })

async function saveTeacherName() { await updateTeacherName(localTeacherName.value) }
async function saveTeacherTitle() { await updateTeacherTitle(localTeacherTitle.value) }
async function saveSchoolName() { await updateSchoolName(localSchoolName.value) }
async function saveTeacherEmail() { await updateTeacherEmail(localTeacherEmail.value) }
async function saveWorkingHoursPreference() { await updateIncludeWorkingHoursStatement(localIncludeWorkingHours.value) }
</script>

<style scoped>
.profile__grid {
  gap: 16px;
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .profile__grid {
    grid-template-columns: 1fr;
  }
}

.profile__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile__preview-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.profile__preview-body {
  padding: 14px 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--text);
}

.profile__preview-name {
  font-weight: 600;
}

.profile__preview-muted {
  color: var(--text-secondary);
}

.profile__preview-note {
  margin: 10px 0 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}
</style>
