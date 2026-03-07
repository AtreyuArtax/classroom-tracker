<template>
  <div class="reports">
    <div class="reports__layout">

      <!-- ══ LEFT SIDEBAR ══════════════════════════════════════════════ -->
      <aside class="reports__sidebar">

        <!-- Class selector -->
        <div class="reports__sidebar-section">
          <label class="reports__sidebar-label">
            Class
            <select v-model="sidebarClassId" class="reports__input reports__input--sidebar" @change="onSidebarClassChange">
              <option v-for="c in classList" :key="c.classId" :value="c.classId">{{ c.name }}</option>
            </select>
          </label>
        </div>

        <!-- Mobile toggle -->
        <button class="reports__roster-toggle" @click="rosterOpen = !rosterOpen">
          {{ rosterOpen ? '▲ Hide Students' : '▼ Show Students' }}
        </button>

        <!-- Student roster list -->
        <ul class="reports__roster" :class="{ 'reports__roster--open': rosterOpen }">
          <li
            v-for="s in sidebarStudents"
            :key="s.studentId"
            class="reports__roster-item"
            :class="{ 'reports__roster-item--active': dossier.selectedStudentId.value === s.studentId && rightMode === 'dossier' }"
            @click="onSelectStudent(s.studentId)"
          >
            {{ s.lastName }}, {{ s.firstName }}
          </li>
          <li v-if="sidebarStudents.length === 0" class="reports__roster-empty">No students</li>
        </ul>

        <!-- Class Overview link -->
        <button
          class="reports__overview-btn"
          :class="{ 'reports__overview-btn--active': rightMode === 'overview' }"
          @click="showOverview"
        >📊 Class Overview</button>

      </aside>

      <!-- ══ RIGHT PANEL ════════════════════════════════════════════════ -->
      <main class="reports__main">

        <!-- Loading -->
        <div v-if="dossier.loading.value" class="reports__loading" aria-live="polite">Loading…</div>

        <!-- ── STUDENT DOSSIER ──────────────────────────────────────── -->
        <template v-else-if="rightMode === 'dossier' && dossier.selectedStudentId.value">

          <!-- Header + period toggle -->
          <div class="reports__dossier-header">
            <h2 class="reports__dossier-name">{{ dossierStudentName }}</h2>
            <div class="reports__period-row" role="group" aria-label="Time period">
              <button
                v-for="p in PERIODS"
                :key="p.value"
                class="reports__period-btn"
                :class="{ 'reports__period-btn--active': dossier.selectedPeriod.value === p.value }"
                @click="dossier.selectedPeriod.value = p.value"
              >{{ p.label }}</button>
            </div>
          </div>

          <!-- Stats row -->
          <div class="reports__stats-row">
            <div class="reports__stat-card">
              <div class="reports__stat-value">{{ dossier.stats.value.washroomTrips }}</div>
              <div class="reports__stat-label">🚽 Washroom</div>
              <div class="reports__stat-sub">{{ dossier.stats.value.washroomMinutes }} min</div>
            </div>
            <div class="reports__stat-card">
              <div class="reports__stat-value">{{ dossier.stats.value.redirects }}</div>
              <div class="reports__stat-label">📱 On Device</div>
            </div>
            <div class="reports__stat-card">
              <div class="reports__stat-value">{{ dossier.stats.value.absences }}</div>
              <div class="reports__stat-label">🚫 Absences</div>
            </div>
            <div class="reports__stat-card">
              <div class="reports__stat-value">{{ dossier.stats.value.lateCount }}</div>
              <div class="reports__stat-label">⏰ Lates</div>
              <div class="reports__stat-sub" v-if="dossier.stats.value.lateCount > 0">
                avg {{ dossier.stats.value.avgLateMinutes }} min
              </div>
            </div>
            <div class="reports__stat-card">
              <div class="reports__stat-value">{{ dossier.stats.value.parentContactCount }}</div>
              <div class="reports__stat-label">📞 Contacts</div>
            </div>
            <div class="reports__stat-card">
              <div class="reports__stat-value">{{ dossier.stats.value.noteCount }}</div>
              <div class="reports__stat-label">📝 Notes</div>
            </div>
          </div>

          <!-- Existing StudentProfile component -->
          <div class="reports__card">
            <StudentProfile
              :events="dossier.events.value"
              :behavior-codes="behaviorCodesMap"
              :student-name="dossierStudentName"
            />
          </div>

          <!-- Notes & Parent Contact feed -->
          <div class="reports__card">
            <h3 class="reports__card-title">Notes &amp; Parent Contact</h3>
            <div v-if="dossier.noteEvents.value.length === 0" class="reports__no-data">
              No notes or parent contacts recorded in this period.
            </div>
            <ul v-else class="reports__note-feed">
              <li v-for="evt in dossier.noteEvents.value" :key="evt.eventId" class="reports__note-item">
                <div class="reports__note-meta">
                  <span class="reports__note-time">{{ formatTimestamp(evt.timestamp) }}</span>
                  <span class="reports__note-code">
                    {{ behaviorCodesMap[evt.code]?.icon ?? '' }}
                    {{ behaviorCodesMap[evt.code]?.label ?? evt.code }}
                  </span>
                </div>
                <p class="reports__note-text">{{ evt.note }}</p>
              </li>
            </ul>
          </div>

          <!-- General Note (read-only) -->
          <div class="reports__card">
            <h3 class="reports__card-title">General Notes</h3>
            <p class="reports__general-note">
              {{ dossier.student.value?.generalNote?.trim() || 'No general notes recorded.' }}
            </p>
          </div>

        </template>

        <!-- ── CLASS OVERVIEW ────────────────────────────────────────── -->
        <template v-else>

          <!-- Prompt when no student selected and not explicitly in overview mode -->
          <div v-if="rightMode !== 'overview'" class="reports__placeholder">
            <p>← Select a student to view their dossier, or click <strong>📊 Class Overview</strong> for aggregate reports.</p>
          </div>

          <template v-if="rightMode === 'overview'">

            <!-- Aggregate tabs (no Student tab here — superseded by sidebar) -->
            <div class="reports__tabs" role="tablist">
              <button
                v-for="tab in overviewTabs"
                :key="tab.id"
                class="reports__tab"
                :class="{ 'reports__tab--active': activeTab === tab.id }"
                role="tab"
                :aria-selected="activeTab === tab.id"
                @click="switchTab(tab.id)"
              >{{ tab.label }}</button>
            </div>

            <!-- Date filter (all tabs except backup) -->
            <div v-if="activeTab !== 'backup'" class="reports__filter">
              <label class="reports__filter-label">
                Class
                <select v-model="reportClassId" class="reports__input" @change="runReport">
                  <option v-for="c in classList" :key="c.classId" :value="c.classId">{{ c.name }}</option>
                </select>
              </label>
              <label class="reports__filter-label">
                From <input v-model="dateFrom" type="date" class="reports__input" />
              </label>
              <label class="reports__filter-label">
                To <input v-model="dateTo" type="date" class="reports__input" />
              </label>
              <button class="reports__btn-run" @click="runReport">Run Report</button>
              <button class="reports__btn-ghost" @click="clearDates">Clear</button>
            </div>

            <div v-if="loading" class="reports__loading" aria-live="polite">Loading…</div>

            <!-- Class Summary -->
            <section v-else-if="activeTab === 'class'" class="reports__panel">
              <div class="reports__card">
                <h2 class="reports__card-title">Class Summary — {{ reportClass?.name }}</h2>
                <SummaryGrid :events="reportData" :students="reportStudents" :behavior-codes="behaviorCodesMap" />
                <ExportBar :events="reportData" filename="class-summary" />
              </div>
            </section>

            <!-- Washroom Log -->
            <section v-else-if="activeTab === 'washroom'" class="reports__panel">
              <div class="reports__card">
                <h2 class="reports__card-title">Washroom Log — {{ reportClass?.name }}</h2>
                <WashroomTable :events="reportData" :students="reportStudents" @delete-event="deleteEvent" />
                <ExportBar :events="reportData" filename="washroom-log" />
              </div>
            </section>

            <!-- Attendance -->
            <section v-else-if="activeTab === 'attendance'" class="reports__panel">
              <div class="reports__card">
                <h2 class="reports__card-title">Attendance Summary — {{ reportClass?.name }}</h2>
                <AttendanceTable :events="reportData" :students="reportStudents" />
                <ExportBar :events="reportData" filename="attendance-summary" />
              </div>
            </section>

            <!-- Backup & Restore -->
            <section v-else-if="activeTab === 'backup'" class="reports__panel">
              <div class="reports__card">
                <h2 class="reports__card-title">Export Backup</h2>
                <p class="reports__hint">Downloads all classes, students, and events as a single JSON file. No data leaves your device.</p>
                <button class="reports__btn-primary" @click="doExport">
                  <span aria-hidden="true">⬇️</span> Download Backup
                </button>
                <p v-if="backupMsg" class="reports__msg">{{ backupMsg }}</p>
              </div>
              <div class="reports__card">
                <h2 class="reports__card-title">Restore from Backup</h2>
                <p class="reports__hint">⚠️ This will <strong>overwrite all existing data</strong>. A summary will be shown before anything is written.</p>
                <label class="reports__file-label" for="backup-file">
                  <span aria-hidden="true">📂</span> Choose backup JSON
                  <input id="backup-file" type="file" accept=".json,application/json" class="reports__file-input" @change="onBackupFileSelected" />
                </label>
                <div v-if="importPreview" class="reports__dialog" role="dialog" aria-modal="true">
                  <div class="reports__dialog-box">
                    <h3 class="reports__dialog-title">Confirm Restore</h3>
                    <p class="reports__dialog-body">
                      This backup was created on <strong>{{ formatDate(importPreview.exportedAt) }}</strong> and contains:
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

          </template>
        </template>

      </main>
    </div>
  </div>
</template>









<script setup>
/**
 * Reports.vue — View C: Reporting + Backup Hub
 *
 * CLAUDE.md §12 — all queries go through indexed reads (no full scans)
 * CLAUDE.md §13 — backup/restore via eventService.exportAllData / importAllData
 * CLAUDE.md §4  — composables handle IDB; eventService used only for backup/restore
 */

import { ref, computed, watch, defineComponent, h, onMounted } from 'vue'
import { useClassroom }        from '../composables/useClassroom.js'
import { useStudentDossier }   from '../composables/useStudentDossier.js'
import * as eventService       from '../db/eventService.js'
import StudentProfile          from '../components/StudentProfile.vue'

const {
  activeClass,
  behaviorCodes,
  classList,
} = useClassroom()

// ─── dossier composable ───────────────────────────────────────────────────────

const dossier = useStudentDossier()

// Period toggle options
const PERIODS = [
  { label: 'This Week',     value: 'week'     },
  { label: 'This Month',    value: 'month'    },
  { label: 'This Semester', value: 'semester' },
  { label: 'All Time',      value: 'all'      },
]

// ─── sidebar state ────────────────────────────────────────────────────────────

/** Class selected in the sidebar dropdown */
const sidebarClassId = ref(activeClass.value?.classId ?? classList.value[0]?.classId ?? null)
/** Whether the roster list is visible (mobile toggle) */
const rosterOpen     = ref(true)
/** 'dossier' | 'overview' */
const rightMode      = ref(null)  // null = placeholder

onMounted(() => {
  if (sidebarClassId.value) {
    dossier.loadSidebarClass(sidebarClassId.value)
  }
})

// Initialise sidebarClassId from classList when it first loads
watch(classList, (list) => {
  if (!sidebarClassId.value && list.length) {
    sidebarClassId.value = activeClass.value?.classId ?? list[0]?.classId
    dossier.loadSidebarClass(sidebarClassId.value)
  }
})

/** Students shown in the sidebar, sorted by lastName (from dossier composable) */
const sidebarStudents = dossier.sidebarStudents

/** Called when the class dropdown changes */
function onSidebarClassChange() {
  dossier.clearStudent()
  rightMode.value = null
  dossier.loadSidebarClass(sidebarClassId.value)
}

/** Called when a student row is tapped */
async function onSelectStudent(studentId) {
  rightMode.value = 'dossier'
  await dossier.loadStudent(sidebarClassId.value, studentId)
}

/** Switches right panel to aggregate Class Overview */
function showOverview() {
  rightMode.value = 'overview'
  dossier.clearStudent()
  if (!reportData.value.length) runReport()
}

// ─── dossier display helpers ─────────────────────────────────────────────────

const dossierStudentName = computed(() => {
  const s = dossier.student.value
  if (!s) return ''
  return `${s.lastName}, ${s.firstName}`
})

function formatTimestamp(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// ─── aggregate-report class selection (independent of sidebar) ───────────────

const reportClassId = ref(null)

const reportClass = computed(() =>
  classList.value.find(c => c.classId === reportClassId.value)
  ?? classList.value[0]
  ?? null
)

watch(classList, (list) => {
  if (!reportClassId.value && list.length) {
    reportClassId.value = activeClass.value?.classId ?? list[0]?.classId
  }
}, { immediate: true })

const reportStudents = computed(() => reportClass.value?.students ?? {})

// ─── overview tabs ────────────────────────────────────────────────────────────

const overviewTabs = [
  { id: 'class',      label: 'Class'      },
  { id: 'washroom',   label: 'Washroom'   },
  { id: 'attendance', label: 'Attendance' },
  { id: 'backup',     label: '💾 Backup'  },
]

const activeTab = ref('class')

function switchTab(id) {
  activeTab.value  = id
  reportData.value = []
}

// ─── shared date range ────────────────────────────────────────────────────────

function toISODate(d) { return d.toISOString().slice(0, 10) }

function thisWeekMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toISODate(d)
}

const dateFrom = ref(thisWeekMonday())
const dateTo   = ref(toISODate(new Date()))

function clearDates() {
  dateFrom.value = thisWeekMonday()
  dateTo.value   = toISODate(new Date())
  runReport()
}

const dateRange = computed(() => ({
  from: dateFrom.value || undefined,
  to:   dateTo.value   || undefined,
}))

// ─── aggregate query runner ───────────────────────────────────────────────────

const reportData = ref([])
const loading    = ref(false)

async function runReport() {
  loading.value = true
  try {
    const tab = activeTab.value
    const dr  = dateRange.value

    if (tab === 'class') {
      if (!reportClass.value) { reportData.value = []; return }
      reportData.value = await eventService.getEventsByClass(reportClass.value.classId, dr)

    } else if (tab === 'washroom') {
      if (!reportClass.value) { reportData.value = []; return }
      const all       = await eventService.getEventsByClass(reportClass.value.classId, dr)
      const toggleKeys = behaviorCodes.value.filter(c => c.type === 'toggle').map(c => c.codeKey)
      reportData.value = all.filter(e => toggleKeys.includes(e.code))

    } else if (tab === 'attendance') {
      if (!reportClass.value) { reportData.value = []; return }
      const all = await eventService.getEventsByClass(reportClass.value.classId, dr)
      reportData.value = all.filter(e => e.code === 'a' || e.code === 'l')
    }
  } finally {
    loading.value = false
  }
}

async function deleteEvent(eventId) {
  if (!confirm('Delete this event? This cannot be undone.')) return
  try {
    await eventService.deleteEvent(eventId)
    await runReport()
  } catch (err) {
    alert('Failed to delete event: ' + err.message)
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
    showStudent:   { type: Boolean, default: true },
  },
  emits: ['delete-event'],
  setup(props, { emit }) {
    return () => {
      if (props.events.length === 0) {
        return h('p', { class: 'reports__no-data' }, 'No events for the selected filters.')
      }
      return h('div', { class: 'reports__table-wrap' },
        h('table', { class: 'reports__table' }, [
          h('thead', {}, h('tr', {}, [
            h('th', {}, 'Time'),
            ...(props.showStudent ? [h('th', {}, 'Student')] : []),
            h('th', {}, 'Code'),
            h('th', {}, 'Category'),
            h('th', {}, 'Period'),
            h('th', {}, ''), // Actions header
          ])),
          h('tbody', {}, props.events.map(evt => {
            const isLate = evt.code === 'l'
            const extra = isLate 
              ? ` (${evt.duration}m${evt.supersededAbsent ? ', replaces absent' : ''})`
              : ''
            return h('tr', { key: evt.eventId }, [
              h('td', {}, evt.timestamp?.slice(0, 16).replace('T', ' ') ?? ''),
              ...(props.showStudent ? [h('td', {}, evt.studentId)] : []),
              h('td', {}, `${props.behaviorCodes[evt.code]?.icon ?? ''} ${evt.code}${extra}`),
              h('td', {}, evt.category),
              h('td', {}, `P${evt.periodNumber}`),
              h('td', { class: 'reports__td-actions' }, 
                h('button', {
                  class: 'reports__btn-delete',
                  title: 'Delete event',
                  onClick: () => emit('delete-event', evt.eventId)
                }, '✕')
              ),
            ])
          })),
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
  emits: ['delete-event'],
  setup(props, { emit }) {
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
            h('th', {}, ''), // Actions header
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
              h('td', { class: 'reports__td-actions' }, 
                h('button', {
                  class: 'reports__btn-delete',
                  title: 'Delete event',
                  onClick: () => emit('delete-event', evt.eventId)
                }, '✕')
              ),
            ])
          })),
        ])
      )
    }
  },
})

/**
 * AttendanceTable — summary of absent/late per student.
 */
const AttendanceTable = defineComponent({
  props: {
    events:   { type: Array, required: true },
    students: { type: Object, default: () => ({}) },
  },
  setup(props) {
    return () => {
      if (props.events.length === 0) {
        return h('p', { class: 'reports__no-data' }, 'No attendance events for the selected filters.')
      }
      
      // Build { studentId: { absent, late, lateTotal, lateCount } }
      const summary = {}
      for (const evt of props.events) {
        if (!summary[evt.studentId]) {
          summary[evt.studentId] = { absent: 0, late: 0, lateTotal: 0, lateCount: 0 }
        }
        if (evt.code === 'a') {
          summary[evt.studentId].absent++
        } else if (evt.code === 'l') {
          summary[evt.studentId].late++
          if (evt.duration != null) {
            summary[evt.studentId].lateTotal += evt.duration
            summary[evt.studentId].lateCount++
          }
        }
      }

      return h('div', { class: 'reports__table-wrap' },
        h('table', { class: 'reports__table' }, [
          h('thead', {}, h('tr', {}, [
            h('th', {}, 'Student'),
            h('th', {}, 'Absent Count'),
            h('th', {}, 'Late Count'),
            h('th', {}, 'Avg Late (min)'),
          ])),
          h('tbody', {}, Object.entries(summary).map(([studentId, stats]) => {
            const s     = props.students[studentId]
            const name  = s ? `${s.lastName}, ${s.firstName}` : studentId
            const avg   = stats.lateCount > 0 
              ? (stats.lateTotal / stats.lateCount).toFixed(1)
              : '—'
            return h('tr', { key: studentId }, [
              h('td', {}, name),
              h('td', {}, stats.absent),
              h('td', {}, stats.late),
              h('td', {}, avg),
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
  background:     var(--bg-secondary);
}

/* ── Layout ──────────────────────────────────────────────────────── */
.reports__layout {
  flex:           1;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
}

@media (min-width: 768px) {
  .reports__layout {
    flex-direction: row;
  }
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
.reports__sidebar {
  background:    var(--surface);
  border-right:  none;
  border-bottom: 1px solid var(--border);
  display:       flex;
  flex-direction: column;
  flex-shrink:   0;
  z-index:       10;
}

@media (min-width: 768px) {
  .reports__sidebar {
    width:         240px;
    border-right:  1px solid var(--border);
    border-bottom: none;
  }
  .reports__roster-toggle {
    display: none;
  }
}

.reports__sidebar-section {
  padding:       16px;
  border-bottom: 1px solid var(--border);
}

.reports__sidebar-label {
  display:        flex;
  flex-direction: column;
  gap:            6px;
  font-size:      0.82rem;
  font-weight:    700;
  color:          var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reports__input--sidebar {
  width: 100%;
}

.reports__roster-toggle {
  padding:     12px 16px;
  background:  var(--surface);
  border:      none;
  border-bottom: 1px solid var(--border);
  width:       100%;
  text-align:  left;
  font-weight: 600;
  color:       var(--primary);
  font-size:   0.9rem;
  cursor:      pointer;
}

.reports__roster {
  list-style: none;
  margin:     0;
  padding:    0;
  overflow-y: auto;
  flex:       1;
  display:    none; /* hidden on mobile by default */
}

.reports__roster--open {
  display: block;
}

@media (min-width: 768px) {
  .reports__roster {
    display: block;
  }
}

.reports__roster-item {
  padding:       12px 16px;
  font-size:     0.95rem;
  color:         var(--text);
  cursor:        pointer;
  border-left:   3px solid transparent;
  border-bottom: 1px solid var(--bg-secondary);
  transition:    background 0.15s, border-color 0.15s;
}

.reports__roster-item:hover {
  background: var(--bg-secondary);
}

.reports__roster-item--active {
  background:   var(--primary-light);
  border-left:  3px solid var(--primary);
  font-weight:  600;
  color:        var(--primary-dark);
}

.reports__roster-empty {
  padding:   16px;
  font-size: 0.9rem;
  color:     var(--text-secondary);
  font-style: italic;
}

.reports__overview-btn {
  margin:      auto 16px 16px;
  padding:     10px;
  background:  transparent;
  border:      1px solid var(--border);
  border-radius: var(--radius-md);
  color:       var(--text-secondary);
  font-weight: 600;
  font-size:   0.9rem;
  cursor:      pointer;
  transition:  all 0.15s;
}

.reports__overview-btn:hover {
  background: var(--bg-secondary);
  color:      var(--text);
}

.reports__overview-btn--active {
  background:   var(--primary-light);
  color:        var(--primary-dark);
  border-color: var(--primary);
}

/* ── Main Panel ──────────────────────────────────────────────────── */
.reports__main {
  flex:           1;
  display:        flex;
  flex-direction: column;
  overflow-y:     auto;
  position:       relative;
  background:     var(--bg-secondary);
}

.reports__placeholder {
  display:         flex;
  align-items:     center;
  justify-content: center;
  flex:            1;
  padding:         32px;
  color:           var(--text-secondary);
  text-align:      center;
  font-size:       1.05rem;
  line-height:     1.5;
}

/* ── Dossier Header ──────────────────────────────────────────────── */
.reports__dossier-header {
  background:    var(--surface);
  padding:       24px 24px 16px;
  border-bottom: 1px solid var(--border);
}

.reports__dossier-name {
  margin:      0 0 16px 0;
  font-size:   1.75rem;
  font-weight: 800;
  color:       var(--text);
  letter-spacing: -0.5px;
}

.reports__period-row {
  display:       flex;
  background:    var(--bg-secondary);
  border-radius: var(--radius-sm);
  padding:       4px;
  gap:           4px;
  overflow-x:    auto;
  scrollbar-width: none;
}
.reports__period-row::-webkit-scrollbar { display: none; }

.reports__period-btn {
  flex:          1;
  background:    transparent;
  border:        none;
  padding:       8px 12px;
  font-size:     0.85rem;
  font-weight:   600;
  color:         var(--text-secondary);
  border-radius: calc(var(--radius-sm) - 2px);
  cursor:        pointer;
  white-space:   nowrap;
  transition:    background 0.15s, color 0.15s;
}

.reports__period-btn:hover {
  background: rgba(0,0,0,0.05);
}

.reports__period-btn--active {
  background: var(--surface);
  color:      var(--text);
  box-shadow: var(--shadow-sm);
}

/* ── Dossier Stats Row ───────────────────────────────────────────── */
.reports__stats-row {
  display:               grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap:                   12px;
  padding:               16px 24px 0;
}

.reports__stat-card {
  background:    var(--surface);
  border-radius: var(--radius-md);
  padding:       16px;
  box-shadow:    var(--shadow-sm);
  display:       flex;
  flex-direction: column;
  align-items:   flex-start;
  gap:           4px;
}

.reports__stat-value {
  font-size:   1.5rem;
  font-weight: 800;
  color:       var(--primary);
  line-height: 1;
}

.reports__stat-label {
  font-size:   0.85rem;
  font-weight: 600;
  color:       var(--text);
  margin-top:  4px;
}

.reports__stat-sub {
  font-size: 0.75rem;
  color:     var(--text-secondary);
}

/* ── Note Feed ───────────────────────────────────────────────────── */
.reports__note-feed {
  list-style: none;
  margin:     0;
  padding:    0;
  display:    flex;
  flex-direction: column;
  gap:        16px;
}

.reports__note-item {
  background:    var(--bg-secondary);
  border-radius: var(--radius-md);
  padding:       16px;
}

.reports__note-meta {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  margin-bottom:   8px;
  font-size:       0.85rem;
}

.reports__note-time {
  color:       var(--text-secondary);
  font-weight: 500;
}

.reports__note-code {
  font-weight: 600;
  color:       var(--text);
  background:  var(--surface);
  padding:     4px 8px;
  border-radius: var(--radius-sm);
  border:      1px solid var(--border);
}

.reports__note-text {
  margin:      0;
  font-size:   0.95rem;
  line-height: 1.5;
  color:       var(--text);
  white-space: pre-wrap;
}

.reports__general-note {
  font-size:   0.95rem;
  line-height: 1.6;
  color:       var(--text);
  white-space: pre-wrap;
  background:  var(--bg-secondary);
  padding:     16px;
  border-radius: var(--radius-md);
  margin:      0;
}

/* ── Existing Classes (Tabs, Filters, Cards, Tables, Dialog) ─────── */
.reports__tabs {
  display:       flex;
  overflow-x:    auto;
  background:    var(--surface);
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
  font-size:   0.85rem;
  font-weight: 600;
  color:       var(--text-secondary);
  cursor:      pointer;
  min-height:  48px;
  border-bottom: 2px solid transparent;
  transition:  color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.reports__tab:hover {
  color: var(--text);
}

.reports__tab--active {
  color:         var(--primary);
  border-bottom: 2px solid var(--primary);
}

/* ── Date filter bar ─────────────────────────────────────────────── */
.reports__filter {
  display:      flex;
  align-items:  flex-end;
  gap:          12px;
  padding:      16px 24px;
  background:   var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink:  0;
  flex-wrap:    wrap;
}

.reports__filter-label {
  display:        flex;
  flex-direction: column;
  gap:            6px;
  font-size:      0.82rem;
  font-weight:    600;
  color:          var(--text-secondary);
}

/* ── Panel & Cards ───────────────────────────────────────────────── */
.reports__panel {
  flex:       1;
  padding:    24px;
  display:    flex;
  flex-direction: column;
  gap:        20px;
}

.reports__card {
  background:    var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-sm);
  padding:       24px;
  display:       flex;
  flex-direction: column;
  gap:           16px;
  margin:        0 24px 20px;
}

.reports__panel .reports__card {
  margin: 0;
}

.reports__card-title {
  font-size:   1.1rem;
  font-weight: 700;
  color:       var(--text);
  margin:      0;
}

.reports__hint {
  font-size:   0.85rem;
  color:       var(--text-secondary);
  line-height: 1.5;
  margin:      0;
}

.reports__no-data {
  color:      var(--text-secondary);
  font-size:  0.9rem;
  font-style: italic;
  padding:    12px 0;
}

.reports__msg {
  font-size:   0.9rem;
  font-weight: 500;
  color:       var(--state-success);
  margin:      0;
}

/* ── Inputs & Buttons ────────────────────────────────────────────── */
.reports__input {
  padding:       10px 12px;
  border:        1px solid var(--border);
  border-radius: var(--radius-sm);
  background:    var(--bg-secondary);
  font-size:     0.9rem;
  color:         var(--text);
  font-family:   inherit;
  height:        42px;
  box-sizing:    border-box;
}

.reports__input:focus {
  outline:      none;
  border-color: var(--primary);
  background:   var(--surface);
}

.reports__btn-run {
  padding:       0 18px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--primary);
  color:         white;
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  height:        42px;
}

.reports__btn-ghost {
  padding:       0 14px;
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  background:    transparent;
  color:         var(--text-secondary);
  font-size:     0.9rem;
  cursor:        pointer;
  height:        42px;
}

.reports__btn-primary {
  padding:       0 20px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--primary);
  color:         white;
  font-size:     0.95rem;
  font-weight:   600;
  cursor:        pointer;
  height:        48px;
  display:       inline-flex;
  align-items:   center;
  gap:           8px;
  align-self:    flex-start;
}

.reports__btn-danger {
  padding:       0 20px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--state-out);
  color:         #fff;
  font-size:     0.95rem;
  font-weight:   600;
  cursor:        pointer;
  height:        48px;
}

.reports__btn-export {
  align-self:    flex-start;
  padding:       0 18px;
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  background:    var(--bg-secondary);
  color:         var(--primary);
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  height:        42px;
}

/* ── Table ───────────────────────────────────────────────────────── */
.reports__table-wrap {
  overflow-x: auto;
  border:     1px solid var(--border);
  border-radius: var(--radius-md);
}

.reports__table {
  width:           100%;
  border-collapse: collapse;
  font-size:       0.85rem;
  color:           var(--text);
  text-align:      left;
}

.reports__table th {
  padding:       12px 16px;
  background:    var(--bg-secondary);
  font-weight:   600;
  color:         var(--text-secondary);
  border-bottom: 1px solid var(--border);
  white-space:   nowrap;
}

.reports__table td {
  padding:       12px 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.reports__table tr:last-child td {
  border-bottom: none;
}

.reports__table tr:hover td {
  background: rgba(0,0,0,0.02);
}

.reports__td-actions {
  text-align: right;
  width:      48px;
}

.reports__btn-delete {
  background: transparent;
  border:     none;
  color:      var(--text-secondary);
  font-size:  1.2rem;
  cursor:     pointer;
  width:      32px;
  height:     32px;
  border-radius: 4px;
  display:    flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.reports__btn-delete:hover {
  background: rgba(255, 59, 48, 0.1);
  color:      var(--state-out);
}

/* ── File upload ─────────────────────────────────────────────────── */
.reports__file-label {
  display:       flex;
  align-items:   center;
  gap:           12px;
  padding:       16px;
  border:        2px dashed var(--border);
  border-radius: var(--radius-md);
  cursor:        pointer;
  font-size:     0.95rem;
  color:         var(--primary);
  font-weight:   600;
  transition:    all 0.15s ease;
  background:    var(--bg-secondary);
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
  padding:   40px;
  text-align: center;
  color:     var(--text-secondary);
  font-weight: 500;
  font-size: 0.95rem;
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}

.reports__dialog-box {
  position:       relative;
  z-index:        1;
  background:     var(--surface);
  border-radius:  var(--radius-lg);
  box-shadow:     var(--shadow-md);
  padding:        24px;
  max-width:      400px;
  width:          90%;
  display:        flex;
  flex-direction: column;
  gap:            16px;
}

.reports__dialog-title {
  margin:      0;
  font-size:   1.2rem;
  font-weight: 700;
  color:       var(--text);
}

.reports__dialog-body {
  margin:      0;
  font-size:   0.95rem;
  color:       var(--text-secondary);
  line-height: 1.5;
}

.reports__dialog-list {
  margin:       0;
  padding-left: 20px;
  font-size:    0.95rem;
  color:        var(--text);
  line-height:  1.6;
}

.reports__dialog-warn {
  margin:      0;
  font-size:   0.9rem;
  color:       var(--state-out);
  font-weight: 600;
}

.reports__dialog-actions {
  display:   flex;
  gap:       12px;
  margin-top: 8px;
}

/* ── Print ───────────────────────────────────────────────────────── */
@media print {
  .reports__sidebar,
  .reports__tabs,
  .reports__filter,
  .reports__btn-run,
  .reports__btn-ghost,
  .reports__btn-export,
  .reports__btn-primary,
  .reports__btn-danger {
    display: none !important;
  }

  .reports__layout {
    display: block;
  }

  .reports__main {
    overflow: visible;
    background: white;
  }

  .reports__table {
    font-size: 10pt;
  }
}
</style>
