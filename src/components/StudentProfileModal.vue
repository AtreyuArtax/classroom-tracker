<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="spm-overlay"
      @click.self="close"
      role="dialog"
      aria-modal="true"
      :aria-label="`Profile — ${studentName}`"
    >
      <div class="spm-card">

        <!-- ── Header ──────────────────────────────────────────────── -->
        <div class="spm-header">
          <h2 class="spm-title">{{ studentName }}</h2>
          <button class="spm-close" aria-label="Close profile" @click="close"><X :size="18" /></button>
        </div>

        <!-- ── Body (scrollable) ───────────────────────────────────── -->
        <div class="spm-body">

          <!-- General Notes -->
          <section class="spm-section">
            <h3 class="spm-section-title">General Notes</h3>
            <textarea
              v-model="localNote"
              class="spm-textarea"
              placeholder="Notes about this student (seating needs, context, etc.)"
              rows="4"
              @blur="saveNote"
            ></textarea>
          </section>

          <!-- Event Feed -->
          <section class="spm-section">
            <h3 class="spm-section-title">
              History
              <span class="spm-section-count">({{ events.length }})</span>
            </h3>

            <div v-if="loadingEvents" class="spm-loading">Loading…</div>

            <div v-else-if="events.length === 0" class="spm-empty">
              No events recorded yet.
            </div>

            <ul v-else class="spm-feed">
              <li v-for="evt in sortedEvents" :key="evt.eventId" class="spm-feed-item">
                <div class="spm-feed-content">
                  <div class="spm-feed-meta">
                    <span class="spm-feed-time">{{ formatTimestamp(evt.timestamp) }}</span>
                    <span class="spm-feed-code">
                      <component :is="codeInfo(evt.code).icon === '?' ? HelpCircle : resolveIcon(codeInfo(evt.code).icon)" :size="16" /> 
                      {{ codeInfo(evt.code).label }}
                      <span v-if="evt.duration != null" class="spm-feed-duration">
                        ({{ formatDuration(evt) }})
                      </span>
                    </span>
                  </div>
                  <p v-if="evt.note" class="spm-feed-note">{{ evt.note }}</p>
                </div>
                <div class="spm-feed-actions">
                  <button 
                    v-if="evt.duration != null || evt.code === 'w'"
                    class="spm-feed-delete spm-feed-edit" 
                    title="Edit duration" 
                    @click="onEditClick(evt)"
                  >
                    <Pencil :size="14" />
                  </button>
                  <button 
                    class="spm-feed-delete" 
                    title="Delete event" 
                    @click="onDeleteEvent(evt.eventId)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </li>
            </ul>
          </section>

        </div>

        <EditDurationModal
          v-model="editModalOpen"
          :initial-minutes="editInitialMinutes"
          @save="onEditSave"
        />

        <!-- ── Report Card Export ──────────────────────────────────── -->
        <div class="spm-footer">
          <button class="spm-copy-btn" @click="copyForReportCard">
            <template v-if="isCopied">
              <Check :size="16" /> Copied!
            </template>
            <template v-else>
              <ClipboardList :size="16" /> Copy for Report Card
            </template>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * StudentProfileModal.vue
 *
 * Quick-access modal opened from the radial 👤 Profile slot while teaching.
 * Distinct from StudentProfile.vue (which is an inline panel in Reports).
 *
 * CLAUDE.md §4 note: this component imports classService and eventService directly.
 * This follows the same permitted pattern as Reports.vue importing eventService
 * for backup/restore — low-frequency modal reads that have no composable wrapper.
 * The note save uses classService.updateStudentNote directly, then mirrors the
 * update into the useClassroom reactive students ref.
 */

import { ref, computed, watch } from 'vue'
import { X, ClipboardList, Check, HelpCircle, Trash2, Pencil } from 'lucide-vue-next'
import { resolveIcon } from '../utils/icons.js'
import * as classService  from '../db/classService.js'
import * as eventService  from '../db/eventService.js'
import { useClassroom }   from '../composables/useClassroom.js'
import { useUndo }        from '../composables/useUndo.js'
import EditDurationModal  from './EditDurationModal.vue'

const props = defineProps({
  studentId:  { type: String,  required: true },
  classId:    { type: String,  required: true },
  modelValue: { type: Boolean, required: true },
  /** Full behavior codes map { codeKey: {icon, label, ...} } — passed from Dashboard */
  behaviorCodesMap: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const { students, activeClass, syncLateActiveState } = useClassroom()
const { push: pushUndo } = useUndo()

// ─── derived student info ──────────────────────────────────────────────────────

const studentData = computed(() => students.value[props.studentId] ?? null)

const studentName = computed(() => {
  const s = studentData.value
  if (!s) return props.studentId
  return `${s.lastName}, ${s.firstName}`
})

// ─── general note ─────────────────────────────────────────────────────────────

const localNote = ref('')

// Sync localNote when modal opens or student changes
watch(
  [() => props.modelValue, () => props.studentId],
  ([open]) => {
    if (open) {
      localNote.value = studentData.value?.generalNote ?? ''
    }
  },
  { immediate: true }
)

async function saveNote() {
  if (!props.studentId || !props.classId) return
  const val = localNote.value
  try {
    await classService.updateStudentNote(props.classId, props.studentId, val)
    // Mirror into reactive ref immediately (CLAUDE.md §4 — no re-fetch)
    if (students.value[props.studentId]) {
      students.value[props.studentId].generalNote = val
    }
  } catch (err) {
    console.error('Failed to save general note:', err)
  }
}

// ─── event feed ───────────────────────────────────────────────────────────────

const events       = ref([])
const loadingEvents = ref(false)

// Load events when modal opens (immediate: true because v-if mounts component with modelValue already true)
watch(() => props.modelValue, async (open) => {
  if (!open) return
  loadingEvents.value = true
  try {
    events.value = await eventService.getEventsByStudent(props.studentId)
  } catch (err) {
    console.error('Failed to load events:', err)
    events.value = []
  } finally {
    loadingEvents.value = false
  }
}, { immediate: true })

const sortedEvents = computed(() =>
  [...events.value].sort((a, b) =>
    (b.timestamp ?? '').localeCompare(a.timestamp ?? '')
  )
)

async function onDeleteEvent(eventId) {
  if (!confirm('Delete this event? This cannot be undone.')) return
  try {
    await eventService.deleteEvent(eventId)
    // Re-fetch local feed
    events.value = await eventService.getEventsByStudent(props.studentId)
  } catch (err) {
    alert('Failed to delete event: ' + err.message)
  }
}

function codeInfo(code) {
  return props.behaviorCodesMap[code] ?? { icon: '?', label: code }
}

// ── event editing ─────────────────────────────────────────────────────────────

const editModalOpen      = ref(false)
const editInitialMinutes = ref(0)
const editTargetEvent    = ref(null)

function onEditClick(evt) {
  editTargetEvent.value = evt
  
  if (evt.code === 'l') {
    editInitialMinutes.value = evt.duration ?? 0
  } else {
    editInitialMinutes.value = Math.floor((evt.duration ?? 0) / 60000)
  }
  
  editModalOpen.value = true
}

async function onEditSave(newMinutes) {
  const evt = editTargetEvent.value
  if (!evt) return
  
  let newDuration = newMinutes
  const info = codeInfo(evt.code)
  
  if (info && info.type === 'toggle') {
     newDuration = newMinutes * 60 * 1000
  }

  const oldDuration = evt.duration
  
  try {
    await eventService.updateEvent(evt.eventId, { duration: newDuration })
    if (evt.code === 'l') {
       await syncLateActiveState(evt.classId, evt.studentId, oldDuration, newDuration, evt.timestamp)
    }
    
    pushUndo(async () => {
        await eventService.updateEvent(evt.eventId, { duration: oldDuration })
        if (evt.code === 'l') {
           await syncLateActiveState(evt.classId, evt.studentId, newDuration, oldDuration, evt.timestamp)
        }
        events.value = await eventService.getEventsByStudent(props.studentId)
    })
    
    events.value = await eventService.getEventsByStudent(props.studentId)
  } catch (err) {
    alert('Failed to update event: ' + err.message)
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(ts) {
  if (!ts) return ''
  const parseStr = ts.includes('Z') || ts.match(/[+-]\d{2}:\d{2}$/) ? ts : ts + 'Z'
  const d = new Date(parseStr)
  return d.toLocaleString('en-CA', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatDuration(evt) {
  if (evt.code === 'l') return `${evt.duration} min late`
  // Toggle (washroom): duration is milliseconds
  if (evt.duration >= 60000) {
    const m = Math.floor(evt.duration / 60000)
    const s = Math.round((evt.duration % 60000) / 1000)
    return `${m}m ${String(s).padStart(2, '0')}s`
  }
  const s = Math.round((evt.duration ?? 0) / 1000)
  return `${s}s`
}

// ─── report card copy ─────────────────────────────────────────────────────────

const isCopied    = ref(false)
let   copyTimeout = null

async function copyForReportCard() {
  const s          = studentData.value
  const name       = studentName.value
  const className  = activeClass.value?.name ?? ''

  const absences = events.value.filter(e => e.code === 'a').length
  const lates    = events.value.filter(e => e.code === 'l').length
  const lateMins = events.value
    .filter(e => e.code === 'l' && e.duration != null)
    .map(e => e.duration)
  const avgLate = lateMins.length
    ? (lateMins.reduce((a, b) => a + b, 0) / lateMins.length).toFixed(1)
    : '0'

  const generalNoteText = (s?.generalNote ?? '').trim() || 'None recorded.'

  const historyLines = sortedEvents.value.map(evt => {
    const info = codeInfo(evt.code)
    const dur  = evt.duration != null ? ` (${formatDuration(evt)})` : ''
    const note = evt.note ? `: ${evt.note}` : ''
    return `[${formatTimestamp(evt.timestamp)}] ${info.icon} ${info.label}${dur}${note}`
  })

  const text = [
    `${name} — ${className}`,
    '',
    'ATTENDANCE',
    `Absences: ${absences}  |  Lates: ${lates}  |  Avg. minutes late: ${avgLate} min`,
    '',
    'GENERAL NOTES',
    generalNoteText,
    '',
    'EVENT HISTORY',
    ...(historyLines.length ? historyLines : ['No events recorded.']),
  ].join('\n')

  try {
    await navigator.clipboard.writeText(text)
    isCopied.value = true
    clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => { isCopied.value = false }, 1500)
  } catch (err) {
    console.error('Clipboard write failed:', err)
  }
}

// ─── close ────────────────────────────────────────────────────────────────────

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* ── Overlay ──────────────────────────────────────────────────────── */
.spm-overlay {
  position:        fixed;
  inset:           0;
  display:         flex;
  align-items:     center;
  justify-content: center;
  background:      rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  z-index:         1050;
  animation:       spm-fade-in 0.18s ease;
}

@keyframes spm-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Card ─────────────────────────────────────────────────────────── */
.spm-card {
  background:     var(--surface);
  border-radius:  var(--radius-lg);
  box-shadow:     var(--shadow-md);
  width:          min(720px, 90vw);
  max-height:     88vh;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
  animation:      spm-pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes spm-pop-in {
  from { transform: scale(0.92); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* ── Header ──────────────────────────────────────────────────────── */
.spm-header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         16px 20px;
  border-bottom:   1px solid var(--border);
  flex-shrink:     0;
}

.spm-title {
  font-size:   1.1rem;
  font-weight: 700;
  color:       var(--text);
  margin:      0;
}

.spm-close {
  width:         40px;
  height:        40px;
  border:        none;
  background:    var(--bg-secondary);
  border-radius: 50%;
  font-size:     1rem;
  cursor:        pointer;
  display:       flex;
  align-items:   center;
  justify-content: center;
  color:         var(--text-secondary);
  transition:    background 0.15s ease;
  flex-shrink:   0;
}

.spm-close:hover { background: var(--border); }

/* ── Body ───────────────────────────────────────────────────────── */
.spm-body {
  flex:       1;
  overflow-y: auto;
  padding:    16px 20px;
  display:    flex;
  flex-direction: column;
  gap:        20px;
}

/* ── Sections ────────────────────────────────────────────────────── */
.spm-section { display: flex; flex-direction: column; gap: 8px; }

.spm-section-title {
  font-size:      0.75rem;
  font-weight:    700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color:          var(--text-secondary);
  margin:         0;
  display:        flex;
  align-items:    center;
  gap:            6px;
}

.spm-section-count {
  font-weight: 500;
}

/* ── General note textarea ───────────────────────────────────────── */
.spm-textarea {
  width:         100%;
  padding:       12px;
  border:        1px solid var(--border);
  border-radius: var(--radius-sm);
  background:    var(--bg-secondary);
  font-size:     0.88rem;
  color:         var(--text);
  resize:        vertical;
  font-family:   inherit;
  line-height:   1.5;
  box-sizing:    border-box;
  min-height:    80px;
  transition:    border-color 0.15s ease;
}

.spm-textarea:focus {
  outline:      none;
  border-color: var(--primary);
}

/* ── Feed ────────────────────────────────────────────────────────── */
.spm-loading,
.spm-empty {
  color:     var(--text-secondary);
  font-size: 0.85rem;
  padding:   8px 0;
}

.spm-feed {
  list-style: none;
  margin:     0;
  padding:    0;
  display:    flex;
  flex-direction: column;
  gap:        1px;
}

.spm-feed-item {
  padding:       10px 0;
  border-bottom: 1px solid var(--border);
  display:       flex;
  align-items:   flex-start;
  justify-content: space-between;
  gap:           12px;
}

.spm-feed-item:last-child { border-bottom: none; }

.spm-feed-actions {
  display: flex;
  gap: 4px;
}

.spm-feed-delete {
  background: transparent;
  border:     none;
  color:      var(--text-secondary);
  cursor:     pointer;
  padding:    6px;
  border-radius: 4px;
  display:    flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  margin-top: -2px;
  opacity:    0.4;
}

.spm-feed-edit:hover {
  background: rgba(70, 99, 172, 0.1);
  color:      var(--primary);
  opacity:    1;
}

.spm-feed-delete:hover {
  background: rgba(255, 59, 48, 0.1);
  color:      #ff3b30;
  opacity:    1;
}

.spm-feed-meta {
  display:     flex;
  align-items: baseline;
  gap:         10px;
  flex-wrap:   wrap;
}

.spm-feed-time {
  font-size:  0.75rem;
  color:      var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.spm-feed-code {
  font-size:   0.85rem;
  font-weight: 600;
  color:       var(--text);
}

.spm-feed-duration {
  font-size:   0.78rem;
  font-weight: 400;
  color:       var(--text-secondary);
}

.spm-feed-note {
  margin:    4px 0 0;
  font-size: 0.8rem;
  color:     var(--text-secondary);
  line-height: 1.4;
}

/* ── Footer ──────────────────────────────────────────────────────── */
.spm-footer {
  padding:       12px 20px;
  border-top:    1px solid var(--border);
  flex-shrink:   0;
}

.spm-copy-btn {
  width:         100%;
  padding:       12px;
  border:        1px solid var(--border);
  border-radius: var(--radius-md);
  background:    var(--bg-secondary);
  color:         var(--text);
  font-size:     0.9rem;
  font-weight:   600;
  cursor:        pointer;
  transition:    background 0.15s ease, color 0.15s ease;
  min-height:    44px;
}

.spm-copy-btn:hover {
  background: var(--primary-light);
  color:      var(--primary);
}
</style>
