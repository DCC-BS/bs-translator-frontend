import type { BrowserContext, Page } from "@playwright/test";

/** Skips both the onboarding tour and disclaimer by setting cookies common-ui reads. */
export async function skipTour(context: BrowserContext) {
    await context.addCookies([
        {
            name: "tour-completed",
            value: "true",
            domain: "localhost",
            path: "/",
        },
        {
            name: "disclaimer-accepted",
            value: "1.0.0",
            domain: "localhost",
            path: "/",
        },
    ]);
}

/** Pre-accepts the disclaimer so tests focusing on onboarding tour don't get blocked by disclaimer modal. */
export async function acceptDisclaimer(context: BrowserContext) {
    await context.addCookies([
        {
            name: "disclaimer-accepted",
            value: "1.0.0",
            domain: "localhost",
            path: "/",
        },
    ]);
}

/**
 * Restart button comes from common-ui's NavigationBar; it renders a mobile and
 * a desktop variant, only one of which is visible at a time.
 */
export function restartTourButton(page: Page) {
    return page
        .getByRole("button", { name: /Tour neu starten|Restart tour/i })
        .filter({ visible: true });
}
