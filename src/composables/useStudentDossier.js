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
import { getDateBoundary } from '../db/eventService.js'

export function useStudentDossier() {

    // ─── selection state ──────────────────────────────────────────────────────

    const selectedStudentId = ref(null)
    const selectedClassId = ref(null)
    const selectedPeriod = ref('month')  // 'week' | 'month' | 'semester' | 'all'

    // ─── sidebar roster ───────────────────────────────────────────────────────

    /** Raw students map from the class currently shown in the sidebar */
    const _sidebarClassRecord = ref(null)

    /** Sorted array for the sidebar student list */
    const sidebarStudents = computed(() => {
        const cls = _sidebarClassRecord.value
        if (!cls?.students) return []
        return Object.entries(cls.students)
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
        if (!classId) { _sidebarClassRecord.value = null; return }
        try {
            _sidebarClassRecord.value = await classService.getClass(classId)
        } catch (err) {
            console.error('useStudentDossier.loadSidebarClass failed:', err)
            _sidebarClassRecord.value = null
        }
    }

    // ─── dossier data ─────────────────────────────────────────────────────────

    const events = ref([])
    const student = ref(null) // full student object including generalNote
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
            const [cls] = await Promise.all([
                classService.getClass(classId),
                _fetchEvents(),
            ])
            student.value = cls?.students?.[studentId] ?? null
        } catch (err) {
            console.error('useStudentDossier.loadStudent failed:', err)
            events.value = []
            student.value = null
        } finally {
            loading.value = false
        }
    }

    async function _fetchEvents() {
        if (!selectedStudentId.value) return
        const boundary = getDateBoundary(selectedPeriod.value)
        const range = boundary ? { from: boundary } : {}
        events.value = await eventService.getEventsByStudent(selectedStudentId.value, range)
    }

    // Re-fetch when period changes (student already loaded)
    watch(selectedPeriod, async () => {
        if (!selectedStudentId.value) return
        loading.value = true
        try {
            await _fetchEvents()
        } finally {
            loading.value = false
        }
    })

    // ─── computed stats ───────────────────────────────────────────────────────

    const stats = computed(() => {
        const e = events.value.filter(ev => !ev.superseded)

        const washroomEvents = e.filter(ev => ev.code === 'w' && ev.duration != null)
        const absences = e.filter(ev => ev.code === 'a').length
        const lates = e.filter(ev => ev.code === 'l')
        const redirects = e.filter(ev => ev.category === 'redirect').length
        const parentContacts = e.filter(ev => ev.code === 'pc')
        const noteEvents = e.filter(ev => ev.note)

        return {
            washroomTrips: washroomEvents.length,
            washroomMinutes: Math.round(
                washroomEvents.reduce((sum, ev) => sum + (ev.duration || 0), 0) / 60000
            ),
            avgWashroomMinutes: washroomEvents.length
                ? (washroomEvents.reduce((sum, ev) => sum + (ev.duration || 0), 0) / washroomEvents.length / 60000).toFixed(1)
                : 0,
            absences,
            lateCount: lates.length,
            avgLateMinutes: lates.length
                ? Math.round(lates.reduce((s, ev) => s + (ev.duration || 0), 0) / lates.length)
                : 0,
            redirects,
            parentContactCount: parentContacts.length,
            noteCount: noteEvents.length,
            assessmentConversations: assessmentEvents.value.length,
            demonstratesUnderstanding: assessmentEvents.value.filter(e => e.acOutcome === 'demonstrates_understanding').length,
            gapConfirmed: assessmentEvents.value.filter(e => e.acOutcome === 'gap_confirmed').length,
        }
    })

    // ─── Assessment / Note feeds ───────────────────────────────────────────

    /** Assessment conversations — separate from general noteEvents */
    const assessmentEvents = computed(() =>
        [...events.value]
            .filter(e => e.code === 'ac')
            .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
    )

    /** General notes — ob/cv merged note code and pc, excluding ac */
    const noteEvents = computed(() =>
        [...events.value]
            .filter(e => e.note && e.code !== 'ac')
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

    async function reload() {
        if (!selectedClassId.value || !selectedStudentId.value) return
        await loadStudent(selectedClassId.value, selectedStudentId.value)
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
        noteEvents,
        weeklyTrend,
        trendCategories,
        student,
        loading,
        stats,
        assessmentEvents,
        // actions
        loadStudent,
        reload,
        clearStudent,
    }
}


