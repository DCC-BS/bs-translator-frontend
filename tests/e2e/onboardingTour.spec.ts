import { expect, test } from "@playwright/test";

test("Navigation restart button restarts onboarding tour", async ({ page }) => {
    await page.goto("/");

    // Dismiss disclaimer to interact with the rest of the UI
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Wait for the tour to appear and then end it via the skip action
    await tooltip.waitFor();
    await page.locator("#nt-action-skip").click();
    await expect(tooltip).toBeHidden();

    // Restart the tour via the navigation button and verify it shows again
    await page.getByTestId("tourRestartButton").click();
    await expect(tooltip).toBeVisible();
});
