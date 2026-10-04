<template>
  <div class="version-footer">
    <div class="version-footer__info">
      <span class="version-footer__name">
        Classroom Tracker
        <span class="setup__badge setup__badge--new version-footer__badge">v{{ APP_VERSION }}</span>
      </span>
      <span
        class="version-footer__status"
        :class="`version-footer__status--${statusInfo.tone}`"
        role="status"
        aria-live="polite"
      >
        <component :is="statusInfo.icon" v-if="statusInfo.icon" :size="14" :class="{ 'version-footer__spin': statusInfo.spin }" />
        {{ statusInfo.text }}
      </span>
    </div>

    <div class="version-footer__actions">
      <button
        type="button"
        class="setup__btn-ghost version-footer__btn"
        :disabled="isBusy"
        @click="checkForUpdates"
      >
        <RefreshCw :size="14" :class="{ 'version-footer__spin': isBusy }" />
        {{ buttonLabel }}
      </button>
      <button
        type="button"
        class="version-footer__link"
        :disabled="isBusy"
        title="Clears the app's offline cache and reloads. Your classes and data are not affected."
        @click="onForceRefresh"
      >
        Having problems? Force refresh
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AlertCircle, CheckCircle2, Download, Loader2, RefreshCw, WifiOff } from 'lucide-vue-next'
import { APP_VERSION, BUILD_DATE, BUILD_ID, SCHEMA_VERSION } from '../../utils/appVersion.js'
import { useAppUpdate } from '../../composables/useAppUpdate.js'
import { useMessage } from '../../composables/useMessage.js'

const { updateStatus, checkForUpdates, forceRefresh } = useAppUpdate()
const { confirm } = useMessage()

const isBusy = computed(() => ['checking', 'installing', 'refreshing'].includes(updateStatus.value))

function describeBuild() {
  if (BUILD_ID === 'dev') return `Dev build · Schema v${SCHEMA_VERSION}`
  const date = BUILD_DATE
    ? new Date(BUILD_DATE).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : ''
  return [`Build ${BUILD_ID}`, date, `Schema v${SCHEMA_VERSION}`].filter(Boolean).join(' · ')
}

const STATUS = {
  idle:        { text: describeBuild(), tone: 'muted', icon: null },
  checking:    { text: 'Checking for updates…', tone: 'muted', icon: Loader2, spin: true },
  installing:  { text: 'Update found, installing. The app will reload.', tone: 'primary', icon: Download },
  refreshing:  { text: 'Clearing cache and reloading…', tone: 'primary', icon: Loader2, spin: true },
  current:     { text: "You're on the latest version.", tone: 'success', icon: CheckCircle2 },
  offline:     { text: "You're offline. Connect to the internet to check for updates.", tone: 'warn', icon: WifiOff },
  error:       { text: "Couldn't reach the update server. Try again in a moment.", tone: 'warn', icon: AlertCircle },
  unavailable: {
    text: import.meta.env.DEV
      ? 'Update checks are off on the dev server.'
      : "This browser doesn't support app updates.",
    tone: 'muted',
    icon: AlertCircle
  }
}

const statusInfo = computed(() => STATUS[updateStatus.value] || STATUS.idle)

const buttonLabel = computed(() => {
  if (updateStatus.value === 'checking') return 'Checking…'
  if (updateStatus.value === 'installing') return 'Installing…'
  if (updateStatus.value === 'refreshing') return 'Reloading…'
  if (updateStatus.value === 'idle') return 'Check for Updates'
  return 'Check Again'
})

async function onForceRefresh() {
  const ok = await confirm(
    "This clears Classroom Tracker's offline cache and reloads the latest version from the server. Your classes, grades and other data are not affected.",
    'Force Refresh',
    { confirmLabel: 'Clear Cache & Reload' }
  )
  if (ok) await forceRefresh()
}
</script>

<style scoped>
.version-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
}

.version-footer__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.version-footer__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

.version-footer__badge {
  text-transform: none;
  font-family: monospace;
  font-size: 0.78rem;
}

.version-footer__status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  line-height: 1.35;
}

.version-footer__status--muted   { color: var(--text-secondary); }
.version-footer__status--primary { color: var(--primary); font-weight: 600; }
.version-footer__status--success { color: var(--state-success); font-weight: 600; }
.version-footer__status--warn    { color: var(--state-out); }

.version-footer__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.version-footer__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  font-size: 0.85rem;
}

.version-footer__link {
  min-height: 32px;
  padding: 0 4px;
  border: none;
  background: none;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.version-footer__link:hover:not(:disabled) {
  color: var(--primary);
  text-decoration: underline;
}

.version-footer__link:disabled {
  opacity: 0.5;
  cursor: default;
}

.version-footer__spin {
  animation: setup-spin 0.8s linear infinite;
}
</style>
