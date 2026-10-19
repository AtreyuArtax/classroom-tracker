/**
 * src/db/dutyService.js
 *
 * Dedicated database service for Assigned Professional Activities (APA / Duties).
 * Completely isolated from student data, rosters, and gradebook records.
 *
 * All operations go through getDB().
 */

import { getDB } from './index.js'
import { hasUnsyncedChanges } from './eventService.js'

export const INITIAL_DUTY_SETTINGS = {
  allottedMinutes: 1875,
  emergencyCap: 2,
  dutyTypes: [
    { id: 'am-bus', name: 'AM Bus', defaultDuration: 15, defaultDays: 5, defaultWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], defaultStartTime: '08:15', isEmergency: false },
    { id: 'cafeteria', name: 'Cafeteria', defaultDuration: 20, defaultDays: 5, defaultWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], defaultStartTime: '11:20', isEmergency: false },
    { id: 'library', name: 'Library', defaultDuration: 20, defaultDays: 5, defaultWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], defaultStartTime: '11:20', isEmergency: false },
    { id: 'student-commons', name: 'Student Commons', defaultDuration: 20, defaultDays: 5, defaultWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], defaultStartTime: '11:40', isEmergency: false },
    { id: 'weight-room', name: 'Weight Room', defaultDuration: 30, defaultDays: 2, defaultStartTime: '11:25', defaultWeekdays: ['Tue', 'Thu'], isEmergency: false },
    { id: 'halls-upstairs', name: 'Halls Upstairs', defaultDuration: 20, defaultDays: 5, defaultWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], defaultStartTime: '11:40', isEmergency: false },
    { id: 'halls-downstairs', name: 'Halls Downstairs', defaultDuration: 20, defaultDays: 5, defaultWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], defaultStartTime: '11:40', isEmergency: false },
    { id: 'flagpole', name: 'Flagpole', defaultDuration: 15, defaultDays: 5, defaultWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], defaultStartTime: '08:15', isEmergency: false },
    { id: 'pm-bus', name: 'PM Bus', defaultDuration: 15, defaultDays: 5, defaultWeekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], defaultStartTime: '14:40', isEmergency: false },
    { id: 'on-call', name: 'On-call', defaultDuration: 75, defaultDays: 1, defaultWeekdays: [], defaultStartTime: '09:00', isEmergency: false },
    { id: 'osslt', name: 'OSSLT', defaultDuration: 75, defaultDays: 1, defaultWeekdays: [], defaultStartTime: '09:00', isEmergency: false },
    { id: 'emergency', name: 'Emergency', defaultDuration: 20, defaultDays: 1, defaultWeekdays: [], defaultStartTime: '09:00', isEmergency: true },
    { id: 'adjustment', name: 'Adjustment', defaultDuration: 0, defaultDays: 1, defaultWeekdays: [], defaultStartTime: '', isEmergency: false }
  ]
}

/**
 * Returns the current duty settings, seeding defaults if not yet saved.
 * @returns {Promise<Object>}
 */
export async function getDutySettings() {
  const db = await getDB()
  const settings = await db.get('settings', 'singleton')
  if (settings && settings.dutySettings) {
    return {
      allottedMinutes: typeof settings.dutySettings.allottedMinutes === 'number' ? settings.dutySettings.allottedMinutes : INITIAL_DUTY_SETTINGS.allottedMinutes,
      emergencyCap: typeof settings.dutySettings.emergencyCap === 'number' ? settings.dutySettings.emergencyCap : INITIAL_DUTY_SETTINGS.emergencyCap,
      dutyTypes: Array.isArray(settings.dutySettings.dutyTypes) && settings.dutySettings.dutyTypes.length > 0
        ? settings.dutySettings.dutyTypes
        : JSON.parse(JSON.stringify(INITIAL_DUTY_SETTINGS.dutyTypes))
    }
  }
  return JSON.parse(JSON.stringify(INITIAL_DUTY_SETTINGS))
}

/**
 * Persists updated duty settings to the singleton settings record.
 * @param {Object} newSettings
 * @returns {Promise<Object>}
 */
export async function saveDutySettings(newSettings) {
  const db = await getDB()
  const settings = (await db.get('settings', 'singleton')) || {}
  settings.dutySettings = {
    allottedMinutes: Number(newSettings.allottedMinutes) || INITIAL_DUTY_SETTINGS.allottedMinutes,
    emergencyCap: Number(newSettings.emergencyCap) ?? INITIAL_DUTY_SETTINGS.emergencyCap,
    dutyTypes: Array.isArray(newSettings.dutyTypes) ? newSettings.dutyTypes : INITIAL_DUTY_SETTINGS.dutyTypes
  }
  await db.put('settings', settings, 'singleton')
  hasUnsyncedChanges.value = true
  return settings.dutySettings
}

/**
 * Fetches all duties across all school years.
 * @returns {Promise<Array>}
 */
export async function getAllDuties() {
  const db = await getDB()
  if (!db.objectStoreNames.contains('duties')) return []
  const records = await db.getAll('duties')
  return records.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
}

/**
 * Fetches all duties for a given school year (or all duties if year is omitted).
 * @param {string} [schoolYear]
 * @returns {Promise<Array>}
 */
export async function getDutiesByYear(schoolYear) {
  const db = await getDB()
  if (!db.objectStoreNames.contains('duties')) return []
  
  if (schoolYear) {
    try {
      const records = await db.getAllFromIndex('duties', 'by_schoolYear', schoolYear)
      return records.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    } catch {
      const all = await db.getAll('duties')
      return all.filter(d => d.schoolYear === schoolYear).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    }
  }
  const records = await db.getAll('duties')
  return records.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
}

/**
 * Adds a single duty record to the duties store.
 * @param {Object} dutyRecord
 * @returns {Promise<Object>}
 */
export async function addDuty(dutyRecord) {
  const db = await getDB()
  const entry = {
    ...dutyRecord,
    duration: Number(dutyRecord.duration) || 0,
    isSnowDay: Boolean(dutyRecord.isSnowDay),
    isEmergency: Boolean(dutyRecord.isEmergency),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  const id = await db.add('duties', entry)
  hasUnsyncedChanges.value = true
  return { ...entry, dutyId: id }
}

/**
 * Adds an array of duty records in a single IDB transaction.
 * @param {Array<Object>} dutiesArray
 * @returns {Promise<Array<Object>>}
 */
export async function addDutiesBatch(dutiesArray) {
  if (!Array.isArray(dutiesArray) || dutiesArray.length === 0) return []
  const db = await getDB()
  const tx = db.transaction('duties', 'readwrite')
  const results = []

  for (const d of dutiesArray) {
    const entry = {
      ...d,
      duration: Number(d.duration) || 0,
      isSnowDay: Boolean(d.isSnowDay),
      isEmergency: Boolean(d.isEmergency),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const id = await tx.store.add(entry)
    results.push({ ...entry, dutyId: id })
  }
  await tx.done
  hasUnsyncedChanges.value = true
  return results
}

/**
 * Updates an existing duty record.
 * @param {number} dutyId
 * @param {Object} patch
 * @returns {Promise<Object>}
 */
export async function updateDuty(dutyId, patch) {
  const db = await getDB()
  const current = await db.get('duties', dutyId)
  if (!current) throw new Error(`Duty #${dutyId} not found`)

  const updated = {
    ...current,
    ...patch,
    duration: patch.duration !== undefined ? Number(patch.duration) : current.duration,
    isSnowDay: patch.isSnowDay !== undefined ? Boolean(patch.isSnowDay) : current.isSnowDay,
    isEmergency: patch.isEmergency !== undefined ? Boolean(patch.isEmergency) : current.isEmergency,
    updatedAt: new Date().toISOString()
  }
  await db.put('duties', updated)
  hasUnsyncedChanges.value = true
  return updated
}

/**
 * Deletes a single duty record by ID.
 * @param {number} dutyId
 * @returns {Promise<boolean>}
 */
export async function deleteDuty(dutyId) {
  const db = await getDB()
  await db.delete('duties', dutyId)
  hasUnsyncedChanges.value = true
  return true
}

/**
 * Clears all duties for a given school year.
 * @param {string} schoolYear
 * @returns {Promise<number>} count of removed entries
 */
export async function clearDutiesForYear(schoolYear) {
  const db = await getDB()
  if (!db.objectStoreNames.contains('duties')) return 0
  
  const records = await db.getAllFromIndex('duties', 'by_schoolYear', schoolYear)
  if (records.length === 0) return 0

  const tx = db.transaction('duties', 'readwrite')
  for (const rec of records) {
    await tx.store.delete(rec.dutyId)
  }
  await tx.done
  hasUnsyncedChanges.value = true
  return records.length
}
