<template>
  <BaseModal
    :show="modelValue"
    @close="onCancel"
    max-width="480px"
  >
    <template #header>
      <h2 class="enm-title">
        <component :is="resolveIcon(behaviorCode?.icon)" :size="20" class="enm-icon" />
        {{ behaviorCode?.label }}
        <span v-if="studentName" class="enm-title-student">— {{ studentName }}</span>
      </h2>
    </template>

    <div class="enm-content">
      <!-- Note textarea -->
      <div class="enm-textarea-wrap">
        <textarea
          ref="textareaRef"
          v-model="noteText"
          class="enm-textarea"
          :placeholder="placeholderText"
          rows="4"
          @keydown.enter.exact.prevent="onSave"
          @keydown.enter.ctrl.prevent="onSave"
          @keydown.enter.meta.prevent="onSave"
          @keydown.esc.prevent="onCancel"
        ></textarea>

        <!-- Live Smart Categorization Indicator (For Parent Contact) -->
        <div v-if="isParentContact" class="enm-smart-indicator">
          <div v-if="noteText.trim()" class="enm-smart-detected">
            <span class="enm-smart-label">Auto-detected:</span>
            
            <!-- Channel Pill -->
            <span 
              class="enm-smart-pill"
              :style="{ background: detectedChannel.theme.bg, color: detectedChannel.theme.color, borderColor: detectedChannel.theme.border }"
            >
              <component :is="detectedChannel.icon" :size="12" />
              {{ detectedChannel.label }}
            </span>

            <!-- Outcome Pill -->
            <span 
              v-if="detectedOutcome" 
              class="enm-smart-pill enm-smart-pill--outcome"
            >
              {{ detectedOutcome }}
            </span>
          </div>

          <div v-else class="enm-smart-hint">
            <Sparkles :size="12" class="enm-sparkle-icon" />
            <span>Type naturally (e.g. <em>"called dad"</em>, <em>"emailed"</em>, <em>"left vm"</em>, <em>"met"</em>)</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="enm-actions">
        <button class="enm-btn enm-btn--primary" @click="onSave">Save Note</button>
        <button class="enm-btn enm-btn--ghost" @click="onCancel">Cancel</button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
/**
 * EventNoteModal.vue
 *
 * Fast, minimalist note entry with live natural language smart detection for Parent Contact.
 */

import { ref, watch, nextTick, computed } from 'vue'
import { Phone, Mail, Users, MessageSquare, Smartphone, Sparkles } from 'lucide-vue-next'
import { resolveIcon } from '../utils/icons.js'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  /** Displayed in the modal title */
  studentName: { type: String, default: '' },
  /** Full code object: { icon, label, category, type, requiresNote } */
  behaviorCode: { type: Object, default: null },
  /** v-model for open/close */
  modelValue: { type: Boolean, required: true },
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const noteText = ref('')
const textareaRef = ref(null)

const isParentContact = computed(() => {
  return props.behaviorCode?.codeKey === 'pc' || props.behaviorCode?.category === 'communication'
})

const placeholderText = computed(() => {
  if (isParentContact.value) {
    return "e.g., Called home, left voicemail about test, or Emailed dad re: science project..."
  }
  return "e.g., Away next week, Laptop borrowed, Needs extra time..."
})

// Live Smart Parser with Word Boundary Regular Expressions
const detectedChannel = computed(() => {
  const text = (noteText.value || '').trim()
  if (!text) {
    return { id: 'phone', label: 'Phone Call', icon: Phone, theme: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)' } }
  }

  // Exact word boundary checks to avoid "voicemail" triggering "email"
  const phoneRegex = /\b(calls?|called|calling|phones?|phoned|voicemails?|vmails?|vms?|left\s+(?:vm|msg|message)|spoke|spoken|talked|rang|mobile|cells?|dialed)\b/i
  const emailRegex = /\b(e-?mails?|emailed|emailing|sent\s+mail|inbox|forwarded|sent\s+report|replied\s+to\s+email)\b/i
  const meetingRegex = /\b(meets?|meeting|met(?:\s+with)?|interview|conferences?|in-person|parent\s+night|iep\s+meeting|office\s+visit|case\s+conf)\b/i
  const smsRegex = /\b(sms|texts?|texted|portal|app\s+message|remind|messenger)\b/i

  // Prioritize phone/voicemail first, then email, meeting, sms
  if (phoneRegex.test(text)) {
    return { id: 'phone', label: 'Phone Call', icon: Phone, theme: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)' } }
  } else if (emailRegex.test(text)) {
    return { id: 'email', label: 'Email', icon: Mail, theme: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.35)' } }
  } else if (meetingRegex.test(text)) {
    return { id: 'meeting', label: 'Meeting', icon: Users, theme: { bg: 'rgba(147, 51, 234, 0.15)', color: '#9333ea', border: 'rgba(147, 51, 234, 0.35)' } }
  } else if (smsRegex.test(text)) {
    return { id: 'sms', label: 'SMS / Portal', icon: Smartphone, theme: { bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.35)' } }
  }

  return { id: 'phone', label: 'Phone Call', icon: Phone, theme: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)' } }
})

const detectedOutcome = computed(() => {
  const text = (noteText.value || '').trim()
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

// Autofocus + clear text each time the modal opens
watch(() => props.modelValue, async (open) => {
  if (open) {
    noteText.value = ''
    await nextTick()
    textareaRef.value?.focus()
  }
})

function onSave() {
  const note = noteText.value.trim()
  emit('save', note)
  emit('update:modelValue', false)
}

function onCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* ── Content ─────────────────────────────────────────────────────────── */
.enm-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Title ────────────────────────────────────────────────────────── */
.enm-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  line-height: 1.3;
}

.enm-title-student {
  font-weight: 500;
  color: var(--text-secondary);
}

.enm-icon {
  vertical-align: middle;
  margin-right: 8px;
  color: var(--primary);
}

/* ── Textarea Wrap & Smart Live Indicator ─────────────────────────── */
.enm-textarea-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.enm-textarea {
  width: 100%;
  min-height: 110px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  font-size: 0.9rem;
  color: var(--text);
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.enm-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

/* Smart Indicator Bar */
.enm-smart-indicator {
  display: flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 4px;
}

.enm-smart-detected {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.enm-smart-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.enm-smart-pill {
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

.enm-smart-pill--outcome {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
}

.enm-smart-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

.enm-sparkle-icon {
  color: #f59e0b;
}

/* ── Actions ──────────────────────────────────────────────────────── */
.enm-actions {
  display: flex;
  gap: 10px;
}

.enm-btn {
  flex: 1;
  padding: 11px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 42px;
  border: none;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.enm-btn:active {
  transform: scale(0.98);
}

.enm-btn--primary {
  background: var(--primary);
  color: #fff;
}

.enm-btn--primary:hover {
  background: var(--primary-hover);
}

.enm-btn--ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.enm-btn--ghost:hover {
  background: var(--bg-secondary);
  color: var(--text);
}
</style>
