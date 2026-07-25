<template>
  <div class="setup">
    <!-- ── Page Header & Class Selector ───────────────────────────── -->
    <div class="setup__header">
      <div class="setup__header-left">
        <button v-if="props.from === 'Grades'" class="setup__back-btn" @click="$emit('navigate', 'Grades')">
          <ArrowLeft :size="18" /> Back to Gradebook
        </button>
        <div class="setup__header-class">
          <label for="setup-class-selector" class="setup__header-label">Configuring:</label>
          <select 
            id="setup-class-selector" 
            class="setup__class-selector"
            :value="activeClass?.classId"
            @change="e => switchToClass(e.target.value)"
          >
            <option v-if="filteredClassList.length === 0" value="">No Classes</option>
            <option v-for="cls in filteredClassList" :key="cls.classId" :value="cls.classId">
              {{ cls.name }} (P{{ cls.periodNumber }})
            </option>
          </select>
        </div>
      </div>
      <div class="setup__header-right">
        <button class="setup__btn-ghost" style="min-height: 38px; padding: 0 16px;" @click="isHelpModalOpen = true">
          <HelpCircle :size="16" /> User Guide
        </button>
      </div>
    </div>

    <!-- ── Page tabs ─────────────────────────────────────────────── -->
    <div class="setup__tabs" role="tablist">
      <button
        v-for="tab in setupTabs"
        :key="tab.id"
        class="setup__tab"
        :class="{ 'setup__tab--active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="16" />
        {{ tab.label }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 0: Calendar Manager (Modular)                      -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="activeTab === 'calendar'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
          <CalendarSettings />
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 1: Class Manager                                  -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="activeTab === 'manage'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
        <!-- Bulk Setup Wizard (Smart CSV Interceptor) -->
        <div class="setup__card setup__card--accent">
          <h2 class="setup__card-title">Bulk Setup / New Semester</h2>
          <p class="setup__hint">
            Drop your board-provided CSV here to automatically detect, create, and update classes for the new term.
          </p>
          <label 
            class="setup__file-label" 
            for="roster-file"
            :class="{ 'setup__file-label--drag': isDraggingRoster }"
            @dragover.prevent="isDraggingRoster = true"
            @dragleave.prevent="isDraggingRoster = false"
            @drop.prevent="isDraggingRoster = false; onFileSelected($event)"
          >
            <FolderOpen :size="16" /> {{ isDraggingRoster ? 'Drop CSV here...' : 'Choose CSV file or drag & drop here' }}
            <input
              id="roster-file"
              type="file"
              accept=".csv,text/csv"
              class="setup__file-input"
              @change="onFileSelected"
            />
          </label>
          
          <div class="setup__csv-help-container">
            <button 
              type="button" 
              class="setup__csv-help-toggle" 
              @click="isCsvHelpOpen = !isCsvHelpOpen"
            >
              <Info :size="14" />
              <span>{{ isCsvHelpOpen ? 'Hide CSV Format Guide' : 'Show Roster Format & PowerSchool CSV Help' }}</span>
              <component :is="isCsvHelpOpen ? ChevronUp : ChevronDown" :size="14" />
            </button>
            <Transition name="csv-fade">
              <CsvHelpGuide v-if="isCsvHelpOpen" />
            </Transition>
          </div>
        </div>

        <!-- Current Classes List -->
        <div class="setup__card">
          <div class="setup__card-header-row">
            <h2 class="setup__card-title">All Classes</h2>
            <label class="setup__label setup__label--checkbox setup__show-all">
              <input type="checkbox" v-model="showAllSessions" />
              Show All Sessions
            </label>
          </div>
          <div v-if="(showAllSessions ? classList : filteredClassList).length === 0" class="setup__empty">
            No active classes for this session.
          </div>
          <ul class="setup__class-list">
            <li
                v-for="cls in (showAllSessions ? classList : filteredClassList)"
                :key="cls.classId"
                class="setup__class-item"
                :class="{ 'setup__class-item--active': cls.classId === activeClass?.classId }"
            >
              <div>
                <div class="setup__class-name">{{ cls.name }}</div>
                <div class="setup__class-meta">
                  Period {{ cls.periodNumber }} · {{ cls.year }} Sem {{ cls.semester }} · {{ studentCount(cls) }} students
                </div>
              </div>
              <div class="setup__class-actions">
                <button class="setup__pill-btn" @click="switchToClass(cls.classId)">
                  {{ cls.classId === activeClass?.classId ? 'Active' : 'Configure' }}
                </button>
                <button class="setup__pill-btn" @click.stop="openQRGenerator(cls)">
                  <QrCode :size="14" /> QR
                </button>
                <button class="setup__pill-btn" @click.stop="openPrintList(cls)">
                  <Printer :size="14" /> List
                </button>
                <button class="setup__pill-btn" @click="onArchiveClass(cls.classId)">Archive</button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Archived Classes -->
        <div v-if="(showAllSessions ? archivedClasses : filteredArchivedClasses).length > 0" class="setup__card setup__card--archived">
          <button class="setup__archived-toggle" @click="isArchivedPanelVisible = !isArchivedPanelVisible">
            <span class="setup__archived-label">
              <Archive :size="16" /> Archived ({{ (showAllSessions ? archivedClasses : filteredArchivedClasses).length }})
            </span>
            <span class="setup__archived-chevron"><component :is="isArchivedPanelVisible ? ChevronUp : ChevronDown" :size="16" /></span>
          </button>
          <ul v-if="isArchivedPanelVisible" class="setup__class-list setup__archived-list">
            <li v-for="cls in (showAllSessions ? archivedClasses : filteredArchivedClasses)" :key="cls.classId" class="setup__class-item setup__class-item--archived">
              <div>
                <div class="setup__class-name">{{ cls.name }}</div>
                <div class="setup__class-meta">Period {{ cls.periodNumber }} · {{ cls.year }} Sem {{ cls.semester }} · {{ studentCount(cls) }} students</div>
              </div>
              <div class="setup__class-actions">
                <button class="setup__pill-btn" @click="onRestoreClass(cls.classId)">Restore</button>
                <button class="setup__pill-btn setup__pill-btn--danger" @click="onDeleteClass(cls.classId)">Delete</button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Create individual class -->
        <div class="setup__card">
          <h2 class="setup__card-title">Create Single Class</h2>
          <form class="setup__form" @submit.prevent="createNewClass">
            <label class="setup__label">
              Class name
              <input v-model="newClass.name" class="setup__input" placeholder="e.g. Period 1 — Science" required />
            </label>
            <label class="setup__label">
              Course Code (Optional)
              <input v-model="newClass.courseCode" class="setup__input" placeholder="e.g. SNC2D1" />
            </label>
            <div class="setup__form-grid">
              <label class="setup__label">
                School Year and Semester
                <select v-model="newClassTermKey" class="setup__input" required>
                  <option v-for="t in termOptions" :key="t.year + t.semester" :value="t.year + '|' + t.semester">
                    {{ t.year }} Sem {{ t.semester }}
                  </option>
                </select>
              </label>
              <label class="setup__label">
                Period
                <select v-model="newClass.periodNumber" class="setup__input" required>
                  <option v-for="opt in periodOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </label>
              <label class="setup__label">
                Start time
                <input v-model="newClass.periodStartTime" type="time" class="setup__input" required />
              </label>
            </div>
            <button type="submit" class="setup__btn-primary">Create Class</button>
          </form>
          <p v-if="classError" class="setup__error">{{ classError }}</p>
        </div>

        <!-- Bulk dialogs (maintained for cross-context safety) -->
        <div v-if="bulkImportGroups" class="setup__dialog" role="dialog" aria-modal="true">
          <div class="setup__dialog-box setup__dialog-box--large">
            <h3 class="setup__dialog-title">Multi-Class Import Detected</h3>
            <p class="setup__dialog-body">This CSV contains students for multiple classes. Select the ones you want to create or update.</p>
            <div class="setup__bulk-header">
              <div class="setup__bulk-header-left">
                <label class="setup__label setup__label--checkbox setup__bulk-select-all">
                  <input type="checkbox" :checked="isAllSelected" @change="toggleAllBulk" />
                  Select All
                </label>
                <button
                  v-for="sem in bulkAvailableSemesters"
                  :key="sem"
                  class="setup__bulk-sem-btn"
                  :class="{ 'setup__bulk-sem-btn--active': isSemesterAllSelected(sem) }"
                  @click="selectSemesterBulk(sem)"
                >Sem {{ sem }}</button>
              </div>
              <span class="setup__bulk-summary">{{ selectedBulkCount }} of {{ Object.keys(bulkImportGroups).length }} selected</span>
            </div>

            <!-- New Periods Advisory -->
            <div v-if="newPeriodsDetected.length > 0" class="setup__advisory">
              <AlertTriangle :size="16" />
              <div>
                <strong>New Periods Detected ({{ newPeriodsDetected.join(', ') }})</strong>
                <p>These periods were added to your settings. Please review their start times after importing.</p>
              </div>
            </div>
            <div class="setup__bulk-list">
              <template v-for="section in bulkImportSemesters" :key="section.label">
                <div class="setup__bulk-section-heading">{{ section.label }}</div>
                <div v-for="{ key, group } in section.groups" :key="key" class="setup__bulk-item">
                  <div class="setup__bulk-item-main">
                    <input type="checkbox" v-model="group.selected" class="setup__checkbox" />
                    <div class="setup__bulk-info">
                      <strong>{{ group.name }}</strong>
                      <div style="display: flex; gap: 4px; align-items: center;">
                        <span class="setup__chip">{{ group.year }} · Sem {{ group.semester }} · P{{ group.periodNumber }}</span>
                        <span v-if="group.courseCode" class="setup__chip setup__chip--blue">{{ group.courseCode }}</span>
                        <span v-if="isExistingClass(group)" class="setup__badge setup__badge--update">Update Existing</span>
                        <span v-else class="setup__badge setup__badge--new">New Class</span>
                      </div>
                    </div>
                  </div>
                  <div class="setup__bulk-count">{{ group.students.length }} students</div>
                </div>
              </template>
            </div>
            <div class="setup__dialog-actions">
              <button class="setup__btn-primary" @click="confirmBulkImport" :disabled="selectedBulkCount === 0">
                Import {{ selectedBulkCount }} Classes
              </button>
              <button class="setup__btn-ghost" @click="bulkImportGroups = null">Cancel</button>
            </div>
          </div>
          <div class="setup__dialog-backdrop" @click="bulkImportGroups = null" />
        </div>

        <!-- Conflict dialog (maintained) -->
        <div v-if="crossClassConflicts.length > 0" class="setup__dialog" role="dialog" aria-modal="true">
          <div class="setup__dialog-box">
            <h3 class="setup__dialog-title">Student ID Conflict</h3>
            <p class="setup__dialog-body">The following Student IDs already exist in another class. What would you like to do?</p>
            <ul class="setup__dialog-list">
              <li v-for="c in crossClassConflicts" :key="c.studentId">
                <strong>{{ c.student.firstName }} {{ c.student.lastName }}</strong>
                ({{ c.studentId }}) — currently in <em>{{ classNameById(c.existingClassId) }}</em>
              </li>
            </ul>
            <div class="setup__dialog-actions">
              <button class="setup__btn-primary" @click="resolveConflicts('move')">Move to this class</button>
              <button class="setup__btn-ghost"   @click="resolveConflicts('skip')">Skip these students</button>
            </div>
          </div>
          <div class="setup__dialog-backdrop" />
        </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 2: Active Class Configuration                     -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'active'" class="setup__panel">
      <ClassLogisticsSettings />
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 3: Global App Settings                            -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'app'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
        <!-- Profile -->
        <div class="setup__card">
          <h2 class="setup__card-title">General Settings</h2>
          <label class="setup__label">
            Teacher Name (for Reports)
            <input v-model="localTeacherName" class="setup__input" placeholder="" @blur="saveTeacherName" />
          </label>
        </div>

        <!-- Attendance & Cloud Mode Settings -->
        <div class="setup__card">
          <h2 class="setup__card-title">
            <GraduationCap :size="18" /> Attendance & Cloud Settings
          </h2>
          <p class="setup__hint">Configure how daily student attendance is registered and set up two-device scanning sync.</p>
          
          <div class="setup__settings-grid">
            
            <!-- Left Column: Attendance Mode -->
            <div class="setup__settings-col setup__settings-col--left">
              <h3 class="setup__card-subtitle" style="margin-top: 0; margin-bottom: 4px;">Attendance Mode</h3>
              <div :key="radioGroupKey" class="setup__attendance-modes" style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px;">
                <label class="setup__label setup__label--radio" style="display: flex; flex-direction: row; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; margin: 0;">
                  <input type="radio" name="attendanceMode" :checked="localAttendanceMode === 'natural'" value="natural" @change="onAttendanceModeChange('natural')" style="margin: 0; cursor: pointer;" />
                  <span>Natural Mode (Present by default)</span>
                </label>
                <label class="setup__label setup__label--radio" style="display: flex; flex-direction: row; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; margin: 0;">
                  <input type="radio" name="attendanceMode" :checked="localAttendanceMode === 'rfid'" value="rfid" @change="onAttendanceModeChange('rfid')" style="margin: 0; cursor: pointer;" />
                  <span>RFID/QR Sign-In Mode (All start absent)</span>
                </label>
              </div>
              
              <div v-if="localAttendanceMode === 'rfid'" class="setup__grace-period" style="margin-top: 8px;">
                <label class="setup__label" style="display: flex; flex-direction: column; gap: 6px; margin: 0;">
                  Lateness Grace Period: <strong>{{ localGracePeriod }} minutes</strong>
                  <input type="range" v-model.number="localGracePeriod" min="0" max="15" step="1" @change="saveAttendanceConfig" style="width: 100%; cursor: pointer; margin: 0;" />
                </label>
              </div>

              <!-- Manual Override Reset -->
              <div v-if="activeClass" class="setup__attendance-actions" style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px;">
                <button class="setup__btn-ghost" style="height: 36px; padding: 0 16px; font-size: 0.85rem; min-height: unset; width: 100%; margin: 0;" @click="onMarkAllPresent">
                  Mark All Present in {{ activeClass.name }}
                </button>
              </div>
            </div>
            
            <!-- Right Column: Cloud Settings -->
            <div class="setup__settings-col">
              <h3 class="setup__card-subtitle" style="margin-top: 0; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                Supabase Two-Device Sync
                <span class="setup__tooltip-container" aria-label="Database Inactivity Warning">
                  <Info :size="14" class="setup__info-icon" />
                  <span class="setup__tooltip-text">
                    <strong>Inactivity Note:</strong> Supabase pauses free databases after 7 days of idle time (like Summer/Winter breaks). If it stops working, simply log into your Supabase Dashboard and click "Restore Project" to wake it up!
                  </span>
                </span>
              </h3>
              <p class="setup__hint" style="margin: 0; font-size: 0.8rem; line-height: 1.4;">Enable Cloud Mode to scan cards on a door device and receive updates here.</p>
              
              <div class="setup__switch-container" style="margin: 8px 0 0 0;">
                <label class="setup__switch">
                  <input type="checkbox" v-model="localCloudMode" @change="saveCloudConfig" />
                  <span class="setup__switch-slider"></span>
                </label>
                <span class="setup__switch-label">Enable Cloud Mode</span>
              </div>
              
              <label class="setup__label" v-if="localCloudMode" style="display: flex; flex-direction: column; gap: 6px; margin: 4px 0 0 0;">
                User Code (Room PIN / Teacher ID)
                <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
                  <input type="text" v-model="localUserCode" readonly class="setup__input" style="margin: 0; flex-grow: 1; cursor: default;" />
                  <button type="button" class="setup__btn-ghost" @click="regenerateUserCode" style="min-height: 44px; padding: 0 16px; margin: 0; white-space: nowrap; display: flex; align-items: center; gap: 6px;" title="Generate random unique code">
                    <RefreshCcw :size="14" /> Generate
                  </button>
                </div>
                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal; margin-top: 2px; line-height: 1.3;">
                  We recommend using a unique auto-generated code (e.g. <strong>B7F-K9X</strong>) to prevent conflicts with other classrooms.
                </span>
              </label>

              <div v-if="localCloudMode" class="setup__link-box">
                <span class="setup__link-title">
                  <ExternalLink :size="14" /> Door Scanner URL
                </span>
                <span class="setup__link-text">
                  Open this link on your dedicated scanning machine and enter your User Code:
                </span>
                <div class="setup__link-input-group">
                  <input type="text" :value="scanStationUrl" readonly class="setup__input" style="margin: 0; flex-grow: 1; cursor: text; font-family: monospace; font-size: 0.8rem;" @click="$event.target.select()" />
                  <button type="button" class="setup__btn-ghost" @click="copyScanStationUrl" style="min-height: 44px; padding: 0 16px; margin: 0; white-space: nowrap; display: flex; align-items: center; gap: 6px; font-size: 0.85rem;" :title="urlCopied ? 'Copied' : 'Copy URL'">
                    <Check v-if="urlCopied" :size="14" style="color: var(--state-success);" />
                    <Copy v-else :size="14" />
                    {{ urlCopied ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
              </div>

              <div class="setup__switch-container" style="margin: 16px 0 0 0;">
                <label class="setup__switch">
                  <input type="checkbox" v-model="autoStartRFID" />
                  <span class="setup__switch-slider"></span>
                </label>
                <span class="setup__switch-label">Auto-Start RFID on Load</span>
              </div>
            </div>
            
          </div>
        </div>

        <!-- Attendance Mode Change Confirmation Modal -->
        <div v-if="isAttendanceModeModalOpen" class="setup__dialog" role="dialog" aria-modal="true" aria-labelledby="att-modal-title">
          <div class="setup__dialog-backdrop" @click="cancelAttendanceModeChange" />
          <div class="setup__dialog-box" style="max-width: 420px;">
            <h3 id="att-modal-title" class="setup__dialog-title" style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">⚠️</span>
              Change Attendance Mode?
            </h3>

            <div class="setup__dialog-body" style="display: flex; flex-direction: column; gap: 10px;">
              <p v-if="pendingAttendanceMode === 'rfid'">
                <strong>Switching to RFID/QR Sign-In Mode</strong> will immediately mark <strong>every student absent</strong> in all classes for today. Students must scan their card or QR code to be marked present.
              </p>
              <p v-else>
                <strong>Switching to Natural Mode</strong> will stop requiring scan-based check-in. Any students still marked absent from today's RFID session will remain absent until they scan in or you manually clear them.
              </p>
              <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.83rem; color: var(--text-secondary); border-left: 3px solid var(--primary);">
                <strong style="color: var(--text);">Self-healing:</strong> Any attendance state set today will automatically reset tonight at midnight. Changing this setting again tomorrow starts fresh — no permanent damage.
              </div>
              <p style="font-size: 0.82rem; color: var(--text-secondary);">Are you sure you want to switch?</p>
            </div>

            <div class="setup__dialog-actions">
              <button class="setup__btn-primary" @click="confirmAttendanceModeChange">Yes, switch mode</button>
              <button class="setup__btn-ghost" @click="cancelAttendanceModeChange">Cancel</button>
            </div>
          </div>
        </div>


        <!-- Grade Buckets (Grading Levels) -->
        <GradeBucketsSettings />


      <!-- Behavior Strategy -->
      <BehaviorSettings />

      <!-- Period Defaults -->
      <div class="setup__card">
        <h2 class="setup__card-title">Period Start Times</h2>
        <p class="setup__hint">Define the default start time for each period. These will autopopulate when creating or editing a class.</p>
        <div class="setup__period-grid">
          <div v-for="p in periodOptions" :key="p" class="setup__period-row">
            <div class="setup__period-header">
              <span class="setup__period-label">Period {{ p }}</span>
              <button v-if="p !== 1" class="setup__icon-btn setup__icon-btn--danger" @click="onRemovePeriod(p)">
                <Trash2 :size="14" />
              </button>
            </div>
            <input 
              :value="periodStartTimes[p]" 
              type="time" 
              class="setup__input" 
              @change="e => {
                const updated = { ...periodStartTimes, [p]: e.target.value };
                updatePeriodStartTimes(updated);
              }" 
            />
          </div>
        </div>
        <button class="setup__btn-ghost setup__btn--full" style="margin-top: 1rem" @click="onAddPeriod">
          <Plus :size="14" /> Add Period
        </button>
      </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 4: Data Management                                 -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'data'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
          <DatabaseMaintenanceSettings />
        </div>
      </div>
    </section>
    <!-- User Guide Modal -->
    <HelpModal :show="isHelpModalOpen" @close="isHelpModalOpen = false" />

    <!-- QR Code Generator Modal -->
    <QrCodeGeneratorModal
      v-if="isQRModalOpen"
      :show="isQRModalOpen"
      :activeClass="classToPrint"
      @close="isQRModalOpen = false"
    />

    <!-- Print Class List Modal -->
    <PrintClassListModal
      v-if="isPrintListModalOpen"
      :classRecord="classToPrint"
      :teacherName="teacherName"
      @close="isPrintListModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import Papa from 'papaparse'
import QRCode from 'qrcode'
import { 
  LayoutDashboard, 
  Zap, 
  Settings, 
  Database, 
  CalendarDays, 
  Plus, 
  PlusCircle, 
  Trash2, 
  FolderOpen, 
  Archive,
  Info,
  ExternalLink,
  Copy,
  Check,
  HelpCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  QrCode,
  Printer,
  GraduationCap,
  RefreshCcw,
  Pencil
} from 'lucide-vue-next'
import { useClassroom } from '../composables/useClassroom.js'
import { useMessage } from '../composables/useMessage.js'

import CalendarSettings from '../components/setup/CalendarSettings.vue'
import GradeBucketsSettings from '../components/setup/GradeBucketsSettings.vue'
import HelpModal from '../components/setup/HelpModal.vue'
import ClassLogisticsSettings from '../components/setup/ClassLogisticsSettings.vue'
import DatabaseMaintenanceSettings from '../components/setup/DatabaseMaintenanceSettings.vue'
import CsvHelpGuide from '../components/setup/CsvHelpGuide.vue'
import BehaviorSettings from '../components/setup/BehaviorSettings.vue'
import PrintClassListModal from '../components/PrintClassListModal.vue'
import QrCodeGeneratorModal from '../components/setup/QrCodeGeneratorModal.vue'
import SetupQuickJumpNav from '../components/setup/SetupQuickJumpNav.vue'

const { alert, confirm } = useMessage()

const {
  classList,
  archivedClasses,
  activeClass,
  teacherName,
  attendanceMode,
  latenessGracePeriod,
  periodStartTimes,
  switchClass,
  createClass,
  archiveClass,
  restoreClass,
  deleteClass,
  updateTeacherName,
  updatePeriodStartTimes,
  updateAttendanceConfig,
  markAllPresentToday,
  termOptions,
  periodOptions,
  cloudModeEnabled,
  userCode,
  updateCloudConfig,
  generateUniqueUserCode,
  selectedYear,
  selectedSemester,
  filteredClassList,
  filteredArchivedClasses,
  bulkImportClasses,
  importRoster,
  moveStudentFromClass,
  autoStartRFID
} = useClassroom()

const isHelpModalOpen = ref(false)
const isCsvHelpOpen = ref(false)
const showAllSessions = ref(false)
const isArchivedPanelVisible = ref(false)

// --- Cloud Mode config ---
const localCloudMode = ref(cloudModeEnabled.value)
const localUserCode = ref(userCode.value)
watch(cloudModeEnabled, (v) => { localCloudMode.value = v }, { immediate: true })
watch(userCode, (v) => { localUserCode.value = v }, { immediate: true })

async function saveCloudConfig() {
  if (localCloudMode.value && !localUserCode.value.trim()) {
    localUserCode.value = await generateUniqueUserCode()
  }
  await updateCloudConfig(localCloudMode.value, localUserCode.value.trim().toUpperCase())
}

async function regenerateUserCode() {
  localUserCode.value = await generateUniqueUserCode()
  await saveCloudConfig()
}

const scanStationUrl = computed(() => {
  return `${window.location.origin}/scan`
})
const urlCopied = ref(false)
async function copyScanStationUrl() {
  try {
    await navigator.clipboard.writeText(scanStationUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

// --- Profile / Teacher settings ---
const localTeacherName = ref(teacherName.value)
watch(teacherName, (v) => { localTeacherName.value = v }, { immediate: true })
async function saveTeacherName() { await updateTeacherName(localTeacherName.value) }

// --- Attendance configuration ---
const localAttendanceMode = ref(attendanceMode.value)
const localGracePeriod = ref(latenessGracePeriod.value)

watch(attendanceMode, (v) => { localAttendanceMode.value = v }, { immediate: true })
watch(latenessGracePeriod, (v) => { localGracePeriod.value = v }, { immediate: true })

const isAttendanceModeModalOpen = ref(false)
const pendingAttendanceMode = ref(null)
const radioGroupKey = ref(0)

function onAttendanceModeChange(newMode) {
  if (newMode === localAttendanceMode.value) return
  pendingAttendanceMode.value = newMode
  isAttendanceModeModalOpen.value = true
}

async function confirmAttendanceModeChange() {
  localAttendanceMode.value = pendingAttendanceMode.value
  await updateAttendanceConfig(localAttendanceMode.value, localGracePeriod.value)
  isAttendanceModeModalOpen.value = false
  pendingAttendanceMode.value = null
}

function cancelAttendanceModeChange() {
  isAttendanceModeModalOpen.value = false
  pendingAttendanceMode.value = null
  localAttendanceMode.value = attendanceMode.value
  radioGroupKey.value++
}

async function saveAttendanceConfig() {
  await updateAttendanceConfig(localAttendanceMode.value, localGracePeriod.value)
}

async function onMarkAllPresent() {
  if (!activeClass.value) return
  const confirmed = await confirm(`Are you sure you want to mark all students present in ${activeClass.value.name} for today? This will clear all absences and late markers logged today.`)
  if (confirmed) {
    await markAllPresentToday(activeClass.value.classId)
  }
}

// --- Class switcher & Creation ---
const props = defineProps({
  tab: { type: String, default: 'classes' },
  from: { type: String, default: '' }
})
const emit = defineEmits(['navigate'])

const setupTabs = [
  { id: 'manage',   label: 'Class Manager',  icon: LayoutDashboard },
  { id: 'active',   label: 'Class Settings', icon: Zap },
  { id: 'calendar', label: 'Calendar',       icon: CalendarDays },
  { id: 'app',      label: 'App Settings',   icon: Settings },
  { id: 'data',     label: 'Data',           icon: Database },
]

const tabMap = { 
  'classes': 'manage', 
  'roster': 'active', 
  'gradebook': 'active', 
  'codes': 'app', 
  'backup': 'app' 
}
const activeTab = ref(tabMap[props.tab] || 'manage')

watch(() => props.tab, (newTab) => {
  if (newTab) activeTab.value = newTab
})

const newClass = reactive({ 
  name: '', 
  courseCode: '',
  periodNumber: 1, 
  periodStartTime: '08:00',
  year: '',
  semester: ''
})
const newClassTermKey = ref('')

watch(newClassTermKey, (val) => {
  if (val && val.includes('|')) {
    const [y, s] = val.split('|')
    newClass.year = y
    newClass.semester = s
  }
})

watch(() => newClass.periodNumber, (newVal) => {
  if (periodStartTimes.value[newVal]) {
    newClass.periodStartTime = periodStartTimes.value[newVal]
  }
})

async function onAddPeriod() {
  const next = Math.max(...periodOptions.value, 0) + 1
  const lastTime = periodStartTimes.value[next - 1] || '08:00'
  const [h, m] = lastTime.split(':').map(Number)
  const nextTime = new Date(0, 0, 0, h, m + 80).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  
  const updated = { ...periodStartTimes.value, [next]: nextTime }
  await updatePeriodStartTimes(updated)
}

async function onRemovePeriod(p) {
  if (p === 1) return
  if (await confirm(`Are you sure you want to remove Period ${p}? This will remove it from your settings, but existing classes will not be affected.`)) {
    const updated = { ...periodStartTimes.value }
    delete updated[p]
    await updatePeriodStartTimes(updated)
  }
}
const classError = ref('')

function studentCount(cls) {
  return Object.keys(cls?.students ?? {}).length
}

async function switchToClass(classId) {
  await switchClass(classId)
}

async function createNewClass() {
  classError.value = ''
  if (!newClass.name.trim()) { classError.value = 'Name is required.'; return }
  if (!newClass.year || !newClass.semester) { classError.value = 'Academic term required.'; return }

  const classId = `class_${Date.now()}`
  await createClass({
    classId: classId,
    name: newClass.name.trim(),
    courseCode: newClass.courseCode.trim(),
    periodNumber: newClass.periodNumber,
    periodStartTime: newClass.periodStartTime,
    year: newClass.year,
    semester: newClass.semester
  })
  
  newClass.name = ''
  newClass.courseCode = ''
  newClass.periodNumber = 1
  newClass.periodStartTime = periodStartTimes.value[1] || '08:00'
}

async function onArchiveClass(classId) {
  await archiveClass(classId)
}

async function onRestoreClass(classId) {
  await restoreClass(classId)
}

async function onDeleteClass(classId) {
  const cls = archivedClasses.value.find(c => c.classId === classId)
  const name = cls?.name ?? 'this class'
  
  if (!await confirm(
    `You are about to PERMANENTLY wipe "${name}" and all its historical data. This action is irreversible. Please type the name of the class below to confirm.`, 
    'Final Security Check', 
    { danger: true, requireText: name }
  )) return

  await deleteClass(classId)
}

// --- Bulk CSV Setup Wizard ---
const importResult = ref(null)
const crossClassConflicts = ref([])
const bulkImportGroups = ref(null)
let _pendingConflicts = []
const isDraggingRoster = ref(false)
const newPeriodsDetected = ref([])

function cleanPeriod(raw) {
  if (!raw) return '1'
  const match = raw.toString().match(/^(\d+)/)
  return match ? match[1] : raw.toString()
}

function extractCourseCode(raw) {
  if (!raw) return ''
  const base = raw.toString().split('-')[0].trim()
  return base.length > 5 ? base.slice(0, 5) : base
}

function extractYearFromPeriod(raw) {
  if (!raw) return null
  const match = raw.toString().match(/\(Y(\d+)\)/i)
  if (match) {
    const yy = match[1]
    const fullYear = 2000 + parseInt(yy)
    return `${fullYear}-${(fullYear + 1).toString().slice(-2)}`
  }
  return null
}

function normalizeSemester(raw) {
  if (!raw) return '1'
  const str = raw.toString().toLowerCase()
  if (str.includes('2')) return '2'
  return '1'
}

const currentSchoolYear = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  if (month >= 8) return `${year}-${(year + 1).toString().slice(-2)}`
  return `${year - 1}-${year.toString().slice(-2)}`
})

function onFileSelected(evt) {
  const file = evt.dataTransfer?.files?.[0] || evt.target?.files?.[0]
  if (!file) return

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data.map(row => {
        const studentId = row['Student ID'] ?? row['Student Number'] ?? row['StudentID'] ?? row['student_id'] ?? ''
        let firstName = row['First Name'] ?? row['FirstName'] ?? row['first_name'] ?? ''
        let lastName  = row['Last Name']  ?? row['LastName']  ?? row['last_name']  ?? ''
        
        const studentName = row['Student Name'] ?? row['StudentName'] ?? row['student_name'] ?? ''
        if (!firstName && !lastName && studentName) {
          const parts = studentName.split(',')
          if (parts.length >= 2) {
            lastName  = parts[0]
            firstName = parts.slice(1).join(',')
          } else {
            lastName = studentName
          }
        }
        const studentEmail = row['Student eMail'] ?? row['Student Email'] ?? ''
        const custody = row['Custody'] ?? ''
        const livingWith = row['Living With'] ?? ''
        const birthDate = row['Birth'] ?? ''

        const parentContacts = []
        for (let i = 1; i <= 4; i++) {
          const pName = row[`Par${i} Name`] ?? ''
          const pEmail = row[`Par${i} eMail`] ?? ''
          const pPhone = row[`Par${i} Mobile`] || row[`Par${i} Home`] || ''
          
          if (pName || pEmail || pPhone) {
            parentContacts.push({ name: pName.trim(), email: pEmail.trim(), phone: pPhone.trim() })
          }
        }

        const rawSem = row['Semester'] ?? row['Sem'] ?? row['Schedule'] ?? ''
        const rawPeriod = row['Period'] ?? ''
        const rawSection = row['Section'] ?? row['Sec Section'] ?? ''
        
        const detectedYear = extractYearFromPeriod(rawPeriod || rawSection)
        const year = row['Year'] ?? detectedYear ?? (activeClass.value?.year || currentSchoolYear.value)
        
        const periodNumber = (rawPeriod || rawSection) ? cleanPeriod(rawPeriod || rawSection) : (activeClass.value?.periodNumber || '1')
        const courseCode = row['Course Code'] ?? row['CourseCode'] ?? (rawSection ? extractCourseCode(rawSection) : '')
        const semester = normalizeSemester(rawSem || (activeClass.value?.semester || '1'))

        return { 
          studentId: studentId.trim(), 
          firstName: firstName.trim(), 
          lastName: lastName.trim(),
          parentContacts,
          studentEmail: studentEmail.trim(),
          custody: custody.trim(),
          livingWith: livingWith.trim(),
          birthDate: birthDate.trim(),
          semester,
          periodNumber,
          year,
          courseCode
        }
      })

      const groups = {}
      for (const row of rows) {
          const key = `${row.year}-${row.semester}-P${row.periodNumber}`
          if (!groups[key]) {
              groups[key] = {
                  name: `Period ${row.periodNumber} — ${row.year}`,
                  year: row.year,
                  semester: row.semester,
                  periodNumber: row.periodNumber,
                  periodStartTime: periodStartTimes.value[row.periodNumber] || '08:00',
                  courseCode: row.courseCode,
                  students: [],
                  selected: true
              }
          }
          groups[key].students.push(row)
      }

      const detectedPeriods = [...new Set(rows.map(r => Number(r.periodNumber)))].filter(p => !isNaN(p))
      const missingPeriods = detectedPeriods.filter(p => !periodOptions.value.includes(p))
      
      if (missingPeriods.length > 0) {
        const updated = { ...periodStartTimes.value }
        missingPeriods.forEach(p => {
          const prev = p - 1
          const lastTime = updated[prev] || '08:00'
          const [h, m] = lastTime.split(':').map(Number)
          updated[p] = new Date(0, 0, 0, h, m + 80).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        })
        await updatePeriodStartTimes(updated)
        newPeriodsDetected.value = missingPeriods.sort((a, b) => a - b)
      } else {
        newPeriodsDetected.value = []
      }

      const groupKeys = Object.keys(groups)
      if (groupKeys.length > 1) {
          bulkImportGroups.value = groups
      } else {
          if (!activeClass.value) {
            await alert('This CSV contains only one class group. Please select or create a class first, then re-import. Alternatively, make sure your CSV contains a "Period" or "Semester" column so the bulk importer can detect multiple classes.')
            return
          }
          const result = await importRoster(rows)
          importResult.value = result
      }
    },
    error: (err) => {
      importResult.value = { error: err.message, inserted: 0, updated: 0, skipped: [], crossClassConflicts: [] }
    },
  })

  if (evt.target && evt.target.value !== undefined) {
    evt.target.value = ''
  }
}

const bulkImportSemesters = computed(() => {
  if (!bulkImportGroups.value) return []
  const entries = Object.entries(bulkImportGroups.value).map(([key, group]) => ({ key, group }))
  const semOrder = (s) => s === 'Full' ? 99 : Number(s)
  const sems = [...new Set(entries.map(e => e.group.semester))].sort((a, b) => semOrder(a) - semOrder(b))
  return sems.map(sem => ({
    label: sem === 'Full' ? 'Full Year' : `Semester ${sem}`,
    groups: entries
      .filter(e => e.group.semester === sem)
      .sort((a, b) => Number(a.group.periodNumber) - Number(b.group.periodNumber))
  }))
})

const isAllSelected = computed(() => {
  if (!bulkImportGroups.value) return false
  const keys = Object.keys(bulkImportGroups.value)
  return keys.every(k => bulkImportGroups.value[k].selected)
})

const selectedBulkCount = computed(() => {
  if (!bulkImportGroups.value) return 0
  return Object.values(bulkImportGroups.value).filter(g => g.selected).length
})

function toggleAllBulk() {
  const target = !isAllSelected.value
  for (const k in bulkImportGroups.value) {
    bulkImportGroups.value[k].selected = target
  }
}

const bulkAvailableSemesters = computed(() => {
  if (!bulkImportGroups.value) return []
  const sems = new Set(Object.values(bulkImportGroups.value).map(g => g.semester))
  return [...sems].filter(s => s !== 'Full').sort((a, b) => Number(a) - Number(b))
})

function isSemesterAllSelected(sem) {
  if (!bulkImportGroups.value) return false
  return Object.values(bulkImportGroups.value)
    .filter(g => g.semester === sem)
    .every(g => g.selected)
}

function selectSemesterBulk(sem) {
  const target = !isSemesterAllSelected(sem)
  for (const k in bulkImportGroups.value) {
    if (bulkImportGroups.value[k].semester === sem) {
      bulkImportGroups.value[k].selected = target
    }
  }
}

function isExistingClass(group) {
  return classList.value.some(c => 
    c.year === group.year && 
    c.semester === group.semester && 
    Number(c.periodNumber) === Number(group.periodNumber)
  )
}

async function confirmBulkImport() {
  const selectedGroups = Object.values(bulkImportGroups.value).filter(g => g.selected)
  if (selectedGroups.length === 0) return
  
  await bulkImportClasses(selectedGroups)
  bulkImportGroups.value = null
  importResult.value = { inserted: 'Multiple', updated: 'Classes', skipped: [] }
  await alert('Bulk import complete!')
}

// --- QR Generation / Printing State & Methods ---
const isQRModalOpen = ref(false)
const qrCodes = ref([])
const isGeneratingQRs = ref(false)
const isSystemPrinting = ref(false)

const isPrintListModalOpen = ref(false)
const classToPrint = ref(null)

watch(isSystemPrinting, (newValue) => {
  if (newValue) {
    document.body.classList.add('is-printing')
  } else {
    document.body.classList.remove('is-printing')
  }
})

function openQRGenerator(clsRecord = null) {
  classToPrint.value = clsRecord || activeClass.value
  isQRModalOpen.value = true
}

function openPrintList(cls) {
  classToPrint.value = cls
  isPrintListModalOpen.value = true
}

function classNameById(classId) {
  return classList.value.find(c => c.classId === classId)?.name ?? classId
}

async function resolveConflicts(action) {
  if (action === 'move') {
    for (const conflict of _pendingConflicts) {
      await moveStudentFromClass(conflict.existingClassId, conflict.student)
    }
  }
  crossClassConflicts.value = []
  _pendingConflicts = []
}

onMounted(async () => {
    if (selectedYear.value && selectedSemester.value) {
      newClassTermKey.value = `${selectedYear.value}|${selectedSemester.value}`
    } else if (termOptions.value.length > 0) {
      newClassTermKey.value = `${termOptions.value[0].year}|${termOptions.value[0].semester}`
    }

    if (periodStartTimes.value[newClass.periodNumber]) {
      newClass.periodStartTime = periodStartTimes.value[newClass.periodNumber]
    }

    if (!activeClass.value && classList.value.length > 0) {
      await switchToClass(classList.value[0].classId)
    }
})
</script>
<style src="../assets/styles/setup.css"></style>
