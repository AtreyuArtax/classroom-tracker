<template>
  <div class="setup__layout">
    <SetupQuickJumpNav activeTab="manage" />
    <div class="setup__main-content">
    <!-- 1. All Classes Directory -->
    <div class="setup__card" id="sec-classes">
      <div class="setup__card-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 class="setup__card-title" style="margin-bottom: 2px;">Manage Classes</h2>
          <p class="setup__hint" style="margin: 0;">Click any class to configure its roster, gradebook framework, and seating.</p>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <button 
            v-if="showAllSessions && allYearGroups.length > 0" 
            type="button"
            class="setup__btn-ghost" 
            style="min-height: 32px; padding: 4px 12px; font-size: 0.8rem;"
            @click="toggleAllYears"
          >
            {{ areAllYearsExpanded ? 'Collapse All' : 'Expand All' }}
          </button>
          <div class="setup__segmented-toggle setup__segmented-toggle--compact">
            <button
              type="button"
              class="setup__segmented-btn"
              :class="{ 'setup__segmented-btn--active': !showAllSessions }"
              @click="showAllSessions = false"
            >
              <span>Current Session</span>
            </button>
            <button
              type="button"
              class="setup__segmented-btn"
              :class="{ 'setup__segmented-btn--active': showAllSessions }"
              @click="showAllSessions = true"
            >
              <span>All Sessions</span>
            </button>
          </div>
          <button 
            v-if="(showAllSessions ? modeAllClasses : filteredClassList).length > 0"
            class="setup__btn-primary" 
            @click="emit('add-class')"
          >
            <Plus :size="16" /> Import / Update Class
          </button>
        </div>
      </div>

      <div v-if="(showAllSessions ? modeAllClasses : filteredClassList).length === 0" class="setup__empty" style="padding: 3.5rem 1.5rem; text-align: center;">
        <FolderOpen :size="48" style="opacity: 0.35; margin-bottom: 1rem; color: var(--primary);" />
        <h3 style="margin-bottom: 6px; font-size: 1.15rem; color: var(--text);">No Classes for This Session</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 440px; margin: 0 auto 1.5rem; line-height: 1.5;">
          Get started by importing your board-provided roster CSV or creating your first class for this school year.
        </p>
        <button class="setup__btn-primary" style="padding: 0 20px; min-height: 40px;" @click="emit('add-class')">
          <Plus :size="16" /> Import / Update Class
        </button>
      </div>

      <!-- When viewing All Sessions: Two-Tier School Year & Semester Cards -->
      <div v-else-if="showAllSessions" class="setup__year-groups">
        <div 
          v-for="yearGroup in allYearGroups" 
          :key="yearGroup.year" 
          class="setup__year-group"
          :class="{ 'setup__year-group--current': yearGroup.isCurrent }"
        >
          <!-- School Year Header Banner -->
          <button 
            type="button" 
            class="setup__year-header" 
            @click="toggleYear(yearGroup.year)"
            :aria-expanded="isYearExpanded(yearGroup)"
          >
            <div class="setup__year-header-left">
              <CalendarDays :size="17" class="setup__year-icon" />
              <span class="setup__year-title">{{ yearGroup.year }} School Year</span>
              <span v-if="yearGroup.isCurrent" class="setup__badge setup__badge--new" style="font-size: 0.72rem; padding: 2px 8px;">
                Current School Year
              </span>
              <span class="setup__chip" style="font-size: 0.72rem; padding: 2px 8px;">
                {{ yearGroup.totalClasses }} {{ yearGroup.totalClasses === 1 ? 'class' : 'classes' }}
              </span>
            </div>
            <div class="setup__year-header-right">
              <ChevronDown 
                :size="18" 
                class="setup__accordion-chevron" 
                :class="{ 'setup__accordion-chevron--expanded': isYearExpanded(yearGroup) }" 
              />
            </div>
          </button>

          <!-- School Year Content (Semesters) -->
          <div v-if="isYearExpanded(yearGroup)" class="setup__year-body">
            <div 
              v-for="session in yearGroup.sessions" 
              :key="session.key" 
              class="setup__session-group"
              :class="{ 'setup__session-group--current': session.isCurrent }"
            >
              <!-- Semester Accordion Header -->
              <button 
                type="button" 
                class="setup__session-header" 
                @click="toggleSession(session.key)"
                :aria-expanded="isSessionExpanded(session)"
              >
                <div class="setup__session-header-left">
                  <span class="setup__session-title">{{ session.label }}</span>
                  <span v-if="session.isCurrent" class="setup__badge setup__badge--new" style="font-size: 0.7rem; padding: 2px 7px;">
                    Current Session
                  </span>
                  <span class="setup__chip" style="font-size: 0.72rem; padding: 2px 8px;">
                    {{ session.classes.length }} {{ session.classes.length === 1 ? 'class' : 'classes' }}
                  </span>
                </div>
                <div class="setup__session-header-right">
                  <ChevronDown 
                    :size="15" 
                    class="setup__accordion-chevron" 
                    :class="{ 'setup__accordion-chevron--expanded': isSessionExpanded(session) }" 
                  />
                </div>
              </button>

              <!-- Semester Classes List -->
              <div v-if="isSessionExpanded(session)" class="setup__session-body">
                <ul class="setup__class-list">
                  <li
                    v-for="cls in session.classes"
                    :key="cls.classId"
                    class="setup__class-item setup__class-item--clickable"
                    :class="{ 'setup__class-item--active': cls.classId === activeClass?.classId }"
                    @click="selectAndOpenClass(cls.classId)"
                    style="cursor: pointer;"
                  >
                    <div style="min-width: 0;">
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span class="setup__class-name">{{ cls.name }}</span>
                        <span v-if="cls.classId === activeClass?.classId" class="setup__badge setup__badge--new" style="font-size: 0.7rem; padding: 2px 6px;">Active</span>
                        <span v-if="cls.courseCode" class="setup__chip setup__chip--blue" style="font-size: 0.72rem; padding: 2px 6px;">{{ cls.courseCode }}</span>
                      </div>
                      <div class="setup__class-meta" style="margin-top: 2px;">
                        <template v-if="cls.classType === 'elementary'">Full Year {{ cls.year }} · {{ studentCount(cls) }} students</template>
                        <template v-else>Period {{ cls.periodNumber }} · {{ cls.year }} Sem {{ cls.semester }}<span v-if="cls.term"> · {{ cls.term }}</span> · {{ studentCount(cls) }} students</template>
                      </div>
                    </div>
                    <div class="setup__class-actions" @click.stop>
                      <button class="setup__pill-btn" @click="onArchiveClass(cls.classId)">Archive</button>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- When viewing Current Session only: Flat List -->
      <ul v-else class="setup__class-list">
        <li
          v-for="cls in filteredClassList"
          :key="cls.classId"
          class="setup__class-item setup__class-item--clickable"
          :class="{ 'setup__class-item--active': cls.classId === activeClass?.classId }"
          @click="selectAndOpenClass(cls.classId)"
          style="cursor: pointer;"
        >
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="setup__class-name">{{ cls.name }}</span>
              <span v-if="cls.classId === activeClass?.classId" class="setup__badge setup__badge--new" style="font-size: 0.7rem; padding: 2px 6px;">Active</span>
              <span v-if="cls.courseCode" class="setup__chip setup__chip--blue" style="font-size: 0.72rem; padding: 2px 6px;">{{ cls.courseCode }}</span>
            </div>
            <div class="setup__class-meta" style="margin-top: 2px;">
              <template v-if="cls.classType === 'elementary'">Full Year {{ cls.year }} · {{ studentCount(cls) }} students</template>
              <template v-else>Period {{ cls.periodNumber }} · {{ cls.year }} Sem {{ cls.semester }}<span v-if="cls.term"> · {{ cls.term }}</span> · {{ studentCount(cls) }} students</template>
            </div>
          </div>
          <div class="setup__class-actions" @click.stop>
            <button class="setup__pill-btn" @click="onArchiveClass(cls.classId)">Archive</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- 2. Archived Classes -->
    <div v-if="(showAllSessions ? modeAllArchivedClasses : filteredArchivedClasses).length > 0" class="setup__card setup__card--archived" id="sec-archived">
      <button class="setup__archived-toggle" @click="isArchivedPanelVisible = !isArchivedPanelVisible">
        <span class="setup__archived-label">
          <Archive :size="16" /> Archived Classes ({{ (showAllSessions ? modeAllArchivedClasses : filteredArchivedClasses).length }})
        </span>
        <span class="setup__archived-chevron"><ChevronDown :size="16" class="setup__accordion-chevron" :class="{ 'setup__accordion-chevron--expanded': isArchivedPanelVisible }" /></span>
      </button>
      <ul v-if="isArchivedPanelVisible" class="setup__class-list setup__archived-list">
        <li v-for="cls in (showAllSessions ? modeAllArchivedClasses : filteredArchivedClasses)" :key="cls.classId" class="setup__class-item setup__class-item--archived">
          <div>
            <div class="setup__class-name">{{ cls.name }}</div>
            <div class="setup__class-meta">
              <template v-if="cls.classType === 'elementary'">Full Year {{ cls.year }} · {{ studentCount(cls) }} students</template>
              <template v-else>Period {{ cls.periodNumber }} · {{ cls.year }} Sem {{ cls.semester }}<span v-if="cls.term"> · {{ cls.term }}</span> · {{ studentCount(cls) }} students</template>
            </div>
          </div>
          <div class="setup__class-actions">
            <button class="setup__pill-btn" @click="onRestoreClass(cls.classId)">Restore</button>
            <button class="setup__pill-btn setup__pill-btn--danger" @click="onDeleteClass(cls.classId)">Delete</button>
          </div>
        </li>
      </ul>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Archive, CalendarDays, ChevronDown, FolderOpen, Plus } from 'lucide-vue-next'
import SetupQuickJumpNav from './SetupQuickJumpNav.vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { useClassDeletion } from '../../composables/useClassDeletion.js'
import { groupClassesByYearAndSession } from '../../utils/classGrouping.js'

const emit = defineEmits(['add-class', 'open-class'])

const {
  activeClass,
  filteredClassList,
  filteredArchivedClasses,
  modeAllClasses,
  modeAllArchivedClasses,
  selectedYear,
  selectedSemester,
  teachingMode,
  switchClass,
  archiveClass,
  restoreClass
} = useClassroom()
const { confirmAndDeleteClass } = useClassDeletion()

const showAllSessions = ref(false)
const isArchivedPanelVisible = ref(false)

function studentCount(cls) {
  return Object.keys(cls?.students ?? {}).length
}

async function selectAndOpenClass(classId) {
  await switchClass(classId)
  emit('open-class', classId)
}

async function onArchiveClass(classId) {
  await archiveClass(classId)
}

async function onRestoreClass(classId) {
  await restoreClass(classId)
}

async function onDeleteClass(classId) {
  await confirmAndDeleteClass(classId)
}

// --- Academic Year & Session Grouping (All Sessions view) ---
const yearExpandOverrides = ref(new Map())
const sessionExpandOverrides = ref(new Map())

const allYearGroups = computed(() => groupClassesByYearAndSession(modeAllClasses.value, {
  selectedYear: selectedYear.value,
  selectedSemester: selectedSemester.value,
  teachingMode: teachingMode.value
}))

function isYearExpanded(yearGroup) {
  if (yearExpandOverrides.value.has(yearGroup.year)) {
    return yearExpandOverrides.value.get(yearGroup.year)
  }
  // By default: current year is expanded; past/future years are collapsed
  const containsActive = yearGroup.sessions.some(s => s.classes.some(c => c.classId === activeClass.value?.classId))
  return yearGroup.isCurrent || containsActive
}

function toggleYear(year) {
  const yg = allYearGroups.value.find(y => y.year === year)
  const current = yg ? isYearExpanded(yg) : false
  yearExpandOverrides.value.set(year, !current)
  yearExpandOverrides.value = new Map(yearExpandOverrides.value)
}

function isSessionExpanded(session) {
  if (sessionExpandOverrides.value.has(session.key)) {
    return sessionExpandOverrides.value.get(session.key)
  }
  // Inside an expanded year, semesters default to expanded so the classes show right away
  return true
}

function toggleSession(sessionKey) {
  let session = null
  for (const yg of allYearGroups.value) {
    session = yg.sessions.find(s => s.key === sessionKey)
    if (session) break
  }
  const current = session ? isSessionExpanded(session) : true
  sessionExpandOverrides.value.set(sessionKey, !current)
  sessionExpandOverrides.value = new Map(sessionExpandOverrides.value)
}

const areAllYearsExpanded = computed(() => {
  if (allYearGroups.value.length === 0) return false
  return allYearGroups.value.every(y => isYearExpanded(y))
})

function toggleAllYears() {
  const nextState = !areAllYearsExpanded.value
  for (const y of allYearGroups.value) {
    yearExpandOverrides.value.set(y.year, nextState)
    for (const s of y.sessions) {
      sessionExpandOverrides.value.set(s.key, nextState)
    }
  }
  yearExpandOverrides.value = new Map(yearExpandOverrides.value)
  sessionExpandOverrides.value = new Map(sessionExpandOverrides.value)
}
</script>
