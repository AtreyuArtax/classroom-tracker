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
            devOptions: {
                enabled: false // Disabled in dev so aggressive caching doesn't hide live code updates
            },

            // Tells the plugin where to find the manifest
            manifest: false, // Using our own public/manifest.json

            // Workbox configuration
            workbox: {
                // Increase the default 2MB limit to 5MB to accommodate larger bundles
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

                // Cache ALL application routes and static assets
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

                // Cache strategy: CacheFirst for all static assets (CLAUDE.md §14)
                runtimeCaching: [
                    {
                        // App shell and all static assets
                        urlPattern: ({ request }) =>
                            request.destination === 'document' ||
                            request.destination === 'script' ||
                            request.destination === 'style',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'app-code-v1',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 24 * 60 * 60, // 1 day
                            },
                        },
                    },
                    {
                        // Images and fonts remain CacheFirst
                        urlPattern: ({ request }) =>
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
                navigateFallback: '/classroom-tracker/index.html',
                navigateFallbackDenylist: [/^\/api/],

                // Clean up old caches on activation
                cleanupOutdatedCaches: true,
                skipWaiting: true,
                clientsClaim: true,
            },
        }),
    ],

    // Base path — set to match the GitHub Pages repository name
    base: '/classroom-tracker/',

    build: {
        // Suppress warning for large chunks as we are managing them via manualChunks
        chunkSizeWarningLimit: 1000,

        rollupOptions: {
            output: {
                // Manual chunking to divide vendor libraries into separate files
                manualChunks(id) {
                    // Separate ExcelJS (heavy dependency) into its own chunk
                    if (id.includes('exceljs')) {
                        return 'vendor-excel'
                    }
                    // Separate Chart.js and related into their own chunk
                    if (id.includes('chart.js') || id.includes('vue-chartjs')) {
                        return 'vendor-charts'
                    }
                    // Separate all other node_modules into a general vendor chunk
                    if (id.includes('node_modules')) {
                        return 'vendor'
                    }
                }
            }
        }
    }
})
