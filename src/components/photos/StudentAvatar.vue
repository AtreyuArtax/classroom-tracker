<template>
  <div 
    class="student-avatar"
    :class="[
      `student-avatar--${size}`,
      `student-avatar--${shape}`,
      { 'student-avatar--interactive': interactive || allowUpload }
    ]"
    :style="avatarStyle"
    :title="tooltipText"
    @click="handleClick"
  >
    <img 
      v-if="photoUrl" 
      :src="photoUrl" 
      :alt="`${firstName} ${lastName}`"
      class="student-avatar__img" 
      loading="lazy"
    />
    <span v-else class="student-avatar__initials">
      {{ initials }}
    </span>

    <!-- Hover Camera Overlay if upload/edit is allowed -->
    <div v-if="allowUpload" class="student-avatar__overlay">
      <Camera :size="cameraIconSize" class="student-avatar__camera-icon" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { Camera } from 'lucide-vue-next'
import { useStudentPhotos } from '../../composables/useStudentPhotos.js'

const props = defineProps({
  studentId: { type: [String, Number], default: '' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  size: { 
    type: String, 
    default: 'md', // 'xs' (22px), 'sm' (28px), 'desk' (36px), 'md' (48px), 'lg' (72px), 'xl' (96px)
    validator: v => ['xs', 'sm', 'desk', 'md', 'lg', 'xl'].includes(v)
  },
  shape: { 
    type: String, 
    default: 'circle', // 'circle' | 'rounded' | 'square'
    validator: v => ['circle', 'rounded', 'square'].includes(v)
  },
  allowUpload: { type: Boolean, default: false },
  interactive: { type: Boolean, default: false },
  showTooltip: { type: Boolean, default: false }
})

const emit = defineEmits(['click', 'edit-photo'])

const { getPhotoUrl, initPhotoIds } = useStudentPhotos()

onMounted(() => {
  initPhotoIds()
})

const photoUrl = computed(() => {
  return getPhotoUrl(props.studentId)
})

const initials = computed(() => {
  const f = props.firstName ? props.firstName[0] : ''
  const l = props.lastName ? props.lastName[0] : ''
  return (f + l).toUpperCase() || '?'
})

// Clean, unified neutral aesthetic for initial placeholder avatars
const avatarStyle = computed(() => {
  if (photoUrl.value) return {}
  return {
    backgroundColor: 'var(--bg-secondary, #e2e8f0)',
    color: 'var(--text-secondary, #475569)',
    border: '1px solid var(--border, #cbd5e1)'
  }
})

const cameraIconSize = computed(() => {
  if (props.size === 'xl' || props.size === 'lg') return 24
  if (props.size === 'md') return 18
  return 13
})

const tooltipText = computed(() => {
  if (!props.showTooltip) return ''
  const full = `${props.firstName} ${props.lastName}`.trim()
  return props.studentId ? `${full} (#${props.studentId})` : full
})

function handleClick(e) {
  if (props.allowUpload) {
    emit('edit-photo', { studentId: props.studentId, firstName: props.firstName, lastName: props.lastName })
  } else if (props.interactive) {
    emit('click', e)
  }
}
</script>

<style scoped>
.student-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  user-select: none;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.student-avatar--circle {
  border-radius: 9999px;
}

.student-avatar--rounded {
  border-radius: 6px;
}

.student-avatar--square {
  border-radius: 2px;
}

/* Size Variants */
.student-avatar--xs {
  width: 22px;
  height: 22px;
  font-size: 0.65rem;
}

.student-avatar--sm {
  width: 28px;
  height: 28px;
  font-size: 0.72rem;
}

.student-avatar--desk {
  width: 48px;
  height: 48px;
  font-size: 0.85rem;
}

.student-avatar--md {
  width: 48px;
  height: 48px;
  font-size: 1rem;
}

.student-avatar--lg {
  width: 72px;
  height: 72px;
  font-size: 1.4rem;
}

.student-avatar--xl {
  width: 96px;
  height: 96px;
  font-size: 1.8rem;
}

.student-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.student-avatar__initials {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.student-avatar--interactive {
  cursor: pointer;
}

.student-avatar__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease-in-out;
  cursor: pointer;
}

.student-avatar:hover .student-avatar__overlay {
  opacity: 1;
}
</style>
