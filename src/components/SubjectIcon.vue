<template>
  <component :is="iconComponent" :size="size || 16" class="subject-icon" />
</template>

<script setup>
import { computed } from 'vue'
import { 
  Calculator, 
  BookOpen, 
  FlaskConical, 
  Globe, 
  Palette, 
  Activity, 
  Languages, 
  GraduationCap 
} from 'lucide-vue-next'

const props = defineProps({
  code: String,
  icon: String,
  name: String,
  size: { type: [Number, String], default: 16 }
})

const iconComponent = computed(() => {
  const str = `${props.code || ''} ${props.name || ''} ${props.icon || ''}`.toLowerCase()
  if (str.includes('math') || str.includes('📐') || str.includes('calc')) return Calculator
  if (str.includes('lang') || str.includes('read') || str.includes('📖')) return BookOpen
  if (str.includes('sci') || str.includes('tech') || str.includes('🔬')) return FlaskConical
  if (str.includes('soc') || str.includes('geo') || str.includes('hist') || str.includes('🌍')) return Globe
  if (str.includes('art') || str.includes('music') || str.includes('🎨')) return Palette
  if (str.includes('hpe') || str.includes('health') || str.includes('phys') || str.includes('🏃')) return Activity
  if (str.includes('fsl') || str.includes('french') || str.includes('🇫🇷')) return Languages
  return GraduationCap
})
</script>

<style scoped>
.subject-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
