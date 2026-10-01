/**
 * useActionAlerts.js — shared "Action Required" state.
 *
 * One source of truth for who is flagged, who has been handled, emails that were
 * opened but not yet confirmed as sent, and the triage queue. Used by the Reports
 * overview panel and by the Student360 action bar, so both always show the same alert.
 *
 *   refreshActionAlerts(classId, preloaded?) — load the data alerts are built from
 *   useActionAlerts(classIdRef)              — reactive { active, handled } + actions
 *
 * Handled state and pending emails are per-device conveniences kept in localStorage
 * (same `classroom_ack_alerts_<classId>` key the Reports panel has always used).
 */

import { ref, shallowRef, computed, unref, watch } from 'vue'
import { useClassroom } from './useClassroom.js'
import { getEffectiveClassRecord } from './useElementary.js'
import { activeSubjectId } from './useClassroomState.js'
import { activeClassRecord, assessments as gbAssessments, gradeMap } from './useGradebook.js'
import * as classService from '../db/classService.js'
import * as eventService from '../db/eventService.js'
import { calculateClassGrades } from '../db/gradebookService.js'
import { filterAssessmentsForSubject } from '../utils/gradeCalc.js'
import { getDateRangeForClassPeriod } from '../utils/timeUtils.js'
import {
  buildFollowUpItems,
  buildMissingSummary,
  buildActionItems,
  evaluateActionItems
} from '../utils/actionAlerts.js'

const PENDING_KEY = 'classroom_pending_emails'
const STALE_MS = 2 * 60 * 1000

// ─── Module state (shared by every caller) ───────────────────────────────────

/** Period the alerts are calculated over; follows the Reports period filter. */
export const alertPeriod = ref('week')

/** classId → { students, studentList, events, periodEvents, classGrades, effective, period, loadedAt } */
const sources = shallowRef({})
const inFlight = {}

/** classId → { studentId: { acknowledgedAt, gradeAtAck } } */
const acksByClass = ref({})

/** `${classId}:${studentId}` → { note, recipients, content, reason, createdAt } */
const pendingEmails = ref(readStorage(PENDING_KEY, {}))

/** The student most recently opened from the Action Required list. */
const queueEntry = ref(null)

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Failed to save ${key}`, e)
  }
}

const ackKey = classId => `classroom_ack_alerts_${classId || 'default'}`

function ensureAcks(classId) {
  if (!classId || acksByClass.value[classId]) return
  acksByClass.value = { ...acksByClass.value, [classId]: readStorage(ackKey(classId), {}) }
}

function setAcks(classId, acks) {
  acksByClass.value = { ...acksByClass.value, [classId]: acks }
  writeStorage(ackKey(classId), acks)
}

function codeOptions() {
  const { behaviorCodes, thresholds } = useClassroom()
  const codes = Array.isArray(behaviorCodes.value) ? behaviorCodes.value : []
  return {
    washCodes: codes.filter(c => c.type === 'toggle').map(c => c.codeKey),
    redirectCodes: codes.filter(c => c.category === 'redirect').map(c => c.codeKey),
    washLimit: Number(thresholds.value?.washroomDurationLimit ?? 11)
  }
}

// ─── Loading ─────────────────────────────────────────────────────────────────

/**
 * Loads (or accepts) the events and grades alerts are built from.
 * Reports passes what it already fetched in `preloaded` to avoid a second fetch.
 * @param {string} classId
 * @param {{ period?: string, events?: Array, classGrades?: Object, force?: boolean }} preloaded
 */
export async function refreshActionAlerts(classId, preloaded = {}) {
  if (!classId) return
  ensureAcks(classId)
  if (preloaded.period) alertPeriod.value = preloaded.period

  const existing = sources.value[classId]
  const hasPreloaded = preloaded.events && preloaded.classGrades
  const isFresh = existing && existing.period === alertPeriod.value && Date.now() - existing.loadedAt < STALE_MS
  if (!hasPreloaded && !preloaded.force && isFresh) return
  if (!hasPreloaded && inFlight[classId]) return inFlight[classId]

  const run = (async () => {
    const { academicTerms } = useClassroom()
    const rawClass = await classService.getClass(classId)
    if (!rawClass) return

    const period = alertPeriod.value
    const effective = getEffectiveClassRecord(rawClass, activeSubjectId.value)
    const students = {}
    Object.entries(rawClass.students || {}).forEach(([id, s]) => {
      if (!s.archived) students[id] = s
    })
    const studentList = Object.entries(students).map(([studentId, s]) => ({ ...s, studentId }))

    const dr = getDateRangeForClassPeriod(period, rawClass, academicTerms.value) || {}
    const events = preloaded.events
      ?? (await eventService.getEventsByClass(classId)).filter(e => students[e.studentId])
    const periodEvents = (dr.from || dr.to)
      ? events.filter(e => {
          const date = e.timestamp?.slice(0, 10)
          if (dr.from && date < dr.from) return false
          if (dr.to && date > dr.to) return false
          return true
        })
      : events
    const classGrades = preloaded.classGrades ?? await calculateClassGrades(effective, { asOf: dr.to || null })

    sources.value = {
      ...sources.value,
      [classId]: { students, studentList, events, periodEvents, classGrades, effective, period, loadedAt: Date.now() }
    }
  })()

  inFlight[classId] = run
  try {
    await run
  } finally {
    if (inFlight[classId] === run) delete inFlight[classId]
  }
}

/** All alert items for a class (handled or not). Reads gradebook state reactively. */
function itemsFor(classId) {
  const src = sources.value[classId]
  if (!src) return []
  const { washCodes, washLimit } = codeOptions()

  // Missing work needs the gradebook, which every dossier host loads for its class.
  const gradebookReady = activeClassRecord.value?.classId === classId
  const assessments = gradebookReady ? filterAssessmentsForSubject(gbAssessments.value, src.effective) : []

  const followUpItems = buildFollowUpItems({
    students: src.students,
    periodEvents: src.periodEvents,
    assessments,
    classGrades: src.classGrades,
    washCodes,
    washLimit
  })
  const missingSummary = buildMissingSummary({
    studentList: src.studentList,
    assessments,
    gradeMap: gradebookReady ? gradeMap.value : null,
    classGrades: src.classGrades
  })
  return buildActionItems({
    studentList: src.studentList,
    classGrades: src.classGrades,
    followUpItems,
    missingSummary,
    isSBAR: src.effective?.gradingFramework === 'sbar'
  })
}

// ─── Composable ──────────────────────────────────────────────────────────────

/**
 * @param {import('vue').Ref<string>|string} classIdRef
 */
export function useActionAlerts(classIdRef) {
  const classId = computed(() => unref(classIdRef) || null)
  watch(classId, id => ensureAcks(id), { immediate: true })

  const isLoaded = computed(() => Boolean(classId.value && sources.value[classId.value]))

  const evaluated = computed(() => {
    const cid = classId.value
    if (!cid || !sources.value[cid]) return { active: [], handled: [] }
    return evaluateActionItems(itemsFor(cid), acksByClass.value[cid] || {}, sources.value[cid].events, codeOptions())
  })

  function alertFor(studentId) {
    return evaluated.value.active.find(i => i.studentId === String(studentId)) || null
  }

  /** Position of a student in the active queue, e.g. { index: 1, total: 7 } */
  function queuePosition(studentId) {
    const list = evaluated.value.active
    const index = list.findIndex(i => i.studentId === String(studentId))
    return { index, total: list.length }
  }

  /** The flagged student after this one (wrapping), or null when no one else is left. */
  function nextStudentAfter(studentId) {
    const list = evaluated.value.active
    if (list.length === 0) return null
    const idx = list.findIndex(i => i.studentId === String(studentId))
    const ordered = idx === -1 ? list : [...list.slice(idx + 1), ...list.slice(0, idx)]
    return ordered.find(i => i.studentId !== String(studentId))?.studentId || null
  }

  function acknowledge(item) {
    const cid = classId.value
    if (!cid || !item) return
    ensureAcks(cid)
    setAcks(cid, {
      ...acksByClass.value[cid],
      [item.studentId]: {
        acknowledgedAt: new Date().toISOString(),
        gradeAtAck: item.grade ?? null
      }
    })
  }

  function unacknowledge(studentId) {
    const cid = classId.value
    if (!cid) return
    const updated = { ...(acksByClass.value[cid] || {}) }
    delete updated[studentId]
    setAcks(cid, updated)
  }

  // ── Pending emails (opened in the mail app, not yet confirmed as sent) ──

  const pendingKey = studentId => `${classId.value}:${studentId}`

  function pendingEmailFor(studentId) {
    return pendingEmails.value[pendingKey(studentId)] || null
  }

  function setPendingEmail(studentId, data) {
    if (!classId.value) return
    pendingEmails.value = { ...pendingEmails.value, [pendingKey(studentId)]: { ...data, createdAt: new Date().toISOString() } }
    writeStorage(PENDING_KEY, pendingEmails.value)
  }

  function clearPendingEmail(studentId) {
    const updated = { ...pendingEmails.value }
    delete updated[pendingKey(studentId)]
    pendingEmails.value = updated
    writeStorage(PENDING_KEY, updated)
  }

  const pendingEmailCount = computed(() => {
    const prefix = `${classId.value}:`
    return Object.keys(pendingEmails.value).filter(k => k.startsWith(prefix)).length
  })

  /** Logs a parent contact, marks the alert handled and clears any pending email. */
  async function logContactAndHandle(studentId, note) {
    const { logStandardEvent } = useClassroom()
    await logStandardEvent(studentId, 'pc', note, { classId: classId.value })
    const item = alertFor(studentId)
    if (item) acknowledge(item)
    clearPendingEmail(studentId)
  }

  // ── Triage queue ──

  function enterFromQueue(studentId) {
    queueEntry.value = { classId: classId.value, studentId: String(studentId) }
  }

  function isQueueEntry(studentId) {
    return queueEntry.value?.classId === classId.value && queueEntry.value?.studentId === String(studentId)
  }

  return {
    isLoaded,
    evaluated,
    alertFor,
    queuePosition,
    nextStudentAfter,
    acknowledge,
    unacknowledge,
    pendingEmailFor,
    setPendingEmail,
    clearPendingEmail,
    pendingEmailCount,
    logContactAndHandle,
    enterFromQueue,
    isQueueEntry
  }
}
