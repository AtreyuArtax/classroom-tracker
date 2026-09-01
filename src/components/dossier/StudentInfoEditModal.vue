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
        <div class="form-group">
          <label class="siem-label">Preferred Name / Nickname</label>
          <input
            type="text"
            v-model="form.preferredName"
            placeholder="e.g. Alex (if different from roster name)"
            class="siem-input"
          />
        </div>

        <!-- 2. Pronouns -->
        <div class="form-group">
          <label class="siem-label">Pronouns</label>
          <select v-model="form.pronouns" class="siem-select">
            <option value="">-- Select or type below --</option>
            <option value="He / Him">He / Him</option>
            <option value="She / Her">She / Her</option>
            <option value="They / Them">They / Them</option>
            <option value="Prefer to share privately">Prefer to share privately</option>
            <option value="Other">Other</option>
          </select>
          <input
            v-if="form.pronouns === 'Other'"
            type="text"
            v-model="customPronouns"
            placeholder="Specify pronouns..."
            class="siem-input siem-input--sub"
          />
        </div>

        <!-- 3. Parent Communication Boundary -->
        <div class="form-group siem-full">
          <label class="siem-label">
            <span>Parent / Home Communication Boundary</span>
            <span class="siem-hint">Protects student safety when contacting home</span>
          </label>
          <select v-model="form.parentCommunication" class="siem-select">
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

        <!-- 4. Seating Preference -->
        <div class="form-group">
          <label class="siem-label">Seating &amp; Environment Needs</label>
          <select v-model="form.seatingPreference" class="siem-select">
            <option value="">-- Select preference --</option>
            <option value="Front near the board / screen">Front near the board / screen</option>
            <option value="Middle of the room">Middle of the room</option>
            <option value="Near a window / natural light">Near a window / natural light</option>
            <option value="Away from high-traffic doors">Away from high-traffic doors</option>
            <option value="In a quiet corner">In a quiet corner</option>
            <option value="No preference">No preference</option>
          </select>
        </div>

        <!-- 5. Target Grade / Goal -->
        <div class="form-group">
          <label class="siem-label">Target Grade / Course Goal</label>
          <select v-model="form.targetGrade" class="siem-select">
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
            <div class="siem-meter-selector">
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

        <!-- 7. Extracurriculars & Hobbies -->
        <div class="form-group siem-full">
          <label class="siem-label">Sports, School Clubs, Arts &amp; Hobbies</label>
          <textarea
            v-model="form.extracurricularsHobbies"
            rows="2"
            placeholder="e.g. Varsity Basketball, Robotics club, 3D printing, Guitar..."
            class="siem-textarea"
          ></textarea>
        </div>

        <!-- 8. Confidential Note for Teacher -->
        <div class="form-group siem-full">
          <label class="siem-label">
            <span>Confidential Note to Teacher</span>
            <span class="siem-hint">Part-time jobs, anxiety triggers, personal context</span>
          </label>
          <textarea
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

const props = defineProps({
  show: { type: Boolean, default: false },
  student: { type: Object, required: true }
})

const emit = defineEmits(['close', 'saved'])

const { updateStudentIntakeSurvey } = useClassroom()
const isSaving = ref(false)
const customPronouns = ref('')

const form = ref({
  preferredName: '',
  pronouns: '',
  parentCommunication: '',
  seatingPreference: '',
  targetGrade: '',
  courseConfidence: null,
  extracurricularsHobbies: '',
  confidentialNote: ''
})

function initForm() {
  const existing = props.student?.intakeSurvey || {}
  const rawPronouns = existing.pronouns || props.student?.pronouns || ''
  
  const standardPronouns = ['He / Him', 'She / Her', 'They / Them', 'Prefer to share privately', '']
  const isOther = rawPronouns && !standardPronouns.includes(rawPronouns)

  form.value = {
    preferredName: existing.preferredName || props.student?.preferredName || '',
    pronouns: isOther ? 'Other' : rawPronouns,
    parentCommunication: existing.parentCommunication || '',
    seatingPreference: existing.seatingPreference || '',
    targetGrade: existing.targetGrade || '',
    courseConfidence: existing.courseConfidence || null,
    extracurricularsHobbies: existing.extracurricularsHobbies || '',
    confidentialNote: existing.confidentialNote || ''
  }
  customPronouns.value = isOther ? rawPronouns : ''
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
    const finalPronouns = form.value.pronouns === 'Other' ? customPronouns.value.trim() : form.value.pronouns

    const payload = {
      ...form.value,
      pronouns: finalPronouns,
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

.siem-input:focus,
.siem-select:focus,
.siem-textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.siem-input--sub {
  margin-top: 6px;
}

.siem-textarea {
  resize: vertical;
  min-height: 54px;
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
