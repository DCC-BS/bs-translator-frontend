import type { BrowserContext, Page } from "@playwright/test";

/** Skips the onboarding tour by setting the completion cookie common-ui reads. */
export async function skipTour(context: BrowserContext) {
    await context.addCookies([
        {
            name: "tour-completed",
            value: "true",
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
        .getByRole("button", { name: "Tour neu starten" })
        .filter({ visible: true });
}
