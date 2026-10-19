<template>
  <BaseModal
    :show="show"
    title="Edit Duty Entry"
    maxWidth="480px"
    @close="$emit('close')"
  >
    <form v-if="duty" @submit.prevent="handleSave" class="edit-duty-form">
      
      <div class="edit-duty-form__group">
        <label class="edit-duty-form__label" for="edit-duty-name">Duty Name</label>
        <input
          id="edit-duty-name"
          v-model="form.dutyName"
          type="text"
          class="setup__input"
          required
        />
      </div>

      <div class="edit-duty-form__row">
        <div class="edit-duty-form__group" style="flex: 1.2;">
          <label class="edit-duty-form__label" for="edit-duty-date">Date</label>
          <input
            id="edit-duty-date"
            v-model="form.date"
            type="date"
            class="setup__input"
            required
          />
        </div>

        <div class="edit-duty-form__group" style="flex: 1;">
          <label class="edit-duty-form__label" for="edit-duty-duration">Duration</label>
          <div class="edit-duty-form__unit-input">
            <input
              id="edit-duty-duration"
              v-model.number="form.duration"
              type="number"
              min="0"
              step="any"
              class="setup__input"
              required
            />
            <span class="edit-duty-form__unit">min</span>
          </div>
        </div>
      </div>

      <div class="edit-duty-form__group">
        <label class="edit-duty-form__label" for="edit-duty-time">Time Slot (Optional)</label>
        <input
          id="edit-duty-time"
          v-model="form.startTime"
          type="time"
          class="setup__input"
        />
      </div>

      <div class="edit-duty-form__group">
        <label class="edit-duty-form__label" for="edit-duty-notes">Notes</label>
        <input
          id="edit-duty-notes"
          v-model="form.notes"
          type="text"
          class="setup__input"
          placeholder="e.g. Teacher covered, snow day, etc."
        />
      </div>

      <div class="edit-duty-form__checkboxes">
        <label class="edit-duty-form__checkbox-label">
          <input
            v-model="form.isSnowDay"
            type="checkbox"
            class="duty-settings__checkbox"
          />
          <span style="font-weight: 600; color: #0284c7;">
            Snow Day / Cancelled (waives minutes from completed tally)
          </span>
        </label>

        <label class="edit-duty-form__checkbox-label">
          <input
            v-model="form.isEmergency"
            type="checkbox"
            class="duty-settings__checkbox"
          />
          <span>Flag as Contractual Emergency On-call</span>
        </label>
      </div>

      <div class="edit-duty-form__footer">
        <button
          type="button"
          class="edit-duty-form__delete-btn"
          @click="handleDelete"
        >
          <Trash2 :size="15" />
          <span>Delete</span>
        </button>

        <div class="edit-duty-form__footer-actions">
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
            :disabled="isSaving"
          >
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>

    </form>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import { useDutyTracker } from '../../composables/useDutyTracker.js'
import { useMessage } from '../../composables/useMessage.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  duty: { type: Object, default: null }
})

const emit = defineEmits(['close', 'saved', 'deleted'])

const { updateDuty, deleteDuty } = useDutyTracker()
const { confirm } = useMessage()

const isSaving = ref(false)
const form = ref({
  dutyName: '',
  date: '',
  duration: 15,
  startTime: '',
  notes: '',
  isSnowDay: false,
  isEmergency: false
})

watch(() => props.duty, (val) => {
  if (val) {
    form.value = {
      dutyName: val.dutyName || '',
      date: val.date || '',
      duration: Number(val.duration) || 0,
      startTime: val.startTime || '',
      notes: val.notes || '',
      isSnowDay: Boolean(val.isSnowDay),
      isEmergency: Boolean(val.isEmergency)
    }
  }
}, { immediate: true })

async function handleSave() {
  if (!props.duty || !props.duty.dutyId) return
  isSaving.value = true
  try {
    const updated = await updateDuty(props.duty.dutyId, form.value)
    emit('saved', updated)
    emit('close')
  } catch (err) {
    console.error('Failed to update duty:', err)
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!props.duty || !props.duty.dutyId) return
  const confirmed = await confirm(
    `Delete duty entry "${props.duty.dutyName}" on ${props.duty.date}?`,
    'Delete Duty Entry',
    { danger: true }
  )
  if (confirmed) {
    await deleteDuty(props.duty.dutyId)
    emit('deleted', props.duty.dutyId)
    emit('close')
  }
}
</script>

<style scoped>
.edit-duty-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.edit-duty-form__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-duty-form__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.edit-duty-form__row {
  display: flex;
  gap: 12px;
}

.edit-duty-form__unit-input {
  display: flex;
  align-items: center;
  gap: 6px;
}

.edit-duty-form__unit {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.edit-duty-form__checkboxes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 6px;
}

.edit-duty-form__checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-primary);
  cursor: pointer;
}

.edit-duty-form__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.edit-duty-form__delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}

.edit-duty-form__delete-btn:hover {
  background: rgba(239, 68, 68, 0.18);
  border-color: #ef4444;
  color: #dc2626;
}

body.dark-theme .edit-duty-form__delete-btn {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}

body.dark-theme .edit-duty-form__delete-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: #f87171;
  color: #fca5a5;
}

.edit-duty-form__footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
