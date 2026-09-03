# Weighted SBAR Evaluation Components (e.g., 65% Coursework / 25% Exam / 10% Attendance)

Support mandated fixed-percentage final evaluations (written exams, attendance/participation) in classes using the Standards-Based Assessment and Reporting (SBAR) framework, while preserving SBAR's expectation-level growth algorithms and full backward compatibility.

## User Review Required

> [!IMPORTANT]
> **Behavior of Modified Attendance Marks:**
> You asked: *"if they modify it does it stay modified even if the student's attendance % changes?"*
> **YES.** When a teacher auto-populates attendance from the system's live logs and modifies any student's mark (e.g., from 95% to 98%), the value is written to the persistent `grades` store with a `teacherOverridden: true` (or standard persistent grade) lock. Subsequent daily attendance scans or absences will **NEVER** silently alter or clobber the teacher's entered mark. It will remain locked unless the teacher explicitly clicks "Re-sync from Attendance".

> [!NOTE]
> **100% Backward Compatibility Guaranteed:**
> * For all existing SBAR classes, the new feature defaults to `enabled: false` (or `100% SBAR Term Mastery`).
> * Existing calculations, reports, and grids will calculate and render identically to how they do today.
> * Teachers opt in per-class by toggling "Weighted Final Evaluations" in Setup.

---

## Architecture & Math Specification

### 1. The Composite Grade Formula
When an SBAR class enables Weighted Final Evaluations, the final course grade is calculated as:

$$\text{Final Course Grade} = \frac{(\text{SBAR Mastery \%} \times w_{\text{term}}) + \sum (\text{Component Score}_i \times w_i)}{\text{Weight Used}} \times 100$$

Where:
* $\text{SBAR Mastery \%}$ is calculated using the class's active SBAR engine (Decaying Average, Power Law, Mode, etc.) across all curriculum expectations.
* $\text{Weight Used}$ is the sum of weights for components that **currently have evaluated marks**.
* **Progressive / Dynamic Mid-Semester Normalization:** In October, before the final exam is written, the exam's 25% weight is not in the denominator. The student's overall grade reflects 100% of their current SBAR mastery until final components are evaluated.

### 2. Component Structure in Class Record
In `classRecord`:
```javascript
classRecord.sbarWeighting = {
  enabled: true, // false by default
  termWeight: 65, // % weight for SBAR expectation mastery (default: 65)
  components: [
    {
      componentId: 'comp_exam',
      name: 'Written Final Exam',
      weight: 25,
      type: 'exam',
      assessmentId: null // linked assessment ID
    },
    {
      componentId: 'comp_att',
      name: 'Attendance & Participation',
      weight: 10,
      type: 'attendance',
      assessmentId: null // linked assessment ID
    }
  ]
}
```

### 3. Presets for Changing Ministry Winds
In Setup, teachers can select 1-click presets:
* **Ontario Grade 11 Mandate:** 65% SBAR Coursework / 25% Written Exam / 10% Attendance & Participation
* **Ontario Secondary Standard (70/30):** 70% SBAR Coursework / 30% Final Evaluation (Exam/Culminating)
* **Pure SBAR (Junior / Grade 9-10):** 100% SBAR Coursework
* **Custom:** Add/remove any component with any weight (must sum to 100%).

---

## Proposed Changes

### Core Math Engine

#### [MODIFY] [gradeCalc.js](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebook/gradeCalc.js)
* In `calculateStudentGrade()`:
  * Check if `classRecord.gradingFramework === 'sbar' && classRecord.sbarWeighting?.enabled`.
  * Calculate `sbarMasteryPct` as usual via `calculateSBARStudentOverallMastery`.
  * Evaluate scores for each configured SBAR component assessment (e.g., Exam score % and Attendance score %).
  * Compute the weighted composite grade with dynamic weight normalization.
  * Populate `categoryResults` with SBAR Term Work and the component results so dossier and reports can display category breakdowns.
  * Return `overallGrade`, `sbarMasteryPct`, `sbarBreakdown: { termMastery, components, weightUsed }`.

---

### Assessment & Grading Service

#### [MODIFY] [assessmentService.js](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebook/assessmentService.js)
* Support helper function to ensure or auto-provision component assessments (e.g. `ensureSbarComponentAssessments(classId, sbarWeighting)`) so that "Written Final Exam" and "Attendance & Participation" assessments are cleanly registered in the gradebook when weighting is enabled.

#### [NEW] [sbarAttendanceSync.js](file:///Users/kylestashuk/Projects/classroom-tracker/src/db/gradebook/sbarAttendanceSync.js)
* Utility to compute the live attendance rate for all students in a class:
  $$\text{rate} = \max\left(0, \min\left(100, \text{round}\left(\frac{\text{totalDays} - \text{absences}}{\text{totalDays}} \times 100\right)\right)\right)$$
* Function `syncClassAttendanceToAssessment(classRecord, assessmentId, { overwriteModified = false })`:
  * Reads student absence records from `eventService`.
  * Populates grade records for unentered or non-overridden students.
  * Flags modified records with `isTeacherModified: true` so future syncs skip them unless `overwriteModified` is explicitly selected.

---

### Setup & Configuration UI

#### [MODIFY] [AssessmentFrameworkSettings.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/setup/AssessmentFrameworkSettings.vue)
* Add an **"SBAR Evaluation Weighting (Optional)"** card for SBAR classes:
  * Toggle: *Enable Final Evaluation Weighting*
  * Quick Presets: *Ontario Gr. 11 (65/25/10)*, *Ontario Standard (70/30)*, *100% SBAR*
  * Component Weight Editor: Edit names, weights (must total 100%), and types.
  * Total Weight Validation Pill (shows warning if $\neq 100\%$).

---

### Gradebook & SBAR Views

#### [MODIFY] [GradesGridSBAR.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/grades/GradesGridSBAR.vue)
* In the sticky header and student rows:
  * When `sbarWeighting?.enabled` is active:
    * Sticky column shows **Final Course Grade** (e.g. `81% L4-`) and **Term Mastery** badge (`82% L4-`).
    * Include a collapsible or dedicated **"Final Evaluations"** column section showing the Exam and Attendance marks.
  * In the Assessment Hub:
    * Add a **"Final Components"** tab to quickly view and grade the Exam and Attendance tasks.

#### [MODIFY] [GradesAssessmentDetailView.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/grades/GradesAssessmentDetailView.vue) & [Grades.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/views/Grades.vue)
* When opening a numeric component assessment (like the Written Exam or Attendance & Participation) in an SBAR class, route to `GradesAssessmentDetailView` (the numeric points view) rather than the expectation rubric picker.
* For the Attendance component, add an **"⚡ Auto-fill from Live Attendance"** action button in the assessment header:
  * Shows live attendance stats.
  * Offers "Fill Empty Only" or "Overwrite All".
  * Highlights entries that have been modified by the teacher.

---

### Student Dossier & Reports

#### [MODIFY] [StudentAcademicsTab.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/dossier/StudentAcademicsTab.vue) & [ProgressReport.vue](file:///Users/kylestashuk/Projects/classroom-tracker/src/components/dossier/ProgressReport.vue)
* When `sbarWeighting?.enabled` is true:
  * Display the Course Evaluation Breakdown table:
    * Term Work (SBAR Expectations) — Weight: 65% — Score: 82%
    * Written Final Exam — Weight: 25% — Score: 74%
    * Attendance & Participation — Weight: 10% — Score: 90%
    * **Final Course Mark:** 81%

---

## Verification Plan

### Automated Tests
1. **Regression Test Suite:**
   * Run `node src/test_sbar_math.js`
   * Run `node src/test_mission_critical_audit.js`
   * Run `node src/test_elementary_audit.js`
   * Run `node src/test_db_integrity.js`
   * *Verify that all existing tests pass with 0 errors.*

2. **New Dedicated Test Suite (`src/test_sbar_weighted_components.js`):**
   * **Test 1: Legacy Pure SBAR Mode:** Verify that a class with `sbarWeighting.enabled = false` calculates identical grades to current behavior.
   * **Test 2: Ontario 65/25/10 Composite Math:** Verify that `(Mastery * 0.65) + (Exam * 0.25) + (Attendance * 0.10)` calculates exactly.
   * **Test 3: Progressive Mid-Term Normalization:** Verify that when Exam and Attendance have not been entered yet, the grade equals 100% of current SBAR mastery.
   * **Test 4: Partial Entry:** Verify that entering Attendance (10%) normalizes across 75% weightUsed correctly before the Exam is written.
   * **Test 5: Attendance Locking & Override:** Verify that teacher edits to attendance scores persist even when new absence events are added to the student's log.
   * **Test 6: Manual Adjusted Grade Precedence:** Verify that if `adjustedGrade` is set on the student, it overrides the calculated grade.

### Manual Verification
1. Open the running dev app at `http://localhost:5173`.
2. Navigate to an SBAR class &rarr; **Setup & Logistics &rarr; Assessment Framework**.
3. Enable "Weighted Final Evaluations" and select "Ontario Gr. 11 (65 / 25 / 10)".
4. Open the **Grades** view:
   * Verify the SBAR Grid displays the Final Grade and Term Mastery badges.
   * Open the "Attendance & Participation" task &rarr; click **"Auto-fill from Live Attendance"**.
   * Verify students receive their live attendance percentage.
   * Manually change one student's score from 92 to 97.
   * Log an absence event for that student.
   * Verify the score remains 97 (locked/persisted).
5. Enter a Final Exam score for a student &rarr; verify the final overall course mark updates to the exact 65/25/10 composite.
6. Open **Student 360** &rarr; verify the Academics tab clearly shows the weighted component breakdown.
