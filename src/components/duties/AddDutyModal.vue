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
            {{ opt.name }} ({{ opt.defaultDuration }}m · {{ opt.defaultDays }}d)
          </option>
        </select>
      </div>

      <!-- Start Date & Days Grid -->
      <div class="add-duty-form__row">
        <div class="add-duty-form__group" style="flex: 1.2;">
          <label class="add-duty-form__label" for="duty-start-date">Start Date</label>
          <input
            id="duty-start-date"
            v-model="form.startDate"
            type="date"
            class="setup__input"
            required
          />
        </div>

        <div class="add-duty-form__group" style="flex: 1;">
          <label class="add-duty-form__label" for="duty-days">Consecutive Days</label>
          <input
            id="duty-days"
            v-model.number="form.days"
            type="number"
            min="1"
            max="14"
            class="setup__input"
            required
          />
        </div>
      </div>

      <!-- Preview of dates -->
      <div v-if="datePreviewText" class="add-duty-form__preview-pill">
        <CalendarDays :size="14" />
        <span>{{ datePreviewText }}</span>
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

      <!-- Additional Notes -->
      <div class="add-duty-form__group">
        <label class="add-duty-form__label" for="duty-notes">Additional Notes (Optional)</label>
        <input
          id="duty-notes"
          v-model="form.notes"
          type="text"
          class="setup__input"
          placeholder="e.g. Teacher covered (Rodney), location (Bus Bay), etc."
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
          :disabled="isSubmitting || !form.dutyName"
        >
          {{ isSubmitting ? 'Adding...' : `Add Duty (${totalMinutesCalculated}m)` }}
        </button>
      </div>

    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { CalendarCheck, CalendarDays } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { useDutyTracker } from '../../composables/useDutyTracker.js'
import { downloadDutiesIcs } from '../../utils/dutyCalendarExport.js'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'created'])

const { dutySettings, addBatchDuties } = useDutyTracker()

const selectedDutyId = ref('')
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
  days: 5,
  duration: 15,
  startTime: '08:15',
  notes: '',
  isEmergency: false
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
  form.value.startDate = getTodayLocalDate()
  const catalog = dutySettings.value.dutyTypes || []
  if (catalog.length > 0) {
    const first = catalog[0]
    selectedDutyId.value = first.id || first.name
    applyDutyPreset(first)
  }
}

function onDutyTypeChange() {
  const catalog = dutySettings.value.dutyTypes || []
  const found = catalog.find(d => (d.id || d.name) === selectedDutyId.value)
  if (found) {
    applyDutyPreset(found)
  }
}

function applyDutyPreset(duty) {
  form.value.dutyName = duty.name
  form.value.duration = Number(duty.defaultDuration) || 15
  form.value.days = Number(duty.defaultDays) || 1
  form.value.startTime = duty.defaultStartTime || ''
  form.value.isEmergency = Boolean(duty.isEmergency)
}

const totalMinutesCalculated = computed(() => {
  const d = Number(form.value.duration) || 0
  const days = Math.max(1, Number(form.value.days) || 1)
  return d * days
})

const datePreviewText = computed(() => {
  if (!form.value.startDate || form.value.days <= 1) return ''
  const days = Math.min(14, Math.max(1, Number(form.value.days) || 1))
  const [y, m, d] = form.value.startDate.split('-').map(Number)
  const start = new Date(y, m - 1, d)

  const dates = []
  let curr = new Date(start)
  while (dates.length < days) {
    const dow = curr.getDay()
    if (dow !== 0 && dow !== 6) {
      dates.push(new Date(curr))
    }
    curr.setDate(curr.getDate() + 1)
  }

  if (dates.length === 0) return ''
  const first = dates[0].toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  const last = dates[dates.length - 1].toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return `${days} weekdays: ${first} – ${last}`
})

async function handleSubmit() {
  if (!form.value.dutyName || !form.value.startDate) return
  isSubmitting.value = true

  try {
    const createdDuties = await addBatchDuties({
      dutyName: form.value.dutyName,
      startDate: form.value.startDate,
      days: form.value.days,
      duration: form.value.duration,
      startTime: form.value.startTime,
      notes: form.value.notes,
      isEmergency: form.value.isEmergency
    })

    if (exportToOutlook.value && createdDuties.length > 0) {
      const filename = `duties_${form.value.startDate}.ics`
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

.add-duty-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
</style>
