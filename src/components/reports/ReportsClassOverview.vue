<template>
  <div v-if="loading" class="reports__loading" aria-live="polite">Loading…</div>

  <div v-else class="reports__overview">

    <!-- ── Section 1: Headline Stats ──────────────────────────── -->
    <div class="reports__headline-grid">

      <!-- Card 1: Attendance -->
      <div class="reports__headline-card">
        <div class="reports__headline-label"><UserCheck :size="13" /> CLASS ATTENDANCE</div>
        <div v-if="attendanceRate !== null" class="reports__headline-rate">{{ attendanceRate }}<span class="reports__headline-unit">%</span></div>
        <div class="reports__headline-sub">{{ aggregates.attendance.totalAbsences }} absences · {{ aggregates.attendance.totalLates }} lates</div>
        <div v-if="attendanceRate === null" class="reports__headline-sub">No attendance data for rate</div>
        <div v-if="aggregates.attendance.testDayAbsences > 0" class="reports__headline-detail">{{ aggregates.attendance.testDayAbsences }} absences on test days</div>
        <div v-if="chronicallyAbsentCount > 0" class="reports__headline-alert"><AlertTriangle :size="12" /> {{ chronicallyAbsentCount }} chronically absent (5+)</div>
      </div>

      <!-- Card 2: Washroom -->
      <div class="reports__headline-card">
        <div class="reports__headline-label"><Toilet :size="13" /> WASHROOM</div>
        <div class="reports__headline-rate">{{ tripsPerStudentAvg }}<span class="reports__headline-unit"> trips/student</span></div>
        <div class="reports__headline-sub">{{ aggregates.washroom.avgDuration }} min/trip · {{ aggregates.washroom.totalTrips }} total</div>
        <div v-if="aggregates.washroom.testDayTrips > 0" class="reports__headline-detail">{{ aggregates.washroom.testDayTrips }} trips on test days</div>
        <div v-if="aggregates.washroom.longTrips.length > 0" class="reports__headline-alert"><AlertTriangle :size="12" /> {{ aggregates.washroom.longTrips.length }} long trip{{ aggregates.washroom.longTrips.length !== 1 ? 's' : '' }} (&gt; 15 min)</div>
      </div>

      <!-- Card 3: Behavior -->
      <div class="reports__headline-card">
        <div class="reports__headline-label"><Activity :size="13" /> BEHAVIOR</div>
        <div class="reports__headline-rate">{{ aggregates.behavior.totalRedirects }}<span class="reports__headline-unit"> redirect/device</span></div>
        <div class="reports__headline-sub">{{ aggregates.behavior.totalParentContacts }} parent contacts</div>
        <div class="reports__headline-detail">{{ notesLoggedCount }} notes logged</div>
        <div v-if="aggregates.behavior.redirectAlerts.length > 0" class="reports__headline-alert"><AlertTriangle :size="12" /> {{ aggregates.behavior.redirectAlerts.length }} student{{ aggregates.behavior.redirectAlerts.length !== 1 ? 's' : '' }} with 3+ redirects</div>
      </div>

    </div>

    <!-- ── Section 2: Follow Up + Washroom Detail ─────────────── -->
    <div class="reports__two-col">

      <!-- Left: Follow Up -->
      <div class="reports__followup-col">
        <h4 class="reports__col-title">FOLLOW UP</h4>
        <div v-if="followUpItems.length === 0" class="reports__followup-empty">
          <span class="reports__followup-ok">✓ No students flagged for follow up this period</span>
        </div>
        <ul v-else class="reports__followup-list">
          <li
            v-for="item in followUpVisible"
            :key="item.studentId + '-' + item.reason"
            class="reports__followup-item"
            :class="`reports__followup-item--${item.severity}`"
            role="button"
            tabindex="0"
            @click="$emit('select-student', item.studentId)"
            @keydown.enter="$emit('select-student', item.studentId)"
          >
            <span class="reports__followup-name">{{ item.name }}</span>
            <span class="reports__followup-reason">{{ item.reason }}</span>
            <span class="reports__followup-arrow">→</span>
          </li>
        </ul>
        <button
          v-if="followUpItems.length > 8"
          class="reports__followup-more"
          @click="$emit('toggle-followup-expand')"
        >
          {{ followUpExpanded ? 'show less ↑' : `and ${followUpItems.length - 8} more →` }}
        </button>
      </div>

      <!-- Right: Washroom Detail -->
      <div class="reports__washroom-col">
        <h4 class="reports__col-title">WASHROOM DETAIL</h4>
        <div v-if="aggregates.washroom.studentTrips.length" class="reports__chart-container">
          <Bar :data="washroomChartData" :options="washroomChartOptions" />
        </div>
        <p v-else class="reports__no-data">No washroom trips recorded.</p>
        <div v-if="aggregates.washroom.longTrips.length" class="reports__long-trips">
          <h4 class="reports__section-title reports__section-title--alert">Long Trips (&gt; 15 min)</h4>
          <ul class="reports__list reports__list--alert">
            <li v-for="t in longTripsVisible" :key="t.date + t.name">
              <span>{{ t.name }} — {{ t.date }}</span>
              <span class="reports__list-count">{{ t.duration.toFixed(1) }} min</span>
            </li>
          </ul>
          <button
            v-if="aggregates.washroom.longTrips.length > 5"
            class="reports__followup-more"
            @click="$emit('toggle-longtrips-expand')"
          >
            {{ longTripsExpanded ? 'show less ↑' : `and ${aggregates.washroom.longTrips.length - 5} more →` }}
          </button>
        </div>

        <!-- Recent Logs Sub-section -->
        <div v-if="hasAnyNotes" class="reports__logs-section">
          <div class="reports__section-header-row">
            <h4 class="reports__section-title">RECENT CLASSROOM LOGS</h4>
            <button class="reports__btn-text" @click="$emit('toggle-show-completed')">
              {{ showCompletedNotes ? 'Hide Completed' : 'Show Completed' }}
            </button>
          </div>
          
          <div v-if="recentNotes.length > 0" class="reports__logs-grid">
            <div 
              v-for="note in recentNotes" 
              :key="note.eventId" 
              class="reports__log-card"
              :class="{ 'reports__log-card--completed': note.completed }"
            >
              <div class="reports__log-header">
                <span class="reports__log-student">{{ note.studentName }}</span>
                <div class="reports__log-actions">
                  <span class="reports__log-date">{{ formatTimestamp(note.timestamp) }}</span>
                  <button 
                    class="reports__log-check" 
                    :class="{ 'reports__log-check--active': note.completed }"
                    @click.stop="$emit('toggle-note-complete', note.eventId, note.completed)"
                    :title="note.completed ? 'Mark Incomplete' : 'Mark Complete'"
                  >
                    <Check :size="14" />
                  </button>
                </div>
              </div>
              <p class="reports__log-content">{{ note.note }}</p>
            </div>
          </div>
          <div v-else class="reports__logs-empty">
            <Check :size="24" class="reports__logs-empty-icon" />
            <p>All logs for this period are completed!</p>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { UserCheck, Toilet, Activity, AlertTriangle, Check } from 'lucide-vue-next'
import { Bar } from 'vue-chartjs'

defineProps({
  loading: { type: Boolean, default: false },
  attendanceRate: { type: [String, Number], default: null },
  aggregates: { type: Object, required: true },
  chronicallyAbsentCount: { type: Number, default: 0 },
  tripsPerStudentAvg: { type: [String, Number], default: '0.0' },
  notesLoggedCount: { type: Number, default: 0 },
  followUpItems: { type: Array, default: () => [] },
  followUpVisible: { type: Array, default: () => [] },
  followUpExpanded: { type: Boolean, default: false },
  washroomChartData: { type: Object, required: true },
  washroomChartOptions: { type: Object, required: true },
  longTripsVisible: { type: Array, default: () => [] },
  longTripsExpanded: { type: Boolean, default: false },
  hasAnyNotes: { type: Boolean, default: false },
  recentNotes: { type: Array, default: () => [] },
  showCompletedNotes: { type: Boolean, default: false }
})

defineEmits([
  'select-student',
  'toggle-followup-expand',
  'toggle-longtrips-expand',
  'toggle-show-completed',
  'toggle-note-complete'
])

function formatTimestamp(ts) {
  if (!ts) return ''
  const parseStr = ts.includes('Z') || ts.match(/[+-]\d{2}:\d{2}$/) ? ts : ts + 'Z'
  return new Date(parseStr).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}
</script>

<style scoped>
.reports__loading {
  padding: 40px;
  text-align: center;
  font-weight: 600;
  color: var(--text-secondary);
}

.reports__overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.reports__headline-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.reports__headline-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reports__headline-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.reports__headline-rate {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
}

.reports__headline-unit {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.reports__headline-sub {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.reports__headline-detail {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
}

.reports__headline-alert {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--danger);
  font-weight: 700;
  margin-top: 4px;
}

.reports__two-col {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
}

@media (max-width: 1024px) {
  .reports__two-col {
    grid-template-columns: 1fr;
  }
}

.reports__followup-col, .reports__washroom-col {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.reports__col-title {
  margin: 0 0 12px 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.reports__followup-empty {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  text-align: center;
}

.reports__followup-ok {
  font-size: 0.85rem;
  color: #10b981;
  font-weight: 600;
}

.reports__followup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reports__followup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-left: 3px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.reports__followup-item:hover {
  transform: translateX(2px);
  background: var(--surface);
}

.reports__followup-item--high {
  border-left-color: var(--danger);
}

.reports__followup-item--medium {
  border-left-color: var(--warning);
}

.reports__followup-item--low {
  border-left-color: var(--primary);
}

.reports__followup-name {
  font-weight: 600;
  font-size: 0.85rem;
}

.reports__followup-reason {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.reports__followup-arrow {
  color: var(--text-secondary);
}

.reports__followup-more {
  margin-top: 8px;
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.reports__chart-container {
  height: 220px;
  position: relative;
}

.reports__no-data {
  color: var(--text-secondary);
  font-size: 0.85rem;
  padding: 20px 0;
}

.reports__long-trips {
  margin-top: 16px;

  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.reports__section-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.reports__section-title--alert {
  color: var(--danger);
}

.reports__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reports__list--alert li {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 6px 8px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: var(--radius-sm);
}

.reports__list-count {
  font-weight: 700;
  color: var(--danger);
}

.reports__logs-section {
  margin-top: 20px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.reports__section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.reports__btn-text {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.reports__logs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.reports__log-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reports__log-card--completed {
  opacity: 0.6;
}

.reports__log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reports__log-student {
  font-weight: 700;
  font-size: 0.85rem;
}

.reports__log-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reports__log-date {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.reports__log-check {
  background: none;
  border: 1px solid var(--border);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
}

.reports__log-check--active {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.reports__log-content {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text);
}

.reports__logs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  color: var(--text-secondary);
}

.reports__logs-empty-icon {
  color: #10b981;
}
</style>
