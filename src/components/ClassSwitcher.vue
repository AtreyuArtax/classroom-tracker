<template>
  <div class="class-switcher-wrapper">
    <div class="class-switcher">
      <!-- Current class label + dropdown trigger -->
      <button
        class="class-switcher__trigger"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        @click="isOpen = !isOpen"
      >
        <span class="class-switcher__label">
          {{ activeClass?.name ?? 'No class selected' }}
        </span>
        <ChevronDown :size="16" class="class-switcher__chevron" :class="{ 'class-switcher__chevron--open': isOpen }" aria-hidden="true" />
      </button>

      <!-- Dropdown list -->
      <div
        v-if="isOpen"
        class="class-switcher__dropdown"
        role="listbox"
        :aria-label="`Select class, currently ${activeClass?.name}`"
      >
        <div v-for="(group, termName) in classesByTerm" :key="termName" class="class-switcher__group">
          <div class="class-switcher__group-header">{{ termName }}</div>
          <button
            v-for="cls in group"
            :key="cls.classId"
            class="class-switcher__option"
            :class="{ 'class-switcher__option--active': cls.classId === activeClass?.classId }"
            role="option"
            :aria-selected="cls.classId === activeClass?.classId"
            @click="selectClass(cls.classId)"
          >
            <span class="class-switcher__option-name">{{ cls.name }}</span>
            <span v-if="cls.classType === 'elementary'" class="class-switcher__option-period">Elementary</span>
            <span v-else class="class-switcher__option-period">P{{ cls.periodNumber }}</span>
          </button>
        </div>

        <div v-if="filteredClassList.length === 0" class="class-switcher__empty">
          No classes for this term — switch term or add one in Setup
        </div>

        <!-- Divider + new class link -->
        <div class="class-switcher__divider" />
        <button class="class-switcher__add" @click="emit('navigate', 'Setup')">
          <span aria-hidden="true">＋</span> Manage classes
        </button>
      </div>

      <!-- Click-outside backdrop -->
      <div v-if="isOpen" class="class-switcher__backdrop" @click="isOpen = false" />
      
      <!-- Time-based Suggestion Banner -->
      <div v-if="suggestedClass" class="class-suggestion">
        <span class="class-suggestion__text">{{ suggestionText }}</span>
        <button class="class-suggestion__accept" @click="acceptSuggestion">Switch</button>
        <button class="class-suggestion__dismiss" @click="dismissSuggestion">✕</button>
      </div>
    </div>

    <!-- Header Subject Switcher Dropdown (Only visible for Elementary classes) -->
    <div v-if="activeClass?.classType === 'elementary' && activeClassSubjects.length > 0" class="subject-switcher">
      <div class="subject-switcher__select-wrap">
        <SubjectIcon 
          :code="currentActiveSubject?.code" 
          :icon="currentActiveSubject?.icon" 
          :name="currentActiveSubject?.name" 
          :size="15" 
          class="subject-switcher__icon"
        />
        <select
          :value="activeSubjectId || activeClassSubjects[0]?.subjectId"
          class="subject-switcher__select"
          aria-label="Select Subject"
          @change="e => switchSubject(e.target.value)"
        >
          <option
            v-for="sub in activeClassSubjects"
            :key="sub.subjectId"
            :value="sub.subjectId"
          >
            {{ sub.name }} ({{ sub.code || 'SUBJ' }})
          </option>
        </select>
        <ChevronDown :size="14" class="subject-switcher__arrow" />
      </div>
    </div>
  </div>
</template>


<script setup>
/**
 * ClassSwitcher.vue
 *
 * Dropdown that lets the teacher switch between classes.
 * Mutates App.vue's currentView (via emitted 'navigate') only for the
 * "Manage classes" shortcut — class switching itself goes through useClassroom.
 *
 * CLAUDE.md:
 *  §4  — No src/db/ imports
 *  Navigation directive — uses emitted event; App.vue owns currentView
 */

import { ref, computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import SubjectIcon from './SubjectIcon.vue'
import { useClassroom } from '../composables/useClassroom.js'
import { activeSubjectId } from '../composables/useClassroomState.js'
import { setActiveSubject } from '../composables/useGradebook.js'
import { DEFAULT_ELEMENTARY_SUBJECTS } from '../utils/elementarySubjects.js'

const { 
  activeClass, 
  suggestedClass, 
  switchClass,
  dismissSuggestion,
  filteredClassList,
  teachingMode
} = useClassroom()

const emit  = defineEmits(['navigate'])
const isOpen = ref(false)

const activeClassSubjects = computed(() => {
  if (!activeClass.value || activeClass.value.classType !== 'elementary') return []
  return activeClass.value.subjects && activeClass.value.subjects.length > 0
    ? activeClass.value.subjects
    : DEFAULT_ELEMENTARY_SUBJECTS
})

const currentActiveSubject = computed(() => {
  if (!activeClassSubjects.value.length) return null
  return activeClassSubjects.value.find(s => s.subjectId === activeSubjectId.value) || activeClassSubjects.value[0]
})

async function switchSubject(subjectId) {
  await setActiveSubject(subjectId)
}


const classesByTerm = computed(() => {
  const groups = {}
  // use filteredClassList to respect global year/semester filter
  for (const cls of filteredClassList.value) {
    const term = (cls.classType === 'elementary' || teachingMode.value === 'elementary')
      ? `${cls.year || '2025-26'} — Full Year`
      : `${cls.year || '2025-26'} — Semester ${cls.semester || '1'}`
    if (!groups[term]) groups[term] = []
    groups[term].push(cls)
  }
  return groups
})

async function selectClass(classId) {
  if (classId === activeClass.value?.classId) {
    isOpen.value = false
    return
  }
  await switchClass(classId)
  isOpen.value = false
}

const suggestionText = computed(() => {
  if (!suggestedClass.value) return ''
  const c = suggestedClass.value
  if (c.minutesUntil > 0) {
    return `Period ${c.periodNumber} starts in ${c.minutesUntil} min — switch to ${c.name}?`
  } else if (c.minutesUntil <= 0) {
    const diff = Math.abs(c.minutesUntil)
    return `Period ${c.periodNumber} started ${diff === 0 ? 'just now' : diff + ' min ago'} — switch to ${c.name}?`
  }
  return ''
})

async function acceptSuggestion() {
  if (suggestedClass.value) {
    await switchClass(suggestedClass.value.classId)
    suggestedClass.value = null
  }
}
</script>

<style scoped>
.class-switcher {
  position: relative;
}

/* ── Trigger button ──────────────────────────────────────────────────────── */
.class-switcher__trigger {
  display:         flex;
  align-items:     center;
  gap:             6px;
  padding:         6px 12px;
  border:          1px solid var(--border);
  border-radius:   var(--radius-md);
  background:      var(--bg-secondary);
  box-shadow:      none;
  cursor:          pointer;
  min-height:      36px;
  transition:      border-color 0.15s ease, box-shadow 0.15s ease;
}

.class-switcher__trigger:hover {
  border-color: var(--primary);
}

.class-switcher__trigger:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.class-switcher__trigger:active {
  box-shadow: none;
}

.class-switcher__label {
  font-size:   0.9rem;
  font-weight: 500;
  color:       var(--text);
  max-width:   150px;
  overflow:    hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.class-switcher__chevron {
  color:       var(--text-secondary);
  transition:  transform 0.2s ease;
  line-height: 1;
  display:     flex;
}

.class-switcher__chevron--open {
  transform: rotate(180deg);
}

/* ── Dropdown ────────────────────────────────────────────────────────────── */
.class-switcher__dropdown {
  position:      absolute;
  top:           calc(100% + 6px);
  left:          0;
  min-width:     220px;
  background:    var(--surface);
  border-radius: var(--radius-md);
  box-shadow:    var(--shadow-md);
  z-index:       500;
  overflow:      hidden;
  animation:     dropdown-in 0.15s ease;
}

@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.class-switcher__group-header {
  padding: 8px 16px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border);
  border-top: 1px solid var(--border);
}

.class-switcher__group:first-child .class-switcher__group-header {
  border-top: none;
}

.class-switcher__option {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  width:           100%;
  padding:         12px 16px;
  border:          none;
  background:      transparent;
  cursor:          pointer;
  min-height:      44px;
  transition:      background 0.1s ease;
  text-align:      left;
}

.class-switcher__option:hover {
  background: var(--bg-secondary);
}

.class-switcher__option--active {
  background: var(--primary-light);
}

.class-switcher__option--active .class-switcher__option-name {
  color:       var(--primary);
  font-weight: 700;
}

.class-switcher__option-name {
  font-size:   0.9rem;
  color:       var(--text);
  font-weight: 500;
}

.class-switcher__option-period {
  font-size:    0.75rem;
  color:        var(--text-secondary);
  background:   var(--bg-secondary);
  padding:      2px 7px;
  border-radius: var(--radius-sm);
}

.class-switcher__empty {
  padding:   14px 16px;
  font-size: 0.85rem;
  color:     var(--text-secondary);
}

.class-switcher__divider {
  height:     1px;
  background: var(--border);
  margin:     4px 0;
}

.class-switcher__add {
  display:     flex;
  align-items: center;
  gap:         6px;
  width:       100%;
  padding:     12px 16px;
  border:      none;
  background:  transparent;
  cursor:      pointer;
  min-height:  44px;
  font-size:   0.85rem;
  color:       var(--primary);
  font-weight: 600;
  transition:  background 0.1s ease;
}

.class-switcher__add:hover {
  background: var(--primary-light);
}

/* ── Click-outside backdrop ──────────────────────────────────────────────── */
.class-switcher__backdrop {
  position: fixed;
  inset:    0;
  z-index:  499;
}

/* ── Suggestion Banner ───────────────────────────────────────────────────── */
.class-suggestion {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: var(--primary-light);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow-sm);
  z-index: 498; 
  animation: slide-down 0.2s ease-out forwards;
  max-width: 320px;
  transform-origin: top center;
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-4px) scaleY(0.95); }
  to   { opacity: 1; transform: translateY(0) scaleY(1); }
}

.class-suggestion__text {
  font-size: 13px;
  color: var(--text);
  line-height: 1.3;
  flex: 1;
}

.class-suggestion__accept {
  background: var(--primary);
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s ease;
}

.class-suggestion__accept:hover {
  opacity: 0.9;
}

.class-suggestion__dismiss {
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: 4px;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.class-suggestion__dismiss:hover {
  opacity: 1;
}

/* ── Elementary Subject Switcher Dropdown ─────────────────────────────────── */
.class-switcher-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.subject-switcher {
  display: inline-flex;
  align-items: center;
}

.subject-switcher__select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0 10px 0 12px;
  height: 36px;
  transition: border-color 0.15s ease;
}

.subject-switcher__select-wrap:hover {
  border-color: var(--primary);
}

.subject-switcher__icon {
  color: var(--primary);
  margin-right: 8px;
  pointer-events: none;
}

.subject-switcher__select {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 600;
  padding-right: 20px;
  cursor: pointer;
  outline: none;
}

.subject-switcher__select option {
  background: var(--surface);
  color: var(--text);
  font-weight: 500;
}

.subject-switcher__arrow {
  position: absolute;
  right: 10px;
  color: var(--text-secondary);
  pointer-events: none;
}
</style>

