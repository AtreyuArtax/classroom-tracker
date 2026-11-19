<template>
  <div class="duty-settings">
    
    <!-- 0. Navigation Visibility Preference -->
    <div class="setup__card">
      <div class="setup__card-header-row" style="margin-bottom: 0;">
        <div>
          <h2 class="setup__card-title">
            <Eye :size="20" /> Navigation Bar Visibility
          </h2>
          <p class="setup__hint" style="margin-top: 4px; margin-bottom: 0;">
            Show or hide the Duties tab in the main top navigation bar. When hidden, all your duty logs, minutes, and school year records remain safely saved.
          </p>
        </div>
        <label class="setup__switch" style="flex-shrink: 0; margin-left: 16px;">
          <input
            type="checkbox"
            :checked="showDutiesNav"
            @change="updateShowDutiesNav($event.target.checked)"
          />
          <span class="setup__switch-slider"></span>
        </label>
      </div>
    </div>

    <!-- 1. Contract Allotment Configuration -->
    <div class="setup__card">
      <div class="setup__card-header-row">
        <h2 class="setup__card-title">
          <Clock :size="20" /> School Duty Allotment
        </h2>
        <span class="setup__badge setup__badge--new">Minutes Based</span>
      </div>

      <p class="setup__hint">
        Configure the total duty minutes allocated under your school or collective agreement, plus the maximum threshold for emergency on-calls.
      </p>

      <div class="duty-settings__allotment-grid">
        <div class="duty-settings__field">
          <label class="duty-settings__label">Total Allotted Minutes</label>
          <div class="duty-settings__input-wrap">
            <input
              v-model.number="form.allottedMinutes"
              type="number"
              min="0"
              step="any"
              class="setup__input"
              placeholder="1875"
            />
            <span class="duty-settings__unit">min</span>
          </div>
          <span class="duty-settings__subtext">Standard full school year allocation is 1,875 minutes.</span>
        </div>

        <div class="duty-settings__field">
          <label class="duty-settings__label">Emergency On-call Cap</label>
          <div class="duty-settings__input-wrap">
            <input
              v-model.number="form.emergencyCap"
              type="number"
              min="0"
              class="setup__input"
              placeholder="2"
            />
            <span class="duty-settings__unit">calls</span>
          </div>
          <span class="duty-settings__subtext">Triggers a warning indicator if exceeded in the year.</span>
        </div>
      </div>
    </div>

    <!-- 2. Duty Catalog (Add, Rename, Remove, Defaults) -->
    <div class="setup__card">
      <div class="setup__card-header-row">
        <h2 class="setup__card-title">
          <ListPlus :size="20" /> Duty Catalog & Quick Defaults
        </h2>

        <div class="duty-settings__header-actions">
          <button type="button" class="setup__btn-ghost" @click="onResetDefaults">
            <RotateCcw :size="16" /> Reset Defaults
          </button>
          <button type="button" class="setup__btn-primary" @click="onAddDutyType">
            <Plus :size="16" /> Add Duty
          </button>
        </div>
      </div>

      <p class="setup__hint" style="margin-top: -4px; margin-bottom: 0;">
        Customize your school's duty types. When logging your schedule, picking a duty auto-fills its default minutes, consecutive days, and preset start times. Add multiple start times if a duty can occur in different time slots. Select "None" for ad-hoc duties (like On-call, OSSLT, or Emergency) so they default to no day pre-selected.
      </p>

      <div class="duty-settings__table-wrap">
        <table class="duty-settings__table">
          <thead>
            <tr>
              <th style="min-width: 130px;">Duty Name</th>
              <th style="width: 78px;">Min</th>
              <th style="min-width: 210px;">Schedule Days</th>
              <th style="min-width: 165px;">Start Times</th>
              <th style="width: 74px; text-align: center;" title="Flag as contractual emergency on-call">Emerg?</th>
              <th style="width: 54px; text-align: center;">Remove</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(duty, idx) in form.dutyTypes" :key="duty.id || idx">
              <td>
                <input
                  v-model="duty.name"
                  type="text"
                  class="setup__input duty-settings__name-input"
                  placeholder="e.g. AM Bus"
                  required
                />
              </td>
              <td>
                <div class="duty-settings__mini-wrap">
                  <input
                    v-model.number="duty.defaultDuration"
                    type="number"
                    min="0"
                    step="any"
                    class="setup__input duty-settings__num-input"
                    placeholder="15"
                  />
                  <span class="duty-settings__mini-unit">m</span>
                </div>
              </td>
              <td>
                <div class="duty-settings__days-cell">
                  <div class="duty-settings__weekdays-group" role="group" :aria-label="`Schedule days for ${duty.name}`">
                    <button
                      v-for="d in WEEKDAY_KEYS"
                      :key="d.key"
                      type="button"
                      class="duty-settings__weekday-pill"
                      :class="{ 'duty-settings__weekday-pill--active': isWeekdaySelected(duty, d.key) }"
                      @click="toggleDutyWeekday(duty, d.key)"
                      :title="`Toggle ${d.key} default for ${duty.name}`"
                    >
                      {{ d.label }}
                    </button>
                    <button
                      type="button"
                      class="duty-settings__weekday-pill duty-settings__weekday-pill--none"
                      :class="{ 'duty-settings__weekday-pill--active': isNoDaySelected(duty) }"
                      @click="setDutyNoDay(duty)"
                      :title="`Default to no day selected for ${duty.name} (user picks day when logging)`"
                    >
                      None
                    </button>
                  </div>
                  <span
                    class="duty-settings__days-badge"
                    :class="{ 'duty-settings__days-badge--muted': isNoDaySelected(duty) }"
                    :title="duty.defaultWeekdays && duty.defaultWeekdays.length > 0 ? `${duty.defaultWeekdays.length} days per week default` : 'No default day selected (user selects day when logging)'"
                  >
                    {{ duty.defaultWeekdays && duty.defaultWeekdays.length > 0 ? `${duty.defaultWeekdays.length}d` : 'No day' }}
                  </span>
                </div>
              </td>
              <td>
                <div class="duty-settings__times-cell">
                  <span
                    v-for="timeVal in (duty.presetStartTimes || [])"
                    :key="timeVal"
                    class="duty-settings__time-chip"
                  >
                    <span>{{ formatDutyTime(timeVal) }}</span>
                    <button
                      type="button"
                      class="duty-settings__time-chip-remove"
                      :title="`Remove ${formatDutyTime(timeVal)}`"
                      :aria-label="`Remove ${formatDutyTime(timeVal)}`"
                      @click="removePresetTime(duty, timeVal)"
                    >
                      <X :size="11" />
                    </button>
                  </span>

                  <div v-if="addingTimeForIdx === idx" class="duty-settings__time-add-row">
                    <input
                      v-model="pendingTimeInput"
                      type="time"
                      class="setup__input duty-settings__time-input"
                      @keydown.enter.prevent="confirmAddPresetTime(duty)"
                      @keydown.esc.prevent="cancelAddPresetTime"
                    />
                    <button
                      type="button"
                      class="duty-settings__time-confirm-btn"
                      title="Add preset time"
                      @click="confirmAddPresetTime(duty)"
                    >
                      <Check :size="13" />
                    </button>
                    <button
                      type="button"
                      class="duty-settings__time-cancel-btn"
                      title="Cancel"
                      @click="cancelAddPresetTime"
                    >
                      <X :size="13" />
                    </button>
                  </div>

                  <button
                    v-else
                    type="button"
                    class="duty-settings__time-add-pill"
                    :title="`Add preset start time for ${duty.name}`"
                    @click="startAddPresetTime(idx, duty)"
                  >
                    <Plus :size="12" />
                    <span>{{ (duty.presetStartTimes && duty.presetStartTimes.length > 0) ? 'Time' : 'Add time' }}</span>
                  </button>
                </div>
              </td>
              <td style="text-align: center;">
                <label class="duty-settings__checkbox-wrap" title="Flags as an emergency on-call">
                  <input
                    v-model="duty.isEmergency"
                    type="checkbox"
                    class="duty-settings__checkbox"
                  />
                </label>
              </td>
              <td style="text-align: center;">
                <button
                  type="button"
                  class="setup__btn-text duty-settings__delete-btn"
                  title="Remove duty type"
                  @click="onRemoveDutyType(idx)"
                >
                  <Trash2 :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="duty-settings__actions-bar">
        <button class="setup__btn-primary" :disabled="isSaving" @click="onSave">
          <Check :size="16" /> {{ isSaving ? 'Saving...' : 'Save Duty Settings' }}
        </button>
        <span v-if="saveMessage" class="setup__result-ok">
          {{ saveMessage }}
        </span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Check, Clock, Eye, ListPlus, Plus, RotateCcw, Trash2, X } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { useDutyTracker } from '../../composables/useDutyTracker.js'
import { useMessage } from '../../composables/useMessage.js'
import { formatDutyTime, normalizePresetStartTimes } from '../../utils/dutyTimeUtils.js'

const { showDutiesNav, updateShowDutiesNav } = useClassroom()
const { dutySettings, loadSettings, updateSettings, resetSettingsToDefaults } = useDutyTracker()
const { confirm } = useMessage()

const isSaving = ref(false)
const saveMessage = ref('')
const addingTimeForIdx = ref(null)
const pendingTimeInput = ref('11:20')

const form = ref({
  allottedMinutes: 1875,
  emergencyCap: 2,
  dutyTypes: []
})

const WEEKDAY_KEYS = [
  { key: 'Mon', label: 'M' },
  { key: 'Tue', label: 'T' },
  { key: 'Wed', label: 'W' },
  { key: 'Thu', label: 'Th' },
  { key: 'Fri', label: 'F' }
]

onMounted(async () => {
  await loadSettings()
  syncForm()
})

function syncForm() {
  const loadedDuties = JSON.parse(JSON.stringify(dutySettings.value.dutyTypes || []))
  
  // Ensure defaultWeekdays exists on every duty entry for backward compatibility
  for (const d of loadedDuties) {
    if (!Array.isArray(d.defaultWeekdays)) {
      if (d.id === 'weight-room' || (d.name && d.name.toLowerCase().includes('weight')) || d.defaultDays === 2) {
        d.defaultWeekdays = ['Tue', 'Thu']
        d.defaultDays = 2
      } else if (d.defaultDays === 5 || d.defaultDays == null) {
        d.defaultWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        d.defaultDays = 5
      } else if (d.defaultDays === 0 || ['on-call', 'osslt', 'emergency', 'adjustment'].includes(d.id)) {
        d.defaultWeekdays = []
        d.defaultDays = 0
      } else if (d.defaultDays === 1) {
        if (['on-call', 'emergency', 'osslt', 'adjustment'].some(k => (d.id || '').includes(k) || (d.name || '').toLowerCase().includes(k))) {
          d.defaultWeekdays = []
          d.defaultDays = 0
        } else {
          d.defaultWeekdays = ['Mon']
          d.defaultDays = 1
        }
      } else {
        d.defaultWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].slice(0, d.defaultDays || 1)
        d.defaultDays = d.defaultWeekdays.length
      }
    } else {
      d.defaultDays = d.defaultWeekdays.length
    }
    d.presetStartTimes = normalizePresetStartTimes(d)
    d.defaultStartTime = d.presetStartTimes[0] || ''
  }

  form.value = {
    allottedMinutes: dutySettings.value.allottedMinutes ?? 1875,
    emergencyCap: dutySettings.value.emergencyCap ?? 2,
    dutyTypes: loadedDuties
  }
}

function isWeekdaySelected(duty, dayKey) {
  return Array.isArray(duty.defaultWeekdays) && duty.defaultWeekdays.includes(dayKey)
}

function isNoDaySelected(duty) {
  return !duty.defaultWeekdays || duty.defaultWeekdays.length === 0
}

function setDutyNoDay(duty) {
  duty.defaultWeekdays = []
  duty.defaultDays = 0
}

function toggleDutyWeekday(duty, dayKey) {
  if (!Array.isArray(duty.defaultWeekdays)) {
    duty.defaultWeekdays = []
  }
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  if (duty.defaultWeekdays.includes(dayKey)) {
    duty.defaultWeekdays = duty.defaultWeekdays.filter(k => k !== dayKey)
  } else {
    duty.defaultWeekdays = [...duty.defaultWeekdays, dayKey].sort(
      (a, b) => order.indexOf(a) - order.indexOf(b)
    )
  }
  duty.defaultDays = duty.defaultWeekdays.length
}

function startAddPresetTime(idx, duty) {
  addingTimeForIdx.value = idx
  const existing = duty.presetStartTimes || []
  pendingTimeInput.value = existing[existing.length - 1] || duty.defaultStartTime || '11:20'
}

function cancelAddPresetTime() {
  addingTimeForIdx.value = null
}

function confirmAddPresetTime(duty) {
  if (pendingTimeInput.value) {
    const next = normalizePresetStartTimes({
      presetStartTimes: [...(duty.presetStartTimes || []), pendingTimeInput.value]
    })
    duty.presetStartTimes = next
    duty.defaultStartTime = next[0] || ''
  }
  addingTimeForIdx.value = null
}

function removePresetTime(duty, timeVal) {
  const next = (duty.presetStartTimes || []).filter(t => t !== timeVal)
  duty.presetStartTimes = next
  duty.defaultStartTime = next[0] || ''
}

function onAddDutyType() {
  form.value.dutyTypes.push({
    id: `duty-${Date.now()}`,
    name: 'New Duty',
    defaultDuration: 20,
    defaultDays: 5,
    defaultWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    defaultStartTime: '11:20',
    presetStartTimes: ['11:20'],
    isEmergency: false
  })
}

async function onRemoveDutyType(index) {
  const item = form.value.dutyTypes[index]
  const confirmed = await confirm(
    `Remove "${item.name || 'this duty'}" from your settings catalog? Existing logged records will not be deleted.`,
    'Remove Duty Type',
    { danger: true }
  )
  if (confirmed) {
    form.value.dutyTypes.splice(index, 1)
  }
}

async function onResetDefaults() {
  const confirmed = await confirm(
    'Reset all duty types and minutes back to the initial school defaults (AM/PM Bus, Cafeteria, Halls, On-call, etc.)?',
    'Reset to Defaults',
    { danger: true }
  )
  if (confirmed) {
    await resetSettingsToDefaults()
    syncForm()
    saveMessage.value = '✅ Reset to default duties catalog.'
    setTimeout(() => { saveMessage.value = '' }, 3000)
  }
}

async function onSave() {
  isSaving.value = true
  saveMessage.value = ''
  try {
    // Validate names and synchronize defaultWeekdays and defaultDays
    for (const d of form.value.dutyTypes) {
      if (!d.name || !d.name.trim()) {
        d.name = 'Unnamed Duty'
      }
      if (!Array.isArray(d.defaultWeekdays)) {
        d.defaultWeekdays = []
      }
      d.defaultDays = d.defaultWeekdays.length
      d.presetStartTimes = normalizePresetStartTimes(d)
      d.defaultStartTime = d.presetStartTimes[0] || ''
    }
    await updateSettings(form.value)
    saveMessage.value = '✅ Duty settings saved successfully!'
    setTimeout(() => { saveMessage.value = '' }, 3500)
  } catch (err) {
    saveMessage.value = `❌ Error saving settings: ${err.message}`
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.duty-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.duty-settings__allotment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.duty-settings__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.duty-settings__label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
}

.duty-settings__input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duty-settings__unit {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.duty-settings__subtext {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.duty-settings__header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.duty-settings__header-actions .setup__btn-ghost,
.duty-settings__header-actions .setup__btn-primary {
  white-space: nowrap;
}

.duty-settings__table-wrap {
  margin-top: 16px;
  overflow-x: auto;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 12px);
}

.duty-settings__table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;
}

.duty-settings__table th {
  padding: 10px 8px;
  background: var(--bg-secondary, #f2f2f7);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.78rem;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.duty-settings__table td {
  padding: 8px 8px;
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
  vertical-align: middle;
}

.duty-settings__table tr:last-child td {
  border-bottom: none;
}

.duty-settings__name-input {
  font-weight: 600;
  width: 100%;
  padding: 7px 10px;
}

.duty-settings__mini-wrap {
  display: flex;
  align-items: center;
  gap: 3px;
}

.duty-settings__num-input {
  width: 54px;
  text-align: center;
  padding: 7px 4px;
}

.duty-settings__mini-unit {
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.duty-settings__times-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.duty-settings__time-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px 3px 8px;
  border-radius: 999px;
  background: var(--bg-secondary, #f2f2f7);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.2;
}

.duty-settings__time-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.12s ease;
}

.duty-settings__time-chip-remove:hover {
  background: rgba(239, 68, 68, 0.14);
  color: #ef4444;
}

.duty-settings__time-add-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.duty-settings__time-add-pill:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light, rgba(70, 99, 172, 0.08));
}

.duty-settings__time-add-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.duty-settings__time-input {
  width: 112px;
  padding: 4px 6px;
  font-size: 0.8rem;
  box-sizing: border-box;
}

.duty-settings__time-confirm-btn,
.duty-settings__time-cancel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
}

.duty-settings__time-confirm-btn:hover {
  border-color: var(--primary);
  background: var(--primary);
  color: #ffffff;
}

.duty-settings__time-cancel-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.duty-settings__checkbox-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.duty-settings__checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary, #4663ac);
}

.duty-settings__delete-btn {
  color: var(--text-secondary);
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.duty-settings__delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.duty-settings__days-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.duty-settings__weekdays-group {
  display: inline-flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  padding: 2px;
  gap: 2px;
}

.duty-settings__weekday-pill {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  width: 22px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  padding: 0;
  line-height: 1;
}

.duty-settings__weekday-pill:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.duty-settings__weekday-pill--active {
  background: var(--primary) !important;
  color: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.duty-settings__weekday-pill--none {
  width: auto;
  padding: 0 7px;
  font-size: 0.70rem;
  letter-spacing: -0.01em;
}

.duty-settings__days-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--primary-light, rgba(70, 99, 172, 0.15));
  color: var(--primary);
  min-width: 26px;
  text-align: center;
}

.duty-settings__days-badge--muted {
  background: var(--bg-secondary);
  color: var(--text-tertiary, #8e8e93);
  font-weight: 500;
}

.duty-settings__actions-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
}
</style>
