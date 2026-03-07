<template>
  <div class="setup">

    <!-- ── Page tabs ─────────────────────────────────────────────── -->
    <div class="setup__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="setup__tab"
        :class="{ 'setup__tab--active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- TAB A: Classes                                           -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="activeTab === 'classes'" class="setup__panel">

      <!-- Class list -->
      <div class="setup__card">
        <h2 class="setup__card-title">Your Classes</h2>
        <div v-if="classList.length === 0" class="setup__empty">No classes yet.</div>
        <ul class="setup__class-list">
          <li
            v-for="cls in classList"
            :key="cls.classId"
            class="setup__class-item"
            :class="{ 'setup__class-item--active': cls.classId === activeClass?.classId }"
          >
            <div>
              <!-- Editable name for active class, static text for others -->
              <input
                v-if="cls.classId === activeClass?.classId"
                type="text"
                :value="cls.name"
                class="setup__class-name setup__class-name--edit"
                :aria-label="`Rename class ${cls.name}`"
                @change="e => updateActiveClass({ name: e.target.value.trim() || cls.name })"
                @keydown.enter.prevent="e => e.target.blur()"
              />
              <div v-else class="setup__class-name">{{ cls.name }}</div>
            <div class="setup__class-meta-group">
              <div class="setup__class-meta">Period {{ cls.periodNumber }} · {{ studentCount(cls) }} students</div>
              <div v-if="cls.classId === activeClass?.classId" class="setup__class-settings">
                <label class="setup__label setup__label--inline">
                  Start Time
                  <input
                    type="time"
                    :value="cls.periodStartTime || '08:45'"
                    class="setup__input setup__input--sm"
                    @change="e => updateActiveClass({ periodStartTime: e.target.value })"
                  />
                </label>
              </div>
            </div>
          </div>
            <div class="setup__class-actions">
              <button class="setup__pill-btn" @click="switchToClass(cls.classId)">
                {{ cls.classId === activeClass?.classId ? 'Active' : 'Switch' }}
              </button>
              <button
                class="setup__pill-btn setup__pill-btn--danger"
                :disabled="cls.classId === activeClass?.classId && classList.length === 1"
                :title="cls.classId === activeClass?.classId ? 'Switch to another class first, or archive as sole class' : 'Archive class'"
                @click="onArchiveClass(cls.classId)"
              >
                Archive
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Archived Classes -->
      <div v-if="archivedClasses.length > 0" class="setup__card setup__card--archived">
        <button class="setup__archived-toggle" @click="showArchived = !showArchived">
          <span>📦 Archived ({{ archivedClasses.length }})</span>
          <span class="setup__archived-chevron">{{ showArchived ? '▲' : '▼' }}</span>
        </button>
        <ul v-if="showArchived" class="setup__class-list setup__archived-list">
          <li v-for="cls in archivedClasses" :key="cls.classId" class="setup__class-item setup__class-item--archived">
            <div>
              <div class="setup__class-name">{{ cls.name }}</div>
              <div class="setup__class-meta">Period {{ cls.periodNumber }} · {{ studentCount(cls) }} students</div>
            </div>
            <div class="setup__class-actions">
              <button class="setup__pill-btn" @click="onRestoreClass(cls.classId)">Restore</button>
              <button class="setup__pill-btn setup__pill-btn--danger" @click="onDeleteClass(cls.classId)">Delete</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Create new class -->
      <div class="setup__card">
        <h2 class="setup__card-title">Create New Class</h2>
        <form class="setup__form" @submit.prevent="createNewClass">
          <label class="setup__label">
            Class name
            <input v-model="newClass.name" class="setup__input" placeholder="e.g. Period 1 — Science" required />
          </label>
          <label class="setup__label">
            Period number
            <input v-model.number="newClass.periodNumber" type="number" min="1" max="10" class="setup__input" required />
          </label>
          <label class="setup__label">
            Period start time
            <input v-model="newClass.periodStartTime" type="time" class="setup__input" required />
          </label>
          <button type="submit" class="setup__btn-primary">Create Class</button>
        </form>
        <p v-if="classError" class="setup__error">{{ classError }}</p>
      </div>

      <!-- Grid resize -->
      <div class="setup__card">
        <h2 class="setup__card-title">Grid Size</h2>
        <p class="setup__hint">Current: {{ gridSize.rows }} rows × {{ gridSize.cols }} columns</p>
        <form class="setup__form" @submit.prevent="requestResize">
          <label class="setup__label">
            Rows (1–10)
            <input v-model.number="newGrid.rows" type="number" min="1" max="10" class="setup__input" required />
          </label>
          <label class="setup__label">
            Columns (1–10)
            <input v-model.number="newGrid.cols" type="number" min="1" max="10" class="setup__input" required />
          </label>
          <button type="submit" class="setup__btn-primary">Apply Grid Size</button>
        </form>

        <!-- Resize conflict dialog (§11) -->
        <div v-if="resizeConflict.length > 0" class="setup__dialog" role="dialog" aria-modal="true">
          <div class="setup__dialog-box">
            <h3 class="setup__dialog-title">⚠️ Students will be moved</h3>
            <p class="setup__dialog-body">The following seated students fall outside the new grid bounds and will be moved to the roster pool:</p>
            <ul class="setup__dialog-list">
              <li v-for="s in resizeConflict" :key="s.studentId">
                {{ s.firstName }} {{ s.lastName }} (seat {{ s.seat.row }},{{ s.seat.col }})
              </li>
            </ul>
            <div class="setup__dialog-actions">
              <button class="setup__btn-danger" @click="applyResize">Move to pool &amp; resize</button>
              <button class="setup__btn-ghost" @click="resizeConflict = []">Cancel</button>
            </div>
          </div>
          <div class="setup__dialog-backdrop" @click="resizeConflict = []" />
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- TAB B: Roster                                            -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'roster'" class="setup__panel">

      <div class="setup__card">
        <h2 class="setup__card-title">Import Roster — {{ activeClass?.name ?? 'No class selected' }}</h2>
        <p class="setup__hint">
          Required CSV columns: <code>Student ID</code>, <code>First Name</code>, <code>Last Name</code>.
          Column order is flexible. Rows without a Student ID are skipped.
        </p>

        <label class="setup__file-label" for="roster-file">
          <span aria-hidden="true">📂</span> Choose CSV file
          <input
            id="roster-file"
            type="file"
            accept=".csv,text/csv"
            class="setup__file-input"
            :disabled="!activeClass"
            @change="onFileSelected"
          />
        </label>

        <!-- Import result summary -->
        <div v-if="importResult" class="setup__import-result">
          <p v-if="importResult.inserted" class="setup__result-ok">✅ {{ importResult.inserted }} students added.</p>
          <p v-if="importResult.updated"  class="setup__result-ok">🔄 {{ importResult.updated }} students updated.</p>
          <div v-if="importResult.skipped.length" class="setup__result-warn">
            <strong>⚠️ Skipped (missing Student ID):</strong>
            <ul>
              <li v-for="(row, i) in importResult.skipped" :key="i">Row {{ i + 2 }}</li>
            </ul>
          </div>
        </div>

        <!-- Cross-class conflicts -->
        <div v-if="crossClassConflicts.length > 0" class="setup__dialog" role="dialog" aria-modal="true">
          <div class="setup__dialog-box">
            <h3 class="setup__dialog-title">Student ID Conflict</h3>
            <p class="setup__dialog-body">The following Student IDs already exist in another class. What would you like to do?</p>
            <ul class="setup__dialog-list">
              <li v-for="c in crossClassConflicts" :key="c.studentId">
                <strong>{{ c.student.firstName }} {{ c.student.lastName }}</strong>
                ({{ c.studentId }}) — currently in <em>{{ classNameById(c.existingClassId) }}</em>
              </li>
            </ul>
            <div class="setup__dialog-actions">
              <button class="setup__btn-primary" @click="resolveConflicts('move')">Move to this class</button>
              <button class="setup__btn-ghost"   @click="resolveConflicts('skip')">Skip these students</button>
            </div>
          </div>
          <div class="setup__dialog-backdrop" />
        </div>
      </div>

      <!-- Current roster -->
      <div class="setup__card">
        <h2 class="setup__card-title">Current Roster</h2>
        <p class="setup__hint">{{ sortedRoster.length }} students · {{ unseatedStudents.length }} unassigned</p>
        <ul class="setup__roster-list">
          <li
            v-for="s in sortedRoster"
            :key="s.studentId"
            class="setup__roster-item"
          >
            <div>
              <span class="setup__roster-name">{{ s.lastName }}, {{ s.firstName }}</span>
              <span class="setup__roster-id">{{ s.studentId }}</span>
            </div>
            <span class="setup__seat-badge" :class="s.seat ? 'setup__seat-badge--seated' : 'setup__seat-badge--pool'">
              {{ s.seat ? `R${s.seat.row} C${s.seat.col}` : 'Pool' }}
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- TAB C: Behavior Codes                                    -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'codes'" class="setup__panel">

      <div class="setup__card">
        <h2 class="setup__card-title">Behavior Codes</h2>

        <ul class="setup__code-list">
          <li v-for="code in behaviorCodes" :key="code.codeKey" class="setup__code-item">
            <span class="setup__code-icon">{{ code.icon }}</span>
            <div class="setup__code-info">
              <span class="setup__code-key">{{ code.codeKey }}</span>
              <span class="setup__code-label">{{ code.label }}</span>
              <span class="setup__code-meta">{{ code.category }} · {{ code.type }}</span>
              <span v-if="code.requiresNote" class="setup__code-note-badge">📝 Note required</span>
            </div>
            <button class="setup__icon-btn" aria-label="Delete {{ code.label }}" @click="deleteCode(code.codeKey)">🗑</button>
          </li>
        </ul>
      </div>

      <!-- Add / edit code form -->
      <div class="setup__card">
        <h2 class="setup__card-title">Add Behavior Code</h2>
        <form class="setup__form" @submit.prevent="saveCode">
          <label class="setup__label">
            Key (single letter)
            <input v-model="newCode.codeKey" class="setup__input" maxlength="4" placeholder="e.g. p" required />
          </label>
          <label class="setup__label">
            Icon (emoji)
            <input v-model="newCode.icon" class="setup__input" maxlength="4" placeholder="✋" required />
          </label>
          <label class="setup__label">
            Label
            <input v-model="newCode.label" class="setup__input" placeholder="Participation" required />
          </label>
          <label class="setup__label">
            Category
            <select v-model="newCode.category" class="setup__input">
              <option value="positive">positive</option>
              <option value="redirect">redirect</option>
              <option value="neutral">neutral</option>
            </select>
          </label>
          <label class="setup__label">
            Type
            <select v-model="newCode.type" class="setup__input">
              <option value="standard">standard</option>
              <option value="toggle">toggle</option>
            </select>
          </label>
          <label class="setup__label setup__label--checkbox">
            <input type="checkbox" v-model="newCode.requiresNote" class="setup__checkbox" />
            Requires a note when tapped
          </label>
          <button type="submit" class="setup__btn-primary">Save Code</button>
        </form>
      </div>
    </section>

  </div>
</template>

<script setup>
/**
 * Setup.vue — View B: Seat Assignment + Behavior Code Editor
 *
 * CLAUDE.md §6  — papaparse for ALL CSV parsing (no split)
 * CLAUDE.md §11 — grid resize with conflict guard
 * CLAUDE.md §4  — no src/db/ imports; all via composables + settingsService
 *                 (settingsService is the ONE allowed import for code CRUD)
 *
 * NOTE: settingsService is imported here only for saveBehaviorCode /
 * deleteBehaviorCode — these write settings directly and then call
 * reloadBehaviorCodes() to keep the reactive ref in sync.
 */

import { ref, reactive, computed } from 'vue'
import Papa from 'papaparse'
import { useClassroom }      from '../composables/useClassroom.js'
import * as settingsService  from '../db/settingsService.js'

const {
  classList,
  archivedClasses,
  activeClass,
  students,
  behaviorCodes,
  gridSize,
  sortedRoster,
  unseatedStudents,
  switchClass,
  createClass,
  importRoster,
  moveStudentFromClass,
  checkResize,
  confirmResize,
  updateActiveClass,
  archiveClass,
  restoreClass,
  deleteClass,
  reloadBehaviorCodes,
} = useClassroom()

const showArchived = ref(false)

async function onArchiveClass(classId) {
  await archiveClass(classId)
}

async function onRestoreClass(classId) {
  await restoreClass(classId)
}

async function onDeleteClass(classId) {
  const cls = archivedClasses.value.find(c => c.classId === classId)
  const name = cls?.name ?? 'this class'
  if (!window.confirm(`Permanently delete "${name}"? This cannot be undone. Event history will be retained.`)) return
  await deleteClass(classId)
}

const emit = defineEmits(['navigate'])

// ─── tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { id: 'classes', label: 'Classes' },
  { id: 'roster',  label: 'Roster'  },
  { id: 'codes',   label: 'Behavior Codes' },
]
const activeTab = ref('classes')

// ─── class management ─────────────────────────────────────────────────────────

const newClass  = reactive({ name: '', periodNumber: 1, periodStartTime: '08:45' })
const classError = ref('')

function studentCount(cls) {
  return Object.keys(cls?.students ?? {}).length
}

async function switchToClass(classId) {
  await switchClass(classId)
}

async function createNewClass() {
  classError.value = ''
  if (!newClass.name.trim()) { classError.value = 'Name is required.'; return }
  const classId = `class_${Date.now()}`
  await createClass({
    classId: classId,
    name: newClass.name.trim(),
    periodNumber: newClass.periodNumber,
    periodStartTime: newClass.periodStartTime
  })
  newClass.name = ''
  newClass.periodNumber = 1
  newClass.periodStartTime = '08:45'
}

// ─── grid resize (§11) ────────────────────────────────────────────────────────

const newGrid        = reactive({ rows: 6, cols: 6 })
const resizeConflict = ref([])
let   pendingGridSize = null

function requestResize() {
  pendingGridSize = { rows: newGrid.rows, cols: newGrid.cols }
  const { affected } = checkResize(pendingGridSize)
  if (affected.length > 0) {
    resizeConflict.value = affected
  } else {
    applyResize()
  }
}

async function applyResize() {
  await confirmResize(pendingGridSize)
  resizeConflict.value = []
}

// ─── roster import — papaparse (§6) ──────────────────────────────────────────

const importResult        = ref(null)
const crossClassConflicts = ref([])
let   _pendingConflicts   = []

function onFileSelected(evt) {
  const file = evt.target.files?.[0]
  if (!file) return
  if (!activeClass.value) return

  // CLAUDE.md §6: Use papaparse — never split(',')
  Papa.parse(file, {
    header:         true,
    skipEmptyLines: true,
    complete: async (results) => {
      // Map header columns flexibly
      const rows = results.data.map(row => {
        // Support common header variants
        const studentId = row['Student ID'] ?? row['StudentID'] ?? row['student_id'] ?? ''
        const firstName = row['First Name'] ?? row['FirstName'] ?? row['first_name'] ?? ''
        const lastName  = row['Last Name']  ?? row['LastName']  ?? row['last_name']  ?? ''
        return { studentId: studentId.trim(), firstName: firstName.trim(), lastName: lastName.trim() }
      })

      const result = await importRoster(rows)
      importResult.value = result

      if (result.crossClassConflicts.length > 0) {
        _pendingConflicts       = result.crossClassConflicts
        crossClassConflicts.value = result.crossClassConflicts
      }
    },
    error: (err) => {
      importResult.value = { error: err.message, inserted: 0, updated: 0, skipped: [], crossClassConflicts: [] }
    },
  })

  // Reset file input so the same file can be re-selected
  evt.target.value = ''
}

async function resolveConflicts(action) {
  if (action === 'move') {
    for (const conflict of _pendingConflicts) {
      await moveStudentFromClass(conflict.existingClassId, conflict.student)
    }
  }
  crossClassConflicts.value = []
  _pendingConflicts = []
}

function classNameById(classId) {
  return classList.value.find(c => c.classId === classId)?.name ?? classId
}

// ─── behavior code CRUD ───────────────────────────────────────────────────────

const newCode = reactive({ codeKey: '', icon: '', label: '', category: 'positive', type: 'standard', requiresNote: false })

async function saveCode() {
  await settingsService.saveBehaviorCode({ ...newCode })
  await reloadBehaviorCodes()
  Object.assign(newCode, { codeKey: '', icon: '', label: '', category: 'positive', type: 'standard', requiresNote: false })
}

async function deleteCode(codeKey) {
  await settingsService.deleteBehaviorCode(codeKey)
  await reloadBehaviorCodes()
}
</script>

<style scoped>
.setup {
  flex:           1;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
}

/* ── Tab strip ───────────────────────────────────────────────────── */
.setup__tabs {
  display:          flex;
  background:       var(--surface);
  box-shadow:       var(--shadow-sm);
  border-bottom:    1px solid var(--border);
  flex-shrink:      0;
}

.setup__tab {
  flex:        1;
  padding:     12px 8px;
  border:      none;
  background:  transparent;
  font-size:   0.85rem;
  font-weight: 500;
  color:       var(--text-secondary);
  cursor:      pointer;
  min-height:  44px;
  border-bottom: 2px solid transparent;
  transition:  color 0.15s ease, border-color 0.15s ease;
}

.setup__tab--active {
  color:         var(--primary);
  font-weight:   700;
  border-bottom: 2px solid var(--primary);
}

/* ── Panel ───────────────────────────────────────────────────────── */
.setup__panel {
  flex:       1;
  overflow-y: auto;
  padding:    16px;
  display:    flex;
  flex-direction: column;
  gap:        16px;
}

/* ── Cards ───────────────────────────────────────────────────────── */
.setup__card {
  background:    var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-sm);
  padding:       16px;
  display:       flex;
  flex-direction: column;
  gap:           12px;
}

.setup__card-title {
  font-size:   1rem;
  font-weight: 700;
  color:       var(--text);
}

.setup__hint {
  font-size: 0.82rem;
  color:     var(--text-secondary);
  line-height: 1.5;
}

.setup__hint code {
  background:    var(--bg-secondary);
  padding:       1px 5px;
  border-radius: var(--radius-sm);
  font-size:     0.8rem;
}

.setup__empty {
  color:     var(--text-secondary);
  font-size: 0.9rem;
}

/* ── Class list ──────────────────────────────────────────────────── */
.setup__class-list {
  list-style: none;
  display:    flex;
  flex-direction: column;
  gap:        8px;
}

.setup__class-item {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         12px;
  border-radius:   var(--radius-md);
  background:      var(--bg-secondary);
  gap:             12px;
  min-height:      52px;
}

.setup__class-item--active {
  background: var(--primary-light);
}

.setup__class-name {
  font-size:   0.9rem;
  font-weight: 600;
  color:       var(--text);
}

/* Inline rename input — looks like text, gains border on focus */
.setup__class-name--edit {
  font-size:    0.9rem;
  font-weight:  600;
  color:        var(--text);
  background:   transparent;
  border:       none;
  border-bottom: 1px dashed var(--border);
  border-radius: 0;
  padding:      0;
  width:        100%;
  min-height:   auto;
  outline:      none;
  cursor:       text;
}

.setup__class-name--edit:hover {
  border-bottom-color: var(--primary);
}

.setup__class-name--edit:focus {
  border-bottom: 2px solid var(--primary);
}

.setup__class-meta {
  font-size: 0.75rem;
  color:     var(--text-secondary);
}

/* Actions group holding Switch + Archive buttons side by side */
.setup__class-actions {
  display:    flex;
  gap:        6px;
  flex-shrink: 0;
}

/* Danger (red) variant for Archive / Delete buttons */
.setup__pill-btn--danger {
  background:   rgba(255, 59, 48, 0.08);
  border-color: rgba(255, 59, 48, 0.3);
  color:        #ff3b30;
}

.setup__pill-btn--danger:hover:not(:disabled) {
  background:   rgba(255, 59, 48, 0.18);
  border-color: #ff3b30;
}

.setup__pill-btn--danger:disabled {
  opacity: 0.4;
  cursor:  not-allowed;
}

/* Archived section card */
.setup__card--archived {
  opacity: 0.9;
  border:  1px dashed var(--border);
}

.setup__archived-toggle {
  width:           100%;
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  background:      transparent;
  border:          none;
  font-size:       0.85rem;
  font-weight:     600;
  color:           var(--text-secondary);
  cursor:          pointer;
  padding:         4px 0;
}

.setup__archived-list {
  margin-top: 10px;
  opacity:    0.75;
}

.setup__class-item--archived {
  background: var(--bg-secondary);
  border:     1px dashed var(--border);
}

.setup__class-meta-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setup__class-settings {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup__label--inline {
  flex-direction: row !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 0.75rem !important;
}

.setup__input--sm {
  min-height: 32px !important;
  padding: 4px 8px !important;
  font-size: 0.8rem !important;
  width: auto !important;
}

/* ── Forms ───────────────────────────────────────────────────────── */
.setup__form {
  display:        flex;
  flex-direction: column;
  gap:            10px;
}

.setup__label {
  display:        flex;
  flex-direction: column;
  gap:            4px;
  font-size:      0.82rem;
  font-weight:    600;
  color:          var(--text-secondary);
}

.setup__input {
  padding:       10px 12px;
  border:        1px solid var(--border);
  border-radius: var(--radius-sm);
  background:    var(--bg-secondary);
  min-height:    44px;
  font-size:     0.9rem;
  color:         var(--text);
  transition:    border-color 0.15s ease;
}

.setup__input:focus {
  outline:      none;
  border-color: var(--primary);
}

/* ── Buttons ─────────────────────────────────────────────────────── */
.setup__btn-primary {
  padding:       12px 20px;
  border:        none;
  border-radius: var(--radius-md);
  background:    var(--primary);
  color:         #fff;
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    44px;
  transition:    opacity 0.15s ease;
}
.setup__btn-primary:active { opacity: 0.8; }

.setup__btn-danger {
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

.setup__btn-ghost {
  padding:       12px 20px;
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  background:    transparent;
  color:         var(--text-secondary);
  font-size:     0.9rem;
  cursor:        pointer;
  min-height:    44px;
}

.setup__pill-btn {
  padding:       6px 14px;
  border:        none;
  border-radius: var(--radius-sm);
  background:    var(--primary);
  color:         #fff;
  font-size:     0.78rem;
  font-weight:   600;
  cursor:        pointer;
  min-height:    36px;
  white-space:   nowrap;
  flex-shrink:   0;
}

.setup__icon-btn {
  border:     none;
  background: transparent;
  cursor:     pointer;
  font-size:  1.1rem;
  min-width:  44px;
  min-height: 44px;
  display:    flex;
  align-items: center;
  justify-content: center;
}

/* ── Error ───────────────────────────────────────────────────────── */
.setup__error {
  color:     var(--state-out);
  font-size: 0.82rem;
}

/* ── File upload ─────────────────────────────────────────────────── */
.setup__file-label {
  display:         flex;
  align-items:     center;
  gap:             8px;
  padding:         14px;
  border:          2px dashed var(--border);
  border-radius:   var(--radius-md);
  cursor:          pointer;
  font-size:       0.9rem;
  color:           var(--primary);
  font-weight:     600;
  min-height:      52px;
  transition:      border-color 0.15s ease, background 0.15s ease;
}
.setup__file-label:hover {
  background:    var(--primary-light);
  border-color:  var(--primary);
}

.setup__file-input {
  position: absolute;
  opacity:  0;
  width:    0;
  height:   0;
}

/* ── Import result ───────────────────────────────────────────────── */
.setup__import-result {
  padding:       12px;
  border-radius: var(--radius-md);
  background:    var(--bg-secondary);
  font-size:     0.85rem;
  display:       flex;
  flex-direction: column;
  gap:           6px;
}

.setup__result-ok   { color: var(--state-success); font-weight: 600; }
.setup__result-warn { color: var(--text-secondary); }

/* ── Roster list ─────────────────────────────────────────────────── */
.setup__roster-list {
  list-style: none;
  display:    flex;
  flex-direction: column;
  gap:        6px;
  max-height: 320px;
  overflow-y: auto;
}

.setup__roster-item {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         10px 12px;
  border-radius:   var(--radius-sm);
  background:      var(--bg-secondary);
  gap:             12px;
}

.setup__roster-name {
  font-size:   0.88rem;
  font-weight: 600;
  color:       var(--text);
}

.setup__roster-id {
  display:    block;
  font-size:  0.72rem;
  color:      var(--text-secondary);
}

.setup__seat-badge {
  padding:       3px 9px;
  border-radius: var(--radius-sm);
  font-size:     0.72rem;
  font-weight:   600;
  flex-shrink:   0;
}

.setup__seat-badge--seated {
  background: var(--primary-light);
  color:      var(--primary);
}

.setup__seat-badge--pool {
  background: var(--bg-secondary);
  color:      var(--state-neutral);
}

/* ── Code list ───────────────────────────────────────────────────── */
.setup__code-list {
  list-style: none;
  display:    flex;
  flex-direction: column;
  gap:        8px;
}

.setup__code-item {
  display:     flex;
  align-items: center;
  gap:         12px;
  padding:     10px 12px;
  background:  var(--bg-secondary);
  border-radius: var(--radius-md);
  min-height:  52px;
}

.setup__code-icon {
  font-size:  1.5rem;
  flex-shrink: 0;
}

.setup__code-info {
  display:        flex;
  flex-direction: column;
  flex:           1;
  gap:            2px;
}

.setup__code-key {
  font-size:   0.78rem;
  font-weight: 700;
  color:       var(--primary);
  font-family: monospace;
}

.setup__code-label {
  font-size:   0.9rem;
  font-weight: 600;
  color:       var(--text);
}

.setup__code-meta {
  font-size: 0.72rem;
  color:     var(--text-secondary);
}

.setup__code-note-badge {
  font-size:     0.68rem;
  font-weight:   600;
  color:         var(--primary);
  background:    var(--primary-light);
  border-radius: var(--radius-sm);
  padding:       2px 6px;
  width:         fit-content;
}

/* Checkbox label row in Add Code form */
.setup__label--checkbox {
  flex-direction: row !important;
  align-items:    center !important;
  gap:            8px !important;
  font-size:      0.82rem !important;
  font-weight:    500 !important;
  color:          var(--text) !important;
  cursor:         pointer;
}

.setup__checkbox {
  width:  18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Dialog ──────────────────────────────────────────────────────── */
.setup__dialog {
  position: fixed;
  inset:    0;
  z-index:  900;
  display:  flex;
  align-items: center;
  justify-content: center;
}

.setup__dialog-backdrop {
  position: absolute;
  inset:    0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
}

.setup__dialog-box {
  position:      relative;
  z-index:       1;
  background:    var(--surface);
  border-radius: var(--radius-lg);
  box-shadow:    var(--shadow-md);
  padding:       24px;
  max-width:     360px;
  width:         90%;
  display:       flex;
  flex-direction: column;
  gap:           12px;
}

.setup__dialog-title {
  font-size:   1.05rem;
  font-weight: 700;
  color:       var(--text);
}

.setup__dialog-body {
  font-size:   0.88rem;
  color:       var(--text-secondary);
  line-height: 1.5;
}

.setup__dialog-list {
  padding-left: 16px;
  font-size:    0.85rem;
  color:        var(--text);
  display:      flex;
  flex-direction: column;
  gap:          4px;
}

.setup__dialog-actions {
  display:   flex;
  gap:       10px;
  flex-wrap: wrap;
  margin-top: 4px;
}
</style>
