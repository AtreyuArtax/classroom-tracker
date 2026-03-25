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
            class="timeline-item"
            :class="[`timeline-item--${item.type}`]"
          >
            <div class="timeline-item__marker">
              <div class="timeline-item__icon-bg">
                <component :is="item.icon" :size="14" />
              </div>
              <div class="timeline-item__line"></div>
            </div>

            <div class="timeline-item__content">
              <div class="timeline-item__header">
                <span class="timeline-item__title">{{ item.title }}</span>
                <span class="timeline-item__time">{{ formatTime(item.date) }}</span>
              </div>
              
              <p v-if="item.description" class="timeline-item__desc">
                {{ item.description }}
              </p>

              <div v-if="item.tags?.length" class="timeline-item__tags">
                <span v-for="tag in item.tags" :key="tag" class="timeline-item__tag">
                  {{ tag }}
                </span>
              </div>

              <div v-if="item.outcome" class="timeline-item__outcome">
                <strong>Outcome:</strong> {{ item.outcome }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  ClipboardList, 
  MessageSquare, 
  UserMinus, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from 'lucide-vue-next'

const props = defineProps({
  studentId: { type: String, required: true },
  events: { type: Array, default: () => [] },
  assessments: { type: Array, default: () => [] },
  behaviorCodesMap: { type: Object, default: () => ({}) }
})

const loading = ref(false)

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
    } else if (e.code === 'ac') {
      type = 'assessment'
      icon = MessageSquare
      title = 'Assessment Conversation'
    }

    items.push({
      id: e.eventId || Math.random().toString(),
      type,
      date: new Date(e.ts || e.timestamp),
      title,
      description: e.note,
      icon,
      outcome: e.acOutcome,
      tags: e.acContext ? [e.acContext] : []
    })
  })

  // 2. Process assessments
  props.assessments.forEach(a => {
    // Only show if it has a score or is missing
    const score = a.scores?.[props.studentId]
    if (score === undefined) return

    items.push({
      id: a.assessmentId,
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
/* Item type colors */
.timeline-item--attendance .timeline-item__icon-bg { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
.timeline-item--grade      .timeline-item__icon-bg { background: var(--primary-light); color: var(--primary); }
.timeline-item--assessment .timeline-item__icon-bg { background: rgba(52, 199, 89, 0.1); color: #34c759; }

/* Group styling */
.timeline-group {
  margin-bottom: 24px;
}

.timeline-group__header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.timeline-group__date {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.timeline-group__day {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
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
  opacity: 0.5;
}

.timeline-group__items {
  padding-left: 20px;
}

.timeline-item__marker {
  width: 20px; /* narrowed for sub-items */
}

.timeline-item--behavior .timeline-item__icon-bg { 
  background: var(--bg-secondary); 
  color: var(--text-secondary);
}
</style>
