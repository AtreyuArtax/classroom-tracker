<template>
  <div class="setup__dialog" role="dialog" aria-modal="true" aria-labelledby="summary-modal-title">
    <div class="setup__dialog-box setup__dialog-box--large">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <div class="setup__summary-icon-box">
          <CheckCircle :size="26" style="color: var(--success, #10b981);" />
        </div>
        <div>
          <h3 id="summary-modal-title" class="setup__dialog-title" style="margin: 0;">Roster Import Complete</h3>
          <p class="setup__dialog-body" style="margin-top: 2px; margin-bottom: 0;">
            Successfully processed {{ summary.classesCount }} class{{ summary.classesCount === 1 ? '' : 'es' }}
            ({{ summary.classesCreated }} new, {{ summary.classesCount - summary.classesCreated }} updated).
          </p>
        </div>
      </div>

      <div class="setup__summary-pills">
        <span class="setup__chip setup__chip--green">
          <UserPlus :size="13" /> +{{ summary.totalAdded }} Added
        </span>
        <span class="setup__chip setup__chip--blue">
          <Users :size="13" /> {{ summary.totalUpdated }} Kept Active
        </span>
        <span v-if="summary.totalArchived > 0" class="setup__chip setup__chip--amber">
          <Archive :size="13" /> {{ summary.totalArchived }} Archived
        </span>
        <span v-if="summary.totalNotImported > 0" class="setup__chip setup__chip--amber">
          <AlertTriangle :size="13" /> {{ summary.totalNotImported }} In Another Class
        </span>
        <span v-if="summary.skippedRows.length > 0" class="setup__chip setup__chip--amber">
          <AlertTriangle :size="13" /> {{ summary.skippedRows.length }} Row{{ summary.skippedRows.length === 1 ? '' : 's' }} Skipped
        </span>
      </div>

      <div class="setup__summary-list">
        <div v-for="item in summary.items" :key="item.className" class="setup__summary-item">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong>{{ item.className }}</strong>
            <span v-if="item.isNew" class="setup__badge setup__badge--new" style="font-size: 0.68rem;">New Class</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem;">
            <div v-if="item.addedCount > 0" style="display: flex; align-items: baseline; gap: 6px;">
              <span class="setup__badge setup__badge--new" style="font-size: 0.68rem;">+{{ item.addedCount }} Added</span>
              <span style="color: var(--text-secondary); font-size: 0.8rem;">{{ item.addedNames.join(', ') }}</span>
            </div>
            <div v-if="item.archivedCount > 0" style="display: flex; align-items: baseline; gap: 6px;">
              <span class="setup__badge setup__badge--update" style="font-size: 0.68rem; background: rgba(245, 158, 11, 0.15); color: #f59e0b;">{{ item.archivedCount }} Archived</span>
              <span style="color: var(--text-secondary); font-size: 0.8rem;">{{ item.archivedNames.join(', ') }}</span>
            </div>
            <div v-if="item.notImportedNames.length > 0" style="display: flex; align-items: baseline; gap: 6px;">
              <span class="setup__badge setup__badge--update" style="font-size: 0.68rem; background: rgba(245, 158, 11, 0.15); color: #f59e0b;">{{ item.notImportedNames.length }} Not Imported</span>
              <span style="color: var(--text-secondary); font-size: 0.8rem;">{{ item.notImportedNames.join(', ') }} — still enrolled in another class</span>
            </div>
            <div v-if="item.addedCount === 0 && item.archivedCount === 0 && item.notImportedNames.length === 0" style="color: var(--text-secondary); font-size: 0.8rem;">
              {{ item.updatedCount }} students kept active.
            </div>
          </div>
        </div>

        <div v-if="summary.skippedRows.length > 0" class="setup__summary-item">
          <div style="margin-bottom: 6px;"><strong>Skipped CSV Rows</strong></div>
          <p style="margin: 0 0 6px; color: var(--text-secondary); font-size: 0.8rem;">
            Each student needs a Student ID and a name. Fix these rows in the CSV and import it again.
          </p>
          <ul style="margin: 0; padding-left: 18px; font-size: 0.8rem; color: var(--text-secondary);">
            <li v-for="(row, i) in summary.skippedRows" :key="i">
              {{ row.name || row.studentId }} — {{ row.reason }}
            </li>
          </ul>
        </div>
      </div>

      <div class="setup__dialog-actions">
        <button type="button" class="setup__btn-primary" @click="emit('close')">Done</button>
      </div>
    </div>
    <div class="setup__dialog-backdrop" @click="emit('close')" />
  </div>
</template>

<script setup>
import { AlertTriangle, Archive, CheckCircle, UserPlus, Users } from 'lucide-vue-next'

defineProps({
  /** buildBulkImportSummary() / buildElementaryImportSummary() output */
  summary: { type: Object, required: true }
})
const emit = defineEmits(['close'])
</script>
