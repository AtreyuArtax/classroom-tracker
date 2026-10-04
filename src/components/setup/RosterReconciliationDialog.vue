<template>
  <div class="setup__dialog" role="dialog" aria-modal="true" aria-labelledby="recon-modal-title">
    <div class="setup__dialog-box setup__dialog-box--large setup__dialog-box--recon">
      <h3 id="recon-modal-title" class="setup__dialog-title">Review Roster Changes</h3>
      <p class="setup__dialog-body">
        We detected updates for your selected class{{ items.length === 1 ? '' : 'es' }}. Review newly added students and decide whether to archive students no longer on the CSV.
      </p>

      <div class="setup__recon-list">
        <div v-for="item in items" :key="item.className" class="setup__recon-card">
          <div class="setup__recon-card-header">
            <strong>{{ item.className }}</strong>
            <span v-if="item.isExisting" class="setup__badge setup__badge--update">Update Existing</span>
            <span v-else class="setup__badge setup__badge--new">New Class</span>
          </div>

          <!-- Added Students -->
          <div v-if="item.adding.length > 0" class="setup__recon-section setup__recon-section--adding">
            <div class="setup__recon-section-title">
              <UserPlus :size="15" style="color: var(--success, #10b981);" />
              <span>Adding {{ item.adding.length }} Student{{ item.adding.length === 1 ? '' : 's' }}</span>
            </div>
            <div class="setup__recon-names-wrap">
              <span v-for="st in item.adding" :key="st.studentId" class="setup__chip setup__chip--green">
                {{ st.name }} <template v-if="st.grade">({{ st.grade }})</template>
              </span>
            </div>
          </div>

          <!-- Enrolled Students (kept active / unchanged) -->
          <div v-if="item.updating.length > 0" class="setup__recon-meta-note">
            <Users :size="13" /> {{ item.updating.length }} currently enrolled student{{ item.updating.length === 1 ? '' : 's' }} will remain unchanged.
          </div>

          <!-- Missing Students / Archive Prompt -->
          <div v-if="item.missing.length > 0" class="setup__recon-section setup__recon-section--missing">
            <div class="setup__recon-section-title setup__recon-section-title--warning">
              <AlertTriangle :size="15" style="color: #f59e0b;" />
              <span>{{ item.missing.length }} student{{ item.missing.length === 1 ? '' : 's' }} not in this CSV — archive?</span>
            </div>
            <p class="setup__recon-hint">
              These students are currently enrolled in Classroom Tracker but are absent from the uploaded CSV. Archiving hides them from the active seating chart while <strong>fully preserving</strong> all grades, attendance, and notes.
            </p>

            <div class="setup__recon-checklist-header">
              <span style="font-size: 0.75rem; color: var(--text-secondary);">Select students to archive:</span>
              <div class="setup__recon-toggle-btns">
                <button type="button" class="setup__text-btn" @click="setAllArchive(item, true)">Select All</button>
                <span>·</span>
                <button type="button" class="setup__text-btn" @click="setAllArchive(item, false)">Deselect All</button>
              </div>
            </div>

            <div class="setup__recon-checklist">
              <label
                v-for="st in item.missing"
                :key="st.studentId"
                class="setup__recon-check-row"
              >
                <input type="checkbox" v-model="st.selectedForArchive" class="setup__checkbox" />
                <span class="setup__recon-student-name">{{ st.name }}</span>
                <span class="setup__recon-student-id">#{{ st.studentId }}</span>
                <span v-if="st.grade" class="setup__chip" style="font-size: 0.7rem;">{{ st.grade }}</span>
              </label>
            </div>
          </div>

          <!-- No missing students notice -->
          <div v-else-if="item.isExisting && item.adding.length === 0" class="setup__recon-clean-state">
            ✓ All enrolled students match the uploaded CSV.
          </div>
        </div>
      </div>

      <div class="setup__dialog-actions setup__recon-actions">
        <button type="button" class="setup__btn-ghost" @click="emit('cancel')">Cancel</button>
        <button type="button" class="setup__btn-primary" @click="emit('confirm')">
          {{ selectedForArchive > 0 ? `Archive (${selectedForArchive}) & Import` : 'Complete Import' }}
        </button>
      </div>
    </div>
    <div class="setup__dialog-backdrop" @click="emit('cancel')" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertTriangle, UserPlus, Users } from 'lucide-vue-next'

const props = defineProps({
  /** buildReconciliationItems() items; `selectedForArchive` is toggled in place */
  items: { type: Array, required: true }
})
const emit = defineEmits(['confirm', 'cancel'])

const selectedForArchive = computed(() =>
  props.items.reduce((total, item) => total + item.missing.filter(m => m.selectedForArchive).length, 0)
)

function setAllArchive(item, target) {
  item.missing.forEach(m => { m.selectedForArchive = target })
}
</script>
