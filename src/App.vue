<template>
  <div class="app-shell">

    <!-- ── Navigation bar ─────────────────────────────────────────────── -->
    <nav class="app-nav" role="navigation" aria-label="Main navigation">
      <div class="app-nav__brand">
        <ClipboardList :size="24" class="app-nav__logo" />
        <span class="app-nav__title">Class Tracker</span>
        <button 
          v-if="isSyncLinked" 
          class="app-nav__sync-btn" 
          :class="{
            'app-nav__sync-btn--synced':   !isUnsynced && !isSyncing && !syncBroken,
            'app-nav__sync-btn--unsynced': isUnsynced && !isSyncing && !syncBroken,
            'app-nav__sync-btn--broken':   syncBroken && !isSyncing,
            'app-nav__sync-btn--success':  syncSuccess 
          }"
          @click="doQuickSync" 
          :title="isSyncing ? 'Syncing…'
            : syncBroken   ? 'Sync failed — click to retry, or re-link file in Setup → Data Backup'
            : isUnsynced   ? 'Unsaved changes — click to backup now'
            : lastSyncedAt ? `All changes backed up · Last sync: ${formatSyncTime(lastSyncedAt)}`
            : 'All changes backed up'"
          :disabled="isSyncing"
        >
          <CloudOff     v-if="syncBroken && !isSyncing"   :size="20" />
          <CloudUpload  v-else-if="isUnsynced && !isSyncing" :size="20" class="app-nav__sync-icon--pulse" />
          <Cloud        v-else-if="isSyncing"              :size="20" class="app-nav__sync-icon--syncing" />
          <CloudCheck   v-else                             :size="20" />
        </button>
      </div>

      <div class="app-nav__tabs" role="tablist">
        <button
          v-for="view in views"
          :key="view.id"
          class="app-nav__tab"
          :class="{ 'app-nav__tab--active': currentView === view.id }"
          role="tab"
          :aria-selected="currentView === view.id"
          @click="navigateTo(view.id)"
        >
          <component :is="view.icon" :size="22" class="app-nav__tab-icon" />
          <span class="app-nav__tab-label">{{ view.label }}</span>
        </button>
      </div>
    </nav>

    <!-- ── Main content — dynamic component (CLAUDE.md: no vue-router) ── -->
    <main class="app-main" role="main">
      <component
        :is="currentComponent"
        v-bind="viewParams"
        @navigate="navigateTo"
      />
    </main>

    <!-- ── Global Modals ────────────────────────────────────────────────── -->
    <AddAssessmentModal />

  </div>
</template>

<script setup>
/**
 * App.vue
 *
 * Root component. Owns the single reactive ref that drives navigation.
 * CLAUDE.md §2 (Navigation directive):
 *   const currentView = ref('Dashboard') // 'Dashboard' | 'Setup' | 'Reports'
 *   <component :is="currentView" />
 *
 * The class switcher and nav buttons mutate currentView.
 * Do NOT install or use vue-router.
 */

import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import { ClipboardList, LayoutDashboard, Settings, BarChart2, Cloud, CloudUpload, CloudCheck, CloudOff, GraduationCap } from 'lucide-vue-next'

// Lazy-load views to reduce initial bundle size
const Dashboard = defineAsyncComponent(() => import('./views/Dashboard.vue'))
const Setup     = defineAsyncComponent(() => import('./views/Setup.vue'))
const Reports   = defineAsyncComponent(() => import('./views/Reports.vue'))
const Grades    = defineAsyncComponent(() => import('./views/Grades.vue'))

import { useClassroom } from './composables/useClassroom.js'
import AddAssessmentModal from './components/dossier/AddAssessmentModal.vue'
import * as settingsService from './db/settingsService.js'
import * as eventService from './db/eventService.js'
import { hasUnsyncedChanges, getLastSyncedAt } from './db/eventService.js'

// Wrap external ref in computed to guarantee template unwrapping inside object literals
const isUnsynced = computed(() => hasUnsyncedChanges.value)

// ─── navigation ──────────────────────────────────────────────────────────────

const currentView = ref('Dashboard')
const viewParams  = ref({})

const views = [
  { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'Reports',   label: 'Reports',   icon: BarChart2 },
  { id: 'Grades',    label: 'Grades',    icon: GraduationCap },
  { id: 'Setup',     label: 'Setup',     icon: Settings },
]

const viewComponents = { Dashboard, Setup, Reports, Grades }
const currentComponent = computed(() => viewComponents[currentView.value])

function navigateTo(viewId, params = {}) {
  if (viewComponents[viewId]) {
    currentView.value = viewId
    viewParams.value = params
  }
}

// ─── init — load IDB data before first render ─────────────────────────────

const { init } = useClassroom()

const isSyncLinked   = ref(false)
const isSyncing      = ref(false)
const syncSuccess    = ref(false)
const syncBroken     = ref(false)  // true when last sync failed (file moved / permission revoked)
const lastSyncedAt   = ref(null)   // ISO string, persisted across reloads via IndexedDB
let   autoSyncTimer  = null        // debounce handle for auto-sync

const { computeSuggestedClass } = useClassroom()

watch(currentView, (newView) => {
  if (newView === 'Dashboard') {
    computeSuggestedClass()
  }
})

async function checkSyncStatus() {
  const settings = await settingsService.getSettings()
  isSyncLinked.value = !!settings.backupFileHandle
}

onMounted(async () => {
  await init()
  await checkSyncStatus()

  // Bootstrap sync display from persisted timestamp — avoids false "needs sync" on reload
  const stored = await getLastSyncedAt()
  if (stored) {
    lastSyncedAt.value = stored
    // hasUnsyncedChanges starts false (set in eventService), so no extra work needed
  }

  window.addEventListener('backup-linked', checkSyncStatus)
})

onUnmounted(() => {
  window.removeEventListener('backup-linked', checkSyncStatus)
  clearTimeout(autoSyncTimer)
})

// ─── auto-sync watcher (3-second debounce) ────────────────────────────────
watch(hasUnsyncedChanges, (dirty) => {
  if (!dirty || !isSyncLinked.value) return
  clearTimeout(autoSyncTimer)
  autoSyncTimer = setTimeout(async () => {
    if (!hasUnsyncedChanges.value) return // already synced by manual click
    const result = await eventService.quickSyncBackup()
    if (result) {
      lastSyncedAt.value = result
      syncBroken.value = false
    } else {
      syncBroken.value = true  // show CloudOff — user can click to retry or re-link
    }
  }, 3000)
})

function formatSyncTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function doQuickSync() {
  if (isSyncing.value) return
  clearTimeout(autoSyncTimer)  // cancel pending auto-sync if user clicked manually
  isSyncing.value = true
  const result = await eventService.quickSyncBackup()
  isSyncing.value = false
  if (result) {
    lastSyncedAt.value = result
    syncBroken.value = false
    syncSuccess.value = true
    setTimeout(() => syncSuccess.value = false, 2500)
  } else {
    syncBroken.value = true
  }
}
</script>

<style scoped>
/* ── App shell ────────────────────────────────────────────────────────── */
.app-shell {
  display:        flex;
  flex-direction: column;
  height:         100dvh;   /* cap height so children can own their scroll */
  overflow:       hidden;
  background:     var(--bg-secondary);
}

/* ── Navigation bar ──────────────────────────────────────────────────── */
.app-nav {
  display:          flex;
  align-items:      center;
  justify-content:  space-between;
  padding:          0 16px;
  height:           56px;
  background:       var(--surface);
  box-shadow:       var(--shadow-sm);
  position:         sticky;
  top:              0;
  z-index:          200;
  border-bottom:    1px solid var(--border);
}

.app-nav__brand {
  display:     flex;
  align-items: center;
  gap:         8px;
}

.app-nav__logo {
  font-size: 1.3rem;
}

.app-nav__title {
  font-size:   1rem;
  font-weight: 700;
  color:       var(--text);
}

.app-nav__sync-btn {
  background:      transparent;
  border:          none;
  color:           var(--text-secondary);
  cursor:          pointer;
  padding:         6px;
  border-radius:   50%;
  margin-left:     8px;
  display:         flex;
  align-items:     center;
  justify-content: center;
  transition:      all 0.2s ease;
}

.app-nav__sync-btn:hover {
  background: var(--bg-secondary);
  color:      var(--primary);
}

.app-nav__sync-btn--success {
  color: var(--state-success) !important;
}

.app-nav__sync-btn--broken {
  color: var(--state-danger);
  animation: brokenPulse 2s ease-in-out infinite;
}

@keyframes brokenPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}

.app-nav__sync-btn--synced {
  color:      var(--state-success);
}

.app-nav__sync-btn--synced:hover {
  opacity: 0.8;
}

.app-nav__sync-btn--unsynced {
  color:      var(--primary); /* App loud blue theme */
}

.app-nav__sync-icon--pulse {
  animation: pulseBlue 2s infinite;
}

@keyframes pulseBlue {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

.app-nav__sync-icon--syncing { 
  opacity:   0.5; 
  animation: setupPulse 1s infinite alternate; 
}

@keyframes setupPulse {
  0%   { transform: scale(1); }
  100% { transform: scale(1.15); }
}

/* ── Tab strip ───────────────────────────────────────────────────────── */
.app-nav__tabs {
  display: flex;
  gap:     4px;
}

.app-nav__tab {
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  gap:             2px;
  padding:         6px 14px;
  border:          none;
  border-radius:   var(--radius-sm);
  background:      transparent;
  cursor:          pointer;
  min-height:      44px;
  min-width:       64px;
  transition:      background 0.15s ease, color 0.15s ease;
}

.app-nav__tab:hover {
  background: var(--bg-secondary);
}

.app-nav__tab--active {
  background: var(--primary-light);
}

.app-nav__tab--active .app-nav__tab-label {
  color: var(--primary);
  font-weight: 700;
}

.app-nav__tab-icon {
  font-size: 1.1rem;
}

.app-nav__tab-label {
  font-size:  0.68rem;
  color:      var(--text-secondary);
  font-weight: 500;
}

/* ── Main content area ───────────────────────────────────────────────── */
.app-main {
  flex:     1;
  display:  flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Loading fallback ────────────────────────────────────────────────── */
.app-loading {
  display:         flex;
  align-items:     center;
  justify-content: center;
  flex:            1;
  color:           var(--text-secondary);
  font-size:       0.9rem;
}
</style>
