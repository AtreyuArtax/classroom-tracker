# Graph Report - classroom-tracker  (2026-08-30)

## Corpus Check
- 227 files · ~448,611 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1400 nodes · 2413 edges · 125 communities (112 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ddae1493`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 111 edges
2. `useMessage()` - 41 edges
3. `formatLocalDate()` - 35 edges
4. `loadGradebook()` - 17 edges
5. `get()` - 16 edges
6. `_readSettings()` - 16 edges
7. `patchStudent()` - 15 edges
8. `StrategyHandler` - 14 edges
9. `useClassroom()` - 14 edges
10. `calculateClassAnalytics()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `getDB()` --calls--> `openDB()`  [INFERRED]
  src/db/index.js → dev-dist/workbox-ca84f546.js
- `downloadAggregateCsv()` --calls--> `formatLocalDate()`  [EXTRACTED]
  src/components/reports/ReportsExportMenu.vue → src/utils/dates.js
- `doExport()` --calls--> `formatLocalDate()`  [EXTRACTED]
  src/components/setup/DatabaseMaintenanceSettings.vue → src/utils/dates.js
- `useGradeEditing()` --calls--> `useMessage()`  [EXTRACTED]
  src/composables/useGradeEditing.js → src/composables/useMessage.js
- `updateMultipleStudentSeats()` --calls--> `getDB()`  [EXTRACTED]
  src/db/classService.js → src/db/index.js

## Import Cycles
- None detected.

## Communities (125 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (23): archivedRoster, checkResize(), confirmResize(), dismissedSuggestions, dismissSuggestion(), filteredArchivedClasses, filteredClassList, getStudentEventHistory() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (39): getEffectiveClassRecord(), getStudentEffectiveGrade(), getUnitGradeLevel(), addAssessment(), analyticsEvidenceScope, assessmentSortOrder, assessmentStats, availableCourseFilters (+31 more)

### Community 2 - "Community 2"
Cohesion: 0.23
Nodes (23): hasUnsyncedChanges, getSettings(), getAssessmentsByClass(), calculateAssessmentAnalytics(), calculateClassAnalytics(), getExclusionResults(), buildDistributionBuckets(), buildLevelDistributionBuckets() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (24): getLastSyncedAt(), isSyncActive(), AddAssessmentModal, checkSyncStatus(), { clear: clearUndo }, { computeSuggestedClass }, currentComponent, currentView (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (27): BaseHTTPRequestHandler, Path, consume_scan(), _create_tray_icon_image(), get_app_dir(), keyboard_reader(), load_config(), log() (+19 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (27): addRoute(), cacheDonePromiseForTransaction(), CacheFirst, cacheMatchIgnoreParams(), cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), Deferred (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (4): PrecacheStrategy, Strategy, StrategyHandler, toRequest()

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (30): dependencies, exceljs, file-saver, html5-qrcode, idb, jszip, lucide-vue-next, papaparse (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (19): assessments, classRecord, cleanSample1, cleanSample2, cleanSample3, cleanSample4, colonParsed, csvParsed (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (30): { activeClass, teacherName, init }, auditMsg, auditReport, backupMsg, { confirm, alert }, directoryBackups, doExport(), doImport() (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.26
Nodes (16): adjustStudentGrade(), classGrades, clearGrade(), enqueueDBSave(), enterGrade(), enterGradeSBAR(), enterGradeSBARBulk(), markExcluded() (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (16): activeCategory, allCodes, ATTENDANCE_CATEGORIES, centreGoesBack, close(), handleCentre(), handleItemTap(), handleProfileTap() (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (4): createCacheKey(), PrecacheCacheKeyPlugin, PrecacheController, waitUntil()

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (5): CacheExpiration, dontWaitFor(), ExpirationPlugin, registerQuotaErrorCallback(), removeIgnoredSearchParams()

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (20): props, allCombinedWork, allDossierAssessments, attendanceStats, behaviorCodesMap, currentStudentObj, displayMetaLine, evidenceMix (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.21
Nodes (4): get(), getMethod(), has(), Router

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (13): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (18): activeSubjectId, activeClassRecord, assessments, filteredMilestones, gradeMap, useSBarPrintOptions(), exportGradebookToExcel(), formatDate() (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (21): getDB(), batchSavePhotos(), deletePhoto(), getAllPhotoIds(), getPhoto(), purgeAllPhotos(), savePhoto(), cascadeRenameExpectation() (+13 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (25): auditSettingsIntegrity(), deleteBehaviorCode(), deleteLayoutPreset(), getAcademicTerms(), getAppTheme(), getAttendanceConfig(), getBehaviorCodes(), getNonSchoolDays() (+17 more)

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (29): saveStudentDemographics(), archiveClass(), archiveStudent(), bulkImportClasses(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), getAllClasses() (+21 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (18): logAssessmentEvent(), activeClass, gridSize, state, useMessage(), archiveStudent(), assignSeat(), autoAssignSeats() (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): background, service_worker, content_scripts, description, manifest_version, name, permissions, version

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (16): academicTerms, activeStudentEvents, archivedClasses, attendanceMode, autoStartRFID, behaviorCodes, cloudModeEnabled, isScannerOpen (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (7): list_raw_input_devices(), list_serial_ports(), find_rfid.py — RFID Scanner Diagnostic Utility =================================, On Windows, use ctypes to enumerate Raw Input devices and print keyboard paths., Print all available serial ports on this machine., Listen for rapid keyboard bursts using pynput.     When a burst of ≥6 characters, sniff_keyboard_device()

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (10): close(), emit, props, useClassroom(), globalMilestones, isAssessmentInSubCohort(), saveStudentGradebookNote(), useStudentDossier() (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): calculateStandardDeviation(), classStats, detectOutliers(), result, result2, spreadClass

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (22): auditResult, corruptedAuditDatabase, exportedJsonString, fullDatabaseState, healedAssessments, healedGradesAfterOrphanRemoval, healedGradesWithClassId, importedParsedState (+14 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (27): deleteClass(), _applyDateRange(), createSafetySnapshot(), deleteEvent(), deleteSafetySnapshot(), detachEventsForDeletedExpectation(), detachEventsForDeletedUnit(), exportAllData() (+19 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (28): bucketChartData, categoryBreakdowns, conversationCount, instructionalHotspots, observationCount, oPct, pPct, productCount (+20 more)

### Community 38 - "Community 38"
Cohesion: 0.03
Nodes (54): activeGradeFilter, {
  activeClass,
  behaviorCodes,
  classList,
  filteredClassList,
  switchClass,
  academicTerms,
  teacherName
}, activeClassType, activeSubCohortFilter, aggregates, allClassEvents, assessmentsList, attendanceRate (+46 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (13): photoCache, photoIdsSet, showDeskPhotos, useStudentPhotos(), avatarStyle, cameraIconSize, emit, { getPhotoUrl, initPhotoIds } (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (17): handleRfidAttendanceScan(), initializeRfidAttendance(), logAttendanceEvent(), markAllPresentToday(), masterTimestamp, { push: pushUndo }, syncLateActiveState(), toggleTestDay() (+9 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (11): bottomHalf, classTitles, currentPreviewWeeks, getMonthName(), getRowSpanForMonth(), holidayCache, isRowStartOfMonth(), milestoneMap (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (8): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP()

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (4): isFormValid, selectedExpectationObj, selectedUnit, unitExpectations

### Community 58 - "Community 58"
Cohesion: 0.17
Nodes (9): assessmentTypes, closeAddAssessment(), isEditingAssessment, newAssessment, onTargetChange(), showAddAssessmentModal, sortedUnits, isSBAR (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (14): reconcileStaleTrips(), _activateClass(), archiveClass(), bulkImportClasses(), computeSuggestedClass(), createClass(), hasBeenDismissedToday(), init() (+6 more)

### Community 64 - "Community 64"
Cohesion: 0.21
Nodes (8): applyDomTheme(), initTheme(), isDarkMode, osPrefersDark, resolvedTheme, setTheme(), themePreference, app

### Community 72 - "Community 72"
Cohesion: 0.07
Nodes (17): { 
  activeClass, 
  classList,
  periodOptions, 
  periodStartTimes, 
  updatePeriodStartTimes, 
  selectedYear, 
  selectedSemester,
  teachingMode,
  importRoster, 
  bulkImportClasses, 
  moveStudentFromClass 
}, { alert, confirm }, bulkAvailableSemesters, bulkImportGroups, bulkImportSemesters, crossClassConflicts, currentSchoolYear, importResult (+9 more)

### Community 78 - "Community 78"
Cohesion: 0.09
Nodes (18): confirmBtnRef, inputRef, isConfirmDisabled, { state, handleAction, handleSelectChoice }, executePrint(), calendar, events, loading (+10 more)

### Community 81 - "Community 81"
Cohesion: 0.08
Nodes (29): deleteLearningSkillsByTerm(), deleteLearningSkillsRecord(), formatLearningSkillKey(), getLearningSkillsByClass(), getLearningSkillsByClassAndTerm(), getLearningSkillsByStudent(), hasLearningSkillsData(), LEARNING_SKILL_CATEGORIES (+21 more)

### Community 85 - "Community 85"
Cohesion: 0.20
Nodes (10): migrateData(), repairExpectationHtmlEntities(), CURRICULUM_DIR, __dirname, __filename, INDEX_FILE, ROOT_DIR, shouldFix (+2 more)

### Community 87 - "Community 87"
Cohesion: 0.57
Nodes (6): normalizeLearningSkillLevel(), parseCsvRows(), parseLearningSkillsCsv(), parseLearningSkillsRows(), parseLearningSkillsWorkbook(), parseXlsxToRows()

### Community 88 - "Community 88"
Cohesion: 0.08
Nodes (29): teachingMode, autoPopulateAllElementarySubjects(), detectGradeFromClassName(), ensureIEPPresetsForClass(), getEffectiveGradeLevel(), parseGradesFromClass(), populateSubjectFromPreset(), populateSubjectFromPresets() (+21 more)

### Community 91 - "Community 91"
Cohesion: 0.20
Nodes (10): description, type, description, type, properties, grade, isSuccessCriteria, subjectCode (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.04
Nodes (45): allExpectationCodes, benchmarkResults, categoryIds, computedClassGrades, eventCodes, evidenceTypes, heapTotalMb, heapUsedMb (+37 more)

### Community 98 - "Community 98"
Cohesion: 0.15
Nodes (12): chartData, chartOptions, dominantLevel, dominantSubstep, expectationStatsList, filteredAssessments, growthVelocity, hardestExpectations (+4 more)

### Community 102 - "Community 102"
Cohesion: 0.29
Nodes (10): addAttempt(), deleteAttempt(), deleteGrade(), _getGradeInTransaction(), getOrCreateGrade(), saveFullGradeRecord(), saveSBARGrade(), setPrimaryAttempt() (+2 more)

### Community 103 - "Community 103"
Cohesion: 0.11
Nodes (17): aliciaOverall, ast1, ast2, ast3, bobOverall, decayingRes, gradeMap1, gradeMap2 (+9 more)

### Community 108 - "Community 108"
Cohesion: 0.08
Nodes (33): activeBulkExp, activeLevelOptions, applyBulkFill(), assignLevel(), assignLevelByCode(), assignNumericPercentage(), bulkScope, contextMenu (+25 more)

### Community 109 - "Community 109"
Cohesion: 0.36
Nodes (7): isCohortMatch(), calculateDecayingAverage(), calculateMode(), calculatePowerLaw(), calculateSBARExpectationMastery(), calculateSBARStudentOverallMastery(), getSBARLevelBadge()

### Community 111 - "Community 111"
Cohesion: 0.24
Nodes (8): canRedo, canUndo, push(), redo(), _redoStack, undo(), _undoStack, useUndo()

### Community 112 - "Community 112"
Cohesion: 0.67
Nodes (3): title, description, type

### Community 115 - "Community 115"
Cohesion: 0.25
Nodes (8): properties, description, type, description, minItems, type, name, overalls

### Community 116 - "Community 116"
Cohesion: 0.31
Nodes (6): computeWeeklyStats(), editEvent(), removeEvent(), clearAllData(), getCurrentSchoolYear(), getCurrentSemester()

### Community 117 - "Community 117"
Cohesion: 0.29
Nodes (8): required, type, items, strands, description, items, minItems, type

### Community 118 - "Community 118"
Cohesion: 0.33
Nodes (5): description, required, $schema, title, type

### Community 120 - "Community 120"
Cohesion: 0.50
Nodes (4): description, enum, type, panel

### Community 121 - "Community 121"
Cohesion: 0.50
Nodes (4): description, pattern, type, presetId

### Community 122 - "Community 122"
Cohesion: 0.50
Nodes (4): region, default, description, type

### Community 123 - "Community 123"
Cohesion: 0.67
Nodes (3): description, type, department

## Knowledge Gaps
- **487 isolated node(s):** `scanBuffer`, `manifest_version`, `name`, `version`, `description` (+482 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 20` to `Community 0`, `Community 2`, `Community 35`, `Community 3`, `Community 5`, `Community 102`, `Community 81`, `Community 116`, `Community 21`, `Community 85`, `Community 23`, `Community 28`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Why does `openDB()` connect `Community 5` to `Community 20`, `Community 94`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `loadGradebook()` (e.g. with `getGlobalMilestones()` and `getGradeBuckets()`) actually correct?**
  _`loadGradebook()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `scanBuffer`, `manifest_version`, `name` to the rest of the system?**
  _503 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05365853658536585 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._