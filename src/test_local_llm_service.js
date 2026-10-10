/**
 * src/test_local_llm_service.js
 *
 * Verification suite for Privacy-First In-Browser Local LLM Service.
 */

import assert from 'node:assert'
import {
  MODEL_CATALOG,
  llmState,
  detectHardwareCapabilities,
  refreshCachedModelsList
} from './utils/localLlmService.js'

console.log('=================================================================')
console.log('🤖 LOCAL LLM SERVICE VERIFICATION SUITE')
console.log('=================================================================')

// TEST 1: Model Catalog Integrity
console.log('\nTEST 1: Model Catalog Definitions')
assert(MODEL_CATALOG['qwen-0.5b'], 'qwen-0.5b must exist')
assert.strictEqual(MODEL_CATALOG['qwen-0.5b'].type, 'webllm')
assert(MODEL_CATALOG['qwen-0.5b'].modelIdF16.includes('Qwen2.5-0.5B'))

assert(MODEL_CATALOG['llama-1b'], 'llama-1b must exist')
assert.strictEqual(MODEL_CATALOG['llama-1b'].type, 'webllm')
assert(MODEL_CATALOG['llama-1b'].modelIdF16.includes('Llama-3.2-1B'))

assert(MODEL_CATALOG['chrome-nano'], 'chrome-nano must exist')
assert.strictEqual(MODEL_CATALOG['chrome-nano'].type, 'chrome-builtin')
console.log('  ✓ Catalog contains Qwen 2.5 (0.5B), Llama 3.2 (1B), and Chrome Gemini Nano')

// TEST 2: Initial Reactive State
console.log('\nTEST 2: Reactive State Defaults')
assert.strictEqual(llmState.status, 'idle')
assert.strictEqual(llmState.activeModelKey, null)
assert.strictEqual(llmState.progress, 0)
console.log('  ✓ Service initializes cleanly in idle state with 0 active model')

// TEST 3: Hardware Detection Graceful Fallback
console.log('\nTEST 3: Hardware Capability Detection')
detectHardwareCapabilities().then(caps => {
  assert(typeof caps.hasWebGPU === 'boolean')
  assert(typeof caps.hasChromeNano === 'boolean')
  assert(Array.isArray(caps.cachedKeys))
  console.log(`  ✓ Capabilities safely inspected in headless/non-browser environment:`, caps)
  console.log('\n=================================================================')
  console.log('🎉 ALL LOCAL LLM SERVICE TESTS PASSED!')
  console.log('=================================================================')
}).catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
