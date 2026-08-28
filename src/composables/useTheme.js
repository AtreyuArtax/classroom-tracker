/**
 * src/composables/useTheme.js
 *
 * Reactive singleton state & controls for App Theme (System/Auto, Light, Dark).
 * - Reacts immediately to OS/Browser color-scheme changes when set to 'system'.
 * - Persists choice to localStorage for instant load + IndexedDB settingsService.
 */

import { ref, computed } from 'vue'
import * as settingsService from '../db/settingsService.js'

// Initial state from localStorage for instantaneous hydration without FOUC
const initialPreference = (typeof window !== 'undefined' && localStorage.getItem('appTheme')) || 'system'
export const themePreference = ref(initialPreference)

// Tracks whether the OS prefers dark mode
const osPrefersDark = ref(
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
)

// The actual applied theme ('light' | 'dark')
export const resolvedTheme = computed(() => {
  if (themePreference.value === 'dark') return 'dark'
  if (themePreference.value === 'light') return 'light'
  return osPrefersDark.value ? 'dark' : 'light'
})

export const isDarkMode = computed(() => resolvedTheme.value === 'dark')

/**
 * Applies data-theme attribute to <html> element
 */
function applyDomTheme(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.setAttribute('data-theme', 'light')
  }
}

/**
 * Sets the theme preference ('system' | 'light' | 'dark')
 */
export async function setTheme(theme) {
  if (!['system', 'light', 'dark'].includes(theme)) return
  themePreference.value = theme
  try {
    localStorage.setItem('appTheme', theme)
  } catch (e) {
    console.warn('Could not save theme to localStorage:', e)
  }
  applyDomTheme(resolvedTheme.value)

  try {
    await settingsService.saveAppTheme(theme)
  } catch (e) {
    console.warn('Could not save theme to IndexedDB settings:', e)
  }
}

let isInitialized = false

/**
 * Initializes theme listeners and syncs with IndexedDB settings
 */
export async function initTheme() {
  if (typeof window === 'undefined') return

  // Apply immediately based on current state
  applyDomTheme(resolvedTheme.value)

  if (!isInitialized) {
    isInitialized = true

    // Listen for OS / Browser prefers-color-scheme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e) => {
        osPrefersDark.value = e.matches
        if (themePreference.value === 'system') {
          applyDomTheme(resolvedTheme.value)
        }
      }
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler)
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handler)
      }
    }

    // Sync from IndexedDB settings in background
    try {
      const dbTheme = await settingsService.getAppTheme()
      if (dbTheme && dbTheme !== themePreference.value) {
        themePreference.value = dbTheme
        localStorage.setItem('appTheme', dbTheme)
        applyDomTheme(resolvedTheme.value)
      }
    } catch (e) {
      console.warn('Could not load theme from IndexedDB:', e)
    }
  }
}

export function useTheme() {
  return {
    themePreference,
    resolvedTheme,
    isDarkMode,
    setTheme,
    initTheme
  }
}
