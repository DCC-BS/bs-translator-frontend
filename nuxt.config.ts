// https://nuxt.com/docs/api/configuration/nuxt-config
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
            link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
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
    ],
    "feedback-control.bs.js": {
        repo: "Feedback",
        owner: "DCC-BS",
        project: "bs-translator",
        githubToken: process.env.GITHUB_TOKEN,
    },
    devtools: { enabled: true },
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
});
