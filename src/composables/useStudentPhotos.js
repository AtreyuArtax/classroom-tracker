/**
 * src/composables/useStudentPhotos.js
 *
 * Singleton reactive cache and state management for student photos.
 * Provides in-memory ObjectURL mapping with lifecycle cleanup, image compression,
 * and photo visibility preferences.
 */

import { ref, reactive, watch } from 'vue'
import * as photoService from '../db/photoService.js'

// Global toggle for displaying photos on desk tiles (defaults to false)
export const showDeskPhotos = ref(localStorage.getItem('showDeskPhotos') === 'true')
watch(showDeskPhotos, (val) => localStorage.setItem('showDeskPhotos', String(val)))

// In-memory lightweight reactive cache: studentId -> { url: string | null, updatedAt: string | null }
// Uses reactive(new Map()) and reactive(new Set()) for granular key-level Vue reactivity.
// Setting or loading one student's photo ONLY triggers the effect for that specific student,
// completely eliminating the O(N^2) cross-invalidation cascading re-render loop.
const photoCache = reactive(new Map())
const photoIdsSet = reactive(new Set())
let isInitialized = false
let initPromise = null

// In-flight batch queue & deduplication
const inFlightRequests = new Map() // studentId -> Promise<string|null>
const pendingBatch = new Set()
let batchScheduled = false
const batchResolvers = new Map() // studentId -> Array<Function>

/**
 * Revokes all currently allocated ObjectURLs in the cache to free browser texture memory.
 */
export function clearPhotoCache() {
  for (const item of photoCache.values()) {
    if (item?.url) {
      try { URL.revokeObjectURL(item.url) } catch (e) { /* ignore */ }
    }
  }
  photoCache.clear()
  photoIdsSet.clear()
  pendingBatch.clear()
  inFlightRequests.clear()
  batchResolvers.clear()
  isInitialized = false
  initPromise = null
}

/**
 * Fully clears and re-initializes the photo cache from IndexedDB after imports or restores.
 */
export async function reloadPhotoCache() {
  clearPhotoCache()
  await initPhotoIds()
}

/**
 * Compress, downscale, and center-crop any image (File, Blob, or Data URL)
 * into a lightweight 1:1 square WebP/JPEG blob (~20-30KB).
 *
 * @param {File|Blob|string} source
 * @param {number} targetSize Pixel width/height of the square output (default 240)
 * @param {number} quality Quality from 0 to 1 (default 0.85)
 * @returns {Promise<Blob>}
 */
export async function compressAndCropImage(source, targetSize = 240, quality = 0.85) {
  return new Promise((resolve, reject) => {
    let img = new Image()
    let srcUrl = ''

    if (typeof source === 'string') {
      srcUrl = source
    } else {
      srcUrl = URL.createObjectURL(source)
    }

    img.onload = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(srcUrl)

      const canvas = document.createElement('canvas')
      canvas.width = targetSize
      canvas.height = targetSize
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'))
        return
      }

      // Calculate center square crop
      const minDim = Math.min(img.width, img.height)
      const sx = (img.width - minDim) / 2
      const sy = (img.height - minDim) / 2

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize)

      // Try webp first, fall back to jpeg
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          canvas.toBlob((jpegBlob) => {
            if (jpegBlob) resolve(jpegBlob)
            else reject(new Error('Failed to compress image'))
          }, 'image/jpeg', quality)
        }
      }, 'image/webp', quality)
    }

    img.onerror = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(srcUrl)
      reject(new Error('Failed to load image for processing'))
    }

    img.src = srcUrl
  })
}

/**
 * Initializes the known photo IDs set on app launch with singleton in-flight deduplication.
 */
export async function initPhotoIds() {
  if (isInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const ids = await photoService.getAllPhotoIds()
      photoIdsSet.clear()
      for (const id of ids) {
        photoIdsSet.add(String(id))
      }
      isInitialized = true
    } catch (err) {
      console.warn('[useStudentPhotos] Failed to initialize photo IDs:', err)
    } finally {
      initPromise = null
    }
  })()

  return initPromise
}

// Eagerly initialize on module load
initPhotoIds()

/**
 * Queues a student ID to be loaded in the next microtask batch from IndexedDB.
 * Deduplicates multiple concurrent requests for the same student ID.
 */
function queuePhotoLoad(studentId) {
  const sId = String(studentId)
  if (photoCache.has(sId) || inFlightRequests.has(sId)) return inFlightRequests.get(sId)

  pendingBatch.add(sId)

  const promise = new Promise((resolve) => {
    if (!batchResolvers.has(sId)) {
      batchResolvers.set(sId, [])
    }
    batchResolvers.get(sId).push(resolve)
  })

  inFlightRequests.set(sId, promise)

  if (!batchScheduled) {
    batchScheduled = true
    queueMicrotask(flushPhotoBatch)
  }

  return promise
}

/**
 * Flushes all queued photo requests in a single IndexedDB transaction.
 */
async function flushPhotoBatch() {
  batchScheduled = false
  const idsToFetch = Array.from(pendingBatch)
  pendingBatch.clear()

  if (idsToFetch.length === 0) return

  try {
    const photoRecords = await photoService.getPhotosBatch(idsToFetch)

    for (const sId of idsToFetch) {
      const record = photoRecords.get(sId)
      if (record && record.blob) {
        const url = URL.createObjectURL(record.blob)
        photoCache.set(sId, { url, updatedAt: record.updatedAt })
        photoIdsSet.add(sId)
      } else {
        // Record null so missing photos are not continuously re-queried
        photoCache.set(sId, { url: null, updatedAt: null })
      }
    }
  } catch (err) {
    console.warn('[useStudentPhotos] Failed to batch load photos:', err)
    for (const sId of idsToFetch) {
      if (!photoCache.has(sId)) {
        photoCache.set(sId, { url: null, updatedAt: null })
      }
    }
  } finally {
    for (const sId of idsToFetch) {
      const resolvers = batchResolvers.get(sId)
      if (resolvers) {
        const finalUrl = photoCache.get(sId)?.url || null
        resolvers.forEach(r => r(finalUrl))
        batchResolvers.delete(sId)
      }
      inFlightRequests.delete(sId)
    }
  }
}

/**
 * Preloads photos for a list of student IDs in batch.
 * @param {Array<string|number>} studentIds
 */
export async function preloadPhotos(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) return
  const needed = studentIds
    .map(id => String(id))
    .filter(id => id && !photoCache.has(id))

  if (needed.length === 0) return
  const promises = needed.map(id => queuePhotoLoad(id))
  await Promise.all(promises)
}

export function useStudentPhotos() {

  /**
   * Returns true if a photo is known to exist for this student ID.
   * @param {string|number} studentId
   * @returns {boolean}
   */
  function hasPhoto(studentId) {
    if (!studentId) return false
    const sId = String(studentId)
    if (!isInitialized) {
      initPhotoIds()
    }
    if (photoCache.has(sId)) {
      return Boolean(photoCache.get(sId)?.url)
    }
    return photoIdsSet.has(sId)
  }

  /**
   * Retrieves the in-memory ObjectURL for a student photo.
   * Granularly tracked by Vue per studentId key.
   * Loads asynchronously on-demand from IndexedDB in batches if not already cached.
   * @param {string|number} studentId
   * @returns {string|null}
   */
  function getPhotoUrl(studentId) {
    if (!studentId) return null
    const sId = String(studentId)
    const cached = photoCache.get(sId)
    if (cached !== undefined) {
      return cached?.url || null
    }

    // Schedule batch load from IndexedDB
    queuePhotoLoad(sId)
    return null
  }

  /**
   * Loads a single photo asynchronously if needed.
   * @param {string|number} studentId
   * @returns {Promise<string|null>}
   */
  async function loadPhotoFromDb(studentId) {
    if (!studentId) return null
    const sId = String(studentId)
    if (photoCache.has(sId)) {
      return photoCache.get(sId)?.url || null
    }
    return queuePhotoLoad(sId)
  }

  /**
   * Saves a new or updated photo for a student.
   * @param {string} studentId
   * @param {Blob|File|string} rawImage
   */
  async function saveStudentPhoto(studentId, rawImage) {
    if (!studentId || !rawImage) return
    const sId = String(studentId)
    const compressedBlob = await compressAndCropImage(rawImage)
    await photoService.savePhoto(sId, compressedBlob)

    // Revoke old URL if existing
    const existing = photoCache.get(sId)
    if (existing?.url) URL.revokeObjectURL(existing.url)

    const url = URL.createObjectURL(compressedBlob)
    photoCache.set(sId, { url, updatedAt: new Date().toISOString() })
    photoIdsSet.add(sId)
  }

  /**
   * Deletes a student's photo.
   * @param {string} studentId
   */
  async function deleteStudentPhoto(studentId) {
    if (!studentId) return
    const sId = String(studentId)
    await photoService.deletePhoto(sId)

    const existing = photoCache.get(sId)
    if (existing?.url) URL.revokeObjectURL(existing.url)

    photoCache.set(sId, { url: null, updatedAt: null })
    photoIdsSet.delete(sId)
  }

  /**
   * Batch imports an array of compressed photos.
   * @param {Array<{ studentId: string, blob: Blob }>} items
   */
  async function batchImport(items) {
    if (!items || items.length === 0) return 0
    const count = await photoService.batchSavePhotos(items)

    for (const item of items) {
      const sId = String(item.studentId)
      const existing = photoCache.get(sId)
      if (existing?.url) URL.revokeObjectURL(existing.url)

      const url = URL.createObjectURL(item.blob)
      photoCache.set(sId, { url, updatedAt: new Date().toISOString() })
      photoIdsSet.add(sId)
    }
    return count
  }

  return {
    showDeskPhotos,
    initPhotoIds,
    clearPhotoCache,
    reloadPhotoCache,
    hasPhoto,
    getPhotoUrl,
    loadPhotoFromDb,
    preloadPhotos,
    saveStudentPhoto,
    deleteStudentPhoto,
    batchImport,
    compressAndCropImage
  }
}

