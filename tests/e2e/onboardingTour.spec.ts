import { expect, test } from "@playwright/test";

test("Onboarding tour starts automatically for first-time users", async ({
    page,
    context,
}) => {
    await context.clearCookies();

    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await popover.waitFor();
    await expect(popover).toBeVisible();
});

test("Tour does not auto-start for returning users", async ({
    page,
    context,
}) => {
    await context.addCookies([
        {
            name: "tourCompleted",
            value: "true",
            domain: "localhost",
            path: "/",
        },
    ]);

    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await page.waitForTimeout(1000);
    await expect(popover).not.toBeVisible();
});

test("User can navigate through tour steps using next button", async ({
    page,
}) => {
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await popover.waitFor();
    await expect(popover).toBeVisible();

    const nextButton = page.locator(".driver-popover-next-btn");

    for (let i = 0; i < 3; i++) {
        await expect(nextButton).toBeVisible();
        await nextButton.click();
        await expect(popover).toBeVisible({ timeout: 5000 });
    }
});

test("User can navigate backwards through tour steps", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await popover.waitFor();

    const nextButton = page.locator(".driver-popover-next-btn");
    await nextButton.click();
    await expect(popover).toBeVisible({ timeout: 5000 });
    await nextButton.click();
    await expect(popover).toBeVisible({ timeout: 5000 });

    const prevButton = page.locator(".driver-popover-prev-btn");
    await expect(prevButton).toBeVisible();
    await prevButton.click();
    await expect(popover).toBeVisible({ timeout: 5000 });
});

test("User can close the tour via the close button", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await popover.waitFor();
    await expect(popover).toBeVisible();

    const closeButton = page.locator(".driver-popover-close-btn");
    await closeButton.click();

    await expect(popover).toBeHidden();
});

test("User can complete the tour", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await popover.waitFor();

    const closeButton = page.locator(".driver-popover-close-btn");
    await closeButton.click();

    await expect(popover).toBeHidden();

    await page.getByTestId("tourRestartButton").click();
    await expect(popover).toBeVisible();

    await closeButton.click();
});

test("Navigation restart button restarts onboarding tour", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await popover.waitFor();
    await page.locator(".driver-popover-close-btn").click();
    await expect(popover).toBeHidden();

    await page.getByTestId("tourRestartButton").click();
    await expect(popover).toBeVisible();
});

test("Tour highlights correct elements", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await popover.waitFor();

    const nextButton = page.locator(".driver-popover-next-btn");

    await nextButton.click();
    await page.waitForTimeout(300);

    const languageSelector = page
        .locator('[data-tour="language-selector"]')
        .first();
    await expect(languageSelector).toBeVisible();

    await nextButton.click();
    await page.waitForTimeout(300);

    const inputOptions = page.locator('[data-tour="input-options"]');
    await expect(inputOptions).toBeVisible();

    await nextButton.click();
    await page.waitForTimeout(300);

    const textInput = page.locator('[data-tour="text-input"]');
    await expect(textInput).toBeVisible();
});

test("Keyboard navigation works during tour", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await popover.waitFor();
    await expect(popover).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    await expect(popover).toBeVisible();

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(300);
    await expect(popover).toBeVisible();

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(popover).toBeHidden();
});

test("Tour overlay appears when tour is active", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();

    const popover = page.locator(".driver-popover");

    await popover.waitFor();
    await expect(popover).toBeVisible();

    const closeButton = page.locator(".driver-popover-close-btn");
    await closeButton.click();

    await expect(popover).toBeHidden();
});
