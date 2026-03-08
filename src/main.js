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

async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persisted()
        if (!isPersisted) {
            const granted = await navigator.storage.persist()
            if (granted) {
                console.log('Storage will not be cleared except by explicit user action')
            } else {
                console.warn('Storage may be cleared by the UA under storage pressure.')
            }
        } else {
            console.log('Storage is already persisted.')
        }
    }
}

requestPersistentStorage()

// --- EMERGENCY KILL SWITCH FOR PWA CACHE IN DEV ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister().then(function (boolean) {
                console.warn('Auto-unregistered aggressive Service Worker.', boolean);
            });
        }
    });
}
// --------------------------------------------------

const app = createApp(App)
app.mount('#app')
