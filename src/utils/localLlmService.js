/**
 * src/utils/localLlmService.js
 *
 * Privacy-First, In-Browser Local LLM Service for Ontario Report Card Comments.
 * Supports:
 *  1. Chrome Built-in Gemini Nano (window.ai) - 0 MB download
 *  2. Qwen 2.5 (0.5B-Instruct) via WebGPU/WebLLM - ~350 MB download (Ultra-Light)
 *  3. Llama 3.2 (1B-Instruct) via WebGPU/WebLLM - ~750 MB download (High Quality)
 *
 * All execution occurs 100% locally inside the browser. Zero student PII leaves the device.
 */

import { ref, reactive } from 'vue'

// ── Model Catalog ────────────────────────────────────────────────────────────

export const MODEL_CATALOG = {
  'qwen-0.5b': {
    key: 'qwen-0.5b',
    name: 'Qwen 2.5 (0.5B-Instruct)',
    badge: 'Ultra-Light (~350 MB)',
    description: 'Fastest initialization and minimal battery/RAM footprint. Ideal for standard district work laptops.',
    modelIdF16: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    modelIdF32: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    approxSizeMB: 350,
    type: 'webllm'
  },
  'llama-1b': {
    key: 'llama-1b',
    name: 'Llama 3.2 (1B-Instruct)',
    badge: 'High Quality (~750 MB)',
    description: 'Meta\'s edge model with rich vocabulary and high accuracy for tone and character limit adherence.',
    modelIdF16: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    modelIdF32: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    approxSizeMB: 750,
    type: 'webllm'
  },
  'chrome-nano': {
    key: 'chrome-nano',
    name: 'Chrome Built-in AI (Gemini Nano)',
    badge: 'Zero Download (0 MB)',
    description: 'Uses Chrome\'s native on-device model. Available only if supported and not disabled by district IT policies.',
    type: 'chrome-builtin'
  }
}

// ── Reactive Service State ───────────────────────────────────────────────────

export const llmState = reactive({
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'generating' | 'error'
  activeModelKey: null,
  activeModelName: null,
  progress: 0,
  progressText: '',
  cachedModelKeys: [], // list of keys cached on this machine
  hasWebGPU: false,
  hasF16: false,
  hasChromeNano: false,
  chromeNanoStatus: 'unavailable', // 'readily' | 'after-download' | 'unavailable'
  lastError: null
})

// Module-level engine references
let activeWebLlmEngine = null
let activeNanoSession = null

// ── Capability Checks ────────────────────────────────────────────────────────

/**
 * Inspects device WebGPU and Chrome Built-in AI capabilities.
 */
export async function detectHardwareCapabilities() {
  // 1. Check WebGPU
  if (typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) {
        llmState.hasWebGPU = true
        llmState.hasF16 = adapter.features.has('shader-f16')
      } else {
        llmState.hasWebGPU = false
        llmState.hasF16 = false
      }
    } catch {
      llmState.hasWebGPU = false
      llmState.hasF16 = false
    }
  } else {
    llmState.hasWebGPU = false
    llmState.hasF16 = false
  }

  // 2. Check Chrome Built-in AI
  if (typeof window !== 'undefined' && window.ai?.languageModel) {
    try {
      const caps = await window.ai.languageModel.capabilities()
      if (caps && (caps.available === 'readily' || caps.available === 'after-download')) {
        llmState.hasChromeNano = true
        llmState.chromeNanoStatus = caps.available
      } else {
        llmState.hasChromeNano = false
        llmState.chromeNanoStatus = 'unavailable'
      }
    } catch {
      llmState.hasChromeNano = false
      llmState.chromeNanoStatus = 'unavailable'
    }
  } else {
    llmState.hasChromeNano = false
    llmState.chromeNanoStatus = 'unavailable'
  }

  // 3. Scan local browser cache for downloaded WebLLM models
  await refreshCachedModelsList()

  return {
    hasWebGPU: llmState.hasWebGPU,
    hasF16: llmState.hasF16,
    hasChromeNano: llmState.hasChromeNano,
    cachedKeys: llmState.cachedModelKeys
  }
}

/**
 * Checks which models exist in the browser's CacheStorage.
 */
export async function refreshCachedModelsList() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    llmState.cachedModelKeys = []
    return
  }

  const cached = []
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm')

    for (const key of ['qwen-0.5b', 'llama-1b']) {
      const modelDef = MODEL_CATALOG[key]
      const modelId = llmState.hasF16 ? modelDef.modelIdF16 : modelDef.modelIdF32
      try {
        const inCache = await hasModelInCache(modelId)
        if (inCache) cached.push(key)
      } catch {
        // Cache inspection error
      }
    }
  } catch {
    // Dynamic import error
  }

  llmState.cachedModelKeys = cached
}

// ── Model Lifecycle Management ───────────────────────────────────────────────

/**
 * Loads and initializes the selected model into memory.
 *
 * @param {'qwen-0.5b'|'llama-1b'|'chrome-nano'} modelKey
 * @param {Function} [onProgress]
 */
export async function loadModel(modelKey, onProgress = null) {
  const modelDef = MODEL_CATALOG[modelKey]
  if (!modelDef) throw new Error(`Unknown model key: ${modelKey}`)

  llmState.status = 'loading'
  llmState.activeModelKey = modelKey
  llmState.activeModelName = modelDef.name
  llmState.progress = 0
  llmState.progressText = 'Initializing engine...'
  llmState.lastError = null

  try {
    // ── Engine 1: Chrome Built-in Nano ──
    if (modelDef.type === 'chrome-builtin') {
      if (!window.ai?.languageModel) {
        throw new Error('Chrome Built-in AI is not available in this browser or disabled by school board policy.')
      }

      llmState.progressText = 'Starting local Chrome AI session...'
      llmState.progress = 50
      activeNanoSession = await window.ai.languageModel.create()
      llmState.progress = 100
      llmState.status = 'ready'
      llmState.progressText = 'Ready'
      return
    }

    // ── Engine 2 & 3: WebLLM In-Browser Engine ──
    if (!llmState.hasWebGPU) {
      throw new Error('WebGPU is not enabled or supported on this device. Please use Chrome/Edge with hardware acceleration enabled.')
    }

    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    const modelId = llmState.hasF16 ? modelDef.modelIdF16 : modelDef.modelIdF32

    activeWebLlmEngine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        const pct = Math.round((report.progress || 0) * 100)
        llmState.progress = pct
        llmState.progressText = report.text || `Loading model weights (${pct}%)...`
        if (typeof onProgress === 'function') onProgress(pct, report.text)
      }
    })

    await refreshCachedModelsList()
    llmState.status = 'ready'
    llmState.progress = 100
    llmState.progressText = 'Ready'
  } catch (err) {
    console.error('Failed to initialize local LLM:', err)
    llmState.status = 'error'
    llmState.lastError = err.message || 'Failed to initialize local model'
    throw err
  }
}

/**
 * Unloads active model from memory (RAM / VRAM) to free laptop resources.
 */
export async function unloadModel() {
  if (activeWebLlmEngine) {
    try {
      await activeWebLlmEngine.unload()
    } catch {
      // Ignored
    }
    activeWebLlmEngine = null
  }

  if (activeNanoSession) {
    try {
      activeNanoSession.destroy?.()
    } catch {
      // Ignored
    }
    activeNanoSession = null
  }

  llmState.status = 'idle'
  llmState.activeModelKey = null
  llmState.activeModelName = null
  llmState.progress = 0
  llmState.progressText = ''
}

/**
 * Deletes downloaded weights for a specific model from browser cache to free disk space.
 */
export async function purgeModelFromCache(modelKey) {
  const modelDef = MODEL_CATALOG[modelKey]
  if (!modelDef || modelDef.type !== 'webllm') return

  if (llmState.activeModelKey === modelKey) {
    await unloadModel()
  }

  try {
    const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm')
    const modelId = llmState.hasF16 ? modelDef.modelIdF16 : modelDef.modelIdF32
    await deleteModelAllInfoInCache(modelId)
    await refreshCachedModelsList()
  } catch (err) {
    console.warn('Failed to purge model cache:', err)
  }
}

// ── Comment Polish Engine ────────────────────────────────────────────────────

/**
 * Uses the loaded local model to polish an Ontario report card comment.
 *
 * @param {Object} params
 * @param {string} params.draftComment  The rule-generated comment draft
 * @param {Object} [params.student]     Student record
 * @param {number} [params.charLimit=400]
 * @param {string} [params.pronounMode='preferred']
 *
 * @returns {Promise<{
 *   text: string,
 *   originalText: string,
 *   charCount: number,
 *   isOverLimit: boolean,
 *   modelUsed: string
 * }>}
 */
export async function polishReportComment({
  draftComment,
  student = {},
  charLimit = 400,
  pronounMode = 'preferred'
} = {}) {
  if (!draftComment || !draftComment.trim()) {
    throw new Error('No draft comment provided to polish.')
  }

  if (llmState.status !== 'ready') {
    throw new Error('Local AI engine is not ready. Please select and load a model first.')
  }

  const studentName = (student.preferredName || student.firstName || 'The student').trim()
  const pronouns = student.pronouns || ''
  const pronounInstruction = (pronounMode === 'name-only' || !pronouns)
    ? `Refer to the student strictly by name ("${studentName}") and avoid third-person pronouns.`
    : `Use "${pronouns}" pronouns for ${studentName}.`

  const systemPrompt = [
    `You are an educational writing assistant helping an Ontario high school teacher proofread and refine constructive student report card feedback.`,
    `Your goal: Polish the teacher's draft feedback into clear, encouraging, parent-friendly English while maintaining pedagogical accuracy.`,
    ``,
    `GUIDELINES (Ontario Growing Success Framework):`,
    `1. LENGTH: Strictly under ${charLimit} characters (target 290-360 characters).`,
    `2. NO COURSE NAME: Do not mention the subject or course code.`,
    `3. NATURAL FLOW: Maintain 3 flowing sentences without bullet points, headings, or labels (do NOT say "Next step:").`,
    `   - Sentence 1: Key curriculum strength or academic accomplishment.`,
    `   - Sentence 2: Demonstration of thinking, inquiry, or applied skills.`,
    `   - Sentence 3: Actionable, constructive next step recommending an active learning strategy.`,
    `4. CAPITALIZATION: Keep curriculum topics lowercase (e.g., "projectile motion", "free-body diagrams").`,
    `5. ${pronounInstruction}`,
    `6. TONE: Professional, supportive, parent-friendly. Return ONLY the polished comment text with no markdown quotes or extra commentary.`
  ].join('\n')

  const userPrompt = `Teacher draft to polish:\n"${draftComment.trim()}"\n\nPolished comment:`

  llmState.status = 'generating'
  llmState.progressText = 'Polishing comment locally...'

  try {
    let rawOutput = ''

    if (llmState.activeModelKey === 'chrome-nano' && activeNanoSession) {
      // Chrome Prompt API
      rawOutput = await activeNanoSession.prompt(`${systemPrompt}\n\n${userPrompt}`)
    } else if (activeWebLlmEngine) {
      // WebLLM Chat Completion
      const completion = await activeWebLlmEngine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 220
      })
      rawOutput = completion.choices[0]?.message?.content || ''
    } else {
      throw new Error('No active local engine available.')
    }

    // Clean up response formatting
    let cleanText = rawOutput
      .replace(/^["'`]|["'`]$/g, '') // remove surrounding quotes
      .replace(/^(?:Polished comment|Refined comment|Refined feedback):\s*/i, '')
      .replace(/\*\*/g, '') // strip markdown bold
      .trim()

    // Detect safety filter hyper-refusals from small local models (e.g. Meta Llama 3.2 1B false positives)
    const isRefusal = /^(I cannot|I am unable|I'm sorry, but I cannot|As an AI|I apologize)/i.test(cleanText) ||
      /(deceive or defraud|safety guidelines|content policy)/i.test(cleanText)
    if (isRefusal) {
      console.warn('Local LLM safety refusal detected:', cleanText)
      throw new Error(
        'The local model triggered a false-positive safety refusal ("deceive or defraud"). Your draft comment was preserved. Try rephrasing or switching to Qwen 2.5 (0.5B) in AI Settings.'
      )
    }

    // Safety fallback: if model rambles beyond charLimit, fallback to draft or truncate neatly at sentence
    let isOver = cleanText.length > charLimit
    if (isOver && cleanText.length > charLimit + 20) {
      // Find last sentence ending before charLimit
      const sub = cleanText.slice(0, charLimit)
      const lastPeriod = Math.max(sub.lastIndexOf('. '), sub.lastIndexOf('.'))
      if (lastPeriod > 100) {
        cleanText = sub.slice(0, lastPeriod + 1).trim()
        isOver = cleanText.length > charLimit
      }
    }

    llmState.status = 'ready'
    llmState.progressText = 'Ready'

    return {
      text: cleanText,
      originalText: draftComment,
      charCount: cleanText.length,
      isOverLimit: isOver,
      modelUsed: llmState.activeModelName || llmState.activeModelKey
    }
  } catch (err) {
    llmState.status = 'ready'
    llmState.progressText = 'Ready'
    console.error('Error during local LLM polish:', err)
    throw err
  }
}
