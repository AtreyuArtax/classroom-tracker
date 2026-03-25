<template>
  <Teleport to="body">
    <Transition name="spm-fade">
      <div
        v-if="modelValue"
        class="spm-overlay"
        @click.self="close"
        role="dialog"
        aria-modal="true"
      >
        <div class="spm-card">
          <Student360 
            :student-id="studentId" 
            :class-id="classId"
            @close="close"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import Student360 from './dossier/Student360.vue'

const props = defineProps({
  studentId:  { type: String,  required: true },
  classId:    { type: String,  required: true },
  modelValue: { type: Boolean, required: true },
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.spm-overlay {
  position:        fixed;
  inset:           0;
  display:         flex;
  align-items:     center;
  justify-content: center;
  background:      rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  z-index:         1050;
}

.spm-card {
  background:     var(--surface);
  border-radius:  var(--radius-xl);
  box-shadow:     var(--shadow-2xl);
  width:          min(1100px, 95vw);
  height:         min(850px, 92vh);
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
  animation:      spm-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes spm-pop-in {
  from { transform: scale(0.95) translateY(20px); opacity: 0; }
  to   { transform: scale(1) translateY(0);    opacity: 1; }
}

.spm-fade-enter-active, .spm-fade-leave-active {
  transition: opacity 0.2s ease;
}
.spm-fade-enter-from, .spm-fade-leave-to {
  opacity: 0;
}
</style>
