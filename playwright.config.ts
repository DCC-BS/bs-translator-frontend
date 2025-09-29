import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    testMatch: "**/*.spec.ts",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI
        ? [
              ["github"],
              ["json", { outputFile: "results.json" }],
              ["html", { outputFolder: "playwright-report" }],
          ]
        : "list",
    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        channel: "chromium",
        permissions: ["microphone", "clipboard-read", "clipboard-write"],
        launchOptions: {
            args: [
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
            ],
        },
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],

    webServer: {
        command: process.env.CI
            ? "STUB_API=true node ./.output/server/index.mjs"
            : "STUB_API=true bun run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
