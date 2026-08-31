<template>
  <div class="student-timeline">
    <div v-if="loading" class="student-timeline__loading">
      <div class="timeline-spinner"></div>
      <span>Loading student timeline...</span>
    </div>

    <div v-else class="student-timeline__container">
      <!-- ── TOP TOOLBAR ─────────────────────────────────────────────── -->
      <div class="timeline-toolbar">
        <div class="timeline-toolbar__top">
          <!-- Live Search Bar -->
          <div class="timeline-search">
            <Search :size="13" class="timeline-search__icon" />
            <input
              v-model="searchQuery"
              type="text"
              class="timeline-search__input"
              placeholder="Search notes, next steps, reasons..."
            />
            <button
              v-if="searchQuery"
              type="button"
              class="timeline-search__clear"
              @click="searchQuery = ''"
              title="Clear search"
            >
              <X :size="11" />
            </button>
          </div>

          <!-- Primary Action: Log Past Record -->
          <div class="timeline-toolbar__actions">
            <button
              type="button"
              class="btn-log-record"
              @click="openLogRecordModal()"
              title="Log a past absence, late, out-of-class pass, contact, or note"
            >
              <PlusCircle :size="14" />
              <span>Log Past Record</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar: Category Chips + Date Selector -->
        <div class="timeline-toolbar__bottom">
          <!-- Category Filter Chips -->
          <div class="timeline-chips">
            <button
              v-for="f in categoryFilters"
              :key="f.id"
              type="button"
              class="timeline-chip"
              :class="[
                `timeline-chip--${f.id}`,
                { 'timeline-chip--active': activeCategoryFilter === f.id }
              ]"
              @click="activeCategoryFilter = f.id"
            >
              <component :is="f.icon" :size="12" class="timeline-chip__icon" />
              <span class="timeline-chip__label">{{ f.label }}</span>
              <span class="timeline-chip__count">{{ f.count }}</span>
            </button>
          </div>

          <!-- Date Filter Selector -->
          <div class="timeline-date-filter">
            <Calendar :size="12" class="timeline-date-filter__icon" />
            <select v-model="selectedDateRange" class="timeline-date-select">
              <option value="all">All Dates</option>
              <option value="this_month">This Month</option>
              <option value="last_30">Last 30 Days</option>
              <optgroup label="Specific Months" v-if="availableMonths.length > 0">
                <option v-for="m in availableMonths" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </optgroup>
            </select>
            <ChevronDown :size="11" class="timeline-date-select__arrow" />
          </div>
        </div>

        <!-- Summary Metrics Strip -->
        <div class="timeline-summary-bar">
          <div class="summary-metric summary-metric--total">
            <span class="summary-metric__val">{{ filteredSortedItems.length }}</span>
            <span class="summary-metric__label">{{ filteredSortedItems.length === 1 ? 'Event' : 'Events' }}</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-metric summary-metric--absent">
            <span class="summary-metric__dot"></span>
            <span class="summary-metric__val">{{ summaryStats.absences }}</span>
            <span class="summary-metric__label">Absences</span>
          </div>
          <div class="summary-metric summary-metric--late">
            <span class="summary-metric__dot"></span>
            <span class="summary-metric__val">{{ summaryStats.lates }}</span>
            <span class="summary-metric__label">Lates</span>
          </div>
          <div class="summary-metric summary-metric--washroom">
            <span class="summary-metric__dot"></span>
            <span class="summary-metric__val">{{ summaryStats.washroom }}</span>
            <span class="summary-metric__label">Out/Pass</span>
          </div>
          <div class="summary-metric summary-metric--comm">
            <span class="summary-metric__dot"></span>
            <span class="summary-metric__val">{{ summaryStats.communications }}</span>
            <span class="summary-metric__label">Contacts</span>
          </div>
          <div class="summary-metric summary-metric--academic">
            <span class="summary-metric__dot"></span>
            <span class="summary-metric__val">{{ summaryStats.academics }}</span>
            <span class="summary-metric__label">Conversations</span>
          </div>
          <div class="summary-metric summary-metric--notes">
            <span class="summary-metric__dot"></span>
            <span class="summary-metric__val">{{ summaryStats.notes }}</span>
            <span class="summary-metric__label">Notes</span>
          </div>
        </div>
      </div>

      <!-- ── EMPTY STATE ─────────────────────────────────────────────── -->
      <div v-if="filteredSortedItems.length === 0" class="timeline-empty">
        <div class="timeline-empty__icon">
          <Activity :size="32" />
        </div>
        <h4 class="timeline-empty__title">No tracked events found</h4>
        <p class="timeline-empty__desc">
          {{ searchQuery ? `No events match "${searchQuery}".` : 'No tracked actions logged under this filter selection.' }}
        </p>
        <button
          v-if="searchQuery || activeCategoryFilter !== 'all' || selectedDateRange !== 'all'"
          type="button"
          class="btn-reset-filters"
          @click="resetAllFilters"
        >
          Reset Filters
        </button>
      </div>

      <!-- ── TIGHT CONNECTED TIMELINE STREAM ─────────────────────────── -->
      <div v-else class="timeline-stream">
        <div v-for="group in groupedItems" :key="group.dateStr" class="timeline-group">
          <!-- Date Header -->
          <div class="timeline-group__header">
            <div class="timeline-group__badge">
              <Calendar :size="11" class="timeline-group__badge-icon" />
              <span class="timeline-group__day-name">{{ formatDateHeader(group.date).dayName }}</span>
              <span class="timeline-group__date-text">{{ formatDateHeader(group.date).fullDate }}</span>
            </div>
            <div class="timeline-group__line"></div>
            <span class="timeline-group__item-count">{{ group.items.length }} {{ group.items.length === 1 ? 'event' : 'events' }}</span>
          </div>

          <!-- Connected Spine & Items -->
          <div class="timeline-group__items">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="timeline-card-wrapper"
              :class="[
                `timeline-card-wrapper--${item.nodeClass}`,
                { 'timeline-card-wrapper--test-day': item.testDay }
              ]"
            >
              <!-- Timeline Node Marker -->
              <div class="timeline-node" :class="`timeline-node--${item.nodeClass}`">
                <component :is="item.icon" :size="11" />
              </div>

              <!-- Compact Event Card -->
              <div class="timeline-card">
                <div class="timeline-card__main-row">
                  <!-- Time & Category Pill -->
                  <div class="timeline-card__left">
                    <span class="timeline-card__time">
                      <Clock :size="10" />
                      {{ formatTime(item.date) }}
                    </span>

                    <span class="timeline-category-tag" :class="`timeline-category-tag--${item.nodeClass}`">
                      {{ item.title }}
                    </span>

                    <!-- Test Day Alert Badge -->
                    <span v-if="item.testDay" class="timeline-badge timeline-badge--test-day" title="Marked on an official assessment / test day">
                      <AlertTriangle :size="10" />
                      Assessment Day
                    </span>

                    <!-- Academic Outcome Badge -->
                    <span
                      v-if="item.outcome"
                      class="timeline-outcome-badge"
                      :class="`timeline-outcome-badge--${item.raw?.acOutcome}`"
                    >
                      <CheckCircle2 :size="10" v-if="item.raw?.acOutcome === 'demonstrates_understanding'" />
                      <AlertCircle :size="10" v-else-if="item.raw?.acOutcome === 'gap_confirmed'" />
                      <Activity :size="10" v-else />
                      {{ formatOutcome(item.outcome) }}
                    </span>
                  </div>

                  <!-- Inline Actions -->
                  <div class="timeline-card__actions">
                    <button
                      type="button"
                      class="timeline-action-btn timeline-action-btn--edit"
                      title="Edit this record"
                      @click="startEdit(item)"
                    >
                      <Pencil :size="11" />
                      <span class="sr-only">Edit</span>
                    </button>
                    <button
                      type="button"
                      class="timeline-action-btn timeline-action-btn--delete"
                      title="Delete this record"
                      @click="promptDelete(item)"
                    >
                      <Trash2 :size="11" />
                      <span class="sr-only">Delete</span>
                    </button>
                  </div>
                </div>

                <!-- Extended Details (Only if note, next steps, or tags exist) -->
                <div v-if="item.description || item.raw?.nextSteps || item.tags?.length" class="timeline-card__details">
                  <!-- Note Text -->
                  <p v-if="item.description" class="timeline-card__desc">
                    {{ item.description }}
                  </p>

                  <!-- Academic Next Steps Callout -->
                  <div v-if="item.raw?.nextSteps" class="timeline-card__next-steps">
                    <div class="next-steps-label">
                      <Sparkles :size="10" />
                      <span>Next Steps:</span>
                    </div>
                    <span class="next-steps-text">{{ item.raw.nextSteps }}</span>
                  </div>

                  <!-- Curriculum & Context Tags -->
                  <div v-if="item.tags?.length" class="timeline-card__tags">
                    <span v-for="tag in item.tags" :key="tag" class="timeline-tag">
                      {{ formatTag(tag) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── MODAL: LOG PAST RECORD ───────────────────────────────────── -->
    <BaseModal
      :show="showLogModal"
      title="Log Past Record"
      max-width="500px"
      :z-index="3000"
      @close="closeLogRecordModal"
    >
      <div class="log-modal">
        <!-- Record Type Selector Tabs (5 Tabs) -->
        <div class="log-type-tabs">
          <button
            type="button"
            class="log-type-tab"
            :class="{ 'log-type-tab--active': logRecordType === 'absence' }"
            @click="logRecordType = 'absence'"
          >
            <UserMinus :size="13" />
            <span>Absence</span>
          </button>
          <button
            type="button"
            class="log-type-tab"
            :class="{ 'log-type-tab--active': logRecordType === 'late' }"
            @click="logRecordType = 'late'"
          >
            <Clock :size="13" />
            <span>Late</span>
          </button>
          <button
            type="button"
            class="log-type-tab"
            :class="{ 'log-type-tab--active': logRecordType === 'washroom' }"
            @click="logRecordType = 'washroom'"
          >
            <DoorOpen :size="13" />
            <span>Out</span>
          </button>
          <button
            type="button"
            class="log-type-tab"
            :class="{ 'log-type-tab--active': logRecordType === 'contact' }"
            @click="logRecordType = 'contact'"
          >
            <Phone :size="13" />
            <span>Contact</span>
          </button>
          <button
            type="button"
            class="log-type-tab"
            :class="{ 'log-type-tab--active': logRecordType === 'note' }"
            @click="logRecordType = 'note'"
          >
            <FileText :size="13" />
            <span>Note</span>
          </button>
        </div>

        <form @submit.prevent="submitPastRecord" class="log-form">
          <!-- 1. ABSENCE FORM -->
          <template v-if="logRecordType === 'absence'">
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Absence Date <span class="required">*</span></label>
                <input
                  v-model="pastAbsenceForm.date"
                  type="date"
                  class="form-input"
                  required
                />
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Optional Note / Reason</label>
              <input
                v-model="pastAbsenceForm.note"
                type="text"
                class="form-input"
                placeholder="e.g. Excused illness, appointment..."
              />
            </div>

            <label class="form-checkbox-card">
              <input
                type="checkbox"
                v-model="pastAbsenceForm.isTestDay"
                class="form-checkbox"
              />
              <div class="checkbox-content">
                <span class="checkbox-title">Mark as Assessment / Test Day</span>
                <span class="checkbox-desc">Flags this absence as having missed an evaluation.</span>
              </div>
            </label>
          </template>

          <!-- 2. LATE FORM -->
          <template v-if="logRecordType === 'late'">
            <div class="form-row form-row--2col">
              <div class="form-field">
                <label class="form-label">Date <span class="required">*</span></label>
                <input
                  v-model="pastLateForm.date"
                  type="date"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-field">
                <label class="form-label">Time of Arrival</label>
                <input
                  v-model="pastLateForm.time"
                  type="time"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Minutes Late <span class="required">*</span></label>
              <input
                v-model.number="pastLateForm.minutes"
                type="number"
                min="1"
                max="240"
                class="form-input"
                placeholder="e.g. 15"
                required
              />
            </div>

            <div class="form-field">
              <label class="form-label">Optional Note</label>
              <input
                v-model="pastLateForm.note"
                type="text"
                class="form-input"
                placeholder="e.g. Late bus, appointment..."
              />
            </div>

            <label class="form-checkbox-card">
              <input
                type="checkbox"
                v-model="pastLateForm.isTestDay"
                class="form-checkbox"
              />
              <div class="checkbox-content">
                <span class="checkbox-title">Mark as Assessment / Test Day</span>
                <span class="checkbox-desc">Flags that the student arrived late during a scheduled evaluation.</span>
              </div>
            </label>
          </template>

          <!-- 3. OUT (ROOM EXIT / PASS) FORM -->
          <template v-if="logRecordType === 'washroom'">
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Date <span class="required">*</span></label>
                <input
                  v-model="pastWashForm.date"
                  type="date"
                  class="form-input"
                  required
                />
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Duration (Minutes) <span class="required">*</span></label>
              <input
                v-model.number="pastWashForm.minutes"
                type="number"
                min="0.5"
                max="120"
                step="0.5"
                class="form-input"
                placeholder="e.g. 5"
                required
              />
            </div>

            <div class="form-field">
              <label class="form-label">Optional Note / Destination</label>
              <input
                v-model="pastWashForm.note"
                type="text"
                class="form-input"
                placeholder="e.g. Washroom, guidance appointment, nurse..."
              />
            </div>

            <label class="form-checkbox-card">
              <input
                type="checkbox"
                v-model="pastWashForm.isTestDay"
                class="form-checkbox"
              />
              <div class="checkbox-content">
                <span class="checkbox-title">Mark as Assessment / Test Day</span>
                <span class="checkbox-desc">Flags that the student was out of the room during an evaluation.</span>
              </div>
            </label>
          </template>

          <!-- 4. PARENT CONTACT FORM -->
          <template v-if="logRecordType === 'contact'">
            <div class="form-row form-row--2col">
              <div class="form-field">
                <label class="form-label">Date <span class="required">*</span></label>
                <input
                  v-model="pastContactForm.date"
                  type="date"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-field">
                <label class="form-label">Contact Method</label>
                <select v-model="pastContactForm.method" class="form-select">
                  <option value="Phone Call">Phone Call</option>
                  <option value="Email">Email</option>
                  <option value="In-Person Meeting">In-Person Meeting</option>
                  <option value="SMS / Portal">SMS / Portal</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Guardian / Person Contacted</label>
              <input
                v-model="pastContactForm.guardian"
                type="text"
                class="form-input"
                placeholder="e.g. Mom (Mrs. Ahmad)"
              />
            </div>

            <div class="form-field">
              <label class="form-label">Summary / Notes <span class="required">*</span></label>
              <textarea
                v-model="pastContactForm.note"
                class="form-textarea"
                rows="3"
                placeholder="Discussed attendance, math test prep..."
                required
              ></textarea>
            </div>
          </template>

          <!-- 5. NOTE / GENERAL BEHAVIOR -->
          <template v-if="logRecordType === 'note'">
            <div class="form-row form-row--2col">
              <div class="form-field">
                <label class="form-label">Date <span class="required">*</span></label>
                <input
                  v-model="pastNoteForm.date"
                  type="date"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-field">
                <label class="form-label">Record Type</label>
                <select v-model="pastNoteForm.code" class="form-select">
                  <option value="note">General Note / Observation</option>
                  <option
                    v-for="code in customBehaviorCodes"
                    :key="code.codeKey"
                    :value="code.codeKey"
                  >
                    {{ code.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Observation Details <span class="required">*</span></label>
              <textarea
                v-model="pastNoteForm.note"
                class="form-textarea"
                rows="3"
                placeholder="Details of student observation or classroom event..."
                required
              ></textarea>
            </div>
          </template>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeLogRecordModal">Cancel</button>
            <button type="submit" class="btn-submit" :disabled="savingRecord">
              {{ savingRecord ? 'Saving...' : 'Save Record' }}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>

    <!-- ── MODAL: EDIT EVENT ────────────────────────────────────────── -->
    <BaseModal
      :show="!!editingItem"
      :title="editingItem ? `Edit ${editingItem.title}` : ''"
      max-width="440px"
      :z-index="3000"
      @close="editingItem = null"
    >
      <div v-if="editingItem" class="edit-modal">
        <!-- Date & Time Picker -->
        <div class="form-field">
          <label class="form-label">Date &amp; Time <span class="required">*</span></label>
          <input
            v-model="editForm.dateTime"
            type="datetime-local"
            class="form-input"
            required
          />
        </div>

        <!-- Duration (for Late or Washroom) -->
        <div v-if="editingItem.rawCode === 'l' || editingItem.rawCode === 'w'" class="form-field">
          <label class="form-label">
            {{ editingItem.rawCode === 'l' ? 'Minutes Late' : 'Duration (minutes)' }}
          </label>
          <input
            v-model.number="editForm.duration"
            type="number"
            min="0"
            step="0.5"
            class="form-input"
          />
        </div>

        <!-- Note Text -->
        <div class="form-field">
          <label class="form-label">Note / Details</label>
          <textarea
            v-model="editForm.note"
            rows="3"
            class="form-textarea"
            placeholder="Add or update notes..."
          ></textarea>
        </div>

        <!-- Test Day Toggle -->
        <div v-if="['a', 'l', 'w'].includes(editingItem.rawCode)" class="form-checkbox-wrap">
          <label class="form-checkbox-card">
            <input
              type="checkbox"
              v-model="editForm.testDay"
              class="form-checkbox"
            />
            <div class="checkbox-content">
              <span class="checkbox-title">Mark as Assessment / Test Day</span>
              <span class="checkbox-desc">Affects test-day absence and attendance analytics.</span>
            </div>
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="editingItem = null">Cancel</button>
          <button type="button" class="btn-submit" @click="saveEdit">Save Changes</button>
        </div>
      </div>
    </BaseModal>

    <!-- ── MODAL: CONFIRM DELETE ────────────────────────────────────── -->
    <BaseModal
      :show="!!itemToDelete"
      title="Delete Timeline Entry"
      max-width="400px"
      :z-index="3050"
      @close="itemToDelete = null"
    >
      <div v-if="itemToDelete" class="delete-modal">
        <div class="delete-modal__warning">
          <AlertTriangle :size="22" class="text-danger" />
          <div class="delete-modal__info">
            <h5 class="delete-modal__heading">Delete this record?</h5>
            <p class="delete-modal__sub">
              <strong>{{ itemToDelete.title }}</strong> on {{ formatLocalDate(itemToDelete.date) }}.
            </p>
            <p class="delete-modal__note">
              This will permanently remove the record and recalculate attendance statistics.
            </p>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="itemToDelete = null">Cancel</button>
          <button type="button" class="btn-danger" @click="executeDelete">Delete Record</button>
        </div>
      </div>
    </BaseModal>

    <!-- Assessment Conversation Edit Modal Hand-off -->
    <AssessmentConversationModal
      v-if="assessmentModalOpen && editingAssessmentData"
      v-model="assessmentModalOpen"
      student-name=""
      :active-class="activeClass"
      :initial-data="editingAssessmentData"
      @save="onAssessmentSave"
      @cancel="onAssessmentCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import {
  Calendar,
  Clock,
  UserMinus,
  DoorOpen,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  Pencil,
  Trash2,
  PlusCircle,
  Search,
  X,
  ChevronDown,
  CheckCircle2,
  Phone,
  FileText,
  Activity,
  Sparkles,
  GraduationCap
} from 'lucide-vue-next'
import { useClassroom } from '../../composables/useClassroom.js'
import { toMinutes } from '../../db/eventService.js'
import { resolveIcon } from '../../utils/icons.js'
import { useMessage } from '../../composables/useMessage.js'
import BaseModal from '../BaseModal.vue'
import AssessmentConversationModal from '../AssessmentConversationModal.vue'
import { formatLocalDate } from '../../utils/dates.js'

const props = defineProps({
  studentId: { type: String, required: true },
  events: { type: Array, default: () => [] },
  behaviorCodesMap: { type: Object, default: () => ({}) }
})

const { editEvent, removeEvent, logStandardEvent, activeClass, behaviorCodes } = useClassroom()
const { alert } = useMessage()

const loading = ref(false)
const searchQuery = ref('')
const activeCategoryFilter = ref('all')
const selectedDateRange = ref('all')

// ── Modals State ─────────────────────────────────────────────────────────────
const showLogModal = ref(false)
const logRecordType = ref('absence') // 'absence' | 'late' | 'washroom' | 'contact' | 'note'
const savingRecord = ref(false)

const pastAbsenceForm = reactive({
  date: formatLocalDate(new Date()),
  isTestDay: false,
  note: ''
})

const pastLateForm = reactive({
  date: formatLocalDate(new Date()),
  time: '09:00',
  minutes: 10,
  isTestDay: false,
  note: ''
})

const pastWashForm = reactive({
  date: formatLocalDate(new Date()),
  minutes: 5,
  isTestDay: false,
  note: ''
})

const pastContactForm = reactive({
  date: formatLocalDate(new Date()),
  method: 'Phone Call',
  guardian: '',
  note: ''
})

const pastNoteForm = reactive({
  date: formatLocalDate(new Date()),
  code: 'note',
  note: ''
})

// Edit State
const editingItem = ref(null)
const editForm = reactive({
  dateTime: '',
  duration: 0,
  testDay: false,
  note: ''
})

// Delete State
const itemToDelete = ref(null)

// Assessment Modal State
const assessmentModalOpen = ref(false)
const editingAssessmentData = ref(null)

// ── Custom Behavior Codes (for Note selector) ────────────────────────────────
const customBehaviorCodes = computed(() => {
  const list = Array.isArray(behaviorCodes.value) ? behaviorCodes.value : []
  return list.filter(c => !['a', 'l', 'w', 'pc', 'ac'].includes(c.codeKey))
})

// ── Process Tracked Events into Timeline ─────────────────────────────────────
const sortedItems = computed(() => {
  const items = []

  props.events.forEach(e => {
    if (e.superseded) return // Skip replaced events

    const config = props.behaviorCodesMap[e.code] || {}
    let type = 'behavior'
    let category = config.category || 'behavior'
    let nodeClass = 'behavior'
    let categoryLabel = config.label || 'Note'
    let icon = config.icon ? resolveIcon(config.icon) : AlertCircle
    let title = config.label || e.code

    // Specialized Logic for Attendance/Out-of-Class
    if (e.code === 'a') {
      type = 'attendance'
      category = 'attendance'
      nodeClass = 'absence'
      categoryLabel = 'Absence'
      title = 'Absent'
      icon = config.icon ? resolveIcon(config.icon) : UserMinus
    } else if (e.code === 'l' || (config.type === 'toggle' && e.duration != null)) {
      if (e.code === 'l') {
        type = 'attendance'
        category = 'attendance'
        nodeClass = 'late'
        categoryLabel = 'Late Arrival'
        const mins = toMinutes(e.duration)
        title = `Late (${mins} min)`
        icon = config.icon ? resolveIcon(config.icon) : Clock
      } else {
        type = 'attendance'
        category = 'attendance'
        nodeClass = 'washroom'
        categoryLabel = 'Out of Class'
        const mins = toMinutes(e.duration)
        title = `${config.label || 'Out'} (${mins} min)`
        icon = config.icon ? resolveIcon(config.icon) : DoorOpen
      }
    } else if (e.code === 'ac') {
      type = 'academic_conversation'
      category = 'academic_conversation'
      nodeClass = 'academic_conversation'
      categoryLabel = 'Academic Conversation'
      title = 'Academic Conversation'
      icon = config.icon ? resolveIcon(config.icon) : MessageSquare
    } else if (e.code === 'pc' || category === 'communication') {
      type = 'communication'
      category = 'communication'
      nodeClass = 'communication'
      categoryLabel = 'Guardian Contact'
      title = 'Parent Contact'
      icon = config.icon ? resolveIcon(config.icon) : Phone
    }

    const eventDate = new Date(e.ts || e.timestamp)

    items.push({
      id: e.eventId,
      isEvent: true,
      rawCode: e.code,
      type,
      category,
      nodeClass,
      categoryLabel,
      date: eventDate,
      title,
      description: e.note,
      icon,
      outcome: e.acOutcome,
      tags: (() => {
        let t = e.acContext ? [e.acContext] : []
        if (e.code === 'ac' && activeClass.value) {
          if (e.unitId) {
            const unit = activeClass.value.gradebookUnits?.find(u => u.unitId === e.unitId)
            if (unit) {
              t.push(`Unit: ${unit.name}`)
              if (e.expectationId) {
                const exp = unit.expectations?.find(exp => exp.expectationId === e.expectationId)
                if (exp) {
                  t.push(`Exp: ${exp.code}`)
                }
              }
            }
          }
        }
        return t
      })(),
      testDay: e.testDay,
      raw: e
    })
  })

  // Sort by date descending
  return items.sort((a, b) => b.date - a.date)
})

// ── Summary KPI Counts ───────────────────────────────────────────────────────
const summaryStats = computed(() => {
  let absences = 0
  let lates = 0
  let washroom = 0
  let communications = 0
  let academics = 0
  let notes = 0

  sortedItems.value.forEach(item => {
    if (item.rawCode === 'a') absences++
    else if (item.rawCode === 'l') lates++
    else if (item.rawCode === 'w' || item.nodeClass === 'washroom') washroom++
    else if (item.category === 'communication') communications++
    else if (item.category === 'academic_conversation') academics++
    else notes++
  })

  return { absences, lates, washroom, communications, academics, notes }
})

// ── Category Filters ─────────────────────────────────────────────────────────
const categoryFilters = computed(() => {
  const counts = {
    all: sortedItems.value.length,
    attendance: 0,
    communication: 0,
    academic_conversation: 0,
    behavior: 0
  }

  sortedItems.value.forEach(item => {
    if (counts[item.category] !== undefined) {
      counts[item.category]++
    } else {
      counts.behavior++
    }
  })

  const filters = [
    { id: 'all', label: 'All', icon: Activity, count: counts.all },
    { id: 'attendance', label: 'Attendance', icon: UserMinus, count: counts.attendance },
    { id: 'communication', label: 'Communication', icon: Phone, count: counts.communication }
  ]

  if (counts.academic_conversation > 0) {
    filters.push({ id: 'academic_conversation', label: 'Conversations', icon: GraduationCap, count: counts.academic_conversation })
  }

  if (counts.behavior > 0) {
    filters.push({ id: 'behavior', label: 'Notes & Actions', icon: FileText, count: counts.behavior })
  }

  return filters
})

// ── Available Months ─────────────────────────────────────────────────────────
const availableMonths = computed(() => {
  const months = new Map()

  sortedItems.value.forEach(item => {
    const d = item.date
    if (isNaN(d.getTime())) return
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!months.has(value)) {
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
      months.set(value, { value, label, time: d.getTime() })
    }
  })

  return Array.from(months.values()).sort((a, b) => b.time - a.time)
})

// ── Filtering Logic ──────────────────────────────────────────────────────────
const filteredSortedItems = computed(() => {
  let items = sortedItems.value

  // 1. Search Query Filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    items = items.filter(item => {
      const titleMatch = item.title?.toLowerCase().includes(q)
      const descMatch = item.description?.toLowerCase().includes(q)
      const outcomeMatch = item.outcome?.toLowerCase().includes(q)
      const nextStepsMatch = item.raw?.nextSteps?.toLowerCase().includes(q)
      const tagMatch = item.tags?.some(t => t.toLowerCase().includes(q))
      return titleMatch || descMatch || outcomeMatch || nextStepsMatch || tagMatch
    })
  }

  // 2. Category Filter
  if (activeCategoryFilter.value !== 'all') {
    items = items.filter(item => item.category === activeCategoryFilter.value)
  }

  // 3. Date Range Filter
  if (selectedDateRange.value !== 'all') {
    const now = new Date()
    if (selectedDateRange.value === 'this_month') {
      const curYear = now.getFullYear()
      const curMonth = now.getMonth()
      items = items.filter(item => {
        const d = item.date
        return d.getFullYear() === curYear && d.getMonth() === curMonth
      })
    } else if (selectedDateRange.value === 'last_30') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      items = items.filter(item => item.date >= cutoff)
    } else {
      // Specific YYYY-MM
      items = items.filter(item => {
        const d = item.date
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return mStr === selectedDateRange.value
      })
    }
  }

  return items
})

// ── Grouping by Calendar Day ────────────────────────────────────────────────
const groupedItems = computed(() => {
  const all = filteredSortedItems.value
  const groups = []

  all.forEach(item => {
    const dateStr = formatLocalDate(item.date)
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

// ── Log Past Record Actions ──────────────────────────────────────────────────
function openLogRecordModal(type = 'absence') {
  logRecordType.value = type
  pastAbsenceForm.date = formatLocalDate(new Date())
  pastAbsenceForm.isTestDay = false
  pastAbsenceForm.note = ''

  pastLateForm.date = formatLocalDate(new Date())
  pastLateForm.time = '09:00'
  pastLateForm.minutes = 10
  pastLateForm.isTestDay = false
  pastLateForm.note = ''

  pastWashForm.date = formatLocalDate(new Date())
  pastWashForm.minutes = 5
  pastWashForm.isTestDay = false
  pastWashForm.note = ''

  pastContactForm.date = formatLocalDate(new Date())
  pastContactForm.method = 'Phone Call'
  pastContactForm.guardian = ''
  pastContactForm.note = ''

  pastNoteForm.date = formatLocalDate(new Date())
  pastNoteForm.code = 'note'
  pastNoteForm.note = ''

  showLogModal.value = true
}

function closeLogRecordModal() {
  showLogModal.value = false
}

async function submitPastRecord() {
  if (savingRecord.value) return
  savingRecord.value = true

  try {
    if (logRecordType.value === 'absence') {
      const { date, isTestDay, note } = pastAbsenceForm
      if (!date) return

      // Duplicate Check
      const isDuplicate = props.events.some(ev =>
        ev.code === 'a' && !ev.superseded && formatLocalDate(ev.timestamp) === date
      )
      if (isDuplicate) {
        await alert(`An absence is already recorded for ${date}.`)
        savingRecord.value = false
        return
      }

      const isoTimestamp = new Date(`${date}T12:00:00Z`).toISOString()
      await logStandardEvent(
        props.studentId,
        'a',
        note.trim() || 'Past Absence Logged',
        { timestamp: isoTimestamp, testDay: isTestDay }
      )
    } else if (logRecordType.value === 'late') {
      const { date, time, minutes, isTestDay, note } = pastLateForm
      if (!date || !minutes) return

      const timeStr = time || '09:00'
      const isoTimestamp = new Date(`${date}T${timeStr}:00Z`).toISOString()
      const durationMs = Math.round(Number(minutes) * 60000)

      await logStandardEvent(
        props.studentId,
        'l',
        note.trim() || 'Past Late Logged',
        { timestamp: isoTimestamp, duration: durationMs, testDay: isTestDay }
      )
    } else if (logRecordType.value === 'washroom') {
      const { date, minutes, isTestDay, note } = pastWashForm
      if (!date || !minutes) return

      const isoTimestamp = new Date(`${date}T12:00:00Z`).toISOString()
      const durationMs = Math.round(Number(minutes) * 60000)

      await logStandardEvent(
        props.studentId,
        'w',
        note.trim() || null,
        { timestamp: isoTimestamp, duration: durationMs, testDay: isTestDay }
      )
    } else if (logRecordType.value === 'contact') {
      const { date, method, guardian, note } = pastContactForm
      if (!date || !note.trim()) return

      const isoTimestamp = new Date(`${date}T12:00:00Z`).toISOString()
      let formattedNote = `[${method}]`
      if (guardian.trim()) formattedNote += ` ${guardian.trim()}:`
      formattedNote += ` ${note.trim()}`

      await logStandardEvent(
        props.studentId,
        'pc',
        formattedNote,
        { timestamp: isoTimestamp }
      )
    } else if (logRecordType.value === 'note') {
      const { date, code, note } = pastNoteForm
      if (!date || !note.trim()) return

      const isoTimestamp = new Date(`${date}T12:00:00Z`).toISOString()
      await logStandardEvent(
        props.studentId,
        code || 'note',
        note.trim(),
        { timestamp: isoTimestamp }
      )
    }

    closeLogRecordModal()
  } catch (err) {
    console.error('Failed to log past record:', err)
    await alert('Failed to save record. Please check the inputs and try again.')
  } finally {
    savingRecord.value = false
  }
}

// ── Edit Actions ─────────────────────────────────────────────────────────────
function startEdit(item) {
  if (item.rawCode === 'ac') {
    editingAssessmentData.value = item.raw
    assessmentModalOpen.value = true
  } else {
    editingItem.value = item
    
    // Format timestamp for datetime-local input (YYYY-MM-DDTHH:MM)
    const d = item.date
    const pad = n => String(n).padStart(2, '0')
    const localDateTimeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

    editForm.dateTime = localDateTimeStr
    editForm.duration = toMinutes(item.raw.duration)
    editForm.testDay = item.raw.testDay || false
    editForm.note = item.description || ''
  }
}

async function saveEdit() {
  if (!editingItem.value) return

  try {
    const updates = {
      note: editForm.note
    }

    if (editForm.dateTime) {
      const parsedDate = new Date(editForm.dateTime)
      if (!isNaN(parsedDate.getTime())) {
        updates.timestamp = parsedDate.toISOString()
      }
    }

    if (editingItem.value.rawCode === 'l' || editingItem.value.rawCode === 'w') {
      const mins = parseFloat(editForm.duration) || 0
      updates.duration = Math.round(mins * 60000)
    }

    if (['a', 'l', 'w'].includes(editingItem.value.rawCode)) {
      updates.testDay = editForm.testDay
    }

    await editEvent(editingItem.value.id, updates)
    editingItem.value = null
  } catch (err) {
    console.error('Failed to update event:', err)
    await alert('Failed to update entry. Please try again.')
  }
}

// ── Assessment Conversation Handlers ─────────────────────────────────────────
function onAssessmentCancel() {
  assessmentModalOpen.value = false
  editingAssessmentData.value = null
}

async function onAssessmentSave(updatedData) {
  if (!editingAssessmentData.value) return
  const updates = {
    note: updatedData.note,
    acType: updatedData.acType,
    acContext: updatedData.acContext,
    acOutcome: updatedData.acOutcome,
    unitId: updatedData.unitId,
    expectationId: updatedData.expectationId,
    nextSteps: updatedData.nextSteps
  }
  await editEvent(editingAssessmentData.value.eventId, updates)
  assessmentModalOpen.value = false
  editingAssessmentData.value = null
}

// ── Delete Confirmation ──────────────────────────────────────────────────────
function promptDelete(item) {
  itemToDelete.value = item
}

async function executeDelete() {
  if (!itemToDelete.value) return
  const id = itemToDelete.value.id
  try {
    await removeEvent(id)
    itemToDelete.value = null
  } catch (err) {
    console.error('Failed to remove event:', err)
    await alert('Failed to delete entry. Please try again.')
  }
}

// ── Reset Filters ────────────────────────────────────────────────────────────
function resetAllFilters() {
  searchQuery.value = ''
  activeCategoryFilter.value = 'all'
  selectedDateRange.value = 'all'
}

// ── Formatters ───────────────────────────────────────────────────────────────
function formatDateHeader(date) {
  if (isNaN(date.getTime())) return { dayName: '', fullDate: '' }
  const dayName = date.toLocaleDateString('en-CA', { weekday: 'short' }).toUpperCase()
  const fullDate = date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  return { dayName, fullDate }
}

function formatTime(date) {
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatOutcome(outcome) {
  if (outcome === 'demonstrates_understanding') return 'Mastered'
  if (outcome === 'gap_confirmed') return 'Needs Support'
  if (outcome === 'inconclusive') return 'Developing'
  return ''
}

function formatTag(tag) {
  if (!tag) return ''
  return tag.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
}
</script>

<style scoped>
.student-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.student-timeline__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 0;
  color: var(--text-secondary);
  font-weight: 600;
}

.timeline-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.student-timeline__container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 860px;
  width: 100%;
}

/* ── TOOLBAR ───────────────────────────────────────────────────────── */
.timeline-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  box-shadow: var(--shadow-sm);
}

.timeline-toolbar__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.timeline-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 220px;
}

.timeline-search__icon {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  pointer-events: none;
}

.timeline-search__input {
  width: 100%;
  padding: 6px 28px 6px 30px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-family: inherit;
  color: var(--text);
  outline: none;
  transition: all 0.15s ease;
}

.timeline-search__input:focus {
  background: var(--surface);
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.timeline-search__clear {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: var(--text-secondary);
  color: var(--surface);
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.timeline-search__clear:hover {
  opacity: 1;
}

.btn-log-record {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-log-record:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

/* Filter Chips & Date Filter */
.timeline-toolbar__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.timeline-chips {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 1px 0;
}
.timeline-chips::-webkit-scrollbar { display: none; }

.timeline-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.timeline-chip:hover {
  background: var(--surface);
  border-color: var(--primary-light);
  color: var(--text);
}

.timeline-chip--active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.timeline-chip__count {
  font-size: 0.68rem;
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 5px;
  border-radius: 6px;
  font-weight: 700;
}

.timeline-chip--active .timeline-chip__count {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.timeline-date-filter {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  padding: 3px 8px 3px 8px;
  gap: 5px;
}

.timeline-date-filter__icon {
  color: var(--text-secondary);
}

.timeline-date-select {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  outline: none;
  padding-right: 12px;
  -webkit-appearance: none;
  appearance: none;
}

.timeline-date-select__arrow {
  position: absolute;
  right: 8px;
  color: var(--text-secondary);
  pointer-events: none;
}

/* Summary Metrics Bar */
.timeline-summary-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 6px;
  border-top: 1px dashed var(--border);
  font-size: 0.72rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.summary-metric {
  display: flex;
  align-items: center;
  gap: 5px;
}

.summary-metric__val {
  font-weight: 800;
  color: var(--text);
}

.summary-metric__label {
  font-weight: 600;
}

.summary-divider {
  width: 1px;
  height: 10px;
  background: var(--border);
}

.summary-metric__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.summary-metric--absent .summary-metric__dot { background: #ff3b30; }
.summary-metric--late .summary-metric__dot { background: #ff9500; }
.summary-metric--washroom .summary-metric__dot { background: var(--text-secondary); }
.summary-metric--comm .summary-metric__dot { background: #10b981; }
.summary-metric--academic .summary-metric__dot { background: #6366f1; }
.summary-metric--notes .summary-metric__dot { background: var(--text-secondary); }

/* ── EMPTY STATE ───────────────────────────────────────────────────── */
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 20px;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  gap: 8px;
}

.timeline-empty__icon {
  color: var(--text-secondary);
  opacity: 0.4;
}

.timeline-empty__title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.timeline-empty__desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  max-width: 340px;
}

.btn-reset-filters {
  margin-top: 4px;
  padding: 5px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-reset-filters:hover {
  background: var(--primary-light);
  border-color: var(--primary);
}

/* ── COMPACT CONNECTED TIMELINE STREAM ─────────────────────────────── */
.timeline-stream {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.timeline-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}

.timeline-group__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
}

.timeline-group__badge-icon {
  color: var(--primary);
}

.timeline-group__day-name {
  color: var(--text-secondary);
  font-weight: 800;
}

.timeline-group__line {
  flex: 1;
  height: 1px;
  background: var(--border);
  opacity: 0.7;
}

.timeline-group__item-count {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Connected Spine & Rows */
.timeline-group__items {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 24px;
}

/* Continuous Vertical Spine */
.timeline-group__items::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 7px;
  width: 2px;
  background: var(--border);
  border-radius: 2px;
}

.timeline-card-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
}

/* Timeline Marker Node */
.timeline-node {
  position: absolute;
  left: -24px;
  top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--surface);
  border: 2px solid var(--border);
  color: var(--text-secondary);
  z-index: 2;
  box-shadow: 0 0 0 2px var(--bg);
  transition: all 0.15s ease;
}

.timeline-node--absence {
  border-color: #ff3b30;
  color: #ff3b30;
  background: #fff5f5;
}

.timeline-node--late {
  border-color: #ff9500;
  color: #ff9500;
  background: #fffbf0;
}

.timeline-node--washroom {
  border-color: var(--text-secondary);
  color: var(--text-secondary);
}

.timeline-node--academic_conversation {
  border-color: #6366f1;
  color: #6366f1;
  background: #eef2ff;
}

.timeline-node--communication {
  border-color: #10b981;
  color: #10b981;
  background: #e6f4ea;
}

.timeline-node--behavior {
  border-color: var(--text-secondary);
  color: var(--text-secondary);
}

/* Main Event Card (Compact, Scannable) */
.timeline-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
  min-width: 0;
}

.timeline-card:hover {
  border-color: var(--primary-light);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.timeline-card-wrapper--test-day .timeline-card {
  border-left: 3px solid #ff3b30;
}

.timeline-card__main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 22px;
}

.timeline-card__left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.timeline-card__time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
}

.timeline-category-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text);
  white-space: nowrap;
}

.timeline-category-tag--absence { background: #fee2e2; color: #b91c1c; }
.timeline-category-tag--late { background: #fef3c7; color: #b45309; }
.timeline-category-tag--washroom { background: #f3f4f6; color: var(--text); }
.timeline-category-tag--academic_conversation { background: #eef2ff; color: #4338ca; }
.timeline-category-tag--communication { background: #d1fae5; color: #047857; }

.timeline-badge--test-day {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 4px;
  background: #ff3b30;
  color: #fff;
  white-space: nowrap;
}

/* Actions */
.timeline-card__actions {
  display: flex;
  align-items: center;
  gap: 3px;
  opacity: 0.35;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
}

.timeline-card:hover .timeline-card__actions,
.timeline-card__actions:focus-within {
  opacity: 1;
}

.timeline-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.timeline-action-btn:hover {
  background: var(--surface);
  color: var(--primary);
  border-color: var(--primary);
}

.timeline-action-btn--delete:hover {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fca5a5;
}

/* Extended Details (Notes, Next Steps, Tags) */
.timeline-card__details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
}

.timeline-outcome-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.timeline-outcome-badge--demonstrates_understanding {
  background: #d1fae5;
  color: #047857;
}

.timeline-outcome-badge--gap_confirmed {
  background: #fee2e2;
  color: #b91c1c;
}

.timeline-outcome-badge--inconclusive {
  background: #fef3c7;
  color: #b45309;
}

.timeline-card__desc {
  font-size: 0.8rem;
  color: var(--text);
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Next Steps Box */
.timeline-card__next-steps {
  display: flex;
  align-items: baseline;
  gap: 5px;
  background: var(--bg-secondary);
  border-left: 2px solid #6366f1;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 0.75rem;
}

.next-steps-label {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  font-weight: 800;
  color: #4338ca;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.next-steps-text {
  color: var(--text);
  line-height: 1.3;
}

/* Tags */
.timeline-card__tags {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.timeline-tag {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 5px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-secondary);
}

/* ── MODALS STYLING ────────────────────────────────────────────────── */
.log-modal,
.edit-modal,
.delete-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 2px 0;
}

.log-type-tabs {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  background: var(--bg-secondary);
  padding: 3px;
  border-radius: var(--radius-sm);
}

.log-type-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 2px;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.log-type-tab:hover {
  color: var(--text);
}

.log-type-tab--active {
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.log-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 10px;
}

.form-row--2col > .form-field {
  flex: 1;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.form-label .required {
  color: #ef4444;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--text);
  outline: none;
  transition: all 0.15s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  background: var(--surface);
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.form-checkbox-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.form-checkbox-card:hover {
  background: var(--bg-tertiary);
}

.form-checkbox {
  margin-top: 2px;
  cursor: pointer;
}

.checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.checkbox-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
}

.checkbox-desc {
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.25;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.btn-cancel {
  padding: 7px 14px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background: var(--bg-secondary);
  color: var(--text);
}

.btn-submit {
  padding: 7px 18px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s ease;
}

.btn-submit:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  padding: 7px 16px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-danger:hover {
  background: #dc2626;
}

.delete-modal__warning {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.delete-modal__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.delete-modal__heading {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
}

.delete-modal__sub {
  font-size: 0.82rem;
  color: var(--text);
}

.delete-modal__note {
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
