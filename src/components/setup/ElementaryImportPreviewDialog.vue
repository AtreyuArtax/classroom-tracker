<template>
  <div class="setup__dialog" role="dialog" aria-modal="true">
    <div class="setup__dialog-box setup__dialog-box--large">
      <h3 class="setup__dialog-title">
        Import Elementary Homeroom
      </h3>

      <div class="setup__elm-preview-meta">
        <div class="setup__elm-preview-row">
          <span class="setup__elm-label">Homeroom</span>
          <span class="setup__elm-value">{{ preview.homeroomName }}</span>
          <span v-if="preview.existingHomeroom" class="setup__badge setup__badge--update">Update Existing</span>
          <span v-else class="setup__badge setup__badge--new">New Class</span>
        </div>
        <div v-if="subCohorts.length > 0" class="setup__elm-preview-row">
          <span class="setup__elm-label">Grades</span>
          <span class="setup__elm-value">
            <span
              v-for="sub in subCohorts"
              :key="sub"
              class="setup__chip setup__chip--blue"
              style="margin-right: 4px; font-size: 0.8rem;"
            >
              {{ sub }}
            </span>
          </span>
        </div>
        <div class="setup__elm-preview-row">
          <span class="setup__elm-label">School Year</span>
          <span class="setup__elm-value">{{ preview.csvYear }}</span>
        </div>
        <div class="setup__elm-preview-row">
          <span class="setup__elm-label">Students</span>
          <span class="setup__elm-value"><strong>{{ preview.validRows.length }}</strong> students detected</span>
        </div>
        <div v-if="skippedRows.length > 0" class="setup__elm-preview-row">
          <span class="setup__elm-label">Skipped</span>
          <span class="setup__elm-value">{{ skippedRows.length }} row{{ skippedRows.length === 1 ? '' : 's' }} missing a Student ID or name (listed in the summary)</span>
        </div>
      </div>

      <p class="setup__dialog-body" style="margin-top: 0.5rem; color: #64748b; font-size: 0.875rem; line-height: 1.45;">
        The following students will be added to your homeroom roster. All standard curriculum expectations for your grade will be auto-imported into each subject. You can customize, swap (to Overall Expectations / Success Criteria), or clear them anytime in <strong>Class Settings</strong>.
      </p>

      <!-- Student preview list -->
      <div class="setup__bulk-list" style="max-height: 220px;">
        <div
          v-for="s in preview.validRows"
          :key="s.studentId"
          class="setup__elm-student-row"
        >
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <span class="setup__elm-student-name">{{ s.lastName }}, {{ s.firstName }}</span>
            <span
              v-if="subCohorts.length > 1 && (s.gradeLevel || s.grade || s.courseCode)"
              class="setup__chip setup__chip--blue"
              style="font-size: 0.75rem; padding: 2px 6px; flex-shrink: 0;"
            >
              {{ s.gradeLevel || s.grade || s.courseCode }}
            </span>
          </div>
          <span class="setup__elm-student-id">{{ s.studentId }}</span>
        </div>
      </div>

      <div class="setup__dialog-actions" style="margin-top: 1rem;">
        <button class="setup__btn-primary" @click="emit('confirm')">
          {{ preview.existingHomeroom ? 'Update Roster' : 'Create Class & Import' }}
        </button>
        <button class="setup__btn-ghost" @click="emit('cancel')">Cancel</button>
      </div>
    </div>
    <div class="setup__dialog-backdrop" @click="emit('cancel')" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getPreviewSubCohorts } from '../../utils/rosterCsvImport.js'

const props = defineProps({
  /** { homeroomName, csvYear, validRows, existingHomeroom } */
  preview: { type: Object, required: true },
  skippedRows: { type: Array, default: () => [] }
})
const emit = defineEmits(['confirm', 'cancel'])

const subCohorts = computed(() => getPreviewSubCohorts(props.preview.validRows, props.preview.homeroomName))
</script>
