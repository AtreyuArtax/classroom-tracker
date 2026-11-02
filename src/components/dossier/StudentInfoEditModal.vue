<template>
  <BaseModal
    :show="show"
    :title="`Edit Getting to Know You — ${student.firstName} ${student.lastName}`"
    max-width="640px"
    @close="emit('close')"
  >
    <div class="siem-container">
      <div class="siem-grid">
        <!-- 1. Preferred Name -->
        <div class="form-group siem-full">
          <label for="siem-preferred-name" class="siem-label">Preferred Name / Nickname</label>
          <input
            id="siem-preferred-name"
            type="text"
            v-model="form.preferredName"
            placeholder="e.g. Alex (if different from roster name)"
            class="siem-input"
          />
        </div>

        <!-- 2. Pronouns (Multiple Select) -->
        <div class="form-group siem-full">
          <label class="siem-label">
            <span>Pronouns</span>
            <span class="siem-hint">Select all that apply</span>
          </label>
          <div class="siem-pill-group" role="group" aria-label="Pronouns">
            <label
              v-for="opt in standardPronounOptions"
              :key="opt"
              class="siem-check-pill"
              :class="{ 'siem-check-pill--active': selectedPronouns.includes(opt) }"
            >
              <input
                type="checkbox"
                class="siem-check-input"
                :checked="selectedPronouns.includes(opt)"
                @change="togglePronoun(opt)"
              />
              <span>{{ opt }}</span>
            </label>
            <label
              class="siem-check-pill"
              :class="{ 'siem-check-pill--active': hasOtherPronoun }"
            >
              <input
                type="checkbox"
                class="siem-check-input"
                v-model="hasOtherPronoun"
              />
              <span>Other</span>
            </label>
          </div>
          <input
            v-if="hasOtherPronoun"
            id="siem-custom-pronouns"
            type="text"
            v-model="customPronouns"
            aria-label="Specify custom pronouns"
            placeholder="Specify custom pronouns..."
            class="siem-input siem-input--sub"
          />
        </div>

        <!-- 3. Parent Communication Boundary -->
        <div class="form-group siem-full">
          <label for="siem-parent-comms" class="siem-label">
            <span>Parent / Home Communication Boundary</span>
            <span class="siem-hint">Protects student safety when contacting home</span>
          </label>
          <select id="siem-parent-comms" v-model="form.parentCommunication" class="siem-select">
            <option value="">-- No preference recorded --</option>
            <option value="Yes, in class and when contacting home">Yes, in class and when contacting home</option>
            <option value="Only in the classroom (Please use my official roster name/pronouns when contacting home)">
              Only in the classroom (Use official roster name/pronouns when contacting home)
            </option>
            <option value="Let's talk about it privately first">
              Let's talk about it privately first
            </option>
          </select>
        </div>

        <!-- 4. Seating Preference (Single Select) -->
        <div class="form-group">
          <label for="siem-seating" class="siem-label">Seating Location Need</label>
          <select id="siem-seating" v-model="form.seatingPreference" class="siem-select">
            <option value="">-- Select preference --</option>
            <option
              v-if="form.seatingPreference && !standardSeatingOptions.includes(form.seatingPreference)"
              :value="form.seatingPreference"
            >
              {{ form.seatingPreference }}
            </option>
            <option value="Near the front (easier to see the board, hear clearly, and stay locked in)">
              Near the front (Board / audio focus)
            </option>
            <option value="Middle of the room">
              Middle of the room
            </option>
            <option value="Towards the back or outer edge (I focus better when I'm not surrounded on all sides)">
              Towards the back or outer edge
            </option>
            <option value="Away from the door / high-traffic walkways (I get easily distracted by movement)">
              Away from the door / high-traffic walkways
            </option>
            <option value="No preference — I can focus well anywhere">
              No preference — Focuses well anywhere
            </option>
          </select>
        </div>

        <!-- 5. Target Grade / Goal -->
        <div class="form-group">
          <label for="siem-target-grade" class="siem-label">Target Grade / Course Goal</label>
          <select id="siem-target-grade" v-model="form.targetGrade" class="siem-select">
            <option value="">-- Select goal --</option>
            <option value="90% – 100% (Level 4+ / Aiming for top marks)">90% – 100% (Level 4+ / Top Marks)</option>
            <option value="80% – 89% (Level 4 / Strong mastery)">80% – 89% (Level 4 / Strong Mastery)</option>
            <option value="70% – 79% (Level 3 / Solid provincial standard)">70% – 79% (Level 3 / Standard)</option>
            <option value="60% – 69% (Level 2 / Basic understanding)">60% – 69% (Level 2 / Basic)</option>
            <option value="50% – 59% (Level 1 / Passing & earning the credit)">50% – 59% (Level 1 / Pass)</option>
            <option value="Just looking to build confidence and improve from last year">Build Confidence / Improve</option>
          </select>
        </div>

        <!-- 6. Course Confidence Rating -->
        <div class="form-group siem-full">
          <label class="siem-label">Course Confidence (1 to 5)</label>
          <div class="siem-meter-row">
            <div class="siem-meter-selector" role="group" aria-label="Course confidence rating from 1 to 5">
              <button
                v-for="lvl in [1, 2, 3, 4, 5]"
                :key="lvl"
                type="button"
                class="siem-meter-btn"
                :class="{ 
                  'siem-meter-btn--active': form.courseConfidence >= lvl,
                  [`siem-meter-btn--lvl-${form.courseConfidence}`]: form.courseConfidence >= lvl 
                }"
                @click="form.courseConfidence = lvl"
                :title="`Level ${lvl} of 5`"
              >
                <span class="siem-meter-num">{{ lvl }}</span>
              </button>
            </div>
            <span class="siem-conf-label">{{ getConfidenceDescription(form.courseConfidence) }}</span>
          </div>
        </div>

        <!-- 7. Help-Seeking Behavior (When Stuck) -->
        <div class="form-group siem-full">
          <label for="siem-help-seeking" class="siem-label">
            <span>When Stuck on a Task in Class</span>
            <span class="siem-hint">In-class help-seeking habit</span>
          </label>
          <select id="siem-help-seeking" v-model="form.helpSeekingLabel" class="siem-select">
            <option value="">-- No response recorded --</option>
            <option value="I raise my hand or ask the teacher right away">
              I raise my hand or ask the teacher right away
            </option>
            <option value="I re-read the notes, examples, or instructions to try to figure it out myself">
              I re-read the notes, examples, or instructions to try to figure it out myself
            </option>
            <option value="I ask a classmate sitting near me">
              I ask a classmate sitting near me
            </option>
            <option value="I tend to wait and hope it gets explained later / I hesitate to ask out loud">
              I tend to wait and hope it gets explained later / I hesitate to ask out loud
            </option>
          </select>
        </div>

        <!-- 8. Extracurriculars & Hobbies -->
        <div class="form-group siem-full">
          <label for="siem-hobbies" class="siem-label">Sports, School Clubs, Arts &amp; Hobbies</label>
          <textarea
            id="siem-hobbies"
            v-model="form.extracurricularsHobbies"
            rows="2"
            placeholder="e.g. Varsity Basketball, Robotics club, 3D printing, Guitar..."
            class="siem-textarea"
          ></textarea>
        </div>

        <!-- 9. Curiosities & Real-World Topics -->
        <div class="form-group siem-full">
          <label for="siem-curiosities" class="siem-label">
            <span>Real-World Topics, Fields &amp; Technologies of Interest</span>
            <span class="siem-hint">Authentic contexts across subjects</span>
          </label>
          <textarea
            id="siem-curiosities"
            v-model="form.curiosities"
            rows="2"
            placeholder="e.g. Athletics/biomechanics, gaming/coding, medicine/health, mechanics/cars, climate/energy..."
            class="siem-textarea"
          ></textarea>
        </div>

        <!-- 10. Confidential Note for Teacher -->
        <div class="form-group siem-full">
          <label for="siem-confidential-note" class="siem-label">
            <span>Confidential Note to Teacher</span>
            <span class="siem-hint">Part-time jobs, anxiety triggers, personal context</span>
          </label>
          <textarea
            id="siem-confidential-note"
            v-model="form.confidentialNote"
            rows="2"
            placeholder="e.g. Works evening shifts on Wednesdays, prefers quiet test space..."
            class="siem-textarea"
          ></textarea>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="siem-footer">
        <button type="button" class="siem-btn siem-btn--ghost" @click="emit('close')">
          Cancel
        </button>
        <button
          type="button"
          class="siem-btn siem-btn--primary"
          :disabled="isSaving"
          @click="saveSurvey"
        >
          {{ isSaving ? 'Saving...' : 'Save Survey Information' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseModal from '../BaseModal.vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { normalizeHelpSeeking } from '../../utils/studentInfoCsvParser.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  student: { type: Object, required: true }
})

const emit = defineEmits(['close', 'saved'])

const { updateStudentIntakeSurvey } = useClassroom()
const isSaving = ref(false)
const customPronouns = ref('')
const hasOtherPronoun = ref(false)
const selectedPronouns = ref([])

const standardPronounOptions = [
  'He / Him',
  'She / Her',
  'They / Them',
  'Prefer to share privately'
]

const standardSeatingOptions = [
  'Near the front (easier to see the board, hear clearly, and stay locked in)',
  'Middle of the room',
  "Towards the back or outer edge (I focus better when I'm not surrounded on all sides)",
  'Away from the door / high-traffic walkways (I get easily distracted by movement)',
  'No preference — I can focus well anywhere'
]

const form = ref({
  preferredName: '',
  pronouns: '',
  parentCommunication: '',
  seatingPreference: '',
  targetGrade: '',
  courseConfidence: null,
  helpSeekingLabel: '',
  extracurricularsHobbies: '',
  curiosities: '',
  confidentialNote: ''
})

function togglePronoun(opt) {
  const idx = selectedPronouns.value.indexOf(opt)
  if (idx >= 0) {
    selectedPronouns.value.splice(idx, 1)
  } else {
    selectedPronouns.value.push(opt)
  }
}

function initForm() {
  const existing = props.student?.intakeSurvey || {}
  const rawPronouns = existing.pronouns !== undefined ? existing.pronouns : (props.student?.pronouns || '')
  
  const pronounParts = String(rawPronouns)
    .split(/[,;]/)
    .map(p => p.trim())
    .filter(Boolean)

  const matchedStandardPronouns = []
  const customParts = []
  for (const part of pronounParts) {
    if (standardPronounOptions.includes(part)) {
      matchedStandardPronouns.push(part)
    } else {
      customParts.push(part)
    }
  }
  selectedPronouns.value = matchedStandardPronouns
  hasOtherPronoun.value = customParts.length > 0
  customPronouns.value = customParts.join(', ')

  const resolvedPrefName = existing.preferredName !== undefined 
    ? existing.preferredName 
    : (props.student?.preferredName || '')

  form.value = {
    preferredName: resolvedPrefName,
    pronouns: rawPronouns,
    parentCommunication: existing.parentCommunication || '',
    seatingPreference: existing.seatingPreference || '',
    targetGrade: existing.targetGrade || '',
    courseConfidence: existing.courseConfidence || null,
    helpSeekingLabel: existing.helpSeekingLabel || '',
    extracurricularsHobbies: existing.extracurricularsHobbies || '',
    curiosities: existing.curiosities || '',
    confidentialNote: existing.confidentialNote || ''
  }
}

watch(() => props.show, (isOpen) => {
  if (isOpen) initForm()
}, { immediate: true })

function getConfidenceDescription(val) {
  if (!val) return 'Not rated'
  if (val === 1) return '1 - Very nervous / Need a lot of support'
  if (val === 2) return '2 - A bit unsure / Struggled in past'
  if (val === 3) return '3 - Okay / In the middle'
  if (val === 4) return '4 - Fairly confident / Ready to learn'
  if (val === 5) return '5 - Very confident / Love this subject'
  return `${val}/5`
}

async function saveSurvey() {
  if (!props.student?.studentId) return
  isSaving.value = true
  try {
    const pronounList = [...selectedPronouns.value]
    if (hasOtherPronoun.value && customPronouns.value.trim()) {
      pronounList.push(customPronouns.value.trim())
    }
    const finalPronouns = pronounList.join(', ')
    const trimmedPreferredName = form.value.preferredName ? form.value.preferredName.trim() : ''
    const helpObj = normalizeHelpSeeking(form.value.helpSeekingLabel)

    const payload = {
      ...form.value,
      preferredName: trimmedPreferredName,
      pronouns: finalPronouns,
      helpSeeking: helpObj.code,
      helpSeekingLabel: helpObj.label,
      isSilentStruggler: helpObj.isSilentStruggler,
      completedAt: props.student?.intakeSurvey?.completedAt || new Date().toISOString()
    }

    await updateStudentIntakeSurvey(props.student.studentId, payload)
    emit('saved', payload)
    emit('close')
  } catch (err) {
    console.error('Failed to save survey:', err)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.siem-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.siem-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.siem-full {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.siem-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.siem-hint {
  font-size: 0.75rem;
  font-weight: normal;
  color: var(--text-secondary);
}

.siem-input,
.siem-select,
.siem-textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.15s ease;
}

.siem-input:focus-visible,
.siem-select:focus-visible,
.siem-textarea:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
  border-color: var(--primary);
}

.siem-input--sub {
  margin-top: 6px;
}

.siem-textarea {
  resize: vertical;
  min-height: 54px;
}

/* Multi-select Checkbox Pills */
.siem-pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.siem-check-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}

.siem-check-pill:hover:not(.siem-check-pill--disabled) {
  border-color: var(--primary);
}

.siem-check-pill--active {
  background: rgba(59, 130, 246, 0.12);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.siem-check-pill--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.siem-check-input {
  margin: 0;
  accent-color: var(--primary);
  cursor: inherit;
}

/* Stars Rating */
.siem-meter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.siem-meter-selector {
  display: inline-flex;
  gap: 5px;
  background: var(--bg-secondary);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.siem-meter-btn {
  width: 36px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: var(--surface);
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.siem-meter-btn:hover {
  transform: translateY(-1px);
  color: var(--text);
  background: var(--bg-surface-elevated, rgba(255, 255, 255, 0.1));
}

.siem-meter-btn--active.siem-meter-btn--lvl-1 { background: #ff3b30; color: #ffffff; }
.siem-meter-btn--active.siem-meter-btn--lvl-2 { background: #ff9500; color: #ffffff; }
.siem-meter-btn--active.siem-meter-btn--lvl-3 { background: #ffd60a; color: #000000; }
.siem-meter-btn--active.siem-meter-btn--lvl-4 { background: #30b0c7; color: #ffffff; }
.siem-meter-btn--active.siem-meter-btn--lvl-5 { background: #34c759; color: #ffffff; }

.siem-conf-label {
  font-size: 0.825rem;
  color: var(--text);
  font-weight: 600;
}

/* Footer */
.siem-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}

.siem-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-sm, 8px);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 38px;
  transition: all 0.15s ease;
}

.siem-btn--primary {
  background: var(--primary);
  color: #ffffff;
  border: none;
}

.siem-btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.siem-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.siem-btn--ghost {
  background: transparent;
  border: none;
  color: var(--text-secondary);
}

.siem-btn--ghost:hover {
  color: var(--text);
}
</style>
