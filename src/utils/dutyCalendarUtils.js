/**
 * src/utils/dutyCalendarUtils.js
 *
 * Integrates Duty Tracker progress with official school board calendar schedules,
 * custom semester boundaries, and school year instructional pace.
 */

import { formatLocalDate, formatLocalDisplay, getCurrentSchoolYear, isSameSchoolYear, parseLocal } from './dates.js'
import { getBoardCalendar } from './calendarLoader.js'
import { getSchoolDaysInRange } from './schoolDayUtils.js'

/**
 * Resolves the semester schedule for a given school year.
 * Priority:
 *  1. Custom academic terms defined in App Settings (academicTerms)
 *  2. Official Board Calendar from src/data/calendar/*.json (getBoardCalendar)
 *  3. Standard smart calendar fallbacks (Sept 1 - Jan 31 / Feb 1 - June 30)
 *
 * @param {string} schoolYear e.g. "2026-27" or "2026-2027"
 * @param {Array<Object>} [academicTerms=[]] Custom terms from useClassroom / IDB
 * @returns {{
 *   schoolYear: string,
 *   sem1Start: string,
 *   sem1End: string,
 *   sem2Start: string,
 *   sem2End: string,
 *   sem1Display: string,
 *   sem2Display: string,
 *   isCustom: boolean,
 *   isBoard: boolean
 * }}
 */
export function getSemesterSchedule(schoolYear, academicTerms = []) {
  const targetYear = schoolYear || getCurrentSchoolYear()
  const cleanYearMatch = String(targetYear).trim().match(/\b(20\d\d)\b/)
  const startYear = cleanYearMatch ? parseInt(cleanYearMatch[1], 10) : new Date().getFullYear()

  // 1. Check custom academic terms
  if (Array.isArray(academicTerms) && academicTerms.length > 0) {
    const sem1Custom = academicTerms.find(t => isSameSchoolYear(t.year, targetYear) && String(t.semester) === '1')
    const sem2Custom = academicTerms.find(t => isSameSchoolYear(t.year, targetYear) && String(t.semester) === '2')
    if (sem1Custom?.startDate && sem2Custom?.startDate) {
      return {
        schoolYear: targetYear,
        sem1Start: sem1Custom.startDate,
        sem1End: sem1Custom.endDate || `${startYear + 1}-01-31`,
        sem2Start: sem2Custom.startDate,
        sem2End: sem2Custom.endDate || `${startYear + 1}-06-30`,
        sem1Display: formatLocalDisplay(sem1Custom.startDate, { month: 'short', day: 'numeric' }),
        sem2Display: formatLocalDisplay(sem2Custom.startDate, { month: 'short', day: 'numeric' }),
        isCustom: true,
        isBoard: false
      }
    }
  }

  // 2. Check official board calendar
  try {
    const board = getBoardCalendar(targetYear)
    if (board && Array.isArray(board.semesters) && board.semesters.length >= 2) {
      const bSem1 = board.semesters.find(s => String(s.semester) === '1') || board.semesters[0]
      const bSem2 = board.semesters.find(s => String(s.semester) === '2') || board.semesters[1]
      if (bSem1?.startDate && bSem2?.startDate) {
        return {
          schoolYear: targetYear,
          sem1Start: bSem1.startDate,
          sem1End: bSem1.endDate || `${startYear + 1}-02-02`,
          sem2Start: bSem2.startDate,
          sem2End: bSem2.endDate || `${startYear + 1}-06-28`,
          sem1Display: formatLocalDisplay(bSem1.startDate, { month: 'short', day: 'numeric' }),
          sem2Display: formatLocalDisplay(bSem2.startDate, { month: 'short', day: 'numeric' }),
          isCustom: false,
          isBoard: true
        }
      }
    }
  } catch (err) {
    console.warn('[dutyCalendarUtils] Could not load board calendar:', err)
  }

  // 3. Smart Fallback defaults (Sept 1 / Feb 1)
  const defaultSem1Start = `${startYear}-09-01`
  const defaultSem1End = `${startYear + 1}-01-31`
  const defaultSem2Start = `${startYear + 1}-02-01`
  const defaultSem2End = `${startYear + 1}-06-30`

  return {
    schoolYear: targetYear,
    sem1Start: defaultSem1Start,
    sem1End: defaultSem1End,
    sem2Start: defaultSem2Start,
    sem2End: defaultSem2End,
    sem1Display: formatLocalDisplay(defaultSem1Start, { month: 'short', day: 'numeric' }),
    sem2Display: formatLocalDisplay(defaultSem2Start, { month: 'short', day: 'numeric' }),
    isCustom: false,
    isBoard: false
  }
}

/**
 * Calculates how far along the school year is (instructional pace)
 * and compares it against duty completion percentage.
 *
 * @param {string} schoolYear e.g. "2026-27"
 * @param {Array<Object>} [nonSchoolDays=[]] List of holidays and non-instructional days
 * @param {Array<Object>} [academicTerms=[]] Custom terms
 * @param {Object} [options={}]
 * @param {number} [options.percentComplete=0] Current duty completion percentage (0-100)
 * @param {string} [options.todayStr] Override today's date (YYYY-MM-DD) for deterministic testing
 * @returns {{
 *   isActiveYear: boolean,
 *   isPastYear: boolean,
 *   isFutureYear: boolean,
 *   totalDays: number,
 *   elapsedDays: number,
 *   elapsedPercent: number,
 *   sem1Display: string,
 *   sem2Display: string,
 *   sem2StartDate: string,
 *   sem2MarkerPercent: number,
 *   paceStatus: 'ahead' | 'on-track' | 'behind' | 'completed' | 'upcoming',
 *   paceIcon: string,
 *   paceMessage: string,
 *   todayDisplay: string
 * }}
 */
export function getSchoolYearCalendarPace(schoolYear, nonSchoolDays = [], academicTerms = [], options = {}) {
  const schedule = getSemesterSchedule(schoolYear, academicTerms)
  const today = options.todayStr || formatLocalDate(new Date())
  const todayDisplay = formatLocalDisplay(today, { month: 'short', day: 'numeric' })
  const percentComplete = Number(options.percentComplete) || 0

  // Combine holidays from user settings with board calendar holidays if available
  let holidays = Array.isArray(nonSchoolDays) ? [...nonSchoolDays] : []
  try {
    const board = getBoardCalendar(schoolYear)
    if (board && Array.isArray(board.holidays)) {
      // Merge unique by date
      const knownDates = new Set(holidays.map(h => h.date))
      for (const bh of board.holidays) {
        if (!knownDates.has(bh.date)) {
          holidays.push(bh)
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Calculate total instructional days across Semester 1 and Semester 2
  const totalDaysResult = getSchoolDaysInRange(schedule.sem1Start, schedule.sem2End, holidays, { capToday: false })
  const totalDays = Math.max(1, totalDaysResult.count || 173)

  // Determine school year state relative to today
  const isPastYear = today > schedule.sem2End
  const isFutureYear = today < schedule.sem1Start
  const isActiveYear = !isPastYear && !isFutureYear

  let elapsedDays = 0
  let elapsedPercent = 0

  if (isPastYear) {
    elapsedDays = totalDays
    elapsedPercent = 100
  } else if (isFutureYear) {
    elapsedDays = 0
    elapsedPercent = 0
  } else {
    const elapsedResult = getSchoolDaysInRange(schedule.sem1Start, schedule.sem2End, holidays, {
      capToday: true,
      todayStr: today
    })
    elapsedDays = elapsedResult.count
    elapsedPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
  }

  // Position of Semester 2 marker on the annual scale (50% target)
  const sem2MarkerPercent = 50

  // Determine pacing status and message (zero emojis, pure Lucide icon identifiers)
  let paceStatus = 'on-track'
  let paceIconName = 'CheckCircle2'
  let paceMessage = 'On track with school year pace'

  if (isPastYear) {
    paceStatus = 'completed'
    paceIconName = 'Check'
    paceMessage = 'School year completed'
  } else if (isFutureYear) {
    paceStatus = 'upcoming'
    paceIconName = 'Calendar'
    paceMessage = 'Upcoming school year'
  } else {
    const diff = percentComplete - elapsedPercent
    if (diff >= 5) {
      paceStatus = 'ahead'
      paceIconName = 'TrendingUp'
      paceMessage = `Ahead of school year (+${diff}%)`
    } else if (diff <= -5) {
      paceStatus = 'behind'
      paceIconName = 'Clock'
      paceMessage = `Behind school year (${Math.abs(diff)}% gap)`
    } else {
      paceStatus = 'on-track'
      paceIconName = 'CheckCircle2'
      paceMessage = 'On track with school year pace'
    }
  }

  return {
    isActiveYear,
    isPastYear,
    isFutureYear,
    totalDays,
    elapsedDays,
    elapsedPercent,
    sem1Display: schedule.sem1Display,
    sem2Display: schedule.sem2Display,
    sem2StartDate: schedule.sem2Start,
    sem2MarkerPercent,
    paceStatus,
    paceIconName,
    paceMessage,
    todayDisplay
  }
}
