<template>
  <div class="setup">
    <!-- ── Unified Top Bar: 5 Core Tabs + Global Actions ──────────── -->
    <div class="setup__tabs-bar">
      <div class="setup__tabs" role="tablist">
        <button
          v-if="props.from === 'Grades'"
          type="button"
          class="app-back-btn setup__back-inline"
          @click="$emit('navigate', 'Grades')"
        >
          <ArrowLeft :size="15" /> Back to Gradebook
        </button>

        <button
          v-for="tab in setupTabs"
          :key="tab.id"
          class="setup__tab"
          :class="{ 'setup__tab--active': activeTab === tab.id }"
          role="tab"
          :aria-selected="activeTab === tab.id"
          @click="handleTabClick(tab.id)"
        >
          <component :is="tab.icon" :size="16" />
          {{ tab.label }}
          <span v-if="tab.id === 'curriculum' && curriculumEditorDirty" class="setup__tab-dirty-dot" title="Unsaved changes in Curriculum Library"></span>
        </button>
      </div>

      <div class="setup__header-right">
        <UndoButton />

        <button
          type="button"
          class="setup__intake-nav-btn"
          :class="{ 'setup__intake-nav-btn--active': activeTab === 'manage' }"
          @click="handleTabClick('manage')"
          title="Import rosters, student photos, Day 1 surveys, and manage all classes"
        >
          <FolderOpen :size="16" />
          <span>Classes &amp; Intake</span>
        </button>

        <button
          type="button"
          class="setup__btn-ghost setup__help-btn"
          title="Open User Guide"
          @click="isHelpModalOpen = true"
        >
          <HelpCircle :size="16" />
          <span class="setup__help-btn-label">User Guide</span>
        </button>
      </div>
    </div>

    <!-- PILLAR 1: Active Class Configuration -->
    <section v-if="activeTab === 'active'" class="setup__panel">
      <ClassLogisticsSettings 
        :initial-subtab="activeClassSubtab" 
        @open-add-class="isAddClassModalOpen = true"
      />
    </section>

    <!-- PILLAR 2: Global App Settings -->
    <section v-else-if="activeTab === 'app'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
          <TeacherProfileSettings />
          <AppPreferencesSettings />
          <SeatingDisplaySettings />
          <GradeBucketsSettings />
          <BehaviorSettings />
          <PeriodScheduleSettings />
          <AttendanceStationSettings />
        </div>
      </div>
    </section>

    <!-- PILLAR 3: Calendar & Duty Settings -->
    <section v-else-if="activeTab === 'calendar'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
          <CalendarSettings />
          <DutySettings id="sec-duty-settings" />
        </div>
      </div>
    </section>

    <!-- PILLAR 4: Curriculum Library (kept mounted so unsaved edits survive tab switches) -->
    <section v-show="activeTab === 'curriculum'" class="setup__panel">
      <CurriculumLibraryManager />
    </section>

    <!-- PILLAR 5: Classes & Student Intake Hub -->
    <section v-if="activeTab === 'manage'" class="setup__panel">
      <ClassManagerPanel
        @add-class="isAddClassModalOpen = true"
        @open-class="activeTab = 'active'"
      />
    </section>

    <!-- PILLAR 6: Backup & Data Management -->
    <section v-else-if="activeTab === 'data'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
          <DatabaseMaintenanceSettings />
        </div>
      </div>
    </section>

    <HelpModal :show="isHelpModalOpen" @close="isHelpModalOpen = false" />

    <!-- Add / Import Class (reachable from Manage Classes and the Active Class tab) -->
    <AddClassModal
      v-if="isAddClassModalOpen"
      @close="isAddClassModalOpen = false"
      @csv-file="onRosterCsvSelected"
      @created="onClassCreated"
    />

    <!-- Roster CSV import dialogs: class selection → roster review → summary -->
    <RosterImportFlow ref="rosterImport" />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { 
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Database,
  FolderOpen,
  HelpCircle,
  Settings,
  Zap
} from 'lucide-vue-next'
import UndoButton from '../components/UndoButton.vue'
import SetupQuickJumpNav from '../components/setup/SetupQuickJumpNav.vue'
import RosterImportFlow from '../components/setup/RosterImportFlow.vue'
import { useClassroom } from '../composables/useClassroom.js'
import { useMessage } from '../composables/useMessage.js'
import { 
  curriculumEditorDirty, 
  curriculumEditorTitle, 
  curriculumEditorSaveHandler,
  curriculumEditorDiscardHandler 
} from '../composables/useCurriculumLibrary.js'

const CalendarSettings            = defineAsyncComponent(() => import('../components/setup/CalendarSettings.vue'))
const GradeBucketsSettings        = defineAsyncComponent(() => import('../components/setup/GradeBucketsSettings.vue'))
const HelpModal                   = defineAsyncComponent(() => import('../components/setup/HelpModal.vue'))
const ClassLogisticsSettings      = defineAsyncComponent(() => import('../components/setup/ClassLogisticsSettings.vue'))
const CurriculumLibraryManager    = defineAsyncComponent(() => import('../components/setup/CurriculumLibraryManager.vue'))
const DatabaseMaintenanceSettings = defineAsyncComponent(() => import('../components/setup/DatabaseMaintenanceSettings.vue'))
const BehaviorSettings            = defineAsyncComponent(() => import('../components/setup/BehaviorSettings.vue'))
const TeacherProfileSettings      = defineAsyncComponent(() => import('../components/setup/TeacherProfileSettings.vue'))
const AppPreferencesSettings      = defineAsyncComponent(() => import('../components/setup/AppPreferencesSettings.vue'))
const SeatingDisplaySettings      = defineAsyncComponent(() => import('../components/setup/SeatingDisplaySettings.vue'))
const PeriodScheduleSettings      = defineAsyncComponent(() => import('../components/setup/PeriodScheduleSettings.vue'))
const AttendanceStationSettings   = defineAsyncComponent(() => import('../components/setup/AttendanceStationSettings.vue'))
const ClassManagerPanel           = defineAsyncComponent(() => import('../components/setup/ClassManagerPanel.vue'))
const AddClassModal               = defineAsyncComponent(() => import('../components/setup/AddClassModal.vue'))
const DutySettings                = defineAsyncComponent(() => import('../components/setup/DutySettings.vue'))

const props = defineProps({
  tab: { type: String, default: '' },
  from: { type: String, default: '' },
  openAdd: { type: Boolean, default: false }
})
defineEmits(['navigate'])

const { classList, activeClass, filteredClassList, switchClass } = useClassroom()
const { select: selectMessage } = useMessage()

// --- 5 Core Tabs ---
const setupTabs = [
  { id: 'active',     label: 'Active Class',        icon: Zap },
  { id: 'curriculum', label: 'Curriculum',          icon: BookOpen },
  { id: 'calendar',   label: 'Calendar & Duties',   icon: CalendarDays },
  { id: 'app',        label: 'App Settings',        icon: Settings },
  { id: 'data',       label: 'Backup & Data',       icon: Database },
]

// Deep-link aliases (App `tab` prop and the `switch-setup-tab` window event) → tab id
const tabMap = { 
  'active': 'active',
  'curriculum': 'curriculum',
  'standards': 'curriculum',
  'library': 'curriculum',
  'classes': 'manage', 
  'manage': 'manage',
  'roster': 'active', 
  'gradebook': 'active', 
  'codes': 'app', 
  'app': 'app',
  'calendar': 'calendar',
  'duties': 'calendar',
  'duty': 'calendar',
  'apa': 'calendar',
  'backup': 'data',
  'data': 'data'
}

const DUTY_ALIASES = new Set(['duties', 'duty', 'apa'])

function scrollToDutySectionIfNeeded(rawTab) {
  if (!DUTY_ALIASES.has(rawTab)) return
  setTimeout(() => {
    const el = document.getElementById('sec-duty-settings')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 150)
}

function resolveDefaultTab() {
  if (props.tab && tabMap[props.tab]) return tabMap[props.tab]
  if (classList.value.length === 0) return 'manage'
  return 'active'
}

const activeTab = ref(resolveDefaultTab())

const activeClassSubtab = computed(() => {
  if (props.tab === 'gradebook') return 'grading'
  if (props.tab === 'roster') return 'students'
  return 'logistics'
})

watch(() => props.tab, (newTab) => {
  if (newTab) {
    activeTab.value = tabMap[newTab] || newTab
    nextTick(() => scrollToDutySectionIfNeeded(newTab))
  }
})

async function handleTabClick(tabId) {
  if (activeTab.value === tabId) return
  if (activeTab.value === 'curriculum' && curriculumEditorDirty.value) {
    const courseTitle = curriculumEditorTitle.value || 'this course blueprint'
    const choice = await selectMessage(
      `You have unsaved multiplier and text changes for "${courseTitle}". What would you like to do before switching tabs?`,
      [
        { label: 'Save Changes to Master Library', value: 'save' },
        { label: 'Discard Unsaved Changes', value: 'discard' }
      ],
      'Unsaved Blueprint Changes',
      { cancelLabel: 'Keep Editing' }
    )
    if (choice === 'save') {
      if (curriculumEditorSaveHandler.value) {
        await curriculumEditorSaveHandler.value()
      }
    } else if (choice === 'discard') {
      if (curriculumEditorDiscardHandler.value) {
        curriculumEditorDiscardHandler.value()
      } else {
        curriculumEditorDirty.value = false
      }
    } else {
      return
    }
  }
  activeTab.value = tabId
}

// --- Modals ---
const isHelpModalOpen = ref(false)
const isAddClassModalOpen = ref(false)
const rosterImport = ref(null)

watch(() => props.openAdd, (shouldOpen) => {
  if (shouldOpen) isAddClassModalOpen.value = true
}, { immediate: true })

function onRosterCsvSelected(file) {
  isAddClassModalOpen.value = false
  rosterImport.value?.start(file)
}

async function onClassCreated(classId) {
  isAddClassModalOpen.value = false
  await switchClass(classId)
  activeTab.value = 'active'
}

function handleSwitchSetupTab(e) {
  if (e?.detail) {
    activeTab.value = tabMap[e.detail] || e.detail
    nextTick(() => scrollToDutySectionIfNeeded(e.detail))
  }
}

onMounted(async () => {
  window.addEventListener('switch-setup-tab', handleSwitchSetupTab)
  if (!activeClass.value && filteredClassList.value.length > 0) {
    await switchClass(filteredClassList.value[0].classId)
  }
  if (props.tab) {
    scrollToDutySectionIfNeeded(props.tab)
  }
})
onUnmounted(() => {
  window.removeEventListener('switch-setup-tab', handleSwitchSetupTab)
})
</script>
<style src="../assets/styles/setup.css"></style>
<style scoped>
.setup__tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  border-bottom: 1px solid var(--border);
  padding-right: 12px;
  gap: 8px;
  flex-shrink: 0;
}

.setup__tabs-bar .setup__tabs {
  flex: 1 1 auto;
  min-width: 0;
  box-shadow: none;
  border-bottom: none;
  background: transparent;
}

.setup__tabs-bar :deep(.setup__tab) {
  flex: 1 1 auto;
  padding: 12px 12px;
  font-size: 0.86rem;
  gap: 6px;
}

.setup__tabs-bar .setup__header-right {
  flex-shrink: 0;
  gap: 8px;
}

.setup__help-btn {
  min-height: 36px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

@media (max-width: 1220px) {
  .setup__help-btn {
    padding: 0 9px;
  }
  .setup__help-btn-label {
    display: none;
  }
  .setup__tabs-bar :deep(.setup__tab) {
    padding: 12px 9px;
    font-size: 0.83rem;
  }
  .setup__intake-nav-btn {
    padding: 0 11px;
    font-size: 0.83rem;
  }
}

@media (max-width: 900px) {
  .setup__tabs-bar {
    flex-wrap: wrap;
    padding: 0 12px 8px;
    gap: 6px;
  }
  .setup__tabs-bar .setup__tabs {
    flex: 1 1 100%;
    border-bottom: 1px solid var(--border-light, var(--border));
  }
  .setup__tabs-bar .setup__header-right {
    margin-left: auto;
    padding-top: 4px;
  }
}

.setup__back-inline {
  margin-left: 12px;
  align-self: center;
  flex-shrink: 0;
}

.setup__intake-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  background: var(--primary-light);
  color: var(--primary);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.setup__intake-nav-btn:hover {
  background: color-mix(in srgb, var(--primary) 22%, white);
  border-color: var(--primary);
}

.setup__intake-nav-btn--active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 35%, transparent);
}

.setup__intake-nav-btn--active:hover {
  background: var(--primary-dark);
  color: #ffffff;
}

.setup__tab-dirty-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
  margin-left: 6px;
  display: inline-block;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.8);
  animation: pulse-dot 2s infinite ease-in-out;
}
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}
</style>
