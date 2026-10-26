/**
 * src/composables/useDutyTracker.js
 *
 * Reactive state and operations for APA / assigned duties.
 * Adheres to CLAUDE.md §4:
 *  - Single source of truth for the UI
 *  - Modifies IDB via dutyService and immediately updates local reactive refs
 *  - Pure math and calendar helpers kept isolated
 */

import { ref, computed } from 'vue'
import * as dutyService from '../db/dutyService.js'
import { getCurrentSchoolYear, getCurrentSemester, getSchoolYearFromDate, getSemesterFromDate } from '../utils/dates.js'

// Shared module-level reactive state
const duties = ref([])
const dutySettings = ref(JSON.parse(JSON.stringify(dutyService.INITIAL_DUTY_SETTINGS)))
const isLoading = ref(false)
const activeSchoolYear = ref(getCurrentSchoolYear())

const availableSchoolYears = ref([getCurrentSchoolYear()])

export function useDutyTracker() {

  /**
   * Refreshes the list of all unique school years stored in duties.
   */
  async function refreshAvailableYears() {
    try {
      const all = await dutyService.getAllDuties()
      const set = new Set(all.map(d => d.schoolYear).filter(Boolean))
      set.add(getCurrentSchoolYear())
      if (activeSchoolYear.value) set.add(activeSchoolYear.value)
      availableSchoolYears.value = Array.from(set).sort().reverse()
      return availableSchoolYears.value
    } catch (err) {
      console.warn('Failed to refresh duty years:', err)
      return availableSchoolYears.value
    }
  }

  /**
   * Loads the duty settings from the database.
   */
  async function loadSettings() {
    try {
      const s = await dutyService.getDutySettings()
      dutySettings.value = s
      return s
    } catch (err) {
      console.warn('Failed to load duty settings:', err)
      return dutySettings.value
    }
  }

  /**
   * Saves updated duty settings (allotted minutes, duty catalog, emergency cap).
   */
  async function updateSettings(newSettings) {
    try {
      const saved = await dutyService.saveDutySettings(newSettings)
      dutySettings.value = saved
      return saved
    } catch (err) {
      console.error('Failed to save duty settings:', err)
      throw err
    }
  }

  /**
   * Resets the duty catalog and allotments back to the initial school defaults.
   */
  async function resetSettingsToDefaults() {
    return await updateSettings(dutyService.INITIAL_DUTY_SETTINGS)
  }

  /**
   * Loads all duties for a given school year into the reactive ref.
   */
  async function loadDuties(schoolYear = activeSchoolYear.value) {
    isLoading.value = true
    try {
      activeSchoolYear.value = schoolYear || getCurrentSchoolYear()
      const list = await dutyService.getDutiesByYear(activeSchoolYear.value)
      duties.value = list
      await refreshAvailableYears()
      return list
    } catch (err) {
      console.error('Failed to load duties:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Adds a single duty record.
   */
  async function addDuty(record) {
    const yr = record.schoolYear || (record.date ? getSchoolYearFromDate(record.date) : activeSchoolYear.value) || getCurrentSchoolYear()
    const sem = record.semester || (record.date ? getSemesterFromDate(record.date) : getCurrentSemester())
    const enriched = {
      ...record,
      schoolYear: yr,
      semester: sem
    }
    const created = await dutyService.addDuty(enriched)
    if (created.schoolYear === activeSchoolYear.value) {
      duties.value.push(created)
      duties.value.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    }
    await refreshAvailableYears()
    return created
  }

  /**
   * Helper: formats a JS Date to 'YYYY-MM-DD' in local time.
   */
  function formatDateLocal(d) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Batch adds duties across consecutive weekdays (e.g. 5 days for bus or halls).
   * Automatically skips Saturdays and Sundays.
   */
  async function addBatchDuties({
    dutyName,
    startDate,
    days = 1,
    dates: explicitDates = null,
    duration = 15,
    startTime = '',
    location = '',
    notes = '',
    isEmergency = false,
    schoolYear = activeSchoolYear.value,
    semester = getCurrentSemester()
  }) {
    let dateList = []
    if (Array.isArray(explicitDates) && explicitDates.length > 0) {
      dateList = explicitDates
    } else if (startDate && days >= 1) {
      const numDays = Math.max(1, parseInt(days, 10) || 1)
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
      let curr = new Date(startYear, startMonth - 1, startDay)
      while (dateList.length < numDays) {
        const dow = curr.getDay()
        if (dow !== 0 && dow !== 6) {
          dateList.push(formatDateLocal(curr))
        }
        curr.setDate(curr.getDate() + 1)
      }
    } else if (startDate) {
      dateList = [startDate]
    }

    if (dateList.length === 0) return []

    const batch = dateList.map(dateStr => {
      const yr = schoolYear || getSchoolYearFromDate(dateStr) || activeSchoolYear.value || getCurrentSchoolYear()
      const sem = semester || getSemesterFromDate(dateStr) || getCurrentSemester()
      return {
        date: dateStr,
        dutyName,
        duration: Number(duration) || 0,
        startTime: startTime || '',
        location: location ? String(location).trim() : '',
        notes: notes || '',
        isEmergency: Boolean(isEmergency),
        isSnowDay: false,
        schoolYear: yr,
        semester: sem
      }
    })

    const createdList = await dutyService.addDutiesBatch(batch)
    const matching = createdList.filter(d => d.schoolYear === activeSchoolYear.value)
    duties.value.push(...matching)
    duties.value.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    await refreshAvailableYears()
    return createdList
  }

  /**
   * Imports an array of parsed historical duties in batch and refreshes reactive state.
   */
  async function importDutiesBatch(dutiesArray) {
    if (!Array.isArray(dutiesArray) || dutiesArray.length === 0) return []
    const imported = await dutyService.addDutiesBatch(dutiesArray)
    await refreshAvailableYears()
    await loadDuties(activeSchoolYear.value)
    return imported
  }

  /**
   * Updates a duty record in IDB and locally.
   */
  async function updateDuty(dutyId, patch) {
    const updated = await dutyService.updateDuty(dutyId, patch)
    const idx = duties.value.findIndex(d => d.dutyId === dutyId)
    if (idx !== -1) {
      duties.value[idx] = updated
      duties.value.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    }
    return updated
  }

  /**
   * Deletes a duty record in IDB and locally.
   */
  async function deleteDuty(dutyId) {
    await dutyService.deleteDuty(dutyId)
    duties.value = duties.value.filter(d => d.dutyId !== dutyId)
    await refreshAvailableYears()
    return true
  }

  /**
   * Toggles whether a duty was a snow day / cancelled.
   * Marking as snow day preserves the entry but deducts minutes from the completed tally.
   */
  async function toggleSnowDay(dutyId) {
    const entry = duties.value.find(d => d.dutyId === dutyId)
    if (!entry) return null

    const willBeSnowDay = !entry.isSnowDay
    let newNotes = entry.notes || ''
    if (willBeSnowDay) {
      if (!newNotes.toLowerCase().includes('snow day')) {
        newNotes = newNotes ? `Snow Day · ${newNotes}` : 'Snow Day'
      }
    }

    return await updateDuty(dutyId, {
      isSnowDay: willBeSnowDay,
      notes: newNotes
    })
  }

  /**
   * Clears all duties for the active school year.
   */
  async function clearYearDuties(schoolYear = activeSchoolYear.value) {
    const count = await dutyService.clearDutiesForYear(schoolYear)
    if (activeSchoolYear.value === schoolYear) {
      duties.value = []
    }
    await refreshAvailableYears()
    return count
  }

  // ─── Computed Metrics ────────────────────────────────────────────────────────

  /**
   * Total completed minutes (excludes duties flagged as snow days).
   */
  const completedMinutes = computed(() => {
    return duties.value.reduce((total, d) => {
      if (d.isSnowDay) return total
      return total + (Number(d.duration) || 0)
    }, 0)
  })

  /**
   * Allotted duty minutes from settings (e.g. 1875).
   */
  const allottedMinutes = computed(() => {
    return Number(dutySettings.value?.allottedMinutes) || dutyService.INITIAL_DUTY_SETTINGS.allottedMinutes
  })

  /**
   * Remaining duty minutes.
   */
  const remainingMinutes = computed(() => {
    return allottedMinutes.value - completedMinutes.value
  })

  /**
   * Completion ratio (0.0 to 1.0+).
   */
  const completionRatio = computed(() => {
    if (allottedMinutes.value <= 0) return 0
    return completedMinutes.value / allottedMinutes.value
  })

  /**
   * Completion percentage (e.g. 42%).
   */
  const percentComplete = computed(() => {
    return Math.round(completionRatio.value * 100)
  })

  /**
   * Count of emergency on-calls.
   */
  const emergencyCount = computed(() => {
    return duties.value.filter(d => d.isEmergency && !d.isSnowDay).length
  })

  /**
   * Max emergency on-calls cap from settings.
   */
  const emergencyCap = computed(() => {
    return dutySettings.value?.emergencyCap ?? dutyService.INITIAL_DUTY_SETTINGS.emergencyCap
  })

  /**
   * Aggregated minutes breakdown by duty name.
   */
  const dutyBreakdown = computed(() => {
    const map = {}
    for (const d of duties.value) {
      if (d.isSnowDay) continue
      const name = d.dutyName || 'Other'
      if (!map[name]) {
        map[name] = { name, minutes: 0, count: 0 }
      }
      map[name].minutes += Number(d.duration) || 0
      map[name].count++
    }
    return Object.values(map).sort((a, b) => b.minutes - a.minutes)
  })

  /**
   * Fetches all duties across all school years for multi-year analytics.
   */
  async function getAllDuties() {
    return await dutyService.getAllDuties()
  }

  return {
    duties,
    dutySettings,
    isLoading,
    activeSchoolYear,
    completedMinutes,
    allottedMinutes,
    remainingMinutes,
    completionRatio,
    percentComplete,
    emergencyCount,
    emergencyCap,
    dutyBreakdown,
    availableSchoolYears,
    refreshAvailableYears,
    loadSettings,
    updateSettings,
    resetSettingsToDefaults,
    loadDuties,
    getAllDuties,
    addDuty,
    addBatchDuties,
    importDutiesBatch,
    updateDuty,
    deleteDuty,
    toggleSnowDay,
    clearYearDuties
  }
}
