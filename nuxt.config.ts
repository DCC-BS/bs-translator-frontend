export default defineNuxtConfig({
    compatibilityDate: "2024-11-01",
    routeRules: {
        "/api/ping": {
            cors: true,
            headers: {
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers":
                    "Origin, Content-Type, Accept, Authorization, X-Requested-With",
                "Access-Control-Allow-Credentials": "true",
            },
        },
    },
    fonts: {
        providers: {
            bunny: false,
        },
    },
    // Build optimization for memory usage
    build: {
        analyze: false,
    },
    // Vite configuration for memory optimization
    vite: {
        build: {
            // Reduce memory usage during build
            rollupOptions: {
                maxParallelFileOps: 2,
            },
            // Optimize chunk size
            chunkSizeWarningLimit: 1000,
        },
        resolve: {
            alias: {
                dexie: "dexie/dist/dexie.mjs",
            },
        },
    },
    // Define app head configuration
    app: {
        head: {
            titleTemplate: "BS Übersetzer",
            link: [
                { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
                { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
            ],
            htmlAttrs: {
                lang: "de",
            },
            meta: [
                { charset: "utf-8" },
                {
                    name: "viewport",
                    content: "width=device-width, initial-scale=1",
                },
                {
                    name: "apple-mobile-web-app-title",
                    content: "BS Übersetzer",
                },
                { name: "application-name", content: "BS Übersetzer" },
                { name: "msapplication-config", content: "/browserconfig.xml" },
                { name: "mobile-web-app-capable", content: "yes" },
                {
                    name: "apple-mobile-web-app-status-bar-style",
                    content: "black-translucent",
                },
            ],
        },
    },
    ui: {
        colorMode: false,
    },
    modules: [
        "@nuxt/ui",
        "@nuxtjs/i18n",
        "@dcc-bs/common-ui.bs.js",
        "@dcc-bs/logger.bs.js",
        "@dcc-bs/feedback-control.bs.js",
        "@dcc-bs/dependency-injection.bs.js",
        "@dcc-bs/audio-recorder.bs.js",
        "@nuxtjs/mdc",
        "nuxt-tour",
        "@vite-pwa/nuxt",
    ],
    "feedback-control.bs.js": {
        repo: "Feedback",
        owner: "DCC-BS",
        project: "bs-translator",
        githubToken: process.env.GITHUB_TOKEN,
    },
    devtools: { enabled: false },
    css: ["~/assets/css/main.css"],
    typescript: {
        typeCheck: true,
        strict: true,
    },
    // localization
    i18n: {
        locales: [
            {
                code: "en",
                name: "English",
                file: "en.json",
            },
            {
                code: "de",
                name: "Deutsch",
                file: "de.json",
            },
        ],
        defaultLocale: "de",
        strategy: "no_prefix",
    },
    runtimeConfig: {
        githubToken: process.env.GITHUB_TOKEN,
        apiUrl: process.env.API_URL,
        public: {
            logger_bs: {
                loglevel: process.env.LOG_LEVEL || "debug",
            },
        },
    },
    $development: {
        "logger.bs.js": {
            loglevel: "debug",
        },
    },
    pwa: {
        devOptions: {
            enabled: true,
        },
        registerType: "autoUpdate",
        workbox: {
            globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg,wasm,ico}"],
            globIgnores: ["dev-sw-dist/**/*"],
            navigateFallback: "/",
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
                {
                    urlPattern: /\/favicon\.ico$/,
                    handler: "CacheFirst",
                    options: {
                        cacheName: "favicon-cache",
                        expiration: {
                            maxEntries: 1,
                            maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
                        },
                    },
                },
            ],
        },
        client: {
            periodicSyncForUpdates: 60 * 10, // 10 minutes
        },

        manifest: {
            name: "BS Übersetzer",
            short_name: "Übersetzer",
            description:
                "Übersetzer für den Kanton Basel-Stadt. Entwickelt vom DCC - Data Competence Center",
            theme_color: "#8c4a92",
            background_color: "#FFFFFF",
            display: "standalone",
            orientation: "portrait",
            icons: [
                {
                    src: "pwa-192x192.png",
                    sizes: "192x192",
                    type: "image/png",
                    purpose: "any",
                },
                {
                    src: "pwa-512x512.png",
                    sizes: "512x512",
                    type: "image/png",
                    purpose: "any",
                },
                {
                    src: "pwa-maskable-192x192.png",
                    sizes: "192x192",
                    type: "image/png",
                    purpose: "maskable",
                },
                {
                    src: "pwa-maskable-512x512.png",
                    sizes: "512x512",
                    type: "image/png",
                    purpose: "maskable",
                },
            ],
        },
    },
});
