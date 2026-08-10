# Graph Report - classroom-tracker  (2026-08-10)

## Corpus Check
- 200 files · ~354,437 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1115 nodes · 1812 edges · 100 communities (89 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c7daf94d`
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
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 107|Community 107]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 82 edges
2. `useMessage()` - 39 edges
3. `get()` - 16 edges
4. `StrategyHandler` - 14 edges
5. `patchStudent()` - 14 edges
6. `PrecacheController` - 13 edges
7. `saveGradebookSettings()` - 13 edges
8. `useClassroom()` - 13 edges
9. `_readSettings()` - 12 edges
10. `Router` - 11 edges

## Surprising Connections (you probably didn't know these)
- `getDB()` --calls--> `openDB()`  [INFERRED]
  src/db/index.js → dev-dist/workbox-ca84f546.js
- `useGradeEditing()` --calls--> `useMessage()`  [EXTRACTED]
  src/composables/useGradeEditing.js → src/composables/useMessage.js
- `logEvent()` --calls--> `getDB()`  [EXTRACTED]
  src/db/eventService.js → src/db/index.js
- `deleteEvent()` --calls--> `getDB()`  [EXTRACTED]
  src/db/eventService.js → src/db/index.js
- `updateEvent()` --calls--> `getDB()`  [EXTRACTED]
  src/db/eventService.js → src/db/index.js

## Import Cycles
- None detected.

## Communities (100 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (28): archivedRoster, bulkImportClasses(), checkResize(), computeSuggestedClass(), confirmResize(), dismissedSuggestions, dismissSuggestion(), filteredArchivedClasses (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (31): getStudentEffectiveGrade(), activeGradeFilter, assessmentSortOrder, assessmentStats, assessmentTypes, availableCourseFilters, availableGradeFilters, closeAddAssessment() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (33): getSettings(), getAssessmentsByClass(), auditGradebookData(), calculateAssessmentAnalytics(), calculateClassAnalytics(), deleteGradebookTemplate(), getExclusionResults(), getGradebookTemplates() (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (33): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP() (+25 more)

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
Cohesion: 0.07
Nodes (27): dependencies, exceljs, file-saver, html5-qrcode, idb, lucide-vue-next, papaparse, qrcode (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (28): saveStudentDemographics(), archiveClass(), archiveStudent(), bulkImportClasses(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), deleteClass() (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (19): exportGradebookToExcel(), { activeClass, teacherName }, auditMsg, auditReport, backupMsg, { confirm, alert }, exportMsg, fixInvalidCategories() (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (18): activeClassRecord, adjustStudentGrade(), assessments, classGrades, clearGrade(), enqueueDBSave(), enterGrade(), enterGradeSBAR() (+10 more)

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
Cohesion: 0.04
Nodes (38): filteredMilestones, globalMilestones, isAssessmentInSubCohort(), toMinutes(), allCombinedWork, allDossierAssessments, attendanceStats, behaviorCodesMap (+30 more)

### Community 15 - "Community 15"
Cohesion: 0.21
Nodes (4): get(), getMethod(), has(), Router

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (13): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (11): confirmBtnRef, inputRef, isConfirmDisabled, { state, handleAction, handleSelectChoice }, emit, isSBAR, isSystemPrinting, printConfig (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (29): applyResize(), crossClassConflicts, currentRapidStudent, enrollTimer, isArchivedPanelVisible, isEditingStudent, isElementaryImporterOpen, isEnrollingRFID (+21 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (25): handleRfidAttendanceScan(), markAllPresentToday(), { push: pushUndo }, academicTerms, activeClass, activeStudentEvents, archivedClasses, attendanceMode (+17 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (13): createClass(), updateActiveClass(), activeSubjectId, teachingMode, autoPopulateAllElementarySubjects(), detectGradeFromClassName(), getEffectiveGradeLevel(), parseGradesFromClass() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (20): auditSettingsIntegrity(), deleteBehaviorCode(), getAcademicTerms(), getAttendanceConfig(), getBehaviorCodes(), getNonSchoolDays(), getPeriodStartTimes(), getTeacherName() (+12 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (25): logAttendanceEvent(), logAssessmentEvent(), gridSize, state, useMessage(), archiveStudent(), assignSeat(), autoAssignSeats() (+17 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): background, service_worker, content_scripts, description, manifest_version, name, permissions, version

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (14): confirmImport(), detectedSubjects, emit, errorMsg, fileInputRef, handleDrop(), handleFileSelect(), isDragging (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (7): list_raw_input_devices(), list_serial_ports(), find_rfid.py — RFID Scanner Diagnostic Utility =================================, On Windows, use ctypes to enumerate Raw Input devices and print keyboard paths., Print all available serial ports on this machine., Listen for rapid keyboard bursts using pynput.     When a burst of ≥6 characters, sniff_keyboard_device()

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (11): onThresholdChange(), getEffectiveClassRecord(), addAssessment(), deleteAssessment(), editAssessment(), refreshClassAnalytics(), refreshGrades(), saveAssessment() (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): calculateStandardDeviation(), classStats, detectOutliers(), result, result2, spreadClass

### Community 32 - "Community 32"
Cohesion: 0.06
Nodes (19): close(), emit, props, academicCategories, allDossierAssessments, attendanceAverages, behaviorWeeklyTrend, classAssessments (+11 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (19): _applyDateRange(), deleteEvent(), detachEventsForDeletedExpectation(), detachEventsForDeletedUnit(), exportAllData(), getAllEvents(), getDateRangeForClassPeriod(), getDateRangeForPeriod() (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.05
Nodes (37): activeStudentGrades, analyticsSortBy, analyticsSortOrder, bucketChartData, bucketChartOptions, categoryWeightTotal, classEvidenceBlend, classMostConsistent (+29 more)

### Community 38 - "Community 38"
Cohesion: 0.07
Nodes (23): aggregates, allClassEvents, assessmentsList, attendanceRate, behaviorCodesMap, chronicallyAbsentCount, classGrades, followUpExpanded (+15 more)

### Community 41 - "Community 41"
Cohesion: 0.39
Nodes (4): removeEvent(), clearAllData(), getCurrentSchoolYear(), getCurrentSemester()

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (4): isFormValid, selectedExpectationObj, selectedUnit, unitExpectations

### Community 72 - "Community 72"
Cohesion: 0.07
Nodes (16): { 
  activeClass, 
  classList,
  periodOptions, 
  periodStartTimes, 
  updatePeriodStartTimes, 
  selectedYear, 
  selectedSemester,
  importRoster, 
  bulkImportClasses, 
  moveStudentFromClass 
}, { alert, confirm }, bulkAvailableSemesters, bulkImportGroups, bulkImportSemesters, crossClassConflicts, currentSchoolYear, importResult (+8 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (10): initializeRfidAttendance(), reconcileStaleTrips(), syncLateActiveState(), _activateClass(), archiveClass(), computeWeeklyStats(), editEvent(), logToggleEvent() (+2 more)

### Community 83 - "Community 83"
Cohesion: 0.06
Nodes (19): availableCategories, availableCourseFilters, availableGradeFilters, availableUnits, CATEGORY_COLORS, getCellStyle(), headerMenu, highlightedColumnId (+11 more)

### Community 85 - "Community 85"
Cohesion: 0.08
Nodes (35): curriculumPresets, findElementaryPreset(), findElementaryPresets(), getPresetsByPanel(), activeCategories, activeClassClassCategoriesUpdate(), activeCourseSection, activeUnits (+27 more)

### Community 88 - "Community 88"
Cohesion: 0.40
Nodes (4): hasUnsyncedChanges, createAssessment(), deleteAssessment(), updateAssessment()

### Community 103 - "Community 103"
Cohesion: 0.29
Nodes (10): addAttempt(), deleteAttempt(), deleteGrade(), _getGradeInTransaction(), getOrCreateGrade(), saveFullGradeRecord(), saveSBARGrade(), setPrimaryAttempt() (+2 more)

## Knowledge Gaps
- **317 isolated node(s):** `scanBuffer`, `manifest_version`, `name`, `version`, `description` (+312 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 8` to `Community 0`, `Community 2`, `Community 35`, `Community 3`, `Community 5`, `Community 103`, `Community 41`, `Community 78`, `Community 23`, `Community 88`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `openDB()` connect `Community 5` to `Community 8`, `Community 94`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `useMessage()` connect `Community 24` to `Community 0`, `Community 1`, `Community 3`, `Community 8`, `Community 9`, `Community 10`, `Community 72`, `Community 78`, `Community 14`, `Community 16`, `Community 18`, `Community 20`, `Community 85`, `Community 28`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `scanBuffer`, `manifest_version`, `name` to the rest of the system?**
  _333 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05217391304347826 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07899159663865546 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11517165005537099 - nodes in this community are weakly interconnected._