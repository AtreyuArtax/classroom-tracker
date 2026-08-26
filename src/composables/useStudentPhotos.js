/**
 * src/composables/useStudentPhotos.js
 *
 * Singleton reactive cache and state management for student photos.
 * Provides in-memory ObjectURL mapping with lifecycle cleanup, image compression,
 * and photo visibility preferences.
 */

import { ref, shallowRef, watch } from 'vue'
import * as photoService from '../db/photoService.js'

// Global toggle for displaying photos on desk tiles (defaults to false)
export const showDeskPhotos = ref(localStorage.getItem('showDeskPhotos') === 'true')
watch(showDeskPhotos, (val) => localStorage.setItem('showDeskPhotos', String(val)))

// In-memory lightweight reactive cache: studentId -> { url: string, updatedAt: string }
const photoCache = shallowRef(new Map())
const photoIdsSet = shallowRef(new Set())
let isInitialized = false

/**
 * Revokes all currently allocated ObjectURLs in the cache to free browser texture memory.
 */
export function clearPhotoCache() {
  for (const item of photoCache.value.values()) {
    if (item?.url) {
      try { URL.revokeObjectURL(item.url) } catch (e) { /* ignore */ }
    }
  }
  photoCache.value = new Map()
  photoIdsSet.value = new Set()
  isInitialized = false
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
 * Initializes the known photo IDs set on app launch.
 */
async function initPhotoIds() {
  try {
    const ids = await photoService.getAllPhotoIds()
    photoIdsSet.value = ids
    isInitialized = true
  } catch (err) {
    console.warn('[useStudentPhotos] Failed to initialize photo IDs:', err)
  }
}

// Eagerly initialize on module load
initPhotoIds()

export function useStudentPhotos() {

  /**
   * Returns true if a photo is known to exist for this student ID.
   * @param {string} studentId
   * @returns {boolean}
   */
  function hasPhoto(studentId) {
    if (!studentId) return false
    const sId = String(studentId)
    // If not initialized yet, trigger async background load
    if (!isInitialized) {
      initPhotoIds()
    }
    return photoIdsSet.value.has(sId) || photoCache.value.has(sId)
  }

  /**
   * Retrieves the in-memory ObjectURL for a student photo.
   * Loads asynchronously on-demand from IndexedDB if not already cached.
   * @param {string} studentId
   * @returns {string|null}
   */
  function getPhotoUrl(studentId) {
    if (!studentId) return null
    const sId = String(studentId)
    const cached = photoCache.value.get(sId)
    if (cached) return cached.url

    // Fetch from DB asynchronously if not yet cached
    loadPhotoFromDb(sId)
    return null
  }

  async function loadPhotoFromDb(studentId) {
    const sId = String(studentId)
    if (photoCache.value.has(sId)) return
    try {
      const record = await photoService.getPhoto(sId)
      if (record && record.blob) {
        const url = URL.createObjectURL(record.blob)
        const nextMap = new Map(photoCache.value)
        nextMap.set(sId, { url, updatedAt: record.updatedAt })
        photoCache.value = nextMap

        const nextSet = new Set(photoIdsSet.value)
        nextSet.add(sId)
        photoIdsSet.value = nextSet
      }
    } catch (err) {
      console.warn(`[useStudentPhotos] Failed to load photo for ${sId}:`, err)
    }
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
    const existing = photoCache.value.get(sId)
    if (existing?.url) URL.revokeObjectURL(existing.url)

    const url = URL.createObjectURL(compressedBlob)
    const nextMap = new Map(photoCache.value)
    nextMap.set(sId, { url, updatedAt: new Date().toISOString() })
    photoCache.value = nextMap

    const nextSet = new Set(photoIdsSet.value)
    nextSet.add(sId)
    photoIdsSet.value = nextSet
  }

  /**
   * Deletes a student's photo.
   * @param {string} studentId
   */
  async function deleteStudentPhoto(studentId) {
    if (!studentId) return
    const sId = String(studentId)
    await photoService.deletePhoto(sId)

    const existing = photoCache.value.get(sId)
    if (existing?.url) URL.revokeObjectURL(existing.url)

    const nextMap = new Map(photoCache.value)
    nextMap.delete(sId)
    photoCache.value = nextMap

    const nextSet = new Set(photoIdsSet.value)
    nextSet.delete(sId)
    photoIdsSet.value = nextSet
  }

  /**
   * Batch imports an array of compressed photos.
   * @param {Array<{ studentId: string, blob: Blob }>} items
   */
  async function batchImport(items) {
    if (!items || items.length === 0) return 0
    const count = await photoService.batchSavePhotos(items)
    const nextMap = new Map(photoCache.value)
    const nextSet = new Set(photoIdsSet.value)

    for (const item of items) {
      const sId = String(item.studentId)
      const existing = nextMap.get(sId)
      if (existing?.url) URL.revokeObjectURL(existing.url)

      const url = URL.createObjectURL(item.blob)
      nextMap.set(sId, { url, updatedAt: new Date().toISOString() })
      nextSet.add(sId)
    }
    photoCache.value = nextMap
    photoIdsSet.value = nextSet
    return count
  }

  return {
    showDeskPhotos,
    initPhotoIds,
    clearPhotoCache,
    hasPhoto,
    getPhotoUrl,
    saveStudentPhoto,
    deleteStudentPhoto,
    batchImport,
    compressAndCropImage
  }
}
