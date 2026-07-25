import { reactive } from 'vue'

const state = reactive({
  show: false,
  type: 'alert', // 'alert' | 'confirm' | 'prompt' | 'select'
  title: '',
  message: '',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  choices: [],
  danger: false,
  requireText: '',
  defaultValue: '',
  userInput: '',
  resolve: null
})

export function useMessage() {
  const alert = (message, title = 'Alert') => {
    if (state.show) return Promise.resolve(true)
    return new Promise((resolve) => {
      state.type = 'alert'
      state.title = title
      state.message = message
      state.confirmLabel = 'OK'
      state.danger = false
      state.requireText = ''
      state.choices = []
      state.show = true
      state.resolve = resolve
    })
  }

  const confirm = (message, title = 'Confirm', options = {}) => {
    if (state.show) return Promise.resolve(false)
    return new Promise((resolve) => {
      state.type = 'confirm'
      state.title = title
      state.message = message
      state.confirmLabel = options.confirmLabel || 'Confirm'
      state.cancelLabel = options.cancelLabel || 'Cancel'
      state.danger = options.danger || false
      state.requireText = options.requireText || ''
      state.userInput = ''
      state.choices = []
      state.show = true
      state.resolve = resolve
    })
  }

  const prompt = (message, defaultValue = '', title = 'Input Required') => {
    if (state.show) return Promise.resolve(null)
    return new Promise((resolve) => {
      state.type = 'prompt'
      state.title = title
      state.message = message
      state.defaultValue = defaultValue
      state.userInput = defaultValue
      state.confirmLabel = 'Submit'
      state.cancelLabel = 'Cancel'
      state.danger = false
      state.requireText = ''
      state.choices = []
      state.show = true
      state.resolve = resolve
    })
  }

  const select = (message, choices = [], title = 'Select Option', options = {}) => {
    if (state.show) return Promise.resolve(null)
    return new Promise((resolve) => {
      state.type = 'select'
      state.title = title
      state.message = message
      state.choices = choices.map(c => typeof c === 'string' ? { label: c, value: c } : c)
      state.cancelLabel = options.cancelLabel || 'Cancel'
      state.danger = false
      state.requireText = ''
      state.choices = choices.map(c => typeof c === 'string' ? { label: c, value: c } : c)
      state.show = true
      state.resolve = resolve
    })
  }

  const handleAction = (success) => {
    if (success && state.requireText && state.userInput !== state.requireText) {
      return
    }
    
    state.show = false
    if (state.type === 'prompt') {
      state.resolve(success ? state.userInput : null)
    } else if (state.type === 'select') {
      state.resolve(null)
    } else {
      state.resolve(success)
    }
  }

  const handleSelectChoice = (val) => {
    state.show = false
    if (state.resolve) state.resolve(val)
  }

  return {
    state,
    alert,
    confirm,
    prompt,
    select,
    handleAction,
    handleSelectChoice
  }
}
