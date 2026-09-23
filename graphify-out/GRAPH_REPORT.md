# Graph Report - classroom-tracker  (2026-09-23)

## Corpus Check
- 279 files · ~574,158 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1896 nodes · 3199 edges · 169 communities (151 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `07dbedf1`
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
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
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
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 127|Community 127]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 136|Community 136]]
- [[_COMMUNITY_Community 137|Community 137]]
- [[_COMMUNITY_Community 138|Community 138]]
- [[_COMMUNITY_Community 139|Community 139]]
- [[_COMMUNITY_Community 141|Community 141]]
- [[_COMMUNITY_Community 142|Community 142]]
- [[_COMMUNITY_Community 143|Community 143]]
- [[_COMMUNITY_Community 145|Community 145]]
- [[_COMMUNITY_Community 146|Community 146]]
- [[_COMMUNITY_Community 147|Community 147]]
- [[_COMMUNITY_Community 150|Community 150]]
- [[_COMMUNITY_Community 151|Community 151]]
- [[_COMMUNITY_Community 152|Community 152]]
- [[_COMMUNITY_Community 153|Community 153]]
- [[_COMMUNITY_Community 155|Community 155]]
- [[_COMMUNITY_Community 157|Community 157]]
- [[_COMMUNITY_Community 158|Community 158]]
- [[_COMMUNITY_Community 159|Community 159]]
- [[_COMMUNITY_Community 160|Community 160]]
- [[_COMMUNITY_Community 161|Community 161]]
- [[_COMMUNITY_Community 162|Community 162]]
- [[_COMMUNITY_Community 163|Community 163]]
- [[_COMMUNITY_Community 164|Community 164]]
- [[_COMMUNITY_Community 165|Community 165]]
- [[_COMMUNITY_Community 166|Community 166]]
- [[_COMMUNITY_Community 167|Community 167]]
- [[_COMMUNITY_Community 168|Community 168]]

## God Nodes (most connected - your core abstractions)
1. `getDB()` - 119 edges
2. `useMessage()` - 47 edges
3. `formatLocalDate()` - 40 edges
4. `calculateStudentGrade()` - 29 edges
5. `loadGradebook()` - 21 edges
6. `_readSettings()` - 20 edges
7. `calculateSBARStudentOverallMastery()` - 18 edges
8. `calculateClassAnalytics()` - 17 edges
9. `isCohortMatch()` - 17 edges
10. `get()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `getDB()` --calls--> `openDB()`  [INFERRED]
  src/db/index.js → dev-dist/workbox-ca84f546.js
- `downloadAggregateCsv()` --calls--> `formatLocalDate()`  [EXTRACTED]
  src/components/reports/ReportsExportMenu.vue → src/utils/dates.js
- `doExport()` --calls--> `formatLocalDate()`  [EXTRACTED]
  src/components/setup/DatabaseMaintenanceSettings.vue → src/utils/dates.js
- `onClearAllData()` --calls--> `getDB()`  [EXTRACTED]
  src/components/setup/DatabaseMaintenanceSettings.vue → src/db/index.js
- `loadGradebook()` --calls--> `getGlobalMilestones()`  [INFERRED]
  src/composables/useGradebook.js → src/db/settingsService.js

## Import Cycles
- None detected.

## Communities (169 total, 18 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (39): archivedRoster, checkResize(), confirmResize(), dismissedSuggestions, filteredArchivedClasses, filteredClassList, generateUniqueUserCode(), globalStudentsOut (+31 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (42): getUnitGradeLevel(), addAssessment(), adjustStudentGrade(), analyticsEvidenceScope, assessmentSortOrder, assessmentStats, assessmentTypes, availableCourseFilters (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.21
Nodes (16): auditGradebookData(), calculateAssessmentAnalytics(), calculateClassAnalytics(), deleteAssessments(), deleteGradebookTemplate(), getExclusionResults(), getGradebookTemplates(), repairGradebookOrphans() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (25): getLastSyncedAt(), isSyncActive(), AddAssessmentModal, checkSyncStatus(), { clear: clearUndo }, { computeSuggestedClass }, currentComponent, currentView (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (31): BaseHTTPRequestHandler, Path, consume_scan(), _create_tray_icon_image(), get_app_dir(), keyboard_reader(), load_config(), log() (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (19): addRoute(), CacheFirst, cacheMatchIgnoreParams(), cacheWillUpdate(), canConstructResponseFromBodyStream(), copyResponse(), Deferred, executeQuotaErrorCallbacks() (+11 more)

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
Cohesion: 0.09
Nodes (18): { activeClass, teacherName, init }, auditMsg, auditReport, backupMsg, { confirm, alert }, directoryBackups, doExport(), importPreview (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.34
Nodes (14): clearGrade(), enqueueDBSave(), enterGrade(), enterGradeSBAR(), enterGradeSBARBulk(), markExcluded(), markMissing(), refreshSingleAssessmentStats() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (18): activeCategory, activeCodes, allCodes, ATTENDANCE_CATEGORIES, centreGoesBack, close(), handleCentre(), handleItemTap() (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (4): createCacheKey(), PrecacheCacheKeyPlugin, PrecacheController, waitUntil()

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (5): CacheExpiration, dontWaitFor(), ExpirationPlugin, registerQuotaErrorCallback(), removeIgnoredSearchParams()

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (20): props, allCombinedWork, allDossierAssessments, attendanceStats, behaviorCodesMap, currentStudentObj, displayMetaLine, evidenceMix (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (12): cacheDonePromiseForTransaction(), get(), getCursorAdvanceMethods(), getIdbProxyableTypes(), getMethod(), has(), openDB(), promisifyRequest() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (15): alexMathGrade, baseClass, effMath, effMathPopulated, effSci, g7ExpB1, g8ExpB1, hasGrade8Math (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (41): confirmImport(), detectedSubjects, emit, errorMsg, fileInputRef, handleDrop(), handleFileSelect(), isDragging (+33 more)

### Community 20 - "Community 20"
Cohesion: 0.36
Nodes (5): calculatePercentChange(), ensureFiniteNumber(), preciseRound(), safeDivide(), safeMean()

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (28): auditSettingsIntegrity(), deleteBehaviorCode(), deleteLayoutPreset(), getAcademicTerms(), getAppTheme(), getAttendanceConfig(), getBehaviorCodes(), getGlobalMilestones() (+20 more)

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (32): saveStudentDemographics(), archiveClass(), archiveStudent(), bulkImportClasses(), clearStudentAbsent(), clearStudentActiveState(), clearStudentLate(), getAllClasses() (+24 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (21): logAssessmentEvent(), activeClassRecord, syncStudentAcrossRefs(), useGradeEditing(), state, useMessage(), archiveStudent(), assignSeat() (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): background, service_worker, content_scripts, description, manifest_version, name, permissions, version

### Community 26 - "Community 26"
Cohesion: 0.10
Nodes (25): handleRfidAttendanceScan(), initializeRfidAttendance(), toggleTestDay(), _activateClass(), archiveClass(), computeSuggestedClass(), createClass(), dismissSuggestion() (+17 more)

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (7): list_raw_input_devices(), list_serial_ports(), find_rfid.py — RFID Scanner Diagnostic Utility =================================, On Windows, use ctypes to enumerate Raw Input devices and print keyboard paths., Print all available serial ports on this machine., Listen for rapid keyboard bursts using pynput.     When a burst of ≥6 characters, sniff_keyboard_device()

### Community 28 - "Community 28"
Cohesion: 0.23
Nodes (17): calculateMostConsistent(), calculateWeightedMedian(), filterAssessmentsForSubject(), getAssessmentPercentage(), getBucketMode(), isCohortMatch(), calculateDecayingAverage(), calculateMode() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): calculateStandardDeviation(), classStats, detectOutliers(), result, result2, spreadClass

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (26): auditResult, corruptedAuditDatabase, exportedJsonString, fullDatabaseState, healedAssessments, healedGradesAfterOrphanRemoval, healedGradesWithClassId, importedParsedState (+18 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (25): deleteClass(), _applyDateRange(), createSafetySnapshot(), dataUrlToBlob(), deleteEvent(), deleteSafetySnapshot(), detachEventsForDeletedExpectation(), detachEventsForDeletedUnit() (+17 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (28): bucketChartData, categoryBreakdowns, conversationCount, instructionalHotspots, observationCount, oPct, pPct, productCount (+20 more)

### Community 38 - "Community 38"
Cohesion: 0.03
Nodes (56): activeGradeFilter, {
  activeClass,
  behaviorCodes,
  classList,
  filteredClassList,
  switchClass,
  academicTerms,
  teacherName,
  thresholds
}, activeClassType, activeSubCohortFilter, activeVisualTab, aggregates, allClassEvents, assessmentsList (+48 more)

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (15): resolveSubjectPreset(), curriculumPresets, findElementaryPreset(), findElementaryPresets(), getPresetsByPanel(), elemBlueprints, expectedCodes, g8Sci (+7 more)

### Community 42 - "Community 42"
Cohesion: 0.04
Nodes (43): asts1A, astsMulti, cat1A, cat1B, cat1C, cat2A, cat3A, classMultiCat (+35 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (11): bottomHalf, classTitles, currentPreviewWeeks, getMonthName(), getRowSpanForMonth(), holidayCache, isRowStartOfMonth(), milestoneMap (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (8): _ensureCameras(), handleStartByMode(), _startInstance(), startScanner(), stopScanner(), switchCamera(), targetClassStudentsOut, togglePiP()

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (4): isFormValid, selectedExpectationObj, selectedUnit, unitExpectations

### Community 51 - "Community 51"
Cohesion: 0.14
Nodes (6): entryPercent, filteredRoster, levelBreakdown, liveAssessmentStats, targetCourseRoster, unitColor

### Community 52 - "Community 52"
Cohesion: 0.08
Nodes (20): activeOutIcon, atRiskDotTooltip, defaultAlign, defaultPlacement, deviceDotTooltip, elapsedFormatted, flashing, horizontalAlign (+12 more)

### Community 58 - "Community 58"
Cohesion: 0.21
Nodes (8): applyDomTheme(), initTheme(), isDarkMode, osPrefersDark, resolvedTheme, setTheme(), themePreference, app

### Community 61 - "Community 61"
Cohesion: 0.09
Nodes (22): activeDates, classResults, consecLatePattern, consecPattern, dowPattern, fullClassEvents, lateEvents, latePattern (+14 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (18): autoPopulateAllElementarySubjects(), detectGradeFromClassName(), ensureIEPPresetsForClass(), getEffectiveClassRecord(), getEffectiveGradeLevel(), parseGradesFromClass(), populateSubjectFromPreset(), populateSubjectFromPresets() (+10 more)

### Community 72 - "Community 72"
Cohesion: 0.06
Nodes (24): bulkImportClasses(), { 
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
  moveStudentFromClass,
  archiveStudentInClass,
  reloadClasses
}, { alert, confirm }, bulkAvailableSemesters, bulkImportGroups, bulkImportSemesters, confirmBulkImport(), crossClassConflicts (+16 more)

### Community 78 - "Community 78"
Cohesion: 0.10
Nodes (18): getStudentEffectiveGrade(), isAssessmentApplicableToStudent(), isStudentInSubCohort(), executePrint(), calendar, events, loading, student (+10 more)

### Community 81 - "Community 81"
Cohesion: 0.08
Nodes (32): deleteLearningSkillsByTerm(), deleteLearningSkillsRecord(), escapeCsvCell(), exportAllLearningSkillsCsv(), exportLearningSkillsCsv(), formatLearningSkillKey(), getLearningSkillsByClass(), getLearningSkillsByClassAndTerm() (+24 more)

### Community 85 - "Community 85"
Cohesion: 0.36
Nodes (4): migrateData(), repairExpectationHtmlEntities(), cleanCurriculumObject(), cleanExpectationText()

### Community 87 - "Community 87"
Cohesion: 0.11
Nodes (17): aliciaOverall, ast1, ast2, ast3, bobOverall, decayingRes, gradeMap1, gradeMap2 (+9 more)

### Community 88 - "Community 88"
Cohesion: 0.11
Nodes (16): _calculateCategoryGrade(), resolveAttemptScore(), mockAssessments, mockClassWithStrings, mockGrades, mockMasteryPreRef, mockSbarAssessments, mockSbarClass (+8 more)

### Community 91 - "Community 91"
Cohesion: 0.20
Nodes (10): description, type, description, type, properties, grade, isSuccessCriteria, title (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.04
Nodes (45): allExpectationCodes, benchmarkResults, categoryIds, computedClassGrades, eventCodes, evidenceTypes, heapTotalMb, heapUsedMb (+37 more)

### Community 103 - "Community 103"
Cohesion: 0.25
Nodes (5): elementaryClass, sampleAssessments, secondaryClass, splitSecondaryClass, storage

### Community 108 - "Community 108"
Cohesion: 0.08
Nodes (33): activeBulkExp, activeLevelOptions, applyBulkFill(), assignLevel(), assignLevelByCode(), assignNumericPercentage(), bulkScope, contextMenu (+25 more)

### Community 109 - "Community 109"
Cohesion: 0.20
Nodes (19): getSettings(), getAssessmentsByClass(), calculateClassGrades(), calculateStudentGrade(), getGradesByClass(), getGradesByStudent(), allGradesElem, assessmentsElem (+11 more)

### Community 111 - "Community 111"
Cohesion: 0.24
Nodes (8): canRedo, canUndo, push(), redo(), _redoStack, undo(), _undoStack, useUndo()

### Community 112 - "Community 112"
Cohesion: 0.14
Nodes (12): assessments, filteredMilestones, gradeMap, useSBarPrintOptions(), formatDate(), { alert, confirm, select }, downloadAggregateCsv(), exportContainer (+4 more)

### Community 113 - "Community 113"
Cohesion: 0.09
Nodes (21): gr6ExpB11, gr6Exps, gr6Filtered, gr6Preset, gr6Unit, gr8ExpB11, gr8Exps, gr8Filtered (+13 more)

### Community 115 - "Community 115"
Cohesion: 0.25
Nodes (8): properties, description, type, description, minItems, type, name, overalls

### Community 116 - "Community 116"
Cohesion: 0.21
Nodes (8): applyClassToMaster(), applyMasterToClasses(), expandedKeys, getItemKey(), onClose(), presetTitle, selectedClassIds, toggleSelectClass()

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
Cohesion: 0.14
Nodes (17): logAttendanceEvent(), markAllPresentToday(), masterTimestamp, { push: pushUndo }, reconcileStaleTrips(), syncLateActiveState(), syncStudentState(), computeWeeklyStats() (+9 more)

### Community 127 - "Community 127"
Cohesion: 0.50
Nodes (3): results, rows, validRows

### Community 129 - "Community 129"
Cohesion: 0.04
Nodes (43): bucketTotalCount, classMean, classMedian, classSD, cohortOverallScores, decayingImproving, effMath, effSci (+35 more)

### Community 131 - "Community 131"
Cohesion: 0.15
Nodes (11): assessmentsList, cleanCode, cleanText1, masteryMapMode, masteryMapPowerLaw, mockMTH1WPreset, mockSbarClass, strandAAExps (+3 more)

### Community 136 - "Community 136"
Cohesion: 0.06
Nodes (32): academicAssessment1, academicAssessment2, adminCheckGrade, adminSafetyContract, adminTextbook, adminTextGrade, adminView, allAssessments (+24 more)

### Community 138 - "Community 138"
Cohesion: 0.15
Nodes (13): deriveOverallPreset(), deriveSpecificPreset(), getMasterPreset(), getSuccessCriteriaPreset(), allBlueprints, { customPresets }, derivedOveralls, icsBlueprint (+5 more)

### Community 139 - "Community 139"
Cohesion: 0.29
Nodes (6): aliceGrades, allAssessments, attendanceAssessment, baseClass, finalExamAssessment, sbarCourseworkAssessments

### Community 141 - "Community 141"
Cohesion: 0.25
Nodes (6): CURRICULUM_DIR, __dirname, __filename, INDEX_FILE, ROOT_DIR, shouldFix

### Community 142 - "Community 142"
Cohesion: 0.13
Nodes (11): close(), emit, props, useClassroom(), classGrades, globalMilestones, isAssessmentInSubCohort(), saveStudentGradebookNote() (+3 more)

### Community 145 - "Community 145"
Cohesion: 0.25
Nodes (14): diffClassAgainstMaster(), exportClassExpectationsToMaster(), extractMasterExpectations(), findMatchingClassesForPreset(), getCourseBlueprints(), getMergedCurriculumPresets(), isCourseCodeMatch(), isMasterCustomized() (+6 more)

### Community 146 - "Community 146"
Cohesion: 0.67
Nodes (3): subjectCode, description, type

### Community 150 - "Community 150"
Cohesion: 0.40
Nodes (3): editor, sampleBlueprint, storage

### Community 151 - "Community 151"
Cohesion: 0.38
Nodes (6): resetMasterPreset(), deleteCustomCurriculumPreset(), main(), mockStorage, runAsyncTest(), runTest()

### Community 152 - "Community 152"
Cohesion: 0.67
Nodes (3): calendarFiles, getAvailableBoardCalendars(), getBoardCalendar()

### Community 153 - "Community 153"
Cohesion: 0.25
Nodes (7): classA, classB, classC_stale, classD_fromEvents, lStorage, sStorage, todayStr

### Community 155 - "Community 155"
Cohesion: 0.15
Nodes (26): hasUnsyncedChanges, getDB(), batchSavePhotos(), deletePhoto(), getAllPhotoIds(), getPhoto(), purgeAllPhotos(), savePhoto() (+18 more)

### Community 157 - "Community 157"
Cohesion: 0.43
Nodes (7): DAY_NAMES, detectClassAttendancePatterns(), detectStudentAttendancePatterns(), getActiveClassDates(), getDayOfWeek(), normalizeDate(), toMinutes()

### Community 158 - "Community 158"
Cohesion: 0.29
Nodes (4): confirmBtnRef, inputRef, isConfirmDisabled, { state, handleAction, handleSelectChoice }

### Community 159 - "Community 159"
Cohesion: 0.29
Nodes (8): doImport(), linkBackupDirectory(), loadDirectoryBackups(), loadSafetySnapshots(), onDeleteSafetySnapshot(), onQuickSyncNow(), onRestoreSafetySnapshot(), onTakeSafetySnapshot()

### Community 160 - "Community 160"
Cohesion: 0.20
Nodes (10): useStudentPhotos(), avatarStyle, cameraIconSize, emit, { getPhotoUrl, initPhotoIds }, handleClick(), initials, photoUrl (+2 more)

### Community 162 - "Community 162"
Cohesion: 0.32
Nodes (6): clearPhotoCache(), initPhotoIds(), photoCache, photoIdsSet, reloadPhotoCache(), showDeskPhotos

### Community 163 - "Community 163"
Cohesion: 0.40
Nodes (5): fixInvalidCategories(), fixMissingIds(), fixOrphans(), fixUnlinkedSBARAssessments(), runDataAudit()

### Community 164 - "Community 164"
Cohesion: 0.10
Nodes (22): getTermRange(), clearAllData(), toMinutes(), getSeatStatus(), jumpToPrevSchoolDayFrom(), mockClassRecord, mockEvents, presentNames (+14 more)

### Community 165 - "Community 165"
Cohesion: 0.24
Nodes (9): curriculumEditorDirty, curriculumEditorDiscardHandler, curriculumEditorSaveHandler, curriculumEditorTitle, customPresets, initCurriculumLibrary(), isLoaded, isLoading (+1 more)

### Community 166 - "Community 166"
Cohesion: 0.83
Nodes (3): pruneOrphanedLayout(), simulateDeleteRow(), simulateInsertRow()

### Community 168 - "Community 168"
Cohesion: 0.67
Nodes (3): description, type, department

## Knowledge Gaps
- **793 isolated node(s):** `scanBuffer`, `manifest_version`, `name`, `version`, `description` (+788 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDB()` connect `Community 155` to `Community 0`, `Community 2`, `Community 35`, `Community 164`, `Community 3`, `Community 9`, `Community 109`, `Community 15`, `Community 81`, `Community 145`, `Community 20`, `Community 21`, `Community 85`, `Community 23`, `Community 151`, `Community 123`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `openDB()` connect `Community 15` to `Community 155`, `Community 5`, `Community 94`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `getUnitGradeLevel()` connect `Community 1` to `Community 64`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `loadGradebook()` (e.g. with `getGlobalMilestones()` and `getGradeBuckets()`) actually correct?**
  _`loadGradebook()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `scanBuffer`, `manifest_version`, `name` to the rest of the system?**
  _809 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.061979648473635525 - nodes in this community are weakly interconnected._