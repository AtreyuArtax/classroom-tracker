<template>
  <!-- 1. An email was opened but not yet confirmed as sent -->
  <div v-if="pending" class="aqb aqb--pending" role="region" aria-label="Confirm email">
    <Mail :size="15" class="aqb__icon" />
    <span class="aqb__label">Sent the email?</span>
    <input
      v-model="noteDraft"
      class="aqb__note"
      aria-label="Communication log note"
      :title="noteDraft"
    />
    <div class="aqb__actions">
      <button class="aqb__btn aqb__btn--primary" @click="confirmSent">
        <Check :size="14" /> {{ alert && inQueue && hasNext ? 'Sent, next' : 'Sent' }}
        <ArrowRight v-if="alert && inQueue && hasNext" :size="14" />
      </button>
      <button class="aqb__btn" title="Reopen the email with the same choices" @click="emit('open-email')">
        <RotateCcw :size="13" /> Reopen
      </button>
      <button class="aqb__btn aqb__btn--ghost" @click="clearPendingEmail(studentId)">Not sent</button>
    </div>
  </div>

  <!-- 2. The student is flagged in Action Required -->
  <div
    v-else-if="alert"
    class="aqb"
    :class="`aqb--${alert.severity === 'danger' ? 'danger' : 'warning'}`"
    role="region"
    aria-label="Action required"
  >
    <AlertTriangle :size="15" class="aqb__icon" />
    <span class="aqb__reason" :title="alert.reason">
      <span v-if="alert.reTriggered" class="aqb__tag">Re-triggered</span>
      {{ alert.reason }}
    </span>
    <div class="aqb__actions">
      <span v-if="inQueue && position.index >= 0" class="aqb__position">
        {{ position.index + 1 }} of {{ position.total }}
      </span>
      <button class="aqb__btn aqb__btn--primary" @click="emit('open-email')">
        <Mail :size="14" /> Email home
      </button>
      <button class="aqb__btn" @click="markHandled">
        <Check :size="14" /> Handled
      </button>
      <button v-if="inQueue && hasNext" class="aqb__btn aqb__btn--ghost" @click="skip">
        Skip <ArrowRight :size="13" />
      </button>
    </div>
  </div>

  <!-- 3. Just finished with this student -->
  <div v-else-if="done" class="aqb aqb--done" role="status">
    <CheckCircle2 :size="15" class="aqb__icon" />
    <span class="aqb__reason">
      {{ done }}<template v-if="offerNext && remaining > 0"> · {{ remaining }} {{ remaining === 1 ? 'other needs' : 'others need' }} action</template>
      <template v-else-if="offerNext && inQueue"> · All caught up</template>
    </span>
    <div v-if="offerNext && remaining > 0" class="aqb__actions">
      <button class="aqb__btn aqb__btn--ghost" @click="goNext">
        Go to next <ArrowRight :size="13" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, toRef, onUnmounted } from 'vue'
import { Mail, Check, ArrowRight, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-vue-next'
import { useActionAlerts, refreshActionAlerts } from '../../composables/useActionAlerts.js'

const props = defineProps({
  studentId: { type: String, required: true },
  classId:   { type: String, required: true }
})

const emit = defineEmits(['open-email', 'select-student'])

const {
  evaluated,
  alertFor,
  queuePosition,
  nextStudentAfter,
  acknowledge,
  pendingEmailFor,
  clearPendingEmail,
  logContactAndHandle,
  enterFromQueue,
  isQueueEntry
} = useActionAlerts(toRef(props, 'classId'))

watch(() => props.classId, id => refreshActionAlerts(id), { immediate: true })

const pending  = computed(() => pendingEmailFor(props.studentId))
const alert    = computed(() => alertFor(props.studentId))
const inQueue  = computed(() => isQueueEntry(props.studentId))
const position = computed(() => queuePosition(props.studentId))
const hasNext  = computed(() => Boolean(nextStudentAfter(props.studentId)))
const remaining = computed(() => evaluated.value.active.filter(i => i.studentId !== props.studentId).length)

// Message shown after finishing with this student; cleared when the student changes.
// The queue is only offered after dealing with an alert, not after a casual email.
const done = ref('')
const offerNext = ref(false)
const noteDraft = ref('')
let doneTimer = null

function clearDone() {
  clearTimeout(doneTimer)
  done.value = ''
}

watch(() => props.studentId, clearDone)
onUnmounted(() => clearTimeout(doneTimer))
watch(pending, p => { noteDraft.value = p?.note || '' }, { immediate: true })

function moveTo(nextId) {
  enterFromQueue(nextId)
  emit('select-student', nextId)
}

/** In the queue, move straight on; otherwise stay and offer the next student. */
function finish(message, nextId, wasFlagged = true) {
  if (wasFlagged && inQueue.value && nextId) {
    moveTo(nextId)
    return
  }
  clearDone()
  done.value = message
  offerNext.value = wasFlagged
  if (!wasFlagged) doneTimer = setTimeout(clearDone, 4000)
}

async function confirmSent() {
  const nextId = nextStudentAfter(props.studentId)
  const wasFlagged = Boolean(alert.value)
  const note = noteDraft.value.trim() || pending.value.note
  await logContactAndHandle(props.studentId, note)
  finish(wasFlagged ? 'Email logged and marked handled' : 'Email logged', nextId, wasFlagged)
}

function markHandled() {
  const nextId = nextStudentAfter(props.studentId)
  acknowledge(alert.value)
  finish('Marked handled', nextId)
}

function skip() {
  const nextId = nextStudentAfter(props.studentId)
  if (nextId) moveTo(nextId)
}

function goNext() {
  const nextId = nextStudentAfter(props.studentId)
  if (nextId) moveTo(nextId)
}
</script>

<style scoped>
/* A slim strip attached to the bottom of the dossier header, aligned with it and the tabs */
.aqb {
  --aqb-accent: var(--state-neutral);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 6px 16px;
  min-height: 44px;
  background: color-mix(in srgb, var(--aqb-accent) 9%, var(--surface));
  border-bottom: 1px solid var(--border);
}
.aqb--danger  { --aqb-accent: var(--state-out); }
.aqb--warning { --aqb-accent: #ff9500; }
.aqb--pending { --aqb-accent: var(--primary); }
.aqb--done    { --aqb-accent: var(--state-success); }

.aqb__icon { flex-shrink: 0; color: var(--aqb-accent); }

.aqb__label {
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
}
.aqb__reason {
  flex: 1 1 200px;
  min-width: 0;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.aqb__tag {
  margin-right: 4px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 4px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--state-out) 14%, transparent);
  color: var(--state-out);
  vertical-align: 1px;
}
.aqb__note {
  flex: 1 1 220px;
  min-width: 0;
  height: 30px;
  font: inherit;
  font-size: 0.8rem;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 8px;
}
.aqb__note:focus { outline: 2px solid var(--primary); outline-offset: -1px; }

.aqb__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.aqb__position {
  margin-right: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* 32px visually; the ::before extends the tap area to 44px */
.aqb__btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
}
.aqb__btn::before {
  content: '';
  position: absolute;
  inset: -6px 0;
}
.aqb__btn:hover { filter: brightness(0.97); }
.aqb__btn--primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.aqb__btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-secondary);
}
</style>
