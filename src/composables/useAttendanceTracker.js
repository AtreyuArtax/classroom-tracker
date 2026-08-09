/**
 * src/composables/useAttendanceTracker.js
 *
 * Attendance event logging, RFID scan tracking, and stale checkouts.
 */

import { triggerRef } from 'vue'
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
                const todayStr = new Date().toISOString().slice(0, 10)
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
                const todayStr = new Date().toISOString().slice(0, 10)
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

            const todayStr = new Date().toISOString().slice(0, 10)
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
                    await eventService.deleteEvent(eventId)
                    await classService.clearStudentLate(classId, studentId)
                    student.activeStates.lateMs = null

                    if (wasAbsent) {
                        await classService.setStudentAbsent(classId, studentId)
                        student.activeStates.isAbsent = true
                        if (supersededAbsentId) {
                            await eventService.updateEvent(supersededAbsentId, { superseded: false })
                        }
                    }
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

    const isToday = eventTimestamp ? eventTimestamp.startsWith(new Date().toISOString().slice(0, 10)) : false

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
    const todayStr = now.toISOString().slice(0, 10)
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

        let classNeedsSave = false
        for (const [studentId, student] of Object.entries(cls.students || {})) {
            const states = student.activeStates
            if (states?.isOut && states.outTime) {
                const outDate = new Date(states.outTime)
                const isDifferentDay = !states.outTime.startsWith(todayStr)
                const elapsedMs = now.getTime() - outDate.getTime()

                let isStale = isDifferentDay || elapsedMs > elapsedSinceCheckOutLimit

                if (!isElementary) {
                    let periodEndTime = null
                    if (nextPeriodNum && startTimes[nextPeriodNum]) {
                        const [h, m] = startTimes[nextPeriodNum].split(':').map(Number)
                        const d = new Date(states.outTime)
                        d.setHours(h, m, 0, 0)
                        periodEndTime = d
                    } else {
                        const [h, m] = (cls.periodStartTime || periodStartTimes.value?.[1] || '08:00').split(':').map(Number)
                        const d = new Date(states.outTime)
                        d.setHours(h, m, 0, 0)
                        d.setTime(d.getTime() + 75 * 60 * 1000)
                        periodEndTime = d
                    }

                    const periodHasEndedSinceCheckout = outDate.getTime() < periodEndTime.getTime() && now.getTime() >= periodEndTime.getTime()
                    if (periodHasEndedSinceCheckout) isStale = true
                }

                if (isStale) {
                    let durationMs = periodEndTime ? (periodEndTime.getTime() - outDate.getTime()) : (15 * 60 * 1000)
                    if (durationMs < 0) durationMs = 5 * 60 * 1000
                    const MAX_DURATION_MS = 75 * 60 * 1000
                    if (durationMs > MAX_DURATION_MS) durationMs = MAX_DURATION_MS

                    await eventService.logEvent({
                        studentId,
                        classId: cls.classId,
                        code: states.code || 'w',
                        duration: durationMs,
                        testDay: false,
                        _overrideTimestamp: states.outTime
                    })

                    states.isOut = false
                    states.outTime = null
                    states.code = null
                    classNeedsSave = true
                    reconciled.add(`${cls.classId}-${studentId}`)

                    if (activeClass.value?.classId === cls.classId && students.value[studentId]) {
                        students.value[studentId].activeStates = { isOut: false, outTime: null }
                    }
                }
            }
        }

        if (classNeedsSave) {
            await classService.saveClass(cls)
        }
    }
    return reconciled
}

/**
 * Initializes RFID-based attendance for a class on class activation if needed.
 */
export async function initializeRfidAttendance(classId) {
    // If the configuration attendance mode isn't set, we can check useClassroom values
    const todayStr = new Date().toISOString().slice(0, 10)
    const existingEvents = await eventService.getEventsByClass(classId, { from: todayStr, to: todayStr })
    const hasAttendanceLogs = existingEvents.some(e => e.code === 'a' || e.code === 'l')
    if (hasAttendanceLogs) return

    const clsObj = classList.value.find(c => c.classId === classId)
    if (!clsObj) return

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

    const todayStr = new Date().toISOString().slice(0, 10)

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

    const todayStr = new Date().toISOString().slice(0, 10)
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
