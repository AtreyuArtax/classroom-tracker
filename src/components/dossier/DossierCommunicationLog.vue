<template>
  <div class="dossier-comm-log">
    <!-- Single Integrated Toolbar: Search, Channel Filters, Recency & + Log Contact -->
    <div class="comm-toolbar">
      <div class="comm-toolbar__left">
        <!-- Compact Search -->
        <div class="comm-toolbar__search">
          <Search :size="13" class="comm-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="comm-search-input"
            placeholder="Search logs..."
          />
          <button v-if="searchQuery" class="comm-search-clear" @click="searchQuery = ''" title="Clear search">
            <X :size="12" />
          </button>
        </div>

        <!-- Dynamic Filter Chips -->
        <div class="comm-toolbar__filters">
          <button
            v-for="f in availableChannelFilters"
            :key="f.id"
            type="button"
            class="comm-filter-chip"
            :class="{ 'comm-filter-chip--active': activeChannelFilter === f.id }"
            @click="activeChannelFilter = f.id"
          >
            <component :is="f.icon" :size="12" v-if="f.icon" />
            {{ f.label }} ({{ f.count }})
          </button>
        </div>
      </div>

      <div class="comm-toolbar__right">
        <!-- Integrated Recency Tag -->
        <div v-if="parsedEvents.length > 0" class="comm-toolbar-recency" title="Time since last guardian communication">
          <Clock :size="12" class="comm-recency-icon" />
          <span class="comm-recency-label">Last:</span>
          <span class="comm-recency-val">{{ lastContactRecency }}</span>
        </div>

        <button
          type="button"
          class="comm-btn-primary"
          @click="showLogDrawer = !showLogDrawer"
        >
          <Plus :size="14" />
          <span>{{ showLogDrawer ? 'Close Form' : 'Log Contact' }}</span>
        </button>
      </div>
    </div>

    <!-- Inline Quick Log Form Drawer (Smart Natural Language) -->
    <transition name="drawer">
      <div v-if="showLogDrawer" class="comm-drawer">
        <div class="comm-drawer__header">
          <div class="comm-drawer__title">
            <UserCheck :size="16" class="text-primary" />
            <span>Record New Guardian / Parent Communication</span>
          </div>

          <div class="comm-drawer__header-right">
            <div class="comm-drawer__date-wrap">
              <label class="comm-date-label">Date &amp; Time:</label>
              <input
                v-model="newContactDate"
                type="datetime-local"
                class="comm-input-date"
              />
            </div>
            <button class="comm-drawer__close" @click="showLogDrawer = false" title="Close form">
              <X :size="14" />
            </button>
          </div>
        </div>

        <div class="comm-drawer__body">
          <!-- Smart Textarea -->
          <div class="comm-drawer-textarea-wrap">
            <textarea
              ref="drawerTextareaRef"
              v-model="newContactNote"
              class="comm-drawer-textarea"
              placeholder="e.g., Called home, left voicemail about attendance, or Emailed parent re: math test..."
              rows="3"
              @keydown.enter.ctrl.prevent="submitNewContact"
              @keydown.enter.meta.prevent="submitNewContact"
              @keydown.esc.prevent="showLogDrawer = false"
            ></textarea>

            <!-- Live Smart Categorization Indicator -->
            <div class="comm-smart-indicator">
              <div v-if="newContactNote.trim()" class="comm-smart-detected">
                <span class="comm-smart-label">Auto-detected:</span>
                
                <!-- Channel Pill -->
                <span 
                  class="comm-smart-pill"
                  :style="{ background: drawerDetectedChannel.theme.bg, color: drawerDetectedChannel.theme.color, borderColor: drawerDetectedChannel.theme.border }"
                >
                  <component :is="drawerDetectedChannel.icon" :size="12" />
                  {{ drawerDetectedChannel.label }}
                </span>

                <!-- Outcome Pill -->
                <span 
                  v-if="drawerDetectedOutcome" 
                  class="comm-smart-pill comm-smart-pill--outcome"
                >
                  {{ drawerDetectedOutcome }}
                </span>
              </div>

              <div v-else class="comm-smart-hint">
                <Sparkles :size="12" class="comm-sparkle-icon" />
                <span>Type naturally (e.g. <em>"called dad"</em>, <em>"emailed"</em>, <em>"left vm"</em>, <em>"met with mom"</em>)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="comm-drawer__footer">
          <button type="button" class="comm-btn-ghost" @click="showLogDrawer = false">Cancel</button>
          <button
            type="button"
            class="comm-btn-primary"
            :disabled="!newContactNote.trim()"
            @click="submitNewContact"
          >
            <Check :size="14" /> Save Communication Entry
          </button>
        </div>
      </div>
    </transition>

    <!-- Empty State -->
    <div v-if="filteredGroupedEvents.length === 0" class="comm-log__empty">
      <div class="comm-log__empty-icon">
        <MessageSquare :size="36" />
      </div>
      <h4 class="comm-log__empty-title">
        {{ searchQuery || activeChannelFilter !== 'all' ? 'No matching communication logs' : 'No parent contacts recorded yet' }}
      </h4>
      <p class="comm-log__empty-desc">
        {{ searchQuery || activeChannelFilter !== 'all' ? 'Try adjusting your search query or channel filter.' : 'Log phone calls, emails, and parent meetings to maintain a comprehensive communication paper trail.' }}
      </p>
      <button
        v-if="!showLogDrawer && (!searchQuery && activeChannelFilter === 'all')"
        type="button"
        class="comm-btn-primary"
        style="margin-top: 12px;"
        @click="showLogDrawer = true"
      >
        <Plus :size="14" /> Log First Contact
      </button>
    </div>

    <!-- Chronological Grouped Timeline -->
    <div v-else class="comm-timeline-container">
      <div
        v-for="group in filteredGroupedEvents"
        :key="group.monthKey"
        class="comm-month-group"
      >
        <!-- Month Sticky Section Header -->
        <div class="comm-month-header">
          <span class="comm-month-title">{{ group.monthLabel }}</span>
          <span class="comm-month-badge">{{ group.items.length }} {{ group.items.length === 1 ? 'entry' : 'entries' }}</span>
        </div>

        <!-- Timeline Spine & Cards -->
        <div class="comm-timeline-list">
          <div
            v-for="item in group.items"
            :key="item.eventId"
            class="comm-timeline-item"
            :class="'comm-timeline-item--' + item.channel"
          >
            <!-- Timeline Icon Node -->
            <div class="comm-node-icon" :style="{ background: item.theme.bg, color: item.theme.color, borderColor: item.theme.border }">
              <component :is="item.icon" :size="14" />
            </div>

            <!-- Content Card -->
            <div class="comm-card">
              <div class="comm-card__header">
                <div class="comm-card__meta">
                  <span class="comm-card__date">{{ formatDate(item.timestamp) }}</span>
                  <span class="comm-card__relative">{{ getRelativeTime(item.timestamp) }}</span>
                  
                  <span class="comm-channel-badge" :style="{ background: item.theme.bg, color: item.theme.color, borderColor: item.theme.border }">
                    <component :is="item.icon" :size="11" />
                    {{ item.channelLabel }}
                  </span>

                  <span v-if="item.outcome" class="comm-outcome-badge">
                    {{ item.outcome }}
                  </span>
                </div>

                <div class="comm-card__actions">
                  <button
                    type="button"
                    class="comm-btn-delete"
                    title="Delete communication log"
                    @click="confirmDelete(item.eventId)"
                  >
                    <Trash2 :size="13" />
                  </button>
                </div>
              </div>

              <div class="comm-card__body">
                <p class="comm-card__note">{{ item.cleanNote }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  MessageSquare,
  Phone,
  Mail,
  Users,
  Clock,
  Search,
  X,
  Plus,
  Trash2,
  Smartphone,
  Check,
  UserCheck,
  Sparkles
} from 'lucide-vue-next'
import { useMessage } from '../../composables/useMessage.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  studentId: { type: String, default: '' },
  studentName: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'log-contact'])
const { confirm } = useMessage()

// Search & Filter state
const searchQuery = ref('')
const activeChannelFilter = ref('all') // 'all' | 'phone' | 'email' | 'meeting' | 'other'
const showLogDrawer = ref(false)

// New Contact Form state
const newContactDate = ref(getLocalDateTimeString())
const newContactNote = ref('')

function getLocalDateTimeString(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
}

// Drawer Live Natural Language Parser
const drawerDetectedChannel = computed(() => {
  const text = (newContactNote.value || '').trim()
  if (!text) {
    return { id: 'phone', label: 'Phone Call', icon: Phone, theme: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)' } }
  }

  const phoneRegex = /\b(calls?|called|calling|phones?|phoned|voicemails?|vmails?|vms?|left\s+(?:vm|msg|message)|spoke|spoken|talked|rang|mobile|cells?|dialed)\b/i
  const emailRegex = /\b(e-?mails?|emailed|emailing|sent\s+mail|inbox|forwarded|sent\s+report|replied\s+to\s+email)\b/i
  const meetingRegex = /\b(meets?|meeting|met(?:\s+with)?|interview|conferences?|in-person|parent\s+night|iep\s+meeting|office\s+visit|case\s+conf)\b/i
  const smsRegex = /\b(sms|texts?|texted|portal|app\s+message|remind|messenger)\b/i

  if (phoneRegex.test(text)) {
    return { id: 'phone', label: 'Phone Call', icon: Phone, theme: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)' } }
  } else if (emailRegex.test(text)) {
    return { id: 'email', label: 'Email', icon: Mail, theme: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.35)' } }
  } else if (meetingRegex.test(text)) {
    return { id: 'meeting', label: 'Meeting', icon: Users, theme: { bg: 'rgba(147, 51, 234, 0.15)', color: '#9333ea', border: 'rgba(147, 51, 234, 0.35)' } }
  } else if (smsRegex.test(text)) {
    return { id: 'sms', label: 'App / Message', icon: Smartphone, theme: { bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.35)' } }
  }

  return { id: 'phone', label: 'Phone Call', icon: Phone, theme: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)' } }
})

const drawerDetectedOutcome = computed(() => {
  const text = (newContactNote.value || '').trim()
  if (!text) return null

  if (/\b(voicemails?|vmails?|vms?|left\s+(?:vm|msg|message))\b/i.test(text)) {
    return 'Left Voicemail'
  } else if (/\b(no\s+answer|unanswered|busy|did\s+not\s+answer)\b/i.test(text)) {
    return 'No Answer'
  } else if (/\b(follow-?up|will\s+retry|try\s+mobile|touch\s+base|check\s+back)\b/i.test(text)) {
    return 'Follow-up'
  } else if (/\b(attendance|absent|lates?)\b/i.test(text)) {
    return 'Attendance'
  }
  return null
})

// Smart Event Parser
const parsedEvents = computed(() => {
  return props.events.map(evt => {
    const rawNote = evt.note || ''
    let channel = 'phone'
    let channelLabel = 'Phone Call'
    let outcome = null
    let cleanNote = rawNote

    // 1. Check for structured bracket prefix: [Channel | Outcome] Note
    const tagMatch = rawNote.match(/^\[(.*?)\]\s*(.*)$/)
    if (tagMatch) {
      const tagContent = tagMatch[1]
      cleanNote = tagMatch[2] || ''
      const parts = tagContent.split('|').map(s => s.trim())
      
      const chStr = parts[0]?.toLowerCase() || ''
      if (chStr.includes('phone') || chStr.includes('call')) {
        channel = 'phone'
        channelLabel = 'Phone Call'
      } else if (chStr.includes('email') || chStr.includes('mail')) {
        channel = 'email'
        channelLabel = 'Email'
      } else if (chStr.includes('meet') || chStr.includes('in-person')) {
        channel = 'meeting'
        channelLabel = 'Meeting'
      } else if (chStr.includes('sms') || chStr.includes('portal') || chStr.includes('text') || chStr.includes('app')) {
        channel = 'sms'
        channelLabel = 'App / Message'
      } else {
        channel = 'other'
        channelLabel = parts[0] || 'Contact'
      }

      if (parts.length > 1) {
        outcome = parts.slice(1).join(' | ')
      }
    } else {
      // 2. Comprehensive Word Boundary Regular Expression Fallback for legacy / free-text notes
      const text = rawNote.trim()
      
      const phoneRegex = /\b(calls?|called|calling|phones?|phoned|voicemails?|vmails?|vms?|left\s+(?:vm|msg|message)|spoke|spoken|talked|rang|mobile|cells?|dialed)\b/i
      const emailRegex = /\b(e-?mails?|emailed|emailing|sent\s+mail|inbox|forwarded|sent\s+report|replied\s+to\s+email)\b/i
      const meetingRegex = /\b(meets?|meeting|met(?:\s+with)?|interview|conferences?|in-person|parent\s+night|iep\s+meeting|office\s+visit|case\s+conf)\b/i
      const smsRegex = /\b(sms|texts?|texted|portal|app\s+message|remind|messenger)\b/i

      // Prioritize phone/voicemail first to avoid "voicemail" triggering "email"
      if (phoneRegex.test(text)) {
        channel = 'phone'
        channelLabel = 'Phone Call'
      } else if (emailRegex.test(text)) {
        channel = 'email'
        channelLabel = 'Email'
      } else if (meetingRegex.test(text)) {
        channel = 'meeting'
        channelLabel = 'Meeting'
      } else if (smsRegex.test(text)) {
        channel = 'sms'
        channelLabel = 'App / Message'
      } else {
        channel = 'phone'
        channelLabel = 'Parent Contact'
      }

      // Check common outcomes in note
      if (/\b(voicemails?|vmails?|vms?|left\s+(?:vm|msg|message))\b/i.test(text)) {
        outcome = 'Left Voicemail'
      } else if (/\b(no\s+answer|unanswered|busy|did\s+not\s+answer)\b/i.test(text)) {
        outcome = 'No Answer'
      } else if (/\b(follow-?up|will\s+retry|try\s+mobile|touch\s+base|check\s+back)\b/i.test(text)) {
        outcome = 'Follow-up'
      } else if (/\b(attendance|absent|lates?)\b/i.test(text)) {
        outcome = 'Attendance'
      }
    }

    // Theme color mappings
    let icon = Phone
    let theme = { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' }

    if (channel === 'email') {
      icon = Mail
      theme = { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' }
    } else if (channel === 'meeting') {
      icon = Users
      theme = { bg: 'rgba(147, 51, 234, 0.12)', color: '#9333ea', border: 'rgba(147, 51, 234, 0.3)' }
    } else if (channel === 'sms') {
      icon = Smartphone
      theme = { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' }
    } else if (channel === 'other') {
      icon = MessageSquare
      theme = { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' }
    }

    return {
      ...evt,
      channel,
      channelLabel,
      outcome,
      cleanNote: cleanNote || rawNote,
      icon,
      theme
    }
  })
})

// KPI Metrics & Dynamic Channel Breakdown
const phoneCount = computed(() => parsedEvents.value.filter(e => e.channel === 'phone').length)
const emailCount = computed(() => parsedEvents.value.filter(e => e.channel === 'email').length)
const meetingCount = computed(() => parsedEvents.value.filter(e => e.channel === 'meeting').length)
const smsCount = computed(() => parsedEvents.value.filter(e => e.channel === 'sms').length)

const channelStatsBreakdown = computed(() => {
  const stats = []
  if (phoneCount.value > 0) stats.push({ id: 'phone', label: phoneCount.value === 1 ? 'Phone Call' : 'Phone Calls', count: phoneCount.value, color: '#f59e0b' })
  if (emailCount.value > 0) stats.push({ id: 'email', label: emailCount.value === 1 ? 'Email' : 'Emails', count: emailCount.value, color: '#3b82f6' })
  if (smsCount.value > 0) stats.push({ id: 'sms', label: smsCount.value === 1 ? 'App Message' : 'App Messages', count: smsCount.value, color: '#6366f1' })
  if (meetingCount.value > 0) stats.push({ id: 'meeting', label: meetingCount.value === 1 ? 'Meeting' : 'Meetings', count: meetingCount.value, color: '#9333ea' })
  return stats
})

const availableChannelFilters = computed(() => {
  const filters = [
    { id: 'all', label: 'All', count: parsedEvents.value.length, icon: null }
  ]

  const channels = [
    { id: 'phone', label: 'Phone', count: phoneCount.value, icon: Phone },
    { id: 'email', label: 'Email', count: emailCount.value, icon: Mail },
    { id: 'sms', label: 'App / Message', count: smsCount.value, icon: Smartphone },
    { id: 'meeting', label: 'Meetings', count: meetingCount.value, icon: Users }
  ]

  channels.forEach(ch => {
    if (ch.count > 0) {
      filters.push(ch)
    }
  })

  return filters
})

const lastContactRecency = computed(() => {
  if (!parsedEvents.value.length) return 'None logged'
  const first = parsedEvents.value[0] // Sorted newest first
  if (!first.timestamp) return '—'
  return getRelativeTime(first.timestamp)
})

// Filtered & Grouped Events
const filteredGroupedEvents = computed(() => {
  let list = parsedEvents.value

  // 1. Channel Filter
  if (activeChannelFilter.value !== 'all') {
    list = list.filter(e => e.channel === activeChannelFilter.value)
  }

  // 2. Search Query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(e =>
      (e.cleanNote || '').toLowerCase().includes(q) ||
      (e.outcome || '').toLowerCase().includes(q) ||
      (e.channelLabel || '').toLowerCase().includes(q) ||
      formatDate(e.timestamp).toLowerCase().includes(q)
    )
  }

  // 3. Group by Month (e.g. "August 2026")
  const groupsMap = new Map()
  list.forEach(item => {
    const d = item.timestamp ? new Date(item.timestamp) : new Date()
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = d.toLocaleString('en-CA', { month: 'long', year: 'numeric' })

    if (!groupsMap.has(monthKey)) {
      groupsMap.set(monthKey, {
        monthKey,
        monthLabel,
        items: []
      })
    }
    groupsMap.get(monthKey).items.push(item)
  })

  return Array.from(groupsMap.values())
})

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function getRelativeTime(ts) {
  if (!ts) return ''
  const diffMs = Date.now() - new Date(ts).getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

async function confirmDelete(eventId) {
  if (await confirm('Delete this communication record? This action cannot be undone.', 'Delete Communication Log', { danger: true })) {
    emit('delete', eventId)
  }
}

function submitNewContact() {
  const trimmed = newContactNote.value.trim()
  if (!trimmed) return

  const isoTimestamp = newContactDate.value ? new Date(newContactDate.value).toISOString() : new Date().toISOString()

  emit('log-contact', {
    note: trimmed,
    timestamp: isoTimestamp
  })

  // Reset form
  newContactNote.value = ''
  newContactDate.value = getLocalDateTimeString()
  showLogDrawer.value = false
}
</script>

<style scoped>
.dossier-comm-log {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Integrated Toolbar ─────────────────────────────────────────────── */
.comm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.comm-toolbar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
}

.comm-toolbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.comm-toolbar-recency {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-full, 100px);
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.comm-recency-icon {
  color: #10b981;
}

.comm-recency-label {
  font-weight: 500;
}

.comm-recency-val {
  color: #10b981;
  font-weight: 700;
}

.comm-toolbar__search {
  position: relative;
  display: flex;
  align-items: center;
  width: 180px;
  max-width: 200px;
}

.comm-search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  pointer-events: none;
}

.comm-search-input {
  width: 100%;
  padding: 6px 28px 6px 30px;
  font-size: 0.8rem;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  box-sizing: border-box;
}

.comm-search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.comm-search-clear {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.comm-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.comm-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: var(--radius-full, 100px);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.comm-filter-chip:hover {
  background: var(--bg-hover);
  color: var(--text);
  border-color: var(--primary);
}

.comm-filter-chip--active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
  font-weight: 700;
}

.comm-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius-md);
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}

.comm-btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.comm-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comm-btn-ghost {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

/* ── Inline Quick Log Drawer (Smart Natural Language) ───────────────── */
.comm-drawer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1.5px solid var(--primary);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.comm-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.comm-drawer__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.comm-drawer__header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.comm-drawer__date-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.comm-date-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.comm-input-date {
  padding: 4px 8px;
  font-size: 0.78rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  box-sizing: border-box;
}

.comm-drawer__close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.comm-drawer__close:hover {
  background: var(--bg-secondary);
  color: var(--text);
}

.comm-drawer__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comm-drawer-textarea-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comm-drawer-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 0.85rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.comm-drawer-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

/* Smart Live Indicator in Drawer */
.comm-smart-indicator {
  display: flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 2px;
}

.comm-smart-detected {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.comm-smart-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.comm-smart-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full, 100px);
  border: 1px solid;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.comm-smart-pill--outcome {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
}

.comm-smart-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

.comm-sparkle-icon {
  color: #f59e0b;
}

.comm-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

/* ── Timeline Section ────────────────────────────────────────────────── */
.comm-timeline-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.comm-month-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comm-month-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}

.comm-month-title {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.comm-month-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-full, 100px);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.comm-timeline-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 20px;
}

/* Vertical Timeline Spine */
.comm-timeline-list::before {
  content: '';
  position: absolute;
  left: 31px;
  top: 14px;
  bottom: 14px;
  width: 2px;
  background: var(--border);
  z-index: 0;
}

.comm-timeline-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  z-index: 1;
}

.comm-node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid;
  flex-shrink: 0;
  margin-top: 8px;
  box-shadow: var(--shadow-sm);
}

.comm-card {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.comm-card:hover {
  border-color: var(--primary-light, var(--border));
}

.comm-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.comm-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.comm-card__date {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text);
}

.comm-card__relative {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.comm-channel-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  border: 1px solid;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.comm-outcome-badge {
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
  font-size: 0.7rem;
  font-weight: 700;
}

.comm-card__actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.comm-btn-delete {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all 0.15s ease;
}

.comm-card:hover .comm-btn-delete {
  opacity: 1;
}

.comm-btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.comm-card__body {
  color: var(--text);
  line-height: 1.45;
}

.comm-card__note {
  margin: 0;
  font-size: 0.85rem;
  white-space: pre-wrap;
}

/* ── Empty State ─────────────────────────────────────────────────────── */
.comm-log__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  text-align: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
  gap: 6px;
}

.comm-log__empty-icon {
  color: var(--text-secondary);
  opacity: 0.5;
  margin-bottom: 4px;
}

.comm-log__empty-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.comm-log__empty-desc {
  margin: 0;
  font-size: 0.8rem;
  max-width: 380px;
  line-height: 1.4;
}
</style>
