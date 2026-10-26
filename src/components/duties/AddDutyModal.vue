<template>
  <BaseModal
    :show="show"
    title="Log Assigned Duty"
    maxWidth="560px"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="add-duty-form">
      
      <!-- Duty Selector -->
      <div class="add-duty-form__group">
        <label class="add-duty-form__label" for="duty-type-select">Duty Type</label>
        <select
          id="duty-type-select"
          v-model="selectedDutyId"
          class="setup__input add-duty-form__select"
          required
          @change="onDutyTypeChange"
        >
          <option value="" disabled>Select a duty...</option>
          <option
            v-for="opt in dutySettings.dutyTypes"
            :key="opt.id || opt.name"
            :value="opt.id || opt.name"
          >
            {{ opt.name }} ({{ opt.defaultDuration }}m · {{ opt.defaultDays > 0 ? opt.defaultDays + 'd' : 'No day' }})
          </option>
        </select>
      </div>

      <!-- Week / Start Date & Quick Week Range -->
      <div class="add-duty-form__group">
        <div class="add-duty-form__label-row">
          <label class="add-duty-form__label" for="duty-start-date">Week of / Start Date</label>
          <span v-if="weekRangeLabel" class="add-duty-form__label-context">{{ weekRangeLabel }}</span>
        </div>
        <input
          id="duty-start-date"
          v-model="form.startDate"
          type="date"
          class="setup__input"
          required
          @change="onStartDateChange"
        />
      </div>

      <!-- Days on Duty Selector -->
      <div class="add-duty-form__group">
        <div class="add-duty-form__days-header">
          <label class="add-duty-form__label">
            Days on Duty ({{ selectedDays.length }} {{ selectedDays.length === 1 ? 'day' : 'days' }})
          </label>
          <div class="add-duty-form__quick-links">
            <button type="button" class="add-duty-form__quick-btn" @click="selectAllWeekdays">All Week (M–F)</button>
            <button type="button" class="add-duty-form__quick-btn" @click="selectTueThu">Tue &amp; Thu</button>
            <button type="button" class="add-duty-form__quick-btn" @click="selectSingleDay">1 Day</button>
            <button type="button" class="add-duty-form__quick-btn" @click="clearDays">No Days</button>
          </div>
        </div>

        <div class="add-duty-form__day-pills">
          <button
            v-for="day in weekDaysList"
            :key="day.dayKey"
            type="button"
            class="add-duty-form__day-pill"
            :class="{ 'add-duty-form__day-pill--active': isDaySelected(day.dayKey) }"
            @click="toggleDay(day.dayKey)"
            :title="`Toggle ${day.dayName} (${day.displayDate})`"
          >
            <span class="add-duty-form__day-check">
              <Check v-if="isDaySelected(day.dayKey)" :size="12" />
            </span>
            <strong class="add-duty-form__day-name">{{ day.dayKey }}</strong>
            <small class="add-duty-form__day-date">{{ day.displayDate }}</small>
          </button>
        </div>
      </div>

      <!-- Preview of dates -->
      <div v-if="datePreviewText" class="add-duty-form__preview-pill">
        <CalendarDays :size="14" />
        <span>{{ datePreviewText }}</span>
      </div>
      <div v-else class="add-duty-form__preview-pill add-duty-form__preview-pill--muted">
        <CalendarDays :size="14" />
        <span>No days selected — click a day button above (Mon–Fri) to schedule</span>
      </div>

      <!-- Duration & Time -->
      <div class="add-duty-form__row">
        <div class="add-duty-form__group" style="flex: 1;">
          <label class="add-duty-form__label" for="duty-duration">Duration (Per Day)</label>
          <div class="add-duty-form__unit-input">
            <input
              id="duty-duration"
              v-model.number="form.duration"
              type="number"
              min="0"
              step="any"
              class="setup__input"
              required
            />
            <span class="add-duty-form__unit">min</span>
          </div>
        </div>

        <div class="add-duty-form__group" style="flex: 1;">
          <label class="add-duty-form__label" for="duty-time">Time Slot (Optional)</label>
          <input
            id="duty-time"
            v-model="form.startTime"
            type="time"
            class="setup__input"
            placeholder="08:15"
          />
        </div>
      </div>

      <!-- Total minutes pill -->
      <div class="add-duty-form__summary-pill">
        <span>Total Duty Time to Log:</span>
        <strong>{{ totalMinutesCalculated }} minutes</strong>
      </div>

      <!-- Location / Room -->
      <div class="add-duty-form__group">
        <label class="add-duty-form__label" for="duty-location">Location / Room (Optional)</label>
        <input
          id="duty-location"
          v-model="form.location"
          type="text"
          class="setup__input"
          placeholder="e.g. Rm 151, Gym, 252, Bus Loop"
        />
      </div>

      <!-- Additional Notes -->
      <div class="add-duty-form__group">
        <label class="add-duty-form__label" for="duty-notes">Additional Notes (Optional)</label>
        <input
          id="duty-notes"
          v-model="form.notes"
          type="text"
          class="setup__input"
          placeholder="e.g. Teacher covered (Skywalker), details, etc."
        />
      </div>

      <!-- Options: Emergency & Outlook Export -->
      <div class="add-duty-form__checkboxes">
        <label class="add-duty-form__checkbox-label">
          <input
            v-model="form.isEmergency"
            type="checkbox"
            class="duty-settings__checkbox"
          />
          <span>Flag as Contractual Emergency On-call</span>
        </label>

        <label class="add-duty-form__checkbox-label">
          <input
            v-model="exportToOutlook"
            type="checkbox"
            class="duty-settings__checkbox"
          />
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <CalendarCheck :size="15" /> Download Outlook Calendar (.ics) file on save
          </span>
        </label>
      </div>

      <!-- Actions -->
      <div class="add-duty-form__footer">
        <button
          type="button"
          class="setup__btn-ghost"
          @click="$emit('close')"
        >
          Cancel
        </button>

        <button
          type="submit"
          class="setup__btn-primary"
          :disabled="isSubmitting || !form.dutyName || selectedDays.length === 0"
        >
          {{ isSubmitting ? 'Adding...' : selectedDays.length === 0 ? 'Select a day to add' : `Add Duty (${totalMinutesCalculated}m)` }}
        </button>
      </div>

    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { CalendarCheck, CalendarDays, Check } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { useDutyTracker } from '../../composables/useDutyTracker.js'
import { downloadDutiesIcs, getWeekDaysList, getWeekRangeForDate } from '../../utils/dutyCalendarExport.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  initialDate: { type: String, default: '' }
})

const emit = defineEmits(['close', 'created'])

const { dutySettings, addBatchDuties } = useDutyTracker()

const selectedDutyId = ref('')
const selectedDays = ref(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
const isSubmitting = ref(false)
const exportToOutlook = ref(true)

function getTodayLocalDate() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const form = ref({
  dutyName: '',
  startDate: getTodayLocalDate(),
  duration: 15,
  startTime: '08:15',
  location: '',
  notes: '',
  isEmergency: false
})

const weekDaysList = computed(() => {
  return getWeekDaysList(form.value.startDate)
})

const weekRangeLabel = computed(() => {
  const range = getWeekRangeForDate(form.value.startDate)
  return range ? range.label : ''
})

onMounted(() => {
  initDefaults()
})

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    initDefaults()
  }
})

function initDefaults() {
  form.value.startDate = props.initialDate || getTodayLocalDate()
  const catalog = dutySettings.value.dutyTypes || []
  if (catalog.length > 0) {
    const first = catalog[0]
    selectedDutyId.value = first.id || first.name
    applyDutyPreset(first)
  }
  if (props.initialDate) {
    const [y, m, d] = props.initialDate.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const dow = dt.getDay()
    const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayKey = map[dow]
    if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dayKey)) {
      selectedDays.value = [dayKey]
    }
  }
}

function onDutyTypeChange() {
  const catalog = dutySettings.value.dutyTypes || []
  const found = catalog.find(d => (d.id || d.name) === selectedDutyId.value)
  if (found) {
    applyDutyPreset(found)
  }
}

function isDaySelected(dayKey) {
  return selectedDays.value.includes(dayKey)
}

function toggleDay(dayKey) {
  if (selectedDays.value.includes(dayKey)) {
    selectedDays.value = selectedDays.value.filter(k => k !== dayKey)
  } else {
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    selectedDays.value = [...selectedDays.value, dayKey].sort(
      (a, b) => order.indexOf(a) - order.indexOf(b)
    )
  }
}

function clearDays() {
  selectedDays.value = []
}

function selectAllWeekdays() {
  selectedDays.value = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
}

function selectTueThu() {
  selectedDays.value = ['Tue', 'Thu']
}

function selectSingleDay() {
  if (!form.value.startDate) {
    selectedDays.value = ['Mon']
    return
  }
  const [y, m, d] = form.value.startDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = dt.getDay()
  const map = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' }
  selectedDays.value = [map[dow] || 'Mon']
}

function onStartDateChange() {
  const catalog = dutySettings.value.dutyTypes || []
  const found = catalog.find(d => (d.id || d.name) === selectedDutyId.value)
  if (!found) return

  // If duty defaults to no day (or defaultDays is 0), do not auto-select a day
  if (found.defaultDays === 0 || (!found.defaultWeekdays || found.defaultWeekdays.length === 0)) {
    return
  }

  // If 5-day duty and user picked a specific day (like Tuesday for a holiday week)
  if (found.defaultDays === 5) {
    const [y, m, d] = (form.value.startDate || '').split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const dow = dt.getDay()
    if (dow === 2) {
      // User specifically selected Tuesday (e.g. Holiday Monday!)
      selectedDays.value = ['Tue', 'Wed', 'Thu', 'Fri']
    } else if (dow === 3) {
      selectedDays.value = ['Wed', 'Thu', 'Fri']
    } else if (dow === 4) {
      selectedDays.value = ['Thu', 'Fri']
    } else if (dow === 1 || dow === 0 || dow === 6) {
      selectedDays.value = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    }
  } else if (found.defaultDays === 1) {
    selectSingleDay()
  }
  // Weight room stays ['Tue', 'Thu']
}

function applyDutyPreset(duty) {
  form.value.dutyName = duty.name
  form.value.duration = Number(duty.defaultDuration) || 15
  form.value.startTime = duty.defaultStartTime || ''
  form.value.location = duty.defaultLocation || ''
  form.value.isEmergency = Boolean(duty.isEmergency)

  // Smart weekday selection
  if (duty.defaultWeekdays && Array.isArray(duty.defaultWeekdays) && duty.defaultWeekdays.length > 0) {
    selectedDays.value = [...duty.defaultWeekdays]
  } else if (duty.defaultDays === 0 || (!duty.defaultWeekdays || duty.defaultWeekdays.length === 0)) {
    // Ad-hoc duty defaulting to no day selected (e.g. Emergency, On-call, OSSLT)
    // Only preserve initialDate if the user specifically opened the modal by clicking a calendar date cell
    if (props.initialDate && form.value.startDate === props.initialDate) {
      const [y, m, d] = props.initialDate.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      const dow = dt.getDay()
      const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayKey = map[dow]
      if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dayKey)) {
        selectedDays.value = [dayKey]
        return
      }
    }
    selectedDays.value = []
  } else if (duty.id === 'weight-room' || (duty.name && duty.name.toLowerCase().includes('weight')) || duty.defaultDays === 2) {
    selectedDays.value = ['Tue', 'Thu']
  } else if (duty.defaultDays === 5) {
    const [y, m, d] = (form.value.startDate || '').split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const dow = dt.getDay()
    if (dow === 2) {
      selectedDays.value = ['Tue', 'Wed', 'Thu', 'Fri']
    } else {
      selectedDays.value = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    }
  } else if (duty.defaultDays === 1) {
    selectSingleDay()
  } else {
    selectedDays.value = []
  }
}

const totalMinutesCalculated = computed(() => {
  const d = Number(form.value.duration) || 0
  return d * selectedDays.value.length
})

const datePreviewText = computed(() => {
  const days = weekDaysList.value.filter(d => selectedDays.value.includes(d.dayKey))
  if (days.length === 0) return ''
  if (days.length === 1) {
    return `1 day: ${days[0].dayName}, ${days[0].displayDate}`
  }
  if (days.length === 2) {
    return `2 days: ${days[0].dayKey} (${days[0].displayDate}) & ${days[1].dayKey} (${days[1].displayDate})`
  }
  return `${days.length} days: ${days[0].dayKey} (${days[0].displayDate}) – ${days[days.length - 1].dayKey} (${days[days.length - 1].displayDate})`
})

async function handleSubmit() {
  if (!form.value.dutyName || !form.value.startDate) return
  if (selectedDays.value.length === 0) return
  isSubmitting.value = true

  try {
    const datesToCreate = weekDaysList.value
      .filter(d => selectedDays.value.includes(d.dayKey))
      .map(d => d.dateIso)

    const createdDuties = await addBatchDuties({
      dutyName: form.value.dutyName,
      startDate: form.value.startDate,
      dates: datesToCreate,
      days: datesToCreate.length,
      duration: form.value.duration,
      startTime: form.value.startTime,
      location: form.value.location,
      notes: form.value.notes,
      isEmergency: form.value.isEmergency
    })

    if (exportToOutlook.value && createdDuties.length > 0) {
      const filename = `duties_${datesToCreate[0]}.ics`
      downloadDutiesIcs(createdDuties, filename)
    }

    emit('created', createdDuties)
    emit('close')
  } catch (err) {
    console.error('Failed to add duties:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.add-duty-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-duty-form__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.add-duty-form__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.add-duty-form__select {
  font-weight: 600;
}

.add-duty-form__row {
  display: flex;
  gap: 12px;
}

.add-duty-form__unit-input {
  display: flex;
  align-items: center;
  gap: 6px;
}

.add-duty-form__unit {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.add-duty-form__preview-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-secondary, #f2f2f7);
  border-radius: var(--radius-sm, 8px);
  font-size: 0.82rem;
  color: var(--primary, #4663ac);
  font-weight: 500;
}

.add-duty-form__preview-pill--muted {
  background: var(--bg-secondary, #f2f2f7);
  color: var(--text-tertiary, #8e8e93);
}

.add-duty-form__summary-pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(70, 99, 172, 0.08);
  border: 1px solid rgba(70, 99, 172, 0.2);
  border-radius: var(--radius-sm, 8px);
  font-size: 0.88rem;
  color: var(--text-primary);
}

.add-duty-form__summary-pill strong {
  color: var(--primary, #4663ac);
  font-size: 1rem;
}

.add-duty-form__checkboxes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 6px;
}

.add-duty-form__checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-primary);
  cursor: pointer;
}

.add-duty-form__label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.add-duty-form__label-context {
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.add-duty-form__days-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.add-duty-form__quick-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.add-duty-form__quick-btn {
  background: transparent;
  border: none;
  color: var(--primary, #4663ac);
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.add-duty-form__quick-btn:hover {
  background: var(--bg-secondary, #f2f2f7);
  text-decoration: underline;
}

.add-duty-form__day-pills {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.add-duty-form__day-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  background: var(--bg-secondary, #f2f2f7);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  min-height: 52px;
}

.add-duty-form__day-pill:hover {
  border-color: var(--primary, #4663ac);
}

.add-duty-form__day-pill--active {
  background: rgba(70, 99, 172, 0.12);
  border-color: var(--primary, #4663ac);
  color: var(--primary, #4663ac);
}

body.dark-theme .add-duty-form__day-pill--active {
  background: rgba(96, 165, 250, 0.2);
  border-color: #60a5fa;
  color: #93c5fd;
}

.add-duty-form__day-check {
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-duty-form__day-name {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.1;
  margin-top: 2px;
}

.add-duty-form__day-date {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.add-duty-form__day-pill--active .add-duty-form__day-date {
  color: var(--primary, #4663ac);
  opacity: 0.9;
}

body.dark-theme .add-duty-form__day-pill--active .add-duty-form__day-date {
  color: #93c5fd;
}

.add-duty-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
</style>
