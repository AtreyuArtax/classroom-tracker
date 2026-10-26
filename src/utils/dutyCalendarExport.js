/**
 * src/utils/dutyCalendarExport.js
 *
 * Generates RFC 5545 iCalendar (.ics) files and Outlook Web compose links
 * for assigned school duties (AM bus, hall duty, on-calls, etc.).
 *
 * Works 100% offline and requires zero external server or Microsoft API setup.
 */

import fileSaver from 'file-saver'
const saveAs = fileSaver?.saveAs || fileSaver?.default || fileSaver

/**
 * Pads a number with a leading zero if needed.
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  return String(n).padStart(2, '0')
}

/**
 * Formats a Date object to iCalendar UTC timestamp format (YYYYMMDDTHHMMSSZ).
 * @param {Date} date
 * @returns {string}
 */
function formatUtcTimestamp(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

/**
 * Sanitizes text for iCalendar description / summary fields.
 * Escapes backslashes, newlines, and semicolons.
 * @param {string} text
 * @returns {string}
 */
function escapeIcsText(text) {
  if (!text) return ''
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Generates the full .ics string from an array of duty records.
 * @param {Array<Object>} duties
 * @returns {string}
 */
export function generateIcsContent(duties) {
  const now = new Date()
  const dtStamp = formatUtcTimestamp(now)

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Classroom Tracker//Duty Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]

  for (const duty of duties) {
    if (!duty.date) continue

    const [year, month, day] = duty.date.split('-').map(Number)
    const uid = `duty-${duty.dutyId || Math.random().toString(36).slice(2, 9)}-${duty.date}@classroomtracker`
    const summaryTitle = duty.location && duty.location.trim()
      ? `${duty.dutyName || 'Duty'} (${duty.location.trim()}) Duty`
      : `${duty.dutyName || 'Duty'} Duty`
    const summary = escapeIcsText(summaryTitle)
    
    let description = `Duty: ${duty.dutyName || 'Duty'}\\nDuration: ${duty.duration || 0} minutes`
    if (duty.location && duty.location.trim()) {
      description += `\\nLocation: ${escapeIcsText(duty.location.trim())}`
    }
    if (duty.notes) {
      description += `\\nNotes: ${escapeIcsText(duty.notes)}`
    }
    if (duty.isEmergency) {
      description += `\\n(Contractual Emergency On-call)`
    }

    ics.push('BEGIN:VEVENT')
    ics.push(`UID:${uid}`)
    ics.push(`DTSTAMP:${dtStamp}`)
    ics.push(`SUMMARY:${summary}`)
    ics.push(`DESCRIPTION:${description}`)
    if (duty.location && duty.location.trim()) {
      ics.push(`LOCATION:${escapeIcsText(duty.location.trim())}`)
    }
    ics.push('STATUS:CONFIRMED')

    if (duty.startTime && /^\d{1,2}:\d{2}$/.test(duty.startTime)) {
      const [startHour, startMin] = duty.startTime.split(':').map(Number)
      const durationMin = Number(duty.duration) || 15

      // Calculate end time
      const startDate = new Date(year, month - 1, day, startHour, startMin, 0)
      const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000)

      const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startHour)}${pad(startMin)}00`
      const dtEnd = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`

      ics.push(`DTSTART:${dtStart}`)
      ics.push(`DTEND:${dtEnd}`)

      // 10-minute reminder alarm
      ics.push('BEGIN:VALARM')
      ics.push('TRIGGER:-PT10M')
      ics.push('ACTION:DISPLAY')
      ics.push(`DESCRIPTION:Reminder: ${summary} starting in 10 minutes`)
      ics.push('END:VALARM')
    } else {
      // All-day event fallback if no specific start time was configured
      const dtStart = `${year}${pad(month)}${pad(day)}`
      const nextDay = new Date(year, month - 1, day + 1)
      const dtEnd = `${nextDay.getFullYear()}${pad(nextDay.getMonth() + 1)}${pad(nextDay.getDate())}`

      ics.push(`DTSTART;VALUE=DATE:${dtStart}`)
      ics.push(`DTEND;VALUE=DATE:${dtEnd}`)
    }

    ics.push('END:VEVENT')
  }

  ics.push('END:VCALENDAR')
  return ics.join('\r\n')
}

/**
 * Generates and triggers the file download of a .ics calendar file.
 * Opening this file in Windows or macOS natively imports the events into Outlook.
 * @param {Array<Object>|Object} duties - Single duty or array of duties
 * @param {string} [filename]
 */
export function downloadDutiesIcs(duties, filename = 'school_duties.ics') {
  const list = Array.isArray(duties) ? duties : [duties]
  const validList = list.filter(d => !d.isSnowDay) // Don't export snow days
  if (validList.length === 0) return

  const icsString = generateIcsContent(validList)
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' })
  saveAs(blob, filename)
}

/**
 * Returns a web deep link to draft an event directly in Microsoft Outlook on the web.
 * (e.g. for Office 365 / school board Microsoft accounts)
 * @param {Object} duty
 * @returns {string}
 */
export function getOutlookWebComposeUrl(duty) {
  if (!duty || !duty.date) return ''

  const title = duty.location && duty.location.trim()
    ? `${duty.dutyName || 'Duty'} (${duty.location.trim()}) Supervision`
    : `${duty.dutyName || 'Duty'} Supervision`
  const subject = encodeURIComponent(title)
  let bodyText = `Duty: ${duty.dutyName}\nDuration: ${duty.duration} min`
  if (duty.location && duty.location.trim()) {
    bodyText += `\nLocation: ${duty.location.trim()}`
  }
  if (duty.notes) {
    bodyText += `\nNotes: ${duty.notes}`
  }
  const body = encodeURIComponent(bodyText)
  
  let startdt = ''
  let enddt = ''

  if (duty.startTime && /^\d{1,2}:\d{2}$/.test(duty.startTime)) {
    const [startHour, startMin] = duty.startTime.split(':').map(Number)
    const durationMin = Number(duty.duration) || 15
    const [year, month, day] = duty.date.split('-').map(Number)
    
    const startDate = new Date(year, month - 1, day, startHour, startMin, 0)
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000)

    startdt = startDate.toISOString()
    enddt = endDate.toISOString()
  } else {
    startdt = `${duty.date}T08:30:00`
    enddt = `${duty.date}T09:00:00`
  }

  let url = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${subject}&startdt=${encodeURIComponent(startdt)}&enddt=${encodeURIComponent(enddt)}&body=${body}`
  if (duty.location && duty.location.trim()) {
    url += `&location=${encodeURIComponent(duty.location.trim())}`
  }
  return url
}

/**
 * Calculates the Monday-Friday work week range for any given ISO date string (YYYY-MM-DD).
 * @param {string} dateString
 * @returns {{ mondayIso: string, fridayIso: string, label: string }|null}
 */
export function getWeekRangeForDate(dateString) {
  if (!dateString) return null
  const [y, m, d] = dateString.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay() // 0 = Sun, 1 = Mon ... 6 = Sat
  // Mon offset
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(dt)
  monday.setDate(dt.getDate() + diffToMon)

  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  const toIso = (dObj) => {
    const yr = dObj.getFullYear()
    const mo = String(dObj.getMonth() + 1).padStart(2, '0')
    const dy = String(dObj.getDate()).padStart(2, '0')
    return `${yr}-${mo}-${dy}`
  }

  const monIso = toIso(monday)
  const friIso = toIso(friday)

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monMonth = MONTH_NAMES[monday.getMonth()]
  const monDay = monday.getDate()
  const friMonth = MONTH_NAMES[friday.getMonth()]
  const friDay = friday.getDate()
  const monYear = monday.getFullYear()
  const friYear = friday.getFullYear()

  let label = ''
  if (monYear !== friYear) {
    label = `${monMonth} ${monDay}, ${monYear} – ${friMonth} ${friDay}, ${friYear}`
  } else if (monday.getMonth() === friday.getMonth()) {
    label = `${monMonth} ${monDay} – ${friDay}, ${friYear}`
  } else {
    label = `${monMonth} ${monDay} – ${friMonth} ${friDay}, ${friYear}`
  }

  return {
    mondayIso: monIso,
    fridayIso: friIso,
    label
  }
}

/**
 * Returns an array of the 5 school weekdays (Mon–Fri) for any given ISO date string.
 * @param {string} dateString - YYYY-MM-DD
 * @returns {Array<{ dayKey: string, dayName: string, dateIso: string, displayDate: string }>}
 */
export function getWeekDaysList(dateString) {
  if (!dateString) return []
  const [y, m, d] = dateString.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay() // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(dt)
  monday.setDate(dt.getDate() + diffToMon)

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  const list = []
  for (let i = 0; i < 5; i++) {
    const cur = new Date(monday)
    cur.setDate(monday.getDate() + i)
    const yr = cur.getFullYear()
    const mo = String(cur.getMonth() + 1).padStart(2, '0')
    const dy = String(cur.getDate()).padStart(2, '0')
    list.push({
      dayKey: DAY_KEYS[i],
      dayName: DAY_NAMES[i],
      dateIso: `${yr}-${mo}-${dy}`,
      displayDate: `${MONTH_NAMES[cur.getMonth()]} ${cur.getDate()}`
    })
  }
  return list
}

/**
 * Groups an array of duties into Monday–Friday school weeks.
 * Sorted descending by start date (newest weeks first).
 * @param {Array<Object>} duties
 * @returns {Array<Object>}
 */
export function groupDutiesByWeek(duties) {
  if (!Array.isArray(duties) || duties.length === 0) return []

  const validDuties = duties.filter(d => !d.isSnowDay && d.date)
  const map = new Map()

  for (const d of validDuties) {
    const range = getWeekRangeForDate(d.date)
    if (!range) continue
    const key = range.mondayIso
    if (!map.has(key)) {
      map.set(key, {
        weekKey: key,
        startDate: range.mondayIso,
        endDate: range.fridayIso,
        label: range.label,
        duties: [],
        totalMinutes: 0,
        dutyNamesSet: new Set(),
        latestCreatedAt: ''
      })
    }
    const item = map.get(key)
    item.duties.push(d)
    item.totalMinutes += Number(d.duration) || 0
    if (d.dutyName) item.dutyNamesSet.add(d.dutyName)
    if (d.createdAt && (!item.latestCreatedAt || d.createdAt > item.latestCreatedAt)) {
      item.latestCreatedAt = d.createdAt
    }
  }

  const result = Array.from(map.values()).map(week => ({
    ...week,
    dutyNames: Array.from(week.dutyNamesSet),
    duties: week.duties.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }))

  result.sort((a, b) => b.startDate.localeCompare(a.startDate))

  // Tag latest entered week by latest createdAt or highest dutyId
  let latestWeek = null
  let maxCreatedAt = ''
  let maxId = -1

  for (const week of result) {
    for (const d of week.duties) {
      if (d.createdAt && d.createdAt > maxCreatedAt) {
        maxCreatedAt = d.createdAt
        latestWeek = week
      } else if (!maxCreatedAt && typeof d.dutyId === 'number' && d.dutyId > maxId) {
        maxId = d.dutyId
        latestWeek = week
      }
    }
  }

  if (latestWeek) {
    latestWeek.isLatest = true
  }

  return result
}

/**
 * Returns the most recently logged week of duties.
 * @param {Array<Object>} duties
 * @returns {Object|null}
 */
export function getLastEnteredWeek(duties) {
  const weeks = groupDutiesByWeek(duties)
  return weeks.find(w => w.isLatest) || weeks[0] || null
}

/**
 * Downloads a .ics calendar file for a specific week of duties.
 * @param {Object} week - Object returned from groupDutiesByWeek
 */
export function downloadWeekDutiesIcs(week) {
  if (!week || !Array.isArray(week.duties) || week.duties.length === 0) return
  const filename = `duties_${week.startDate}_to_${week.endDate}.ics`
  downloadDutiesIcs(week.duties, filename)
}
