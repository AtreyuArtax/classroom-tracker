/**
 * src/utils/emailFormatter.js
 *
 * Mobile-Safe Plain-Text and Rich HTML Email Generator for Classroom Tracker
 *
 * Design Guidelines:
 * 1. Mobile email clients (iOS Mail, Outlook Mobile, Gmail) render plain-text in
 *    proportional (variable-width) fonts, NOT monospace.
 * 2. Mobile portrait screens wrap lines beyond 32–38 characters.
 * 3. Never use multi-column ASCII tables (│, ┌, └) — they break into illegible wraps.
 * 4. Use single-column stacked cards with horizontal dividers capped at 36 characters.
 * 5. Keep mailto: URLs within OS/browser limits (~1,900 chars safe limit).
 */

export const DIVIDER_DOUBLE = '====================================' // 36 chars
export const DIVIDER_SINGLE = '------------------------------------' // 36 chars

/**
 * Creates a compact Unicode block progress bar.
 * Example: makeMiniBar(80, 5) => "████░"
 *
 * @param {number|string|null|undefined} percent - Value between 0 and 100 (or string like "85%")
 * @param {number} [totalBlocks=5] - Total number of blocks (default: 5)
 * @param {string} [filledChar='█'] - Full block character (U+2588)
 * @param {string} [emptyChar='░'] - Light shade character (U+2591)
 * @returns {string} - String of block characters
 */
export function makeMiniBar(percent, totalBlocks = 5, filledChar = '█', emptyChar = '░') {
  if (percent === null || percent === undefined || percent === '') {
    return emptyChar.repeat(totalBlocks)
  }

  const numeric = typeof percent === 'number' 
    ? percent 
    : parseFloat(String(percent).replace(/[^0-9.-]/g, ''))

  if (isNaN(numeric)) {
    return emptyChar.repeat(totalBlocks)
  }

  const clamped = Math.min(100, Math.max(0, numeric))
  const filledCount = Math.min(totalBlocks, Math.max(0, Math.round((clamped / 100) * totalBlocks)))
  const emptyCount = totalBlocks - filledCount

  return filledChar.repeat(filledCount) + emptyChar.repeat(emptyCount)
}

/**
 * Normalizes numeric or string percentage values into clean display strings.
 * @param {number|string|null|undefined} val
 * @returns {{ num: number|null, str: string }}
 */
function normalizePercent(val) {
  if (val === null || val === undefined || val === '') {
    return { num: null, str: 'N/A' }
  }
  const cleanStr = String(val).trim().replace(/%+$/, '')
  const num = parseFloat(cleanStr)
  if (isNaN(num)) {
    return { num: null, str: String(val).trim() }
  }
  return { num, str: `${Math.round(num)}%` }
}

/**
 * Wraps or truncates a text line so it does not exceed the target mobile character width.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function fitLine(text, maxLen = 36) {
  if (!text || text.length <= maxLen) return text || ''
  return text.slice(0, maxLen - 1) + '…'
}

/**
 * Checks whether an assessment is an administrative/logistics task
 * (e.g., Science Safety Contract, textbook return, permission slips)
 * that should be excluded from academic progress reports.
 *
 * @param {Object} a
 * @returns {boolean}
 */
export function isAdministrativeAssessment(a) {
  if (!a) return false
  if (typeof a === 'string') return false
  if (a.purpose === 'administrative') return true
  const cat = String(a.category || '').trim().toLowerCase()
  return cat === 'admin' || cat === 'administrative'
}

/**
 * Normalizes missing assessments into clean, non-administrative items with name and optional date.
 * @param {Object} studentData
 * @returns {Array<{ name: string, date: string, category: string }>}
 */
export function getCleanMissingAssessments(studentData = {}) {
  const rawList = Array.isArray(studentData.missingAssessments)
    ? studentData.missingAssessments
    : []

  return rawList
    .filter(item => {
      if (!item) return false
      if (typeof item === 'string') return item.trim().length > 0
      return !isAdministrativeAssessment(item)
    })
    .map(item => {
      if (typeof item === 'string') {
        return { name: item.trim(), date: '', category: '' }
      }
      return {
        name: item.name || item.title || 'Untitled Assessment',
        date: item.date || item.dueDate || '',
        category: item.category || ''
      }
    })
}

/**
 * Assembles a mobile-safe plain-text email body according to the 36-character card layout.
 *
 * @param {Object} studentData
 * @param {string} [studentData.name] - Student's name (e.g., "Alex Smith")
 * @param {string} [studentData.studentName] - Alternative alias for name
 * @param {string} [studentData.course] - Course title or code (e.g., "Grade 10 Civics")
 * @param {string} [studentData.courseInfo] - Alternative alias for course
 * @param {string} [studentData.teacher] - Teacher name
 * @param {string} [studentData.teacherName] - Alternative alias for teacher
 * @param {string} [studentData.department] - School department (optional)
 * @param {string|Date} [studentData.reportDate] - Date of report (optional, defaults to current date)
 * @param {number|string} [studentData.overallGrade] - Overall percentage grade or SBAR level
 * @param {number|string} [studentData.goalGrade] - Optional goal/target grade
 * @param {Array<Object>} [studentData.recentAssessments] - List of recent assessments
 * @param {number|Array} [studentData.missingAssessments] - Missing count or list of missing items
 * @param {number} [studentData.missingCount] - Explicit count of missing assessments
 * @param {Object} [studentData.attendance] - Attendance stats { rate, absences, lates }
 * @param {Object} [studentData.outOfClass] - Washroom/out-of-class stats { trips, minutes }
 * @param {string} [studentData.closingNote] - Optional custom sign-off message
 * @param {Object} [options] - Configuration options
 * @param {number} [options.maxAssessments=5] - Maximum recent assessments to include (guards against mailto overflow)
 * @param {boolean} [options.includeAssessments=true]
 * @param {boolean} [options.includeMissing=true]
 * @param {boolean} [options.includeAttendance=true]
 * @param {boolean} [options.includeWashroom=true]
 * @param {boolean} [options.includeGrade=true]
 * @returns {string} - Plain-text email body formatted for mobile viewports
 */
export function generateMobileSafeEmailBody(studentData = {}, options = {}) {
  const {
    maxAssessments = 5,
    includeAssessments = true,
    includeMissing = true,
    includeAttendance = true,
    includeWashroom = true,
    includeGrade = true
  } = options

  const studentName = studentData.name || studentData.studentName || 'Student'
  const courseInfo = studentData.course || studentData.courseInfo || ''
  const teacherName = studentData.teacher || studentData.teacherName || 'Teacher'
  const teacherTitle = studentData.teacherTitle || studentData.title || ''
  const schoolName = studentData.schoolName || studentData.school || ''
  const teacherEmail = studentData.teacherEmail || studentData.email || ''
  const department = studentData.department || ''
  const includeWorkingHours = studentData.includeWorkingHoursStatement ?? options.includeWorkingHoursStatement ?? false
  
  // Date formatting
  let reportDate = studentData.reportDate
  if (!reportDate) {
    const now = new Date()
    reportDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } else if (reportDate instanceof Date) {
    reportDate = reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Calculate missing assessment list & count (excluding administrative tasks)
  const missingList = getCleanMissingAssessments(studentData)
  const missingCount = missingList.length > 0
    ? missingList.length
    : (typeof studentData.missingCount === 'number' ? studentData.missingCount : 0)

  const sections = []

  // ── 1. WARM GREETING & INTRO ─────────────────────────────────────
  const courseStr = courseInfo ? ` in ${courseInfo}` : ''
  sections.push(`Hello,\n\nHere is a quick progress update for ${studentName}${courseStr} (as of ${reportDate}):`)

  // ── 2. CURRENT STANDING & MISSING WORK SUMMARY ───────────────────
  if (includeGrade || includeMissing) {
    const standingLines = ['Current Standing:']

    if (includeGrade) {
      if (studentData.isSbar) {
        const badge = studentData.sbarOverallBadge || {}
        standingLines.push(`• Overall Level: Level ${badge.level || '—'} (${badge.label || 'Not Assessed'})`)
      } else if (studentData.overallGrade !== undefined && studentData.overallGrade !== null) {
        const { str } = normalizePercent(studentData.overallGrade)
        standingLines.push(`• Overall Grade: ${str}`)
      }
    }

    if (includeMissing) {
      if (missingCount === 0) {
        standingLines.push('• Missing Work: None currently outstanding')
      } else {
        standingLines.push(`• Missing Work: ${missingCount} assessment${missingCount === 1 ? '' : 's'} currently outstanding`)
      }
    }

    if (standingLines.length > 1) {
      sections.push(standingLines.join('\n'))
    }
  }

  // ── 3. MISSING ASSESSMENTS LIST (EXPLICIT NAMES) ──────────────────
  if (includeMissing && missingList.length > 0) {
    const missingLines = ['Missing Work:']
    missingList.forEach(m => {
      const dateStr = m.date ? ` (${m.date})` : ''
      missingLines.push(`• ${m.name}${dateStr}`)
    })
    sections.push(missingLines.join('\n'))
  }

  // ── 4. RECENT ASSESSMENTS / EXPECTATION MASTERY ──────────────────
  if (includeAssessments) {
    if (studentData.isSbar && Array.isArray(studentData.sbarExpectations) && studentData.sbarExpectations.length > 0) {
      const expLines = ['Curriculum Expectations:']
      const displayExps = studentData.sbarExpectations.slice(0, maxAssessments)

      displayExps.forEach(exp => {
        const code = exp.code || 'Expectation'
        const level = exp.badge?.level || '—'
        let line = `• ${code}: Level ${level}`
        if (exp.evaluations && exp.evaluations.length > 0) {
          const history = exp.evaluations.slice(-3).map(e => e.badge?.level || '—').join(' ➔ ')
          line += ` (Progression: ${history})`
        }
        expLines.push(line)
      })

      sections.push(expLines.join('\n'))
    } else {
      const rawList = (Array.isArray(studentData.recentAssessments) ? studentData.recentAssessments : [])
        .filter(a => !isAdministrativeAssessment(a))
      const displayList = rawList.slice(0, maxAssessments)

      if (displayList.length > 0) {
        const assessmentLines = ['Recent Assessments:']

        displayList.forEach(a => {
          const dateStr = a.date || ''
          const nameStr = a.name || 'Assessment'
          
          let scoreStr = ''
          if (a.score !== undefined && a.score !== null) {
            if (a.totalPoints) {
              const pct = Math.round((Number(a.score) / Number(a.totalPoints)) * 100)
              scoreStr = `${pct}%`
            } else {
              scoreStr = normalizePercent(a.score).str
            }
          }

          const catStr = a.category ? ` (${a.category})` : ''
          const prefix = dateStr ? `${dateStr}: ` : ''
          assessmentLines.push(`• ${prefix}${nameStr} — ${scoreStr}${catStr}`)
        })

        sections.push(assessmentLines.join('\n'))
      }
    }
  }

  // ── 5. ATTENDANCE & ENGAGEMENT ────────────────────────────────────
  if (includeAttendance || includeWashroom) {
    const attendanceLines = ['Attendance & Engagement:']
    const att = studentData.attendance || {}
    const wash = studentData.outOfClass || {}

    if (includeAttendance) {
      if (att.rate !== undefined && att.rate !== null) {
        const { str } = normalizePercent(att.rate)
        attendanceLines.push(`• Attendance Rate: ${str}`)
      }

      const absences = att.absences ?? 0
      const lates = att.lates ?? 0
      attendanceLines.push(`• Classes Missed: ${absences}  |  Lates: ${lates}`)
    }

    if (includeWashroom) {
      const trips = wash.trips ?? wash.count ?? 0
      let washLine = `• Out-of-Class: ${trips} ${trips === 1 ? 'departure' : 'departures'}`
      if (wash.minutes && Number(wash.minutes) > 0) {
        washLine += ` (${wash.minutes} mins missed instruction time)`
      }
      attendanceLines.push(washLine)
    }

    if (includeAttendance) {
      attendanceLines.push('(Reflects all missed class time; official excused codes are tracked in PowerSchool.)')
    }

    sections.push(attendanceLines.join('\n'))
  }

  // ── 6. WARM CLOSING SIGN-OFF ──────────────────────────────────────
  const closingLines = [
    studentData.closingNote || "Please feel free to reach out if you have any questions.",
    '',
    'Best regards,',
    teacherName
  ]

  if (teacherTitle) {
    closingLines.push(teacherTitle)
  } else if (department) {
    closingLines.push(department)
  }

  if (schoolName) {
    closingLines.push(schoolName)
  }

  if (teacherEmail) {
    closingLines.push(teacherEmail)
  }

  if (includeWorkingHours) {
    closingLines.push('')
    closingLines.push('My working hours and your working hours may be different. Please do not feel obligated to reply outside your regular work hours.')
  }

  sections.push(closingLines.join('\n'))

  return sections.join('\n\n')
}

/**
 * Builds the complete mailto: URL with safe URL encoding and character limits.
 *
 * @param {Object} studentData
 * @param {Object} [options]
 * @param {boolean} [options.trigger=false] - If true, assigns to window.location.href
 * @returns {{ subject: string, body: string, mailtoUrl: string, urlLength: number, isSafeLength: boolean, openMailClient: Function }}
 */
export function generateMobileSafeEmail(studentData = {}, options = {}) {
  const studentName = studentData.name || studentData.studentName || 'Student'
  const subject = studentData.subject || `Progress Report: ${studentName}`
  const body = generateMobileSafeEmailBody(studentData, options)

  let recipientStr = ''
  if (Array.isArray(studentData.recipients)) {
    recipientStr = studentData.recipients.filter(Boolean).join(',')
  } else if (typeof studentData.recipients === 'string') {
    recipientStr = studentData.recipients
  }

  const encodedSubject = encodeURIComponent(subject)
  const encodedBody = encodeURIComponent(body)
  const mailtoUrl = `mailto:${recipientStr}?subject=${encodedSubject}&body=${encodedBody}`

  const urlLength = mailtoUrl.length
  // Typical OS ShellExecute and browser mailto: limit is ~2000 chars
  const isSafeLength = urlLength <= 1900

  const openMailClient = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = mailtoUrl
    }
  }

  if (options.trigger) {
    openMailClient()
  }

  return {
    subject,
    body,
    mailtoUrl,
    urlLength,
    isSafeLength,
    openMailClient
  }
}

/**
 * Generates an alternative rich HTML email card format for pasting into
 * email clients (Outlook, Gmail) with genuine CSS styling and colored progress bars.
 *
 * @param {Object} studentData
 * @returns {string} Clean HTML string with inline CSS
 */
export function generateRichEmailHtml(studentData = {}, options = {}) {
  const {
    maxAssessments = 5,
    includeGrade = true,
    includeAssessments = true,
    includeMissing = true,
    includeAttendance = true,
    includeWashroom = true
  } = options

  const studentName = studentData.name || studentData.studentName || 'Student'
  const courseInfo = studentData.course || studentData.courseInfo || ''
  const teacherName = studentData.teacher || studentData.teacherName || 'Teacher'
  const teacherTitle = studentData.teacherTitle || studentData.title || ''
  const schoolName = studentData.schoolName || studentData.school || ''
  const teacherEmail = studentData.teacherEmail || studentData.email || ''
  const department = studentData.department || ''
  const includeWorkingHours = studentData.includeWorkingHoursStatement ?? options.includeWorkingHoursStatement ?? false

  let reportDate = studentData.reportDate
  if (!reportDate) {
    reportDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } else if (reportDate instanceof Date) {
    reportDate = reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isSbar = Boolean(studentData.isSbar)
  const sbarBadge = studentData.sbarOverallBadge || {}
  const sbarLevel = sbarBadge.level || '—'
  const sbarLabel = sbarBadge.label || (sbarLevel === '—' ? 'Not Assessed' : '')
  const sbarBadgeColor = (sbarBadge.color && !sbarBadge.color.startsWith('var('))
    ? sbarBadge.color
    : (sbarLevel === '—' ? '#64748b' : '#3b82f6')
  const cleanLevel = String(sbarLevel).trim()
  const displayLevel = cleanLevel.startsWith('Level') ? cleanLevel : `Level ${cleanLevel}`
  const sbarBadgeText = sbarLabel && sbarLabel !== displayLevel && sbarLabel !== cleanLevel
    ? `${displayLevel} (${sbarLabel})`
    : displayLevel

  const { num: gradeNum, str: gradeStr } = normalizePercent(studentData.overallGrade)
  const att = studentData.attendance || {}
  const { num: attNum, str: attStr } = normalizePercent(att.rate)
  const wash = studentData.outOfClass || {}

  const missingList = getCleanMissingAssessments(studentData)
  const missingCount = missingList.length > 0
    ? missingList.length
    : (typeof studentData.missingCount === 'number' ? studentData.missingCount : 0)

  const hasSbarExpectations = Boolean(isSbar && Array.isArray(studentData.sbarExpectations) && studentData.sbarExpectations.length > 0)

  const rawList = (Array.isArray(studentData.recentAssessments) ? studentData.recentAssessments : [])
    .filter(a => !isAdministrativeAssessment(a))

  const sbarExpectationsHtml = hasSbarExpectations
    ? studentData.sbarExpectations.slice(0, maxAssessments).map(exp => {
        const code = exp.code || 'Expectation'
        const expBadge = typeof exp.badge === 'string' ? { level: exp.badge } : (exp.badge || {})
        const expLevel = expBadge.level || exp.level || '—'
        const expColor = (expBadge.color && !expBadge.color.startsWith('var('))
          ? expBadge.color
          : (expLevel === '—' ? '#64748b' : '#3b82f6')
        const cleanExpLevel = String(expLevel).trim()
        const displayExpLevel = cleanExpLevel.startsWith('Level') ? cleanExpLevel : `Level ${cleanExpLevel}`

        let progressionHtml = ''
        if (Array.isArray(exp.evaluations) && exp.evaluations.length > 0) {
          const pills = exp.evaluations.slice(-3).map(e => {
            const eBadge = typeof e.badge === 'string' ? { level: e.badge } : (e.badge || {})
            const eLevel = eBadge.level || e.level || '—'
            const eColor = (eBadge.color && !eBadge.color.startsWith('var(')) ? eBadge.color : '#94a3b8'
            return `<span style="display:inline-block; padding:1px 6px; font-size:9pt; font-weight:700; border:1px solid ${eColor}; border-radius:8px; background:#f8fafc; color:#0f172a;">${eLevel}</span>`
          }).join(' <span style="color:#94a3b8; font-size:8pt;">➔</span> ')
          progressionHtml = `<div style="margin-top:3px; font-size:10pt; color:#64748b;">Progression: ${pills}</div>`
        }

        return `
      <tr>
        <td style="padding:7px 0; border-bottom:1px solid #f1f5f9; font-size:12pt; text-align:left; vertical-align:middle; word-break:break-word;">
          <strong>${code}</strong>${progressionHtml}
        </td>
        <td style="padding:7px 0; border-bottom:1px solid #f1f5f9; font-size:12pt; font-weight:bold; color:#0f172a; text-align:right; vertical-align:middle; white-space:nowrap; padding-left:12px;">
          <span style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:10pt; font-weight:bold; color:#ffffff; background-color:${expColor};">${displayExpLevel}</span>
        </td>
      </tr>`
      }).join('')
    : ''

  const assessmentsHtml = rawList.slice(0, maxAssessments).map(a => {
    let score = ''
    if (a.score !== undefined && a.score !== null) {
      if (a.totalPoints) {
        score = `${Math.round((Number(a.score) / Number(a.totalPoints)) * 100)}%`
      } else {
        score = normalizePercent(a.score).str
      }
    }
    const cat = a.category ? `<span style="color:#64748b; font-size:11pt;"> (${a.category})</span>` : ''
    const dateStr = a.date ? `<span style="color:#64748b; font-size:11pt; margin-right:6px;">${a.date}</span>&nbsp;` : ''
    
    return `
      <tr>
        <td style="padding:7px 0; border-bottom:1px solid #f1f5f9; font-size:12pt; text-align:left; vertical-align:middle; word-break:break-word;">
          ${dateStr}<strong>${a.name || 'Assessment'}</strong>${cat}
        </td>
        <td style="padding:7px 0; border-bottom:1px solid #f1f5f9; font-size:12pt; font-weight:bold; color:#0f172a; text-align:right; vertical-align:middle; white-space:nowrap; padding-left:12px;">
          ${score}
        </td>
      </tr>`
  }).join('')

  const missingRowsHtml = missingList.map(m => {
    const dateStr = m.date ? `&nbsp;<span style="color:#9a3412; font-size:11pt;">(${m.date})</span>` : ''
    return `
      <tr>
        <td style="padding:4px 0; font-size:12pt; color:#9a3412; text-align:left; vertical-align:middle; word-break:break-word;">
          • <strong>${m.name}</strong>${dateStr}
        </td>
      </tr>`
  }).join('')

  const gradeBarWidth = gradeNum !== null ? Math.min(100, Math.max(0, gradeNum)) : 0
  const attBarWidth = attNum !== null ? Math.min(100, Math.max(0, attNum)) : 0

  const hasAssessments = hasSbarExpectations || rawList.length > 0

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="500" style="width:500px; max-width:100%; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0f172a; border:1px solid #cbd5e1; border-radius:10px; overflow:hidden; background:#ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin:12px 0; border-collapse:separate;">
  <tr>
    <td style="padding:0; margin:0; border:none; background:#ffffff;">
      <!-- Header -->
      <div style="background:#1e293b; color:#ffffff; padding:16px 18px; border-top-left-radius:9px; border-top-right-radius:9px;">
        <div style="font-size:11pt; text-transform:uppercase; letter-spacing:0.05em; color:#94a3b8; font-weight:700;">Progress Report</div>
        <div style="font-size:16pt; font-weight:bold; margin-top:2px; color:#ffffff;">${studentName}</div>
        <div style="font-size:12pt; color:#cbd5e1; margin-top:3px;">${courseInfo}${courseInfo && teacherName ? ' • ' : ''}${teacherName}${schoolName ? ` • ${schoolName}` : ''}</div>
        <div style="font-size:11pt; color:#94a3b8; margin-top:3px;">Date: ${reportDate}</div>
      </div>

      <div style="padding:16px 18px 22px 18px;">
        <!-- Current Standing -->
        ${includeGrade && (isSbar || (studentData.overallGrade !== undefined && studentData.overallGrade !== null)) ? `
        <div style="margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid #e2e8f0;">
          <div style="font-size:11pt; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:8px; letter-spacing:0.04em;">Current Standing</div>
          ${isSbar ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; margin-bottom:6px;">
            <tr>
              <td style="font-size:12pt; color:#334155; text-align:left; vertical-align:middle; padding:0;">Overall Level:</td>
              <td style="font-size:14pt; font-weight:bold; color:#0f172a; text-align:right; vertical-align:middle; padding:0;">
                <span style="display:inline-block; padding:4px 12px; border-radius:12px; font-size:11pt; font-weight:bold; color:#ffffff; background-color:${sbarBadgeColor};">
                  ${sbarBadgeText}
                </span>
              </td>
            </tr>
          </table>` : `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; margin-bottom:6px;">
            <tr>
              <td style="font-size:12pt; color:#334155; text-align:left; vertical-align:middle; padding:0;">Overall Grade:</td>
              <td style="font-size:14pt; font-weight:bold; color:#0f172a; text-align:right; vertical-align:middle; padding:0;">${gradeStr}</td>
            </tr>
          </table>
          ${gradeNum !== null ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; height:8px; background-color:#e2e8f0; border-collapse:collapse; border-radius:4px; margin-top:4px;">
            <tr>
              <td style="width:${gradeBarWidth}%; background-color:#3b82f6; height:8px; border-radius:4px; font-size:1px; line-height:1px;">&nbsp;</td>
              <td style="width:${100 - gradeBarWidth}%; height:8px; font-size:1px; line-height:1px;">&nbsp;</td>
            </tr>
          </table>` : ''}
          `}
        </div>` : ''}

        <!-- Recent & Missing Assessments -->
        ${(includeAssessments && hasAssessments) || (includeMissing && (missingList.length > 0 || missingCount >= 0)) ? `
        <div style="margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid #e2e8f0;">
          ${includeAssessments && hasAssessments ? `
          <div style="font-size:11pt; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:8px; letter-spacing:0.04em;">
            ${hasSbarExpectations ? 'Curriculum Expectations' : 'Recent Assessments'}
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; margin-bottom:6px;">
            ${hasSbarExpectations ? sbarExpectationsHtml : assessmentsHtml}
          </table>` : ''}

          ${includeMissing ? `
            ${missingCount === 0 ? `
            <div style="margin-top:10px; font-size:12pt; font-weight:600; color:#16a34a;">
              ✔ No missing assessments at this time.
            </div>` : `
            <div style="margin-top:10px; padding:10px 14px; background-color:#fff7ed; border:1px solid #fed7aa; border-radius:6px;">
              <div style="font-size:12pt; font-weight:700; color:#c2410c; margin-bottom:${missingList.length > 0 ? '6px' : '0'};">
                ⚠ ${missingCount} assessment${missingCount === 1 ? '' : 's'} currently missing${missingList.length > 0 ? ':' : '.'}
              </div>
              ${missingList.length > 0 ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
                ${missingRowsHtml}
              </table>` : ''}
            </div>`}
          ` : ''}
        </div>` : ''}

        <!-- Attendance -->
        ${includeAttendance || includeWashroom ? `
        <div style="margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid #e2e8f0;">
          <div style="font-size:11pt; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:8px; letter-spacing:0.04em;">Attendance &amp; Engagement</div>
          ${includeAttendance && att.rate !== undefined && att.rate !== null ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; margin-bottom:4px;">
            <tr>
              <td style="font-size:12pt; color:#334155; text-align:left; vertical-align:middle; padding:0;">Attendance Rate:</td>
              <td style="font-size:14pt; font-weight:bold; color:#0f172a; text-align:right; vertical-align:middle; padding:0;">${attStr}</td>
            </tr>
          </table>
          ${attNum !== null ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; height:6px; background-color:#e2e8f0; border-collapse:collapse; border-radius:4px; margin-bottom:8px;">
            <tr>
              <td style="width:${attBarWidth}%; background-color:#10b981; height:6px; border-radius:4px; font-size:1px; line-height:1px;">&nbsp;</td>
              <td style="width:${100 - attBarWidth}%; height:6px; font-size:1px; line-height:1px;">&nbsp;</td>
            </tr>
          </table>` : ''}` : ''}
          ${includeAttendance ? `
          <div style="font-size:12pt; color:#475569; margin-bottom:5px;">
            Classes Missed: <strong>${att.absences ?? 0}</strong> &nbsp;|&nbsp; Lates: <strong>${att.lates ?? 0}</strong>
          </div>` : ''}
          ${includeWashroom ? `
          <div style="font-size:12pt; color:#475569; margin-bottom:5px;">
            Out-of-Class: <strong>${wash.trips ?? wash.count ?? 0} departures</strong> ${wash.minutes ? `(${wash.minutes} mins)` : ''}
          </div>` : ''}
          ${includeAttendance ? `
          <div style="font-size:11pt; color:#64748b; font-style:italic; margin-top:6px; line-height:1.4;">
            Reflects all missed class time; official excused codes are tracked in PowerSchool.
          </div>` : ''}
        </div>` : ''}

        <!-- Closing -->
        <div style="font-size:12pt; color:#475569; line-height:1.6; margin-top:8px;">
          ${studentData.closingNote || "Please feel free to reach out if you have any questions."}
        </div>
        <div style="margin-top:14px; font-size:12pt; font-weight:600; color:#1e293b; line-height:1.5;">
          Best regards,<br/>${teacherName}
          ${teacherTitle ? `<br/><span style="font-weight:normal; color:#64748b;">${teacherTitle}</span>` : (department ? `<br/><span style="font-weight:normal; color:#64748b;">${department}</span>` : '')}
          ${schoolName ? `<br/><span style="font-weight:normal; color:#64748b;">${schoolName}</span>` : ''}
          ${teacherEmail ? `<br/><span style="font-weight:normal; color:#2563eb;"><a href="mailto:${teacherEmail}" style="color:#2563eb; text-decoration:none;">${teacherEmail}</a></span>` : ''}
          ${includeWorkingHours ? `<br/><br/><span style="font-size:10pt; font-weight:normal; color:#94a3b8; line-height:1.4; display:block;">My working hours and your working hours may be different. Please do not feel obligated to reply outside your regular work hours.</span>` : ''}
        </div>
      </div>
    </td>
  </tr>
</table>
`.trim()
}

/**
 * Copies rich formatted HTML (with plain-text fallback) directly to the system clipboard
 * so the teacher can paste a styled report card into Outlook or Gmail.
 *
 * @param {Object} studentData
 * @param {Object} [options]
 * @returns {Promise<boolean>}
 */
export async function copyRichEmailToClipboard(studentData = {}, options = {}) {
  const plainText = generateMobileSafeEmailBody(studentData, options)
  const htmlContent = generateRichEmailHtml(studentData, options)

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const plainBlob = new Blob([plainText], { type: 'text/plain' })
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': plainBlob,
          'text/html': htmlBlob
        })
      ])
      return true
    } catch (err) {
      console.warn('ClipboardItem write failed, falling back to text only', err)
    }
  }

  // Fallback to text copy
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(plainText)
    return true
  }

  return false
}

/**
 * Generates an RFC 822 / MIME format .eml email file.
 * Key Feature: Includes 'X-Unsent: 1' header so Outlook & Apple Mail open
 * the file directly in COMPOSE/DRAFT mode with recipients and subject pre-filled.
 *
 * Supports 'multipart/related' with embedded CID base64 images so charts/graphics
 * render instantly without external image hosting.
 *
 * @param {Object} studentData
 * @param {Object} [options]
 * @param {Array<{ cid: string, filename: string, mimeType: string, base64: string }>} [options.images=[]]
 * @returns {string} Complete .eml file content string
 */
export function generateEmlContent(studentData = {}, options = {}) {
  const { images = [] } = options

  const studentName = studentData.name || studentData.studentName || 'Student'
  const subject = studentData.subject || `Progress Report: ${studentName}`
  
  let recipientStr = ''
  if (Array.isArray(studentData.recipients)) {
    recipientStr = studentData.recipients.filter(Boolean).join(', ')
  } else if (typeof studentData.recipients === 'string') {
    recipientStr = studentData.recipients
  }

  const htmlBody = generateRichEmailHtml(studentData, options)

  // Simple single-part HTML email when no inline CID images are needed
  if (images.length === 0) {
    return [
      'MIME-Version: 1.0',
      'X-Unsent: 1',
      `To: ${recipientStr}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlBody
    ].join('\r\n')
  }

  // Multi-part related email with embedded CID images
  const boundary = `----=_ClassroomTracker_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const lines = [
    'MIME-Version: 1.0',
    'X-Unsent: 1',
    `To: ${recipientStr}`,
    `Subject: ${subject}`,
    `Content-Type: multipart/related; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlBody,
    ''
  ]

  images.forEach(img => {
    lines.push(`--${boundary}`)
    lines.push(`Content-Type: ${img.mimeType || 'image/png'}`)
    lines.push('Content-Transfer-Encoding: base64')
    lines.push(`Content-ID: <${img.cid}>`)
    lines.push(`Content-Disposition: inline; filename="${img.filename || 'graphic.png'}"`)
    lines.push('')
    lines.push(img.base64)
    lines.push('')
  })

  lines.push(`--${boundary}--`)
  return lines.join('\r\n')
}

/**
 * Triggers a browser download of the .eml draft file.
 * Double-clicking this file on desktop opens Microsoft Outlook or Apple Mail
 * directly into a Compose Draft window.
 *
 * @param {Object} studentData
 * @param {Object} [options]
 * @returns {Blob}
 */
export function downloadEmlFile(studentData = {}, options = {}) {
  const emlContent = generateEmlContent(studentData, options)
  const safeName = (studentData.name || studentData.studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `${safeName}_Progress_Report.eml`
  const blob = new Blob([emlContent], { type: 'message/rfc822' })

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return blob
}
