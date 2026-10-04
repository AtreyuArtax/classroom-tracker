/**
 * src/utils/appVersion.js
 *
 * Exposes application version metadata and a cache-busting hard reload utility.
 */

import { CURRENT_SCHEMA } from '../db/migrations.js'

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
// Short git commit of the build. The dev server reports 'dev' since its code may not match any commit.
export const BUILD_ID = import.meta.env?.DEV || typeof __BUILD_ID__ === 'undefined' ? 'dev' : __BUILD_ID__
// ISO timestamp of when the bundle was built (empty outside Vite builds)
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
