<template>
  <div class="app-shell">

    <!-- ── Navigation bar ─────────────────────────────────────────────── -->
    <nav class="app-nav" role="navigation" aria-label="Main navigation">
      <div class="app-nav__brand">
        <span class="app-nav__logo" aria-hidden="true">📋</span>
        <span class="app-nav__title">Class Tracker</span>
      </div>

      <div class="app-nav__tabs" role="tablist">
        <button
          v-for="view in views"
          :key="view.id"
          class="app-nav__tab"
          :class="{ 'app-nav__tab--active': currentView === view.id }"
          role="tab"
          :aria-selected="currentView === view.id"
          @click="currentView = view.id"
        >
          <span class="app-nav__tab-icon" aria-hidden="true">{{ view.icon }}</span>
          <span class="app-nav__tab-label">{{ view.label }}</span>
        </button>
      </div>
    </nav>

    <!-- ── Main content — dynamic component (CLAUDE.md: no vue-router) ── -->
    <main class="app-main" role="main">
      <component
        :is="currentComponent"
        @navigate="navigateTo"
      />
    </main>

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

import { ref, computed, onMounted } from 'vue'
import Dashboard from './views/Dashboard.vue'
import Setup     from './views/Setup.vue'
import Reports   from './views/Reports.vue'
import { useClassroom } from './composables/useClassroom.js'

// ─── navigation ──────────────────────────────────────────────────────────────

const currentView = ref('Dashboard')

const views = [
  { id: 'Dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'Setup',     label: 'Setup',     icon: '⚙️' },
  { id: 'Reports',   label: 'Reports',   icon: '📊' },
]

const viewComponents = { Dashboard, Setup, Reports }
const currentComponent = computed(() => viewComponents[currentView.value])

function navigateTo(viewId) {
  if (viewComponents[viewId]) currentView.value = viewId
}

// ─── init — load IDB data before first render ─────────────────────────────

const { init } = useClassroom()

onMounted(async () => {
  await init()
})
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
