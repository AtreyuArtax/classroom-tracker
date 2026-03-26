<template>
  <div class="student-timeline">
    <div v-if="loading" class="student-timeline__loading">
      Loading timeline...
    </div>
    <div v-else-if="sortedItems.length === 0" class="student-timeline__empty">
      No events recorded for this student.
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

              <div v-if="item.outcome" class="timeline-row__outcome">
                {{ item.outcome }}
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
} from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'

const props = defineProps({
  studentId: { type: String, required: true },
  events: { type: Array, default: () => [] },
  assessments: { type: Array, default: () => [] },
  behaviorCodesMap: { type: Object, default: () => ({}) }
})

const { editEvent, removeEvent } = useClassroom()

const loading = ref(false)

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

    const code = props.behaviorCodesMap[e.code] || {}
    let type = 'behavior'
    let icon = AlertCircle
    let title = code.label || e.code

    if (e.code === 'a') {
      type = 'attendance'
      icon = UserMinus
      title = 'Absent'
    } else if (e.code === 'l') {
      type = 'attendance'
      icon = Clock
      title = `Late (${e.duration} min)`
    } else if (e.code === 'w') {
      const minutes = Math.round((e.duration || 0) / 60000)
      title = `${code.label || 'Washroom'} (${minutes} min)`
    } else if (e.code === 'ac') {
      type = 'assessment'
      icon = MessageSquare
      title = 'Assessment Conversation'
    }

    items.push({
      id: e.eventId,
      isEvent: true,
      rawCode: e.code,
      type,
      date: new Date(e.ts || e.timestamp),
      title,
      description: e.note,
      icon,
      outcome: e.acOutcome,
      tags: e.acContext ? [e.acContext] : [],
      raw: e
    })
  })

  // 2. Process assessments
  props.assessments.forEach(a => {
    const score = a.scores?.[props.studentId]
    if (score === undefined) return

    items.push({
      id: a.assessmentId,
      isEvent: false,
      type: 'grade',
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

const groupedItems = computed(() => {
  const all = sortedItems.value
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
    editForm.duration = item.rawCode === 'w' ? Math.round((item.raw.duration || 0) / 60000) : (item.raw.duration || 0)
    editForm.note = item.description || ''
}

async function saveEdit() {
    if (!editingItem.value) return
    
    const updates = {
        note: editForm.note
    }
    
    if (editingItem.value.rawCode === 'l') {
        updates.duration = parseInt(editForm.duration)
    } else if (editingItem.value.rawCode === 'w') {
        updates.duration = parseInt(editForm.duration) * 60000 // Convert back to ms
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
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.student-timeline {
    padding: 8px;
}

/* Item type colors */
.timeline-row--attendance .timeline-row__icon { color: #ff3b30; }
.timeline-row--grade      .timeline-row__icon { color: var(--primary); }
.timeline-row--assessment .timeline-row__icon { color: #34c759; }
.timeline-row--behavior   .timeline-row__icon { color: var(--text-secondary); }

/* Group styling */
.timeline-group {
  margin-bottom: 20px;
}

.timeline-group__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.timeline-group__date {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.timeline-group__day {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text);
}

.timeline-group__month {
  font-size: 0.75rem;
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
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: var(--radius-md);
    transition: background 0.15s ease;
}

.timeline-row:hover {
    background: var(--bg-secondary);
}

.timeline-row__time {
    width: 60px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
}

.timeline-row__marker {
    display: flex;
    justify-content: center;
    width: 20px;
}

.timeline-row__content {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.timeline-row__main {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.timeline-row__title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
}

.timeline-row__desc {
    font-size: 0.75rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.timeline-row__tags {
    display: flex;
    gap: 4px;
}

.timeline-row__tag {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    white-space: nowrap;
}

.timeline-row__outcome {
    font-size: 0.75rem;
    color: #34c759;
    font-weight: 600;
}

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
    width: 28px;
    height: 28px;
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
    width: min(400px, 90vw);
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
}

.timeline-modal__header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.timeline-modal__header h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
}

.timeline-modal__body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.form-group label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
}

.form-group input, .form-group textarea {
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    font-size: 0.9rem;
    font-family: inherit;
}

.timeline-modal__footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 10px;
}

.btn-ghost {
    flex: 1;
    padding: 10px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
}

.btn-primary {
    flex: 2;
    padding: 10px;
    background: var(--primary);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
}

.close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
}
</style>
