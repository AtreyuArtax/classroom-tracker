/**
 * src/utils/appVersion.js
 *
 * Exposes application version metadata and a cache-busting hard reload utility.
 */

import { CURRENT_SCHEMA } from '../db/migrations.js'

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'
export const BUILD_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : ''
export const SCHEMA_VERSION = CURRENT_SCHEMA

/**
 * Unregisters service workers, purges Workbox caches, and hard reloads the application.
 * Ensures users get the latest bundle when updates are deployed.
 */
export async function forceAppUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        await reg.unregister()
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      for (const key of keys) {
        await caches.delete(key)
      }
    }
  } catch (err) {
    console.warn('Error clearing caches during force reload:', err)
  }
  window.location.reload()
}
