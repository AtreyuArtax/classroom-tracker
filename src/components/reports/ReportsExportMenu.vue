<template>
  <div class="reports__export-group" ref="exportContainer">
    <button class="reports__btn-export" @click="showExportMenu = !showExportMenu">
      <Download :size="16" /> Export Summary
    </button>
    <div v-if="showExportMenu" class="reports__export-menu">
      <button @click="downloadAggregateCsv('attendance')">Attendance</button>
      <button @click="downloadAggregateCsv('washroom')">Washroom</button>
      <button @click="downloadAggregateCsv('behavior')">Behavior</button>
      <button @click="downloadReportCardCsv(true)">Comments (names)</button>
      <button @click="downloadReportCardCsv(false)">Comments (no names)</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { Download } from 'lucide-vue-next'
import { useMessage } from '../../composables/useMessage.js'
import { formatLocalDisplay } from '../../utils/dates.js'
import { formatQualitativeEvidenceForReport } from '../../utils/reportFormatter.js'
import { 
  loadGradebook, 
  assessments, 
  gradeMap, 
  filteredMilestones, 
  globalMilestones 
} from '../../composables/useGradebook.js'
import { 
  getDateRangeForClassPeriod, 
  getEventsByClass, 
  toMinutes 
} from '../../db/eventService.js'

const props = defineProps({
  reportClass: { type: Object, default: null },
  selectedPeriod: { type: String, default: 'week' },
  academicTerms: { type: Array, default: () => [] },
  sidebarStudents: { type: Array, default: () => [] },
  sidebarClassId: { type: String, required: true },
  allClassEvents: { type: Array, default: () => [] },
  classGrades: { type: Object, default: () => ({}) },
  reportData: { type: Array, default: () => [] },
  behaviorCodes: { type: Array, default: () => [] },
  behaviorCodesMap: { type: Object, default: () => ({}) },
  reportStudents: { type: Object, default: () => ({}) }
})

const { alert, confirm, select } = useMessage()

const showExportMenu = ref(false)
const exportContainer = ref(null)

function handleClickOutside(event) {
  if (exportContainer.value && !exportContainer.value.contains(event.target)) {
    showExportMenu.value = false
  }
}

watch(showExportMenu, (isOpen) => {
  if (isOpen) {
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside)
    }, 0)
  } else {
    window.removeEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

async function downloadReportCardCsv(includeName) {
  showExportMenu.value = false
  const classObj = props.reportClass
  if (!classObj) return
  
  const reportType = await select(
    'Select the report card term for this comment export.',
    ['Midterm', 'Final'],
    'Select Report Type'
  )
  if (!reportType) return
  
  const className = classObj.name ?? 'Class'
  const date = new Date().toISOString().slice(0, 10)
  const filename = `${className}-report-card-comments-${reportType.toLowerCase()}-${includeName ? 'with-names' : 'anonymous'}-${date}.csv`
  
  try {
    await loadGradebook(classObj)
  } catch (err) {
    console.error('[CSV Export] Failed to load gradebook:', err)
    await alert('Failed to load gradebook data for export: ' + err.message)
    return
  }
  
  let classEvents = props.allClassEvents
  if (!classEvents || classEvents.length === 0) {
    try {
      const activeStudentIds = new Set(props.sidebarStudents.map(s => s.studentId))
      const allEventsRaw = await getEventsByClass(props.sidebarClassId)
      classEvents = allEventsRaw.filter(e => activeStudentIds.has(e.studentId))
    } catch (err) {
      console.error('[CSV Export] Failed to load class events:', err)
      classEvents = []
    }
  }
  
  const dr = getDateRangeForClassPeriod(props.selectedPeriod, props.reportClass, props.academicTerms)
  const classCode = classObj.courseCode ? ` (${classObj.courseCode})` : ''
  
  const midtermMs = filteredMilestones.value?.find(m => m.name?.toLowerCase() === 'midterm') || 
                    globalMilestones.value?.find(m => m.name?.toLowerCase() === 'midterm')
  const midtermDate = midtermMs?.date || 'N/A'
  
  let csvContent = includeName 
    ? 'Student,Course,Progress Summary\r\n'
    : 'Row,Course,Progress Summary\r\n'
    
  props.sidebarStudents.forEach((studentItem, index) => {
    const sId = studentItem.studentId
    const s = classObj.students[sId]
    if (!s) return
    
    try {
      const header = includeName
        ? `Student Name: ${s.firstName} ${s.lastName}${classCode}`
        : `Student${classCode} — Progress Summary`
        
      const studentGrades = props.classGrades?.[sId] || {}
      const overallGrade = studentGrades.overallGrade ?? null
      const formattedGrade = overallGrade !== null ? `${Math.round(overallGrade)}%` : 'N/A'
      
      const studentEvents = classEvents.filter(e => {
        if (e.studentId !== sId) return false
        if (dr.from && e.timestamp < dr.from) return false
        if (dr.to && e.timestamp > dr.to + 'T23:59:59') return false
        return true
      })
      const nonSupersededEvents = studentEvents.filter(e => !e.superseded)
      const absences = nonSupersededEvents.filter(e => e.code === 'a').length
      const lates = nonSupersededEvents.filter(e => e.code === 'l').length
      
      const studentAssessments = assessments.value
        .map(a => {
          const g = gradeMap.value[a.assessmentId]?.[sId]
          return {
            ...a,
            score: g?.resolvedScore ?? null,
            attempts: g?.attempts || [],
            missing: g?.missing,
            excluded: g?.excluded
          }
        })
        .filter(a => !a.excluded && (a.target !== 'individual' || (a.target === 'individual' && String(a.targetStudentId) === String(sId))))
        
      const academicList = studentAssessments
        .filter(a => a.score !== null || a.missing || a.attempts?.some(att => att.comment?.trim()))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        
      let boundaryInserted = false
      const academicLines = []
      academicList.forEach(a => {
        if (midtermDate !== 'N/A' && a.date > midtermDate && !boundaryInserted) {
          academicLines.push('--- MIDTERM CUTOFF BOUNDARY ---')
          boundaryInserted = true
        }
        const displayDate = formatLocalDisplay(a.date, { month: 'short', day: 'numeric' })
        const unit = classObj.gradebookUnits?.find(u => u.unitId === a.unitId)
        const unitPrefix = unit ? `[${unit.name}] ` : ''
        
        let line = `- ${displayDate} - ${unitPrefix}${a.name}: `
        if (a.missing) {
          line += 'Missing'
        } else if (a.score !== null) {
          line += `${Math.round((a.score / (a.totalPoints || 1)) * 100)}%`
        } else {
          line += 'Ungraded'
        }

        if (a.attempts?.length > 1) {
          const history = a.attempts
            .map(att => {
              if (att.pointsEarned === null || att.pointsEarned === undefined) return 'Ungraded'
              return Math.round((att.pointsEarned / (a.totalPoints || 1)) * 100) + '%'
            })
            .join(', ')
          line += ` (Attempts history: ${history})`
        }
        const comments = (a.attempts || [])
          .map((att, idx) => {
            const trimmed = att.comment?.trim()
            if (!trimmed) return null
            if ((a.attempts || []).length === 1) return `[Note] ${trimmed}`
            if (att.pointsEarned === null || att.pointsEarned === undefined) {
              return `[Note - Attempt ${idx + 1}] ${trimmed}`
            }
            const pct = Math.round((att.pointsEarned / (a.totalPoints || 1)) * 100)
            return `[Note - Attempt ${idx + 1} (${pct}%)] ${trimmed}`
          })
          .filter(Boolean)
        
        comments.forEach(c => {
          line += `\n  ↳ ${c}`
        })
        academicLines.push(line)
      })
      
      const results = studentGrades.categoryResults || {}
      const categoryLines = (classObj.gradebookCategories || []).map(cat => {
        const score = results[cat.categoryId]?.percentage ?? null
        return `- ${cat.name}: ${score !== null ? Math.round(score) + '%' : 'N/A'}`
      })
      
      const judgmentLines = formatQualitativeEvidenceForReport(studentEvents, classObj)
      
      const notesLine = s.gradebookNote?.trim() || 'None'
      
      const textLines = [
        header
      ]
      if (classObj.courseCode) {
        textLines.push(`Course: ${classObj.courseCode}`)
      }
      textLines.push(`Current Grade: ${formattedGrade}`)
      if (midtermDate !== 'N/A') {
        textLines.push(`Midterm Cutoff Date: ${midtermDate}`)
      }
      textLines.push(`Report Type: ${reportType}`)
      textLines.push(`Attendance: ${absences} Absences, ${lates} Lates`)
      textLines.push('')
      textLines.push('Gradebook Log (Chronological):')
      textLines.push(...academicLines)
      textLines.push('')
      textLines.push('Category Averages:')
      textLines.push(...categoryLines)
      textLines.push('')
      textLines.push('Professional Judgment (Observations & Conversations):')
      textLines.push(...judgmentLines)
      textLines.push('')
      textLines.push('Teacher Working Notes (Comment Ideas):')
      textLines.push(notesLine)
      
      const text = textLines.join('\r\n')
      
      const escapedText = `"${text.replace(/"/g, '""')}"`
      const escapedCourse = `"${(classObj.courseCode || '').replace(/"/g, '""')}"`
      
      if (includeName) {
        const escapedName = `"${`${s.lastName}, ${s.firstName}`.replace(/"/g, '""')}"`
        csvContent += `${escapedName},${escapedCourse},${escapedText}\r\n`
      } else {
        csvContent += `${index + 1},${escapedCourse},${escapedText}\r\n`
      }
    } catch (studentErr) {
      console.error(`[CSV Export] Error generating comment block for student ${sId}:`, studentErr)
      const fallbackText = `"${`Error compiling progress summary for ${s.firstName} ${s.lastName}: ${studentErr.message}`.replace(/"/g, '""')}"`
      const escapedCourse = `"${(classObj.courseCode || '').replace(/"/g, '""')}"`
      if (includeName) {
        const escapedName = `"${`${s.lastName}, ${s.firstName}`.replace(/"/g, '""')}"`
        csvContent += `${escapedName},${escapedCourse},${fallbackText}\r\n`
      } else {
        csvContent += `${index + 1},${escapedCourse},${fallbackText}\r\n`
      }
    }
  })
  
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadAggregateCsv(section) {
  showExportMenu.value = false
  const classObj = props.reportClass
  const className = classObj?.name ?? 'Class'
  const date = new Date().toISOString().slice(0, 10)
  
  let filename = `${className}-${section}-${date}.csv`
  let csvContent = ''

  if (section === 'attendance') {
    const summary = {}
    const studentsMap = props.reportStudents
    props.reportData.forEach(evt => {
      if ((evt.code === 'a' || evt.code === 'l') && !evt.superseded) {
        if (!summary[evt.studentId]) {
          summary[evt.studentId] = { absences: 0, testDayAbsences: 0, lates: 0, testDayLates: 0, lateTotalMins: 0, lateCount: 0 }
        }
        if (evt.code === 'a') {
          summary[evt.studentId].absences++
          if (evt.testDay) summary[evt.studentId].testDayAbsences++
        }
        else if (evt.code === 'l') {
          summary[evt.studentId].lates++
          if (evt.testDay) summary[evt.studentId].testDayLates++
          if (evt.duration != null) {
            summary[evt.studentId].lateTotalMins += toMinutes(evt.duration)
            summary[evt.studentId].lateCount++
          }
        }
      }
    })
    
    csvContent = 'Student,Absences,Test Day Absences,Lates,Test Day Lates,Avg Late (min)\n'
    Object.entries(studentsMap).forEach(([id, s]) => {
      const stats = summary[id] || { absences: 0, testDayAbsences: 0, lates: 0, testDayLates: 0, lateTotalMins: 0, lateCount: 0 }
      const avg = stats.lateCount > 0 ? (stats.lateTotalMins / stats.lateCount).toFixed(1) : 0
      csvContent += `"${s.lastName}, ${s.firstName}",${stats.absences},${stats.testDayAbsences},${stats.lates},${stats.testDayLates},${avg}\n`
    })

  } else if (section === 'washroom') {
    const summary = {}
    const washCodes = props.behaviorCodes.filter(c => c.type === 'toggle').map(c => c.codeKey)
    const studentsMap = props.reportStudents
    props.reportData.forEach(evt => {
      if (washCodes.includes(evt.code) && evt.duration != null) {
        if (!summary[evt.studentId]) {
          summary[evt.studentId] = { trips: 0, testDayTrips: 0, totalMins: 0 }
        }
        summary[evt.studentId].trips++
        if (evt.testDay) summary[evt.studentId].testDayTrips++
        summary[evt.studentId].totalMins += toMinutes(evt.duration)
      }
    })
    
    csvContent = 'Student,Trips,Test Day Trips,Total Duration (min),Avg Duration (min)\n'
    Object.entries(studentsMap).forEach(([id, s]) => {
      const stats = summary[id] || { trips: 0, testDayTrips: 0, totalMins: 0 }
      const totalMin = stats.totalMins.toFixed(1)
      const avg = stats.trips > 0 ? (stats.totalMins / stats.trips).toFixed(1) : '0.0'
      csvContent += `"${s.lastName}, ${s.firstName}",${stats.trips},${stats.testDayTrips},${totalMin},${avg}\n`
    })

  } else if (section === 'behavior') {
    const summary = {}
    const studentsMap = props.reportStudents
    const washCodes = props.behaviorCodes.filter(c => c.type === 'toggle').map(c => c.codeKey)
    
    props.reportData.forEach(evt => {
      if (evt.category !== 'attendance' && !washCodes.includes(evt.code)) {
        if (!summary[evt.studentId]) {
          summary[evt.studentId] = { counts: {}, redirects: 0, parentContacts: 0 }
        }
        summary[evt.studentId].counts[evt.code] = (summary[evt.studentId].counts[evt.code] ?? 0) + 1
        if (evt.category === 'redirect') summary[evt.studentId].redirects++
        if (props.behaviorCodesMap[evt.code]?.label?.toLowerCase().includes('parent')) summary[evt.studentId].parentContacts++
      }
    })
    
    csvContent = 'Student,Top Code,Redirect Incidents,Parent Contacts\n'
    Object.entries(studentsMap).forEach(([id, s]) => {
      const stats = summary[id] || { counts: {}, redirects: 0, parentContacts: 0 }
      let topCode = '—'
      let max = 0
      Object.entries(stats.counts).forEach(([code, count]) => {
        if (count > max) {
          max = count
          topCode = code
        }
      })
      csvContent += `"${s.lastName}, ${s.firstName}",${topCode},${stats.redirects},${stats.parentContacts}\n`
    })
  }

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.reports__export-group {
  position: relative;
}

.reports__btn-export {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text);
  transition: all 0.2s ease;
}

.reports__btn-export:hover {
  background: var(--bg-secondary);
  border-color: var(--primary);
}

.reports__export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  min-width: 180px;
  z-index: 100;
  padding: 4px 0;
}

.reports__export-menu button {
  padding: 8px 14px;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s ease;
}

.reports__export-menu button:hover {
  background: var(--bg-secondary);
  color: var(--primary);
}
</style>
