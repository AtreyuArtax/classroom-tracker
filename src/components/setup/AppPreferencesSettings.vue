<template>
  <div class="setup__card" id="sec-app-preferences">
    <h2 class="setup__card-title">Preferences</h2>

    <div class="setup__pref-list">
      <div class="setup__pref-row">
        <div class="setup__pref-text">
          <span class="setup__pref-title">Teaching mode</span>
          <span class="setup__pref-desc">Elementary uses one homeroom with several subjects.</span>
        </div>
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

      <div class="setup__pref-row">
        <div class="setup__pref-text">
          <span class="setup__pref-title">Appearance</span>
          <span class="setup__pref-desc">{{ themeHint }}</span>
        </div>
        <div class="setup__segmented-toggle">
          <button
            v-for="opt in THEME_OPTIONS"
            :key="opt.value"
            type="button"
            class="setup__segmented-btn"
            :class="{ 'setup__segmented-btn--active': themePreference === opt.value }"
            @click="setTheme(opt.value)"
          >
            <component :is="opt.icon" :size="15" class="setup__segmented-icon" />
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <div class="setup__pref-row">
        <div class="setup__pref-text">
          <span class="setup__pref-title">Photos on desk tiles</span>
          <span class="setup__pref-desc">Show captured student headshots on the Dashboard seating chart.</span>
        </div>
        <label class="setup__switch">
          <input type="checkbox" v-model="showDeskPhotos" />
          <span class="setup__switch-slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { GraduationCap, Monitor, Moon, School, Sun } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { useTheme } from '../../composables/useTheme.js'
import { showDeskPhotos } from '../../composables/useStudentPhotos.js'

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon }
]

const { teachingMode } = useClassroom()
const { themePreference, setTheme } = useTheme()

const themeHint = computed(() => {
  if (themePreference.value === 'dark') return 'Dark surfaces for low-light rooms.'
  if (themePreference.value === 'light') return 'Always use bright surfaces.'
  return "Follows your device's light/dark setting."
})
</script>
