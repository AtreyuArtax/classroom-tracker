<template>
  <aside v-if="sections.length > 1" class="setup-toc">
    <div class="setup-toc__header">
      <ListFilter :size="14" class="setup-toc__header-icon" />
      <span class="setup-toc__header-title">ON THIS PAGE</span>
    </div>

    <nav class="setup-toc__list">
      <template v-if="sections.length > 0">
        <button
          v-for="item in sections"
          :key="item.id"
          class="setup-toc__item"
          :class="{ 'setup-toc__item--active': activeSectionId === item.id }"
          @click="scrollToSection(item.id)"
        >
          <span class="setup-toc__indicator"></span>
          <span class="setup-toc__label">{{ item.title }}</span>
        </button>
      </template>
      <div v-else class="setup-toc__skeleton">
        <div class="setup-toc__sk-line"></div>
        <div class="setup-toc__sk-line" style="width: 70%;"></div>
        <div class="setup-toc__sk-line" style="width: 85%;"></div>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ListFilter } from 'lucide-vue-next'

const props = defineProps({
  activeTab: { type: String, default: '' }
})

const KNOWN_TAB_SECTIONS = {
  active: [
    { id: 'sec-gen-info', title: 'General Info' },
    { id: 'sec-seating', title: 'Seating Plan' },
    { id: 'sec-roster', title: 'Roster' },
    { id: 'sec-grading-model', title: 'Grading System' },
    { id: 'sec-framework', title: 'Assessment Framework' },
    { id: 'sec-elem-subjects', title: 'Elementary Subjects' }
  ],
  manage: [
    { id: 'sec-classes', title: 'Active Classes' },
    { id: 'sec-archived', title: 'Archived Classes' }
  ],
  calendar: [
    { id: 'sec-calendar-boundaries', title: 'School Year & Semester' },
    { id: 'sec-milestones', title: 'Calendar Milestones' }
  ],
  app: [
    { id: 'sec-general-settings', title: 'General Settings' },
    { id: 'sec-app-buckets', title: 'Grade Buckets' },
    { id: 'sec-app-behavior', title: 'Behavior Strategy' },
    { id: 'sec-period-times', title: 'Period Start Times' },
    { id: 'sec-attendance-cloud', title: 'Attendance & Door Station' }
  ],
  data: [
    { id: 'sec-sync', title: 'Local Folder Sync' },
    { id: 'sec-snapshots', title: 'Safety Snapshots' },
    { id: 'sec-backup', title: 'Backup & Restore' },
    { id: 'sec-health', title: 'Data Health Scanner' },
    { id: 'sec-danger', title: 'Danger Zone' }
  ]
}

const sections = ref([])
const activeSectionId = ref('')
let observer = null
let mutationObserver = null

function updateSections() {
  nextTick(() => {
    const mainEl = document.querySelector('.setup__main-content') || document.querySelector('.setup__panel-content')
    if (!mainEl) return

    const cards = mainEl.querySelectorAll('.setup__card, .setup__section-card')
    const items = []

    cards.forEach((card, index) => {
      const titleEl = card.querySelector('.setup__card-title, h2, h3')
      if (!titleEl) return
      
      const rawText = titleEl.innerText || titleEl.textContent || ''
      const cleanTitle = rawText.replace(/[\n\r]+/g, ' ').trim()
      if (!cleanTitle) return

      let id = card.getAttribute('id')
      if (!id) {
        id = `setup-sec-${index}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        card.setAttribute('id', id)
      }

      items.push({ id, title: cleanTitle, el: card })
    })

    if (items.length > 0) {
      sections.value = items
      if (!activeSectionId.value) {
        activeSectionId.value = items[0].id
      }

      // Re-bind IntersectionObserver
      if (observer) observer.disconnect()
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              activeSectionId.value = entry.target.getAttribute('id')
            }
          })
        }, { rootMargin: '-10% 0px -70% 0px', threshold: 0 })

        items.forEach(item => {
          if (item.el) observer.observe(item.el)
        })
      }
    }
  })
}

function scrollToSection(id) {
  activeSectionId.value = id
  const target = document.getElementById(id)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

watch(() => props.activeTab, (newTab) => {
  const initial = KNOWN_TAB_SECTIONS[newTab] || []
  sections.value = initial
  activeSectionId.value = initial.length > 0 ? initial[0].id : ''
  nextTick(updateSections)
}, { immediate: true })

onMounted(() => {
  nextTick(updateSections)

  const mainEl = document.querySelector('.setup')
  if (mainEl && 'MutationObserver' in window) {
    mutationObserver = new MutationObserver(() => {
      updateSections()
    })
    mutationObserver.observe(mainEl, { childList: true, subtree: true })
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  if (mutationObserver) mutationObserver.disconnect()
})
</script>

<style scoped>
.setup-toc {
  width: 210px;
  min-width: 210px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
  align-self: flex-start;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.setup-toc__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.setup-toc__header-icon {
  color: var(--text-secondary);
}

.setup-toc__header-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.setup-toc__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setup-toc__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.3;
}

.setup-toc__item:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.04));
  color: var(--text);
}

.setup-toc__indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.setup-toc__item--active {
  background: var(--primary-light, rgba(59, 130, 246, 0.08));
  color: var(--primary);
  font-weight: 600;
}

.setup-toc__item--active .setup-toc__indicator {
  background: var(--primary);
  transform: scale(1.3);
}

.setup-toc__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setup-toc__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.setup-toc__sk-line {
  height: 12px;
  border-radius: var(--radius-sm);
  background: var(--border);
  opacity: 0.4;
  animation: setup-sk-pulse 1.2s infinite ease-in-out;
}

@keyframes setup-sk-pulse {
  0% { opacity: 0.3; }
  50% { opacity: 0.6; }
  100% { opacity: 0.3; }
}

/* Responsive adjustment for small screens */
@media (max-width: 960px) {
  .setup-toc {
    width: 100%;
    min-width: 100%;
    position: relative;
    top: 0;
    max-height: none;
    margin-bottom: 16px;
  }

  .setup-toc__list {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .setup-toc__item {
    white-space: nowrap;
    width: auto;
  }
}
</style>
