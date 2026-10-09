<template>
  <Teleport to="body">
    <div 
      v-if="card" 
      class="attempt-hover-card"
      :style="{ 
        left: card.x + 'px', 
        top: card.y + 'px',
        transform: card.placedAbove ? 'translateY(-100%)' : 'none'
      }"
    >
      <!-- Header -->
      <div class="attempt-hover-card__header">
        <div class="attempt-hover-card__meta">
          <div class="attempt-hover-card__student">{{ card.studentName }}</div>
          <div class="attempt-hover-card__assessment">
            {{ card.assessmentName }}
            <span v-if="card.totalPoints" class="attempt-hover-card__points">(/{{ card.totalPoints }})</span>
          </div>
        </div>
        <div 
          class="attempt-hover-card__pill"
          :class="'attempt-hover-card__pill--' + card.badgeType"
        >
          <RefreshCw v-if="card.attempts.length > 1" :size="10" />
          <span>{{ pillLabel }}</span>
          <NotebookPen v-if="hasAnyComment" :size="10" />
        </div>
      </div>

      <!-- Retest Policy Note if >1 attempt -->
      <div v-if="card.attempts.length > 1 && card.retestPolicy" class="attempt-hover-card__policy">
        Policy: <span class="attempt-hover-card__policy-val">{{ card.retestPolicy }}</span> score counts
      </div>

      <!-- Attempts List -->
      <div class="attempt-hover-card__body">
        <div 
          v-for="(att, idx) in formattedAttempts" 
          :key="att.attemptId || idx"
          class="attempt-hover-card__row"
          :class="{ 'attempt-hover-card__row--counting': att.isCounting }"
        >
          <div class="attempt-hover-card__row-header">
            <span class="attempt-hover-card__attempt-name">
              {{ card.attempts.length > 1 ? `Attempt ${idx + 1}` : 'Score' }}
            </span>
            <div class="attempt-hover-card__row-scores">
              <span class="attempt-hover-card__score-val">
                {{ att.pointsEarned != null ? att.pointsEarned : '—' }}<template v-if="card.totalPoints"> / {{ card.totalPoints }}</template>
              </span>
              <span v-if="att.pointsEarned != null && card.totalPoints" class="attempt-hover-card__pct-val">
                ({{ Math.round((att.pointsEarned / card.totalPoints) * 1000) / 10 }}%)
              </span>
              <span v-if="att.isCounting && card.attempts.length > 1" class="attempt-hover-card__counting-tag">
                counting ✓
              </span>
            </div>
            <span v-if="att.formattedDate" class="attempt-hover-card__date">
              {{ att.formattedDate }}
            </span>
          </div>

          <!-- Note / Comment Callout Box -->
          <div v-if="att.comment && att.comment.trim()" class="attempt-hover-card__note">
            <NotebookPen :size="11" class="attempt-hover-card__note-icon" />
            <span class="attempt-hover-card__note-text">{{ att.comment.trim() }}</span>
          </div>
        </div>
      </div>

      <!-- Footer Tip -->
      <div class="attempt-hover-card__footer">
        <span class="attempt-hover-card__tip">Click badge or right-click to view history &amp; edit</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { RefreshCw, NotebookPen } from 'lucide-vue-next'

const props = defineProps({
  card: {
    type: Object,
    default: null
  }
})

const hasAnyComment = computed(() => {
  return props.card?.attempts?.some(a => a.comment && String(a.comment).trim() !== '') ?? false
})

const pillLabel = computed(() => {
  if (!props.card) return ''
  const count = props.card.attempts?.length || 0
  if (count > 1) {
    return hasAnyComment.value ? `${count} attempts + note` : `${count} attempts`
  }
  return 'Note'
})

function formatPreviewDate(d) {
  if (!d) return ''
  try {
    const raw = String(d).split('T')[0]
    const parts = raw.split('-')
    if (parts.length === 3) {
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return raw
  } catch (e) {
    return String(d)
  }
}

const formattedAttempts = computed(() => {
  if (!props.card?.attempts) return []
  const list = props.card.attempts
  const total = list.length
  const policy = String(props.card.retestPolicy || 'highest').trim().toLowerCase()

  const validScores = list
    .map(a => a.pointsEarned != null ? a.pointsEarned : (a.score != null ? a.score : a.points))
    .filter(s => s != null && !isNaN(Number(s)))
    .map(Number)

  const maxScore = validScores.length > 0 ? Math.max(...validScores) : null

  return list.map((att, idx) => {
    const pts = att.pointsEarned != null ? att.pointsEarned : (att.score != null ? att.score : att.points)
    const numPts = pts != null && !isNaN(Number(pts)) ? Number(pts) : null

    let isCounting = false
    if (total <= 1) {
      isCounting = true
    } else if (policy === 'average') {
      isCounting = true
    } else if (policy === 'manual') {
      const hasPrimary = list.some(a => a.isPrimary)
      isCounting = hasPrimary ? Boolean(att.isPrimary) : (idx === total - 1)
    } else if (policy === 'latest') {
      isCounting = (idx === total - 1)
    } else {
      // highest policy
      isCounting = (numPts != null && numPts === maxScore)
    }

    return {
      attemptId: att.attemptId || idx,
      pointsEarned: numPts,
      comment: att.comment,
      formattedDate: formatPreviewDate(att.date),
      isCounting
    }
  })
})
</script>

<style scoped>
.attempt-hover-card {
  position: fixed;
  z-index: 9999;
  width: 290px;
  max-width: 90vw;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.16), 0 4px 10px -2px rgba(0, 0, 0, 0.08);
  padding: 10px 12px;
  pointer-events: none;
  font-family: inherit;
  color: var(--text, #1e293b);
  animation: fadeInCard 0.14s ease-out;
}

@keyframes fadeInCard {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.attempt-hover-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border, #f1f5f9);
}

.attempt-hover-card__meta {
  min-width: 0;
  flex: 1;
}

.attempt-hover-card__student {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text, #0f172a);
  line-height: 1.2;
}

.attempt-hover-card__assessment {
  font-size: 0.72rem;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.attempt-hover-card__points {
  font-weight: 600;
}

.attempt-hover-card__pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
}

.attempt-hover-card__pill--attempts {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.attempt-hover-card__pill--note {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.attempt-hover-card__pill--attempts-note {
  background: rgba(79, 70, 229, 0.12);
  color: #4f46e5;
  border: 1px solid rgba(79, 70, 229, 0.25);
}

.attempt-hover-card__policy {
  font-size: 0.68rem;
  color: var(--text-secondary, #64748b);
  margin-bottom: 6px;
  font-style: italic;
}

.attempt-hover-card__policy-val {
  font-weight: 700;
  text-transform: capitalize;
  color: var(--text, #334155);
}

.attempt-hover-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.attempt-hover-card__row {
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.72rem;
}

.attempt-hover-card__row--counting {
  border-color: rgba(37, 99, 235, 0.35);
  background: rgba(59, 130, 246, 0.04);
}

.attempt-hover-card__row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.attempt-hover-card__attempt-name {
  font-weight: 700;
  color: var(--text, #334155);
}

.attempt-hover-card__row-scores {
  display: flex;
  align-items: center;
  gap: 4px;
}

.attempt-hover-card__score-val {
  font-weight: 700;
  color: var(--text, #0f172a);
}

.attempt-hover-card__pct-val {
  color: var(--text-secondary, #64748b);
  font-size: 0.68rem;
}

.attempt-hover-card__counting-tag {
  font-size: 0.62rem;
  font-weight: 700;
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
  padding: 1px 4px;
  border-radius: 4px;
  margin-left: 2px;
}

.attempt-hover-card__date {
  font-size: 0.65rem;
  color: var(--text-secondary, #94a3b8);
  margin-left: auto;
}

.attempt-hover-card__note {
  margin-top: 5px;
  padding: 4px 6px;
  background: rgba(245, 158, 11, 0.08);
  border-left: 2.5px solid #f59e0b;
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.attempt-hover-card__note-icon {
  color: #d97706;
  flex-shrink: 0;
  margin-top: 1px;
}

.attempt-hover-card__note-text {
  font-size: 0.7rem;
  line-height: 1.35;
  color: var(--text, #1e293b);
  word-break: break-word;
}

.attempt-hover-card__footer {
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px solid var(--border, #f1f5f9);
  text-align: center;
}

.attempt-hover-card__tip {
  font-size: 0.62rem;
  color: var(--text-secondary, #94a3b8);
}
</style>
