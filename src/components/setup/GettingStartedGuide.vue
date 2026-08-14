<template>
  <div class="guide-content">
    <div class="guide-header">
      <GraduationCap :size="32" class="guide-header-icon" />
      <div>
        <h2 class="guide-title">Class Tracker User Manual</h2>
        <p class="guide-subtitle">Your step-by-step guide to setting up and running your visual classroom tracker.</p>
      </div>
    </div>

    <!-- Mode Selector Card Banner (Only shown on fresh install / setup screen) -->
    <div v-if="showModeSelector" class="guide-mode-section">
      <div class="guide-mode-header">
        <h3 class="guide-mode-title">Choose Your Primary Teaching Mode</h3>
        <p class="guide-mode-subtitle">Select your workspace setup to tailor schedules, term structures, and CSV roster importers:</p>
      </div>

      <div class="guide-mode-cards">
        <!-- Secondary Card -->
        <div 
          class="guide-mode-card" 
          :class="{ 'guide-mode-card--active': teachingMode === 'secondary' }"
          @click="selectTeachingMode('secondary')"
        >
          <div class="guide-mode-card-badge" v-if="teachingMode === 'secondary'">
            <Check :size="12" /> Active Workspace
          </div>
          <div class="guide-mode-card-icon">
            <GraduationCap :size="28" style="color: var(--primary);" />
          </div>
          <h4 class="guide-mode-card-name">Secondary Mode (9–12)</h4>
          <ul class="guide-mode-list">
            <li>• Period-Based Schedules & Start Times</li>
            <li>• Semester Terms (Sem 1 & 2)</li>
            <li>• Percentage / Point Gradebooks</li>
          </ul>
        </div>

        <!-- Elementary Card -->
        <div 
          class="guide-mode-card" 
          :class="{ 'guide-mode-card--active': teachingMode === 'elementary' }"
          @click="selectTeachingMode('elementary')"
        >
          <div class="guide-mode-card-badge" v-if="teachingMode === 'elementary'">
            <Check :size="12" /> Active Workspace
          </div>
          <div class="guide-mode-card-icon">
            <School :size="28" style="color: #059669;" />
          </div>
          <h4 class="guide-mode-card-name">Elementary Mode (K–8)</h4>
          <ul class="guide-mode-list">
            <li>• Full-Year Homerooms</li>
            <li>• Subject Switcher (Math, Science...)</li>
            <li>• SBAR & Level-Based Grading</li>
          </ul>
        </div>
      </div>

      <div class="guide-mode-note">
        <Info :size="14" style="flex-shrink: 0; margin-top: 2px;" />
        <span>
          <strong>Dual-Mode Note:</strong> You are not limited to just one mode! You can run both Secondary and Elementary classes in the exact same workspace and switch between them anytime under <strong>Setup → App Settings</strong>.
        </span>
      </div>
    </div>

    <div class="guide-grid">
      <!-- Section 1: Roster Setup & PowerSchool CSV -->
      <div class="guide-card">
        <div class="guide-card-icon-wrapper">
          <FolderOpen :size="20" class="guide-icon" />
        </div>
        <h3 class="guide-card-title">1. Roster Setup & CSV Import</h3>
        <p class="guide-card-text">
          Instead of manually typing student names, you can drop your board-provided student export CSV directly. 
          Class Tracker natively supports raw export formats from databases like <strong>PowerSchool</strong>.
        </p>
        <ul class="guide-list">
          <li><strong>Teaching Mode Match:</strong> Make sure your active mode matches your CSV export (Secondary expects Period/Semester fields, while Elementary expects Homeroom/Full-Year fields).</li>
          <li><strong>Automatic Mapping:</strong> We automatically detect and map headers like <code>Student ID</code>, <code>First Name</code>, <code>Last Name</code>, parent contact info, and schedule fields.</li>
          <li><strong>Formatting Help:</strong> Click the <em>"Roster Format & PowerSchool CSV Help"</em> dropdown under the bulk setup card in the manager tab to view exact columns supported.</li>
        </ul>
      </div>

      <!-- Section 2: Attendance Modes -->
      <div class="guide-card">
        <div class="guide-card-icon-wrapper">
          <Clock :size="20" class="guide-icon" />
        </div>
        <h3 class="guide-card-title">2. Attendance Modes</h3>
        <p class="guide-card-text">
          Customize how daily attendance is registered under <strong>Setup → Global App Settings</strong>.
        </p>
        <ul class="guide-list">
          <li><strong>Natural Mode (Recommended):</strong> All students are marked present by default. Ideal for quickly tracking exceptions (absences and lates) manually.</li>
          <li><strong>RFID/QR Sign-In Mode:</strong> All students start the day absent. They must scan their QR badge or RFID keycard to sign in. Lateness is calculated automatically.</li>
        </ul>
      </div>

      <!-- Section 3: Archiving vs. Deleting -->
      <div class="guide-card">
        <div class="guide-card-icon-wrapper">
          <Archive :size="20" class="guide-icon" />
        </div>
        <h3 class="guide-card-title">3. Student & Class Archiving</h3>
        <p class="guide-card-text">
          To maintain data integrity, Class Tracker distinguishes between <strong>archiving</strong> and <strong>deleting</strong>.
        </p>
        <ul class="guide-list">
          <li>
            <strong>Archiving Students (Unenroll):</strong> When a student transfers or drops, archive them. 
            This keeps their grades, attendance logs, and behavior events in your historical database for audits and reports, while removing their desk tile and active roster presence.
          </li>
          <li>
            <strong>Archiving Classes:</strong> At the end of the semester, archive the class. 
            This hides it from your dashboard and setups but preserves all data for exporting.
          </li>
          <li>
            <strong>Deleting:</strong> Permanently erases all historical logs. Only use for spelling mistakes or duplicate student IDs.
          </li>
        </ul>
      </div>

      <!-- Section 4: Behavior Strategies & Gradebook -->
      <div class="guide-card">
        <div class="guide-card-icon-wrapper">
          <Settings2 :size="20" class="guide-icon" />
        </div>
        <h3 class="guide-card-title">4. Gradebook & Behavior Settings</h3>
        <p class="guide-card-text">
          Optimize your daily classroom tracking workflow with custom behavior thresholds and grading scales.
        </p>
        <ul class="guide-list">
          <li><strong>Threshold Warnings:</strong> Define maximum washroom trips or device redirects per week. The student's seating tile will display warning indicators if they exceed these limits.</li>
          <li><strong>Grade Categories:</strong> Custom-tailor assessment categories (e.g. Assessments, Activities, Culminating) and assign weight percentages summing to 100%.</li>
          <li><strong>Behavior Codes:</strong> Customize the emojis, shortcodes, and categories used in the radial logger.</li>
        </ul>
      </div>

      <!-- Section 5: Data & Sync Settings -->
      <div class="guide-card guide-card--full">
        <div class="guide-card-icon-wrapper">
          <Cloud :size="20" class="guide-icon" />
        </div>
        <h3 class="guide-card-title">5. Backups & Two-Device Cloud Sync</h3>
        <p class="guide-card-text">
          Class Tracker is entirely offline-first, but includes optional features to synchronize your workspace.
        </p>
        <div class="guide-sub-grid">
          <div>
            <h4 class="guide-sub-title">Local Folder Sync</h4>
            <p class="guide-card-text">
              Link a folder in your local OneDrive or Google Drive. The app automatically creates a <code>quick-sync-backup.json</code> file every time you make a major change.
            </p>
          </div>
          <div>
            <h4 class="guide-sub-title">Supabase Two-Device Sync</h4>
            <p class="guide-card-text">
              Configure a dedicated scanner machine (e.g. a phone or tablet placed by the door) to scan QR/RFID badges and instantly update attendance on your main teacher desk screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { GraduationCap, School, FolderOpen, Clock, Archive, Settings2, Cloud, Check, Info } from 'lucide-vue-next'
import { teachingMode } from '../../composables/useClassroomState.js'

defineProps({
  showModeSelector: { type: Boolean, default: true }
})

function selectTeachingMode(mode) {
  teachingMode.value = mode
}
</script>

<style scoped>
.guide-content {
  color: var(--text);
  line-height: 1.6;
}

/* Mode Selector Card Banner */
.guide-mode-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm);
}

.guide-mode-header {
  margin-bottom: 16px;
}

.guide-mode-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px 0;
}

.guide-mode-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.guide-mode-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.guide-mode-card {
  position: relative;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guide-mode-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.guide-mode-card--active {
  border-color: var(--primary) !important;
  background: rgba(37, 99, 235, 0.05);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.guide-mode-card-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--primary);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.guide-mode-card-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.guide-mode-card-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.guide-mode-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.guide-mode-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: var(--radius-md);
  font-size: 0.825rem;
  color: var(--text);
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.guide-header-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.guide-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.guide-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.guide-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 20px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.guide-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.guide-card--full {
  grid-column: 1 / -1;
}

.guide-card-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.guide-icon {
  display: block;
}

.guide-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.guide-card-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.guide-list {
  padding-left: 20px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.guide-list code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.78rem;
  color: var(--text);
}

.guide-sub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 4px;
}

.guide-sub-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: var(--text);
}

@media (max-width: 600px) {
  .guide-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
