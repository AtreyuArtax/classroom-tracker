import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * vite.config.js
 *
 * CLAUDE.md §14 — PWA configuration:
 *  - vite-plugin-pwa with Workbox
 *  - CacheFirst for all static assets
 *  - Fully functional offline after first load
 *  - registerType: 'autoUpdate' (per user instruction)
 */

export default defineConfig({
    plugins: [
        vue(),

        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',

            // Tells the plugin where to find the manifest
            manifest: false, // Using our own public/manifest.json

            // Workbox configuration
            workbox: {
                // Cache ALL application routes and static assets
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

                // Cache strategy: CacheFirst for all static assets (CLAUDE.md §14)
                runtimeCaching: [
                    {
                        // App shell and all static assets
                        urlPattern: ({ request }) =>
                            request.destination === 'document' ||
                            request.destination === 'script' ||
                            request.destination === 'style' ||
                            request.destination === 'image' ||
                            request.destination === 'font',
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'app-static-v1',
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],

                // Never let the service worker skip routes to IndexedDB or manifest
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api/],

                // Clean up old caches on activation
                cleanupOutdatedCaches: true,
                skipWaiting: true,
                clientsClaim: true,
            },
        }),
    ],

    // Base path — root-relative so the PWA works on any host root
    base: '/',
})
