import { type BrowserContext, expect, test } from "@playwright/test";

import local from "../../i18n/locales/en.json" with { type: "json" };

const recordAudioTooltip = local.ui.recordAudio;
const uploadFileTooltip = local.ui.uploadFile;
const clearTextTooltip = local.ui.clearText;

// Helper to skip tour by setting the completion cookie
async function skipTour(context: BrowserContext) {
    await context.addCookies([
        {
            name: "tourCompleted",
            value: "true",
            domain: "localhost",
            path: "/",
        },
    ]);
}
test("Tooltips are visible on hover for action buttons", async ({
    page,
    context,
}) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    // Test record audio button tooltip
    const micButton = page.getByTestId("microphoneButton");
    await micButton.hover();
    await page.waitForTimeout(500); // Increase timeout for tooltip to appear
    // Use role selector to find the tooltip specifically
    const tooltip = page.locator('[role="tooltip"]', {
        hasText: recordAudioTooltip,
    });
    await expect(tooltip).toBeVisible();
});

test("Clear text button appears when text is entered", async ({
    page,
    context,
}) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    // Initially, clear button should not be visible
    const sourceTextInput = page.getByTestId("sourceTextInput");

    // Enter some text
    await sourceTextInput.fill("Test text");
    await page.waitForTimeout(100);

    // Clear button should be visible - find button with x icon inside text area container
    const clearButton = page.locator(
        'button.absolute[class*="top-1"][class*="right-1"]',
    );
    await expect(clearButton).toBeVisible();

    // Hover to show tooltip
    await clearButton.hover();
    await page.waitForTimeout(500);
    const clearTooltip = page.locator('[role="tooltip"]', {
        hasText: clearTextTooltip,
    });
    await expect(clearTooltip).toBeVisible();

    // Click clear button
    await clearButton.click();

    // Text should be cleared
    await expect(sourceTextInput).toHaveValue("");
});

test("Target text action buttons have tooltips", async ({ page, context }) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    // Enter text to trigger translation
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(1000); // Wait for translation

    // Test toggle markdown button tooltip
    const toggleButton = page.getByTestId("toggleMarkdownButton");
    await toggleButton.hover();
    await page.waitForTimeout(600);
    // Check for either viewPlainText or viewAsMarkdown tooltip
    const toggleTooltip = page.locator('[role="tooltip"]').filter({
        hasText: new RegExp(
            `(${local.ui.viewPlainText}|${local.ui.viewAsMarkdown})`,
        ),
    });
    await expect(toggleTooltip).toBeVisible();

    // Move mouse away and wait before next tooltip test
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    // Test copy button tooltip
    const copyButton = page.getByTestId("copyToClipboardButton");
    await copyButton.hover();
    await page.waitForTimeout(600);
    const copyTooltip = page.locator('[role="tooltip"]', {
        hasText: local.ui.copyToClipboard,
    });
    await expect(copyTooltip).toBeVisible();

    // Move mouse away and wait before next tooltip test
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    // Test download button tooltip
    const downloadButton = page.getByTestId("downloadWordButton");
    await downloadButton.hover();
    await page.waitForTimeout(600);
    const downloadTooltip = page.locator('[role="tooltip"]', {
        hasText: local.ui.downloadTranslatedText,
    });
    await expect(downloadTooltip).toBeVisible();
});

test("Tour data attributes are present on key elements", async ({
    page,
    context,
}) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    // Check that tour targets exist - use .first() to avoid strict mode errors
    await expect(
        page.locator('[data-tour="language-selector"]').first(),
    ).toBeVisible();
    await expect(page.locator('[data-tour="input-options"]')).toBeVisible();
    await expect(page.locator('[data-tour="text-input"]')).toBeVisible();
    await expect(page.locator('[data-tour="record-audio"]')).toBeVisible();
    await expect(page.locator('[data-tour="upload-file"]')).toBeVisible();

    // Enter text to show target area
    await page.getByTestId("sourceTextInput").fill("Test");
    await page.waitForTimeout(500);

    await expect(page.locator('[data-tour="text-output"]')).toBeVisible();
    await expect(page.locator('[data-tour="view-plain-text"]')).toBeVisible();
    await expect(page.locator('[data-tour="copy-to-clipboard"]')).toBeVisible();
    await expect(page.locator('[data-tour="download-as-word"]')).toBeVisible();
});

test("Tour restart button is present in navigation", async ({
    page,
    context,
}) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    // Check that restart button exists
    const restartButton = page.getByTestId("tourRestartButton");
    await expect(restartButton).toBeVisible();

    // Check tooltip
    await restartButton.hover();
    await page.waitForTimeout(500);
    const restartTooltip = page.locator('[role="tooltip"]', {
        hasText: local.tour.restart,
    });
    await expect(restartTooltip).toBeVisible();
});

test("File upload button shows tooltip", async ({ page, context }) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    // Dismiss disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    // Find the upload file button
    const uploadButton = page.locator('[data-tour="upload-file"]');
    await expect(uploadButton).toBeVisible();

    // Hover to show tooltip
    await uploadButton.hover();
    await page.waitForTimeout(500);
    const uploadTooltip = page.locator('[role="tooltip"]', {
        hasText: uploadFileTooltip,
    });
    await expect(uploadTooltip).toBeVisible();
});
