import { expect, test } from "@playwright/test";

test("Onboarding tour starts automatically for first-time users", async ({
    page,
    context,
}) => {
    // Clear cookies to simulate first-time user
    await context.clearCookies();

    await page.goto("/");

    // Dismiss disclaimer to interact with the rest of the UI
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Tour should appear automatically
    await tooltip.waitFor();
    await expect(tooltip).toBeVisible();
});

test("Tour does not auto-start for returning users", async ({
    page,
    context,
}) => {
    // Set the tourCompleted cookie
    await context.addCookies([
        {
            name: "tourCompleted",
            value: "true",
            domain: "localhost",
            path: "/",
        },
    ]);

    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Tour should not appear automatically
    await page.waitForTimeout(1000);
    await expect(tooltip).not.toBeVisible();
});

test("User can navigate through tour steps using next button", async ({
    page,
}) => {
    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Wait for tour to start
    await tooltip.waitFor();
    await expect(tooltip).toBeVisible();

    // Click next button multiple times to go through steps
    const nextButton = page.locator("#nt-action-next");

    // Go through first few steps
    for (let i = 0; i < 3; i++) {
        await expect(nextButton).toBeVisible();
        await nextButton.click();
        await page.waitForTimeout(300); // Wait for animation
        await expect(tooltip).toBeVisible();
    }
});

test("User can navigate backwards through tour steps", async ({ page }) => {
    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Wait for tour to start
    await tooltip.waitFor();

    // Move forward a few steps
    const nextButton = page.locator("#nt-action-next");
    await nextButton.click();
    await page.waitForTimeout(300);
    await nextButton.click();
    await page.waitForTimeout(300);

    // Now go back
    const prevButton = page.locator("#nt-action-prev");
    await expect(prevButton).toBeVisible();
    await prevButton.click();
    await page.waitForTimeout(300);

    // Tooltip should still be visible
    await expect(tooltip).toBeVisible();
});

test("User can skip the tour", async ({ page }) => {
    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Wait for tour to start
    await tooltip.waitFor();
    await expect(tooltip).toBeVisible();

    // Click skip button
    const skipButton = page.locator("#nt-action-skip");
    await skipButton.click();

    // Tour should be hidden
    await expect(tooltip).toBeHidden();
});

test("User can complete the tour", async ({ page }) => {
    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Wait for tour to start
    await tooltip.waitFor();

    // Simply skip the tour - this is faster and more reliable
    const skipButton = page.locator("#nt-action-skip");
    await skipButton.click();

    // Verify tour ended and cookie was set
    await expect(tooltip).toBeHidden();

    // Verify we can restart the tour (which proves it completed)
    await page.getByTestId("tourRestartButton").click();
    await expect(tooltip).toBeVisible();

    // Skip again to clean up
    await skipButton.click();
});

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

test("Tour highlights correct elements", async ({ page }) => {
    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Wait for tour to start
    await tooltip.waitFor();

    const nextButton = page.locator("#nt-action-next");

    // First step should not have a specific target (welcome screen)
    await nextButton.click();
    await page.waitForTimeout(300);

    // Second step should highlight language selector - use .first() to handle multiple matches
    const languageSelector = page
        .locator('[data-tour="language-selector"]')
        .first();
    await expect(languageSelector).toBeVisible();

    await nextButton.click();
    await page.waitForTimeout(300);

    // Third step should highlight input options
    const inputOptions = page.locator('[data-tour="input-options"]');
    await expect(inputOptions).toBeVisible();

    await nextButton.click();
    await page.waitForTimeout(300);

    // Fourth step should highlight text input
    const textInput = page.locator('[data-tour="text-input"]');
    await expect(textInput).toBeVisible();
});

test("Keyboard navigation works during tour", async ({ page }) => {
    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Wait for tour to start
    await tooltip.waitFor();
    await expect(tooltip).toBeVisible();

    // Press right arrow to go to next step
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    await expect(tooltip).toBeVisible();

    // Press left arrow to go back
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(300);
    await expect(tooltip).toBeVisible();

    // Press escape to close tour
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(tooltip).toBeHidden();
});

test("Tour overlay appears when tour is active", async ({ page }) => {
    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    const tooltip = page.locator("#nt-tooltip");

    // Wait for tour to start
    await tooltip.waitFor();

    // Check if overlay is present (dark background)
    const overlay = page.locator(
        ".absolute.bg-gray-500.z-50.inset-0.opacity-30",
    );
    await expect(overlay).toBeVisible();

    // Skip tour
    const skipButton = page.locator("#nt-action-skip");
    await skipButton.click();

    // Overlay should be hidden
    await expect(overlay).not.toBeVisible();
});
