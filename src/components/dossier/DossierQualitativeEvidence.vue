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
            v-for="type in ['all', 'observation', 'conversation']" 
            :key="type"
            class="filter-pill"
            :class="{ 'filter-pill--active': activeFilter === type }"
            @click="activeFilter = type"
          >
            {{ type.charAt(0).toUpperCase() + type.slice(1) + (type === 'all' ? '' : 's') }}
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
    <div v-if="events.length === 0" class="qualitative-evidence__empty">
      <p>No qualitative evidence recorded for this student yet.</p>
    </div>

    <!-- Main Content List -->
    <div v-else class="qualitative-evidence__content">
      
      <!-- General Class Comments (No Unit) -->
      <div 
        v-if="activeUnitFilter === 'all' || activeUnitFilter === 'general'" 
        class="qualitative-section"
      >
        <h4 class="qualitative-section__title">General Observations & Conversations</h4>
        
        <div v-if="generalComments.length === 0" class="qualitative-section__empty">
          No general observations recorded.
        </div>
        
        <div v-else class="general-comments-list">
          <div v-for="event in generalComments" :key="event.eventId" class="general-comment-card">
            <div class="general-comment-card__header">
              <div class="general-comment-card__type">
                <component :is="event.acType === 'observation' ? Eye : MessageSquare" :size="14" />
                <span>{{ event.acType === 'observation' ? 'Observation' : 'Conversation' }}</span>
              </div>
              <span class="general-comment-card__context">{{ formatContext(event.acContext) }}</span>
              <span 
                class="general-comment-card__outcome-badge" 
                :class="`outcome-badge--${event.acOutcome}`"
              >
                {{ formatOutcome(event.acOutcome) }}
              </span>
              <div style="flex: 1"></div>
              <span class="general-comment-card__date">{{ formatDate(event.timestamp) }}</span>
              <button 
                class="general-comment-card__delete" 
                @click="$emit('delete', event.eventId)"
                title="Delete Entry"
              >
                <Trash2 :size="14" />
              </button>
            </div>
            <div class="general-comment-card__note">
              {{ event.note }}
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
          <div 
            v-for="exp in unit.expectations || []" 
            :key="exp.expectationId" 
            class="exp-card"
            :class="{ 'exp-card--expanded': isCardExpanded(unit.unitId, exp.expectationId) }"
          >
            <!-- Card Header (Always Visible) -->
            <div 
              class="exp-card__header" 
              @click="toggleCard(unit.unitId, exp.expectationId)"
            >
              <div class="exp-card__code-badge">{{ exp.code }}</div>
              <div class="exp-card__title-desc">
                {{ exp.description }}
              </div>
              <div class="exp-card__arrow">
                <component 
                  :is="isCardExpanded(unit.unitId, exp.expectationId) ? ChevronUp : ChevronDown" 
                  :size="18" 
                />
              </div>
            </div>

            <!-- Card Body / Timeline -->
            <div 
              v-if="getExpectationEvents(unit.unitId, exp.expectationId).length > 0" 
              class="exp-card__timeline-wrapper"
            >
              <div class="timeline">
                <div class="timeline__line"></div>
                <div class="timeline__steps">
                  <div 
                    v-for="(evt, idx) in getExpectationEvents(unit.unitId, exp.expectationId)" 
                    :key="evt.eventId"
                    class="timeline__step"
                    :class="[
                      `timeline__step--${evt.acOutcome}`,
                      { 'timeline__step--active': getSelectedEvent(unit.unitId, exp.expectationId)?.eventId === evt.eventId }
                    ]"
                    @click.stop="selectEvent(unit.unitId, exp.expectationId, evt.eventId)"
                  >
                    <div class="timeline__badge" :class="`timeline__badge--${evt.acOutcome}`">
                      {{ formatTimelineDate(evt.timestamp) }}
                    </div>
                    <div class="timeline__label">
                      {{ formatOutcomeLabel(evt.acOutcome) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div 
              v-else 
              class="exp-card__no-events"
            >
              No observations recorded yet for this expectation.
            </div>

            <!-- Expanded Comments Panel (Interactive / Shows Selected Event only) -->
            <div 
              v-if="isCardExpanded(unit.unitId, exp.expectationId) && getExpectationEvents(unit.unitId, exp.expectationId).length > 0" 
              class="exp-card__comments-panel"
            >
              <div class="comments-box" v-if="getSelectedEvent(unit.unitId, exp.expectationId)">
                <!-- Sliding Caret Arrow -->
                <div 
                  class="comments-box__arrow" 
                  :style="getCaretStyle(unit.unitId, exp.expectationId)"
                ></div>
                <h5 class="comments-box__title">Comments</h5>
                
                <div class="comments-box__content">
                  <div class="comment-item comment-item--timeline-active">
                    <div class="comment-item__header">
                      <span class="comment-item__type">
                        {{ getSelectedEvent(unit.unitId, exp.expectationId).acType === 'observation' ? 'Observation' : 'Conversation' }}
                      </span>
                      <span class="comment-item__context">({{ formatContext(getSelectedEvent(unit.unitId, exp.expectationId).acContext) }})</span>
                      <div style="flex: 1"></div>
                      <span class="comment-item__date">{{ formatDate(getSelectedEvent(unit.unitId, exp.expectationId).timestamp) }}</span>
                      <button 
                        class="comment-item__delete" 
                        @click="$emit('delete', getSelectedEvent(unit.unitId, exp.expectationId).eventId)"
                        title="Delete Comment"
                      >
                        <Trash2 :size="12" />
                      </button>
                    </div>
                    <p class="comment-item__text">{{ getSelectedEvent(unit.unitId, exp.expectationId).note }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- General Unit Comments (Comments with unitId but no expectationId) -->
          <div 
            v-if="getUnitGeneralEvents(unit.unitId).length > 0" 
            class="exp-card"
            :class="{ 'exp-card--expanded': isCardExpanded(unit.unitId, 'general') }"
          >
            <div 
              class="exp-card__header" 
              @click="toggleCard(unit.unitId, 'general')"
            >
              <div class="exp-card__code-badge exp-card__code-badge--general">Unit</div>
              <div class="exp-card__title-desc font-italic">
                General comments for {{ unit.name }}
              </div>
              <div class="exp-card__arrow">
                <component 
                  :is="isCardExpanded(unit.unitId, 'general') ? ChevronUp : ChevronDown" 
                  :size="18" 
                />
              </div>
            </div>

            <!-- Comments List -->
            <div 
              v-if="isCardExpanded(unit.unitId, 'general')" 
              class="exp-card__comments-panel exp-card__comments-panel--flat"
            >
              <div class="comments-box comments-box--general">
                <div class="comments-box__list">
                  <div 
                    v-for="evt in getUnitGeneralEvents(unit.unitId)" 
                    :key="evt.eventId"
                    class="comment-item"
                  >
                    <div class="comment-item__header">
                      <span class="comment-item__type">
                        {{ evt.acType === 'observation' ? 'Observation' : 'Conversation' }}
                      </span>
                      <span class="comment-item__context">({{ formatContext(evt.acContext) }})</span>
                      <span class="comment-item__outcome-dot" :class="`dot--${evt.acOutcome}`"></span>
                      <span class="comment-item__outcome-text">{{ formatOutcome(evt.acOutcome) }}</span>
                      <div style="flex: 1"></div>
                      <span class="comment-item__date">{{ formatDate(evt.timestamp) }}</span>
                      <button 
                        class="comment-item__delete" 
                        @click="$emit('delete', evt.eventId)"
                        title="Delete Comment"
                      >
                        <Trash2 :size="12" />
                      </button>
                    </div>
                    <p class="comment-item__text">{{ evt.note }}</p>
                  </div>
                </div>
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
  activeClass: { type: Object, default: () => null }
})

const emit = defineEmits(['delete'])

const activeFilter = ref('all')
const activeUnitFilter = ref('all')
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

// General comments (no unitId at all)
const generalComments = computed(() => {
  return filteredTypeEvents.value
    .filter(e => !e.unitId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

// Get events for a specific expectation, sorted chronologically (past to present for timeline)
function getExpectationEvents(unitId, expectationId) {
  return filteredTypeEvents.value
    .filter(e => e.unitId === unitId && e.expectationId === expectationId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

// Get unit-level general comments (unitId matches, but expectationId is null)
function getUnitGeneralEvents(unitId) {
  return filteredTypeEvents.value
    .filter(e => e.unitId === unitId && !e.expectationId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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

function formatOutcomeLabel(outcome) {
  if (outcome === 'demonstrates_understanding') return 'Mastered'
  if (outcome === 'gap_confirmed') return 'Needs Support'
  return 'Developing'
}

function formatContext(ctx) {
  if (!ctx) return 'General'
  return ctx
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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

.qualitative-section__title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.1);
  padding: 10px 20px;
  margin: 0;
  border-bottom: 1px solid var(--border);
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
  padding: 16px 20px;
  gap: 12px;
  transition: background 0.15s ease;
}

.exp-card:hover {
  background: rgba(255, 255, 255, 0.01);
}

.exp-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
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
  padding: 8px 12px 12px 56px;
}

.timeline {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 0;
  margin-right: 48px;
}

.timeline__line {
  position: absolute;
  top: 18px;
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
  gap: 6px;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.timeline__step:hover {
  transform: translateY(-2px);
}

.timeline__badge {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
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

.timeline__badge--demonstrates_understanding {
  background: #34c759;
}

.timeline__badge--inconclusive {
  background: #ff9500;
}

.timeline__badge--gap_confirmed {
  background: #ff3b30;
}

.timeline__label {
  font-size: 0.7rem;
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
  padding: 16px;
  position: relative;
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

.comments-box__title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  letter-spacing: 0.05em;
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
</style>
