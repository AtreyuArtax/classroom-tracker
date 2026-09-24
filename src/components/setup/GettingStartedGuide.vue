<template>
  <div class="guide-content">
    <!-- Header -->
    <div class="guide-header">
      <div class="guide-header-icon-wrapper">
        <GraduationCap :size="28" class="guide-header-icon" />
      </div>
      <div>
        <h2 class="guide-title">Classroom Tracker Guide & Knowledge Hub</h2>
        <p class="guide-subtitle">Everything you need to set up, teach, grade, and preserve your classroom records.</p>
      </div>
    </div>

    <!-- Segmented Tab Navigation -->
    <div class="guide-nav" role="tablist" aria-label="Guide Sections">
      <button 
        class="guide-nav-tab" 
        :class="{ 'guide-nav-tab--active': activeTab === 'quickstart' }"
        role="tab"
        :aria-selected="activeTab === 'quickstart'"
        @click="activeTab = 'quickstart'"
      >
        <Rocket :size="16" />
        <span>Quickstart</span>
      </button>

      <button 
        class="guide-nav-tab" 
        :class="{ 'guide-nav-tab--active': activeTab === 'features' }"
        role="tab"
        :aria-selected="activeTab === 'features'"
        @click="activeTab = 'features'"
      >
        <BookOpen :size="16" />
        <span>Feature Deep Dives</span>
      </button>

      <button 
        class="guide-nav-tab" 
        :class="{ 'guide-nav-tab--active': activeTab === 'faq' }"
        role="tab"
        :aria-selected="activeTab === 'faq'"
        @click="activeTab = 'faq'"
      >
        <HelpCircle :size="16" />
        <span>FAQ & Privacy</span>
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- TAB 1: QUICKSTART                                              -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'quickstart'" class="guide-tab-panel">
      <!-- Mode Selection Banner -->
      <div class="guide-mode-section">
        <div class="guide-mode-header">
          <h3 class="guide-mode-title">1. Choose Your Primary Teaching Mode</h3>
          <p class="guide-mode-subtitle">Select your workspace style to tailor schedules, gradebooks, and rosters:</p>
        </div>

        <div class="guide-mode-cards">
          <!-- Secondary Card -->
          <div 
            class="guide-mode-card" 
            :class="{ 'guide-mode-card--active': teachingMode === 'secondary' }"
            @click="selectTeachingMode('secondary')"
            role="button"
            tabindex="0"
          >
            <div class="guide-mode-card-badge" v-if="teachingMode === 'secondary'">
              <Check :size="12" /> Active Workspace
            </div>
            <div class="guide-mode-card-icon">
              <GraduationCap :size="26" style="color: var(--primary);" />
            </div>
            <h4 class="guide-mode-card-name">Secondary Mode (Grades 9–12)</h4>
            <ul class="guide-mode-list">
              <li>• Period-based schedules & start times</li>
              <li>• Semester terms (Semester 1 & 2)</li>
              <li>• Weighted percentage / point gradebook</li>
            </ul>
          </div>

          <!-- Elementary Card -->
          <div 
            class="guide-mode-card" 
            :class="{ 'guide-mode-card--active': teachingMode === 'elementary' }"
            @click="selectTeachingMode('elementary')"
            role="button"
            tabindex="0"
          >
            <div class="guide-mode-card-badge" v-if="teachingMode === 'elementary'">
              <Check :size="12" /> Active Workspace
            </div>
            <div class="guide-mode-card-icon">
              <School :size="26" style="color: #059669;" />
            </div>
            <h4 class="guide-mode-card-name">Elementary Mode (K–8)</h4>
            <ul class="guide-mode-list">
              <li>• Full-year single homeroom roster</li>
              <li>• Subject switcher (Math, Science, Language...)</li>
              <li>• SBAR & Level 1–4 mastery grading</li>
            </ul>
          </div>
        </div>

        <div class="guide-mode-note">
          <Info :size="15" class="guide-mode-note-icon" />
          <span>
            <strong>Dual-Mode Note:</strong> You can manage both Secondary and Elementary classes within the exact same app. Switch your active mode anytime under <strong>Setup → App Settings</strong>.
          </span>
        </div>
      </div>

      <!-- Quickstart Steps Grid -->
      <div class="guide-steps-grid">
        <!-- Step 2: Roster Import -->
        <div class="guide-step-card">
          <div class="guide-step-number">2</div>
          <div class="guide-step-header">
            <div class="guide-step-icon-wrap">
              <FolderOpen :size="18" />
            </div>
            <h3 class="guide-step-title">Import Your Roster (CSV)</h3>
          </div>
          <p class="guide-step-text">
            Drop your board export CSV under <strong>Setup → Class Manager</strong>. Formats from systems like <strong>PowerSchool</strong> are detected automatically.
          </p>
          <ul class="guide-list">
            <li><strong>Auto-Mapped Fields:</strong> Student ID, First/Last Name, contact numbers, and parent emails are matched automatically.</li>
            <li><strong>Manual Adding:</strong> Prefer typing? You can also quickly add students one by one directly from the roster list.</li>
          </ul>
        </div>

        <!-- Step 3: Room Layout & Desks -->
        <div class="guide-step-card">
          <div class="guide-step-number">3</div>
          <div class="guide-step-header">
            <div class="guide-step-icon-wrap">
              <LayoutGrid :size="18" />
            </div>
            <h3 class="guide-step-title">Seat Your Classroom</h3>
          </div>
          <p class="guide-step-text">
            Head to the <strong>Dashboard</strong> to seat your students. Unassigned students appear in the right-side pool drawer.
          </p>
          <ul class="guide-list">
            <li><strong>Drag or Auto-Assign:</strong> Drag students onto desk slots or click <strong>Auto-Assign</strong> to seat everyone in alphabetical order.</li>
            <li><strong>Custom Desk Layouts:</strong> Need group pods, u-shapes, or paired tables? Switch to <em>Room Layout</em> in Setup to freely customize desk coordinates.</li>
          </ul>
        </div>

        <!-- Step 4: Daily Teaching Loop -->
        <div class="guide-step-card guide-step-card--highlight">
          <div class="guide-step-number">4</div>
          <div class="guide-step-header">
            <div class="guide-step-icon-wrap">
              <Sparkles :size="18" />
            </div>
            <h3 class="guide-step-title">The Daily Loop (3 Desk Gestures)</h3>
          </div>
          <p class="guide-step-text">
            During class, everything runs directly from each student's desk tile:
          </p>
          <div class="guide-gesture-row">
            <div class="guide-gesture-badge">Tap Desk</div>
            <div class="guide-gesture-desc">Cycles daily attendance: <strong>Present</strong> ➔ <strong>Late</strong> ➔ <strong>Absent</strong>.</div>
          </div>
          <div class="guide-gesture-row">
            <div class="guide-gesture-badge">Radial Badge</div>
            <div class="guide-gesture-desc">Click the badge to start a <strong>live washroom timer</strong>, log a phone redirect, give praise, or record private observation notes.</div>
          </div>
          <div class="guide-gesture-row">
            <div class="guide-gesture-badge">Student Name</div>
            <div class="guide-gesture-desc">Opens the <strong>Student 360 Dossier</strong> with IEP accommodations, parent phone numbers, and auto-generated email summaries.</div>
          </div>
        </div>

        <!-- Step 5: Grades & Assessments -->
        <div class="guide-step-card">
          <div class="guide-step-number">5</div>
          <div class="guide-step-header">
            <div class="guide-step-icon-wrap">
              <FileSpreadsheet :size="18" />
            </div>
            <h3 class="guide-step-title">Record Grades & Evidence</h3>
          </div>
          <p class="guide-step-text">
            Switch to the <strong>Grades</strong> tab to manage coursework:
          </p>
          <ul class="guide-list">
            <li><strong>Fast Entry:</strong> Create assessments, categorize them, and enter scores or mastery levels directly in the spreadsheet view.</li>
            <li><strong>Missing Marks & Attempts:</strong> Track incomplete tasks and re-test attempts with full audit visibility.</li>
          </ul>
        </div>

        <!-- Step 6: Backup Safety Net -->
        <div class="guide-step-card guide-step-card--full">
          <div class="guide-step-number">6</div>
          <div class="guide-step-header">
            <div class="guide-step-icon-wrap">
              <ShieldCheck :size="18" />
            </div>
            <h3 class="guide-step-title">Crucial: Link a Local Backup Folder</h3>
          </div>
          <p class="guide-step-text">
            <strong>Classroom Tracker is 100% offline-first.</strong> Your records stay private in your browser's local database and are <em>never uploaded to an external cloud server</em>.
          </p>
          <div class="guide-backup-callout">
            <p>
              To ensure your data is safe if browser cookies or history are cleared, go to <strong>Setup → Data Backup</strong> and click <strong>Link Backup Folder</strong>. Select your local OneDrive, Google Drive, or Documents folder. The app will automatically save a fresh <code>quick-sync-backup.json</code> file whenever you make changes.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- TAB 2: FEATURE DEEP DIVES                                      -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 'features'" class="guide-tab-panel">
      <!-- Search & Controls Bar -->
      <div class="guide-search-bar">
        <div class="guide-search-input-wrap">
          <Search :size="16" class="guide-search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search topics (e.g. washroom, SBAR, auto-assign, test day, dossier)..." 
            class="guide-search-input"
          />
          <button v-if="searchQuery" class="guide-search-clear" @click="searchQuery = ''" title="Clear search">
            <X :size="14" />
          </button>
        </div>
        <button class="guide-toggle-all-btn" @click="toggleAllSections">
          {{ areAllOpen ? 'Collapse All' : 'Expand All' }}
        </button>
      </div>

      <!-- Deep Dive Accordion List -->
      <div class="guide-accordion-list">
        <div 
          v-for="section in filteredSections" 
          :key="section.id" 
          class="guide-accordion-item"
          :class="{ 'guide-accordion-item--open': openSections[section.id] }"
        >
          <div 
            class="guide-accordion-header" 
            @click="toggleSection(section.id)"
            role="button"
            tabindex="0"
          >
            <div class="guide-accordion-header-left">
              <component :is="section.icon" :size="20" class="guide-accordion-icon" />
              <div>
                <h4 class="guide-accordion-title">{{ section.title }}</h4>
                <p class="guide-accordion-summary">{{ section.summary }}</p>
              </div>
            </div>
            <div class="guide-accordion-header-right">
              <span class="guide-accordion-tag">{{ section.tag }}</span>
              <ChevronDown 
                :size="18" 
                class="guide-accordion-chevron" 
                :class="{ 'guide-accordion-chevron--open': openSections[section.id] }" 
              />
            </div>
          </div>

          <div v-if="openSections[section.id]" class="guide-accordion-body">
            <div class="guide-accordion-content" v-html="section.content"></div>
          </div>
        </div>

        <div v-if="filteredSections.length === 0" class="guide-empty-search">
          <p>No feature topics matching "<strong>{{ searchQuery }}</strong>"</p>
          <button class="guide-search-clear-btn" @click="searchQuery = ''">Clear filter</button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- TAB 3: FAQ & PRIVACY                                           -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 'faq'" class="guide-tab-panel">
      <div class="guide-faq-grid">
        <!-- Privacy Guarantee -->
        <div class="guide-faq-card">
          <div class="guide-faq-header">
            <ShieldCheck :size="22" class="guide-faq-icon guide-faq-icon--green" />
            <h3 class="guide-faq-title">100% Local-First Privacy Guarantee</h3>
          </div>
          <p class="guide-faq-text">
            <strong>Where is student data stored?</strong> Exclusively inside your device's local browser database (IndexedDB). 
          </p>
          <p class="guide-faq-text">
            No student names, student IDs, parent contact information, behavioral logs, or academic marks are ever sent to any remote server or third-party cloud. The application operates fully offline without an internet connection.
          </p>
        </div>

        <!-- How Local Folder Sync Works -->
        <div class="guide-faq-card">
          <div class="guide-faq-header">
            <Save :size="22" class="guide-faq-icon guide-faq-icon--blue" />
            <h3 class="guide-faq-title">How Automatic Local Folder Sync Works</h3>
          </div>
          <p class="guide-faq-text">
            Classroom Tracker uses the modern <strong>Web File System Access API</strong> to safely write backups to a folder of your choice on your laptop or desktop.
          </p>
          <ul class="guide-list">
            <li>Link your local <strong>OneDrive</strong> or <strong>Google Drive</strong> folder under <strong>Setup → Data Backup</strong>.</li>
            <li>Every major action triggers an automatic background save to <code>quick-sync-backup.json</code>.</li>
            <li>If you ever use a different computer or clear your browser cache, click <strong>Restore Backup</strong> and select that JSON file to immediately restore your full workspace.</li>
          </ul>
        </div>

        <!-- Archiving vs Deleting -->
        <div class="guide-faq-card">
          <div class="guide-faq-header">
            <Archive :size="22" class="guide-faq-icon guide-faq-icon--amber" />
            <h3 class="guide-faq-title">Should I Archive or Delete?</h3>
          </div>
          <p class="guide-faq-text">
            Always prefer <strong>Archiving</strong> over deleting:
          </p>
          <ul class="guide-list">
            <li><strong>Archive a Student:</strong> When a student transfers or drops, unenroll/archive them. Their historical marks, attendance logs, and notes are preserved for reports and parent meetings, but they leave your active seating grid.</li>
            <li><strong>Archive a Class:</strong> At the end of a semester, archive the class. It clears your daily dashboard while preserving records for year-end transcripts or exports.</li>
            <li><strong>Delete:</strong> Permanently removes all logs. Use this strictly for duplicate entries or test data.</li>
          </ul>
        </div>

        <!-- Power Tips & Hotkeys -->
        <div class="guide-faq-card">
          <div class="guide-faq-header">
            <Zap :size="22" class="guide-faq-icon guide-faq-icon--purple" />
            <h3 class="guide-faq-title">Power Tips & Shortcuts</h3>
          </div>
          <ul class="guide-list">
            <li><strong>Undo Button:</strong> Made a mistake moving a student or marking attendance? Click the <strong>Undo</strong> button in the top bar (or press <code>Ctrl/Cmd + Z</code>) to reverse recent actions.</li>
            <li><strong>Rapid Attendance:</strong> In <em>Natural Attendance Mode</em>, all students default to Present. You only need to tap the few students who are absent or late!</li>
            <li><strong>One-Click Parent Email:</strong> Inside the Student 360 Dossier, click the <em>Email</em> tab to generate pre-filled email summaries of student progress ready to send in Outlook or Gmail.</li>
          </ul>
        </div>

        <!-- Optional QR Badges -->
        <div class="guide-faq-card guide-faq-card--full">
          <div class="guide-faq-header">
            <QrCode :size="22" class="guide-faq-icon" />
            <h3 class="guide-faq-title">Advanced: Student QR & RFID Badges for Hall Passes</h3>
          </div>
          <p class="guide-faq-text">
            You can generate and print individual student QR badges under <strong>Setup → Class Manager</strong>. If you connect a barcode/QR reader or USB webcam, students can scan themselves out for a washroom or hall pass autonomously, keeping live timers running on your desk screen without interrupting class instruction.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  GraduationCap, 
  School, 
  Rocket, 
  BookOpen, 
  HelpCircle, 
  FolderOpen, 
  LayoutGrid, 
  Sparkles, 
  FileSpreadsheet, 
  ShieldCheck, 
  Check, 
  Info, 
  Search, 
  X, 
  ChevronDown, 
  Clock, 
  Users, 
  Award, 
  CheckCircle2, 
  Archive, 
  Save, 
  Zap, 
  QrCode 
} from 'lucide-vue-next'
import { teachingMode } from '../../composables/useClassroomState.js'

const props = defineProps({
  showModeSelector: { type: Boolean, default: true },
  initialTab: { type: String, default: 'quickstart' }
})

const activeTab = ref(props.initialTab || 'quickstart')
const searchQuery = ref('')

function selectTeachingMode(mode) {
  teachingMode.value = mode
}

// ── Feature Deep Dives Data ───────────────────────────────────────
const sections = [
  {
    id: 'seating',
    icon: LayoutGrid,
    title: 'Visual Seating Chart & Room Customizer',
    tag: 'Dashboard & Setup',
    summary: 'Arrange desks in rows, group pods, or u-shapes with drag-and-drop seating.',
    content: `
      <p>The visual seating chart mirrors the physical layout of your classroom:</p>
      <ul>
        <li><strong>Unassigned Pool:</strong> Click the pool tab on the right side of the Dashboard to view unseated students. Drag any student tile onto an available desk, or click <em>Auto-Assign</em> to seat them alphabetically.</li>
        <li><strong>Custom Room Layouts:</strong> In <strong>Setup → Room Layout</strong>, switch between standard grid dimensions or a flexible custom layout where you can position tables, group pods, or horseshoe configurations.</li>
        <li><strong>Moving Students:</strong> Drag-and-drop any desk tile to swap or reassign seats instantly.</li>
      </ul>
    `
  },
  {
    id: 'radial',
    icon: Clock,
    title: 'Radial Logger & Live Hall Pass Timers',
    tag: 'Live Tracking',
    summary: 'One-click washroom tracking with live ticking timer badges and behavior logs.',
    content: `
      <p>The Radial Menu lets you record in-class events in under two seconds:</p>
      <ul>
        <li><strong>Hall Passes & Washroom:</strong> Tap the center radial icon on any desk and select Washroom or Hall Pass. The desk turns into an active timer badge showing exactly how many minutes the student has been gone. Tap again when they return to stop the timer.</li>
        <li><strong>Threshold Alerts:</strong> Configure maximum washroom visits or phone redirects per week under <strong>Setup → Behavior Settings</strong>. The desk tile displays an amber alert indicator when a student exceeds your threshold.</li>
        <li><strong>Observations & Conversations:</strong> Log qualitative academic evidence (tagged as <code>ac</code>) to support triangulated assessment records.</li>
      </ul>
    `
  },
  {
    id: 'dossier',
    icon: Users,
    title: 'Student 360 Dossier & Communication',
    tag: 'Student Profile',
    summary: 'Complete academic history, IEP accommodations, and automated parent emails.',
    content: `
      <p>Clicking any student's name or photo opens their complete <strong>Student 360 Dossier</strong>:</p>
      <ul>
        <li><strong>Accommodations & Notes:</strong> Record IEP/504 notes, learning preferences, and medical alerts.</li>
        <li><strong>Parent Contact Log:</strong> View parent phone numbers, emails, and record previous phone calls or parent-teacher meeting notes.</li>
        <li><strong>Pre-formatted Email Generator:</strong> Under the <em>Email</em> tab, select an email template (Attendance Concerns, Academic Update, Missing Assignments) to automatically generate a personalized email with current grades and attendance stats.</li>
        <li><strong>Single-Student Printout:</strong> Generate a clean, professional PDF report card for parent-teacher interviews.</li>
      </ul>
    `
  },
  {
    id: 'grading',
    icon: Award,
    title: 'Dual Grading Engine (Secondary % vs. Elementary SBAR)',
    tag: 'Gradebook',
    summary: 'Custom category weights, attempt policies, and Ontario curriculum expectation presets.',
    content: `
      <p>Classroom Tracker features two specialized grading frameworks:</p>
      <ul>
        <li><strong>Secondary Mode (Grades 9–12):</strong> Manage weighted categories (e.g. 70% Term Work, 30% Culminating), point-scaling, and multiple assessment attempts (e.g. keeping highest vs. most recent attempt).</li>
        <li><strong>Elementary Mode (K–8):</strong> Standards-Based Assessment & Reporting (SBAR). Grade students on <strong>Level 1–4 mastery scales</strong> across strands and expectations.</li>
        <li><strong>Curriculum Library:</strong> Import standard curriculum strands and expectations (e.g., Ontario Grade 9 Science SNC1W) to link every assessment directly to curriculum codes.</li>
      </ul>
    `
  },
  {
    id: 'testday',
    icon: CheckCircle2,
    title: 'Test Day Mode & Evaluation Analytics',
    tag: 'Analytics',
    summary: 'Tag attendance, lates, departures, and incidents occurring during exam periods.',
    content: `
      <p>Click the <strong>Test Day</strong> toggle at the top of the Dashboard whenever conducting an exam or summative evaluation:</p>
      <ul>
        <li><strong>Event Tagging:</strong> While active, all attendance marks, lates, hall pass departures, and behavior notes are specifically tagged as evaluation-period events.</li>
        <li><strong>Audit Insights:</strong> In <strong>Reports</strong>, you can filter reports specifically for Test Day events to review whether hall pass frequency or lates correlated with test performance.</li>
      </ul>
    `
  },
  {
    id: 'archiving',
    icon: Archive,
    title: 'Archiving vs. Deleting (Data Integrity)',
    tag: 'Class Management',
    summary: 'Understand how to close semesters and unenroll students without losing historical data.',
    content: `
      <p>To preserve academic audit trails, Classroom Tracker distinguishes between archiving and deleting:</p>
      <ul>
        <li><strong>Archiving Students (Unenroll):</strong> When a student transfers out of your class, archive them. Their historical grades and attendance records remain in the database for transcripts and reports, but their desk tile is removed from active seating.</li>
        <li><strong>Archiving Classes:</strong> At the conclusion of a semester or school year, archive the class under <strong>Setup → Class Manager</strong>. This removes it from your daily switcher while keeping all historical data intact for future export.</li>
        <li><strong>Deleting:</strong> Permanently erases data. Use strictly for accidental duplicates or typo corrections.</li>
      </ul>
    `
  },
  {
    id: 'reports',
    icon: FileSpreadsheet,
    title: 'Reports, Batch Dossier Printing & Excel Exports',
    tag: 'Reporting',
    summary: 'Generate whole-class summaries, attendance pattern charts, and board-ready exports.',
    content: `
      <p>The <strong>Reports</strong> view provides aggregate analytics for your classes:</p>
      <ul>
        <li><strong>Attendance Insights:</strong> Visual charts break down lates and absences by day of the week to reveal patterns.</li>
        <li><strong>Batch Print Dossiers:</strong> Generate printable progress summary cards for every student in the class at once—ideal for distribution at parent-teacher night.</li>
        <li><strong>Excel & CSV Export:</strong> Export complete gradebooks and attendance logs formatted for easy copy-pasting into school board administrative portals.</li>
      </ul>
    `
  }
]

// Accordion open/close state
const openSections = ref({
  seating: true // First one open by default
})

function toggleSection(id) {
  openSections.value[id] = !openSections.value[id]
}

const areAllOpen = computed(() => {
  return sections.every(s => openSections.value[s.id])
})

function toggleAllSections() {
  const targetState = !areAllOpen.value
  sections.forEach(s => {
    openSections.value[s.id] = targetState
  })
}

// Filtered accordion list based on search query
const filteredSections = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sections
  return sections.filter(s => {
    return (
      s.title.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.tag.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q)
    )
  })
})
</script>

<style scoped>
.guide-content {
  color: var(--text);
  line-height: 1.6;
}

/* Header */
.guide-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.guide-header-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.guide-header-icon {
  color: var(--primary);
}

.guide-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.guide-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 3px 0 0 0;
}

/* Tab Navigation */
.guide-nav {
  display: flex;
  gap: 8px;
  background: var(--bg-secondary);
  padding: 6px;
  border-radius: var(--radius-md);
  margin-bottom: 24px;
  border: 1px solid var(--border);
}

.guide-nav-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 40px;
}

.guide-nav-tab:hover {
  color: var(--text);
  background: rgba(0, 0, 0, 0.04);
}

.guide-nav-tab--active {
  color: var(--primary) !important;
  background: var(--surface) !important;
  box-shadow: var(--shadow-sm);
}

/* Mode Selection Card Banner */
.guide-mode-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm);
}

.guide-mode-header {
  margin-bottom: 14px;
}

.guide-mode-title {
  font-size: 1.1rem;
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
  margin-bottom: 14px;
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

.guide-mode-card-name {
  font-size: 0.975rem;
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

.guide-mode-note-icon {
  color: var(--primary);
  flex-shrink: 0;
  margin-top: 2px;
}

/* Quickstart Step Cards */
.guide-steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.guide-step-card {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.guide-step-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.guide-step-card--highlight {
  border-color: var(--primary);
  background: rgba(37, 99, 235, 0.03);
}

.guide-step-card--full {
  grid-column: 1 / -1;
}

.guide-step-number {
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 0.75rem;
  font-weight: 800;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guide-step-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.guide-step-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary-light);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.guide-step-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.guide-step-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.guide-list {
  padding-left: 18px;
  font-size: 0.825rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}

.guide-list code {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.78rem;
  color: var(--text);
}

.guide-gesture-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 0.825rem;
}

.guide-gesture-badge {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
}

.guide-gesture-desc {
  color: var(--text-secondary);
}

.guide-backup-callout {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid #34c759;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--text);
}

.guide-backup-callout p {
  margin: 0;
}

/* Feature Deep Dives & Accordion */
.guide-search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  align-items: center;
}

.guide-search-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.guide-search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-secondary);
  pointer-events: none;
}

.guide-search-input {
  width: 100%;
  padding: 9px 36px 9px 36px;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s ease;
}

.guide-search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.guide-search-clear {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.guide-toggle-all-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 9px 14px;
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.guide-toggle-all-btn:hover {
  color: var(--text);
  border-color: var(--primary);
}

.guide-accordion-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guide-accordion-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.guide-accordion-item--open {
  border-color: var(--primary);
  background: var(--surface);
}

.guide-accordion-header {
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  gap: 14px;
  user-select: none;
}

.guide-accordion-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.guide-accordion-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.guide-accordion-title {
  font-size: 0.975rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.guide-accordion-summary {
  font-size: 0.825rem;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

.guide-accordion-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.guide-accordion-tag {
  font-size: 0.725rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.guide-accordion-chevron {
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

.guide-accordion-chevron--open {
  transform: rotate(180deg);
}

.guide-accordion-body {
  padding: 0 18px 18px 18px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.guide-accordion-content {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
  padding-top: 14px;
}

.guide-accordion-content :deep(p) {
  margin: 0 0 8px 0;
}

.guide-accordion-content :deep(ul) {
  padding-left: 20px;
  margin: 0 0 8px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.guide-accordion-content :deep(strong) {
  color: var(--text);
}

.guide-accordion-content :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text);
}

.guide-empty-search {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.guide-search-clear-btn {
  margin-top: 8px;
  background: var(--primary-light);
  color: var(--primary);
  border: none;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
}

/* FAQ Grid */
.guide-faq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.guide-faq-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guide-faq-card--full {
  grid-column: 1 / -1;
}

.guide-faq-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.guide-faq-icon {
  flex-shrink: 0;
  color: var(--primary);
}

.guide-faq-icon--green {
  color: #34c759;
}

.guide-faq-icon--blue {
  color: #2563eb;
}

.guide-faq-icon--amber {
  color: #f59e0b;
}

.guide-faq-icon--purple {
  color: #8b5cf6;
}

.guide-faq-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.guide-faq-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

@media (max-width: 640px) {
  .guide-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .guide-nav {
    flex-direction: column;
  }
  .guide-accordion-header-right {
    display: none;
  }
}
</style>
