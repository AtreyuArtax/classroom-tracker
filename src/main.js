/**
 * src/main.js
 *
 * Vue app entry point.
 * Registers no router (CLAUDE.md: do not install vue-router).
 * Calls useClassroom().init() before mounting so reactive state
 * is populated from IDB before the first render.
 */

import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'

const app = createApp(App)
app.mount('#app')
