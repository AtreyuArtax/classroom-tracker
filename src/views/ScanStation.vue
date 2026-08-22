<template>
  <div class="scan-station" @click="focusInput">
    <div class="scan-station__container">
      <div v-if="!configuredUserCode" class="scan-station__setup">
        <h2>Door Scanner Setup</h2>
        <p>Enter the User Code / PIN to connect this station to the Teacher Dashboard:</p>
        <input 
          v-model="tempCode" 
          placeholder="e.g. ROOM-101" 
          class="scan-station__setup-input" 
          @keyup.enter="saveCode" 
        />
        <button class="scan-station__setup-btn" @click="saveCode">Start Station</button>
      </div>
      
      <div v-else class="scan-station__active" :class="statusClass">
        <header class="scan-station__header">
          <span class="scan-station__tag">Room Status</span>
          <button class="scan-station__reset-btn" @click="clearCode" title="Change User Code">
            Code: {{ configuredUserCode }}
          </button>
        </header>

        <!-- Giant Counter Display -->
        <main class="scan-station__main">
          <div class="scan-station__counter">
            <span class="scan-station__count-number">{{ activeStudentsOut }}</span>
            <span class="scan-station__count-max">/ {{ maxStudentsOut > 0 ? maxStudentsOut : '∞' }}</span>
          </div>
          <span class="scan-station__status-text">{{ capacityStatusText }}</span>
        </main>

        <!-- Hidden input to capture physical keyboard wedge sweeps -->
        <input 
          ref="scanInput"
          v-model="scanBuffer"
          type="text"
          class="scan-station__hidden-input"
          @blur="focusInput"
          @keyup.enter="onInputScan"
        />

        <!-- Giant Full-Screen Scan Feedback Overlay -->
        <Transition name="overlay-slide">
          <div 
            v-if="activeFeedback" 
            class="scan-station__feedback-overlay" 
            :class="feedbackOverlayClass"
            @click.stop="clearFeedback"
          >
            <div class="scan-station__feedback-content">
              <span class="scan-station__feedback-title">{{ feedbackTitle }}</span>
              <span class="scan-station__feedback-msg">{{ activeFeedback.message }}</span>
              <span class="scan-station__feedback-action">{{ feedbackActionLabel }}</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { supabase } from '../utils/supabase.js'

const configuredUserCode = ref(localStorage.getItem('door-user-code') || '')
const tempCode = ref('')
const scanBuffer = ref('')
const scanInput = ref(null)

const activeStudentsOut = ref(0)
const maxStudentsOut = ref(0)

const activeFeedback = ref(null)
const lastInsertedId = ref(null)
let feedbackTimer = null
let statusSubscription = null
let scanResultSubscription = null

const statusClass = computed(() => {
  if (maxStudentsOut.value > 0 && activeStudentsOut.value >= maxStudentsOut.value) {
    return 'scan-station__active--at-limit'
  }
  if (activeStudentsOut.value > 0) {
    return 'scan-station__active--occupied'
  }
  return 'scan-station__active--empty'
})

const capacityStatusText = computed(() => {
  if (maxStudentsOut.value > 0 && activeStudentsOut.value >= maxStudentsOut.value) {
    return 'ROOM AT CAPACITY - WAIT'
  }
  return 'ROOM OK - SCAN CODE'
})

const feedbackOverlayClass = computed(() => {
  if (!activeFeedback.value) return ''
  const action = activeFeedback.value.scan_action
  if (activeFeedback.value.status === 'error' || action === 'error') {
    return 'scan-station__feedback-overlay--error' // Giant red screen
  }
  if (action === 'checkin') {
    return 'scan-station__feedback-overlay--checkin' // Giant bright green screen
  }
  if (action === 'washroom_in') {
    return 'scan-station__feedback-overlay--return' // Giant blue screen
  }
  if (action === 'washroom_out') {
    return 'scan-station__feedback-overlay--exit' // Giant yellow/orange screen
  }
  return 'scan-station__feedback-overlay--default'
})

const feedbackTitle = computed(() => {
  if (!activeFeedback.value) return ''
  const action = activeFeedback.value.scan_action
  if (action === 'checkin') return 'ATTENDANCE'
  if (action === 'washroom_in' || action === 'washroom_out') return 'ROOM EXIT'
  return 'DECLINED'
})

const feedbackActionLabel = computed(() => {
  if (!activeFeedback.value) return ''
  const action = activeFeedback.value.scan_action
  if (action === 'checkin') return 'SIGNED IN - WELCOME!'
  if (action === 'washroom_in') return 'RETURNED TO CLASS'
  if (action === 'washroom_out') return 'WASHROOM OUT'
  return 'SCAN DECLINED'
})

function saveCode() {
  if (!tempCode.value.trim()) return
  configuredUserCode.value = tempCode.value.trim().toUpperCase()
  localStorage.setItem('door-user-code', configuredUserCode.value)
  initSubscriptions()
  nextTick(() => focusInput())
}

function clearCode() {
  if (confirm('Disconnect scanner station?')) {
    configuredUserCode.value = ''
    localStorage.removeItem('door-user-code')
    stopSubscriptions()
  }
}

function focusInput() {
  if (scanInput.value) {
    scanInput.value.focus()
  }
}

async function onInputScan() {
  const code = scanBuffer.value.trim()
  scanBuffer.value = ''
  if (!code) return

  if (code.length < 6) {
    showMockFeedback('Invalid scan length', true)
    return
  }

  try {
    if (!supabase) {
      showMockFeedback('Supabase not configured', true)
      return
    }
    const { data, error } = await supabase
      .from('incoming_scans')
      .insert({
        user_code: configuredUserCode.value,
        rfid_string: code,
        status: 'pending'
      })
      .select('id')
      .single()

    if (error) throw error
    if (data) {
      lastInsertedId.value = data.id
    }
  } catch (err) {
    console.error(err)
    showMockFeedback('Upload failed - Check connection', true)
  }
}

function showMockFeedback(msg, err = false) {
  activeFeedback.value = {
    message: msg,
    status: err ? 'error' : 'pending',
    scan_action: err ? 'error' : 'default'
  }
  clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    activeFeedback.value = null
  }, 2500)
}

function clearFeedback() {
  activeFeedback.value = null
}

async function fetchCurrentStatus() {
  if (!configuredUserCode.value || !supabase) return
  const { data } = await supabase
    .from('room_status')
    .select('active_students_out, max_students_out')
    .eq('user_code', configuredUserCode.value)
    .single()
  
  if (data) {
    activeStudentsOut.value = data.active_students_out
    maxStudentsOut.value = data.max_students_out
  }
}

function initSubscriptions() {
  if (!configuredUserCode.value || !supabase) return
  // Guard: tear down any existing channels before creating new ones
  // (prevents duplicate subscriptions on hot reload or repeated initSubscriptions calls)
  if (statusSubscription || scanResultSubscription) stopSubscriptions()
  fetchCurrentStatus()

  // Subscribe to count updates
  statusSubscription = supabase
    .channel('door-status')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_status', filter: `user_code=eq.${configuredUserCode.value}` },
      (payload) => {
        if (payload.new) {
          activeStudentsOut.value = payload.new.active_students_out
          maxStudentsOut.value = payload.new.max_students_out
        }
      }
    )
    .subscribe()

  // Subscribe to scan processed results
  scanResultSubscription = supabase
    .channel('scan-results')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'incoming_scans', filter: `user_code=eq.${configuredUserCode.value}` },
      (payload) => {
        if (payload.new && payload.new.id === lastInsertedId.value && payload.new.status !== 'pending') {
          activeFeedback.value = payload.new
          clearTimeout(feedbackTimer)
          feedbackTimer = setTimeout(() => {
            activeFeedback.value = null
          }, 3000)
        }
      }
    )
    .subscribe()
}

function stopSubscriptions() {
  if (statusSubscription && supabase) {
    supabase.removeChannel(statusSubscription)
    statusSubscription = null
  }
  if (scanResultSubscription && supabase) {
    supabase.removeChannel(scanResultSubscription)
    scanResultSubscription = null
  }
}

onMounted(() => {
  initSubscriptions()
  nextTick(() => focusInput())
  window.addEventListener('focus', focusInput)
})

onUnmounted(() => {
  window.removeEventListener('focus', focusInput)
  clearTimeout(feedbackTimer)
  stopSubscriptions()
})
</script>

<style scoped>
.scan-station {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  background: #121214;
  color: #f2f2f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
  overflow: hidden;
}

.scan-station__container {
  width: 100%;
  max-width: 600px;
  padding: 40px;
  text-align: center;
}

.scan-station__setup {
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: var(--shadow-md);
}

.scan-station__setup h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  color: #ffffff;
}

.scan-station__setup p {
  color: #8e8e93;
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
}

.scan-station__setup-input {
  background: #2c2c2e;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  border-radius: var(--radius-md);
  padding: 12px 16px;
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  outline: none;
  transition: border-color 0.2s ease;
}

.scan-station__setup-input:focus {
  border-color: var(--primary);
}

.scan-station__setup-btn {
  background: var(--primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md);
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.scan-station__setup-btn:hover {
  opacity: 0.9;
}

.scan-station__active {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 450px;
  border-radius: var(--radius-lg);
  padding: 30px;
  transition: background 0.3s ease, border-color 0.3s ease;
  border: 4px solid transparent;
}

.scan-station__header {
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
}

.scan-station__tag {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.6;
}

.scan-station__reset-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 20px;
  padding: 4px 12px;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.scan-station__reset-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Color coding states for students out count */
.scan-station__active--empty {
  background: rgba(52, 199, 89, 0.05);
  border-color: #34c759;
}
.scan-station__active--empty .scan-station__count-number {
  color: #34c759;
}

.scan-station__active--occupied {
  background: rgba(90, 200, 250, 0.05);
  border-color: #5ac8fa;
}
.scan-station__active--occupied .scan-station__count-number {
  color: #5ac8fa;
}

.scan-station__active--at-limit {
  background: rgba(255, 59, 48, 0.05);
  border-color: #ff3b30;
  animation: pulse-red 2s infinite alternate;
}
.scan-station__active--at-limit .scan-station__count-number {
  color: #ff3b30;
}

@keyframes pulse-red {
  0% { box-shadow: 0 0 10px rgba(255, 59, 48, 0.1); }
  100% { box-shadow: 0 0 25px rgba(255, 59, 48, 0.3); }
}

.scan-station__counter {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-top: 20px;
}

.scan-station__count-number {
  font-size: 160px;
  font-weight: 900;
  line-height: 1;
}

.scan-station__count-max {
  font-size: 40px;
  opacity: 0.5;
  margin-left: 10px;
}

.scan-station__status-text {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 2px;
  margin-top: 15px;
}

/* Giant Feedback Overlay styles */
.scan-station__feedback-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  border-radius: calc(var(--radius-lg) - 4px);
  animation: scale-up 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes scale-up {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.scan-station__feedback-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
  color: #ffffff;
}

.scan-station__feedback-title {
  font-size: 3rem;
  font-weight: 900;
  line-height: 1.1;
}

.scan-station__feedback-msg {
  font-size: 1.4rem;
  font-weight: 600;
  opacity: 0.9;
}

.scan-station__feedback-action {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 3px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.15);
  border-radius: var(--radius-sm);
  display: inline-block;
  margin: 10px auto 0;
  width: fit-content;
}

/* Overlay Colors matching action */
.scan-station__feedback-overlay--checkin {
  background: #34c759; /* Giant green screen */
}

.scan-station__feedback-overlay--return {
  background: #007aff; /* Giant blue screen */
}

.scan-station__feedback-overlay--exit {
  background: #ff9500; /* Giant yellow/orange screen */
}

.scan-station__feedback-overlay--error {
  background: #ff3b30; /* Giant red screen */
  animation: shake 0.35s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.scan-station__hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}
</style>
