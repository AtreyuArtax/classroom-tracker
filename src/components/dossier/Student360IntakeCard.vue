<template>
  <div class="intake-card">
    <!-- Collapsible Card Header -->
    <div class="intake-card__header" @click="toggleExpanded">
      <div class="intake-card__header-left">
        <component :is="isExpanded ? ChevronUp : ChevronDown" :size="16" class="intake-chevron" />
        <div class="intake-card__title-wrap">
          <Sparkles :size="15" class="intake-title-icon" />
          <h3 class="intake-card__title">Getting to Know You</h3>
        </div>

        <!-- At-a-glance Quick Badges -->
        <div class="intake-quick-badges" @click.stop>
          <span v-if="survey?.targetGrade" class="intake-badge intake-badge--goal" title="Target Course Goal">
            <Target :size="11" /> {{ formatShortGoal(survey.targetGrade) }}
          </span>
          <span v-if="survey?.courseConfidence" class="intake-badge intake-badge--conf" :class="`intake-badge--conf-${survey.courseConfidence}`" :title="`Course Confidence: ${survey.courseConfidence}/5`">
            {{ survey.courseConfidence }}/5
          </span>
          <span v-if="survey?.seatingPreference" class="intake-badge intake-badge--seat" :title="`Seating: ${survey.seatingPreference}`">
            <Armchair :size="11" /> {{ formatShortSeat(survey.seatingPreference) }}
          </span>
          <span v-if="isClassOnlyComms" class="intake-badge intake-badge--boundary" title="Safety Boundary: Use official roster name/pronouns with parents">
            <Lock :size="11" /> In-Class Only
          </span>
          <span v-else-if="isPrivateChatComms" class="intake-badge intake-badge--chat" title="Student requested private 1-on-1 check-in about name/pronoun usage">
            <MessageSquare :size="11" /> Check-in Req.
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="intake-card__header-actions" @click.stop>
        <button type="button" class="btn-intake-action" @click="showSurveyModal = true" title="Import Microsoft Form responses">
          <UploadCloud :size="12" /> Import
        </button>
        <button type="button" class="btn-intake-action btn-intake-action--primary" @click="showEditModal = true" title="Edit student survey responses">
          <Edit2 :size="12" /> Edit
        </button>
      </div>
    </div>

    <!-- Collapsible Card Body -->
    <div v-if="isExpanded" class="intake-card__body">
      <!-- Empty State -->
      <div v-if="!hasSurveyData" class="intake-empty-state">
        <p class="intake-empty-txt">No survey or intake information on file for this student yet.</p>
        <div class="intake-empty-actions">
          <button type="button" class="btn-intake-sub" @click="showEditModal = true">
            <Plus :size="13" /> Enter Survey Info
          </button>
          <button type="button" class="btn-intake-sub btn-intake-sub--ghost" @click="showSurveyModal = true">
            <UploadCloud :size="13" /> Import Microsoft Form (.xlsx / .csv)
          </button>
        </div>
      </div>

      <!-- Populated Survey Details -->
      <div v-else class="intake-content">
        <!-- Safety & Communication Callout (If bounded) -->
        <div v-if="isClassOnlyComms" class="intake-alert intake-alert--warning">
          <Lock :size="15" class="intake-alert-icon" />
          <div class="intake-alert-body">
            <strong>Parent Communication Safety Boundary:</strong>
            <span>Student requested preferred name/pronouns be used <em>only in class</em>. Please use official roster name and pronouns when communicating with home or on report cards.</span>
          </div>
        </div>
        <div v-else-if="isPrivateChatComms" class="intake-alert intake-alert--info">
          <MessageSquare :size="15" class="intake-alert-icon" />
          <div class="intake-alert-body">
            <strong>Check-in Requested:</strong>
            <span>Student would like to discuss name/pronoun usage with parents privately first.</span>
          </div>
        </div>

        <!-- Thematic 2-Column Overview Grid -->
        <div class="intake-columns">
          <!-- Column 1: Identity & Communication -->
          <div class="intake-col">
            <div class="intake-item">
              <span class="intake-item__label">Preferred Name</span>
              <span class="intake-item__value">
                <template v-if="isPreferredNameDifferent">
                  <strong>{{ preferredName }}</strong>
                  <span class="intake-name-diff-note">
                    ⚠️ Differs from roster "{{ student.firstName }}"
                  </span>
                </template>
                <span v-else class="text-muted">Same as roster ({{ student.firstName }})</span>
              </span>
            </div>

            <div class="intake-item">
              <span class="intake-item__label">Pronouns</span>
              <span class="intake-item__value">
                <span v-if="pronouns" class="intake-pronoun-tag">{{ pronouns }}</span>
                <span v-else class="text-muted">—</span>
              </span>
            </div>

            <div class="intake-item">
              <span class="intake-item__label">Use with Parents / Home</span>
              <span class="intake-item__value">
                <span v-if="isClassOnlyComms" class="intake-comms-val intake-comms-val--warning">
                  <Lock :size="12" /> Only in class (Use roster name with home)
                </span>
                <span v-else-if="isPrivateChatComms" class="intake-comms-val intake-comms-val--info">
                  <MessageSquare :size="12" /> Private check-in requested
                </span>
                <span v-else-if="survey.parentCommunication" class="intake-comms-val intake-comms-val--ok">
                  <CheckCircle2 :size="12" /> Yes, in class and when contacting home
                </span>
                <span v-else class="text-muted">—</span>
              </span>
            </div>
          </div>

          <!-- Column 2: Classroom & Goals -->
          <div class="intake-col">
            <div class="intake-item">
              <span class="intake-item__label">Seating Needs</span>
              <span class="intake-item__value">
                {{ survey.seatingPreference || '—' }}
              </span>
            </div>

            <div class="intake-item">
              <span class="intake-item__label">Target Course Goal</span>
              <span class="intake-item__value">
                {{ survey.targetGrade || '—' }}
              </span>
            </div>

            <div class="intake-item">
              <span class="intake-item__label">Course Confidence</span>
              <div class="intake-conf-row">
                <div class="intake-meter-bars" :class="`intake-meter-bars--lvl-${survey.courseConfidence || 0}`">
                  <span
                    v-for="s in [1, 2, 3, 4, 5]"
                    :key="s"
                    class="intake-meter-segment"
                    :class="{ 'intake-meter-segment--filled': (survey.courseConfidence || 0) >= s }"
                  ></span>
                </div>
                <span class="intake-conf-desc">{{ survey.courseConfidenceLabel || (survey.courseConfidence ? `${survey.courseConfidence}/5` : 'Not rated') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Full-Width Bottom Sections -->
        <div v-if="survey.extracurricularsHobbies" class="intake-item intake-item--full">
          <span class="intake-item__label">Sports, Clubs, Arts &amp; Hobbies</span>
          <p class="intake-text-block">{{ survey.extracurricularsHobbies }}</p>
        </div>

        <!-- Confidential Teacher Note -->
        <div v-if="survey.confidentialNote" class="intake-item intake-item--full">
          <div class="intake-note-header">
            <span class="intake-item__label">Confidential Note to Teacher</span>
            <Lock :size="11" class="intake-lock-mini" />
          </div>
          <div class="intake-confidential-card">
            <p class="intake-note-txt">{{ survey.confidentialNote }}</p>
          </div>
        </div>

        <!-- Footer Timestamp -->
        <div v-if="survey.completedAt" class="intake-timestamp">
          Recorded: {{ formatLocalDisplay(survey.completedAt) }}
        </div>
      </div>
    </div>

    <!-- Modals -->
    <StudentInfoEditModal
      :show="showEditModal"
      :student="student"
      @close="showEditModal = false"
      @saved="onSurveySaved"
    />

    <StudentInfoSurveyModal
      :show="showSurveyModal"
      initial-tab="import"
      @close="showSurveyModal = false"
      @imported="onBatchImported"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit2,
  UploadCloud,
  Plus,
  Lock,
  MessageSquare,
  Target,
  Armchair,
  CheckCircle2
} from 'lucide-vue-next'
import StudentInfoEditModal from './StudentInfoEditModal.vue'
import StudentInfoSurveyModal from '../setup/StudentInfoSurveyModal.vue'
import { formatLocalDisplay } from '../../utils/dates.js'

const props = defineProps({
  student: { type: Object, required: true }
})

const emit = defineEmits(['updated'])

const STORAGE_KEY = 'classroom_tracker_intake_expanded'
const isExpanded = ref(localStorage.getItem(STORAGE_KEY) !== 'false')

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
  localStorage.setItem(STORAGE_KEY, isExpanded.value ? 'true' : 'false')
}

const showEditModal = ref(false)
const showSurveyModal = ref(false)

const survey = computed(() => props.student?.intakeSurvey || {})
const preferredName = computed(() => survey.value?.preferredName || props.student?.preferredName || '')
const pronouns = computed(() => survey.value?.pronouns || props.student?.pronouns || '')

const isPreferredNameDifferent = computed(() => {
  if (!preferredName.value) return false
  const rosterFirst = (props.student?.firstName || '').trim().toLowerCase()
  return preferredName.value.trim().toLowerCase() !== rosterFirst
})

const hasSurveyData = computed(() => {
  const s = survey.value
  return Boolean(
    preferredName.value ||
    pronouns.value ||
    s.seatingPreference ||
    s.targetGrade ||
    s.courseConfidence ||
    s.extracurricularsHobbies ||
    s.confidentialNote
  )
})

const isClassOnlyComms = computed(() => {
  const val = survey.value?.parentCommunication || ''
  return /only.*class/i.test(val)
})

const isPrivateChatComms = computed(() => {
  const val = survey.value?.parentCommunication || ''
  return /privately|talk.*first/i.test(val)
})

function formatShortGoal(val) {
  if (!val) return ''
  const match = val.match(/^(\d+%\s*[–-]\s*\d+%)/)
  if (match) return match[1]
  if (/confidence|improve/i.test(val)) return 'Improve'
  return val.slice(0, 12)
}

function formatShortSeat(val) {
  if (!val) return ''
  if (/front/i.test(val)) return 'Front'
  if (/middle/i.test(val)) return 'Middle'
  if (/window/i.test(val)) return 'Window'
  if (/back/i.test(val)) return 'Back'
  if (/quiet|corner/i.test(val)) return 'Corner'
  if (/door/i.test(val)) return 'Away Doors'
  return 'Desk'
}

function onSurveySaved(newSurvey) {
  emit('updated', newSurvey)
}

function onBatchImported() {
  emit('updated')
}
</script>

<style scoped>
.intake-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  margin-bottom: 1.25rem;
  transition: box-shadow 0.15s ease;
}

.intake-card:hover {
  box-shadow: var(--shadow-sm);
}

.intake-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface);
  cursor: pointer;
  user-select: none;
  gap: 10px;
  flex-wrap: wrap;
}

.intake-card__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.intake-chevron {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.intake-card__title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.intake-title-icon {
  color: #5856d6;
}

.intake-card__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.intake-quick-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.intake-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
}

.intake-badge--goal {
  background: rgba(88, 86, 214, 0.1);
  color: #5856d6;
}

.intake-badge--conf {
  background: var(--bg-secondary);
}

.intake-badge--conf-5,
.intake-badge--conf-4 {
  background: rgba(52, 199, 89, 0.12);
  color: #248a3d;
}

.intake-badge--conf-3 {
  background: rgba(255, 149, 0, 0.12);
  color: #c97500;
}

.intake-badge--conf-2,
.intake-badge--conf-1 {
  background: rgba(255, 59, 48, 0.12);
  color: #d70015;
}

.intake-badge--seat {
  background: rgba(70, 99, 172, 0.08);
  color: var(--primary);
}

.intake-badge--boundary {
  background: rgba(255, 149, 0, 0.15);
  color: #c97500;
  border: 1px solid rgba(255, 149, 0, 0.3);
}

.intake-badge--chat {
  background: rgba(0, 122, 255, 0.12);
  color: #007aff;
}

.intake-card__header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-intake-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.775rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-intake-action:hover {
  background: var(--bg-secondary);
}

.btn-intake-action--primary {
  background: var(--primary-light, rgba(70, 99, 172, 0.1));
  color: var(--primary);
  border-color: transparent;
  font-weight: 600;
}

.btn-intake-action--primary:hover {
  background: var(--primary);
  color: #ffffff;
}

/* Card Body */
.intake-card__body {
  padding: 14px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.intake-empty-state {
  text-align: center;
  padding: 0.75rem 0.5rem;
}

.intake-empty-txt {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.intake-empty-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-intake-sub {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--primary);
  color: #ffffff;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-intake-sub--ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-intake-sub--ghost:hover {
  background: var(--bg-secondary);
}

/* Populated Content */
.intake-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.intake-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.825rem;
  line-height: 1.4;
}

.intake-alert--warning {
  background: rgba(255, 149, 0, 0.1);
  border: 1px solid rgba(255, 149, 0, 0.3);
  color: #8f5200;
}

.intake-alert--info {
  background: rgba(0, 122, 255, 0.08);
  border: 1px solid rgba(0, 122, 255, 0.25);
  color: #0056b3;
}

.intake-alert-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.intake-alert-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.intake-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
}

@media (max-width: 640px) {
  .intake-columns {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

.intake-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.intake-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
}

.intake-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.intake-item--full {
  grid-column: 1 / -1;
}

.intake-item__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.intake-item__value {
  font-size: 0.875rem;
  color: var(--text);
}

.intake-pronoun-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.8rem;
}

.intake-name-diff-note {
  font-size: 0.75rem;
  color: #c97500;
  margin-left: 6px;
  font-weight: 500;
}

.intake-comms-val {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.825rem;
}

.intake-comms-val--ok {
  color: #34c759;
}

.intake-comms-val--warning {
  color: #ff9500;
  font-weight: 600;
}

.intake-comms-val--info {
  color: #007aff;
  font-weight: 600;
}

.intake-mini-meter {
  display: inline-flex;
  align-items: center;
  gap: 1.5px;
  height: 8px;
}

.intake-mini-meter__bar {
  width: 2.5px;
  height: 8px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0.25;
}

.intake-mini-meter__bar--filled {
  opacity: 1;
}

.intake-conf-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.intake-meter-bars {
  display: flex;
  align-items: center;
  gap: 3px;
}

.intake-meter-segment {
  width: 14px;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  transition: all 0.15s ease;
}

.intake-meter-bars--lvl-1 .intake-meter-segment--filled { background: #ff3b30; border-color: #ff3b30; }
.intake-meter-bars--lvl-2 .intake-meter-segment--filled { background: #ff9500; border-color: #ff9500; }
.intake-meter-bars--lvl-3 .intake-meter-segment--filled { background: #ffd60a; border-color: #ffd60a; }
.intake-meter-bars--lvl-4 .intake-meter-segment--filled { background: #30b0c7; border-color: #30b0c7; }
.intake-meter-bars--lvl-5 .intake-meter-segment--filled { background: #34c759; border-color: #34c759; }

.intake-conf-desc {
  font-size: 0.825rem;
  color: var(--text);
  font-weight: 600;
}

.intake-text-block {
  margin: 2px 0 0 0;
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.4;
  white-space: pre-wrap;
}

.intake-note-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.intake-lock-mini {
  color: var(--text-secondary);
}

.intake-confidential-card {
  margin-top: 4px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--surface);
  border-left: 3px solid #5856d6;
  border-top: 1px solid var(--border);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.intake-note-txt {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.4;
  white-space: pre-wrap;
  font-style: italic;
}

.intake-timestamp {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

@media (max-width: 600px) {
  .intake-grid {
    grid-template-columns: 1fr;
  }
}
</style>
