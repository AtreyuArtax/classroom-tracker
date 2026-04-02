<template>
  <BaseModal
    :show="modelValue"
    @close="close"
    max-width="1100px"
    :show-x="false"
  >
    <div class="spm-container">
      <Student360 
        :student-id="studentId" 
        :class-id="classId"
        @close="close"
      />
    </div>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'
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
.spm-container {
  height: min(850px, 92vh);
  margin: -1.5rem; /* Negate BaseModal body padding to let 360 fill the card */
}
</style>
