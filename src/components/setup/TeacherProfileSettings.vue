<template>
  <div class="setup__card" id="sec-general-settings">
    <h2 class="setup__card-title">General Settings</h2>

    <!-- Teacher Profile & School Information -->
    <div class="setup__card-subtitle" style="font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 12px;">
      Teacher Profile &amp; School Information
    </div>
    <div class="setup__form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <label class="setup__label">
        Teacher Name (for Reports &amp; Emails)
        <input v-model="localTeacherName" class="setup__input" placeholder="e.g. Ms. Smith or Alex Smith" @blur="saveTeacherName" />
      </label>
      <label class="setup__label">
        Title / Role (Optional)
        <input v-model="localTeacherTitle" class="setup__input" placeholder="e.g. Department Head or Teacher" @blur="saveTeacherTitle" />
      </label>
      <label class="setup__label">
        School Name (Optional)
        <input v-model="localSchoolName" class="setup__input" placeholder="e.g. Maple High School" @blur="saveSchoolName" />
      </label>
      <label class="setup__label">
        School Email (Optional)
        <input v-model="localTeacherEmail" class="setup__input" type="email" placeholder="e.g. teacher@school.org" @blur="saveTeacherEmail" />
      </label>
    </div>

    <!-- Email Preferences -->
    <div style="margin-bottom: 24px; padding: 12px 14px; background: var(--bg-hover, rgba(0,0,0,0.02)); border: 1px solid var(--border-color); border-radius: 8px;">
      <label class="setup__label--checkbox" style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; margin-bottom: 0;">
        <input 
          type="checkbox" 
          v-model="localIncludeWorkingHours" 
          class="setup__checkbox" 
          @change="saveWorkingHoursPreference"
          style="margin-top: 2px;"
        />
        <div style="font-size: 0.9rem; line-height: 1.4;">
          <span style="font-weight: 600; color: var(--text-main);">Include working hours statement in email sign-offs</span>
          <p style="margin: 3px 0 0; font-size: 0.8rem; color: var(--text-muted);">
            Appends: <em>"My working hours and your working hours may be different. Please do not feel obligated to reply outside your regular work hours."</em>
          </p>
        </div>
      </label>
    </div>

    <div class="setup__card-subtitle" style="font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 12px;">
      Application Preferences
    </div>
    <div class="setup__form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
      <div class="setup__label">
        Teaching Mode
        <div class="setup__segmented-toggle">
          <button
            type="button"
            class="setup__segmented-btn"
            :class="{ 'setup__segmented-btn--active': teachingMode === 'secondary' }"
            @click="teachingMode = 'secondary'"
          >
            <GraduationCap :size="15" class="setup__segmented-icon" />
            <span>Secondary (9–12)</span>
          </button>
          <button
            type="button"
            class="setup__segmented-btn"
            :class="{ 'setup__segmented-btn--active': teachingMode === 'elementary' }"
            @click="teachingMode = 'elementary'"
          >
            <School :size="15" class="setup__segmented-icon" />
            <span>Elementary (K–8)</span>
          </button>
        </div>
      </div>

      <div class="setup__label" style="grid-column: 1 / -1;">
        App Appearance / Theme
        <div class="setup__segmented-toggle">
          <button
            type="button"
            class="setup__segmented-btn"
            :class="{ 'setup__segmented-btn--active': themePreference === 'system' }"
            @click="setTheme('system')"
          >
            <Monitor :size="15" class="setup__segmented-icon" />
            <span>System (Auto)</span>
          </button>
          <button
            type="button"
            class="setup__segmented-btn"
            :class="{ 'setup__segmented-btn--active': themePreference === 'light' }"
            @click="setTheme('light')"
          >
            <Sun :size="15" class="setup__segmented-icon" />
            <span>Light</span>
          </button>
          <button
            type="button"
            class="setup__segmented-btn"
            :class="{ 'setup__segmented-btn--active': themePreference === 'dark' }"
            @click="setTheme('dark')"
          >
            <Moon :size="15" class="setup__segmented-icon" />
            <span>Dark</span>
          </button>
        </div>
        <p class="setup__hint" style="margin-top: 4px; font-size: 0.76rem;">
          {{ themePreference === 'system' ? 'Automatically adapts to your device or browser light/dark setting.' : (themePreference === 'dark' ? 'Dark surfaces optimized for low-light environments.' : 'Classic bright surfaces with iOS styling.') }}
        </p>
      </div>

      <!-- Dashboard Display Preferences -->
      <div class="setup__label" style="grid-column: 1 / -1; margin-top: 4px; padding-top: 12px; border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.08));">
        Dashboard Display
        <div class="setup__switch-container" style="margin-top: 8px;">
          <label class="setup__switch">
            <input type="checkbox" v-model="showDeskPhotos" />
            <span class="setup__switch-slider"></span>
          </label>
          <span class="setup__switch-label">Show Student Headshots on Dashboard Desk Tiles</span>
        </div>
        <p class="setup__hint" style="margin-top: 4px; font-size: 0.76rem;">
          When enabled, captured student photos appear directly on classroom desk tiles.
        </p>
      </div>

      <!-- Version & Update Status -->
      <div class="setup__version-info-row" style="grid-column: 1 / -1; margin-top: 8px; padding-top: 14px; border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.08)); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 600; font-size: 0.88rem; color: var(--text);">Classroom Tracker</span>
            <span class="setup__badge setup__badge--new" style="font-family: monospace; font-size: 0.78rem;">v{{ APP_VERSION }}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">
            Schema v{{ SCHEMA_VERSION }}
          </div>
        </div>
        <button 
          type="button" 
          class="setup__btn-ghost" 
          style="padding: 7px 14px; font-size: 0.82rem; display: flex; align-items: center; gap: 6px;"
          :disabled="isReloading"
          @click="onForceReload"
          title="Clears local browser cache and reloads the latest app version"
        >
          <RefreshCw :size="14" :class="{ 'setup-spin': isReloading }" />
          {{ isReloading ? 'Purging Cache & Reloading...' : 'Check for Updates / Hard Refresh' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { GraduationCap, Monitor, Moon, RefreshCw, School, Sun } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { useTheme } from '../../composables/useTheme.js'
import { showDeskPhotos } from '../../composables/useStudentPhotos.js'
import { APP_VERSION, SCHEMA_VERSION, forceAppUpdate } from '../../utils/appVersion.js'

const {
  teachingMode,
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
const { themePreference, setTheme } = useTheme()

const isReloading = ref(false)
async function onForceReload() {
  isReloading.value = true
  await forceAppUpdate()
}

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
