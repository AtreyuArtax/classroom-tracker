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

  const exampleDraft = `Alex demonstrates competent understanding and solid skills when analyzing projectile motion. They demonstrate sound problem-solving skills during classroom investigations and evaluations. Using a structured reference checklist will support Alex in verifying intermediate steps when applying light theory concepts.`
  const examplePolished = `Alex demonstrates a solid understanding and strong technical precision when analyzing projectile motion. They consistently apply effective problem-solving strategies during classroom laboratory investigations. Utilizing a structured reference checklist will support Alex in verifying intermediate calculations when applying light theory concepts.`

  const systemPrompt = [
    `You are an expert Ontario educational writing assistant helping a high school teacher refine report card comments.`,
    `Your goal: Polish the draft comment into smooth, natural, parent-friendly English with an authentic pedagogical voice.`,
    ``,
    `CORE EDITING RULES (Ontario Growing Success Guidelines):`,
    `1. LENGTH: Strictly under ${charLimit} characters (target 290-360 characters).`,
    `2. NO COURSE NAMES: Never mention the course code or subject name.`,
    `3. 3-SENTENCE STRUCTURE: Produce exactly 3 flowing sentences without bullet points, headings, or labels (never write "Next step:").`,
    `   - Sentence 1: Specific curriculum strength and conceptual understanding.`,
    `   - Sentence 2: Thinking, problem-solving, or inquiry capability.`,
    `   - Sentence 3: Actionable next step recommending a concrete learning scaffold or strategy.`,
    `4. GRAMMAR & TOPIC CORRECTION:`,
    `   - Actively interpret and fix awkward phrasing or raw assignment titles from the draft.`,
    `   - For example, rewrite awkward phrases like "when working on the Projectile" into natural phrasing like "when analyzing projectile motion", and "when solving Light Theory" into "when applying light theory concepts".`,
    `5. STRICT LOWERCASE FOR TOPICS:`,
    `   - Never capitalize academic topics or units (e.g. write "projectile motion", "light theory", "kinematics", "forces").`,
    `   - Only capitalize true proper nouns (e.g. "Newton's laws", "Ohm's law") and the student's name.`,
    `6. STRICT THIRD-PERSON VOICE:`,
    `   - Do NOT use first-person pronouns ("I", "me", "my", "I recommend that").`,
    `   - Write from a professional third-person educator perspective (e.g. "To support further growth, utilizing a structured checklist will help ${studentName}...").`,
    `7. ASSET-BASED LANGUAGE (GROWING SUCCESS):`,
    `   - Always frame learning with constructive, growth-oriented language.`,
    `   - For developing skills, write "is continuing to build consistency" or "with guided practice, demonstrates developing confidence".`,
    `   - NEVER use negative, deficit-based language like "is not as strong as it could be", "fails to", "struggles with", or "shows some potential".`,
    `8. TOPIC FIDELITY:`,
    `   - Only reference the specific curriculum concepts and next steps already mentioned in the draft. Do NOT invent or list unrelated course units.`,
    `9. ${pronounInstruction}`,
    `10. STRICT OUTPUT FORMAT:`,
    `   - Output ONLY the 3-sentence comment text.`,
    `   - NEVER output conversational preamble or filler (do NOT write "Here is the polished comment:" or similar).`,
    `   - Do NOT enclose the text in quotation marks.`
  ].join('\n')

  llmState.status = 'generating'
  llmState.progressText = 'Polishing comment locally...'

  try {
    let rawOutput = ''

    if (llmState.activeModelKey === 'chrome-nano' && activeNanoSession) {
      // Chrome Prompt API
      const prompt = `${systemPrompt}\n\nDraft comment to polish:\n${exampleDraft}\n\n${examplePolished}\n\nDraft comment to polish:\n${draftComment.trim()}\n\n`
      rawOutput = await activeNanoSession.prompt(prompt)
    } else if (activeWebLlmEngine) {
      // WebLLM Multi-Turn Chat Completion (standard few-shotting pattern prevents conversational preambles)
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Draft comment to polish:\n${exampleDraft}` },
        { role: 'assistant', content: examplePolished },
        { role: 'user', content: `Draft comment to polish:\n${draftComment.trim()}` }
      ]
      const completion = await activeWebLlmEngine.chat.completions.create({
        messages,
        temperature: 0.3,
        max_tokens: 220
      })
      rawOutput = completion.choices[0]?.message?.content || ''
    } else {
      throw new Error('No active local engine available.')
    }

    // Clean up response formatting
    let cleanText = rawOutput.trim()

    // 1. Remove markdown code fences if model wrapped output in ```
    cleanText = cleanText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '')

    // 2. Strip conversational preambles (e.g. "Here is the polished comment:", "Certainly! ...")
    cleanText = cleanText
      .replace(/^[\s\S]*?(?:here(?:'s|\s+is)\s+(?:the\s+)?(?:polished|revised|updated|refined)?\s*(?:comment|feedback)?[:.]?\s*)/i, '')
      .replace(/^[\s\S]*?(?:polished\s+comment|refined\s+comment|revised\s+comment)[:.]?\s*/i, '')
      .trim()

    // 3. Strip leading and trailing quotes (", ', “, ”, ‘, ’, `)
    cleanText = cleanText.replace(/^["'“`]+|["'”`]+$/g, '').trim()

    // 4. Strip nested preamble if inside quotes
    cleanText = cleanText
      .replace(/^(?:here(?:'s|\s+is)\s+[^:\n]+[:.]|polished\s+comment[:.]|refined\s+comment[:.]|revised\s+comment[:.])\s*/i, '')
      .trim()
    cleanText = cleanText.replace(/^["'“`]+|["'”`]+$/g, '').trim()
    cleanText = cleanText.replace(/\*\*/g, '').trim()

    // 5. Post-processing cleanup for first-person slips
    cleanText = cleanText.replace(/\bTo further support ([^,]+)'s learning,\s*I recommend that (they|he|she)\s+use\b/gi, 'To further support $1\'s learning, utilizing')
    cleanText = cleanText.replace(/\bI recommend that (they|he|she)\s+use\b/gi, 'utilizing')
    cleanText = cleanText.replace(/\bI recommend that (they|he|she)\b/gi, '$1 is encouraged to')
    cleanText = cleanText.replace(/\bI recommend\s+/gi, '')

    // 6. Post-processing cleanup for deficit-based language
    cleanText = cleanText.replace(/\bis not as strong as it could be\b/gi, 'continues to develop with guided practice')
    cleanText = cleanText.replace(/\bshows some potential in\b/gi, 'demonstrates developing understanding when')
    cleanText = cleanText.replace(/\bhas trouble with\b/gi, 'is building consistency with')
    cleanText = cleanText.replace(/\bstruggles with\b/gi, 'is working to strengthen')

    // 7. Post-processing cleanup for raw assignment titles
    cleanText = cleanText.replace(/\b(?:working on|work on)\s+the\s+Projectile\b/gi, 'analyzing projectile motion')
    cleanText = cleanText.replace(/\bthe\s+Projectile\b/g, 'projectile motion')
    cleanText = cleanText.replace(/\bsolving\s+Light\s+Theory\b/gi, 'applying light theory concepts')
    cleanText = cleanText.replace(/\bLight\s+Theory\b/g, 'light theory')
    cleanText = cleanText.replace(/\bProjectile\b/g, 'projectile motion')

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
