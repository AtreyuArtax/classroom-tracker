<template>
  <BaseModal 
    :show="show" 
    title="Learning Skills Guide &amp; Resources" 
    max-width="840px"
    @close="emit('close')"
  >
    <div class="guide-container">
      
      <!-- Top Tab Switcher -->
      <div class="guide-tabs">
        <button 
          type="button" 
          class="guide-tab"
          :class="{ 'guide-tab--active': activeTab === 'forms' }"
          @click="activeTab = 'forms'"
        >
          <FileText :size="15" /> Microsoft Forms Setup
        </button>
        <button 
          type="button" 
          class="guide-tab"
          :class="{ 'guide-tab--active': activeTab === 'rubric' }"
          @click="activeTab = 'rubric'"
        >
          <BookOpen :size="15" /> Growing Success Rubric &amp; Behaviours
        </button>
      </div>

      <!-- TAB 1: Microsoft Forms Setup -->
      <div v-if="activeTab === 'forms'" class="guide-tab-content">
        <!-- Intro Banner -->
        <div class="guide-banner">
          <div class="banner-icon-wrap">
            <FileText :size="20" />
          </div>
          <div class="banner-text">
            <h4 class="banner-title">Create your Student Survey in 2 Minutes</h4>
            <p class="banner-desc">
              Download our clean Word template and upload it directly to Microsoft Forms' <strong>Quick import</strong>.
            </p>
          </div>
        </div>

        <!-- 3-Step Setup Instructions -->
        <div class="guide-steps">
          <!-- Step 1 -->
          <div class="guide-step">
            <div class="step-badge">1</div>
            <div class="step-content">
              <h5 class="step-title">Download the Word (.docx) Template</h5>
              <p class="step-desc">Microsoft Forms Quick Import accepts Word (<strong>.docx</strong>) files. Download the bare-bones template below.</p>
              <div class="step-actions">
                <button 
                  type="button" 
                  class="guide-btn guide-btn--primary"
                  :disabled="isGeneratingDocx"
                  @click="downloadDocxFile"
                >
                  <Download :size="15" /> {{ isGeneratingDocx ? 'Generating...' : 'Download Word Template (.docx)' }}
                </button>
                <button 
                  type="button" 
                  class="guide-btn guide-btn--secondary"
                  @click="copyQuickText"
                >
                  <Clipboard :size="15" /> {{ copiedQuickText ? 'Copied to Clipboard!' : 'Copy Text' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="guide-step">
            <div class="step-badge">2</div>
            <div class="step-content">
              <h5 class="step-title">Quick Import into Microsoft Forms</h5>
              <p class="step-desc">
                Go to <a href="https://forms.cloud.microsoft/" target="_blank" rel="noopener noreferrer" class="guide-link">forms.cloud.microsoft</a>, click <strong>Quick import</strong>, and upload the downloaded <strong>.docx</strong> file. Forms will instantly generate all 6 questions with <em>a. Excellent, b. Good, c. Satisfactory, d. Needs Improvement</em> options.
              </p>
            </div>
          </div>

          <!-- Step 3: Crucial Settings -->
          <div class="guide-step guide-step--important">
            <div class="step-badge step-badge--alert">3</div>
            <div class="step-content">
              <div class="important-header">
                <ShieldCheck :size="16" class="important-icon" />
                <h5 class="step-title">Crucial Setting: School Email Matching</h5>
              </div>
              <p class="step-desc">
                In Microsoft Forms, click <strong>&hellip; (More form settings) &rarr; Settings</strong> and ensure:
              </p>
              <ul class="settings-checklist">
                <li>
                  <CheckCircle2 :size="14" class="check-icon" />
                  <span>Select <strong>&ldquo;Only people in my organization can respond&rdquo;</strong></span>
                </li>
                <li>
                  <CheckCircle2 :size="14" class="check-icon" />
                  <span>Check <strong>&ldquo;Record name&rdquo;</strong> (Captures student login email)</span>
                </li>
              </ul>
              <div class="tip-callout">
                <Info :size="14" class="tip-icon" />
                <span>This guarantees that student responses match your class roster emails with 100% accuracy.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Text Preview Accordion -->
        <div class="guide-preview-section">
          <button 
            type="button" 
            class="preview-toggle" 
            @click="showRawText = !showRawText"
          >
            <span>{{ showRawText ? 'Hide Question Text' : 'View Question Text' }}</span>
            <ChevronDown v-if="!showRawText" :size="15" />
            <ChevronUp v-else :size="15" />
          </button>

          <Transition name="expand">
            <div v-if="showRawText" class="preview-box-wrapper">
              <textarea 
                v-model="quickText" 
                class="preview-textarea" 
                rows="8" 
                readonly
              ></textarea>
            </div>
          </Transition>
        </div>
      </div>

      <!-- TAB 2: Growing Success Rubrics & Behaviours -->
      <div v-else-if="activeTab === 'rubric'" class="guide-tab-content">
        <!-- Rubric Header Banner -->
        <div class="guide-banner">
          <div class="banner-icon-wrap">
            <BookOpen :size="20" />
          </div>
          <div class="banner-text">
            <h4 class="banner-title">Ontario Growing Success Reference</h4>
            <p class="banner-desc">
              Ministry of Education performance level definitions and observable sample behaviours.
              <em>Source: Growing Success: Assessment, Evaluation, and Reporting in Ontario Schools (p. 11).</em>
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="rubric-actions-bar">
          <button type="button" class="guide-btn guide-btn--primary" @click="downloadRubricDocx">
            <Download :size="15" /> Download Reference Guide (.docx)
          </button>
          <button type="button" class="guide-btn guide-btn--secondary" @click="copyRubricText">
            <Clipboard :size="15" /> {{ copiedRubric ? 'Copied to Clipboard!' : 'Copy Reference Text' }}
          </button>
          <button type="button" class="guide-btn guide-btn--ghost" @click="printRubric">
            <Printer :size="15" /> Print / PDF
          </button>
        </div>

        <!-- Printable Document Area -->
        <div id="gs-guide-print-area" class="rubric-scroll-doc">
          
          <!-- Section A: Levels -->
          <div class="rubric-section">
            <div class="rubric-section-head">
              <Award :size="16" class="rubric-section-icon" />
              <h4>Performance Level Rubric</h4>
            </div>
            <div class="levels-grid">
              <div class="level-card level-card--e">
                <div class="level-badge-row">
                  <span class="level-badge level-badge--e">E</span>
                  <span class="level-name">Excellent</span>
                </div>
                <p class="level-body">
                  The student demonstrates the learning skill <strong>consistently, automatically, and independently</strong>. They serve as a positive classroom model and maintain these work habits across all contexts without needing prompting.
                </p>
              </div>

              <div class="level-card level-card--g">
                <div class="level-badge-row">
                  <span class="level-badge level-badge--g">G</span>
                  <span class="level-name">Good</span>
                </div>
                <p class="level-body">
                  The student demonstrates the learning skill <strong>frequently and with very minimal supervision</strong>. The target behavior is their standard default baseline, requiring only rare structural reminders or occasional encouragement.
                </p>
              </div>

              <div class="level-card level-card--s">
                <div class="level-badge-row">
                  <span class="level-badge level-badge--s">S</span>
                  <span class="level-name">Satisfactory</span>
                </div>
                <p class="level-body">
                  The student demonstrates the learning skill <strong>regularly, but relies on structured teacher support</strong> or routine reminders. Their habits are baseline-adequate, but the behavior requires external scaffolding to remain consistent.
                </p>
              </div>

              <div class="level-card level-card--n">
                <div class="level-badge-row">
                  <span class="level-badge level-badge--n">N</span>
                  <span class="level-name">Needs Improvement</span>
                </div>
                <p class="level-body">
                  The student demonstrates the learning skill <strong>rarely, inconsistently, or only under constant, direct adult supervision</strong>. A lack of these habits actively impedes their academic progress or disrupts the learning environment.
                </p>
              </div>
            </div>
          </div>

          <!-- Section B: 6 Skills -->
          <div class="rubric-section">
            <div class="rubric-section-head">
              <CheckCircle2 :size="16" class="rubric-section-icon" />
              <h4>Sample Observable Behaviours</h4>
            </div>
            <div class="skills-grid">
              
              <div class="skill-card">
                <div class="skill-card-head">
                  <span class="skill-badge">R</span>
                  <h5>Responsibility</h5>
                </div>
                <ul class="skill-bullets">
                  <li>fulfils responsibilities and commitments within the learning environment;</li>
                  <li>completes and submits class work, homework, and assignments according to agreed-upon timelines;</li>
                  <li>takes responsibility for and manages own behaviour.</li>
                </ul>
              </div>

              <div class="skill-card">
                <div class="skill-card-head">
                  <span class="skill-badge">O</span>
                  <h5>Organization</h5>
                </div>
                <ul class="skill-bullets">
                  <li>devises and follows a plan and process for completing work and tasks;</li>
                  <li>establishes priorities and manages time to complete tasks and achieve goals;</li>
                  <li>identifies, gathers, evaluates, and uses information, technology, and resources to complete tasks.</li>
                </ul>
              </div>

              <div class="skill-card">
                <div class="skill-card-head">
                  <span class="skill-badge">I</span>
                  <h5>Independent Work</h5>
                </div>
                <ul class="skill-bullets">
                  <li>independently monitors, assesses, and revises plans to complete tasks and meet goals;</li>
                  <li>uses class time appropriately to complete tasks;</li>
                  <li>follows instructions with minimal supervision.</li>
                </ul>
              </div>

              <div class="skill-card">
                <div class="skill-card-head">
                  <span class="skill-badge">C</span>
                  <h5>Collaboration</h5>
                </div>
                <ul class="skill-bullets">
                  <li>accepts various roles and an equitable share of work in a group;</li>
                  <li>responds positively to the ideas, opinions, values, and traditions of others;</li>
                  <li>builds healthy peer-to-peer relationships through personal and media-assisted interactions;</li>
                  <li>works with others to resolve conflicts and build consensus to achieve group goals;</li>
                  <li>shares information, resources, and expertise and promotes critical thinking to solve problems and make decisions.</li>
                </ul>
              </div>

              <div class="skill-card">
                <div class="skill-card-head">
                  <span class="skill-badge">I</span>
                  <h5>Initiative</h5>
                </div>
                <ul class="skill-bullets">
                  <li>looks for and acts on new ideas and opportunities for learning;</li>
                  <li>demonstrates the capacity for innovation and a willingness to take risks;</li>
                  <li>demonstrates curiosity and interest in learning;</li>
                  <li>approaches new tasks with a positive attitude;</li>
                  <li>recognizes and advocates appropriately for the rights of self and others.</li>
                </ul>
              </div>

              <div class="skill-card">
                <div class="skill-card-head">
                  <span class="skill-badge">S</span>
                  <h5>Self-Regulation</h5>
                </div>
                <ul class="skill-bullets">
                  <li>sets own individual goals and monitors progress towards achieving them;</li>
                  <li>seeks clarification or assistance when needed;</li>
                  <li>assesses and reflects critically on own strengths, needs, and interests;</li>
                  <li>identifies learning opportunities, choices, and strategies to meet personal needs and achieve goals;</li>
                  <li>perseveres and makes an effort when responding to challenges.</li>
                </ul>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>

    <template #footer>
      <div class="guide-footer">
        <button type="button" class="guide-btn guide-btn--ghost" @click="emit('close')">
          Close
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from '../BaseModal.vue'
import { saveAs } from 'file-saver'
import { createDocxBlobFromLines } from '../../utils/docxExport.js'
import { 
  FileText, 
  BookOpen, 
  Clipboard, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  Award 
} from 'lucide-vue-next'

const props = defineProps({
  show: { type: Boolean, required: true },
  initialTab: { type: String, default: 'forms' }
})

const emit = defineEmits(['close'])

const activeTab = ref(props.initialTab || 'forms')
const copiedQuickText = ref(false)
const copiedRubric = ref(false)
const showRawText = ref(false)
const isGeneratingDocx = ref(false)

const quickText = ref(`Learning Skills Self-Evaluation

1. Full Name

2. Responsibility
a. Excellent
b. Good
c. Satisfactory
d. Needs Improvement

3. Organization
a. Excellent
b. Good
c. Satisfactory
d. Needs Improvement

4. Independent Work
a. Excellent
b. Good
c. Satisfactory
d. Needs Improvement

5. Collaboration
a. Excellent
b. Good
c. Satisfactory
d. Needs Improvement

6. Initiative
a. Excellent
b. Good
c. Satisfactory
d. Needs Improvement

7. Self-Regulation
a. Excellent
b. Good
c. Satisfactory
d. Needs Improvement`)

const rubricPlainText = `Ontario Growing Success — Learning Skills & Work Habits Reference Guide
Source: Ontario Ministry of Education — Growing Success (p. 11)

===================================================================
PERFORMANCE LEVEL RUBRIC
===================================================================

Excellent (E):
The student demonstrates the learning skill consistently, automatically, and independently. They serve as a positive classroom model and maintain these work habits across all contexts without needing prompting.

Good (G):
The student demonstrates the learning skill frequently and with very minimal supervision. The target behavior is their standard default baseline, requiring only rare structural reminders or occasional encouragement.

Satisfactory (S):
The student demonstrates the learning skill regularly, but relies on structured teacher support or routine reminders. Their habits are baseline-adequate, but the behavior requires external scaffolding to remain consistent.

Needs Improvement (N):
The student demonstrates the learning skill rarely, inconsistently, or only under constant, direct adult supervision. A lack of these habits actively impedes their academic progress or disrupts the learning environment.


===================================================================
LEARNING SKILLS AND WORK HABITS SAMPLE BEHAVIOURS
===================================================================

1. Responsibility
The student:
• fulfils responsibilities and commitments within the learning environment;
• completes and submits class work, homework, and assignments according to agreed-upon timelines;
• takes responsibility for and manages own behaviour.

2. Organization
The student:
• devises and follows a plan and process for completing work and tasks;
• establishes priorities and manages time to complete tasks and achieve goals;
• identifies, gathers, evaluates, and uses information, technology, and resources to complete tasks.

3. Independent Work
The student:
• independently monitors, assesses, and revises plans to complete tasks and meet goals;
• uses class time appropriately to complete tasks;
• follows instructions with minimal supervision.

4. Collaboration
The student:
• accepts various roles and an equitable share of work in a group;
• responds positively to the ideas, opinions, values, and traditions of others;
• builds healthy peer-to-peer relationships through personal and media-assisted interactions;
• works with others to resolve conflicts and build consensus to achieve group goals;
• shares information, resources, and expertise and promotes critical thinking to solve problems and make decisions.

5. Initiative
The student:
• looks for and acts on new ideas and opportunities for learning;
• demonstrates the capacity for innovation and a willingness to take risks;
• demonstrates curiosity and interest in learning;
• approaches new tasks with a positive attitude;
• recognizes and advocates appropriately for the rights of self and others.

6. Self-Regulation
The student:
• sets own individual goals and monitors progress towards achieving them;
• seeks clarification or assistance when needed;
• assesses and reflects critically on own strengths, needs, and interests;
• identifies learning opportunities, choices, and strategies to meet personal needs and achieve goals;
• perseveres and makes an effort when responding to challenges.`

async function copyQuickText() {
  try {
    await navigator.clipboard.writeText(quickText.value)
    copiedQuickText.value = true
    setTimeout(() => { copiedQuickText.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy quick text:', err)
  }
}

async function copyRubricText() {
  try {
    await navigator.clipboard.writeText(rubricPlainText)
    copiedRubric.value = true
    setTimeout(() => { copiedRubric.value = false }, 2500)
  } catch (err) {
    console.error('Failed to copy rubric text:', err)
  }
}

async function downloadDocxFile() {
  isGeneratingDocx.value = true
  try {
    const lines = quickText.value.split('\n')
    const blob = await createDocxBlobFromLines(lines)
    saveAs(blob, 'Learning_Skills_MS_Forms_Template.docx')
  } catch (err) {
    console.error('Failed to generate docx:', err)
  } finally {
    isGeneratingDocx.value = false
  }
}

async function downloadRubricDocx() {
  try {
    const lines = rubricPlainText.split('\n')
    const blob = await createDocxBlobFromLines(lines)
    saveAs(blob, 'Ontario_Growing_Success_Learning_Skills_Guide.docx')
  } catch (err) {
    console.error('Failed to generate docx:', err)
  }
}

function printRubric() {
  window.print()
}
</script>

<style scoped>
.guide-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Tabs */
.guide-tabs {
  display: flex;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  gap: 4px;
}

.guide-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.guide-tab:hover {
  color: var(--text);
}

.guide-tab--active {
  background: var(--surface);
  color: var(--primary);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.guide-tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Banner */
.guide-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.banner-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: #eff6ff;
  color: var(--primary);
  flex-shrink: 0;
}

.banner-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 3px 0;
}

.banner-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

/* Steps */
.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-step {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
}

.guide-step--important {
  background: #fffbeb;
  border-color: #fde68a;
}

.step-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--primary);
  color: #ffffff;
  font-weight: 800;
  font-size: 0.82rem;
  flex-shrink: 0;
}

.step-badge--alert {
  background: #d97706;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.step-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.step-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.guide-link {
  color: var(--primary);
  font-weight: 700;
  text-decoration: underline;
}

.step-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.guide-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.guide-btn--primary {
  background: var(--primary);
  color: #ffffff;
}

.guide-btn--secondary {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

.guide-btn--secondary:hover {
  background: var(--bg-secondary);
  border-color: var(--primary);
  color: var(--primary);
}

.guide-btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border);
}

.guide-btn--ghost:hover {
  background: var(--bg-secondary);
  color: var(--text);
}

.important-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #b45309;
}

.important-icon {
  color: #d97706;
}

.settings-checklist {
  margin: 4px 0 0 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-checklist li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #78350f;
}

.check-icon {
  color: #16a34a;
  flex-shrink: 0;
}

.tip-callout {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 0.76rem;
  color: #92400e;
  font-style: italic;
}

.tip-icon {
  color: #d97706;
}

/* Accordion */
.guide-preview-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.preview-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.78rem;
  background: var(--surface);
  color: var(--text);
  resize: vertical;
}

/* Rubric Tab */
.rubric-actions-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rubric-scroll-doc {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: 440px;
  overflow-y: auto;
  padding-right: 4px;
}

.rubric-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rubric-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--border);
}

.rubric-section-head h4 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.rubric-section-icon {
  color: var(--primary);
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.level-card {
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.level-card--e { border-left: 4px solid #2563eb; background: #f8fafc; }
.level-card--g { border-left: 4px solid #16a34a; background: #f8fafc; }
.level-card--s { border-left: 4px solid #ca8a04; background: #f8fafc; }
.level-card--n { border-left: 4px solid #dc2626; background: #f8fafc; }

.level-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  font-weight: 800;
  font-size: 0.78rem;
}

.level-badge--e { background: #dbeafe; color: #1d4ed8; }
.level-badge--g { background: #dcfce7; color: #15803d; }
.level-badge--s { background: #fef9c3; color: #a16207; }
.level-badge--n { background: #fee2e2; color: #b91c1c; }

.level-name {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text);
}

.level-body {
  font-size: 0.8rem;
  color: var(--text);
  line-height: 1.4;
  margin: 0;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.skill-card {
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-card-head h5 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
}

.skill-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  font-weight: 800;
  font-size: 0.78rem;
  color: var(--primary);
}

.skill-bullets {
  margin: 0;
  padding-left: 16px;
  font-size: 0.78rem;
  color: var(--text);
  line-height: 1.4;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.guide-footer {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .levels-grid, .skills-grid {
    grid-template-columns: 1fr;
  }
}
</style>
