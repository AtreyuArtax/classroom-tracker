<template>
  <div class="setup">
    <!-- ── Page Header & Class Selector ───────────────────────────── -->
    <div class="setup__header">
      <div class="setup__header-left">
        <button v-if="props.from === 'Grades'" class="app-back-btn" @click="$emit('navigate', 'Grades')">
          <ArrowLeft :size="15" /> Back to Gradebook
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
              {{ cls.classType === 'elementary' ? cls.name : `${cls.name} (P${cls.periodNumber})` }}
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
    <!-- PILLAR 1: All Classes (Class Manager)                     -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-if="activeTab === 'manage'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
        <!-- 1. All Classes Directory -->
        <div class="setup__card" id="sec-classes">
          <div class="setup__card-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 12px;">
            <div>
              <h2 class="setup__card-title" style="margin-bottom: 2px;">Manage Classes</h2>
              <p class="setup__hint" style="margin: 0;">Click any class to configure its roster, gradebook framework, and seating.</p>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
              <label class="setup__label setup__label--checkbox setup__show-all" style="margin: 0;">
                <input type="checkbox" v-model="showAllSessions" />
                Show All Sessions
              </label>
              <button 
                v-if="(showAllSessions ? modeAllClasses : filteredClassList).length > 0"
                class="setup__btn-primary" 
                @click="isAddClassModalOpen = true"
              >
                <Plus :size="16" /> Add / Import Class
              </button>
            </div>
          </div>

          <div v-if="(showAllSessions ? modeAllClasses : filteredClassList).length === 0" class="setup__empty" style="padding: 3.5rem 1.5rem; text-align: center;">
            <FolderOpen :size="48" style="opacity: 0.35; margin-bottom: 1rem; color: var(--primary);" />
            <h3 style="margin-bottom: 6px; font-size: 1.15rem; color: var(--text);">No Classes for This Session</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 440px; margin: 0 auto 1.5rem; line-height: 1.5;">
              Get started by importing your board-provided roster CSV or creating your first class for this school year.
            </p>
            <button class="setup__btn-primary" style="padding: 0 20px; min-height: 40px;" @click="isAddClassModalOpen = true">
              <Plus :size="16" /> Add / Import Class
            </button>
          </div>

          <ul v-else class="setup__class-list">
            <li
              v-for="cls in (showAllSessions ? modeAllClasses : filteredClassList)"
              :key="cls.classId"
              class="setup__class-item setup__class-item--clickable"
              :class="{ 'setup__class-item--active': cls.classId === activeClass?.classId }"
              @click="selectAndOpenClass(cls.classId)"
              style="cursor: pointer;"
            >
              <div style="min-width: 0;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="setup__class-name">{{ cls.name }}</span>
                  <span v-if="cls.classId === activeClass?.classId" class="setup__badge setup__badge--new" style="font-size: 0.7rem; padding: 2px 6px;">Active</span>
                  <span v-if="cls.courseCode" class="setup__chip setup__chip--blue" style="font-size: 0.72rem; padding: 2px 6px;">{{ cls.courseCode }}</span>
                </div>
                <div class="setup__class-meta" style="margin-top: 2px;">
                  <template v-if="cls.classType === 'elementary'">Full Year {{ cls.year }} · {{ studentCount(cls) }} students</template>
                  <template v-else>Period {{ cls.periodNumber }} · {{ cls.year }} Sem {{ cls.semester }} · {{ studentCount(cls) }} students</template>
                </div>
              </div>
              <div class="setup__class-actions" @click.stop>
                <button class="setup__pill-btn" @click="onArchiveClass(cls.classId)">Archive</button>
              </div>
            </li>
          </ul>
        </div>

        <!-- 2. Archived Classes -->
        <div v-if="(showAllSessions ? modeAllArchivedClasses : filteredArchivedClasses).length > 0" class="setup__card setup__card--archived" id="sec-archived">
          <button class="setup__archived-toggle" @click="isArchivedPanelVisible = !isArchivedPanelVisible">
            <span class="setup__archived-label">
              <Archive :size="16" /> Archived Classes ({{ (showAllSessions ? modeAllArchivedClasses : filteredArchivedClasses).length }})
            </span>
            <span class="setup__archived-chevron"><component :is="isArchivedPanelVisible ? ChevronUp : ChevronDown" :size="16" /></span>
          </button>
          <ul v-if="isArchivedPanelVisible" class="setup__class-list setup__archived-list">
            <li v-for="cls in (showAllSessions ? modeAllArchivedClasses : filteredArchivedClasses)" :key="cls.classId" class="setup__class-item setup__class-item--archived">
              <div>
                <div class="setup__class-name">{{ cls.name }}</div>
                <div class="setup__class-meta">
                  <template v-if="cls.classType === 'elementary'">Full Year {{ cls.year }} · {{ studentCount(cls) }} students</template>
                  <template v-else>Period {{ cls.periodNumber }} · {{ cls.year }} Sem {{ cls.semester }} · {{ studentCount(cls) }} students</template>
                </div>
              </div>
              <div class="setup__class-actions">
                <button class="setup__pill-btn" @click="onRestoreClass(cls.classId)">Restore</button>
                <button class="setup__pill-btn setup__pill-btn--danger" @click="onDeleteClass(cls.classId)">Delete</button>
              </div>
            </li>
          </ul>
        </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 2: Active Class Configuration                     -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'active'" class="setup__panel">
      <ClassLogisticsSettings 
        :initial-subtab="activeClassSubtab" 
        @open-add-class="isAddClassModalOpen = true"
      />
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 3: Global App Settings                            -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'app'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
        <!-- Profile -->
        <!-- Profile & Appearance -->
        <div class="setup__card" id="sec-general-settings">
          <h2 class="setup__card-title">General Settings</h2>
          <div class="setup__form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
            <label class="setup__label">
              Teacher Name (for Reports)
              <input v-model="localTeacherName" class="setup__input" placeholder="" @blur="saveTeacherName" />
            </label>
            <div class="setup__label">
              Teaching Mode
              <div class="setup__segmented-toggle">
                <button
                  type="button"
                  class="setup__segmented-btn"
                  :class="{ 'setup__segmented-btn--active': teachingMode === 'secondary' }"
                  @click="teachingMode = 'secondary'"
                >
                  <GraduationCap :size="15" class="setup__segmented-icon" />
                  <span>Secondary (9–12)</span>
                </button>
                <button
                  type="button"
                  class="setup__segmented-btn"
                  :class="{ 'setup__segmented-btn--active': teachingMode === 'elementary' }"
                  @click="teachingMode = 'elementary'"
                >
                  <School :size="15" class="setup__segmented-icon" />
                  <span>Elementary (K–8)</span>
                </button>
              </div>
            </div>

            <div class="setup__label" style="grid-column: 1 / -1;">
              App Appearance / Theme
              <div class="setup__segmented-toggle">
                <button
                  type="button"
                  class="setup__segmented-btn"
                  :class="{ 'setup__segmented-btn--active': themePreference === 'system' }"
                  @click="setTheme('system')"
                >
                  <Monitor :size="15" class="setup__segmented-icon" />
                  <span>System (Auto)</span>
                </button>
                <button
                  type="button"
                  class="setup__segmented-btn"
                  :class="{ 'setup__segmented-btn--active': themePreference === 'light' }"
                  @click="setTheme('light')"
                >
                  <Sun :size="15" class="setup__segmented-icon" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  class="setup__segmented-btn"
                  :class="{ 'setup__segmented-btn--active': themePreference === 'dark' }"
                  @click="setTheme('dark')"
                >
                  <Moon :size="15" class="setup__segmented-icon" />
                  <span>Dark</span>
                </button>
              </div>
              <p class="setup__hint" style="margin-top: 4px; font-size: 0.76rem;">
                {{ themePreference === 'system' ? 'Automatically adapts to your device or browser light/dark setting.' : (themePreference === 'dark' ? 'Dark surfaces optimized for low-light environments.' : 'Classic bright surfaces with iOS styling.') }}
              </p>
            </div>

          </div>
        </div>

        <!-- Grade Buckets (Grading Levels) -->
        <GradeBucketsSettings />

        <!-- Behavior Strategy -->
        <BehaviorSettings />

        <!-- Elementary School Start Time -->
        <div v-if="teachingMode === 'elementary'" class="setup__card" id="sec-period-times">
          <h2 class="setup__card-title">School Start Time</h2>
          <p class="setup__hint">Define the official morning bell start time for your homeroom. This will autopopulate when creating or configuring your class.</p>
          <div style="max-width: 240px; margin-top: 12px;">
            <label class="setup__label" style="display: block; font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">Morning Bell Start Time</label>
            <input 
              :value="periodStartTimes[1] || '08:50'" 
              type="time" 
              class="setup__input" 
              @change="e => {
                const updated = { ...periodStartTimes, 1: e.target.value };
                updatePeriodStartTimes(updated);
              }" 
            />
          </div>
        </div>

        <!-- Period Defaults (Secondary / Post-Secondary Only) -->
        <div v-else class="setup__card" id="sec-period-times">
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

        <!-- Attendance & Door Station Settings -->
        <div class="setup__card" id="sec-attendance-cloud">
          <h2 class="setup__card-title">
            <GraduationCap :size="18" /> Attendance & Door Station Settings
          </h2>
          <p class="setup__hint">Configure how daily student attendance is registered and set up a secondary scanning station at your door.</p>
          
          <div class="setup__settings-grid">
            
            <!-- Left Column: Attendance Mode -->
            <div class="setup__settings-col setup__settings-col--left">
              <h3 class="setup__card-subtitle" style="margin-top: 0; margin-bottom: 4px;">Attendance Tracking Mode</h3>
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

              <!-- Show/Hide Kiosk Scanner Toggle -->
              <div class="setup__switch-container" style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border);">
                <label class="setup__switch">
                  <input type="checkbox" v-model="localShowScannerButton" @change="saveScannerConfig" />
                  <span class="setup__switch-slider"></span>
                </label>
                <span class="setup__switch-label">Show Kiosk Scanner on Dashboard</span>
              </div>

              <!-- Manual Override Reset -->
              <div v-if="activeClass" class="setup__attendance-actions" style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">Emergency Override</span>
                <button class="setup__btn-ghost" style="height: 36px; padding: 0 16px; font-size: 0.85rem; min-height: unset; width: 100%; margin: 0;" @click="onMarkAllPresent">
                  Mark All Present in {{ activeClass.name }}
                </button>
              </div>
            </div>
            
            <!-- Right Column: Dedicated Door Station -->
            <div class="setup__settings-col">
              <h3 class="setup__card-subtitle" style="margin-top: 0; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                Dedicated Door Station (Two-Device Sync)
                <span class="setup__tooltip-container" aria-label="Database Inactivity Warning">
                  <Info :size="14" class="setup__info-icon" />
                  <span class="setup__tooltip-text">
                    <strong>Inactivity Note:</strong> Supabase pauses free databases after 7 days of idle time (like Summer/Winter breaks). If it stops working, simply log into your Supabase Dashboard and click "Restore Project" to wake it up!
                  </span>
                </span>
              </h3>
              <p class="setup__hint" style="margin: 0; font-size: 0.8rem; line-height: 1.4;">
                Enable Cloud Mode to run a dedicated scanner at your classroom door (on a Chromebook, tablet, or second computer) for automated check-ins and out-of-class passes.
              </p>
              
              <div class="setup__switch-container" style="margin: 8px 0 0 0;">
                <label class="setup__switch">
                  <input type="checkbox" v-model="localCloudMode" @change="saveCloudConfig" />
                  <span class="setup__switch-slider"></span>
                </label>
                <span class="setup__switch-label">Enable Cloud Door Station</span>
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
                  Open this link on your dedicated door machine and enter your User Code:
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
            <AlertTriangle :size="20" style="color: #f59e0b;" />
            Change Attendance Mode?
          </h3>

          <div class="setup__dialog-body" style="display: flex; flex-direction: column; gap: 10px;">
            <p v-if="pendingAttendanceMode === 'rfid'">
              <strong>Switching to RFID/QR Sign-In Mode</strong> requires students to scan their card or QR code when class begins to be marked present. During active class periods, students start absent until they scan in at the door.
            </p>
            <p v-else>
              <strong>Switching to Natural Mode</strong> restores standard presence-by-default tracking without requiring door scans.
            </p>
            <div v-if="pendingAttendanceMode === 'rfid'" style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.83rem; color: var(--text-secondary); border-left: 3px solid var(--primary);">
              <strong style="color: var(--text);">Schedule-Safe:</strong> Past classes and morning prep are protected. Only active class periods within their scheduled time window will initialize check-in.
            </div>
            <div v-else style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.83rem; color: var(--text-secondary); border-left: 3px solid var(--primary);">
              <strong style="color: var(--text);">Preserve Records:</strong> Any attendance records already logged earlier today will remain intact.
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary);">Are you sure you want to switch?</p>
          </div>

          <div class="setup__dialog-actions">
            <button class="setup__btn-primary" @click="confirmAttendanceModeChange">Yes, switch mode</button>
            <button class="setup__btn-ghost" @click="cancelAttendanceModeChange">Cancel</button>
          </div>
        </div>
      </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 4: Calendar Manager                                -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <section v-else-if="activeTab === 'calendar'" class="setup__panel">
      <div class="setup__layout">
        <SetupQuickJumpNav :activeTab="activeTab" />
        <div class="setup__main-content">
          <CalendarSettings />
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- PILLAR 5: Backup & Data Management                        -->
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

    <!-- ── Global Add / Import Class Modal (accessible from any tab) ──────── -->
    <div v-if="isAddClassModalOpen" class="setup__dialog" role="dialog" aria-modal="true" aria-labelledby="add-class-modal-title">
      <div class="setup__dialog-backdrop" @click="isAddClassModalOpen = false" />
      <div class="setup__dialog-box setup__dialog-box--add-class">
        <!-- Pinned Header -->
        <div class="setup__dialog-header-sticky">
          <div>
            <h3 id="add-class-modal-title" class="setup__dialog-title" style="margin-bottom: 4px;">
              Add New Class
            </h3>
            <p class="setup__dialog-body" style="margin: 0; color: var(--text-secondary); font-size: 0.85rem;">
              Import full rosters from your student information system or create an empty class manually.
            </p>
          </div>
          <button 
            type="button" 
            class="setup__icon-btn" 
            @click="isAddClassModalOpen = false"
            style="margin-left: 8px; flex-shrink: 0;"
            title="Close"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="setup__dialog-content-scroll">
          <!-- Segmented Mode Toggle -->
          <div class="setup__segmented-toggle" style="margin-bottom: 1.25rem;">
            <button
              type="button"
              class="setup__segmented-btn"
              :class="{ 'setup__segmented-btn--active': addClassMode === 'csv' }"
              @click="addClassMode = 'csv'"
            >
              <FolderOpen :size="15" class="setup__segmented-icon" />
              <span>Bulk / Term CSV Import</span>
            </button>
            <button
              type="button"
              class="setup__segmented-btn"
              :class="{ 'setup__segmented-btn--active': addClassMode === 'manual' }"
              @click="addClassMode = 'manual'"
            >
              <Plus :size="15" class="setup__segmented-icon" />
              <span>Create Single Class</span>
            </button>
          </div>

          <!-- CSV Option -->
          <div v-if="addClassMode === 'csv'">
            <div class="setup__card setup__card--accent" style="margin-bottom: 0;">
              <p class="setup__hint" style="margin-top: 0; margin-bottom: 12px;">
                Drop your board-provided or PowerSchool CSV here to automatically detect, create, and populate classes for the new term.
              </p>
              <label 
                class="setup__file-label" 
                for="roster-file-modal"
                :class="{ 'setup__file-label--drag': isDraggingRoster }"
                @dragover.prevent="isDraggingRoster = true"
                @dragleave.prevent="isDraggingRoster = false"
                @drop.prevent="isDraggingRoster = false; onFileSelected($event)"
              >
                <FolderOpen :size="18" /> {{ isDraggingRoster ? 'Drop CSV here...' : 'Choose CSV file or drag & drop here' }}
                <input
                  id="roster-file-modal"
                  type="file"
                  accept=".csv,text/csv"
                  class="setup__file-input"
                  @change="onFileSelected"
                />
              </label>
              
              <div class="setup__csv-help-container" style="margin-top: 12px;">
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
          </div>

          <!-- Manual Option -->
          <div v-else-if="addClassMode === 'manual'">
            <form class="setup__form" @submit.prevent="createNewClass">
              <label class="setup__label">
                Class name
                <input v-model="newClass.name" class="setup__input" :placeholder="teachingMode === 'elementary' ? 'e.g. Grade 4 Homeroom' : 'e.g. Period 1 — Science'" required autofocus />
              </label>
              <label v-if="teachingMode !== 'elementary'" class="setup__label">
                Course Code (Optional)
                <input v-model="newClass.courseCode" class="setup__input" placeholder="e.g. SNC2D1" />
              </label>
              <div class="setup__form-grid">
                <label class="setup__label">
                  {{ teachingMode === 'elementary' ? 'School Year' : 'School Year and Semester' }}
                  <select v-if="teachingMode === 'elementary'" v-model="newClassYear" class="setup__input" required>
                    <option v-for="y in yearOptions" :key="y" :value="y">
                      {{ y }}
                    </option>
                  </select>
                  <select v-else v-model="newClassTermKey" class="setup__input" required>
                    <option v-for="t in termOptions" :key="t.year + t.semester" :value="t.year + '|' + t.semester">
                      {{ t.year }} Sem {{ t.semester }}
                    </option>
                  </select>
                </label>

                <label v-if="teachingMode === 'elementary'" class="setup__label">
                  Grade Level
                  <select v-model="newClassGradeLevel" class="setup__input" required>
                    <optgroup label="Single Grade">
                      <option value="Kindergarten">Kindergarten</option>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                    </optgroup>
                    <optgroup label="Split / Multi-Grade">
                      <option value="Grade 1/2">Grade 1/2 Split</option>
                      <option value="Grade 2/3">Grade 2/3 Split</option>
                      <option value="Grade 3/4">Grade 3/4 Split</option>
                      <option value="Grade 4/5">Grade 4/5 Split</option>
                      <option value="Grade 5/6">Grade 5/6 Split</option>
                      <option value="Grade 6/7">Grade 6/7 Split</option>
                      <option value="Grade 7/8">Grade 7/8 Split</option>
                    </optgroup>
                  </select>
                </label>

                <label v-if="teachingMode !== 'elementary'" class="setup__label">
                  Period
                  <select v-model="newClass.periodNumber" class="setup__input" required>
                    <option v-for="opt in periodOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </label>
                <label v-if="teachingMode !== 'elementary'" class="setup__label">
                  Start time
                  <input v-model="newClass.periodStartTime" type="time" class="setup__input" required />
                </label>
              </div>
              <p v-if="classError" class="setup__error" style="margin-top: 8px;">{{ classError }}</p>
              <div class="setup__dialog-actions" style="margin-top: 1.25rem;">
                <button type="submit" class="setup__btn-primary">Create Class</button>
                <button type="button" class="setup__btn-ghost" @click="isAddClassModalOpen = false">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
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

    <!-- ── Elementary Import Preview Dialog ─────────────────── -->
    <div v-if="elementaryPreview" class="setup__dialog" role="dialog" aria-modal="true">
      <div class="setup__dialog-box setup__dialog-box--large">
        <h3 class="setup__dialog-title">
          Import Elementary Homeroom
        </h3>

        <div class="setup__elm-preview-meta">
          <div class="setup__elm-preview-row">
            <span class="setup__elm-label">Homeroom</span>
            <span class="setup__elm-value">{{ elementaryPreview.homeroomName }}</span>
            <span v-if="elementaryPreview.existingHomeroom" class="setup__badge setup__badge--update">Update Existing</span>
            <span v-else class="setup__badge setup__badge--new">New Class</span>
          </div>
          <div v-if="previewSubCohorts.length > 0" class="setup__elm-preview-row">
            <span class="setup__elm-label">Grades</span>
            <span class="setup__elm-value">
              <span 
                v-for="sub in previewSubCohorts" 
                :key="sub" 
                class="setup__chip setup__chip--blue"
                style="margin-right: 4px; font-size: 0.8rem;"
              >
                {{ sub }}
              </span>
            </span>
          </div>
          <div class="setup__elm-preview-row">
            <span class="setup__elm-label">School Year</span>
            <span class="setup__elm-value">{{ elementaryPreview.csvYear }}</span>
          </div>
          <div class="setup__elm-preview-row">
            <span class="setup__elm-label">Students</span>
            <span class="setup__elm-value"><strong>{{ elementaryPreview.validRows.length }}</strong> students detected</span>
          </div>
        </div>

        <p class="setup__dialog-body" style="margin-top: 0.5rem; color: #64748b; font-size: 0.875rem; line-height: 1.45;">
          The following students will be added to your homeroom roster. All standard curriculum expectations for your grade will be auto-imported into each subject. You can customize, swap (to Overall Expectations / Success Criteria), or clear them anytime in <strong>Class Settings</strong>.
        </p>

        <!-- Student preview list -->
        <div class="setup__bulk-list" style="max-height: 220px;">
          <div
            v-for="s in elementaryPreview.validRows"
            :key="s.studentId"
            class="setup__elm-student-row"
          >
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <span class="setup__elm-student-name">{{ s.lastName }}, {{ s.firstName }}</span>
              <span 
                v-if="previewSubCohorts.length > 1 && (s.gradeLevel || s.grade || s.courseCode)" 
                class="setup__chip setup__chip--blue"
                style="font-size: 0.75rem; padding: 2px 6px; flex-shrink: 0;"
              >
                {{ s.gradeLevel || s.grade || s.courseCode }}
              </span>
            </div>
            <span class="setup__elm-student-id">{{ s.studentId }}</span>
          </div>
        </div>

        <div class="setup__dialog-actions" style="margin-top: 1rem;">
          <button class="setup__btn-primary" @click="confirmElementaryImport">
            {{ elementaryPreview.existingHomeroom ? 'Update Roster' : 'Create Class & Import' }}
          </button>
          <button class="setup__btn-ghost" @click="elementaryPreview = null">Cancel</button>
        </div>
      </div>
      <div class="setup__dialog-backdrop" @click="elementaryPreview = null" />
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
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick, defineAsyncComponent } from 'vue'
import Papa from 'papaparse'
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
  School,
  RefreshCcw,
  Pencil,
  Sun,
  Moon,
  Monitor,
  X
} from 'lucide-vue-next'
import { useClassroom } from '../composables/useClassroom.js'
import { useMessage } from '../composables/useMessage.js'
import { detectGradeFromClassName } from '../composables/useElementary.js'
import { useTheme } from '../composables/useTheme.js'

const { themePreference, setTheme } = useTheme()

const CalendarSettings            = defineAsyncComponent(() => import('../components/setup/CalendarSettings.vue'))
const GradeBucketsSettings        = defineAsyncComponent(() => import('../components/setup/GradeBucketsSettings.vue'))
const HelpModal                   = defineAsyncComponent(() => import('../components/setup/HelpModal.vue'))
const ClassLogisticsSettings      = defineAsyncComponent(() => import('../components/setup/ClassLogisticsSettings.vue'))
const DatabaseMaintenanceSettings = defineAsyncComponent(() => import('../components/setup/DatabaseMaintenanceSettings.vue'))
const CsvHelpGuide                = defineAsyncComponent(() => import('../components/setup/CsvHelpGuide.vue'))
const BehaviorSettings            = defineAsyncComponent(() => import('../components/setup/BehaviorSettings.vue'))
const PrintClassListModal         = defineAsyncComponent(() => import('../components/PrintClassListModal.vue'))
const QrCodeGeneratorModal        = defineAsyncComponent(() => import('../components/setup/QrCodeGeneratorModal.vue'))
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
  showScannerButton,
  updateShowScannerButton,
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
  yearOptions,
  periodOptions,
  cloudModeEnabled,
  userCode,
  updateCloudConfig,
  generateUniqueUserCode,
  selectedYear,
  selectedSemester,
  filteredClassList,
  filteredArchivedClasses,
  modeAllClasses,
  modeAllArchivedClasses,
  bulkImportClasses,
  importRoster,
  moveStudentFromClass,
  autoStartRFID,
  teachingMode
} = useClassroom()



const isHelpModalOpen = ref(false)
const isCsvHelpOpen = ref(false)
const showAllSessions = ref(false)
const isArchivedPanelVisible = ref(false)
const isAddClassModalOpen = ref(false)
const addClassMode = ref('csv')

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
const localShowScannerButton = ref(showScannerButton.value)

watch(attendanceMode, (v) => { localAttendanceMode.value = v }, { immediate: true })
watch(latenessGracePeriod, (v) => { localGracePeriod.value = v }, { immediate: true })
watch(showScannerButton, (v) => { localShowScannerButton.value = v }, { immediate: true })

async function saveScannerConfig() {
  await updateShowScannerButton(localShowScannerButton.value)
}

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
  tab: { type: String, default: '' },
  from: { type: String, default: '' },
  openAdd: { type: Boolean, default: false }
})
const emit = defineEmits(['navigate'])

const setupTabs = [
  { id: 'active',   label: 'Active Class',    icon: Zap },
  { id: 'app',      label: 'App Settings',    icon: Settings },
  { id: 'calendar', label: 'Calendar',        icon: CalendarDays },
  { id: 'manage',   label: 'Manage Classes',  icon: FolderOpen },
  { id: 'data',     label: 'Backup & Data',   icon: Database },
]

const tabMap = { 
  'active': 'active',
  'classes': 'manage', 
  'manage': 'manage',
  'roster': 'active', 
  'gradebook': 'active', 
  'codes': 'app', 
  'app': 'app',
  'calendar': 'calendar',
  'backup': 'data',
  'data': 'data'
}

function resolveDefaultTab() {
  if (props.tab && tabMap[props.tab]) return tabMap[props.tab]
  if (classList.value.length === 0) return 'manage'
  return 'active'
}

const activeTab = ref(resolveDefaultTab())

const activeClassSubtab = computed(() => {
  if (props.tab === 'gradebook') return 'grading'
  if (props.tab === 'roster') return 'students'
  return 'logistics'
})

watch(() => props.tab, (newTab) => {
  if (newTab) activeTab.value = tabMap[newTab] || newTab
})

watch(() => props.openAdd, (shouldOpen) => {
  if (shouldOpen) {
    isAddClassModalOpen.value = true
  }
}, { immediate: true })

const newClass = reactive({ 
  classType: 'secondary',
  name: '', 
  courseCode: '',
  periodNumber: 1, 
  periodStartTime: '08:00',
  year: '',
  semester: ''
})
const newClassTermKey = ref('')
const newClassYear = ref('')
const newClassGradeLevel = ref('Grade 7')

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

async function selectAndOpenClass(classId) {
  await switchClass(classId)
  activeTab.value = 'active'
}

async function createNewClass() {
  classError.value = ''
  if (!newClass.name.trim()) { classError.value = 'Name is required.'; return }

  const isElem = teachingMode.value === 'elementary'
  const yearToUse = isElem ? (newClassYear.value || currentSchoolYear.value) : newClass.year
  const semToUse = isElem ? '1' : newClass.semester

  if (!yearToUse || !semToUse) { classError.value = 'Academic term required.'; return }

  const classId = `class_${Date.now()}`
  await createClass({
    classId: classId,
    classType: isElem ? 'elementary' : 'secondary',
    name: newClass.name.trim(),
    courseCode: newClass.courseCode.trim(),
    gradeLevel: isElem ? (newClassGradeLevel.value || 'Grade 7') : undefined,
    periodNumber: newClass.periodNumber,
    periodStartTime: newClass.periodStartTime,
    year: yearToUse,
    semester: semToUse
  })

  newClass.name = ''
  newClass.courseCode = ''
  newClass.periodNumber = 1
  newClass.periodStartTime = periodStartTimes.value[1] || '08:00'
  isAddClassModalOpen.value = false
  await switchClass(classId)
  activeTab.value = 'active'
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

// Elementary homeroom import preview
const elementaryPreview = ref(null) // { homeroomName, csvYear, validRows, existingHomeroom }

function cleanPeriod(raw) {
  if (!raw) return '1'
  const match = raw.toString().match(/^(\d+)/)
  return match ? match[1] : raw.toString()
}

function extractCourseCode(raw) {
  if (!raw) return ''
  // SCDSB Sec Section format: "SPH3U1-2" — code is everything before the last "-N" section suffix
  const base = raw.toString().replace(/-\d+$/, '').trim()
  return base
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
  const str = raw.toString().trim()
  // Bare digit — e.g. Semester column = "2"
  if (str === '2') return '2'
  if (str === '1') return '1'
  // Full year strings like "2025-2026" are NOT semester numbers
  if (/^\d{4}-\d{2,4}$/.test(str)) return '1'
  const lower = str.toLowerCase()
  if (lower.includes('sem 2') || lower.includes('semester 2') || /\bs2\b/.test(lower) || /\bsem2\b/.test(lower)) {
    return '2'
  }
  return '1'
}


const currentSchoolYear = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  if (month >= 8) return `${year}-${(year + 1).toString().slice(-2)}`
  return `${year - 1}-${year.toString().slice(-2)}`
})

const previewSubCohorts = computed(() => {
  if (!elementaryPreview.value?.validRows) return []
  const set = new Set()
  const hrmName = elementaryPreview.value?.homeroomName?.toLowerCase()
  elementaryPreview.value.validRows.forEach(s => {
    let val = s.gradeLevel || s.grade
    if (!val && s.courseCode && s.courseCode.toLowerCase() !== hrmName) {
      val = s.courseCode
    }
    if (val) set.add(val)
  })
  return Array.from(set).sort()
})

function extractGradeFromRow(rawRow) {
  if (!rawRow) return ''
  const keys = Object.keys(rawRow)
  for (const target of ['grade level', 'gradelevel', 'grade', 'gr.', 'gr', 'yr', 'year level']) {
    const matchedKey = keys.find(k => k.trim().toLowerCase() === target)
    if (matchedKey && rawRow[matchedKey] !== undefined && rawRow[matchedKey] !== null) {
      const val = String(rawRow[matchedKey]).trim()
      if (val) return formatGradeVal(val)
    }
  }
  for (const k of keys) {
    const kLower = k.trim().toLowerCase()
    if ((kLower.startsWith('grade') || kLower.startsWith('gr')) && !kLower.includes('point') && !kLower.includes('book')) {
      const val = String(rawRow[k]).trim()
      if (val) return formatGradeVal(val)
    }
  }
  return ''
}

function formatGradeVal(rawGrade) {
  if (!rawGrade) return ''
  const gNum = parseInt(rawGrade.replace(/\D/g, ''), 10)
  if (!isNaN(gNum) && gNum >= 1 && gNum <= 12) {
    return `Grade ${gNum}`
  }
  if (rawGrade.toLowerCase().startsWith('grade')) return rawGrade
  return `Grade ${rawGrade}`
}

function onFileSelected(evt) {
  const file = evt.dataTransfer?.files?.[0] || evt.target?.files?.[0]
  if (!file) return

  isAddClassModalOpen.value = false

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data.map(row => {
        const studentId = row['Student ID'] ?? row['Student Number'] ?? row['StudentID'] ?? row['student_id'] ?? ''
        let firstName = row['First Name'] ?? row['FirstName'] ?? row['first_name'] ?? ''
        let lastName  = row['Last Name']  ?? row['LastName']  ?? row['last_name']  ?? ''
        
        const rawStudentName = (row['Student Name'] ?? row['StudentName'] ?? row['student_name'] ?? '').toString().trim()
        const hasActualLettersInName = rawStudentName.replace(/[, \t\r\n"']/g, '').length > 0
        if (!firstName && !lastName && hasActualLettersInName) {
          const parts = rawStudentName.split(',')
          if (parts.length >= 2) {
            lastName  = parts[0].trim()
            firstName = parts.slice(1).join(',').trim()
          } else {
            lastName = rawStudentName.trim()
          }
        }

        // Clean any residual punctuation
        firstName = (firstName || '').replace(/^[, \t]+|[, \t]+$/g, '').trim()
        lastName  = (lastName || '').replace(/^[, \t]+|[, \t]+$/g, '').trim()
        const studentEmail = row['Student eMail'] ?? row['Student Email'] ?? ''
        const custody = row['Custody'] ?? ''
        const livingWith = row['Living With'] ?? ''
        const birthDate = row['Birth'] ?? ''

        const parentContacts = []
        for (let i = 1; i <= 4; i++) {
          const pName = (row[`Par${i} Name`] ?? '').trim()
          const pEmail = (row[`Par${i} eMail`] ?? '').trim()
          const pMobile = (row[`Par${i} Mobile`] ?? '').trim()
          const pHome = (row[`Par${i} Home`] ?? '').trim()

          const phones = []
          if (pMobile) {
            phones.push({ type: 'Mobile', number: pMobile })
          }
          if (pHome && pHome !== pMobile) {
            phones.push({ type: 'Home', number: pHome })
          }

          if (pName || pEmail || phones.length > 0) {
            parentContacts.push({
              name: pName,
              email: pEmail,
              phone: pMobile || pHome || '',
              phones
            })
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

        const parsedG = extractGradeFromRow(row)

        return { 
          studentId: studentId.trim(), 
          firstName: firstName.trim(), 
          lastName: lastName.trim(),
          grade: parsedG,
          gradeLevel: parsedG,
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

      // Strict filter: Row MUST have a student name and a student ID.
      const validRows = rows.filter(r => {
        const cleanFirst = (r.firstName || '').replace(/[, \t\r\n"']/g, '').trim()
        const cleanLast  = (r.lastName || '').replace(/[, \t\r\n"']/g, '').trim()
        const cleanId    = (r.studentId || '').toString().trim()
        const hasName    = cleanFirst.length > 0 || cleanLast.length > 0
        return hasName && cleanId.length > 0
      })

      const groups = {}
      for (const row of validRows) {
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

      const detectedPeriods = [...new Set(validRows.map(r => Number(r.periodNumber)))].filter(p => !isNaN(p))
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

      // In Elementary mode: show preview dialog before committing anything
      if (teachingMode.value === 'elementary') {
        if (validRows.length === 0) return

        // Extract homeroom name and year directly from raw CSV rows
        const firstRaw = results.data.find(r => r['Student Number'] || r['Student Name'])
        const homeroomCode = firstRaw?.['Sec Section'] || firstRaw?.['Home Room'] || 'Homeroom'
        // Normalize: "HRM.130" → "HRM-130"
        const homeroomName = homeroomCode.replace(/\./g, '-').trim()

        // Parse year from Schedule column ("2025-2026" → "2025-26")
        const rawSchedule = firstRaw?.['Schedule'] || ''
        const yearMatch = rawSchedule.match(/(\d{4})-(\d{4})/)
        const csvYear = yearMatch ? `${yearMatch[1]}-${yearMatch[2].slice(-2)}` : currentSchoolYear.value

        // Find existing elementary class with same homeroom code + year
        const existingHomeroom = classList.value.find(c =>
          c.classType === 'elementary' &&
          c.year === csvYear &&
          (c.name === homeroomName || c.courseCode === homeroomName)
        )

        // Show preview dialog — don't commit yet
        elementaryPreview.value = { homeroomName, csvYear, validRows, existingHomeroom: existingHomeroom || null }
        return
      }

      const groupKeys = Object.keys(groups)
      if (groupKeys.length > 1) {
          bulkImportGroups.value = groups
      } else {
          if (!activeClass.value) {
            await alert('This CSV contains only one class group. Please select or create a class first, then re-import.')
            return
          }
          const result = await importRoster(validRows)
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

async function confirmElementaryImport() {
  if (!elementaryPreview.value) return
  const { homeroomName, csvYear, validRows, existingHomeroom } = elementaryPreview.value
  elementaryPreview.value = null

  if (existingHomeroom) {
    await switchClass(existingHomeroom.classId)
  } else {
    const studentGrades = [...new Set(validRows.map(r => r.gradeLevel || r.grade).filter(Boolean))]
    const autoGrade = studentGrades.length > 0
      ? (studentGrades.length > 1 ? studentGrades.sort().join('/') : studentGrades[0])
      : (detectGradeFromClassName(homeroomName) || 'Grade 7')

    await createClass({
      classId: `class_${Date.now()}`,
      name: homeroomName,
      courseCode: homeroomName,
      gradeLevel: autoGrade,
      year: csvYear,
      semester: '1',
      periodNumber: 1,
      classType: 'elementary',
    })
  }

  const result = await importRoster(validRows)
  importResult.value = result
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
    newClassYear.value = selectedYear.value || currentSchoolYear.value
    if (selectedYear.value && selectedSemester.value) {
      newClassTermKey.value = `${selectedYear.value}|${selectedSemester.value}`
    } else if (termOptions.value.length > 0) {
      newClassTermKey.value = `${termOptions.value[0].year}|${termOptions.value[0].semester}`
    }

    if (periodStartTimes.value[newClass.periodNumber]) {
      newClass.periodStartTime = periodStartTimes.value[newClass.periodNumber]
    }

    if (!activeClass.value && filteredClassList.value.length > 0) {
      await switchToClass(filteredClassList.value[0].classId)
    }

})
</script>
<style src="../assets/styles/setup.css"></style>
