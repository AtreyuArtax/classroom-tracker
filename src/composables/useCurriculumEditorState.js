/**
 * src/composables/useCurriculumEditorState.js
 *
 * Lightweight standalone state for dirty-tracking the curriculum editor.
 * Extracted from useCurriculumLibrary.js so App.vue can guard navigation
 * without eagerly loading the entire curriculum JSON database into the main app bundle.
 */
import { ref } from 'vue'

export const curriculumEditorDirty = ref(false)
export const curriculumEditorTitle = ref('')
export const curriculumEditorSaveHandler = ref(null)
export const curriculumEditorDiscardHandler = ref(null)
