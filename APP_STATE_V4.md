# APP STATE V4

This document serves as the authoritative reference for the current state of the Classroom Tracker project as of Version 4.

## 1. Current DB_VERSION
**Current Version: 14**

## 2. IndexedDB Object Stores
All stores reside in the `classroomTrackerDB` database.

### `settings`
- **KeyPath**: (none, uses singleton key 'singleton')
- **Fields**:
  - `schemaVersion` (number): Current migrations version.
  - `gridSize` (Object): `{ rows, cols }`.
  - `behaviorCodes` (Object): Map of codes like `m`, `w`, `a`, `l`, `note`, `ac`, `pc`.
  - `thresholds` (Object): `{ washroomTripsPerWeek, deviceIncidentsPerWeek }`.
  - `gradebookTemplates` (Array): Saved class configurations.

### `classes`
- **KeyPath**: `classId` (string, UUID)
- **Fields**:
  - `name` (string): Class name.
  - `periodNumber` (number): 1-5.
  - `students` (Object): Map of `{ [studentId]: { firstName, lastName, generalNote, categoryOverrides, gradebookNote } }`.
  - `gradingMethod` (string): 'traditional'.
  - `gradebookCategories` (Array): `[ { categoryId, name, weight } ]`.
  - `gradebookMilestones` (Array): `[ { milestoneId, name, date } ]`.
  - `gradebookUnits` (Array): `[ { unitId, name, order } ]`.
  - `gradebookNotes` (string): Global class notes.

### `events`
- **KeyPath**: `eventId` (number, autoIncrement)
- **Indexes**: `by_studentId`, `by_classId`, `by_periodNumber`, `by_dayOfWeek`, `by_timestamp`, `by_category`.
- **Fields**:
  - `studentId` (string)
  - `classId` (string)
  - `code` (string): 'a', 'l', 'w', 'm', 'note', 'ac', 'pc'.
  - `timestamp` (string): ISO format.
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
  - `unit` (string | null): Stores the `unitId` reference.
  - `target` (string): 'class' | 'individual'.
  - `targetStudentId` (string | null): Only for 'individual' target.
  - `totalPoints` (number)
  - `scaledTotal` (number | null): Optional scaling override.
  - `excluded` (boolean): Global exclusion flag.
  - `retestPolicy` (string): 'highest' | 'latest' | 'average' | 'manual'.

### `grades`
- **KeyPath**: `gradeId` (number, autoIncrement)
- **Indexes**: `by_assessmentId`, `by_studentId`, `by_assessmentAndStudent` (unique).
- **Fields**:
  - `assessmentId` (number)
  - `studentId` (string)
  - `missing` (boolean)
  - `excluded` (boolean)
  - `attempts` (Array): `[ { attemptId, pointsEarned, date, comment, isPrimary } ]`.

## 3. File Inventory (V4 Additions/Modifications)
- `src/db/gradebookService.js`: Core data layer for assessments and grades.
- `src/composables/useGradebook.js`: Reactive bridge for all gradebook state and actions.
- `src/views/Grades.vue`: Massive view (~3k lines) handling class grid, student dossier, and assessment editing.
- `src/components/GradeTrendChart.vue`: Chart.js component for visualizing student progress over time.
- `src/views/Setup.vue`: Updated to handle class-wide gradebook configuration and units.
- `src/views/Reports.vue`: Updated to support detailed grade logs and attendance integration.
- `src/App.vue`: Main navigation hub with class-aware view parameters.
- `src/db/index.js`: Manages DB initialization and migrations (up to v14).
- `src/db/classService.js`: Handles class CRUD and student management.
- `src/db/eventService.js`: Manages behavior and attendance event logging.

## 4. `useGradebook.js` API
- `activeClassRecord` (Ref): Currently loaded class object.
- `assessments` (Ref): All assessments for the active class.
- `grades` (Ref): All grade records for the active class.
- `classGrades` (Ref): Map of student IDs to their calculated grade objects.
- `selectedStudentId` (Ref): ID of the student currently viewed in the dossier.
- `selectedMilestone` (Ref): Selected date boundary for calculations.
- `loadGradebook(classRecord)`: Initializes the gradebook state for a specific class.
- `refreshGrades()`: Triggers a full recalculation of all student marks.
- `addAssessment(data)`: Creates a new assessment and adds it to the list.
- `editAssessment(id, updates)`: Updates assessment metadata.
- `deleteAssessment(id)`: Removes assessment and its grades.
- `enterGrade(aId, sId, score, date, comment)`: Adds a new scoring attempt.
- `removeAttempt(aId, sId, attId)`: Deletes a specific score entry.
- `clearGrade(aId, sId)`: Deletes the entire grade record (attempts + flags).
- `markMissing(aId, sId, bool)`: Toggles the "M" flag.
- `markExcluded(aId, sId, bool)`: Toggles the "EX" flag.
- `saveStudentOverride(sId, catId, val)`: Sets a manual category % override.
- `saveStudentGradebookNote(sId, note)`: Persists a student-specific dossier note.
- `fetchStudentDossierData(sId)`: Retrieves behavior events and attendance totals.
- `gradeMap` (Computed): Nested map `[assessmentId][studentId]` for fast data lookup.
- `assessmentStats` (Computed): Distribution stats (avg, high, low) for every assessment.

## 5. `gradebookService.js` API
- `createAssessment(data)`: Persists new assessment record. Returns `{ ...data, assessmentId }`.
- `getAssessmentsByClass(classId)`: Returns `Array<Assessment>`.
- `updateAssessment(id, updates)`: Modifies existing assessment.
- `deleteAssessment(id)`: Transactional delete of assessment + grades.
- `addAttempt(aId, sId, data)`: Adds `{ pointsEarned, date, comment }` to `attempts` array.
- `deleteAttempt(aId, sId, attId)`: Removes specific attempt.
- `setPrimaryAttempt(aId, sId, attId)`: Marks one attempt as `isPrimary: true` for 'Manual' policy.
- `updateGradeFlags(aId, sId, flags)`: Updates `missing` or `excluded`.
- `deleteGrade(aId, sId)`: Full deletion of a student's grade record.
- `resolveAttemptScore(attempts, policy)`: Returns a single number based on the retest policy.
- `calculateStudentGrade(sId, classRecord, options)`: Returns `{ overallGrade, mostConsistent, median, categoryResults }`.
- `calculateWeightedMedian(sId, classRecord, gradeMap, assessments)`: Returns weighted average of categorical medians.
- `calculateMostConsistent(sId, classRecord, gradeMap, assessments)`: Returns weighted average of categorical bucket modes.

## 6. Locked Architectural Decisions
- **KeyPaths**: All primary keys are `gradeId`, `assessmentId`, `classId` etc. to allow for relational-style linking in IndexedDB.
- **Categorical Pattern**: All complex metrics (Consistent, Median) must be calculated *per-category* and then weighted, to match the Official Grade logic.
- **Individual Assessments**: These exist in the `assessments` store with `target: 'individual'`. They are filtered out of the grid but dynamically included in dossier calculation.
- **Retest Persistence**: We never overwrite previous scores. We append to the `attempts` array to preserve history.
- **Vue Proxy Serialization**: All IDB writes must use `JSON.parse(JSON.stringify(obj))` to strip Vue's reactive Proxies before storage. This avoids "could not be cloned" serialization errors in IndexedDB.

## 7. Navigation System
Views are managed by a central `currentView` and `viewParams` reactive in `App.vue`.
1. **Dashboard**: Main class selection and summary stats.
2. **Grades**: Class Grid or Student Dossier.
   - Params: `{ studentId, classId }` switches main view to Dossier mode for the specified student in that class.
3. **Reports**: Behavioral logs and attendance summaries.
   - Params: `{ studentId, classId, from }` for deep-linking.
4. **Setup**: Class configuration and global settings.

## 8. Assessment Type Values
- **`product`**: Traditional summatives (tests, assignments). The most common type.
- **`conversation`**: Evidence gathered through verbal interaction or feedback loops.
- **`observation`**: Evidence gathered through witnessing student performance (labs, group work).

## 9. Grade Calculation Pipeline
1. **Resolve Attempts**: Each assessment grade is reduced to a single score via its `retestPolicy`.
2. **Categorical Midpoint**: 
   - **Official**: Weighted mean of all assessments in category.
   - **Most Consistent**: Midpoint of the most frequent 10% bucket.
   - **Weighted Median**: Midpoint of all scores in the category (sorted).
3. **Final Weighing**: Multiply categorical midpoint by category weight and divide by `weightUsed` (sum of weights for categories containing at least one assessment).

## 10. V5 Roadmap
- **Component Splitting**: Extract `StudentDossier.vue` and `ClassGrid.vue` from the monolithic `Grades.vue`.
- **Advanced Filtering**: Filter grid and dossier by Unit or Date Range.
- **Improved Charting**: Add category breakdown charts to the dossier.

## 11. Post-V4 Polish Items
- **Dossier Density**: The stats row in the header is getting crowded; may need a dedicated "Metrics" card.
- **Modal Overflow**: Category/Unit lists in Setup need better max-height/scrolling.
- **Grid Context Menu**: Right-click on student name could offer "Open Dossier" for faster navigation.

## 12. Known Architectural Notes
- **`Grades.vue` Size**: At ~3k lines, this component is a major candidate for refactoring.
- **Date Consistency**: `date` fields are stored as ISO strings (`YYYY-MM-DD`) to allow for simple string comparisons.
