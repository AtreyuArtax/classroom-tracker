<template>
  <div class="setup">
    <!-- ── Page Header & Class Selector ───────────────────────────── -->
    <div class="setup__header">
      <div class="setup__header-left">
        <button v-if="props.from === 'Grades'" class="app-back-btn" @click="$emit('navigate', 'Grades')">
          <ArrowLeft :size="15" /> Back to Gradebook
        </button>
        <div v-if="activeTab === 'active'" class="setup__header-class">
          <label for="setup-class-selector" class="setup__header-label">Configuring:</label>
          <select 
            id="setup-class-selector" 
            class="setup__class-selector"
            :value="activeClass?.classId"
            @change="e => switchClass(e.target.value)"
          >
            <option v-if="filteredClassList.length === 0" value="">No Classes</option>
            <option v-for="cls in filteredClassList" :key="cls.classId" :value="cls.classId">
              {{ cls.classType === 'elementary' ? cls.name : `${cls.name} (P${cls.periodNumber})` }}
            </option>
          </select>
        </div>
      </div>
      <div class="setup__header-right">
        <UndoButton />

        <button class="setup__btn-ghost" style="min-height: 38px; padding: 0 16px;" @click="isHelpModalOpen = true">
          <HelpCircle :size="16" /> User Guide
        </button>
      </div>
    </div>

    <!-- ── Page tabs ─────────────────────────────────────────────── -->
    <div class="setup__tabs" role="tablist">
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
          <GradeBucketsSettings />
          <BehaviorSettings />
          <PeriodScheduleSettings />
          <AttendanceStationSettings />
        </div>
      </div>
    </section>

    <!-- PILLAR 3: Calendar Manager -->
    <section v-else-if="activeTab === 'calendar'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
          <CalendarSettings />
        </div>
      </div>
    </section>

    <!-- PILLAR 4: Curriculum Library (kept mounted so unsaved edits survive tab switches) -->
    <section v-show="activeTab === 'curriculum'" class="setup__panel">
      <CurriculumLibraryManager />
    </section>

    <!-- PILLAR 5: All Classes (Class Manager) -->
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
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
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
const PeriodScheduleSettings      = defineAsyncComponent(() => import('../components/setup/PeriodScheduleSettings.vue'))
const AttendanceStationSettings   = defineAsyncComponent(() => import('../components/setup/AttendanceStationSettings.vue'))
const ClassManagerPanel           = defineAsyncComponent(() => import('../components/setup/ClassManagerPanel.vue'))
const AddClassModal               = defineAsyncComponent(() => import('../components/setup/AddClassModal.vue'))

const props = defineProps({
  tab: { type: String, default: '' },
  from: { type: String, default: '' },
  openAdd: { type: Boolean, default: false }
})
defineEmits(['navigate'])

const { classList, activeClass, filteredClassList, switchClass } = useClassroom()
const { select: selectMessage } = useMessage()

// --- Tabs ---
const setupTabs = [
  { id: 'active',     label: 'Active Class',        icon: Zap },
  { id: 'app',        label: 'App Settings',        icon: Settings },
  { id: 'calendar',   label: 'Calendar',            icon: CalendarDays },
  { id: 'curriculum', label: 'Curriculum Library',  icon: BookOpen },
  { id: 'manage',     label: 'Manage Classes',      icon: FolderOpen },
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
  'backup': 'data',
  'data': 'data'
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
  if (newTab) activeTab.value = tabMap[newTab] || newTab
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
  if (e?.detail) activeTab.value = tabMap[e.detail] || e.detail
}

onMounted(async () => {
  window.addEventListener('switch-setup-tab', handleSwitchSetupTab)
  if (!activeClass.value && filteredClassList.value.length > 0) {
    await switchClass(filteredClassList.value[0].classId)
  }
})
onUnmounted(() => {
  window.removeEventListener('switch-setup-tab', handleSwitchSetupTab)
})
</script>
<style src="../assets/styles/setup.css"></style>
<style scoped>
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
