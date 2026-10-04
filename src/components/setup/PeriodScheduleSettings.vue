<template>
  <!-- Elementary School Start Time -->
  <div v-if="teachingMode === 'elementary'" class="setup__card" id="sec-period-times">
    <h2 class="setup__card-title">School Start Time</h2>
    <p class="setup__hint">Define the official morning bell start time for your homeroom. This will autopopulate when creating or configuring your class.</p>
    <div style="max-width: 240px; margin-top: 12px;">
      <label class="setup__label" style="display: block; font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">Morning Bell Start Time</label>
      <input 
        :value="periodStartTimes[1] || '08:50'" 
        type="time" 
        class="setup__input" 
        @change="e => {
          const updated = { ...periodStartTimes, 1: e.target.value };
          updatePeriodStartTimes(updated);
        }" 
      />
    </div>
  </div>

  <!-- Period Defaults (Secondary / Post-Secondary Only) -->
  <div v-else class="setup__card" id="sec-period-times">
    <h2 class="setup__card-title">Period Start Times</h2>
    <p class="setup__hint">Define the default start time for each period. These will autopopulate when creating or editing a class.</p>
    <div class="setup__period-grid">
      <div v-for="p in periodOptions" :key="p" class="setup__period-row">
        <div class="setup__period-header">
          <span class="setup__period-label">Period {{ p }}</span>
          <button v-if="p !== 1" class="setup__icon-btn setup__icon-btn--danger" @click="onRemovePeriod(p)">
            <Trash2 :size="14" />
          </button>
        </div>
        <input 
          :value="periodStartTimes[p]" 
          type="time" 
          class="setup__input" 
          @change="e => {
            const updated = { ...periodStartTimes, [p]: e.target.value };
            updatePeriodStartTimes(updated);
          }" 
        />
      </div>
    </div>
    <button class="setup__btn-ghost setup__btn--full" style="margin-top: 1rem" @click="onAddPeriod">
      <Plus :size="14" /> Add Period
    </button>
  </div>
</template>

<script setup>
import { Plus, Trash2 } from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { useMessage } from '../../composables/useMessage.js'
import { nextPeriodStartTime } from '../../utils/rosterCsvImport.js'

const { teachingMode, periodOptions, periodStartTimes, updatePeriodStartTimes } = useClassroom()
const { confirm } = useMessage()

async function onAddPeriod() {
  const next = Math.max(...periodOptions.value, 0) + 1
  const updated = { ...periodStartTimes.value, [next]: nextPeriodStartTime(periodStartTimes.value[next - 1]) }
  await updatePeriodStartTimes(updated)
}

async function onRemovePeriod(p) {
  if (p === 1) return
  if (await confirm(`Are you sure you want to remove Period ${p}? This will remove it from your settings, but existing classes will not be affected.`)) {
    const updated = { ...periodStartTimes.value }
    delete updated[p]
    await updatePeriodStartTimes(updated)
  }
}
</script>
