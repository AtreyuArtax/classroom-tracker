<template>
  <BulkImportDialog
    v-if="bulkGroups"
    :groups="bulkGroups"
    :new-periods="newPeriods"
    :skipped-rows="skippedRows"
    @confirm="confirmBulkImport"
    @cancel="bulkGroups = null"
  />

  <RosterReconciliationDialog
    v-if="reconciliationItems"
    :items="reconciliationItems"
    @confirm="executeBulkImport(reconciliationItems, true)"
    @cancel="reconciliationItems = null"
  />

  <ElementaryImportPreviewDialog
    v-if="elementaryPreview"
    :preview="elementaryPreview"
    :skipped-rows="skippedRows"
    @confirm="confirmElementaryImport"
    @cancel="elementaryPreview = null"
  />

  <CrossClassConflictDialog
    v-if="conflicts.length > 0"
    :conflicts="conflicts"
    @resolve="resolveConflicts"
  />

  <ImportSummaryDialog
    v-if="summary"
    :summary="summary"
    @close="summary = null"
  />
</template>

<script setup>
/**
 * Roster CSV import flow for Setup. Call `start(file)` with a CSV File.
 *
 * Secondary: choose classes (BulkImportDialog) → decide about students missing
 * from the CSV (RosterReconciliationDialog, only when there are any) → summary.
 * Elementary: homeroom preview → students enrolled in another class this year
 * (CrossClassConflictDialog, only when there are any) → summary.
 */
import { ref } from 'vue'
import Papa from 'papaparse'
import BulkImportDialog from './BulkImportDialog.vue'
import RosterReconciliationDialog from './RosterReconciliationDialog.vue'
import ElementaryImportPreviewDialog from './ElementaryImportPreviewDialog.vue'
import CrossClassConflictDialog from './CrossClassConflictDialog.vue'
import ImportSummaryDialog from './ImportSummaryDialog.vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { useMessage } from '../../composables/useMessage.js'
import { detectGradeFromClassName } from '../../composables/useElementary.js'
import { getCurrentSchoolYear } from '../../utils/dates.js'
import {
  parseRosterRows,
  addMissingPeriodTimes,
  groupRosterRows,
  buildReconciliationItems,
  buildBulkImportSummary,
  buildElementaryImportSummary,
  detectElementaryHomeroom,
  findExistingHomeroom
} from '../../utils/rosterCsvImport.js'

const {
  classList,
  activeClass,
  teachingMode,
  periodOptions,
  periodStartTimes,
  updatePeriodStartTimes,
  switchClass,
  createClass,
  importRoster,
  bulkImportClasses,
  archiveStudentInClass,
  moveStudentFromClass,
  reloadClasses
} = useClassroom()
const { alert } = useMessage()

const skippedRows = ref([])
const bulkGroups = ref(null)
const newPeriods = ref([])
const reconciliationItems = ref(null)
const elementaryPreview = ref(null)
const conflicts = ref([])
const summary = ref(null)
let pendingElementary = null

function start(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => handleParsedRows(results.data),
    error: (err) => alert(`The CSV file could not be read: ${err.message}`, 'Import Failed')
  })
}

async function handleParsedRows(rawRows) {
  const ac = activeClass.value
  const { validRows, skippedRows: skipped } = parseRosterRows(rawRows, {
    year: ac?.year || getCurrentSchoolYear(),
    periodNumber: ac?.periodNumber || '1',
    semester: ac?.semester || '1'
  })
  skippedRows.value = skipped

  if (validRows.length === 0) {
    const detail = skipped.length > 0
      ? ` ${skipped.length} row${skipped.length === 1 ? ' was' : 's were'} missing a Student ID or name.`
      : ''
    await alert(`No students were found in this CSV. Each row needs a Student ID and a student name.${detail}`, 'Nothing to Import')
    return
  }

  if (teachingMode.value === 'elementary') {
    const { homeroomName, csvYear } = detectElementaryHomeroom(rawRows, getCurrentSchoolYear())
    elementaryPreview.value = {
      homeroomName,
      csvYear,
      validRows,
      existingHomeroom: findExistingHomeroom(classList.value, homeroomName, csvYear)
    }
    return
  }

  // New periods are only previewed here; they're saved when the import is confirmed
  const { missingPeriods, updatedTimes } = addMissingPeriodTimes(validRows, periodOptions.value, periodStartTimes.value)
  newPeriods.value = missingPeriods
  bulkGroups.value = groupRosterRows(validRows, updatedTimes)
}

// ── Secondary: multi-class import ────────────────────────────────────────────

async function confirmBulkImport() {
  const selected = Object.values(bulkGroups.value).filter(g => g.selected)
  if (selected.length === 0) return
  bulkGroups.value = null

  const { items, anyMissing } = buildReconciliationItems(selected, classList.value)
  if (anyMissing) {
    reconciliationItems.value = items
  } else {
    await executeBulkImport(items, false)
  }
}

async function executeBulkImport(items, archiveMissing) {
  reconciliationItems.value = null
  const groups = items.map(i => i.group)
  groups.forEach(g => { if (!g.classType) g.classType = teachingMode.value || 'secondary' })

  try {
    const { missingPeriods, updatedTimes } = addMissingPeriodTimes(groups.flatMap(g => g.students), periodOptions.value, periodStartTimes.value)
    if (missingPeriods.length > 0) await updatePeriodStartTimes(updatedTimes)
    await bulkImportClasses(groups)
    if (archiveMissing) {
      let archivedCount = 0
      for (const item of items) {
        if (!item.existingClass) continue
        for (const m of item.missing.filter(m => m.selectedForArchive)) {
          await archiveStudentInClass(item.existingClass.classId, m.studentId)
          archivedCount++
        }
      }
      if (archivedCount > 0) await reloadClasses()
    }
  } catch (err) {
    console.error('[RosterImportFlow] Bulk import failed:', err)
    await alert(`The import did not finish: ${err.message}. Check Manage Classes to see which classes were updated.`, 'Import Failed')
    return
  }

  summary.value = buildBulkImportSummary(items, archiveMissing, skippedRows.value)
}

// ── Elementary: homeroom import ──────────────────────────────────────────────

async function confirmElementaryImport() {
  const { homeroomName, csvYear, validRows, existingHomeroom } = elementaryPreview.value
  elementaryPreview.value = null

  // Snapshot the roster before importRoster mutates it, so the summary can tell added from kept
  const existingStudents = Object.fromEntries(
    Object.entries(existingHomeroom?.students || {}).map(([id, s]) => [id, { firstName: s.firstName, lastName: s.lastName, archived: !!s.archived }])
  )

  let result
  try {
    if (existingHomeroom) {
      await switchClass(existingHomeroom.classId)
    } else {
      const studentGrades = [...new Set(validRows.map(r => r.gradeLevel || r.grade).filter(Boolean))]
      const autoGrade = studentGrades.length > 0
        ? (studentGrades.length > 1 ? studentGrades.sort().join('/') : studentGrades[0])
        : (detectGradeFromClassName(homeroomName) || 'Grade 7')

      await createClass({
        classId: `class_${Date.now()}`,
        name: homeroomName,
        courseCode: homeroomName,
        gradeLevel: autoGrade,
        year: csvYear,
        semester: '1',
        periodNumber: 1,
        classType: 'elementary',
      })
    }
    result = await importRoster(validRows)
  } catch (err) {
    console.error('[RosterImportFlow] Homeroom import failed:', err)
    await alert(`The import did not finish: ${err.message}`, 'Import Failed')
    return
  }

  pendingElementary = { homeroomName, isNew: !existingHomeroom, validRows, existingStudents, conflicts: result.crossClassConflicts }
  if (result.crossClassConflicts.length > 0) {
    conflicts.value = result.crossClassConflicts
  } else {
    showElementarySummary(false)
  }
}

async function resolveConflicts(action) {
  const pending = conflicts.value
  conflicts.value = []
  if (action === 'move') {
    for (const conflict of pending) {
      await moveStudentFromClass(conflict.existingClassId, conflict.student)
    }
  }
  showElementarySummary(action === 'move')
}

function showElementarySummary(moved) {
  if (!pendingElementary) return
  summary.value = buildElementaryImportSummary({ ...pendingElementary, moved, skippedRows: skippedRows.value })
  pendingElementary = null
}

defineExpose({ start })
</script>
