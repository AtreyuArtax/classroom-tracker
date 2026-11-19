/**
 * src/utils/dutyTimeUtils.js
 *
 * Pure utility functions for normalizing and formatting duty preset start times.
 */

/**
 * Normalizes a duty type's preset start times into a sorted, deduplicated array of 'HH:MM' strings.
 * Falls back to [duty.defaultStartTime] for legacy records without presetStartTimes.
 * @param {Object} duty
 * @returns {string[]}
 */
export function normalizePresetStartTimes(duty) {
  const raw = Array.isArray(duty?.presetStartTimes)
    ? duty.presetStartTimes
    : (typeof duty?.defaultStartTime === 'string' && duty.defaultStartTime.trim() ? [duty.defaultStartTime.trim()] : [])

  const valid = new Set()
  for (const t of raw) {
    if (typeof t !== 'string') continue
    const trimmed = t.trim()
    const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
    if (!match) continue
    const h = Number(match[1])
    const m = Number(match[2])
    if (h < 0 || h > 23 || m < 0 || m > 59) continue
    valid.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return Array.from(valid).sort((a, b) => a.localeCompare(b))
}

/**
 * Formats a 24-hour 'HH:MM' time string into 12-hour display format (e.g., '8:15 AM').
 * @param {string} timeStr
 * @returns {string}
 */
export function formatDutyTime(timeStr) {
  if (!timeStr) return ''
  const [hStr, mStr] = String(timeStr).split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}
