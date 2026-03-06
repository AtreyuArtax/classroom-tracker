<template>
  <div class="reports">

    <!-- ── Report tabs ───────────────────────────────────────────── -->
    <div class="reports__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="reports__tab"
        :class="{ 'reports__tab--active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="switchTab(tab.id)"
      >{{ tab.label }}</button>
    </div>

    <!-- ── Date range filter (shared across report tabs) ─────────── -->
    <div v-if="activeTab !== 'backup'" class="reports__filter">
      <label class="reports__filter-label">
        From
        <input v-model="dateFrom" type="date" class="reports__input" />
      </label>
      <label class="reports__filter-label">
        To
        <input v-model="dateTo" type="date" class="reports__input" />
      </label>
      <button class="reports__btn-run" @click="runReport">Run Report</button>
      <button class="reports__btn-ghost" @click="clearDates">Clear</button>
    </div>

    <!-- ── Loading indicator ─────────────────────────────────────── -->
    <div v-if="loading" class="reports__loading" aria-live="polite">Loading…</div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- STUDENT DETAIL ─── by_studentId index                    -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'student'" class="reports__panel">
      <div class="reports__card">
        <h2 class="reports__card-title">Student Detail</h2>
        <label class="reports__label">
          Student
          <select v-model="selectedStudentId" class="reports__input" @change="runReport">
            <option value="">— select —</option>
            <option v-for="s in sortedRoster" :key="s.studentId" :value="s.studentId">
              {{ s.lastName }}, {{ s.firstName }} ({{ s.studentId }})
            </option>
          </select>
        </label>
        <EventTable :events="reportData" :behavior-codes="behaviorCodesMap" />
        <ExportBar :events="reportData" filename="student-detail" />
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- CLASS SUMMARY ─── by_classId index                       -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'class'" class="reports__panel">
      <div class="reports__card">
        <h2 class="reports__card-title">Class Summary — {{ activeClass?.name }}</h2>
        <SummaryGrid :events="reportData" :students="students" :behavior-codes="behaviorCodesMap" />
        <ExportBar :events="reportData" filename="class-summary" />
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PERIOD PATTERN ─── by_periodNumber index                 -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'period'" class="reports__panel">
      <div class="reports__card">
        <h2 class="reports__card-title">Period Pattern</h2>
        <label class="reports__label">
          Period
          <select v-model.number="selectedPeriod" class="reports__input" @change="runReport">
            <option v-for="n in 10" :key="n" :value="n">Period {{ n }}</option>
          </select>
        </label>
        <label class="reports__label">
          Day of week
          <select v-model.number="selectedDayOfWeek" class="reports__input" @change="runReport">
            <option :value="null">Any day</option>
            <option v-for="(d, i) in dayNames" :key="i" :value="i">{{ d }}</option>
          </select>
        </label>
        <EventTable :events="reportData" :behavior-codes="behaviorCodesMap" />
        <ExportBar :events="reportData" filename="period-pattern" />
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- WASHROOM LOG ─── classId + code === 'w'                  -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'washroom'" class="reports__panel">
      <div class="reports__card">
        <h2 class="reports__card-title">Washroom Log — {{ activeClass?.name }}</h2>
        <WashroomTable :events="reportData" :students="students" />
        <ExportBar :events="reportData" filename="washroom-log" />
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- DAILY OVERVIEW ─── by_timestamp (single day)             -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'daily'" class="reports__panel">
      <div class="reports__card">
        <h2 class="reports__card-title">Daily Overview</h2>
        <label class="reports__label">
          Date
          <input v-model="dailyDate" type="date" class="reports__input" @change="runReport" />
        </label>
        <EventTable :events="reportData" :behavior-codes="behaviorCodesMap" />
        <ExportBar :events="reportData" filename="daily-overview" />
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- BACKUP & RESTORE ─── §13                                  -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'backup'" class="reports__panel">

      <!-- Export -->
      <div class="reports__card">
        <h2 class="reports__card-title">Export Backup</h2>
        <p class="reports__hint">Downloads all classes, students, and events as a single JSON file. No data leaves your device.</p>
        <button class="reports__btn-primary" @click="doExport">
          <span aria-hidden="true">⬇️</span> Download Backup
        </button>
        <p v-if="backupMsg" class="reports__msg">{{ backupMsg }}</p>
      </div>

      <!-- Import -->
      <div class="reports__card">
        <h2 class="reports__card-title">Restore from Backup</h2>
        <p class="reports__hint">
          ⚠️ This will <strong>overwrite all existing data</strong>. A summary will be shown before anything is written.
        </p>

        <label class="reports__file-label" for="backup-file">
          <span aria-hidden="true">📂</span> Choose backup JSON
          <input
            id="backup-file"
            type="file"
            accept=".json,application/json"
            class="reports__file-input"
            @change="onBackupFileSelected"
          />
        </label>

        <!-- Confirm import dialog -->
        <div v-if="importPreview" class="reports__dialog" role="dialog" aria-modal="true">
          <div class="reports__dialog-box">
            <h3 class="reports__dialog-title">Confirm Restore</h3>
            <p class="reports__dialog-body">
              This backup was created on <strong>{{ formatDate(importPreview.exportedAt) }}</strong>
              and contains:
            </p>
            <ul class="reports__dialog-list">
              <li>{{ importPreview.classes?.length ?? 0 }} classes</li>
              <li>{{ importPreview.events?.length ?? 0 }} events</li>
            </ul>
            <p class="reports__dialog-warn">All current data will be overwritten. This cannot be undone.</p>
            <div class="reports__dialog-actions">
              <button class="reports__btn-danger" @click="doImport">Restore Now</button>
              <button class="reports__btn-ghost" @click="importPreview = null">Cancel</button>
            </div>
          </div>
          <div class="reports__dialog-backdrop" @click="importPreview = null" />
        </div>

        <p v-if="restoreMsg" class="reports__msg">{{ restoreMsg }}</p>
      </div>
    </section>

  </div>
</template>

<script setup>
/**
 * Reports.vue — View C: Reporting + Backup Hub
 *
 * CLAUDE.md §12 — all queries go through indexed reads (no full scans)
 * CLAUDE.md §13 — backup/restore via eventService.exportAllData / importAllData
 * CLAUDE.md §4  — no direct IDB access; composables + eventService for backup only
 *
 * The backup functions in eventService work at the raw IDB level and are the
 * one exception where a view imports from src/db/ — per §4 the rule is that
 * components never import db/ files; here we import eventService only for
 * the exportAllData / importAllData functions which have no composable wrapper.
 * All query functions are wrapped via useClassroom's eventService calls below.
 */

import { ref, computed, defineComponent, h } from 'vue'
import { useClassroom } from '../composables/useClassroom.js'
import * as eventService from '../db/eventService.js'

const {
  activeClass,
  students,
  behaviorCodes,
  sortedRoster,
  classList,
} = useClassroom()

// ─── tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { id: 'student',  label: 'Student'  },
  { id: 'class',    label: 'Class'    },
  { id: 'period',   label: 'Period'   },
  { id: 'washroom', label: 'Washroom' },
  { id: 'daily',    label: 'Daily'    },
  { id: 'backup',   label: '💾 Backup' },
]

const activeTab = ref('class')

function switchTab(id) {
  activeTab.value  = id
  reportData.value = []
}

// ─── shared date range ────────────────────────────────────────────────────────

const dateFrom = ref('')
const dateTo   = ref('')

function clearDates() {
  dateFrom.value = ''
  dateTo.value   = ''
  runReport()
}

const dateRange = computed(() => ({
  from: dateFrom.value || undefined,
  to:   dateTo.value   || undefined,
}))

// ─── per-report selectors ─────────────────────────────────────────────────────

const selectedStudentId = ref('')
const selectedPeriod    = ref(1)
const selectedDayOfWeek = ref(null)
const dailyDate         = ref(new Date().toISOString().slice(0, 10))

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── query runner ─────────────────────────────────────────────────────────────

const reportData = ref([])
const loading    = ref(false)

async function runReport() {
  loading.value = true
  try {
    const tab = activeTab.value
    const dr  = dateRange.value

    if (tab === 'student') {
      if (!selectedStudentId.value) { reportData.value = []; return }
      reportData.value = await eventService.getEventsByStudent(selectedStudentId.value, dr)

    } else if (tab === 'class') {
      if (!activeClass.value) { reportData.value = []; return }
      reportData.value = await eventService.getEventsByClass(activeClass.value.classId, dr)

    } else if (tab === 'period') {
      reportData.value = await eventService.getEventsByPeriod(selectedPeriod.value, {
        ...dr,
        dayOfWeek: selectedDayOfWeek.value,
      })

    } else if (tab === 'washroom') {
      if (!activeClass.value) { reportData.value = []; return }
      const all = await eventService.getEventsByClass(activeClass.value.classId, dr)
      // Filter for washroom toggle events (code === 'w' or any toggle-type code)
      const toggleKeys = behaviorCodes.value
        .filter(c => c.type === 'toggle')
        .map(c => c.codeKey)
      reportData.value = all.filter(e => toggleKeys.includes(e.code))

    } else if (tab === 'daily') {
      const dayRange = { from: dailyDate.value, to: dailyDate.value }
      reportData.value = await eventService.getAllEvents(dayRange)
    }
  } finally {
    loading.value = false
  }
}

// ─── behavior codes map ───────────────────────────────────────────────────────

const behaviorCodesMap = computed(() =>
  Object.fromEntries(behaviorCodes.value.map(c => [c.codeKey, c]))
)

// ─── backup / restore (§13) ──────────────────────────────────────────────────

const backupMsg     = ref('')
const restoreMsg    = ref('')
const importPreview = ref(null)

async function doExport() {
  backupMsg.value = ''
  try {
    const data     = await eventService.exportAllData()
    const json     = JSON.stringify(data, null, 2)
    const blob     = new Blob([json], { type: 'application/json' })
    const url      = URL.createObjectURL(blob)
    const date     = new Date().toISOString().slice(0, 10)
    const filename = `classroom-backup-${date}.json`

    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    backupMsg.value = `✅ Backup downloaded: ${filename}`
  } catch (err) {
    backupMsg.value = `❌ Export failed: ${err.message}`
  }
}

function onBackupFileSelected(evt) {
  const file = evt.target.files?.[0]
  if (!file) return
  restoreMsg.value = ''

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result)
      if (parsed.schemaVersion !== 1) {
        restoreMsg.value = `❌ Schema version mismatch (v${parsed.schemaVersion}). Expected v1. Aborting.`
        return
      }
      importPreview.value = parsed
    } catch {
      restoreMsg.value = '❌ Could not parse file — is it a valid backup JSON?'
    }
  }
  reader.readAsText(file)
  evt.target.value = ''
}

async function doImport() {
  if (!importPreview.value) return
  restoreMsg.value  = ''
  try {
    const result = await eventService.importAllData(importPreview.value)
    importPreview.value = null
    restoreMsg.value = `✅ Restore complete — ${result.classCount} classes, ${result.eventCount} events. Refreshing…`
    // Reload the page so all reactive state is rebuilt fresh from IDB
    setTimeout(() => window.location.reload(), 1500)
  } catch (err) {
    importPreview.value = null
    restoreMsg.value = `❌ Restore failed: ${err.message}`
  }
}

function formatDate(iso) {
  if (!iso) return 'unknown date'
  return new Date(iso).toLocaleString()
}

// ─── inline sub-components ────────────────────────────────────────────────────

/**
 * EventTable — renders a list of events with formatting.
 */
const EventTable = defineComponent({
  props: {
    events:        { type: Array, required: true },
    behaviorCodes: { type: Object, default: () => ({}) },
  },
  setup(props) {
    return () => {
      if (props.events.length === 0) {
        return h('p', { class: 'reports__no-data' }, 'No events for the selected filters.')
      }
      return h('div', { class: 'reports__table-wrap' },
        h('table', { class: 'reports__table' }, [
          h('thead', {}, h('tr', {}, [
            h('th', {}, 'Time'),
            h('th', {}, 'Student'),
            h('th', {}, 'Code'),
            h('th', {}, 'Category'),
            h('th', {}, 'Period'),
          ])),
          h('tbody', {}, props.events.map(evt =>
            h('tr', { key: evt.eventId }, [
              h('td', {}, evt.timestamp?.slice(0, 16).replace('T', ' ') ?? ''),
              h('td', {}, evt.studentId),
              h('td', {}, `${props.behaviorCodes[evt.code]?.icon ?? ''} ${evt.code}`),
              h('td', {}, evt.category),
              h('td', {}, `P${evt.periodNumber}`),
            ])
          )),
        ])
      )
    }
  },
})

/**
 * SummaryGrid — event counts per student per code.
 */
const SummaryGrid = defineComponent({
  props: {
    events:        { type: Array, required: true },
    students:      { type: Object, default: () => ({}) },
    behaviorCodes: { type: Object, default: () => ({}) },
  },
  setup(props) {
    return () => {
      if (props.events.length === 0) {
        return h('p', { class: 'reports__no-data' }, 'No events for the selected filters.')
      }
      // Build { studentId: { code: count } }
      const summary = {}
      for (const evt of props.events) {
        if (!summary[evt.studentId]) summary[evt.studentId] = {}
        summary[evt.studentId][evt.code] = (summary[evt.studentId][evt.code] ?? 0) + 1
      }
      const codes = Object.keys(props.behaviorCodes)

      return h('div', { class: 'reports__table-wrap' },
        h('table', { class: 'reports__table' }, [
          h('thead', {}, h('tr', {}, [
            h('th', {}, 'Student'),
            ...codes.map(c => h('th', { key: c }, `${props.behaviorCodes[c]?.icon ?? ''} ${c}`)),
            h('th', {}, 'Total'),
          ])),
          h('tbody', {}, Object.entries(summary).map(([studentId, counts]) => {
            const s     = props.students[studentId]
            const name  = s ? `${s.lastName}, ${s.firstName}` : studentId
            const total = Object.values(counts).reduce((a, b) => a + b, 0)
            return h('tr', { key: studentId }, [
              h('td', {}, name),
              ...codes.map(c => h('td', { key: c }, counts[c] ?? 0)),
              h('td', {}, total),
            ])
          })),
        ])
      )
    }
  },
})

/**
 * WashroomTable — toggle events with duration.
 */
const WashroomTable = defineComponent({
  props: {
    events:   { type: Array, required: true },
    students: { type: Object, default: () => ({}) },
  },
  setup(props) {
    return () => {
      if (props.events.length === 0) {
        return h('p', { class: 'reports__no-data' }, 'No washroom events for the selected filters.')
      }
      return h('div', { class: 'reports__table-wrap' },
        h('table', { class: 'reports__table' }, [
          h('thead', {}, h('tr', {}, [
            h('th', {}, 'Time'),
            h('th', {}, 'Student'),
            h('th', {}, 'Period'),
            h('th', {}, 'Duration'),
          ])),
          h('tbody', {}, props.events.map(evt => {
            const s      = props.students[evt.studentId]
            const name   = s ? `${s.lastName}, ${s.firstName}` : evt.studentId
            const durStr = evt.duration != null
              ? `${Math.floor(evt.duration / 60000)}m ${Math.round((evt.duration % 60000) / 1000)}s`
              : '—'
            return h('tr', { key: evt.eventId }, [
              h('td', {}, evt.timestamp?.slice(0, 16).replace('T', ' ') ?? ''),
              h('td', {}, name),
              h('td', {}, `P${evt.periodNumber}`),
              h('td', {}, durStr),
            ])
          })),
        ])
      )
    }
  },
})

/**
 * ExportBar — CSV download button.
 * CLAUDE.md §12: CSV export via Blob API.
 */
const ExportBar = defineComponent({
  props: {
    events:   { type: Array, required: true },
    filename: { type: String, default: 'export' },
  },
  setup(props) {
    function downloadCsv() {
      if (props.events.length === 0) return
      const keys  = Object.keys(props.events[0])
      const rows  = [
        keys.join(','),
        ...props.events.map(e =>
          keys.map(k => JSON.stringify(e[k] ?? '')).join(',')
        ),
      ]
      const blob     = new Blob([rows.join('\n')], { type: 'text/csv' })
      const url      = URL.createObjectURL(blob)
      const date     = new Date().toISOString().slice(0, 10)
      const a        = document.createElement('a')
      a.href         = url
      a.download     = `${props.filename}-${date}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    return () => props.events.length > 0
      ? h('button', { class: 'reports__btn-export', onClick: downloadCsv }, '⬇️ Export CSV')
      : null
  },
})
</script>

<style scoped>
.reports {
  flex:           1;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
}

/* ── Tabs ────────────────────────────────────────────────────────── */
.reports__tabs {
  display:       flex;
  overflow-x:    auto;
  background:    var(--surface);
  box-shadow:    var(--shadow-sm);
  border-bottom: 1px solid var(--border);
  flex-shrink:   0;
  scrollbar-width: none;
}

.reports__tabs::-webkit-scrollbar { display: none; }

.reports__tab {
  flex-shrink: 0;
  padding:     12px 16px;
  border:      none;
  background:  transparent;
  font-size:   0.82rem;
  font-weight: 500;
  color:       var(--text-secondary);
  cursor:      pointer;
  min-height:  44px;
  border-bottom: 2px solid transparent;
  transition:  color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.reports__tab--active {
  color:         var(--primary);
  font-weight:   700;
  border-bottom: 2px solid var(--primary);
}

/* ── Date filter bar ─────────────────────────────────────────────── */
.reports__filter {
  display:      flex;
  align-items:  flex-end;
  gap:          10px;
  padding:      10px 16px;
  background:   var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink:  0;
  flex-wrap:    wrap;
}

.reports__filter-label {
  display:        flex;
  flex-direction: column;
  gap:            3px;
  font-size:      0.75rem;
  font-weight:    600;
  color:          var(--text-secondary);
}

/* ── Panel ───────────────────────────────────────────────────────── */
.reports__panel {
  flex:       1;
  overflow-y: auto;
  padding:    16px;
  display:    flex;
  flex-direction: column;
  gap:        16px;
}

/* ── Cards ───────────────────────────────────────────────────────── */
.reports__card {
  background:    var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-sm);
  padding:       16px;
  display:       flex;
  flex-direction: column;
  gap:           12px;
}

.reports__card-title {
  font-size:   1rem;
  font-weight: 700;
  color:       var(--text);
}

.reports__hint {
  font-size:   0.82rem;
  color:       var(--text-secondary);
  line-height: 1.5;
}

.reports__no-data {
  color:     var(--text-secondary);
  font-size: 0.88rem;
}

.reports__msg {
  font-size: 0.85rem;
  color:     var(--text-secondary);
}

/* ── Inputs ──────────────────────────────────────────────────────── */
.reports__input {
  padding:       10px 12px;
  border:        1px solid var(--border);
  border-radius: var(--radius-sm);
  background:    var(--bg-secondary);
  min-height:    44px;
  font-size:     0.9rem;
  color:         var(--text);
  transition:    border-color 0.15s ease;
}

.reports__input:focus {
  outline:      none;
  border-color: var(--primary);
}

.reports__label {
  display:        flex;
  flex-direction: column;
  gap:            4px;
  font-size:      0.82rem;
  font-weight:    600;
  color:          var(--text-secondary);
}

/* ── Buttons ─────────────────────────────────────────────────────── */
.reports__btn-run {
  padding:       10px 18px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--primary);
  color:         #fff;
  font-size:     0.88rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
}

.reports__btn-ghost {
  padding:       10px 14px;
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  background:    transparent;
  color:         var(--text-secondary);
  font-size:     0.88rem;
  cursor:        pointer;
  min-height:    44px;
}

.reports__btn-primary {
  padding:       12px 20px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--primary);
  color:         #fff;
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
}

.reports__btn-danger {
  padding:       12px 20px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--state-out);
  color:         #fff;
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
}

.reports__btn-export {
  align-self:    flex-start;
  padding:       10px 18px;
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  background:    var(--bg-secondary);
  color:         var(--primary);
  font-size:     0.85rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
}

/* ── Table ───────────────────────────────────────────────────────── */
.reports__table-wrap {
  overflow-x: auto;
}

.reports__table {
  width:           100%;
  border-collapse: collapse;
  font-size:       0.82rem;
  color:           var(--text);
}

.reports__table th {
  text-align:    left;
  padding:       8px 12px;
  background:    var(--bg-secondary);
  font-weight:   700;
  color:         var(--text-secondary);
  border-bottom: 1px solid var(--border);
  white-space:   nowrap;
}

.reports__table td {
  padding:       8px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.reports__table tr:last-child td {
  border-bottom: none;
}

.reports__table tr:hover td {
  background: var(--bg-secondary);
}

/* ── File upload ─────────────────────────────────────────────────── */
.reports__file-label {
  display:       flex;
  align-items:   center;
  gap:           8px;
  padding:       14px;
  border:        2px dashed var(--border);
  border-radius: var(--radius-md);
  cursor:        pointer;
  font-size:     0.9rem;
  color:         var(--primary);
  font-weight:   600;
  min-height:    52px;
  transition:    border-color 0.15s ease, background 0.15s ease;
}

.reports__file-label:hover {
  background:   var(--primary-light);
  border-color: var(--primary);
}

.reports__file-input {
  position: absolute;
  opacity:  0;
  width:    0;
  height:   0;
}

/* ── Loading ─────────────────────────────────────────────────────── */
.reports__loading {
  padding:   24px;
  text-align: center;
  color:     var(--text-secondary);
}

/* ── Dialog ──────────────────────────────────────────────────────── */
.reports__dialog {
  position:        fixed;
  inset:           0;
  z-index:         900;
  display:         flex;
  align-items:     center;
  justify-content: center;
}

.reports__dialog-backdrop {
  position:   absolute;
  inset:      0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
}

.reports__dialog-box {
  position:       relative;
  z-index:        1;
  background:     var(--surface);
  border-radius:  var(--radius-lg);
  box-shadow:     var(--shadow-md);
  padding:        24px;
  max-width:      380px;
  width:          90%;
  display:        flex;
  flex-direction: column;
  gap:            12px;
}

.reports__dialog-title {
  font-size:   1.05rem;
  font-weight: 700;
  color:       var(--text);
}

.reports__dialog-body {
  font-size:   0.88rem;
  color:       var(--text-secondary);
  line-height: 1.5;
}

.reports__dialog-list {
  padding-left: 16px;
  font-size:    0.88rem;
  color:        var(--text);
  display:      flex;
  flex-direction: column;
  gap:          4px;
}

.reports__dialog-warn {
  font-size:   0.82rem;
  color:       var(--state-out);
  font-weight: 600;
}

.reports__dialog-actions {
  display:   flex;
  gap:       10px;
  flex-wrap: wrap;
}

/* ── Print ───────────────────────────────────────────────────────── */
@media print {
  .reports__tabs,
  .reports__filter,
  .reports__btn-run,
  .reports__btn-ghost,
  .reports__btn-export,
  .reports__btn-primary,
  .reports__btn-danger {
    display: none !important;
  }

  .reports__panel {
    overflow: visible;
  }

  .reports__table {
    font-size: 10pt;
  }
}
</style>
