<template>
  <BaseModal
    :show="show"
    title="Export Duties to Calendar"
    maxWidth="560px"
    @close="$emit('close')"
  >
    <div class="duty-export-modal">
      <p class="duty-export-modal__desc">
        Supervision duties are assigned one week at a time. Download the calendar (<code>.ics</code>) file for any specific duty week to import into Microsoft Outlook or Apple Calendar.
      </p>

      <!-- Empty state -->
      <div v-if="dutyWeeks.length === 0" class="duty-export-modal__empty">
        <CalendarX :size="32" class="duty-export-modal__empty-icon" />
        <p>No active duties recorded for this school year yet.</p>
      </div>

      <div v-else class="duty-export-modal__content">
        <!-- 1. Highlighted Latest Entered Week Card -->
        <div v-if="latestWeek" class="duty-export-modal__latest-card">
          <div class="duty-export-modal__latest-header">
            <span class="duty-export-modal__badge">
              <Sparkles :size="12" /> Most Recently Logged
            </span>
            <span class="duty-export-modal__latest-minutes">{{ latestWeek.totalMinutes }} min</span>
          </div>

          <div class="duty-export-modal__latest-body">
            <h3 class="duty-export-modal__latest-dates">{{ latestWeek.label }}</h3>
            <p class="duty-export-modal__latest-duties">
              {{ latestWeek.dutyNames.join(', ') }} · {{ latestWeek.duties.length }} {{ latestWeek.duties.length === 1 ? 'day' : 'days' }}
            </p>
          </div>

          <div class="duty-export-modal__latest-actions">
            <button
              type="button"
              class="setup__btn-primary duty-export-modal__btn"
              @click="handleDownloadWeek(latestWeek)"
            >
              <Calendar :size="15" />
              <span>Download Outlook Calendar (.ics)</span>
            </button>
            <a
              v-if="latestWeek.duties.length > 0 && getOutlookWebComposeUrl(latestWeek.duties[0])"
              :href="getOutlookWebComposeUrl(latestWeek.duties[0])"
              target="_blank"
              rel="noopener"
              class="setup__btn-ghost duty-export-modal__btn"
              title="Open draft in Outlook on the web"
            >
              <ExternalLink :size="14" />
              <span>Open in Outlook Web</span>
            </a>
          </div>
        </div>

        <!-- 2. List of All Assigned Weeks -->
        <div class="duty-export-modal__weeks-section">
          <h4 class="duty-export-modal__section-title">
            All Assigned Duty Weeks ({{ dutyWeeks.length }})
          </h4>

          <div class="duty-export-modal__list">
            <div
              v-for="wk in dutyWeeks"
              :key="wk.weekKey"
              class="duty-export-modal__week-row"
              :class="{ 'duty-export-modal__week-row--latest': wk.isLatest }"
            >
              <div class="duty-export-modal__week-info">
                <div class="duty-export-modal__week-date-row">
                  <span class="duty-export-modal__week-dates">{{ wk.label }}</span>
                  <span v-if="wk.isLatest" class="duty-export-modal__mini-tag">Latest</span>
                </div>
                <span class="duty-export-modal__week-sub">
                  {{ wk.dutyNames.join(', ') }} · {{ wk.duties.length }} {{ wk.duties.length === 1 ? 'day' : 'days' }} · {{ wk.totalMinutes }}m
                </span>
              </div>

              <div class="duty-export-modal__week-actions">
                <button
                  type="button"
                  class="setup__btn-ghost duty-export-modal__row-btn"
                  @click="handleDownloadWeek(wk)"
                  title="Download .ics file for this week"
                >
                  <Download :size="14" />
                  <span>.ics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="duty-export-modal__footer">
        <button
          type="button"
          class="setup__btn-ghost"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import { Calendar, CalendarX, Download, ExternalLink, Sparkles } from 'lucide-vue-next'
import BaseModal from '../BaseModal.vue'
import {
  groupDutiesByWeek,
  getLastEnteredWeek,
  downloadWeekDutiesIcs,
  getOutlookWebComposeUrl
} from '../../utils/dutyCalendarExport.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  duties: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'exported'])

const dutyWeeks = computed(() => {
  return groupDutiesByWeek(props.duties)
})

const latestWeek = computed(() => {
  return getLastEnteredWeek(props.duties)
})

function handleDownloadWeek(week) {
  if (!week) return
  downloadWeekDutiesIcs(week)
  emit('exported', week)
}
</script>

<style scoped>
.duty-export-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.duty-export-modal__desc {
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.45;
  margin: 0;
}

.duty-export-modal__desc code {
  background: var(--bg-secondary);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.82rem;
}

.duty-export-modal__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 16px;
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border);
  gap: 10px;
}

.duty-export-modal__empty-icon {
  opacity: 0.5;
}

.duty-export-modal__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Latest Week Featured Card ── */
.duty-export-modal__latest-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--primary-light, rgba(70, 99, 172, 0.08));
  border: 1px solid var(--primary, #4663ac);
  border-radius: var(--radius-md, 12px);
  padding: 14px 16px;
}

.duty-export-modal__latest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duty-export-modal__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--primary, #4663ac);
}

.duty-export-modal__latest-minutes {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--primary, #4663ac);
}

.duty-export-modal__latest-dates {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 2px 0;
}

.duty-export-modal__latest-duties {
  font-size: 0.84rem;
  color: var(--text-secondary);
  margin: 0;
}

.duty-export-modal__latest-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.duty-export-modal__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.84rem;
  padding: 6px 12px;
  height: 34px;
}

/* ── Weeks List ── */
.duty-export-modal__weeks-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.duty-export-modal__section-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.duty-export-modal__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 10px);
  padding: 4px;
}

.duty-export-modal__week-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-sm, 6px);
  background: var(--surface);
  transition: background 0.15s ease;
}

.duty-export-modal__week-row:hover {
  background: var(--bg-secondary);
}

.duty-export-modal__week-row--latest {
  background: rgba(70, 99, 172, 0.04);
}

.duty-export-modal__week-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.duty-export-modal__week-date-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.duty-export-modal__week-dates {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

.duty-export-modal__mini-tag {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-light);
  padding: 1px 5px;
  border-radius: 4px;
}

.duty-export-modal__week-sub {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.duty-export-modal__row-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 0.78rem;
  height: 30px;
}

.duty-export-modal__footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
</style>
