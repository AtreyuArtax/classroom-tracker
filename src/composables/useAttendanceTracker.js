/**
 * src/composables/useAttendanceTracker.js
 *
 * Attendance event logging, RFID scan tracking, and stale checkouts.
 */

import { ref, triggerRef } from 'vue'
import { 
  activeClass, 
  students, 
  classList, 
  periodStartTimes, 
  latenessGracePeriod, 
  isTestDay 
} from './useClassroomState.js'
import * as classService from '../db/classService.js'
import * as eventService from '../db/eventService.js'
import { useUndo } from './useUndo.js'
import { useMessage } from './useMessage.js'
import { formatLocalDate } from '../utils/dates.js'

const { push: pushUndo } = useUndo()

/**
 * Log an attendance event (Absent or Late).
 */
export async function logAttendanceEvent(studentId, code) {
    try {
        const classId = activeClass.value?.classId
        if (!classId) return

        const student = students.value[studentId]

        if (code === 'a') {
            if (student.activeStates?.isAbsent) {
                // Toggle off: clear absent and delete today's 'a' event
                const todayStr = formatLocalDate(new Date())
                const eventsToday = await eventService.getEventsByStudent(studentId, { from: todayStr, to: todayStr })
                const absentEvent = eventsToday.find(e => e.code === 'a' && !e.superseded)
                let wasDeleted = false
                let originalTimestamp = null
                if (absentEvent) {
                    await eventService.deleteEvent(absentEvent.eventId)
                    wasDeleted = true
                    originalTimestamp = absentEvent.timestamp
                }
                await classService.clearStudentAbsent(classId, studentId)
                student.activeStates.isAbsent = false
                student.lastEvent = null

                pushUndo(async () => {
                    try {
                        await classService.setStudentAbsent(classId, studentId)
                        student.activeStates.isAbsent = true
                        if (wasDeleted) {
                            await eventService.logEvent({
                                studentId,
                                classId,
                                code: 'a',
                                duration: null,
                                testDay: isTestDay.value,
                                _overrideTimestamp: originalTimestamp
                            })
                        }
                    } catch (err) {
                        console.error('Undo clear absent failed:', err)
                        const { alert } = useMessage()
                        await alert('Failed to undo attendance change.')
                    }
                })
                return
            }

            await classService.setStudentAbsent(classId, studentId)

            if (!student.activeStates) student.activeStates = {}
            student.activeStates.isAbsent = true
            student.activeStates.lateMs = null

            const eventId = await eventService.logEvent({ studentId, classId, code, duration: null, testDay: isTestDay.value })
            student.lastEvent = { code, ts: Date.now() }

            pushUndo(async () => {
                try {
                    await classService.clearStudentAbsent(classId, studentId)
                    await eventService.deleteEvent(eventId)
                    student.activeStates.isAbsent = false
                    student.lastEvent = null
                } catch (err) {
                    console.error('Undo attendance event failed:', err)
                    const { alert } = useMessage()
                    await alert('Failed to undo attendance change.')
                }
            })
        } else if (code === 'l') {
            if (student.activeStates?.lateMs != null && student.activeStates?.lateMs > 0) {
                // Toggle off: clear lateMs state and delete today's 'l' event
                const todayStr = formatLocalDate(new Date())
                const eventsToday = await eventService.getEventsByStudent(studentId, { from: todayStr, to: todayStr })
                const lateEvent = eventsToday.find(e => e.code === 'l')
                let wasDeleted = false
                let originalTimestamp = null
                let originalDuration = student.activeStates.lateMs
                let wasSupersededAbsent = lateEvent?.supersededAbsent === true
                if (lateEvent) {
                    await eventService.deleteEvent(lateEvent.eventId)
                    wasDeleted = true
                    originalTimestamp = lateEvent.timestamp
                }
                await classService.clearStudentLate(classId, studentId)
                student.activeStates.lateMs = null
                student.lastEvent = null

                pushUndo(async () => {
                    try {
                        await classService.setStudentLate(classId, studentId, originalDuration)
                        student.activeStates.isAbsent = false
                        student.activeStates.lateMs = originalDuration
                        if (wasDeleted) {
                            await eventService.logEvent({
                                studentId,
                                classId,
                                code: 'l',
                                duration: originalDuration,
                                testDay: isTestDay.value,
                                supersededAbsent: wasSupersededAbsent,
                                _overrideTimestamp: originalTimestamp
                            })
                        }
                    } catch (err) {
                        console.error('Undo clear late failed:', err)
                        const { alert } = useMessage()
                        await alert('Failed to undo attendance change.')
                    }
                })
                return
            }

            const periodStart = activeClass.value?.periodStartTime || periodStartTimes.value?.[1] || '08:50'
            if (!periodStart) {
                const { alert } = useMessage()
                await alert('Set a start time in Setup to calculate lateness.')
                return
            }

            const [h, m] = periodStart.split(':').map(Number)
            const start = new Date()
            start.setHours(h, m, 0, 0)
            let msLate = Math.round(Date.now() - start.getTime())
            if (msLate < 0) msLate = 0
            
            const MAX_LATE_MS = 240 * 60 * 1000
            if (msLate > MAX_LATE_MS) msLate = MAX_LATE_MS

            const wasAbsent = student.activeStates?.isAbsent === true

            const todayStr = formatLocalDate(new Date())
            const eventsToday = await eventService.getEventsByStudent(studentId, { from: todayStr, to: todayStr })
            const existingLateEvent = eventsToday.find(e => e.code === 'l')

            if (existingLateEvent) {
                await eventService.deleteEvent(existingLateEvent.eventId)
            }

            let supersededAbsentId = null
            if (wasAbsent) {
                await classService.clearStudentAbsent(classId, studentId)
                const absentEvent = eventsToday.find(e => e.code === 'a' && !e.superseded)
                if (absentEvent) {
                    supersededAbsentId = absentEvent.eventId
                    await eventService.updateEvent(supersededAbsentId, { superseded: true })
                }
            }

            await classService.setStudentLate(classId, studentId, msLate)

            if (!student.activeStates) student.activeStates = {}
            student.activeStates.isAbsent = false
            student.activeStates.lateMs = msLate

            const eventId = await eventService.logEvent({
                studentId,
                classId,
                code,
                duration: msLate,
                testDay: isTestDay.value,
                supersededAbsent: wasAbsent
            })
            student.lastEvent = { code, ts: Date.now() }

            pushUndo(async () => {
                try {
                    await classService.clearStudentLate(classId, studentId)
                    await eventService.deleteEvent(eventId)
                    if (wasAbsent) {
                        await classService.setStudentAbsent(classId, studentId)
                        if (supersededAbsentId) {
                            await eventService.updateEvent(supersededAbsentId, { superseded: false })
                        }
                    }
                    student.activeStates.isAbsent = wasAbsent
                    student.activeStates.lateMs = null
                    student.lastEvent = null
                } catch (err) {
                    console.error('Undo attendance event failed:', err)
                    const { alert } = useMessage()
                    await alert('Failed to undo attendance change.')
                }
            })
        }
    } catch (err) {
        console.error('logAttendanceEvent failed:', err)
        const { alert } = useMessage()
        await alert('Failed to save attendance. Please try again.')
    }
}

export async function syncLateActiveState(classId, studentId, oldDuration, newDuration, eventTimestamp) {
    const cls = await classService.getClass(classId)
    const st = cls?.students[studentId]

    const isToday = eventTimestamp ? eventTimestamp.startsWith(formatLocalDate(new Date())) : false

    if (st && st.activeStates && st.activeStates.lateMs != null) {
        if (st.activeStates.lateMs === oldDuration || isToday) {
            await classService.setStudentLate(classId, studentId, newDuration)
            if (activeClass.value?.classId === classId && students.value[studentId]) {
                students.value[studentId].activeStates.lateMs = newDuration
            }
        }
    }
}

/**
 * Reconciles any stale trips for all active classes.
 * Runs on every scan and checks if class periods have ended.
 */
export async function reconcileStaleTrips() {
    const reconciled = new Set()
    const now = new Date()
    const todayStr = formatLocalDate(now)
    const startTimes = periodStartTimes.value || {}

    const periodMinutes = {}
    for (const [pNum, timeStr] of Object.entries(startTimes)) {
        const [h, m] = timeStr.split(':').map(Number)
        periodMinutes[pNum] = h * 60 + m
    }

    const sortedPeriods = Object.keys(startTimes).map(Number).sort((a, b) => a - b)

    for (const cls of classList.value) {
        const isElementary = cls.classType === 'elementary'
        const classPeriod = Number(cls.periodNumber)
        const classStartMins = periodMinutes[classPeriod]

        if (!isElementary && classStartMins === undefined) continue

        const nextPeriodNum = sortedPeriods.find(p => p > classPeriod)
        const elapsedSinceCheckOutLimit = 90 * 60 * 1000

        let classUpdated = false
        const nowMs = now.getTime()

        for (const [studentId, student] of Object.entries(cls.students || {})) {
            if (student.archived) continue

            const isOut = student.activeStates?.isOut === true
            const outTime = student.activeStates?.outTime

            if (isOut && outTime) {
                const outDate = new Date(outTime)
                const outDateStr = formatLocalDate(outDate)
                const elapsedMs = nowMs - outDate.getTime()

                let shouldClose = false
                let closeDurationMs = 5 * 60 * 1000

                if (outDateStr < todayStr) {
                    shouldClose = true
                    closeDurationMs = 5 * 60 * 1000
                } else if (!isElementary && nextPeriodNum !== undefined && periodMinutes[nextPeriodNum] !== undefined) {
                    const nextStartMins = periodMinutes[nextPeriodNum]
                    const currentMins = now.getHours() * 60 + now.getMinutes()
                    if (currentMins >= nextStartMins) {
                        shouldClose = true
                        const nextStartDate = new Date(now)
                        const [nextH, nextM] = startTimes[nextPeriodNum].split(':').map(Number)
                        nextStartDate.setHours(nextH, nextM, 0, 0)
                        const rawElapsed = nextStartDate.getTime() - outDate.getTime()
                        closeDurationMs = Math.max(60000, Math.min(rawElapsed, 45 * 60 * 1000))
                    }
                } else if (elapsedMs > elapsedSinceCheckOutLimit) {
                    shouldClose = true
                    closeDurationMs = 5 * 60 * 1000
                }

                if (shouldClose) {
                    await eventService.logEvent({
                        studentId,
                        classId: cls.classId,
                        code: 'w',
                        duration: closeDurationMs,
                        testDay: false
                    })

                    student.activeStates.isOut = false
                    student.activeStates.outTime = null
                    classUpdated = true
                    reconciled.add(`${cls.name}: ${student.firstName} ${student.lastName}`)

                    if (activeClass.value?.classId === cls.classId && students.value[studentId]) {
                        students.value[studentId].activeStates.isOut = false
                        students.value[studentId].activeStates.outTime = null
                    }
                }
            }
        }

        if (classUpdated) {
            await classService.saveClass(cls)
        }
    }
    return reconciled
}

/**
 * Initializes RFID-based attendance for a class on class activation if needed.
 * Only initializes if:
 * 1. No events (attendance, trips, notes) have occurred yet today in this class.
 * 2. The current time is within the class window (15 mins before start time through period end).
 */
export async function initializeRfidAttendance(classId, options = {}) {
    const todayStr = formatLocalDate(new Date())
    const existingEvents = await eventService.getEventsByClass(classId, { from: todayStr, to: todayStr })
    
    // Safety 1: If attendance has ALREADY been initialized for this class today, do not overwrite
    // (We only check for 'a' or 'l' events, ignoring early morning notes, IEP reminders, or behavior logs)
    const hasAlreadyInitialized = existingEvents.some(e => e.code === 'a' || e.code === 'l')
    if (hasAlreadyInitialized) return

    const clsObj = classList.value.find(c => c.classId === classId) || (activeClass.value?.classId === classId ? activeClass.value : null)
    if (!clsObj) return

    // Safety 2: Check if current time is within the valid class window (15m before start -> period end)
    if (!options.force) {
        const now = new Date()
        const currentMinutes = now.getHours() * 60 + now.getMinutes()
        
        const startTimeStr = clsObj.periodStartTime || periodStartTimes.value?.[clsObj.periodNumber || 1] || '08:50'
        const [startH, startM] = startTimeStr.split(':').map(Number)
        const startMinutes = (isNaN(startH) ? 8 : startH) * 60 + (isNaN(startM) ? 50 : startM)
        
        // Window opens 15 minutes before period start for early arrivals
        const windowOpenMinutes = startMinutes - 15
        
        // Window closes at period end (elementary runs all day ~7.5h; secondary ~90 mins)
        const durationMinutes = clsObj.classType === 'elementary' ? 450 : 90
        const windowCloseMinutes = startMinutes + durationMinutes
        
        if (currentMinutes < windowOpenMinutes || currentMinutes > windowCloseMinutes) {
            return // Outside class time window — do not auto-create absence records
        }
    }

    let classNeedsSave = false
    for (const [studentId, student] of Object.entries(clsObj.students || {})) {
        if (student.archived) continue

        if (!student.activeStates) student.activeStates = {}
        student.activeStates.isAbsent = true
        student.activeStates.lateMs = null
        classNeedsSave = true

        await eventService.logEvent({
            studentId,
            classId,
            code: 'a',
            duration: null,
            testDay: false
        })
    }

    if (classNeedsSave) {
        await classService.saveClass(clsObj)
        if (activeClass.value?.classId === classId) {
            for (const [studentId, student] of Object.entries(students.value)) {
                if (student.archived) continue
                if (!student.activeStates) student.activeStates = {}
                student.activeStates.isAbsent = true
                student.activeStates.lateMs = null
            }
        }
    }
}

/**
 * Handles the first RFID/QR tap for an absent student under RFID-Based Attendance Mode.
 */
export async function handleRfidAttendanceScan(studentId, classId) {
    const isActive = classId === activeClass.value?.classId
    const clsObj = isActive ? activeClass.value : classList.value.find(c => c.classId === classId)
    if (!clsObj) return { type: 'error', statusText: 'Class not found' }

    const student = clsObj.students[studentId]
    if (!student) return { type: 'error', statusText: 'Student not found' }

    const todayStr = formatLocalDate(new Date())

    const eventsToday = await eventService.getEventsByStudent(studentId, { from: todayStr, to: todayStr })
    const absentEvent = eventsToday.find(e => e.code === 'a' && !e.superseded)
    if (absentEvent) {
        await eventService.updateEvent(absentEvent.eventId, { superseded: true })
    }

    const periodStart = clsObj.periodStartTime
    let isLate = false
    let msLate = 0

    if (periodStart) {
        const [h, m] = periodStart.split(':').map(Number)
        const start = new Date()
        start.setHours(h, m, 0, 0)
        
        const scanTime = Date.now()
        msLate = Math.round(scanTime - start.getTime())

        const gracePeriodMinutes = latenessGracePeriod.value !== undefined ? latenessGracePeriod.value : 5
        const graceMs = gracePeriodMinutes * 60 * 1000
        if (msLate > 0 && msLate > graceMs) {
            isLate = true
            const MAX_LATE_MS = 240 * 60 * 1000
            if (msLate > MAX_LATE_MS) msLate = MAX_LATE_MS
        }
    }

    if (isLate) {
        await classService.setStudentLate(classId, studentId, msLate)
        
        if (!student.activeStates) student.activeStates = {}
        student.activeStates.isAbsent = false
        student.activeStates.isOut = false
        student.activeStates.outTime = null
        student.activeStates.lateMs = msLate

        if (isActive && students.value[studentId]) {
            students.value[studentId].activeStates.isAbsent = false
            students.value[studentId].activeStates.isOut = false
            students.value[studentId].activeStates.outTime = null
            students.value[studentId].activeStates.lateMs = msLate
        }

        await eventService.logEvent({
            studentId,
            classId,
            code: 'l',
            duration: msLate,
            testDay: isTestDay.value,
            supersededAbsent: true
        })

        const minsLate = Math.round(msLate / 60000)
        return { type: 'late', statusText: `LATE ${minsLate}m` }
    } else {
        await classService.clearStudentAbsent(classId, studentId)

        if (!student.activeStates) student.activeStates = {}
        student.activeStates.isAbsent = false
        student.activeStates.isOut = false
        student.activeStates.outTime = null
        student.activeStates.lateMs = null

        if (isActive && students.value[studentId]) {
            students.value[studentId].activeStates.isAbsent = false
            students.value[studentId].activeStates.isOut = false
            students.value[studentId].activeStates.outTime = null
            students.value[studentId].activeStates.lateMs = null
        }

        return { type: 'present', statusText: 'PRESENT' }
    }
}

/**
 * Marks all students in a class present for today.
 */
export async function markAllPresentToday(classId) {
    const isActive = classId === activeClass.value?.classId
    const clsObj = isActive ? activeClass.value : classList.value.find(c => c.classId === classId)
    if (!clsObj) return

    const todayStr = formatLocalDate(new Date())
    let classNeedsSave = false

    for (const [studentId, student] of Object.entries(clsObj.students || {})) {
        if (student.archived) continue

        const isAbsent = student.activeStates?.isAbsent === true
        const isLate = student.activeStates?.lateMs !== null && student.activeStates?.lateMs !== undefined
        
        if (isAbsent || isLate) {
            const eventsToday = await eventService.getEventsByStudent(studentId, { from: todayStr, to: todayStr })
            for (const evt of eventsToday) {
                if ((evt.code === 'a' || evt.code === 'l') && !evt.superseded) {
                    await eventService.updateEvent(evt.eventId, { superseded: true })
                }
            }

            if (!student.activeStates) student.activeStates = {}
            student.activeStates.isAbsent = false
            student.activeStates.lateMs = null
            classNeedsSave = true

            if (isActive && students.value[studentId]) {
                if (!students.value[studentId].activeStates) students.value[studentId].activeStates = {}
                students.value[studentId].activeStates.isAbsent = false
                students.value[studentId].activeStates.lateMs = null
            }
        }
    }

    if (classNeedsSave) {
        const plain = JSON.parse(JSON.stringify(clsObj))
        await classService.saveClass(plain)
        if (isActive) {
            triggerRef(activeClass)
        }
    }
}

// ─── Shared Master Attendance Clock ───────────────────────────────────────────
const masterTimestamp = ref(Date.now())
let masterTickerInterval = null
let activeSubscriberCount = 0

/**
 * Provides a single shared clock ticker for all active student out-timers.
 * Automatically runs a single 1s interval only when 1+ subscribers are active.
 */
export function useMasterAttendanceTicker() {
    function startTicker() {
        activeSubscriberCount++
        if (!masterTickerInterval) {
            masterTimestamp.value = Date.now()
            masterTickerInterval = setInterval(() => {
                masterTimestamp.value = Date.now()
            }, 1000)
        }
    }

    function stopTicker() {
        activeSubscriberCount = Math.max(0, activeSubscriberCount - 1)
        if (activeSubscriberCount === 0 && masterTickerInterval) {
            clearInterval(masterTickerInterval)
            masterTickerInterval = null
        }
    }

    return {
        masterTimestamp,
        startTicker,
        stopTicker
    }
}

/**
 * Toggles Test Day mode on/off with retroactive session sync and confirmation warning.
 */
export async function toggleTestDay() {
    const classId = activeClass.value?.classId
    const todayStr = formatLocalDate(new Date())
    const { confirm } = useMessage()

    if (!isTestDay.value) {
        // Turning ON: sync any attendance events already logged today in this class
        isTestDay.value = true
        if (classId) {
            const eventsToday = await eventService.getEventsByClass(classId, { from: todayStr, to: todayStr })
            const attendanceEvents = eventsToday.filter(e => !e.superseded && (e.code === 'a' || e.code === 'l'))
            for (const ev of attendanceEvents) {
                if (!ev.testDay) {
                    await eventService.updateEvent(ev.eventId, { testDay: true })
                }
            }
        }
    } else {
        // Turning OFF: check if any test-day attendance events exist for today
        if (classId) {
            const eventsToday = await eventService.getEventsByClass(classId, { from: todayStr, to: todayStr })
            const testDayEvents = eventsToday.filter(e => !e.superseded && e.testDay)
            if (testDayEvents.length > 0) {
                const confirmed = await confirm(
                    `Turning off Test Day will remove the "Missed Test" flag from ${testDayEvents.length} attendance record${testDayEvents.length > 1 ? 's' : ''} logged today in this class. Are you sure you want to proceed?`,
                    'Turn Off Test Day?',
                    { danger: true }
                )
                if (!confirmed) return

                for (const ev of testDayEvents) {
                    await eventService.updateEvent(ev.eventId, { testDay: false })
                }
            }
        }
        isTestDay.value = false
    }
}


