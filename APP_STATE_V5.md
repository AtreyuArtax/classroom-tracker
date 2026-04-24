# APP STATE V5

This document serves as the authoritative reference for the current state of the Classroom Tracker project as of Version 5.

## 1. Current DB_VERSION
**Current Version: 24**

## 2. IndexedDB Object Stores
All stores reside in the `classroomTrackerDB` database.

### `settings`
- **KeyPath**: (none, uses singleton key 'singleton')
- **Fields**:
  - `schemaVersion` (number): Current migrations version.
  - `gridSize` (Object): `{ rows, cols }`.
  - `currentYear` (string): Active school year.
  - `currentSemester` (string): Active semester.
  - `behaviorCodes` (Object): Map of codes with properties `icon`, `label`, `category`, `type`, `requiresNote`, `isTopLevel`.
  - `thresholds` (Object): `{ washroomTripsPerWeek, deviceIncidentsPerWeek }`.
  - `gradeBuckets` (Array): Customizable grade ranges and colors (e.g. R, L1, L2, L3, L4).
  - `capGradesAt100` (boolean).
  - `gradebookTemplates` (Array): Saved class configurations.
  - `gradebookMilestones` (Array): Global date boundaries for grade calculations.
  - `academicTerms` (Array).
  - `teacherName` (string).
  - `periodStartTimes` (Object): Map of period numbers to start times (e.g. `'1': '08:00'`).

### `classes`
- **KeyPath**: `classId` (string, UUID)
- **Indexes**: `by_year`, `by_semester`
- **Fields**:
  - `name` (string): Class name.
  - `periodNumber` (number): 1-5.
  - `year` (string)
  - `semester` (string)
  - `students` (Object): Map of `{ [studentId]: { firstName, lastName, generalNote, categoryOverrides, gradebookNote, excludeFromAnalytics, archived, activeStates (e.g. lateMs), parentContacts, studentEmail, custody, livingWith, birthDate } }`.
  - `gradingMethod` (string): 'traditional'.
  - `gradebookCategories` (Array): `[ { categoryId, name, weight } ]`.
  - `gradebookUnits` (Array): `[ { unitId, name, order } ]`. (Refactored to objects with UUIDs).
  - `gradebookNotes` (string): Global class notes.

### `events`
- **KeyPath**: `eventId` (number, autoIncrement)
- **Indexes**: `by_studentId`, `by_classId`, `by_periodNumber`, `by_dayOfWeek`, `by_timestamp`, `by_category`, `by_classId_studentId`, `by_classId_timestamp`.
- **Fields**:
  - `studentId` (string)
  - `classId` (string)
  - `code` (string)
  - `category` (string): Categorical mapping from the code (e.g. 'washroom', 'late', 'absence').
  - `timestamp` (string): ISO format.
  - `duration` (number | null): duration in milliseconds.
  - `note` (string): Optional text.
  - `superseded` (boolean): For attendance logic.

### `assessments`
- **KeyPath**: `assessmentId` (number, autoIncrement)
- **Indexes**: `by_classId`, `by_categoryId`, `by_date`.
- **Fields**:
  - `classId` (string)
  - `categoryId` (string)
  - `name` (string)
  - `date` (string)
  - `assessmentType` (string): 'product' | 'conversation' | 'observation'.
  - `unitId` (string | null): UUID reference to `gradebookUnits`.
  - `target` (string): 'class' | 'individual'.
  - `targetStudentId` (string | null): Only for 'individual' target.
  - `totalPoints` (number)
  - `scaledTotal` (number | null): Optional scaling override.
  - `retestPolicy` (string): 'highest' | 'latest' | 'average' | 'manual'.

### `grades`
- **KeyPath**: `gradeId` (number, autoIncrement)
- **Indexes**: `by_assessmentId`, `by_studentId`, `by_classId`, `by_assessmentAndStudent` (unique), `by_classId_studentId`.
- **Fields**:
  - `assessmentId` (number)
  - `studentId` (string)
  - `classId` (string)
  - `missing` (boolean)
  - `excluded` (boolean)
  - `attempts` (Array): `[ { attemptId, pointsEarned, date, comment, isPrimary } ]`.

## 3. File Inventory (V5 Additions/Modifications)
V5 introduced significant component splitting, extracting complex UI elements out of monolithic views into dedicated folders.
- `src/components/dossier/`: Contains extracted components for the Student 360 view (`Student360.vue`, `StudentTimeline.vue`, `DossierCategoryGrid.vue`, `ProgressReport.vue`, etc.).
- `src/components/setup/`: Contains extracted components for setup views (`SemesterCalendar.vue`, `GradeBucketsSettings.vue`, `CalendarSettings.vue`).
- `src/composables/useStudentDossier.js` & `useStudent360Data.js`: Dedicated composables for dossier reactive state.
- `src/db/migrations.js`: Centralized schema migrations for both IDB upgrades and backup file restoration.
- `src/db/exportService.js`: Dedicated service for data export routines.

## 4. `useGradebook.js` API Additions (V5)
In addition to the base V4 API, V5 introduces comprehensive analytics and a debounced database save system.
- `analyticsMode` (Ref): Toggles between grid and analytics views.
- `exclusionMode` (Ref): 'none', 'fixed', or 'auto' for outlier exclusion.
- `classAnalytics` (Ref): Resulting object from `calculateClassAnalytics`.
- `assessmentStats` (Ref): Cached distribution stats for individual assessments.
- `distributionMode` (Ref): 'buckets' or 'levels'.
- `gradeBuckets` (Ref): Custom grade intervals from settings.
- `refreshClassAnalytics()`: Triggers full class-wide analytics recalculation.
- `setExclusionMode(mode)`: Sets exclusion rules and refreshes analytics.
- `toggleStudentFromAnalytics(studentId)`: Persists an analytics exclusion flag for a specific student.
- `resetAnalyticsState()`: Clears analytics state when exiting the panel.
- **Debounced Save**: `enterGrade`, `changeGrade`, `removeAttempt`, etc. now update the UI instantly (optimistic updates) and use `enqueueDBSave` for background database synchronization.

## 5. Architectural Shifts in V5
- **Component Splitting:** The massive `Grades.vue` file was successfully broken down. The `dossier` directory now encapsulates the complex Student 360 view, significantly improving maintainability.
- **Global Milestones:** `gradebookMilestones` were promoted from class-level to global `settings`, enabling term/semester level boundaries to apply across all classes seamlessly.
- **Units Refactor:** `gradebookUnits` shifted from simple string names to objects containing a stable `unitId` (UUID), ensuring assessment links do not break when a unit is renamed.
- **Data Migrations Pipeline:** Added `migrations.js` capable of up-leveling both local IndexedDB instances and imported `classroomTrackerBackup.json` files to `CURRENT_SCHEMA` transparently.
- **Composite Indexes:** Introduced multi-key indexes (e.g. `by_classId_studentId`) in IndexedDB for substantial performance improvements when filtering large datasets (e.g., student-specific events and grades).

## 6. V6 Roadmap (Potential Post-V5 Focus)
- **Advanced Exporting:** PDF generation for Dossier Progress Reports to share with parents directly.
- **Cross-Class Analytics:** Visualizing teacher-level trends across multiple classes in the same semester.
- **Attendance Insights:** Deeper integration of attendance records into the grade calculation models (e.g., flagging chronic absenteeism directly within the Analytics view).
