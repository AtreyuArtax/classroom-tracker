# Graph Report - classroom-tracker  (2026-08-25)

## Corpus Check
- 214 files · ~403,906 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1239 nodes · 2124 edges · 118 communities (105 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2c67a747`
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
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 100 edges
2. `useMessage()` - 40 edges
3. `formatLocalDate()` - 31 edges
4. `get()` - 16 edges
5. `patchStudent()` - 15 edges
6. `_readSettings()` - 15 edges
7. `StrategyHandler` - 14 edges
8. `loadGradebook()` - 14 edges
9. `PrecacheController` - 13 edges
10. `saveGradebookSettings()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `getDB()` --calls--> `openDB()`  [INFERRED]
  src/db/index.js → dev-dist/workbox-ca84f546.js
- `useGradeEditing()` --calls--> `useMessage()`  [EXTRACTED]
  src/composables/useGradeEditing.js → src/composables/useMessage.js
- `updateMultipleStudentSeats()` --calls--> `getDB()`  [EXTRACTED]
  src/db/classService.js → src/db/index.js
- `setPeriodStartTime()` --calls--> `getDB()`  [EXTRACTED]
  src/db/classService.js → src/db/index.js
- `setStudentAbsent()` --calls--> `getDB()`  [EXTRACTED]
  src/db/classService.js → src/db/index.js

## Import Cycles
- None detected.

## Communities (118 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (26): archivedRoster, checkResize(), confirmResize(), createClass(), dismissedSuggestions, dismissSuggestion(), filteredArchivedClasses, filteredClassList (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (34): getUnitGradeLevel(), activeClassRecord, activeGradeFilter, addAssessment(), analyticsMode, assessmentSortOrder, assessmentStats, assessmentTypes (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (45): getStudentEffectiveGrade(), isAssessmentApplicableToStudent(), isAssessmentInSubCohort(), isStudentInSubCohort(), executePrint(), hasUnsyncedChanges, getSettings(), createAssessment() (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (31): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP() (+23 more)

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
Nodes (28): dependencies, exceljs, file-saver, html5-qrcode, idb, jszip, lucide-vue-next, papaparse (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (30): saveStudentDemographics(), archiveClass(), archiveStudent(), bulkImportClasses(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), deleteClass() (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (21): { activeClass, teacherName, init }, auditMsg, auditReport, backupMsg, { confirm, alert }, fixInvalidCategories(), fixMissingIds(), fixOrphans() (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.30
Nodes (14): adjustStudentGrade(), clearGrade(), enqueueDBSave(), enterGrade(), enterGradeSBAR(), markExcluded(), markMissing(), refreshSingleAssessmentStats() (+6 more)

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
Nodes (20): classGrades, allCombinedWork, allDossierAssessments, attendanceStats, behaviorCodesMap, currentStudentObj, displayMetaLine, evidenceMix (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.21
Nodes (4): get(), getMethod(), has(), Router

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (13): addBucket(), { alert, confirm }, capGradesAt100, globalError, hasFieldErrors, localBuckets, ONTARIO_DEFAULTS, removeBucket() (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): useSBarPrintOptions(), effectiveClass, emailConfig, emailRecipients, emit, generateEmailLink(), { getStudentOverallSBarBadge, prepareSBarReportData }, isSBAR (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (14): confirmImport(), detectedSubjects, emit, errorMsg, fileInputRef, handleDrop(), handleFileSelect(), isDragging (+6 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (8): teachingMode, detectGradeFromClassName(), getEffectiveGradeLevel(), parseGradesFromClass(), populateSubjectFromPreset(), populateSubjectFromPresets(), DEFAULT_ELEMENTARY_SUBJECTS, DEFAULT_TRADITIONAL_CATEGORIES

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (28): loadGradebook(), setActiveSubject(), getDB(), auditSettingsIntegrity(), deleteBehaviorCode(), deleteLayoutPreset(), getAcademicTerms(), getAttendanceConfig() (+20 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (19): logAssessmentEvent(), activeClass, gridSize, ensureIEPPresetsForClass(), state, useMessage(), archiveStudent(), assignSeat() (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): background, service_worker, content_scripts, description, manifest_version, name, permissions, version

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (25): handleRfidAttendanceScan(), logAttendanceEvent(), markAllPresentToday(), { push: pushUndo }, academicTerms, activeStudentEvents, archivedClasses, attendanceMode (+17 more)

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (7): list_raw_input_devices(), list_serial_ports(), find_rfid.py — RFID Scanner Diagnostic Utility =================================, On Windows, use ctypes to enumerate Raw Input devices and print keyboard paths., Print all available serial ports on this machine., Listen for rapid keyboard bursts using pynput.     When a burst of ≥6 characters, sniff_keyboard_device()

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): filteredMilestones, globalMilestones, formatDate(), { alert, confirm, select }, exportContainer, props, showExportMenu, formatLocalDisplay() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): calculateStandardDeviation(), classStats, detectOutliers(), result, result2, spreadClass

### Community 32 - "Community 32"
Cohesion: 0.05
Nodes (22): close(), emit, props, academicCategories, activeDossierLsTerm, allDossierAssessments, attendanceAverages, behaviorWeeklyTrend (+14 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (18): _applyDateRange(), createSafetySnapshot(), deleteEvent(), deleteSafetySnapshot(), detachEventsForDeletedExpectation(), detachEventsForDeletedUnit(), exportAllData(), getAllEvents() (+10 more)

### Community 36 - "Community 36"
Cohesion: 0.06
Nodes (27): activeStudentGrades, analyticsSortBy, analyticsSortOrder, bucketChartData, bucketChartOptions, categoryWeightTotal, classEvidenceBlend, classMostConsistent (+19 more)

### Community 38 - "Community 38"
Cohesion: 0.05
Nodes (38): activeClassType, activeSubCohortFilter, aggregates, allClassEvents, assessmentsList, attendanceRate, availableGradeFilters, availableSubCohortFilters (+30 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (9): avatarStyle, cameraIconSize, emit, { getPhotoUrl, initPhotoIds }, handleClick(), initials, photoUrl, props (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.11
Nodes (19): initializeRfidAttendance(), reconcileStaleTrips(), syncLateActiveState(), _activateClass(), archiveClass(), bulkImportClasses(), computeSuggestedClass(), computeWeeklyStats() (+11 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (11): bottomHalf, classTitles, currentPreviewWeeks, getMonthName(), getRowSpanForMonth(), holidayCache, isRowStartOfMonth(), milestoneMap (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (4): isFormValid, selectedExpectationObj, selectedUnit, unitExpectations

### Community 61 - "Community 61"
Cohesion: 0.38
Nodes (4): removeEvent(), clearAllData(), getCurrentSchoolYear(), getCurrentSemester()

### Community 64 - "Community 64"
Cohesion: 0.38
Nodes (4): curriculumPresets, findElementaryPreset(), findElementaryPresets(), getPresetsByPanel()

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
Cohesion: 0.20
Nodes (9): activeSubjectId, effectiveClass, emit, isSBAR, isSystemPrinting, printConfig, props, showPrintPreview (+1 more)

### Community 81 - "Community 81"
Cohesion: 0.11
Nodes (12): copyFeedback, fetchLearningSkills(), learningSkillsMap, matchedCount, onSurveyImported(), props, resolvedRosterStudents, selectedTerm (+4 more)

### Community 85 - "Community 85"
Cohesion: 0.09
Nodes (31): activeCategories, activeClassClassCategoriesUpdate(), activeCourseSection, activeUnits, addCategory(), addExpectation(), addUnit(), availableCourseSections (+23 more)

### Community 87 - "Community 87"
Cohesion: 0.57
Nodes (6): normalizeLearningSkillLevel(), parseCsvRows(), parseLearningSkillsCsv(), parseLearningSkillsRows(), parseLearningSkillsWorkbook(), parseXlsxToRows()

### Community 88 - "Community 88"
Cohesion: 0.15
Nodes (9): formatGrade(), getHeatColor(), getHeatColorHex(), getHeatTextColor(), getSDColor(), getSectionColor(), SECTION_BADGE_STYLE, SECTION_PALETTES (+1 more)

### Community 95 - "Community 95"
Cohesion: 0.29
Nodes (4): confirmBtnRef, inputRef, isConfirmDisabled, { state, handleAction, handleSelectChoice }

### Community 96 - "Community 96"
Cohesion: 0.18
Nodes (6): assessments, gradeMap, availableStrands, displayedExpectations, displayedStrands, masteryMap

### Community 100 - "Community 100"
Cohesion: 0.33
Nodes (4): useClassroom(), saveStudentGradebookNote(), useStudentDossier(), toMinutes()

### Community 103 - "Community 103"
Cohesion: 0.29
Nodes (10): addAttempt(), deleteAttempt(), deleteGrade(), _getGradeInTransaction(), getOrCreateGrade(), saveFullGradeRecord(), saveSBARGrade(), setPrimaryAttempt() (+2 more)

### Community 108 - "Community 108"
Cohesion: 0.08
Nodes (30): activeBulkExp, activeLevelOptions, applyBulkFill(), assignLevel(), assignLevelByCode(), assignNumericPercentage(), bulkOnlyUnset, contextMenu (+22 more)

### Community 109 - "Community 109"
Cohesion: 0.18
Nodes (9): deleteLearningSkillsByTerm(), getLearningSkillsByClass(), getLearningSkillsByClassAndTerm(), getLearningSkillsByStudent(), LEARNING_SKILL_CATEGORIES, LEARNING_SKILL_LEVELS, LEARNING_SKILL_TERMS, LEVEL_MAP (+1 more)

### Community 111 - "Community 111"
Cohesion: 0.24
Nodes (8): canRedo, canUndo, push(), redo(), _redoStack, undo(), _undoStack, useUndo()

### Community 112 - "Community 112"
Cohesion: 0.29
Nodes (4): photoCache, photoIdsSet, showDeskPhotos, useStudentPhotos()

### Community 113 - "Community 113"
Cohesion: 0.33
Nodes (6): formatLearningSkillKey(), saveBatchLearningSkills(), saveLearningSkillsRecord(), clearStudentRating(), prefillAllTeacherRatings(), setTeacherSkill()

### Community 115 - "Community 115"
Cohesion: 0.29
Nodes (6): batchSavePhotos(), deletePhoto(), getAllPhotoIds(), getPhoto(), purgeAllPhotos(), savePhoto()

### Community 116 - "Community 116"
Cohesion: 0.26
Nodes (10): getAttendanceOnDate(), openAddAssessment(), getDateRangeForClassPeriod(), getDateRangeForPeriod(), exportGradebookToExcel(), downloadAggregateCsv(), downloadReportCardCsv(), doExport() (+2 more)

### Community 117 - "Community 117"
Cohesion: 0.40
Nodes (5): onThresholdChange(), getEffectiveClassRecord(), refreshClassAnalytics(), setExclusionMode(), toggleStudentFromAnalytics()

## Knowledge Gaps
- **355 isolated node(s):** `scanBuffer`, `manifest_version`, `name`, `version`, `description` (+350 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 23` to `Community 0`, `Community 2`, `Community 35`, `Community 100`, `Community 3`, `Community 5`, `Community 103`, `Community 8`, `Community 42`, `Community 109`, `Community 113`, `Community 115`, `Community 61`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `openDB()` connect `Community 5` to `Community 94`, `Community 23`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `handleDownloadCsv()` connect `Community 109` to `Community 38`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `scanBuffer`, `manifest_version`, `name` to the rest of the system?**
  _371 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.052854122621564484 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07657657657657657 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08711433756805807 - nodes in this community are weakly interconnected._