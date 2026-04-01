<template>
  <div class="student-timeline">
    <div v-if="loading" class="student-timeline__loading">
      Loading timeline...
    </div>
    <div v-else class="student-timeline__container">
      <!-- Filter Bar -->
      <div class="student-timeline__filter-bar">
        <!-- Category Pills -->
        <div class="student-timeline__filters">
          <button 
            v-for="f in availableFilters" 
            :key="f.id"
            class="filter-pill"
            :class="{ 'filter-pill--active': activeFilter === f.id }"
            @click="activeFilter = f.id"
          >
            {{ f.label }}
            <span class="filter-pill__count">{{ f.count }}</span>
          </button>
        </div>

        <!-- Date Dropdown -->
        <div class="student-timeline__date-select">
          <label class="date-select-label">Showing:</label>
          <select v-model="selectedMonth" class="date-select-input">
            <option value="all">All Dates</option>
            <option v-for="m in availableMonths" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="filteredSortedItems.length === 0" class="student-timeline__empty">
        <div class="student-timeline__empty-icon"><Activity :size="32" /></div>
        <p>No entries match this filter.</p>
      </div>
      
      <div v-else class="student-timeline__groups">
        <div v-for="group in groupedItems" :key="group.dateStr" class="timeline-group">
          <div class="timeline-group__header">
            <div class="timeline-group__date">
              <span class="timeline-group__day">{{ formatDate(group.date, 'D') }}</span>
              <span class="timeline-group__month">{{ formatDate(group.date, 'MMM') }}</span>
            </div>
            <div class="timeline-group__divider"></div>
          </div>

          <div class="timeline-group__items">
            <div 
              v-for="item in group.items" 
              :key="item.id" 
              class="timeline-row"
              :class="[`timeline-row--${item.type}`]"
            >
              <div class="timeline-row__time">{{ formatTime(item.date) }}</div>
              
              <div class="timeline-row__marker">
                <div class="timeline-row__icon">
                  <component :is="item.icon" :size="14" />
                </div>
              </div>

              <div class="timeline-row__content">
                <div class="timeline-row__main">
                  <span class="timeline-row__title">{{ item.title }}</span>
                  <span v-if="item.description" class="timeline-row__desc">{{ item.description }}</span>
                </div>
                
                <div v-if="item.tags?.length" class="timeline-row__tags">
                  <span v-for="tag in item.tags" :key="tag" class="timeline-row__tag">
                    {{ tag }}
                  </span>
                </div>

                <div v-if="item.outcome" class="timeline-row__outcome" :class="`timeline-row__outcome--${item.raw.acOutcome}`">
                  {{ formatOutcome(item.outcome) }}
                </div>
              </div>

              <!-- Actions (only for managed events) -->
              <div v-if="item.isEvent" class="timeline-row__actions">
                <button class="action-btn" title="Edit Entry" @click="startEdit(item)">
                  <Pencil :size="14" />
                </button>
                <button class="action-btn action-btn--danger" title="Delete Entry" @click="confirmDelete(item.id)">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editingItem" class="timeline-modal-overlay" @click.self="editingItem = null">
      <div class="timeline-modal">
        <header class="timeline-modal__header">
          <h3>Edit {{ editingItem.title }}</h3>
          <button class="close-btn" @click="editingItem = null"><X :size="20" /></button>
        </header>
        
        <div class="timeline-modal__body">
          <!-- Duration (for Late or Washroom) -->
          <div v-if="editingItem.rawCode === 'l' || editingItem.rawCode === 'w'" class="form-group">
            <label>{{ editingItem.rawCode === 'l' ? 'Minutes Late' : 'Duration (minutes)' }}</label>
            <input type="number" v-model="editForm.duration" />
          </div>

          <!-- Note -->
          <div class="form-group">
            <label>Note</label>
            <textarea v-model="editForm.note" rows="3" placeholder="Add a note..."></textarea>
          </div>
        </div>

        <footer class="timeline-modal__footer">
          <button class="btn-ghost" @click="editingItem = null">Cancel</button>
          <button class="btn-primary" @click="saveEdit">Save Changes</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { 
  ClipboardList, 
  MessageSquare, 
  UserMinus, 
  Clock, 
  AlertCircle, 
  Pencil,
  Trash2,
  X,
  UserCheck,
  Activity,
  Toilet
} from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { toMinutes } from '../../db/eventService.js'
import { resolveIcon } from '../../utils/icons.js'

const props = defineProps({
  studentId: { type: String, required: true },
  events: { type: Array, default: () => [] },
  assessments: { type: Array, default: () => [] },
  behaviorCodesMap: { type: Object, default: () => ({}) }
})

const { editEvent, removeEvent } = useClassroom()

const loading = ref(false)
const activeFilter = ref('all')
const selectedMonth = ref('all') // Format: 'YYYY-MM'

// Edit state
const editingItem = ref(null)
const editForm = reactive({
    duration: 0,
    note: ''
})

// Process events and assessments into a unified timeline format
const sortedItems = computed(() => {
  const items = []

  // 1. Process behavior/attendance events
  props.events.forEach(e => {
    if (e.superseded) return // Skip replaced events

    const config = props.behaviorCodesMap[e.code] || {}
    let type = 'behavior'
    let category = config.category || 'behavior'
    let icon = config.icon ? resolveIcon(config.icon) : AlertCircle
    let title = config.label || e.code

    // Specialized Logic for Attendance/Out-of-Class
    if (e.code === 'a') {
      type = 'attendance'
      category = 'absence'
      icon = config.icon ? resolveIcon(config.icon) : UserMinus
    } else if (e.code === 'l' || (config.type === 'toggle' && e.duration != null)) {
      if (e.code === 'l') { type = 'attendance'; category = 'late' }
      const mins = toMinutes(e.duration).toFixed(1)
      title = `${config.label || (e.code === 'l' ? 'Late' : 'Out')} (${mins} min)`
      icon = config.icon ? resolveIcon(config.icon) : (e.code === 'l' ? Clock : Toilet)
    } else if (e.code === 'ac') {
      type = 'assessment'
      category = 'academics'
      icon = config.icon ? resolveIcon(config.icon) : MessageSquare
    } else if (e.code === 'pc' || category === 'communication') {
      type = 'communication'
      category = 'communication'
      icon = config.icon ? resolveIcon(config.icon) : MessageSquare
    }

    items.push({
      id: e.eventId,
      isEvent: true,
      rawCode: e.code,
      type,
      category,
      date: new Date(e.ts || e.timestamp),
      title,
      description: e.note,
      icon,
      outcome: e.acOutcome,
      tags: e.acContext ? [e.acContext] : [],
      raw: e
    })
  })

  // 2. Process assessments (Grades)
  props.assessments.forEach(a => {
    const score = a.scores?.[props.studentId]
    if (score === undefined) return

    items.push({
      id: a.assessmentId,
      isEvent: false,
      type: 'grade',
      category: 'academics',
      date: new Date(a.date),
      title: a.name,
      description: `Category: ${a.category}`,
      icon: ClipboardList,
      tags: [score === '' ? 'Missing' : `Score: ${score}`]
    })
  })

  // Sort by date descending
  return items.sort((a, b) => b.date - a.date)
})

const availableFilters = computed(() => {
  const counts = { all: sortedItems.value.length }
  sortedItems.value.forEach(item => {
    counts[item.category] = (counts[item.category] || 0) + 1
  })

  const filters = [
    { id: 'all', label: 'All', count: counts.all }
  ]

  // Higher priority categories first
  const order = ['academics', 'attendance', 'communication', 'behavior']
  order.forEach(id => {
    if (counts[id] > 0) {
      filters.push({ 
        id, 
        label: id.charAt(0).toUpperCase() + id.slice(1), 
        count: counts[id] 
      })
    }
  })

  // Add any other categories (custom ones)
  Object.keys(counts).forEach(id => {
    if (id !== 'all' && !order.includes(id) && counts[id] > 0) {
      filters.push({ 
        id, 
        label: id.charAt(0).toUpperCase() + id.slice(1), 
        count: counts[id] 
      })
    }
  })

  return filters
})

const availableMonths = computed(() => {
  const months = new Map()
  
  sortedItems.value.forEach(item => {
    const d = item.date
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!months.has(value)) {
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
      months.set(value, { value, label, time: d.getTime() })
    }
  })
  
  // Sort chronologically descending
  return Array.from(months.values()).sort((a, b) => b.time - a.time)
})

const filteredSortedItems = computed(() => {
  let items = sortedItems.value
  
  // 1. Filter by category
  if (activeFilter.value !== 'all') {
    items = items.filter(item => item.category === activeFilter.value)
  }
  
  // 2. Filter by month
  if (selectedMonth.value !== 'all') {
    items = items.filter(item => {
      const d = item.date
      const itemMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return itemMonth === selectedMonth.value
    })
  }
  
  return items
})

const groupedItems = computed(() => {
  const all = filteredSortedItems.value
  const groups = []
  
  all.forEach(item => {
    const dateStr = item.date.toISOString().split('T')[0]
    let group = groups.find(g => g.dateStr === dateStr)
    if (!group) {
      group = { 
        dateStr, 
        date: item.date,
        items: [] 
      }
      groups.push(group)
    }
    group.items.push(item)
  })
  
  return groups
})

function startEdit(item) {
    editingItem.value = item
    editForm.duration = toMinutes(item.raw.duration).toFixed(1)
    editForm.note = item.description || ''
}

async function saveEdit() {
    if (!editingItem.value) return
    
    const updates = {
        note: editForm.note
    }
    
    if (editingItem.value.rawCode === 'l' || editingItem.value.rawCode === 'w') {
        const mins = parseFloat(editForm.duration)
        updates.duration = Math.round(mins * 60000) // Convert back to ms for storage
    }
    
    await editEvent(editingItem.value.id, updates)
    editingItem.value = null
}

async function confirmDelete(eventId) {
    if (confirm('Are you sure you want to delete this entry? This will also update student statistics.')) {
        await removeEvent(eventId)
    }
}

function formatDate(date, format) {
  if (format === 'D') return date.getDate()
  if (format === 'MMM') return date.toLocaleString('default', { month: 'short' })
  return date.toLocaleDateString()
}

function formatTime(date) {
  return date.toLocaleString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatOutcome(outcome) {
  if (!outcome) return ''
  return outcome.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
</script>

<style scoped>
.student-timeline {
  display: flex;
  flex-direction: column;
}

.student-timeline__container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Filter Pills ────────────────────────────────────────────────── */
.student-timeline__filters {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none; /* Hide scrollbar Firefox */
}
.student-timeline__filters::-webkit-scrollbar { display: none; } /* Hide scrollbar Chrome/Safari */

.filter-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.filter-pill:hover {
  background: var(--bg-secondary);
  border-color: var(--primary-light);
}

.filter-pill--active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

/* ── Date Select ────────────────────────────────────────────────── */
.student-timeline__filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.student-timeline__date-select {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
}

.date-select-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.date-select-input {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  padding-right: 8px;
  outline: none;
}

.date-select-input:focus {
  color: var(--primary);
}

.filter-pill__count {
  font-size: 0.7rem;
  background: rgba(0,0,0,0.1);
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.filter-pill--active .filter-pill__count {
  background: rgba(255,255,255,0.2);
}

/* ── Empty State ────────────────────────────────────────────────── */
.student-timeline__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  text-align: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
}

.student-timeline__empty-icon {
  margin-bottom: 12px;
  opacity: 0.3;
}

/* Item type colors */
.timeline-row--attendance .timeline-row__icon { color: #ff3b30; }
.timeline-row--grade      .timeline-row__icon { color: var(--primary); }
.timeline-row--assessment .timeline-row__icon { color: #34c759; }
.timeline-row--communication .timeline-row__icon { color: #bf5af2; }
.timeline-row--behavior   .timeline-row__icon { color: var(--text-secondary); }

/* Group styling */
.timeline-group {
  margin-bottom: 24px;
}

.timeline-group__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.timeline-group__date {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.timeline-group__day {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
}

.timeline-group__month {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.timeline-group__divider {
  height: 1px;
  flex: 1;
  background: var(--border);
  opacity: 0.3;
}

/* Row Styling */
.timeline-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-md);
  transition: background 0.15s ease;
}

.timeline-row:hover {
  background: var(--bg-secondary);
}

.timeline-row__time {
  width: 70px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
  padding-top: 4px;
}

.timeline-row__marker {
  display: flex;
  justify-content: center;
  width: 20px;
  padding-top: 4px;
}

.timeline-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.timeline-row__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.timeline-row__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
}

.timeline-row__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.4;
  word-break: break-word;
}

.timeline-row__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.timeline-row__tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  text-transform: uppercase;
}

.timeline-row__outcome {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  width: fit-content;
}

.timeline-row__outcome--demonstrates_understanding { background: #34c759; color: #fff; }
.timeline-row__outcome--gap_confirmed { background: #ff3b30; color: #fff; }
.timeline-row__outcome--inconclusive { background: #ff9500; color: #fff; }

/* Actions */
.timeline-row__actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.timeline-row:hover .timeline-row__actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--surface);
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--primary-light);
  color: var(--primary);
  transform: translateY(-1px);
}

.action-btn--danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

/* Modal Styling */
.timeline-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.timeline-modal {
  background: var(--surface);
  border-radius: var(--radius-lg);
  width: min(440px, 90vw);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
}

.timeline-modal__header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timeline-modal__header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.timeline-modal__body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.form-group input, .form-group textarea {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  font-size: 0.95rem;
  font-family: inherit;
  color: var(--text);
  transition: border-color 0.15s ease;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.timeline-modal__footer {
  padding: 18px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 12px;
}

.btn-ghost {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  color: var(--text-secondary);
}

.btn-primary {
  flex: 2;
  padding: 12px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 700;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
