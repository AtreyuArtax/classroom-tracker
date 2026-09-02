<template>
  <div class="behavior-settings">
    <!-- Behavior Thresholds Strategy Card -->
    <div class="setup__card" id="sec-app-behavior">
      <h2 class="setup__card-title">Behavior Strategy Warnings</h2>
      <p class="setup__hint">
        Define weekly limits for student washroom trips and mobile devices. 
        Exceeding these limits will trigger warning flags in room grids and student dossier logs.
      </p>
      <div class="setup__form-grid behavior-thresholds__grid">
        <label class="setup__label">
          <span class="setup__label-text">Washroom Limit</span>
          <span class="setup__label-subtext">Trips / Week</span>
          <input 
            v-model.number="editThresholds.washroomTripsPerWeek" 
            type="number" 
            min="1"
            max="20"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
        <label class="setup__label">
          <span class="setup__label-text">Weekly Time Limit</span>
          <span class="setup__label-subtext">Total Mins / Week</span>
          <input 
            v-model.number="editThresholds.washroomWeeklyMinutesLimit" 
            type="number" 
            min="5"
            max="180"
            step="5"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
        <label class="setup__label">
          <span class="setup__label-text">Extended Trip Alert</span>
          <span class="setup__label-subtext">Single Trip (Min)</span>
          <input 
            v-model.number="editThresholds.washroomDurationLimit" 
            type="number" 
            min="3"
            max="60"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
        <label class="setup__label">
          <span class="setup__label-text">Device Limit</span>
          <span class="setup__label-subtext">Incidents / Week</span>
          <input 
            v-model.number="editThresholds.deviceIncidentsPerWeek" 
            type="number" 
            min="1"
            max="20"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
        <label class="setup__label">
          <span class="setup__label-text">Academic Warning</span>
          <span class="setup__label-subtext">At-Risk Mark (%)</span>
          <input 
            v-model.number="editThresholds.atRiskThreshold" 
            type="number" 
            min="30"
            max="95"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
        <label class="setup__label">
          <span class="setup__label-text">Attendance Warning</span>
          <span class="setup__label-subtext">At-Risk Rate (%)</span>
          <input 
            v-model.number="editThresholds.attendanceThreshold" 
            type="number" 
            min="50"
            max="98"
            class="setup__input" 
            @change="saveThresholds" 
          />
        </label>
      </div>
      <div v-if="thresholdsSuccess" class="setup__success-banner">
        {{ thresholdsSuccess }}
      </div>
    </div>

    <!-- Behavior Codes Editor Card -->
    <div class="setup__card">
      <div class="setup__card-header-row">
        <div>
          <h2 class="setup__card-title">Behavior Codes & Radial Overlay Actions</h2>
          <p class="setup__hint">
            Customize 1-tap shortcuts on the main wheel and secondary 2-tap category folders. Subfolders are only created when a category has 2 or more actions.
          </p>
        </div>
        <button class="setup__btn-primary setup__btn-sm" @click="openAddModal">
          <Plus :size="14" /> Add Behavior Action
        </button>
      </div>

      <div v-if="behaviorWarning" class="setup__inline-banner setup__inline-banner--warning">
        <AlertTriangle :size="16" />
        <span>{{ behaviorWarning }}</span>
      </div>

      <!-- Capacity Alert Notice if candidate slots > 7 -->
      <div v-if="isOverflowing" class="setup__inline-banner setup__inline-banner--info">
        <Info :size="16" class="setup__banner-icon" />
        <div>
          <strong>Radial Wheel Capacity Notice:</strong> With your current configuration, your actions exceed 8 slots on the main wheel. 
          The first 6 actions will appear directly, and the remaining <strong>{{ overflowCount }} action{{ overflowCount > 1 ? 's' : '' }}</strong> are bundled inside a <strong>"••• More"</strong> folder button on the wheel. 
          You can unpin, group into categories, or hide actions if you want them directly on the main ring.
        </div>
      </div>

      <!-- ── Live Radial Menu Blueprint ── -->
      <div class="radial-blueprint">
        <div class="radial-blueprint__header">
          <div class="radial-blueprint__title">
            <Sparkles :size="14" class="radial-blueprint__icon" />
            <span>LIVE RADIAL MENU BLUEPRINT</span>
          </div>
          <span 
            class="radial-blueprint__badge"
            :class="{ 'radial-blueprint__badge--optimal': !isOverflowing, 'radial-blueprint__badge--overflow': isOverflowing }"
          >
            {{ totalWheelSlots }} / 8 Buttons on Wheel {{ isOverflowing ? '(1 Overflow Folder)' : '(Optimal Spacing)' }}
          </span>
        </div>

        <div class="radial-blueprint__slots">
          <!-- Render visible candidate slots (up to 6 if overflowing, or up to 7 if not) -->
          <template v-for="(item, idx) in blueprintVisibleSlots" :key="item.key">
            <!-- Pinned 1-Tap Action -->
            <div 
              v-if="item.type === 'pinned'" 
              class="blueprint-chip blueprint-chip--pinned"
              :title="`Slot ${idx + 1}: Pinned 1-Tap Action (${item.label})`"
            >
              <span class="blueprint-chip__num">{{ idx + 1 }}</span>
              <component :is="resolveIcon(item.icon)" :size="13" />
              <span class="blueprint-chip__label">{{ item.label }}</span>
            </div>

            <!-- Singletons (Auto-Promoted 1-Tap Action) -->
            <div 
              v-else-if="item.type === 'singleton'" 
              class="blueprint-chip blueprint-chip--singleton"
              :title="`Slot ${idx + 1}: 1-Tap Direct Action (${item.label} - only action in ${getCategoryLabel(item.category)})`"
            >
              <span class="blueprint-chip__num">{{ idx + 1 }}</span>
              <component :is="resolveIcon(item.icon)" :size="13" />
              <span class="blueprint-chip__label">{{ item.label }}</span>
            </div>

            <!-- Multi-Item Category Folder -->
            <div 
              v-else-if="item.type === 'folder'" 
              class="blueprint-chip blueprint-chip--folder"
              :title="`Slot ${idx + 1}: 2-Tap Sub-Menu Folder (${item.items.length} actions inside)`"
            >
              <span class="blueprint-chip__num">{{ idx + 1 }}</span>
              <Folder :size="13" />
              <span class="blueprint-chip__label">{{ item.label }} Folder ({{ item.items.length }})</span>
            </div>
          </template>

          <!-- Overflow '••• More' Chip (if candidate items > 7) -->
          <div 
            v-if="isOverflowing" 
            class="blueprint-chip blueprint-chip--overflow"
            :title="`Slot 7: Overflow Folder (${overflowCount} excess action${overflowCount > 1 ? 's' : ''} inside)`"
          >
            <span class="blueprint-chip__num">7</span>
            <MoreHorizontal :size="13" />
            <span class="blueprint-chip__label">More Folder ({{ overflowCount }})</span>
          </div>

          <!-- Permanent Profile Button -->
          <div 
            class="blueprint-chip blueprint-chip--profile" 
            :title="`Slot ${totalWheelSlots}: Permanent System Anchor (Opens Student Dossier)`"
          >
            <span class="blueprint-chip__num">{{ totalWheelSlots }}</span>
            <User :size="13" />
            <span class="blueprint-chip__label">Profile 👤</span>
          </div>

          <!-- Open Slots (if < 8 total) -->
          <div 
            v-for="n in Math.max(0, 8 - totalWheelSlots)" 
            :key="'empty-' + n" 
            class="blueprint-chip blueprint-chip--empty"
            title="Open slot available on radial wheel"
          >
            <span class="blueprint-chip__label">+ Open Slot</span>
          </div>
        </div>
      </div>

      <!-- ── SECTION 1: PINNED (1-TAP MAIN WHEEL) ── -->
      <div class="radial-group">
        <div class="radial-group__header">
          <div class="radial-group__title-wrap">
            <span class="radial-group__badge radial-group__badge--pinned">⭐ 1-TAP MAIN WHEEL</span>
            <h3 class="radial-group__title">Pinned Quick-Actions</h3>
          </div>
          <span class="radial-group__count">{{ pinnedCodes.length }} Pinned Actions</span>
        </div>

        <div v-if="pinnedCodes.length === 0" class="radial-group__empty">
          <span>No actions explicitly pinned. Active actions will auto-place on the wheel or into category folders.</span>
        </div>

        <ul v-else class="setup__code-list">
          <li v-for="(code, idx) in pinnedCodes" :key="code.codeKey" class="setup__code-item">
            <div class="setup__code-left">
              <span class="setup__code-order-badge" :title="`Slot ${idx + 1} on wheel`">#{{ idx + 1 }}</span>
              <span class="setup__code-icon-badge">
                <component :is="resolveIcon(code.icon)" :size="16" />
              </span>
              <div class="setup__code-details">
                <div class="setup__code-title-row">
                  <strong>{{ code.label }}</strong> 
                  <span class="setup__code-key">({{ code.codeKey }})</span>
                </div>
                <div class="setup__code-tags">
                  <span class="setup__tag-badge" :class="`setup__tag-badge--${getCategoryTheme(code.category)}`">
                    {{ getCategoryLabel(code.category) }}
                  </span>
                  <span class="setup__tag-badge setup__tag-badge--pin">
                    <Pin :size="10" /> 1-Tap Pinned
                  </span>
                  <span v-if="isCodeOverflowing(code.codeKey)" class="setup__tag-badge setup__tag-badge--overflow-item">
                    <MoreHorizontal :size="10" /> Inside More Button
                  </span>
                  <span v-if="code.requiresNote" class="setup__tag-badge setup__tag-badge--note">
                    <NotebookPen :size="10" /> Notes Req.
                  </span>
                </div>
              </div>
            </div>

            <div class="setup__code-actions">
              <!-- Reorder Buttons -->
              <div class="setup__order-btns">
                <button 
                  class="setup__icon-btn" 
                  :disabled="idx === 0" 
                  @click="movePinned(code, 'up')" 
                  title="Move earlier on wheel"
                >
                  <ChevronUp :size="14" />
                </button>
                <button 
                  class="setup__icon-btn" 
                  :disabled="idx === pinnedCodes.length - 1" 
                  @click="movePinned(code, 'down')" 
                  title="Move later on wheel"
                >
                  <ChevronDown :size="14" />
                </button>
              </div>

              <!-- Unpin Button -->
              <button 
                class="setup__pill-btn setup__pill-btn--active" 
                @click="togglePin(code)" 
                title="Unpin from main wheel"
              >
                <PinOff :size="12" /> Unpin
              </button>

              <!-- Hide Button -->
              <button 
                class="setup__icon-btn" 
                @click="toggleActive(code)" 
                title="Hide from radial menu entirely"
              >
                <Eye :size="14" />
              </button>

              <!-- Edit Button -->
              <button class="setup__icon-btn" @click="editCode(code)" title="Edit action">
                <Pencil :size="14" />
              </button>

              <!-- Delete Button -->
              <button 
                class="setup__icon-btn setup__icon-btn--danger" 
                :disabled="isSystemCode(code.codeKey)" 
                @click="deleteCode(code.codeKey)" 
                title="Delete action"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- ── SECTION 2A: AUTO 1-TAP SINGLETONS (NO SUBFOLDER NEEDED) ── -->
      <div v-if="singletonCodes.length > 0" class="radial-group">
        <div class="radial-group__header">
          <div class="radial-group__title-wrap">
            <span class="radial-group__badge radial-group__badge--single">⚡ 1-TAP DIRECT (SINGLETONS)</span>
            <h3 class="radial-group__title">Direct Category Actions</h3>
          </div>
          <span class="radial-group__count">{{ singletonCodes.length }} Action{{ singletonCodes.length > 1 ? 's' : '' }} (No Subfolder Needed)</span>
        </div>

        <p class="radial-group__subhint">
          Because these categories only have 1 active action, they appear directly on the main wheel as fast 1-tap shortcuts rather than wasting a subfolder!
        </p>

        <ul class="setup__code-list">
          <li v-for="code in singletonCodes" :key="code.codeKey" class="setup__code-item">
            <div class="setup__code-left">
              <span class="setup__code-icon-badge">
                <component :is="resolveIcon(code.icon)" :size="16" />
              </span>
              <div class="setup__code-details">
                <div class="setup__code-title-row">
                  <strong>{{ code.label }}</strong> 
                  <span class="setup__code-key">({{ code.codeKey }})</span>
                </div>
                <div class="setup__code-tags">
                  <span class="setup__tag-badge" :class="`setup__tag-badge--${getCategoryTheme(code.category)}`">
                    {{ getCategoryLabel(code.category) }}
                  </span>
                  <span class="setup__tag-badge setup__tag-badge--single">
                    <Sparkles :size="10" /> 1-Tap Direct
                  </span>
                  <span v-if="isCodeOverflowing(code.codeKey)" class="setup__tag-badge setup__tag-badge--overflow-item">
                    <MoreHorizontal :size="10" /> Inside More Button
                  </span>
                  <span v-if="code.requiresNote" class="setup__tag-badge setup__tag-badge--note">
                    <NotebookPen :size="10" /> Notes Req.
                  </span>
                </div>
              </div>
            </div>

            <div class="setup__code-actions">
              <!-- Pin to Main Wheel Button -->
              <button 
                class="setup__pill-btn" 
                @click="togglePin(code)" 
                title="Explicitly pin to main wheel"
              >
                <Pin :size="12" /> Pin
              </button>

              <!-- Hide Button -->
              <button 
                class="setup__icon-btn" 
                @click="toggleActive(code)" 
                title="Hide from radial menu"
              >
                <Eye :size="14" />
              </button>

              <!-- Edit Button -->
              <button class="setup__icon-btn" @click="editCode(code)" title="Edit action">
                <Pencil :size="14" />
              </button>

              <!-- Delete Button -->
              <button 
                class="setup__icon-btn setup__icon-btn--danger" 
                :disabled="isSystemCode(code.codeKey)" 
                @click="deleteCode(code.codeKey)" 
                title="Delete action"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- ── SECTION 2B: CATEGORY DRILL-DOWN FOLDERS (2-TAP SUB-MENUS) ── -->
      <div class="radial-group">
        <div class="radial-group__header">
          <div class="radial-group__title-wrap">
            <span class="radial-group__badge radial-group__badge--folder">📁 2-TAP SUB-MENUS</span>
            <h3 class="radial-group__title">Category Drill-Down Folders</h3>
          </div>
          <span class="radial-group__count">
            {{ Object.keys(multiItemCategoryGroups).length }} Folder{{ Object.keys(multiItemCategoryGroups).length !== 1 ? 's' : '' }} on Wheel
          </span>
        </div>

        <div v-if="Object.keys(multiItemCategoryGroups).length === 0" class="radial-group__empty">
          <Check :size="16" />
          <span>No multi-item subfolders needed. All active actions fit directly on the 1-tap main wheel!</span>
        </div>

        <div v-else class="radial-category-accordion">
          <div 
            v-for="group in Object.values(multiItemCategoryGroups)" 
            :key="group.key"
            class="radial-cat-card"
          >
            <div class="radial-cat-card__header">
              <div class="radial-cat-card__title-row">
                <Folder :size="16" class="radial-cat-card__icon" />
                <span class="radial-cat-card__name">{{ group.label }} Folder</span>
                <span class="radial-cat-card__hint">
                  (Creates <strong>1 button</strong> on wheel &rarr; reveals {{ group.items.length }} actions)
                </span>
                <span v-if="isFolderOverflowing(group.key)" class="setup__tag-badge setup__tag-badge--overflow-item">
                  <MoreHorizontal :size="10" /> Inside More Button
                </span>
              </div>
            </div>

            <ul class="setup__code-list setup__code-list--nested">
              <li v-for="code in group.items" :key="code.codeKey" class="setup__code-item">
                <div class="setup__code-left">
                  <span class="setup__code-icon-badge">
                    <component :is="resolveIcon(code.icon)" :size="16" />
                  </span>
                  <div class="setup__code-details">
                    <div class="setup__code-title-row">
                      <strong>{{ code.label }}</strong> 
                      <span class="setup__code-key">({{ code.codeKey }})</span>
                    </div>
                    <div class="setup__code-tags">
                      <span class="setup__tag-badge" :class="`setup__tag-badge--${getCategoryTheme(code.category)}`">
                        {{ getCategoryLabel(code.category) }}
                      </span>
                      <span class="setup__tag-badge setup__tag-badge--sub">
                        <Folder :size="10" /> 2-Tap Folder
                      </span>
                      <span v-if="code.requiresNote" class="setup__tag-badge setup__tag-badge--note">
                        <NotebookPen :size="10" /> Notes Req.
                      </span>
                    </div>
                  </div>
                </div>

                <div class="setup__code-actions">
                  <!-- Pin to Main Wheel Button -->
                  <button 
                    class="setup__pill-btn" 
                    @click="togglePin(code)" 
                    title="Promote to 1-tap main wheel"
                  >
                    <Pin :size="12" /> Pin to Main
                  </button>

                  <!-- Hide Button (Dissolves Folder if only 1 remains) -->
                  <button 
                    class="setup__icon-btn" 
                    @click="toggleActive(code)" 
                    title="Hide from radial menu (dissolves folder if 1 remains)"
                  >
                    <Eye :size="14" />
                  </button>

                  <!-- Edit Button -->
                  <button class="setup__icon-btn" @click="editCode(code)" title="Edit action">
                    <Pencil :size="14" />
                  </button>

                  <!-- Delete Button -->
                  <button 
                    class="setup__icon-btn setup__icon-btn--danger" 
                    :disabled="isSystemCode(code.codeKey)" 
                    @click="deleteCode(code.codeKey)" 
                    title="Delete action"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- ── SECTION 3: HIDDEN / INACTIVE ACTIONS ── -->
      <div v-if="hiddenCodes.length > 0" class="radial-group">
        <div class="radial-group__header">
          <div class="radial-group__title-wrap">
            <span class="radial-group__badge radial-group__badge--hidden">👁️‍🗨️ HIDDEN FROM RADIAL</span>
            <h3 class="radial-group__title">Disabled Actions</h3>
          </div>
          <span class="radial-group__count">{{ hiddenCodes.length }} Hidden (0 buttons on wheel)</span>
        </div>

        <ul class="setup__code-list setup__code-list--hidden">
          <li v-for="code in hiddenCodes" :key="code.codeKey" class="setup__code-item setup__code-item--disabled">
            <div class="setup__code-left">
              <span class="setup__code-icon-badge setup__code-icon-badge--muted">
                <component :is="resolveIcon(code.icon)" :size="16" />
              </span>
              <div class="setup__code-details">
                <div class="setup__code-title-row">
                  <strong>{{ code.label }}</strong> 
                  <span class="setup__code-key">({{ code.codeKey }})</span>
                </div>
                <div class="setup__code-tags">
                  <span class="setup__tag-badge setup__tag-badge--cat">{{ getCategoryLabel(code.category) }}</span>
                  <span class="setup__tag-badge setup__tag-badge--disabled">Hidden</span>
                </div>
              </div>
            </div>

            <div class="setup__code-actions">
              <!-- Re-Enable Button -->
              <button 
                class="setup__pill-btn setup__pill-btn--enable" 
                @click="toggleActive(code)" 
                title="Enable and restore to radial menu"
              >
                <Eye :size="12" /> Enable
              </button>

              <!-- Edit Button -->
              <button class="setup__icon-btn" @click="editCode(code)" title="Edit action">
                <Pencil :size="14" />
              </button>

              <!-- Delete Button -->
              <button 
                class="setup__icon-btn setup__icon-btn--danger" 
                :disabled="isSystemCode(code.codeKey)" 
                @click="deleteCode(code.codeKey)" 
                title="Delete action"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </li>
        </ul>
      </div>

    </div>

    <!-- ── Behavior Code Form Modal ─── -->
    <BaseModal
      :show="isModalOpen"
      @close="closeModal"
      max-width="500px"
      :title="isEditing ? 'Edit Behavior Action' : 'Add Behavior Action'"
    >
      <form class="setup__form" @submit.prevent="saveCode">
        <div v-if="modalError" class="setup__inline-banner setup__inline-banner--warning" style="margin-bottom: 12px;">
          <AlertTriangle :size="16" />
          <span>{{ modalError }}</span>
        </div>
        <div class="setup__form-grid">
          <label class="setup__label">
            Code (Unique Key)
            <input 
              v-model="formCode.codeKey" 
              class="setup__input" 
              placeholder="e.g. PART"
              maxlength="4"
              :disabled="isEditing"
              required 
            />
            <span class="setup__hint">Max 4 characters. Uppercase recommended.</span>
          </label>
          
          <label class="setup__label">
            Label Name
            <input 
              v-model="formCode.label" 
              class="setup__input" 
              placeholder="e.g. Participation" 
              required 
            />
          </label>
        </div>

        <div class="setup__form-grid" style="margin-top: 12px;">
          <label class="setup__label">
            Category
            <select v-model="formCode.category" class="setup__input" :disabled="isSystemCode(formCode.codeKey)" required>
              <option v-if="formCode.category === 'absence' || formCode.category === 'attendance'" :value="formCode.category">Attendance / Absence</option>
              <option v-if="formCode.category === 'late'" value="late">Attendance / Late</option>
              <option v-if="formCode.category === 'washroom'" value="washroom">Out of Class</option>
              <option v-if="formCode.category === 'note'" value="note">Classroom Note</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="redirect">Redirect / Warning</option>
              <option value="communication">Communication</option>
              <option value="academic">Academic</option>
            </select>
          </label>

          <label class="setup__label">
            Event Type
            <select v-model="formCode.type" class="setup__input" :disabled="isSystemCode(formCode.codeKey)" required>
              <option value="standard">Standard Record</option>
              <option value="attendance">Attendance Flag</option>
              <option value="toggle">Out-of-Class Timer</option>
            </select>
          </label>
        </div>

        <!-- Toggle Flags -->
        <div class="setup__switches-group">
          <div class="setup__switch-container">
            <label class="setup__switch">
              <input type="checkbox" v-model="formCode.enabled" />
              <span class="setup__switch-slider"></span>
            </label>
            <span class="setup__switch-label">Active in Radial Menu</span>
          </div>

          <div class="setup__switch-container" :class="{ 'setup__switch-container--disabled': !formCode.enabled }">
            <label class="setup__switch">
              <input type="checkbox" v-model="formCode.isTopLevel" :disabled="!formCode.enabled" />
              <span class="setup__switch-slider"></span>
            </label>
            <span class="setup__switch-label">Pin to Main Wheel (1-Tap Shortcut)</span>
          </div>

          <div class="setup__switch-container">
            <label class="setup__switch">
              <input type="checkbox" v-model="formCode.requiresNote" />
              <span class="setup__switch-slider"></span>
            </label>
            <span class="setup__switch-label">Require Teacher Notes when logging</span>
          </div>
        </div>

        <!-- Icon Picker Grid -->
        <div class="setup__label" style="margin-top: 16px;">
          <span style="display: block; margin-bottom: 8px;">Select Icon</span>
          <div class="setup__icon-picker-grid">
            <button 
              v-for="iconName in availableIcons" 
              :key="iconName" 
              type="button"
              class="setup__icon-picker-btn"
              :class="{ 'setup__icon-picker-btn--active': formCode.icon === iconName }"
              @click="formCode.icon = iconName"
            >
              <component :is="resolveIcon(iconName)" :size="20" />
            </button>
          </div>
        </div>

        <div class="modal-footer" style="margin-top: 24px;">
          <button type="button" class="setup__btn-ghost" @click="closeModal">Cancel</button>
          <button type="submit" class="setup__btn-primary">
            {{ isEditing ? 'Save Changes' : 'Add Action' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useClassroom } from '../../composables/useClassroom.js'
import { useMessage } from '../../composables/useMessage.js'
import { resolveIcon } from '../../utils/icons.js'
import * as settingsService from '../../db/settingsService.js'
import BaseModal from '../BaseModal.vue'
import { 
  Pencil, Trash2, Plus, AlertTriangle, NotebookPen, 
  Pin, PinOff, Eye, ChevronUp, ChevronDown, 
  Folder, User, Check, Sparkles, Info, MoreHorizontal 
} from 'lucide-vue-next'

const { thresholds: classroomThresholds, behaviorCodes, reloadBehaviorCodes } = useClassroom()
const { alert, confirm } = useMessage()

// Thresholds Form State
const editThresholds = reactive({ 
  washroomTripsPerWeek: 4, 
  washroomWeeklyMinutesLimit: 20,
  washroomDurationLimit: 11,
  deviceIncidentsPerWeek: 3, 
  atRiskThreshold: 70, 
  attendanceThreshold: 85 
})
const thresholdsSuccess = ref('')

// Modal / Edit Form State
const isModalOpen = ref(false)
const isEditing = ref(false)
const modalError = ref('')
const behaviorWarning = ref('')
const formCode = reactive({ 
  codeKey: '', 
  icon: 'Activity', 
  label: '', 
  category: 'neutral', 
  type: 'standard', 
  requiresNote: false, 
  isTopLevel: false,
  enabled: true
})

const availableIcons = [
  'DoorOpen', 'Smartphone', 'Toilet', 'Hand', 'Eye', 'MessageSquare', 'Phone', 
  'NotebookPen', 'GraduationCap', 'Heart', 'Smile', 'AlertTriangle', 'XCircle', 
  'BookOpen', 'Shield', 'Zap', 'Award', 'Activity', 'Flame', 'HelpCircle',
  'Star', 'CheckCircle2', 'Clock', 'UserX', 'CalendarClock'
]

// ── Computed Lists & Groups ──────────────────────────────────────────────────

const allCodes = computed(() => behaviorCodes.value || [])

const pinnedCodes = computed(() => 
  allCodes.value.filter(c => c.enabled !== false && c.isTopLevel === true)
)

const unpinnedActiveCodes = computed(() => 
  allCodes.value.filter(c => c.enabled !== false && c.isTopLevel !== true)
)

const hiddenCodes = computed(() => 
  allCodes.value.filter(c => c.enabled === false)
)

const ATTENDANCE_CATEGORIES = ['attendance', 'absence', 'late']

/** Group unpinned items by normalized category */
const rawCategoryGroups = computed(() => {
  const groups = {}

  unpinnedActiveCodes.value.forEach(c => {
    let groupKey = c.category
    let groupLabel = getCategoryLabel(groupKey)

    if (ATTENDANCE_CATEGORIES.includes(groupKey)) {
      groupKey = 'attendance'
      groupLabel = 'Attendance'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        key: groupKey,
        label: groupLabel,
        items: []
      }
    }
    groups[groupKey].items.push(c)
  })

  return groups
})

/** Multi-item folders: only categories with 2 or more unpinned actions */
const multiItemCategoryGroups = computed(() => {
  const multi = {}
  for (const [key, group] of Object.entries(rawCategoryGroups.value)) {
    if (group.items.length >= 2) {
      multi[key] = group
    }
  }
  return multi
})

/** Singletons: unpinned items in categories that only have 1 active action */
const singletonCodes = computed(() => {
  const singles = []
  for (const group of Object.values(rawCategoryGroups.value)) {
    if (group.items.length === 1) {
      singles.push(group.items[0])
    }
  }
  return singles
})

/** Build the candidate list of all first-level slots before capacity capping */
const rawCandidateList = computed(() => {
  const list = []

  // 1. Pinned codes
  pinnedCodes.value.forEach(c => {
    list.push({
      type: 'pinned',
      key: `pinned-${c.codeKey}`,
      codeKey: c.codeKey,
      label: c.label,
      icon: c.icon,
      category: c.category
    })
  })

  // 2. Singletons
  singletonCodes.value.forEach(s => {
    list.push({
      type: 'singleton',
      key: `singleton-${s.codeKey}`,
      codeKey: s.codeKey,
      label: s.label,
      icon: s.icon,
      category: s.category
    })
  })

  // 3. Multi-item folders
  Object.values(multiItemCategoryGroups.value).forEach(folder => {
    list.push({
      type: 'folder',
      key: `folder-${folder.key}`,
      categoryKey: folder.key,
      label: folder.label,
      items: folder.items
    })
  })

  return list
})

/** True if candidates exceed 7 slots (spilling into '••• More') */
const isOverflowing = computed(() => rawCandidateList.value.length > 7)

/** Number of excess items bundled inside '••• More' */
const overflowCount = computed(() => 
  isOverflowing.value ? rawCandidateList.value.length - 6 : 0
)

/** Candidate slots visible on the live blueprint */
const blueprintVisibleSlots = computed(() => {
  if (isOverflowing.value) {
    return rawCandidateList.value.slice(0, 6)
  }
  return rawCandidateList.value
})

/** Total buttons appearing on the outer radial wheel (strictly <= 8) */
const totalWheelSlots = computed(() => {
  if (isOverflowing.value) {
    return 8 // 6 direct + 1 More + 1 Profile
  }
  return rawCandidateList.value.length + 1 // candidates + 1 Profile
})

/** Set of keys for candidate items that spill into the overflow 'More' button */
const overflowCandidatesKeys = computed(() => {
  if (!isOverflowing.value) return new Set()
  const overflowed = rawCandidateList.value.slice(6)
  return new Set(overflowed.map(item => item.codeKey || item.categoryKey))
})

function isCodeOverflowing(codeKey) {
  return overflowCandidatesKeys.value.has(codeKey)
}

function isFolderOverflowing(categoryKey) {
  return overflowCandidatesKeys.value.has(categoryKey)
}

function getCategoryLabel(cat) {
  const map = {
    attendance: 'Attendance',
    absence: 'Attendance',
    late: 'Attendance',
    washroom: 'Out of Class',
    redirect: 'Redirect / Warning',
    positive: 'Positive Recognition',
    communication: 'Parent Contact',
    academic: 'Academic',
    note: 'Classroom Note',
    neutral: 'Neutral Note'
  }
  return map[cat] || cat
}

function getCategoryTheme(cat) {
  if (ATTENDANCE_CATEGORIES.includes(cat)) return 'attendance'
  if (cat === 'positive') return 'positive'
  if (cat === 'redirect') return 'redirect'
  if (cat === 'communication') return 'comm'
  if (cat === 'academic') return 'academic'
  return 'neutral'
}

// Check if a code is a built-in attendance/system key that should not be deleted
function isSystemCode(codeKey) {
  return ['a', 'l', 'note', 'ac', 'pc', 'w'].includes(codeKey.toLowerCase())
}

onMounted(async () => {
  const current = await settingsService.getThresholds()
  if (current) {
    editThresholds.washroomTripsPerWeek = current.washroomTripsPerWeek
    editThresholds.washroomWeeklyMinutesLimit = current.washroomWeeklyMinutesLimit ?? 20
    editThresholds.washroomDurationLimit = current.washroomDurationLimit ?? 11
    editThresholds.deviceIncidentsPerWeek = current.deviceIncidentsPerWeek
    editThresholds.atRiskThreshold = current.atRiskThreshold ?? 70
    editThresholds.attendanceThreshold = current.attendanceThreshold ?? 85
  }
})

async function saveThresholds() {
  await settingsService.saveThresholds({
    washroomTripsPerWeek: editThresholds.washroomTripsPerWeek,
    washroomWeeklyMinutesLimit: editThresholds.washroomWeeklyMinutesLimit,
    washroomDurationLimit: editThresholds.washroomDurationLimit,
    deviceIncidentsPerWeek: editThresholds.deviceIncidentsPerWeek,
    atRiskThreshold: editThresholds.atRiskThreshold,
    attendanceThreshold: editThresholds.attendanceThreshold
  })
  
  // Sync composable states
  classroomThresholds.value.washroomTripsPerWeek = editThresholds.washroomTripsPerWeek
  classroomThresholds.value.washroomWeeklyMinutesLimit = editThresholds.washroomWeeklyMinutesLimit
  classroomThresholds.value.washroomDurationLimit = editThresholds.washroomDurationLimit
  classroomThresholds.value.deviceIncidentsPerWeek = editThresholds.deviceIncidentsPerWeek
  classroomThresholds.value.atRiskThreshold = editThresholds.atRiskThreshold
  classroomThresholds.value.attendanceThreshold = editThresholds.attendanceThreshold
  
  thresholdsSuccess.value = 'Saved!'
  setTimeout(() => { thresholdsSuccess.value = '' }, 1500)
}

// ── 1-Click Quick Actions ────────────────────────────────────────────────────

async function togglePin(code) {
  behaviorWarning.value = ''
  
  const payload = {
    ...code,
    isTopLevel: !code.isTopLevel,
    enabled: true
  }

  await settingsService.saveBehaviorCode(payload)
  await reloadBehaviorCodes()
}

async function toggleActive(code) {
  behaviorWarning.value = ''
  const isCurrentlyEnabled = code.enabled !== false
  const payload = {
    ...code,
    enabled: !isCurrentlyEnabled,
    isTopLevel: !isCurrentlyEnabled ? code.isTopLevel : false // unpin if disabling
  }

  await settingsService.saveBehaviorCode(payload)
  await reloadBehaviorCodes()
}

async function movePinned(code, direction) {
  const list = [...pinnedCodes.value]
  const idx = list.findIndex(c => c.codeKey === code.codeKey)
  if (idx < 0) return

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= list.length) return

  // Swap
  const temp = list[idx]
  list[idx] = list[targetIdx]
  list[targetIdx] = temp

  // Combine with rest of codes to preserve complete list
  const otherCodes = allCodes.value.filter(c => !list.some(p => p.codeKey === c.codeKey))
  const newFullList = [...list, ...otherCodes]

  await settingsService.saveBehaviorCodesBatch(newFullList)
  await reloadBehaviorCodes()
}

// ── Modal Actions ────────────────────────────────────────────────────

function openAddModal() {
  isEditing.value = false
  Object.assign(formCode, { 
    codeKey: '', 
    icon: 'Activity', 
    label: '', 
    category: 'neutral', 
    type: 'standard', 
    requiresNote: false, 
    isTopLevel: false,
    enabled: true
  })
  isModalOpen.value = true
}

function editCode(code) {
  isEditing.value = true
  Object.assign(formCode, { 
    codeKey: code.codeKey, 
    icon: code.icon, 
    label: code.label, 
    category: code.category, 
    type: code.type, 
    requiresNote: !!code.requiresNote,
    isTopLevel: !!code.isTopLevel,
    enabled: code.enabled !== false
  })
  modalError.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  modalError.value = ''
}

async function saveCode() {
  modalError.value = ''
  const keyToUse = isEditing.value ? formCode.codeKey : formCode.codeKey.trim().toUpperCase()
  if (!keyToUse) return

  const payload = {
    ...formCode,
    codeKey: keyToUse,
    label: formCode.label.trim(),
    enabled: formCode.enabled !== false,
    isTopLevel: formCode.enabled ? formCode.isTopLevel : false
  }

  await settingsService.saveBehaviorCode(payload)
  await reloadBehaviorCodes()
  isModalOpen.value = false
}

async function deleteCode(codeKey) {
  behaviorWarning.value = ''
  const codeToDelete = behaviorCodes.value.find(c => c.codeKey === codeKey)
  const name = codeToDelete?.label ?? codeKey
  
  if (isSystemCode(codeKey)) {
    behaviorWarning.value = `"${name}" is a core system code and cannot be deleted.`
    setTimeout(() => { behaviorWarning.value = '' }, 5000)
    return
  }

  const msg = `Delete behavior action "${name}"? This will not affect past logged events, but will remove it from the radial overlays.`
  if (!await confirm(msg)) return

  await settingsService.deleteBehaviorCode(codeKey)
  await reloadBehaviorCodes()
}
</script>

<script>
export default {
  name: 'BehaviorSettings'
}
</script>

<style scoped>
.setup__success-banner {
  background: rgba(34, 197, 94, 0.12);
  color: var(--state-success, #4ade80);
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}

.setup__card {
  background:    var(--surface, #1e2030);
  padding:       24px;
  border-radius: var(--radius-lg, 12px);
  box-shadow:    var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.15));
  border:        1px solid var(--border, rgba(255, 255, 255, 0.08));
  display:       flex;
  flex-direction: column;
  gap:           16px;
  margin-bottom: 24px;
}

.setup__card-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.setup__card-title {
  font-size:     1.1rem;
  font-weight:   700;
  color:         var(--text, #ffffff);
  margin:        0 0 4px;
  display:       flex;
  align-items:   center;
  gap:           8px;
}

.setup__hint {
  font-size:   0.85rem;
  color:       var(--text-secondary, #94a3b8);
  margin:      0;
  line-height: 1.5;
}

.setup__inline-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.4;
}

.setup__banner-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.setup__inline-banner--warning {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.setup__inline-banner--info {
  background: rgba(99, 102, 241, 0.08);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.25);
}

/* ── Live Radial Blueprint Widget ────────────────────────────────── */
.radial-blueprint {
  background: var(--bg-secondary, rgba(0, 0, 0, 0.2));
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radial-blueprint__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.radial-blueprint__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.radial-blueprint__icon {
  color: #6366f1;
}

.radial-blueprint__badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-full, 9999px);
}

.radial-blueprint__badge--optimal {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.radial-blueprint__badge--overflow {
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
}

.radial-blueprint__slots {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.blueprint-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  white-space: nowrap;
  transition: all 0.15s ease;
}

.blueprint-chip__num {
  font-size: 0.65rem;
  opacity: 0.6;
}

.blueprint-chip--pinned {
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(99, 102, 241, 0.08);
  color: var(--primary, #6366f1);
}

.blueprint-chip--singleton {
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
}

.blueprint-chip--folder {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
}

.blueprint-chip--overflow {
  border-color: rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.08);
  color: #8b5cf6;
}

.blueprint-chip--profile {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.08);
  color: #059669;
}

.blueprint-chip--empty {
  border-style: dashed;
  opacity: 0.45;
  background: transparent;
  color: var(--text-secondary);
}

/* ── Radial Groups ────────────────────────────────────────────────── */
.radial-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.radial-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.radial-group__title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.radial-group__badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
}

.radial-group__badge--pinned { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
.radial-group__badge--single { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
.radial-group__badge--folder { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.radial-group__badge--hidden { background: rgba(100, 116, 139, 0.15); color: #64748b; }

.radial-group__title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.radial-group__count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.radial-group__subhint {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: -4px 0 2px;
  line-height: 1.4;
}

.radial-group__empty {
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Code List Items ──────────────────────────────────────────────── */
.setup__code-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup__code-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  transition: all 0.15s ease;
}

.setup__code-item:hover {
  border-color: var(--primary-light, #818cf8);
}

.setup__code-item--disabled {
  opacity: 0.65;
  background: var(--bg-secondary);
}

.setup__code-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.setup__code-order-badge {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-secondary);
  width: 22px;
}

.setup__code-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm, 6px);
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  flex-shrink: 0;
}

.setup__code-icon-badge--muted {
  opacity: 0.5;
}

.setup__code-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.setup__code-title-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.setup__code-title-row strong {
  font-size: 0.88rem;
  color: var(--text);
}

.setup__code-key {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.setup__code-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.setup__tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  white-space: nowrap;
}

.setup__tag-badge--cat { background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); }
.setup__tag-badge--pin { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
.setup__tag-badge--single { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
.setup__tag-badge--sub { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.setup__tag-badge--disabled { background: rgba(100, 116, 139, 0.15); color: #64748b; }
.setup__tag-badge--note { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
.setup__tag-badge--overflow-item { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }

/* Category Theme Badges */
.setup__tag-badge--attendance { background: #dbeafe; color: #1d4ed8; }
.setup__tag-badge--positive { background: #d1fae5; color: #047857; }
.setup__tag-badge--redirect { background: #fef3c7; color: #b45309; }
.setup__tag-badge--comm { background: #ede9fe; color: #6d28d9; }
.setup__tag-badge--academic { background: #e0e7ff; color: #3730a3; }
.setup__tag-badge--neutral { background: #f1f5f9; color: #475569; }

.setup__code-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.setup__order-btns {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* Category Card Accordion */
.radial-category-accordion {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radial-cat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radial-cat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.radial-cat-card__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  flex-wrap: wrap;
}

.radial-cat-card__icon {
  color: #f59e0b;
}

.radial-cat-card__name {
  font-weight: 700;
  color: var(--text);
}

.radial-cat-card__hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.setup__code-list--nested {
  padding-left: 8px;
  border-left: 2px solid var(--border);
}

/* Button Variants */
.setup__pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full, 9999px);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.setup__pill-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}

.setup__pill-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.setup__pill-btn--active {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: var(--primary);
}

.setup__pill-btn--active:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.setup__pill-btn--enable {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: #059669;
}

.setup__pill-btn--enable:hover {
  background: #10b981;
  color: #fff;
}

.setup__icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 5px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.setup__icon-btn:hover:not(:disabled) {
  background: var(--bg-hover, rgba(255, 255, 255, 0.06));
  color: var(--text);
}

.setup__icon-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.setup__icon-btn--danger:hover:not(:disabled) {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}

.setup__btn-sm {
  padding: 6px 12px;
  font-size: 0.78rem;
}

.setup__btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.setup__btn-primary:hover {
  opacity: 0.9;
}

.setup__btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
}

/* Switches Grid */
.setup__switches-group {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.setup__switch-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setup__switch-container--disabled {
  opacity: 0.4;
  pointer-events: none;
}

.setup__switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
  flex-shrink: 0;
}

.setup__switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.setup__switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--border);
  transition: 0.2s;
  border-radius: 18px;
}

.setup__switch-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

.setup__switch input:checked + .setup__switch-slider {
  background-color: var(--primary);
}

.setup__switch input:checked + .setup__switch-slider:before {
  transform: translateX(16px);
}

.setup__switch-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
}

/* Icon Picker Grid */
.setup__icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
  padding: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.setup__icon-picker-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.setup__icon-picker-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
  border-color: var(--primary-light);
}

.setup__icon-picker-btn--active {
  background: var(--primary) !important;
  color: #fff !important;
  border-color: var(--primary) !important;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.behavior-thresholds__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.setup__form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.setup__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
}

.setup__label-text {
  font-weight: 700;
}

.setup__label-subtext {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.setup__input {
  padding: 7px 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-size: 0.85rem;
}

.setup__input:focus {
  outline: none;
  border-color: var(--primary);
}
</style>
