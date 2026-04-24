import { ref, computed, watch } from 'vue'
import { getEventsByClass } from '../db/eventService.js'

export function useAttendanceInsights(classIdRef, assessmentsRef, gradesRef) {
  const classEvents = ref([])
  
  // Fetch events when class changes
  watch(classIdRef, async (newId) => {
    if (newId) {
      classEvents.value = await getEventsByClass(newId)
    } else {
      classEvents.value = []
    }
  }, { immediate: true })

  const assessmentAbsenceMap = computed(() => {
    const map = {}
    if (!classEvents.value.length || !assessmentsRef.value.length) return map

    // Only care about absences
    const absences = classEvents.value.filter(e => e.code === 'a' && !e.superseded)

    for (const a of assessmentsRef.value) {
      if (!a.date) continue
      const aDate = a.date.split('T')[0]

      for (const event of absences) {
        if (event.timestamp && event.timestamp.startsWith(aDate)) {
          if (!map[event.studentId]) map[event.studentId] = {}
          map[event.studentId][a.assessmentId] = true
        }
      }
    }

    return map
  })

  const studentAbsenceTotals = computed(() => {
    const totals = {}
    const absences = classEvents.value.filter(e => e.code === 'a' && !e.superseded)

    for (const event of absences) {
      const sId = event.studentId
      if (!totals[sId]) totals[sId] = { total: 0, testDays: 0 }
      
      totals[sId].total += 1

      // Check if this date matches any assessment date
      const eDate = event.timestamp.split('T')[0]
      const isTestDay = assessmentsRef.value.some(a => a.date && a.date.split('T')[0] === eDate)
      
      if (isTestDay) {
        totals[sId].testDays += 1
      }
    }

    return totals
  })

  const attendanceCorrelationStats = computed(() => {
    // Threshold for "High" vs "Low" attendance (>= 5 means Low Attendance / High Absenteeism)
    const THRESHOLD = 5
    
    const stats = {
      highAttendanceAvg: null,
      lowAttendanceAvg: null,
      highCount: 0,
      lowCount: 0
    }

    if (!gradesRef.value || Object.keys(gradesRef.value).length === 0) return stats

    const highGrades = []
    const lowGrades = []

    for (const [studentId, gradeObj] of Object.entries(gradesRef.value)) {
      if (!gradeObj || gradeObj.overallGrade === null || gradeObj.overallGrade === undefined) continue
      
      const absCount = studentAbsenceTotals.value[studentId]?.total || 0
      
      if (absCount >= THRESHOLD) {
        lowGrades.push(gradeObj.overallGrade)
      } else {
        highGrades.push(gradeObj.overallGrade)
      }
    }

    if (highGrades.length > 0) {
      stats.highAttendanceAvg = Math.round(highGrades.reduce((a, b) => a + b, 0) / highGrades.length)
      stats.highCount = highGrades.length
    }
    
    if (lowGrades.length > 0) {
      stats.lowAttendanceAvg = Math.round(lowGrades.reduce((a, b) => a + b, 0) / lowGrades.length)
      stats.lowCount = lowGrades.length
    }

    return stats
  })

  return {
    assessmentAbsenceMap,
    studentAbsenceTotals,
    attendanceCorrelationStats
  }
}
