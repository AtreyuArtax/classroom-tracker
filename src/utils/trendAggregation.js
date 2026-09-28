/**
 * src/utils/trendAggregation.js
 *
 * Utilities for aggregating student behavioral and attendance events
 * into time-bucketed datasets for visualizations (Daily Bar Charts & Weekly Line Trends).
 */

import { formatLocalDate, parseLocal } from './dates.js'

/**
 * Builds a 5-day school-week (Monday through Friday) daily dataset.
 * Used when period is 'week' or 'last_week'.
 *
 * @param {Array<Object>} events - Array of raw/filtered student events
 * @param {'week'|'last_week'} period - Selected period
 * @param {Object} [behaviorCodesMap={}] - Mapping of codeKey to code config
 * @param {Date|string} [referenceDate=new Date()] - Reference date for anchoring the week
 * @returns {Array<{ key: string, label: string, fullDate: string, washroom: number, absence: number, late: number }>}
 */
export function buildDailyTrend(events = [], period = 'week', behaviorCodesMap = {}, referenceDate = new Date()) {
  const ref = typeof referenceDate === 'string' ? parseLocal(referenceDate) : new Date(referenceDate)
  
  // Calculate Monday of current week
  const day = ref.getDay()
  const diff = ref.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(ref)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)

  // Shift to last week's Monday if requested
  if (period === 'last_week') {
    monday.setDate(monday.getDate() - 7)
  }

  // Pre-generate Monday to Friday buckets
  const days = []
  const dayMap = {}

  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const key = formatLocalDate(d)
    const dayNameShort = d.toLocaleDateString('en-US', { weekday: 'short' })
    const dayNum = d.getDate()
    const fullDate = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

    const bucket = {
      key,
      label: `${dayNameShort} ${dayNum}`,
      fullDate,
      washroom: 0,
      absence: 0,
      late: 0
    }
    days.push(bucket)
    dayMap[key] = bucket
  }

  // Aggregate events into daily buckets
  for (const ev of events) {
    if (ev.superseded) continue
    const dateKey = formatLocalDate(ev.timestamp)
    const bucket = dayMap[dateKey]
    if (!bucket) continue

    const config = behaviorCodesMap[ev.code]
    if (config?.type === 'toggle' || ev.category === 'washroom') {
      bucket.washroom++
    } else if (ev.code === 'a') {
      bucket.absence++
    } else if (ev.code === 'l') {
      bucket.late++
    }
  }

  return days
}

/**
 * Builds a contiguous weekly dataset (every Monday between fromDate and toDate).
 * Zero-fills weeks without logged incidents to ensure honest trajectory representation.
 * Used when period is 'month' or 'semester'.
 *
 * @param {Array<Object>} events - Array of student events
 * @param {string} fromDate - Starting date (YYYY-MM-DD)
 * @param {string} toDate - Ending date (YYYY-MM-DD)
 * @param {Object} [behaviorCodesMap={}] - Mapping of codeKey to code config
 * @returns {Array<{ key: string, label: string, rangeLabel: string, fullDate: string, washroom: number, absence: number, late: number }>}
 */
export function buildWeeklyTrend(events = [], fromDate, toDate, behaviorCodesMap = {}) {
  const weeks = {}

  const now = new Date()
  const todayStr = formatLocalDate(now)

  // Anchor start Monday
  let start = fromDate ? parseLocal(fromDate) : new Date(now)
  if (!fromDate) {
    start.setMonth(start.getMonth() - 1)
  }
  const startDay = start.getDay()
  const startDiff = start.getDate() - startDay + (startDay === 0 ? -6 : 1)
  const curMonday = new Date(start)
  curMonday.setDate(startDiff)
  curMonday.setHours(0, 0, 0, 0)

  // Anchor end Monday (cap at today if running)
  const effectiveTo = toDate ? (toDate < todayStr ? toDate : todayStr) : todayStr
  const end = parseLocal(effectiveTo)
  const endDay = end.getDay()
  const endDiff = end.getDate() - endDay + (endDay === 0 ? -6 : 1)
  const lastMonday = new Date(end)
  lastMonday.setDate(endDiff)
  lastMonday.setHours(0, 0, 0, 0)

  // Populate contiguous weeks
  while (curMonday <= lastMonday) {
    const mondayKey = formatLocalDate(curMonday)
    const friday = new Date(curMonday)
    friday.setDate(curMonday.getDate() + 4)

    const startLabel = curMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endLabel = friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const rangeLabel = `${startLabel} – ${endLabel}`

    weeks[mondayKey] = {
      key: mondayKey,
      label: startLabel,
      rangeLabel,
      fullDate: `Week of ${rangeLabel}`,
      washroom: 0,
      absence: 0,
      late: 0
    }

    curMonday.setDate(curMonday.getDate() + 7)
  }

  // Populate events into weekly buckets
  for (const ev of events) {
    if (ev.superseded) continue
    const d = new Date(ev.timestamp)
    if (isNaN(d.getTime())) continue

    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const evtMonday = new Date(d)
    evtMonday.setDate(diff)
    const mondayKey = formatLocalDate(evtMonday)

    if (!weeks[mondayKey]) {
      const fri = new Date(evtMonday)
      fri.setDate(evtMonday.getDate() + 4)
      const startLabel = evtMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const endLabel = fri.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const rangeLabel = `${startLabel} – ${endLabel}`

      weeks[mondayKey] = {
        key: mondayKey,
        label: startLabel,
        rangeLabel,
        fullDate: `Week of ${rangeLabel}`,
        washroom: 0,
        absence: 0,
        late: 0
      }
    }

    const config = behaviorCodesMap[ev.code]
    if (config?.type === 'toggle' || ev.category === 'washroom') {
      weeks[mondayKey].washroom++
    } else if (ev.code === 'a') {
      weeks[mondayKey].absence++
    } else if (ev.code === 'l') {
      weeks[mondayKey].late++
    }
  }

  return Object.values(weeks).sort((a, b) => a.key.localeCompare(b.key))
}
