/**
 * src/composables/useAppUpdate.js
 *
 * Manual "Check for Updates" flow for the PWA. Asks the service worker
 * registration to look for a new build, and reloads only when one was found
 * and activated. Before any reload it leaves a note in sessionStorage so the
 * app can reopen App Settings and confirm what happened (consumeUpdateNotice).
 */

import { ref } from 'vue'
import { APP_VERSION, BUILD_ID, forceAppUpdate } from '../utils/appVersion.js'

const NOTICE_KEY = 'appUpdateNotice'
const MIN_CHECK_MS = 900          // keep "Checking…" on screen long enough to read
const ACTIVATE_TIMEOUT_MS = 15000 // reload anyway if the new worker never reports in

// 'idle' | 'checking' | 'installing' | 'refreshing' | 'current' | 'offline' | 'error' | 'unavailable'
const updateStatus = ref('idle')

// The autoUpdate service worker can install a new build in the background and take
// control mid-session. The page keeps running the old code until it reloads, so
// remember that a newer worker took over. (App.vue imports this module at startup.)
let newerWorkerTookOver = false
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('controllerchange', () => { newerWorkerTookOver = true })
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function leaveNotice(kind) {
  try {
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ kind, fromVersion: APP_VERSION, fromBuild: BUILD_ID }))
  } catch { /* storage blocked: the reload still works, just without the confirmation */ }
}

/**
 * Returns the notice left before an update/refresh reload ({ kind, fromVersion, fromBuild }),
 * or null, and clears it so it only shows once.
 */
export function consumeUpdateNotice() {
  try {
    const raw = sessionStorage.getItem(NOTICE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(NOTICE_KEY)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function waitForActivation(worker) {
  return new Promise((resolve) => {
    let timer = null
    const done = () => {
      clearTimeout(timer)
      navigator.serviceWorker.removeEventListener('controllerchange', done)
      resolve()
    }
    timer = setTimeout(done, ACTIVATE_TIMEOUT_MS)
    navigator.serviceWorker.addEventListener('controllerchange', done)
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated' || worker.state === 'redundant') done()
    })
    if (worker.state === 'activated') done()
    // Harmless when the worker already skips waiting on install
    worker.postMessage({ type: 'SKIP_WAITING' })
  })
}

export function useAppUpdate() {
  async function checkForUpdates() {
    if (['checking', 'installing', 'refreshing'].includes(updateStatus.value)) return
    updateStatus.value = 'checking'
    const startedAt = Date.now()
    const holdMinimum = () => delay(Math.max(0, MIN_CHECK_MS - (Date.now() - startedAt)))
    const finish = async (status) => {
      await holdMinimum()
      updateStatus.value = status
    }

    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (!reg) return finish('unavailable')
    if (!navigator.onLine) return finish('offline')

    try {
      await reg.update()
    } catch (err) {
      console.warn('Update check failed:', err)
      return finish(navigator.onLine ? 'error' : 'offline')
    }

    const incoming = reg.installing || reg.waiting
    if (!incoming && !newerWorkerTookOver) return finish('current')

    await finish('installing')
    await (incoming ? waitForActivation(incoming) : delay(MIN_CHECK_MS))
    leaveNotice('update')
    window.location.reload()
  }

  async function forceRefresh() {
    updateStatus.value = 'refreshing'
    await delay(MIN_CHECK_MS)
    leaveNotice('refresh')
    await forceAppUpdate()
  }

  return { updateStatus, checkForUpdates, forceRefresh }
}
