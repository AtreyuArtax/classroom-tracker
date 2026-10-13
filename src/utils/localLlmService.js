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

// ── Built-in Prompt Presets ───────────────────────────────────────────────────

export const BUILTIN_PROMPT_PRESETS = [
  {
    id: 'ontario-standard',
    name: 'Ontario Standard (Default)',
    badge: 'Growing Success',
    isBuiltin: true,
    description: 'Strict 3-sentence Growing Success format. Factual, asset-based, and objective without conversational fluff.',
    temperature: 0.30,
    customDirectives: '',
    customSystemPrompt: ''
  },
  {
    id: 'warm-encouraging',
    name: 'Warm & Encouraging',
    badge: 'Growth Mindset',
    isBuiltin: true,
    description: 'Supportive, asset-based phrasing highlighting student effort, persistence, and self-advocacy.',
    temperature: 0.35,
    customDirectives: 'Frame achievements and next steps with a warm, encouraging growth mindset, highlighting effort and constructive student self-advocacy.',
    customSystemPrompt: ''
  },
  {
    id: 'inquiry-investigation',
    name: 'Inquiry & Investigation',
    badge: 'STEM / Inquiry',
    isBuiltin: true,
    description: 'Emphasizes scientific inquiry, analytical problem-solving steps, and experimental verification.',
    temperature: 0.25,
    customDirectives: 'Emphasize scientific inquiry, analytical problem-solving steps, and experimental verification strategies.',
    customSystemPrompt: ''
  },
  {
    id: 'concise-direct',
    name: 'Concise & Direct',
    badge: 'Compact',
    isBuiltin: true,
    description: 'Short, crisp phrasing targeting 280-320 characters for tight report card character limits.',
    temperature: 0.20,
    customDirectives: 'Use concise, direct wording. Keep sentences succinct and targeted around 280-320 characters.',
    customSystemPrompt: ''
  }
]

export function getBuiltinPromptPresets() {
  return JSON.parse(JSON.stringify(BUILTIN_PROMPT_PRESETS))
}

export function getDefaultSecondarySystemPrompt({
  charLimit = 400,
  studentName = 'The student',
  pronounInstruction = ''
} = {}) {
  return [
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
}

export function getDefaultElementarySystemPrompt({
  charLimit = 1050,
  studentName = 'The student',
  pronounInstruction = '',
  subjectName = 'Science and Technology',
  isLearningSkills = false
} = {}) {
  if (isLearningSkills) {
    return [
      `You are an expert Ontario educational writing assistant helping an elementary teacher refine a Learning Skills and Work Habits report card comment.`,
      `Your goal: Polish the draft comment into warm, professional, asset-based English adhering to Ontario Growing Success guidelines.`,
      ``,
      `CORE EDITING RULES:`,
      `1. LENGTH: Strictly under ${charLimit} characters (SCDSB limit).`,
      `2. FORMAT INTEGRITY: If the draft uses labeled sections (e.g. STRENGTHS: ... NEXT STEPS: ...), preserve those section headings exactly.`,
      `3. ASSET-BASED LANGUAGE: Always frame student progress constructively and supportively. Avoid negative or deficit language.`,
      `4. THIRD-PERSON PERSPECTIVE: Never use first-person pronouns ("I", "my", "I observed").`,
      `5. ${pronounInstruction}`,
      `6. STRICT OUTPUT: Output ONLY the polished report comment text without preamble, quotes, or markdown code fences.`
    ].join('\n')
  }

  return [
    `You are an expert Ontario educational writing assistant helping an elementary teacher refine a report card comment for ${subjectName}.`,
    `Your goal: Polish the draft comment into smooth, natural, parent-friendly English with an authentic pedagogical voice.`,
    ``,
    `CORE EDITING RULES (Ontario Growing Success Guidelines):`,
    `1. LENGTH: Strictly under ${charLimit} characters (SCDSB limit).`,
    `2. STRUCTURE: Maintain clear conceptual understanding, hands-on in-class investigation evidence, and actionable next steps starting with "Next Steps: ${studentName} is encouraged to...".`,
    `3. THIRD-PERSON PERSPECTIVE: Do NOT use first-person pronouns ("I", "me", "my").`,
    `4. ASSET-BASED LANGUAGE: Always frame developing skills with growth-oriented phrasing.`,
    `5. ${pronounInstruction}`,
    `6. STRICT OUTPUT: Output ONLY the comment text without conversational filler or quotation marks.`
  ].join('\n')
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
  pronounMode = 'preferred',
  temperature = 0.3,
  customDirectives = '',
  customSystemPrompt = ''
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

  const effectiveTemp = (typeof temperature === 'number' && !isNaN(temperature))
    ? Math.max(0.0, Math.min(1.0, temperature))
    : 0.3

  let systemPrompt = ''
  if (customSystemPrompt && customSystemPrompt.trim()) {
    systemPrompt = customSystemPrompt
      .replace(/\{\{studentName\}\}/gi, studentName)
      .replace(/\{\{pronouns\}\}/gi, pronouns)
      .replace(/\{\{pronounInstruction\}\}/gi, pronounInstruction)
      .replace(/\{\{charLimit\}\}/gi, String(charLimit))
  } else {
    systemPrompt = getDefaultSecondarySystemPrompt({ charLimit, studentName, pronounInstruction })
  }

  if (customDirectives && customDirectives.trim()) {
    systemPrompt += `\n\nCUSTOM TEACHER DIRECTIVES:\n${customDirectives.trim()}`
  }

  const exampleDraft = `Alex demonstrates competent understanding and solid skills when analyzing projectile motion. They demonstrate sound problem-solving skills during classroom investigations and evaluations. Using a structured reference checklist will support Alex in verifying intermediate steps when applying light theory concepts.`
  const examplePolished = `Alex demonstrates a solid understanding and strong technical precision when analyzing projectile motion. They consistently apply effective problem-solving strategies during classroom laboratory investigations. Utilizing a structured reference checklist will support Alex in verifying intermediate calculations when applying light theory concepts.`

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
        temperature: effectiveTemp,
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

// ── Elementary Comment Polish Engine ──────────────────────────────────────────

/**
 * Uses the loaded local model to polish an Ontario elementary report card comment
 * (Science, Math, Language, or Learning Skills).
 *
 * @param {Object} params
 * @param {string} params.draftComment
 * @param {Object} [params.student]
 * @param {number} [params.charLimit=1050]
 * @param {string} [params.subjectName='Science and Technology']
 * @param {boolean} [params.isLearningSkills=false]
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
export async function polishElementaryComment({
  draftComment,
  student = {},
  charLimit = 1050,
  subjectName = 'Science and Technology',
  isLearningSkills = false,
  pronounMode = 'preferred',
  temperature = 0.3,
  customDirectives = '',
  customSystemPrompt = ''
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

  const effectiveTemp = (typeof temperature === 'number' && !isNaN(temperature))
    ? Math.max(0.0, Math.min(1.0, temperature))
    : 0.3

  let systemPrompt = ''
  let exampleDraft = ''
  let examplePolished = ''

  if (isLearningSkills) {
    exampleDraft = `STRENGTHS: Maya follows through with her responsibilities and commitments in our classroom community. Maya completes classroom jobs with care and takes pride in organizing the classroom environment. Maya manages her time effectively to complete tasks and achieve learning goals. She utilizes her agenda and digital calendars to keep track of assignments and timelines.\n\nNEXT STEPS: Maya is learning to collaborate more effectively within small-group settings. She is encouraged to accept varied group roles and ensure she contributes an equitable share of the work. Maya is developing strategies to self-regulate and maintain focus during instructional periods. Maya is encouraged to take a deep breath and use positive self-talk when encountering frustrating tasks.`
    examplePolished = `STRENGTHS: Maya consistently follows through with her responsibilities and commitments within our classroom community. She completes classroom helper jobs with diligence and takes genuine pride in maintaining an organized learning environment. Maya manages her time effectively, routinely utilizing her agenda and digital calendar tools to prioritize tasks and meet agreed-upon timelines.\n\nNEXT STEPS: In small-group settings, Maya is encouraged to take on varied cooperative roles and ensure an equitable share of the work is completed. When encountering challenging tasks, Maya is developing self-regulation strategies, including deep breathing and positive self-talk, to maintain focus and persevere through obstacles.`
  } else {
    exampleDraft = `Alex demonstrates an understanding of viscosity and compares how viscosity affects flow rates of various liquids, such as water, ketchup, honey. They investigated liquids with different densities and experimented with the buoyancy of an object in various fluids. Alex analyzed oil spills and cleanup technologies and communicated findings using appropriate vocabulary and visuals. Next Steps: Alex is encouraged to consider how properties of fluids can be applied to daily tasks, such as cooking. Alex is encouraged to experiment with how heat or lack of heat can affect a liquid.`
    examplePolished = `Alex demonstrates a solid understanding of viscosity and effectively compares how viscosity governs the flow rates of everyday liquids, including water, ketchup, and honey. During hands-on investigations, they explored liquids with different densities and tested the buoyancy of objects in varied fluid environments. Alex analyzed the environmental and economic impacts of oil spills, communicating conclusions clearly through structured visuals and scientific vocabulary. Next Steps: Alex is encouraged to explore how fluid properties are harnessed in everyday household tasks, and experiment with the effects of temperature on fluid viscosity.`
  }

  if (customSystemPrompt && customSystemPrompt.trim()) {
    systemPrompt = customSystemPrompt
      .replace(/\{\{studentName\}\}/gi, studentName)
      .replace(/\{\{pronouns\}\}/gi, pronouns)
      .replace(/\{\{pronounInstruction\}\}/gi, pronounInstruction)
      .replace(/\{\{charLimit\}\}/gi, String(charLimit))
      .replace(/\{\{subjectName\}\}/gi, subjectName)
  } else {
    systemPrompt = getDefaultElementarySystemPrompt({
      charLimit,
      studentName,
      pronounInstruction,
      subjectName,
      isLearningSkills
    })
  }

  if (customDirectives && customDirectives.trim()) {
    systemPrompt += `\n\nCUSTOM TEACHER DIRECTIVES:\n${customDirectives.trim()}`
  }

  llmState.status = 'generating'
  llmState.progressText = 'Polishing comment locally...'

  try {
    let rawOutput = ''
    const maxTokens = Math.min(750, Math.max(220, Math.ceil(charLimit / 3.0)))

    if (llmState.activeModelKey === 'chrome-nano' && activeNanoSession) {
      const prompt = `${systemPrompt}\n\nDraft comment to polish:\n${exampleDraft}\n\n${examplePolished}\n\nDraft comment to polish:\n${draftComment.trim()}\n\n`
      rawOutput = await activeNanoSession.prompt(prompt)
    } else if (activeWebLlmEngine) {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Draft comment to polish:\n${exampleDraft}` },
        { role: 'assistant', content: examplePolished },
        { role: 'user', content: `Draft comment to polish:\n${draftComment.trim()}` }
      ]
      const completion = await activeWebLlmEngine.chat.completions.create({
        messages,
        temperature: effectiveTemp,
        max_tokens: maxTokens
      })
      rawOutput = completion.choices[0]?.message?.content || ''
    } else {
      throw new Error('No active local engine available.')
    }

    let cleanText = rawOutput.trim()
    cleanText = cleanText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '')
    cleanText = cleanText
      .replace(/^[\s\S]*?(?:here(?:'s|\s+is)\s+(?:the\s+)?(?:polished|revised|updated|refined)?\s*(?:comment|feedback)?[:.]?\s*)/i, '')
      .replace(/^[\s\S]*?(?:polished\s+comment|refined\s+comment|revised\s+comment)[:.]?\s*/i, '')
      .trim()
    cleanText = cleanText.replace(/^["'“`]+|["'”`]+$/g, '').trim()

    // Post-processing cleanup
    cleanText = cleanText.replace(/\bI recommend that (they|he|she)\b/gi, '$1 is encouraged to')
    cleanText = cleanText.replace(/\bI recommend\s+/gi, '')
    cleanText = cleanText.replace(/\bis not as strong as it could be\b/gi, 'continues to develop with guided practice')
    cleanText = cleanText.replace(/\bstruggles with\b/gi, 'is working to strengthen')

    let isOver = cleanText.length > charLimit
    if (isOver && cleanText.length > charLimit + 20) {
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
    console.error('Error during local LLM elementary polish:', err)
    throw err
  }
}
