/**
 * src/db/photoService.js
 *
 * Dedicated database service for student photos.
 * Stores compressed WebP/JPEG Blobs in the `student_photos` IndexedDB store.
 *
 * Schema:
 *   studentId: string (primary key)
 *   blob: Blob (compressed image, ~20-30KB)
 *   updatedAt: string (ISO timestamp)
 */

import { getDB } from './index.js'

const STORE_NAME = 'student_photos'

/**
 * Retrieves the photo record for a given student ID.
 * @param {string} studentId
 * @returns {Promise<{ studentId: string, blob: Blob, updatedAt: string } | null>}
 */
export async function getPhoto(studentId) {
  if (!studentId) return null
  const db = await getDB()
  const record = await db.get(STORE_NAME, String(studentId))
  return record || null
}

/**
 * Saves or updates a student photo blob.
 * @param {string} studentId
 * @param {Blob} blob
 * @returns {Promise<void>}
 */
export async function savePhoto(studentId, blob) {
  if (!studentId || !blob) throw new Error('studentId and blob are required')
  const db = await getDB()
  const record = {
    studentId: String(studentId),
    blob,
    updatedAt: new Date().toISOString()
  }
  await db.put(STORE_NAME, record)
}

/**
 * Deletes a student's photo.
 * @param {string} studentId
 * @returns {Promise<void>}
 */
export async function deletePhoto(studentId) {
  if (!studentId) return
  const db = await getDB()
  await db.delete(STORE_NAME, String(studentId))
}

/**
 * Saves multiple student photos in a single atomic transaction.
 * @param {Array<{ studentId: string, blob: Blob }>} photos
 * @returns {Promise<number>} Number of photos saved
 */
export async function batchSavePhotos(photos) {
  if (!photos || photos.length === 0) return 0
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const now = new Date().toISOString()

  let count = 0
  for (const item of photos) {
    if (item.studentId && item.blob) {
      await store.put({
        studentId: String(item.studentId),
        blob: item.blob,
        updatedAt: now
      })
      count++
    }
  }

  await tx.done
  return count
}

/**
 * Returns a Set of all student IDs that currently have a saved photo.
 * Fast primary key scan without loading heavy blobs into memory.
 * @returns {Promise<Set<string>>}
 */
export async function getAllPhotoIds() {
  const db = await getDB()
  const keys = await db.getAllKeys(STORE_NAME)
  return new Set(keys.map(k => String(k)))
}

/**
 * Purges all student photos (useful for year-end reset or database maintenance).
 * @returns {Promise<void>}
 */
export async function purgeAllPhotos() {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await tx.objectStore(STORE_NAME).clear()
  await tx.done
}
