/**
 * src/utils/timeUtils.js
 *
 * Pure utility functions for duration conversions and reporting date ranges.
 * Extracted from src/db/eventService.js to maintain clean architectural boundaries.
 */

import { formatLocalDate } from './dates.js'

/**
 * Converts a raw duration (ms) into a numeric minute value with 0.5-minute precision.
 * Now exclusively millisecond-based (CLAUDE.md §18).
 *
 * @param {number|null} d Milliseconds
 * @returns {number} Minutes rounded to 0.5
 */
export function toMinutes(d) {
    if (d === null || d === undefined || d === '') return 0
    const num = Number(d)
    if (isNaN(num) || !isFinite(num) || num < 0) return 0
    const mins = num / 60000
    return Math.round(mins * 2) / 2
}

/**
 * Returns a date range object representing the start and end of the given reporting period.
 * Used by UI components to build { from, to } date filters.
 *
 * @param {'week'|'last_week'|'month'|'semester'|'all'} period
 * @returns {{ from?: string, to?: string }}
 */
export function getDateRangeForPeriod(period) {
    const now = new Date()
    if (period === 'all') return {}

    const getMonday = (d) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        return date;
    }

    if (period === 'week') {
        return { from: formatLocalDate(getMonday(now)) }
    }
    if (period === 'last_week') {
        const thisMonday = getMonday(now);
        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(lastMonday.getDate() - 7);
        const lastSunday = new Date(thisMonday);
        lastSunday.setDate(lastSunday.getDate() - 1);
        return { from: formatLocalDate(lastMonday), to: formatLocalDate(lastSunday) }
    }
    if (period === 'month') {
        const d = new Date(now)
        d.setMonth(d.getMonth() - 1)
        return { from: formatLocalDate(d) }
    }
    if (period === 'semester') {
        const d = new Date(now)
        d.setMonth(d.getMonth() - 5)
        return { from: formatLocalDate(d) }
    }
    return {}
}

/**
 * Returns a date range object representing the start and end of the given reporting period,
 * optionally anchoring the 'semester' period to actual term boundaries.
 *
 * @param {'week'|'last_week'|'month'|'semester'|'all'} period
 * @param {Object} [classObj]
 * @param {Array<Object>} [academicTerms]
 * @returns {{ from?: string, to?: string }}
 */
export function getDateRangeForClassPeriod(period, classObj, academicTerms = []) {
    if (period === 'semester') {
        if (classObj) {
            const term = academicTerms.find(t => t.year === classObj.year && String(t.semester) === String(classObj.semester))
            if (term && term.startDate && term.endDate) {
                const todayStr = formatLocalDate(new Date())
                // Cap at today's date if the semester is still running
                const toDate = term.endDate < todayStr ? term.endDate : todayStr
                return { from: term.startDate, to: toDate }
            }
        }

        // Fallback: Rolling 5-month window
        const now = new Date()
        const d = new Date(now)
        d.setMonth(d.getMonth() - 5)
        return { from: formatLocalDate(d) }
    }

    return getDateRangeForPeriod(period)
}
