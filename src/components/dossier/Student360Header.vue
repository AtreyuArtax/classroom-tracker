<template>
  <header class="dossier-header">
    <div class="dossier-header__identity">
      <StudentAvatar 
        :student-id="student.studentId" 
        :first-name="student.firstName" 
        :last-name="student.lastName" 
        size="desk" 
        shape="circle"
        :allow-upload="true"
        @edit-photo="onAvatarClick"
        :title="hasCurrentPhoto ? 'Click to view or manage student photo' : 'Click to add student photo'"
        class="dossier-header__avatar"
      />
      <div class="dossier-header__info">
        <h1 class="dossier-header__name">{{ student.firstName }} {{ student.lastName }}</h1>
        <div class="dossier-header__status-badges">
          <span 
            v-if="student.gradeLevel" 
            class="dossier-header__badge dossier-header__badge--grade"
            title="Student Grade Level"
          >
            <GraduationCap :size="11" />
            {{ student.gradeLevel }}
          </span>
          <span 
            v-if="statusLabel" 
            class="dossier-header__badge" 
            :class="[`dossier-header__badge--${statusType}`]"
          >
            <component :is="statusIcon" :size="11" />
            {{ statusLabel }}
          </span>
          <span 
            v-if="attendanceStats?.testDayAbsences > 0" 
            class="dossier-header__badge dossier-header__badge--warning"
            :title="`Student missed ${attendanceStats.testDayAbsences} test/evaluation day${attendanceStats.testDayAbsences > 1 ? 's' : ''}`"
          >
            <CalendarX :size="11" />
            {{ attendanceStats.testDayAbsences }} Missed Test{{ attendanceStats.testDayAbsences > 1 ? 's' : '' }}
          </span>
        </div>
      </div>
    </div>

    <div class="dossier-header__right">
      <div class="dossier-header__metrics">
        <!-- Main Grade / Mastery Pill -->
        <div 
          class="dossier-header__pill dossier-header__pill--main"
          :class="{ 'dossier-header__pill--clickable': isSBAR }"
          @click="isSBAR && toggleShowPct()"
          :title="isSBAR ? `Click to toggle calculated percentage mark (${formattedGrade} for Grade 7-12 report cards)` : ''"
        >
          <span class="dossier-header__pill-label">{{ isSBAR ? 'Overall Mastery' : 'Grade' }}</span>
          <span class="dossier-header__pill-val" :style="{ color: isSBAR ? sbarBadge.color : gradeColor }">
            <template v-if="isSBAR">
              <template v-if="showPctInHeader && overallGrade !== null">
                {{ sbarBadge.level }} <span class="dossier-header__pct-sub">({{ formattedGrade }})</span>
              </template>
              <template v-else>
                {{ sbarBadge.level }}
              </template>
            </template>
            <template v-else>
              {{ formattedGrade }}
            </template>
          </span>
        </div>

        <!-- Consistent Pill (Secondary) -->
        <div v-if="!isSBAR && mostConsistent !== null" class="dossier-header__pill dossier-header__pill--secondary">
          <span class="dossier-header__pill-label">Consistent</span>
          <span class="dossier-header__pill-val dossier-header__pill-val--sm">
            {{ Math.round(mostConsistent) }}%
            <span v-if="consistentIsFallback" class="dossier-header__metric-tip" title="Standard median used due to low data density">
              <HelpCircle :size="12" />
            </span>
          </span>
        </div>

        <!-- Median Pill (Secondary) -->
        <div v-if="!isSBAR && weightedMedian !== null" class="dossier-header__pill dossier-header__pill--secondary">
          <span class="dossier-header__pill-label">Median</span>
          <span class="dossier-header__pill-val dossier-header__pill-val--sm">
            {{ Math.round(weightedMedian) }}%
          </span>
        </div>

        <!-- Attendance Pill -->
        <div class="dossier-header__pill dossier-header__pill--attendance">
          <span class="dossier-header__pill-label">Attendance</span>
          <span 
            class="dossier-header__pill-val"
            :style="{ color: attendanceRate === 100 ? '#34c759' : attendanceRate !== null && attendanceRate < 80 ? '#ff9500' : 'var(--text)' }"
          >
            {{ attendanceRate === null ? '--' : attendanceRate === 100 ? '100%' : attendanceRate + '%' }}
          </span>
          <span class="dossier-header__pill-sub">
            {{ attendanceStats.absences }}A &middot; {{ attendanceStats.lates }}L
          </span>
        </div>
      </div>
      
      <div class="dossier-header__actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Student Photo Capture / Upload Modal -->
    <PhotoCaptureModal
      v-if="showPhotoModal"
      :show="showPhotoModal"
      :student="student"
      @close="showPhotoModal = false"
    />

    <!-- Student Photo Full-Size Lightbox Modal -->
    <BaseModal
      :show="showLightboxModal"
      :title="`${student.firstName} ${student.lastName}`"
      max-width="420px"
      @close="showLightboxModal = false"
    >
      <div class="photo-lightbox">
        <div class="photo-lightbox__img-wrap">
          <img 
            :src="currentPhotoUrl" 
            :alt="`${student.firstName} ${student.lastName}`" 
            class="photo-lightbox__img"
          />
        </div>

        <div class="photo-lightbox__meta">
          <div class="photo-lightbox__name">{{ student.firstName }} {{ student.lastName }}</div>
          <div v-if="student.studentId" class="photo-lightbox__id">Student ID: #{{ student.studentId }}</div>
          <div v-if="student.gradeLevel" class="photo-lightbox__grade">Grade: {{ student.gradeLevel }}</div>
        </div>

        <div class="photo-lightbox__actions">
          <button 
            type="button" 
            class="photo-lightbox__btn photo-lightbox__btn--primary"
            @click="openRetakeModal"
          >
            <Camera :size="16" />
            Change / Retake Photo
          </button>
          <button 
            type="button" 
            class="photo-lightbox__btn photo-lightbox__btn--danger"
            @click="handleDeletePhoto"
          >
            <Trash2 :size="16" />
            Remove Photo
          </button>
        </div>
      </div>
    </BaseModal>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UserCheck, UserMinus, Clock, Toilet, X, HelpCircle, CalendarX, GraduationCap, Camera, Trash2 } from 'lucide-vue-next'
import { activeClassRecord } from '../../composables/useGradebook.js'
import { getSBARLevelBadge } from '../../db/gradebook/gradeCalcSBAR.js'
import { useStudentPhotos } from '../../composables/useStudentPhotos.js'
import { useMessage } from '../../composables/useMessage.js'
import StudentAvatar from '../photos/StudentAvatar.vue'
import PhotoCaptureModal from '../photos/PhotoCaptureModal.vue'
import BaseModal from '../BaseModal.vue'

const showPhotoModal = ref(false)
const showLightboxModal = ref(false)

const { getPhotoUrl, deleteStudentPhoto } = useStudentPhotos()
const { confirm } = useMessage()

const props = defineProps({
  student: { type: Object, required: true },
  overallGrade: { type: Number, default: null },
  mostConsistent: { type: Number, default: null },
  consistentIsFallback: { type: Boolean, default: false },
  weightedMedian: { type: Number, default: null },
  attendanceStats: { type: Object, default: () => ({ absences: 0, lates: 0, testDayAbsences: 0 }) },
  attendanceRate:  { type: Number, default: null }
})

const currentPhotoUrl = computed(() => {
  const sId = props.student?.studentId
  return sId ? getPhotoUrl(sId) : null
})

const hasCurrentPhoto = computed(() => {
  return Boolean(currentPhotoUrl.value)
})

function onAvatarClick() {
  if (hasCurrentPhoto.value) {
    showLightboxModal.value = true
  } else {
    showPhotoModal.value = true
  }
}

function openRetakeModal() {
  showLightboxModal.value = false
  showPhotoModal.value = true
}

async function handleDeletePhoto() {
  const sId = props.student?.studentId
  if (!sId) return
  
  const ok = await confirm({
    title: 'Remove Student Photo',
    message: `Are you sure you want to remove the photo for ${props.student.firstName} ${props.student.lastName}?`,
    confirmText: 'Remove Photo',
    confirmVariant: 'danger'
  })

  if (ok) {
    await deleteStudentPhoto(sId)
    showLightboxModal.value = false
  }
}

const isSBAR = computed(() => activeClassRecord.value?.gradingFramework === 'sbar')

const showPctInHeader = ref(false)
function toggleShowPct() {
  showPctInHeader.value = !showPctInHeader.value
}

const initials = computed(() => {
  return `${props.student.firstName?.[0] || ''}${props.student.lastName?.[0] || ''}`.toUpperCase()
})

const sbarBadge = computed(() => {
  if (props.overallGrade === null) return { level: '—', color: 'var(--text-secondary)' }
  return getSBARLevelBadge(props.overallGrade)
})

const formattedGrade = computed(() => {
  if (props.overallGrade === null) return '--'
  return `${Math.round(props.overallGrade)}%`
})

const gradeColor = computed(() => {
  const g = props.overallGrade
  if (g === null) return 'var(--text-secondary)'
  if (g >= 80) return '#34c759'
  if (g >= 70) return '#30b0c7'
  if (g >= 60) return '#ff9500'
  return '#ff3b30'
})

// attendanceSummary is no longer needed — the template renders rate and raw counts separately.

const statusLabel = computed(() => {
  const s = props.student.activeStates
  if (s?.isAbsent) return 'Absent'
  if (s?.isLate || (s?.lateMs !== null && s?.lateMs !== undefined)) return 'Late'
  if (s?.isOut) return 'Out'
  return 'Present'
})

const statusType = computed(() => {
  const s = props.student.activeStates
  if (s?.isAbsent) return 'danger'
  if (s?.isLate || (s?.lateMs !== null && s?.lateMs !== undefined)) return 'warning'
  if (s?.isOut) return 'warning'
  return 'success'
})

const statusIcon = computed(() => {
  const s = props.student.activeStates
  if (s?.isAbsent) return UserMinus
  if (s?.isLate || (s?.lateMs !== null && s?.lateMs !== undefined)) return Clock
  if (s?.isOut) return Toilet
  return UserCheck
})
</script>

<style scoped>
.dossier-header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         6px 16px;
  background:      var(--surface);
  border-bottom:   1px solid var(--border);
  gap:             12px;
  min-height:      48px;
}

@media (max-width: 1280px) {
  .dossier-header {
    padding: 6px 12px;
    gap: 10px;
  }
}

@media (max-width: 900px) {
  .dossier-header {
    padding: 6px 10px;
    gap: 8px;
  }
}

.dossier-header__identity {
  display:     flex;
  align-items: center;
  gap:         10px;
  min-width:   0;
  flex:        0 1 auto;
}

.dossier-header__avatar {
  flex-shrink: 0;
  width: 34px !important;
  height: 34px !important;
  font-size: 0.82rem !important;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.dossier-header__avatar:hover {
  transform: scale(1.05);
}

.dossier-header__info {
  display:        flex;
  flex-direction: column;
  justify-content: center;
  gap:            2px;
  min-width:      0;
}

.dossier-header__name {
  margin:         0;
  font-size:      1.15rem;
  font-weight:    800;
  color:          var(--text);
  line-height:    1.15;
  white-space:    nowrap;
  overflow:       hidden;
  text-overflow:  ellipsis;
  letter-spacing: -0.01em;
}

@media (max-width: 1280px) {
  .dossier-header__name { font-size: 1.05rem; }
}

@media (max-width: 1024px) {
  .dossier-header__name { font-size: 1rem; }
}

.dossier-header__status-badges {
  display:     flex;
  align-items: center;
  gap:         4px;
  flex-wrap:   wrap;
}

.dossier-header__badge {
  display:        inline-flex;
  align-items:    center;
  gap:            3px;
  padding:        1px 6px;
  border-radius:  var(--radius-sm);
  font-size:      0.65rem;
  font-weight:    700;
  text-transform: uppercase;
  white-space:    nowrap;
  flex-shrink:    0;
  line-height:    1.2;
}

.dossier-header__badge--success { background: rgba(52, 199, 89, 0.1); color: #34c759; }
.dossier-header__badge--warning { background: rgba(255, 149, 0, 0.1); color: #ff9500; }
.dossier-header__badge--danger  { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
.dossier-header__badge--grade   { background: rgba(99, 102, 241, 0.12); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.25); }

.dossier-header__right {
  display:      flex;
  align-items:  center;
  gap:          12px;
  flex-shrink:  0;
}

@media (max-width: 1280px) {
  .dossier-header__right { gap: 8px; }
}

.dossier-header__metrics {
  display:     flex;
  align-items: center;
  gap:         6px;
}

/* Metric Pills */
.dossier-header__pill {
  display:         inline-flex;
  align-items:     center;
  gap:             6px;
  padding:         4px 10px;
  background:      var(--bg-secondary);
  border:          1px solid var(--border);
  border-radius:   var(--radius-md);
  height:          32px;
  box-sizing:      border-box;
}

.dossier-header__pill--main {
  background:   rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.22);
}

.dossier-header__pill--attendance {
  background: var(--surface);
}

.dossier-header__pill-label {
  font-size:      0.68rem;
  font-weight:    700;
  color:          var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dossier-header__pill-val {
  font-size:   1rem;
  font-weight: 800;
  color:       var(--text);
  line-height: 1;
}

.dossier-header__pill-val--sm {
  font-size: 0.88rem;
}

.dossier-header__pill-sub {
  font-size:      0.72rem;
  font-weight:    700;
  color:          var(--text-secondary);
  letter-spacing: 0.02em;
  margin-left:    2px;
  border-left:    1px solid var(--border);
  padding-left:   6px;
}

.dossier-header__pill--clickable {
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}

.dossier-header__pill--clickable:hover {
  filter: brightness(0.95);
  border-color: var(--primary);
}

.dossier-header__pct-sub {
  font-size: 0.8em;
  font-weight: 500;
  opacity: 0.85;
}

.dossier-header__metric-tip {
  display: inline-flex;
  margin-left: 2px;
  opacity: 0.6;
  color: var(--text-secondary);
  cursor: help;
  vertical-align: middle;
}

.dossier-header__actions {
  display:        flex;
  align-items:    center;
  gap:            6px;
  border-left:    1px solid var(--border);
  padding-left:   10px;
  margin-left:    4px;
  height:         32px;
}

@media (max-width: 1100px) {
  .dossier-header__pill--secondary { display: none; }
}

@media (max-width: 600px) {
  .dossier-header {
    flex-direction: column;
    align-items:    flex-start;
    padding: 10px;
    gap: 10px;
  }
}

/* ── Photo Lightbox Modal Styles ─────────────────────────────────────────── */
.photo-lightbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 10px 4px 6px;
}

.photo-lightbox__img-wrap {
  width: 240px;
  height: 240px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border);
  background: var(--surface-hover, #f1f5f9);
}

.photo-lightbox__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-lightbox__meta {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.photo-lightbox__name {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text);
}

.photo-lightbox__id,
.photo-lightbox__grade {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.photo-lightbox__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

.photo-lightbox__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.photo-lightbox__btn--primary {
  background: var(--primary, #3b82f6);
  color: white;
}

.photo-lightbox__btn--primary:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.photo-lightbox__btn--danger {
  background: transparent;
  color: var(--danger, #ef4444);
  border-color: rgba(239, 68, 68, 0.25);
}

.photo-lightbox__btn--danger:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: var(--danger, #ef4444);
}
</style>
