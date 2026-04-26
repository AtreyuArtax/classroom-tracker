/**
 * src/composables/useStudentDossier.js
 *
 * Owns all data-fetching and computed stats for the student dossier in Reports.vue.
 *
 * CLAUDE.md §4: composables ARE permitted to import from src/db/ — this is the
 * correct layer for IDB access on behalf of view-level components.
 *
 * Exports:
 *   selectedStudentId, selectedClassId, selectedPeriod
 *   sidebarStudents    — sorted array { studentId, firstName, lastName } for the sidebar
 *   events, student, loading, stats
 *   loadSidebarClass(classId)   — populates sidebarStudents for the chosen class
 *   loadStudent(classId, studentId) — fetches events + student record for dossier
 *
 * selectedPeriod is watched internally; re-fetches events automatically on change.
 */

import { ref, computed, watch } from 'vue'
import * as classService from '../db/classService.js'
import * as eventService from '../db/eventService.js'
import { getDB } from '../db/index.js'
import { getDateRangeForPeriod, toMinutes } from '../db/eventService.js'
import { useClassroom } from './useClassroom.js'

export function useStudentDossier(periodRef = null, classIdRef = null) {
    const { activeStudentEvents, getStudentEventHistory, behaviorCodes, academicTerms } = useClassroom()

    // ─── selection state ──────────────────────────────────────────────────────

    const selectedStudentId = ref(null)
    const selectedClassId = ref(null)
    const classStartDate = ref(null)
    const selectedClassRecord = ref(null)
    const selectedPeriod = periodRef || ref('month')

    const matchingTerm = computed(() => {
        const cls = selectedClassRecord.value
        if (!cls) return null
        return academicTerms.value.find(t => t.year === cls.year && String(t.semester) === String(cls.semester))
    })

    /** Fetch the earliest class event to anchor the "All" period rate */
    async function _fetchClassData(id) {
        if (!id) { 
            classStartDate.value = null
            selectedClassRecord.value = null
            return 
        }
        try {
            const db = await getDB()
            
            // 1. Fetch class record for matchingTerm
            selectedClassRecord.value = await classService.getClass(id)

            // 2. Fetch earliest event (fallback anchor)
            const firstEvent = await db.getFromIndex('events', 'by_classId_timestamp', id)
            classStartDate.value = firstEvent ? firstEvent.timestamp.slice(0, 10) : null
        } catch (err) {
            console.error('Failed to fetch class data:', err)
            classStartDate.value = null
            selectedClassRecord.value = null
        }
    }

    // Watch external classIdRef (for Student360)
    if (classIdRef) {
        watch(classIdRef, (newId) => _fetchClassData(newId), { immediate: true })
    }
    // Watch internal selectedClassId (for sidebar/loadStudent)
    watch(selectedClassId, (newId) => {
        if (!classIdRef || !classIdRef.value) _fetchClassData(newId)
    })

    // ─── sidebar roster ───────────────────────────────────────────────────────

    /** Raw students map from the class currently shown in the sidebar */
    const _sidebarClassRecord = ref(null)

    /** Sorted array for the sidebar student list */
    const sidebarStudents = computed(() => {
        const cls = _sidebarClassRecord.value
        if (!cls?.students) return []
        return Object.entries(cls.students)
            .filter(([, s]) => !s.archived)
            .map(([studentId, s]) => ({
                studentId,
                firstName: s.firstName,
                lastName: s.lastName,
            }))
            .sort((a, b) => a.lastName.localeCompare(b.lastName))
    })

    /**
     * Load the student list for the sidebar class selector.
     * Call whenever the user changes the class dropdown in Reports.
     *
     * @param {string} classId
     */
    async function loadSidebarClass(classId) {
        if (!classId) { _sidebarClassRecord.value = null; selectedClassRecord.value = null; return }
        try {
            const cls = await classService.getClass(classId)
            _sidebarClassRecord.value = cls
            selectedClassRecord.value = cls
        } catch (err) {
            console.error('useStudentDossier.loadSidebarClass failed:', err)
            _sidebarClassRecord.value = null
        }
    }

    // ─── dossier data ─────────────────────────────────────────────────────────
    
    /** Base event history shared with useClassroom */
    const events = activeStudentEvents
    const student = ref(null)
    const loading = ref(false)

    /**
     * Load dossier for a specific student.
     * Sets selectedClassId + selectedStudentId, then fetches student record and events.
     *
     * @param {string} classId
     * @param {string} studentId
     */
    async function loadStudent(classId, studentId) {
        selectedClassId.value = classId
        selectedStudentId.value = studentId
        loading.value = true
        try {
            const cls = await classService.getClass(classId)
            selectedClassRecord.value = cls
            student.value = cls?.students[studentId] || null
            
            // Re-fetch global student event history
            await getStudentEventHistory(studentId)
        } catch (err) {
            console.error('useStudentDossier.loadStudent failed:', err)
            student.value = null
        } finally {
            loading.value = false
        }
    }

    /** Reload current student */
    async function reload() {
        if (selectedClassId.value && selectedStudentId.value) {
            await loadStudent(selectedClassId.value, selectedStudentId.value)
        }
    }

    /**
     * Helper to count school days (weekdays) in a range.
     * @param {Object} range - { from, to }
     * @param {string} fallbackStart - ISO date string
     * @param {number} cap - max days (instructionalDays)
     * @returns {number|null}
     */
    function _countSchoolDays(range, fallbackStart, cap = 999) {
        const toDate = range.to ? new Date(range.to + 'T23:59:59') : new Date()
        let fromDate

        if (range.from) {
            fromDate = new Date(range.from)
        } else if (fallbackStart) {
            fromDate = new Date(fallbackStart)
        } else {
            return null
        }

        let count = 0
        let cur = new Date(fromDate)
        while (cur <= toDate) {
            const day = cur.getDay()
            if (day !== 0 && day !== 6) count++
            cur.setDate(cur.getDate() + 1)
        }

        return Math.min(count, cap)
    }

    /**
     * Period-aware slice of events. Exported so callers (Student360.vue) can use it
     * for downstream computeds without re-implementing the same filter.
     */
    const filteredEvents = computed(() => {
        const range = getDateRangeForPeriod(selectedPeriod.value)
        if (!range || (!range.from && !range.to)) return events.value
        return events.value.filter(e => {
            if (range.from && e.timestamp < range.from) return false
            if (range.to && e.timestamp > range.to + 'T23:59:59') return false
            return true
        })
    })

    const stats = computed(() => {
        // Operate on the period-filtered, non-superseded slice
        const e = filteredEvents.value.filter(ev => !ev.superseded)

        const washroomEvents = e.filter(ev => {
            const config = behaviorCodes.value.find(c => c.codeKey === ev.code)
            return config?.type === 'toggle' && ev.duration != null
        })
        const absenceEvents = e.filter(ev => ev.code === 'a')
        const lateEvents    = e.filter(ev => ev.code === 'l')
        const redirects     = e.filter(ev => ev.category === 'redirect').length
        const parentContacts = e.filter(ev => ev.code === 'pc' || ev.category === 'communication')
        const noteEvents    = e.filter(ev => ev.note && ev.code !== 'ac' && ev.code !== 'pc' && ev.category !== 'communication')

        const absences         = absenceEvents.length
        const testDayAbsences  = absenceEvents.filter(ev => ev.testDay).length
        const totalWashroomMins = washroomEvents.reduce((sum, ev) => sum + toMinutes(ev.duration), 0)
        const totalLateMins     = lateEvents.reduce((sum, ev) => sum + toMinutes(ev.duration), 0)

        // Count actual weekdays in the period as the school-day denominator.
        // This avoids the old bug where students with only absences logged would
        // get 0% because classDays equalled absences.
        const range = getDateRangeForPeriod(selectedPeriod.value)
        
        // Determine anchor and cap for 'all'
        const term = matchingTerm.value
        const anchor = (selectedPeriod.value === 'all' && term?.startDate) ? term.startDate : classStartDate.value
        const cap = (selectedPeriod.value === 'all' && term?.instructionalDays) ? term.instructionalDays : 999

        const classDays = _countSchoolDays(range, anchor, cap)
        const attendanceRate = classDays
            ? Math.round(Math.min(100, Math.max(0, ((classDays - absences) / classDays) * 100)))
            : (absences === 0 && anchor ? 100 : (absences === 0 ? null : 0))

        return {
            washroomTrips: washroomEvents.length,
            washroomMinutes: totalWashroomMins,
            avgWashroomMinutes: washroomEvents.length
                ? Math.round((totalWashroomMins / washroomEvents.length) * 2) / 2
                : 0,
            absences,
            testDayAbsences,
            lates: lateEvents.length,
            avgLateMinutes: lateEvents.length
                ? Math.round((totalLateMins / lateEvents.length) * 2) / 2
                : 0,
            redirects,
            parentContactCount: parentContacts.length,
            noteCount: noteEvents.length,
            assessmentConversations: qualitativeEvents.value.length,
            demonstratesUnderstanding: qualitativeEvents.value.filter(e => e.acOutcome === 'demonstrates_understanding').length,
            gapConfirmed: qualitativeEvents.value.filter(e => e.acOutcome === 'gap_confirmed').length,
            attendanceRate,
            classDays,
        }
    })

    // ─── Assessment / Note feeds ───────────────────────────────────────────

    /** Qualitative evidence — 'ac' events (Assessment Observation/Conversation) */
    const qualitativeEvents = computed(() =>
        [...events.value]
            .filter(e => e.code === 'ac')
            .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
    )

    /** Parent/Guardian interactions — 'pc' events */
    const communicationEvents = computed(() =>
        [...events.value]
            .filter(e => e.code === 'pc' || e.category === 'communication')
            .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
    )

    /** General notes — situational notes, excluding academic/comm items */
    const noteEvents = computed(() =>
        [...events.value]
            .filter(e => e.note && e.code !== 'ac' && e.code !== 'pc' && e.category !== 'communication')
            .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
    )

    // ─── trend graph data ────────────────────────────────────────────────────

    const weeklyTrend = computed(() => {
        const filteredEvents = events.value.filter(ev => !ev.superseded)
        if (!filteredEvents.length) return []

        // Group events by week start date (Monday) and category
        const weeks = {}
        for (const evt of filteredEvents) {
            const date = new Date(evt.timestamp)
            // Get Monday of that week
            const day = date.getDay()
            const diff = (day === 0 ? -6 : 1 - day)
            const monday = new Date(date)
            monday.setDate(date.getDate() + diff)
            monday.setHours(0, 0, 0, 0)
            const weekKey = monday.toISOString().split('T')[0]

            if (!weeks[weekKey]) weeks[weekKey] = { week: weekKey }
            weeks[weekKey][evt.category] = (weeks[weekKey][evt.category] || 0) + 1
        }

        // Return sorted array
        return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week))
    })

    const trendCategories = computed(() => {
        const cats = new Set(events.value.filter(e => !e.superseded).map(e => e.category))
        return [...cats]
    })

    // ─── clear ────────────────────────────────────────────────────────────────

    function clearStudent() {
        selectedStudentId.value = null
        selectedClassId.value = null
        events.value = []
        student.value = null
    }


    const allTimeHistory = ref([])
    async function fetchAllTimeHistory(studentId) {
        if (!studentId) return
        try {
            const allClasses = await classService.getAllClasses()
            const history = []
            
            for (const cls of allClasses) {
                const s = cls.students[studentId]
                if (s) {
                    history.push({
                        classId: cls.classId,
                        name: cls.name,
                        year: cls.year,
                        semester: cls.semester,
                        period: cls.periodNumber,
                        overallGrade: s.overallGrade,
                        lastModified: cls.lastModified
                    })
                }
            }
            
            // Sort by Year desc, Semester desc
            allTimeHistory.value = history.sort((a, b) => {
                const yearA = a.year || ''
                const yearB = b.year || ''
                if (yearA !== yearB) return yearB.localeCompare(yearA)
                
                const semA = a.semester || ''
                const semB = b.semester || ''
                return semB.localeCompare(semA)
            })
        } catch (err) {
            console.error('fetchAllTimeHistory failed:', err)
            allTimeHistory.value = []
        }
    }

    // ─── export ───────────────────────────────────────────────────────────────

    return {
        // selection
        selectedStudentId,
        selectedClassId,
        selectedPeriod,
        // sidebar
        sidebarStudents,
        loadSidebarClass,
        // dossier
        events,
        filteredEvents,   // period-aware slice — export so callers don't re-implement
        noteEvents,
        communicationEvents,
        qualitativeEvents,
        weeklyTrend,
        trendCategories,
        student,
        loading,
        stats,
        allTimeHistory,
        // actions
        loadStudent,
        reload,
        clearStudent,
        fetchAllTimeHistory,
    }
}


