<template>
  <div class="qualitative-evidence">
    <!-- Header with Filters -->
    <div class="qualitative-evidence__header">
      <div class="qualitative-evidence__header-text">
        <h3 class="qualitative-evidence__title">Observations & Conversations</h3>
        <p class="qualitative-evidence__subtitle">Professional judgment evidence captured via radials</p>
      </div>
      
      <div class="qualitative-evidence__filters">
        <!-- Type Filters (All, Observations, Conversations) -->
        <div class="filter-pills">
          <button 
            v-for="type in ['all', 'observation', 'conversation', 'product']" 
            :key="type"
            class="filter-pill"
            :class="{ 'filter-pill--active': activeFilter === type }"
            @click="activeFilter = type"
          >
            {{ type === 'all' ? 'All' : (type === 'product' ? 'Products' : type.charAt(0).toUpperCase() + type.slice(1) + 's') }}
          </button>
        </div>

        <!-- Unit Filters -->
        <div class="filter-unit" v-if="activeClass?.gradebookUnits?.length">
          <select v-model="activeUnitFilter" class="filter-select">
            <option value="all">All Units</option>
            <option value="general">General (No Unit)</option>
            <option v-for="u in activeClass.gradebookUnits" :key="u.unitId" :value="u.unitId">
              {{ u.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Empty States -->
    <div v-if="!hasAnyEvidence" class="qualitative-evidence__empty">
      <p>No qualitative evidence recorded for this student yet.</p>
    </div>

    <!-- Main Content List -->
    <div v-else class="qualitative-evidence__content">
      
      <!-- General Class Evidence (Horizontal Timeline Format) -->
      <div 
        v-if="(activeUnitFilter === 'all' || activeUnitFilter === 'general') && (generalCommentsTimeline.length > 0 || activeUnitFilter === 'general')" 
        class="qualitative-section qualitative-section--general"
      >
        <h4 class="qualitative-section__title" style="padding: 6px 16px; background: rgba(0, 0, 0, 0.08); border-bottom: 1px solid var(--border);">
          General Observations & Conversations
        </h4>

        <div class="expectations-grid">
          <div 
            class="exp-card"
            :class="{ 
              'exp-card--expanded': isCardExpanded('general', 'general'),
              'exp-card--has-data': generalCommentsTimeline.length > 0,
              'exp-card--empty': generalCommentsTimeline.length === 0
            }"
          >
            <!-- Card Header -->
            <div 
              class="exp-card__header" 
              :class="{ 'exp-card__header--clickable': generalCommentsTimeline.length > 0 }"
              @click="generalCommentsTimeline.length > 0 && toggleCard('general', 'general')"
            >
              <div class="exp-card__code-badge exp-card__code-badge--general">General</div>
              <div class="exp-card__title-desc font-italic">
                Course-Wide / General Observations & Conversations
              </div>
              <div v-if="generalCommentsTimeline.length > 0" class="exp-card__count-pill">
                {{ generalCommentsTimeline.length }} {{ generalCommentsTimeline.length === 1 ? 'entry' : 'entries' }}
              </div>
              <div v-if="generalCommentsTimeline.length > 0" class="exp-card__arrow">
                <component 
                  :is="isCardExpanded('general', 'general') ? ChevronUp : ChevronDown" 
                  :size="18" 
                />
              </div>
            </div>

            <!-- Card Body / Timeline -->
            <div v-if="generalCommentsTimeline.length > 0" class="exp-card__timeline-wrapper">
              <div class="timeline">
                <div class="timeline__line"></div>
                <div class="timeline__steps">
                  <div 
                    v-for="evt in generalCommentsTimeline" 
                    :key="evt.eventId"
                    class="timeline__step"
                    :class="[
                      evt.eventId === getSelectedGeneralEvent()?.eventId ? 'timeline__step--active' : '',
                      `timeline__step--${evt.acOutcome}`
                    ]"
                    @click.stop="selectGeneralEvent(evt.eventId)"
                  >
                    <div :class="['timeline__badge', `timeline__badge--${evt.acOutcome}`]">
                      {{ formatDate(evt.timestamp) }}
                    </div>
                    <span class="timeline__label">{{ formatOutcomeLabel(evt) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Expanded Comments Panel -->
            <div 
              v-if="isCardExpanded('general', 'general') && generalCommentsTimeline.length > 0" 
              class="exp-card__comments-panel"
            >
              <div class="comments-box" v-if="getSelectedGeneralEvent()">
                <!-- Sliding Caret Arrow -->
                <div class="comments-box__arrow" :style="getGeneralCaretStyle()"></div>

                <div class="comments-box__header">
                  <h5 class="comments-box__title">
                    General Entry
                    <span class="comments-box__meta-type">
                      — {{ getSelectedGeneralEvent().acType === 'observation' ? 'Observation' : 'Conversation' }}
                      ({{ formatContext(getSelectedGeneralEvent().acContext) }})
                    </span>
                  </h5>
                  <div style="flex: 1"></div>
                  <span class="comments-box__date">{{ formatDate(getSelectedGeneralEvent().timestamp) }}</span>
                  <button 
                    class="comment-item__delete" 
                    @click="$emit('delete', getSelectedGeneralEvent().eventId)"
                    title="Delete Entry"
                  >
                    <Trash2 :size="12" />
                  </button>
                </div>

                <div class="comments-box__content">
                  <div class="comment-item comment-item--timeline-active">
                    <p class="comment-item__text">{{ getSelectedGeneralEvent().note }}</p>
                    <div v-if="getSelectedGeneralEvent().nextSteps" class="comment-item__next-steps">
                      <h6 class="next-steps-title">Next Steps</h6>
                      <p class="next-steps-text">{{ getSelectedGeneralEvent().nextSteps }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Unit Groupings -->
      <div 
        v-for="unit in filteredUnits" 
        :key="unit.unitId" 
        class="qualitative-section"
      >
        <h4 class="qualitative-section__title">{{ unit.name }}</h4>

        <div class="expectations-grid">
          <!-- Render Expectations defined under this Unit -->
          <template v-for="exp in getGroupedUnitExpectations(unit)" :key="exp.expectationId">
            <!-- Overall subheader -->
            <div v-if="exp.isHeader" class="exp-strand-subheader">
              <span class="exp-strand-subheader__code">{{ exp.code }}</span>
              <span class="exp-strand-subheader__text">{{ exp.description }}</span>
            </div>

            <!-- Specific expectation row (standard exp-card) -->
            <div 
              v-else
              class="exp-card"
              :class="{ 
                'exp-card--expanded': isCardExpanded(unit.unitId, getExpKey(exp)),
                'exp-card--has-data': getExpectationEvents(unit.unitId, getExpKey(exp)).length > 0,
                'exp-card--empty': getExpectationEvents(unit.unitId, getExpKey(exp)).length === 0
              }"
            >
              <!-- Card Header (Clickable only if events exist) -->
              <div 
                class="exp-card__header" 
                :class="{ 'exp-card__header--clickable': getExpectationEvents(unit.unitId, getExpKey(exp)).length > 0 }"
                @click="getExpectationEvents(unit.unitId, getExpKey(exp)).length > 0 && toggleCard(unit.unitId, getExpKey(exp))"
              >
                <div class="exp-card__code-badge">{{ exp.code }}</div>
                <div class="exp-card__title-desc">
                  {{ exp.description }}
                </div>
                <div 
                  v-if="getExpectationEvents(unit.unitId, getExpKey(exp)).length > 0" 
                  class="exp-card__count-pill"
                >
                  {{ getExpectationEvents(unit.unitId, getExpKey(exp)).length }} {{ getExpectationEvents(unit.unitId, getExpKey(exp)).length === 1 ? 'entry' : 'entries' }}
                </div>
                <div 
                  v-if="getExpectationEvents(unit.unitId, getExpKey(exp)).length > 0" 
                  class="exp-card__arrow"
                >
                  <component 
                    :is="isCardExpanded(unit.unitId, getExpKey(exp)) ? ChevronUp : ChevronDown" 
                    :size="18" 
                  />
                </div>
              </div>

              <!-- Card Body / Timeline -->
              <div 
                v-if="getExpectationEvents(unit.unitId, getExpKey(exp)).length > 0" 
                class="exp-card__timeline-wrapper"
              >
                <div class="timeline">
                  <div class="timeline__line"></div>
                  <div class="timeline__steps">
                    <div 
                      v-for="(evt, idx) in getExpectationEvents(unit.unitId, getExpKey(exp))" 
                      :key="evt.eventId"
                      class="timeline__step"
                      :class="[
                        evt.eventId === getSelectedEvent(unit.unitId, getExpKey(exp))?.eventId ? 'timeline__step--active' : '',
                        `timeline__step--${evt.acOutcome}`
                      ]"
                      @click.stop="selectEvent(unit.unitId, getExpKey(exp), evt.eventId)"
                    >
                      <div :class="['timeline__badge', `timeline__badge--${evt.acOutcome}`]">
                        {{ formatDate(evt.timestamp) }}
                      </div>
                      <span class="timeline__label">{{ formatOutcomeLabel(evt) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Expanded Comments Panel (Interactive / Shows Selected Event only) -->
              <div 
                v-if="isCardExpanded(unit.unitId, getExpKey(exp)) && getExpectationEvents(unit.unitId, getExpKey(exp)).length > 0" 
                class="exp-card__comments-panel"
              >
                <div class="comments-box" v-if="getSelectedEvent(unit.unitId, getExpKey(exp))">
                  <!-- Sliding Caret Arrow -->
                  <div 
                    class="comments-box__arrow" 
                    :style="getCaretStyle(unit.unitId, getExpKey(exp))"
                  ></div>

                  <!-- PRODUCT DETAILS -->
                  <template v-if="getSelectedEvent(unit.unitId, getExpKey(exp)).acType === 'product'">
                    <div class="comments-box__header">
                      <h5 class="comments-box__title">
                        Product Details
                        <span class="comments-box__meta-type">
                          — {{ getSelectedEvent(unit.unitId, getExpKey(exp)).assessmentName }}
                        </span>
                      </h5>
                      <div style="flex: 1"></div>
                      <span class="comments-box__date">{{ formatDate(getSelectedEvent(unit.unitId, getExpKey(exp)).timestamp) }}</span>
                    </div>
                    
                    <div class="comments-box__content">
                      <div class="comment-item comment-item--timeline-active" style="display: flex; flex-direction: column; gap: 6px;">
                        <div>
                          <span class="text-secondary font-weight-600" style="font-size: 0.8rem; color: var(--text-secondary);">Score:</span>
                          <strong style="margin-left: 6px; font-size: 0.95rem; color: var(--text);">{{ getSelectedEvent(unit.unitId, getExpKey(exp)).scoreLabel }}</strong>
                          <span class="eim-code-badge" style="margin-left: 8px;">{{ getSelectedEvent(unit.unitId, getExpKey(exp)).pctLabel }}</span>
                        </div>
                        <div>
                          <span class="text-secondary font-weight-600" style="font-size: 0.8rem; color: var(--text-secondary);">Category:</span>
                          <span style="margin-left: 6px; font-size: 0.85rem; font-weight: 500; color: var(--text);">{{ getSelectedEvent(unit.unitId, getExpKey(exp)).categoryName }}</span>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- OBS/CONV DETAILS (DEFAULT) -->
                  <template v-else>
                    <div class="comments-box__header">
                      <h5 class="comments-box__title">
                        Comments
                        <span class="comments-box__meta-type">
                          — {{ getSelectedEvent(unit.unitId, getExpKey(exp)).acType === 'observation' ? 'Observation' : 'Conversation' }}
                          ({{ formatContext(getSelectedEvent(unit.unitId, getExpKey(exp)).acContext) }})
                        </span>
                      </h5>
                      <div style="flex: 1"></div>
                      <span class="comments-box__date">{{ formatDate(getSelectedEvent(unit.unitId, getExpKey(exp)).timestamp) }}</span>
                      <button 
                        class="comment-item__delete" 
                        @click="$emit('delete', getSelectedEvent(unit.unitId, getExpKey(exp)).eventId)"
                        title="Delete Comment"
                      >
                        <Trash2 :size="12" />
                      </button>
                    </div>
                    
                    <div class="comments-box__content">
                      <div class="comment-item comment-item--timeline-active">
                        <p class="comment-item__text">{{ getSelectedEvent(unit.unitId, getExpKey(exp)).note }}</p>
                        <div 
                          v-if="getSelectedEvent(unit.unitId, getExpKey(exp)).nextSteps" 
                          class="comment-item__next-steps"
                        >
                          <h6 class="next-steps-title">Next Steps</h6>
                          <p class="next-steps-text">{{ getSelectedEvent(unit.unitId, getExpKey(exp)).nextSteps }}</p>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </template>

          <!-- General Unit Evidence (Horizontal Timeline Format) -->
          <div 
            v-if="getUnitGeneralEvents(unit.unitId).length > 0" 
            class="exp-card"
            :class="{ 
              'exp-card--expanded': isCardExpanded(unit.unitId, 'general'),
              'exp-card--has-data': getUnitGeneralEvents(unit.unitId).length > 0
            }"
          >
            <!-- Card Header -->
            <div 
              class="exp-card__header exp-card__header--clickable" 
              @click="toggleCard(unit.unitId, 'general')"
            >
              <div class="exp-card__code-badge exp-card__code-badge--general">Unit</div>
              <div class="exp-card__title-desc font-italic">
                General evidence for {{ unit.name }}
              </div>
              <div class="exp-card__count-pill">
                {{ getUnitGeneralEvents(unit.unitId).length }} {{ getUnitGeneralEvents(unit.unitId).length === 1 ? 'entry' : 'entries' }}
              </div>
              <div class="exp-card__arrow">
                <component 
                  :is="isCardExpanded(unit.unitId, 'general') ? ChevronUp : ChevronDown" 
                  :size="18" 
                />
              </div>
            </div>

            <!-- Card Body / Timeline -->
            <div class="exp-card__timeline-wrapper">
              <div class="timeline">
                <div class="timeline__line"></div>
                <div class="timeline__steps">
                  <div 
                    v-for="evt in getUnitGeneralEvents(unit.unitId)" 
                    :key="evt.eventId"
                    class="timeline__step"
                    :class="[
                      evt.eventId === getSelectedEvent(unit.unitId, 'general')?.eventId ? 'timeline__step--active' : '',
                      `timeline__step--${evt.acOutcome}`
                    ]"
                    @click.stop="selectEvent(unit.unitId, 'general', evt.eventId)"
                  >
                    <div :class="['timeline__badge', `timeline__badge--${evt.acOutcome}`]">
                      {{ formatDate(evt.timestamp) }}
                    </div>
                    <span class="timeline__label">{{ formatOutcomeLabel(evt) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Expanded Comments Panel (Interactive / Shows Selected Event only) -->
            <div 
              v-if="isCardExpanded(unit.unitId, 'general')" 
              class="exp-card__comments-panel"
            >
              <div class="comments-box" v-if="getSelectedEvent(unit.unitId, 'general')">
                <!-- Sliding Caret Arrow -->
                <div 
                  class="comments-box__arrow" 
                  :style="getCaretStyle(unit.unitId, 'general')"
                ></div>

                <!-- PRODUCT DETAILS -->
                <template v-if="getSelectedEvent(unit.unitId, 'general').acType === 'product'">
                  <div class="comments-box__header">
                    <h5 class="comments-box__title">
                      Product Details
                      <span class="comments-box__meta-type">
                        — {{ getSelectedEvent(unit.unitId, 'general').assessmentName }}
                      </span>
                    </h5>
                    <div style="flex: 1"></div>
                    <span class="comments-box__date">{{ formatDate(getSelectedEvent(unit.unitId, 'general').timestamp) }}</span>
                  </div>
                  
                  <div class="comments-box__content">
                    <div class="comment-item comment-item--timeline-active" style="display: flex; flex-direction: column; gap: 6px;">
                      <div>
                        <span class="text-secondary font-weight-600" style="font-size: 0.8rem; color: var(--text-secondary);">Score:</span>
                        <strong style="margin-left: 6px; font-size: 0.95rem; color: var(--text);">{{ getSelectedEvent(unit.unitId, 'general').scoreLabel }}</strong>
                        <span class="eim-code-badge" style="margin-left: 8px;">{{ getSelectedEvent(unit.unitId, 'general').pctLabel }}</span>
                      </div>
                      <div>
                        <span class="text-secondary font-weight-600" style="font-size: 0.8rem; color: var(--text-secondary);">Category:</span>
                        <span style="margin-left: 6px; font-size: 0.85rem; font-weight: 500; color: var(--text);">{{ getSelectedEvent(unit.unitId, 'general').categoryName }}</span>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- OBS/CONV DETAILS (DEFAULT) -->
                <template v-else>
                  <div class="comments-box__header">
                    <h5 class="comments-box__title">
                      Comments
                      <span class="comments-box__meta-type">
                        — {{ getSelectedEvent(unit.unitId, 'general').acType === 'observation' ? 'Observation' : 'Conversation' }}
                        ({{ formatContext(getSelectedEvent(unit.unitId, 'general').acContext) }})
                      </span>
                    </h5>
                    <div style="flex: 1"></div>
                    <span class="comments-box__date">{{ formatDate(getSelectedEvent(unit.unitId, 'general').timestamp) }}</span>
                    <button 
                      class="comment-item__delete" 
                      @click="$emit('delete', getSelectedEvent(unit.unitId, 'general').eventId)"
                      title="Delete Comment"
                    >
                      <Trash2 :size="12" />
                    </button>
                  </div>
                  
                  <div class="comments-box__content">
                    <div class="comment-item comment-item--timeline-active">
                      <p class="comment-item__text">{{ getSelectedEvent(unit.unitId, 'general').note }}</p>
                      <div 
                        v-if="getSelectedEvent(unit.unitId, 'general').nextSteps" 
                        class="comment-item__next-steps"
                      >
                        <h6 class="next-steps-title">Next Steps</h6>
                        <p class="next-steps-text">{{ getSelectedEvent(unit.unitId, 'general').nextSteps }}</p>
                      </div>
                    </div>
                  </div>
                </template>
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
import { Eye, MessageSquare, Trash2, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { formatLocalDisplay } from '../../utils/dates.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  activeClass: { type: Object, default: () => null },
  assessments: { type: Array, default: () => [] }
})

const emit = defineEmits(['delete'])

const hasAnyEvidence = computed(() => {
  if (props.activeClass?.gradebookUnits?.length > 0) return true
  return props.events?.length > 0
})

const activeFilter = ref('all')
const activeUnitFilter = ref('all')
const isGeneralSectionCollapsed = ref(true)
const expandedCards = ref({}) // key format: `unitId-expectationId`
const selectedEventIdMap = ref({}) // key format: `unitId-expectationId` -> eventId

function isCardExpanded(unitId, expectationId) {
  return !!expandedCards.value[`${unitId}-${expectationId}`]
}

function toggleCard(unitId, expectationId) {
  const key = `${unitId}-${expectationId}`
  expandedCards.value[key] = !expandedCards.value[key]
}

// Select specific timeline node
// Select specific timeline node (or toggle closed if clicking currently active node)
function selectEvent(unitId, expectationId, eventId) {
  const key = `${unitId}-${expectationId}`
  const currentActive = getSelectedEvent(unitId, expectationId)
  const isCurrentlyActive = currentActive?.eventId === eventId
  
  if (isCurrentlyActive && expandedCards.value[key]) {
    expandedCards.value[key] = false
  } else {
    selectedEventIdMap.value[key] = eventId
    expandedCards.value[key] = true
  }
}

// Get selected event, defaulting to most recent
function getSelectedEvent(unitId, expectationId) {
  const eventsList = getExpectationEvents(unitId, expectationId)
  if (eventsList.length === 0) return null
  
  const key = `${unitId}-${expectationId}`
  const selectedId = selectedEventIdMap.value[key]
  if (selectedId) {
    const found = eventsList.find(e => e.eventId === selectedId)
    if (found) return found
  }
  
  // Default: most recent (last item in chronological list)
  return eventsList[eventsList.length - 1]
}

// Calculate sliding caret arrow coordinates
function getCaretStyle(unitId, expectationId) {
  const eventsList = getExpectationEvents(unitId, expectationId)
  if (eventsList.length === 0) return {}
  
  const selectedEvt = getSelectedEvent(unitId, expectationId)
  if (!selectedEvt) return {}
  
  const idx = eventsList.findIndex(e => e.eventId === selectedEvt.eventId)
  if (idx === -1) return {}
  
  if (eventsList.length === 1) {
    return { left: '50%' }
  }
  
  // Percent of the timeline width
  const percent = (idx / (eventsList.length - 1)) * 100
  
  // Timeline has 24px left/right padding, and the arrow itself has a width of 10px (so center is at left - 5px)
  return {
    left: `calc(24px + (${percent}% - ${48 * (idx / (eventsList.length - 1))}px) - 5px)`
  }
}


// Filter units list based on unit filter dropdown
const filteredUnits = computed(() => {
  if (!props.activeClass?.gradebookUnits) return []
  if (activeUnitFilter.value === 'all') {
    return props.activeClass.gradebookUnits
  }
  if (activeUnitFilter.value === 'general') {
    return []
  }
  return props.activeClass.gradebookUnits.filter(u => u.unitId === activeUnitFilter.value)
})

// Filtered observations list by type (Observation / Conversation)
const filteredTypeEvents = computed(() => {
  if (activeFilter.value === 'all') return props.events
  return props.events.filter(e => e.acType === activeFilter.value)
})

// General comments (no unitId at all), sorted chronologically past-to-present for timeline track
const generalCommentsTimeline = computed(() => {
  return filteredTypeEvents.value
    .filter(e => !e.unitId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
})

function selectGeneralEvent(eventId) {
  const key = 'general-general'
  const currentActive = getSelectedGeneralEvent()
  if (currentActive?.eventId === eventId && expandedCards.value[key]) {
    expandedCards.value[key] = false
  } else {
    selectedEventIdMap.value[key] = eventId
    expandedCards.value[key] = true
  }
}

function getSelectedGeneralEvent() {
  const list = generalCommentsTimeline.value
  if (list.length === 0) return null
  const key = 'general-general'
  const selectedId = selectedEventIdMap.value[key]
  if (selectedId) {
    const found = list.find(e => e.eventId === selectedId)
    if (found) return found
  }
  return list[list.length - 1]
}

function getGeneralCaretStyle() {
  const list = generalCommentsTimeline.value
  if (list.length === 0) return {}
  const selectedEvt = getSelectedGeneralEvent()
  if (!selectedEvt) return {}
  const idx = list.findIndex(e => e.eventId === selectedEvt.eventId)
  if (idx === -1) return {}
  if (list.length === 1) return { left: '50%' }
  const percent = (idx / (list.length - 1)) * 100
  return {
    left: `calc(24px + (${percent}% - ${48 * (idx / (list.length - 1))}px) - 5px)`
  }
}

function getExpKey(exp) {
  if (!exp) return null
  return exp.expectationId || exp.code
}

function matchesUnit(targetUnitId, targetUnitName, eventUnitId) {
  if (!eventUnitId) return false
  if (eventUnitId === targetUnitId) return true
  if (targetUnitName && String(eventUnitId).toLowerCase() === String(targetUnitName).toLowerCase()) return true
  return false
}

function matchesExpectation(expId, expCode, eventExpId) {
  if (!eventExpId) return false
  if (eventExpId === expId) return true
  if (expCode && String(eventExpId).toLowerCase() === String(expCode).toLowerCase()) return true
  return false
}

// Get events for a specific expectation, sorted chronologically (past to present for timeline)
function getExpectationEvents(unitId, expectationId) {
  if (expectationId === 'general') {
    return getUnitGeneralEvents(unitId)
  }
  const unitObj = props.activeClass?.gradebookUnits?.find(u => u.unitId === unitId || u.name?.toLowerCase() === String(unitId).toLowerCase())
  const expObj = unitObj?.expectations?.find(e => 
    (e.expectationId && e.expectationId === expectationId) || 
    (e.code && String(e.code).toLowerCase() === String(expectationId).toLowerCase())
  )

  const targetCode = expObj?.code || (typeof expectationId === 'string' ? expectationId : null)

  const dbEvents = filteredTypeEvents.value.filter(e => {
    const isUnitMatch = matchesUnit(unitId, unitObj?.name, e.unitId)
    const isExpMatch = matchesExpectation(expectationId, targetCode, e.expectationId)
    return isUnitMatch && isExpMatch
  })
  
  const productEvents = (activeFilter.value === 'all' || activeFilter.value === 'product')
    ? getSyntheticProductEvents(unitId, expectationId, unitObj, targetCode)
    : []
    
  return [...dbEvents, ...productEvents]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

// Get unit-level general comments (unitId matches, but expectationId is null)
function getUnitGeneralEvents(unitId) {
  const unitObj = props.activeClass?.gradebookUnits?.find(u => u.unitId === unitId || u.name?.toLowerCase() === String(unitId).toLowerCase())

  const dbEvents = filteredTypeEvents.value.filter(e => {
    const isUnitMatch = matchesUnit(unitId, unitObj?.name, e.unitId)
    return isUnitMatch && !e.expectationId
  })
    
  const productEvents = (activeFilter.value === 'all' || activeFilter.value === 'product')
    ? getSyntheticProductEvents(unitId, null, unitObj, null)
    : []

  return [...dbEvents, ...productEvents]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

function getSyntheticProductEvents(unitId, expectationId, unitObj = null, targetCode = null) {
  if (!props.assessments?.length) return []
  return props.assessments
    .filter(a => {
      if (a.score === null) return false
      const isUnitMatch = matchesUnit(unitId, unitObj?.name, a.unitId)
      if (!isUnitMatch) return false

      if (expectationId === null) {
        return !a.expectationId
      } else {
        return matchesExpectation(expectationId, targetCode, a.expectationId)
      }
    })
    .map(a => {
      const pct = a.scaledTotal ? (a.score / a.scaledTotal) * 100 : (a.score / a.totalPoints) * 100
      return {
        eventId: `product-${a.assessmentId}`,
        timestamp: a.date,
        note: `Score: ${a.score} / ${a.totalPoints} (${Math.round(pct)}%)`,
        acOutcome: 'product',
        acType: 'product',
        acContext: a.categoryId,
        assessmentName: a.name,
        scoreLabel: `${a.score} / ${a.totalPoints}`,
        pctLabel: `${Math.round(pct)}%`,
        categoryName: props.activeClass?.gradebookCategories?.find(c => c.categoryId === a.categoryId)?.name || 'Product'
      }
    })
}

function formatTimelineDate(ts) {
  return formatLocalDisplay(ts, { month: 'short', day: 'numeric' })
}

function formatDate(ts) {
  return formatLocalDisplay(ts, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatOutcome(outcome) {
  if (outcome === 'demonstrates_understanding') return 'Mastered'
  if (outcome === 'gap_confirmed') return 'Needs Support'
  return 'Developing'
}

function formatOutcomeLabel(evt) {
  if (typeof evt === 'string') {
    if (evt === 'demonstrates_understanding') return 'Mastered'
    if (evt === 'gap_confirmed') return 'Needs Support'
    return 'Developing'
  }
  if (evt?.acType === 'product') {
    return `${evt.pctLabel} (Product)`
  }
  if (evt?.acOutcome === 'demonstrates_understanding') return 'Mastered'
  if (evt?.acOutcome === 'gap_confirmed') return 'Needs Support'
  return 'Developing'
}

function formatContext(ctx) {
  if (!ctx) return 'General'
  return ctx
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getGroupedUnitExpectations(unit) {
  const rawExps = unit.expectations || []
  const hasSpecifics = rawExps.some(e => e.code.includes('.'))
  
  if (!hasSpecifics) {
    return rawExps.map(e => ({ ...e, isHeader: false }))
  }
  
  const overalls = rawExps.filter(e => !e.code.includes('.'))
  const specifics = rawExps.filter(e => e.code.includes('.'))
  const result = []
  
  overalls.forEach(ov => {
    result.push({ ...ov, isHeader: true })
    const children = specifics.filter(sp => sp.code.startsWith(ov.code + '.'))
    children.forEach(ch => {
      result.push({ ...ch, isHeader: false })
    })
  })
  
  const remainingSpecifics = specifics.filter(sp => 
    !overalls.some(ov => sp.code.startsWith(ov.code + '.'))
  )
  if (remainingSpecifics.length > 0) {
    remainingSpecifics.forEach(ch => {
      result.push({ ...ch, isHeader: false })
    })
  }
  
  return result
}
</script>

<style scoped>
.qualitative-evidence {
  margin-top: 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.qualitative-evidence__header {
  padding: 16px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.qualitative-evidence__title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.qualitative-evidence__subtitle {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
  opacity: 0.8;
}

/* ── Filters ────────────────────────────────────────────────────── */
.qualitative-evidence__filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-pills {
  display: flex;
  gap: 6px;
}

.filter-pill {
  padding: 4px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.filter-pill:hover {
  background: var(--bg-secondary);
  border-color: var(--primary-light);
}

.filter-pill--active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.filter-select {
  padding: 4px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
}

.filter-select:hover {
  border-color: var(--primary-light);
}

/* ── Section Containers ─────────────────────────────────────────── */
.qualitative-evidence__content {
  display: flex;
  flex-direction: column;
}

.qualitative-section {
  display: flex;
  flex-direction: column;
}

.qualitative-section__header-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.08);
  padding: 6px 16px;
  border-bottom: 1px solid var(--border);
  cursor: default;
}

.qualitative-section__header-toggle--clickable {
  cursor: pointer;
}

.qualitative-section__title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  background: transparent;
  padding: 0;
  margin: 0;
  border-bottom: none;
}

.qualitative-section__badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: #a855f7;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.25);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  line-height: 1;
}

.qualitative-section__badge--empty {
  color: var(--text-secondary);
  background: var(--bg-hover);
  border-color: var(--border);
  opacity: 0.6;
}

.qualitative-section__arrow {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
}

.qualitative-section__empty {
  padding: 16px 20px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

.qualitative-evidence__empty {
  padding: 32px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
}

/* ── General Comments Cards ─────────────────────────────────────── */
.general-comments-list {
  display: flex;
  flex-direction: column;
  background: var(--surface);
}

.general-comment-card {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.general-comment-card:last-child {
  border-bottom: none;
}

.general-comment-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.general-comment-card__type {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.general-comment-card__context {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
}

.general-comment-card__outcome-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.outcome-badge--demonstrates_understanding {
  background: rgba(52, 199, 89, 0.15);
  color: #34c759;
}

.outcome-badge--inconclusive {
  background: rgba(255, 149, 0, 0.15);
  color: #ff9500;
}

.outcome-badge--gap_confirmed {
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

.general-comment-card__date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.general-comment-card__delete {
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

.general-comment-card__delete:hover {
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.1);
}

.general-comment-card__note {
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.4;
  white-space: pre-wrap;
}

/* ── Expectations Cards (Premium Card UI) ───────────────────────── */
.expectations-grid {
  display: flex;
  flex-direction: column;
  background: var(--surface);
}

.exp-card {
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 10px 16px;
  gap: 6px;
  transition: background 0.15s ease;
}

.exp-card:hover {
  background: rgba(255, 255, 255, 0.01);
}

.exp-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: default;
}

.exp-card__header--clickable {
  cursor: pointer;
}

.exp-card--empty {
  opacity: 0.72;
}

.exp-card--empty .exp-card__code-badge {
  background: var(--bg-hover);
  border-color: var(--border);
  color: var(--text-secondary);
  font-weight: 700;
  opacity: 0.65;
}

.exp-card--empty .exp-card__title-desc {
  color: var(--text-secondary);
}

.exp-card--has-data .exp-card__code-badge {
  background: rgba(52, 152, 219, 0.14);
  color: var(--primary);
  border-color: rgba(52, 152, 219, 0.3);
  box-shadow: 0 1px 2px rgba(52, 152, 219, 0.08);
}

.exp-card__count-pill {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  background: rgba(52, 152, 219, 0.12);
  border: 1px solid rgba(52, 152, 219, 0.2);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.exp-card__code-badge {
  font-size: 0.75rem;
  font-weight: 800;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  min-width: 44px;
  text-align: center;
}

.exp-card__code-badge--general {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
  border-color: rgba(168, 85, 247, 0.2);
}

.exp-card__title-desc {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.font-italic {
  font-style: italic;
  color: var(--text-secondary);
}

.exp-card__arrow {
  color: var(--text-secondary);
}

.exp-card__no-events {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-style: italic;
  padding-left: 56px;
}

/* ── Horizontal Progress Timeline ───────────────────────────────── */
.exp-card__timeline-wrapper {
  padding: 4px 12px 6px 56px;
}

.timeline {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px 0;
  margin-right: 48px;
}

.timeline__line {
  position: absolute;
  top: 12px;
  left: 24px;
  right: 24px;
  height: 2px;
  background: var(--border);
  z-index: 1;
}

.timeline__steps {
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 24px;
  box-sizing: border-box;
  z-index: 2;
}

.timeline__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.timeline__step:hover {
  transform: translateY(-2px);
}

.timeline__badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

/* Active timeline step glows with outcome color */
.timeline__step--active.timeline__step--demonstrates_understanding .timeline__badge {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px #34c759;
}
.timeline__step--active.timeline__step--inconclusive .timeline__badge {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px #ff9500;
}
.timeline__step--active.timeline__step--gap_confirmed .timeline__badge {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px #ff3b30;
}

.timeline__step--active.timeline__step--product .timeline__badge {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--primary);
}

.timeline__badge--demonstrates_understanding {
  background: #34c759;
}

.timeline__badge--inconclusive {
  background: #ff9500;
}

.timeline__badge--gap_confirmed {
  background: #ff3b30;
}

.timeline__badge--product {
  background: var(--primary);
}

.timeline__label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
}

/* Active timeline step label highlights */
.timeline__step--active .timeline__label {
  color: var(--text);
  font-weight: 800;
}

/* ── Collapsible Comments Box (Premium Style) ────────────────────── */
.exp-card__comments-panel {
  padding-left: 56px;
  margin-top: 4px;
}

.exp-card__comments-panel--flat {
  padding-left: 56px;
}

.comments-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  position: relative;
}

.comments-box__expectation-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  border-left: 3px solid var(--primary);
  line-height: 1.4;
}

/* Speech bubble caret */
.comments-box__arrow {
  position: absolute;
  top: -6px;
  width: 10px;
  height: 10px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  border-top: 1px solid var(--border);
  transform: rotate(45deg);
  transition: left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.comments-box__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.comments-box__title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
}

.comments-box__meta-type {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: none;
  margin-left: 6px;
  opacity: 0.85;
}

.comments-box__date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.comments-box__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.comment-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.comment-item--timeline-active {
  border: none;
  padding-bottom: 0;
}

.comment-item__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.comment-item__type {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.comment-item__context {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.comment-item__outcome-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-left: 6px;
}

.dot--demonstrates_understanding { background: #34c759; }
.dot--inconclusive { background: #ff9500; }
.dot--gap_confirmed { background: #ff3b30; }

.comment-item__outcome-text {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.comment-item__date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.comment-item__delete {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.comment-item__delete:hover {
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.1);
}

.comment-item__text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.4;
  white-space: pre-wrap;
}

.comment-item__next-steps,
.general-comment-card__next-steps {
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--bg-hover);
  border-left: 3px solid var(--primary-light);
  border-radius: var(--radius-sm);
}

.next-steps-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 4px 0;
  letter-spacing: 0.05em;
}

.next-steps-text {
  font-size: 0.8rem;
  color: var(--text);
  margin: 0;
  line-height: 1.4;
  white-space: pre-wrap;
}

.exp-strand-subheader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-weight: 700;
  font-size: 0.8rem;
}

.exp-strand-subheader__code {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 800;
  min-width: 32px;
  text-align: center;
}

.exp-strand-subheader__text {
  flex: 1;
}

.timeline__step--product {
  border-radius: var(--radius-sm) !important;
}
</style>
