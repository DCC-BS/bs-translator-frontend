import { type BrowserContext, expect, test } from "@playwright/test";

import local from "../../i18n/locales/en.json" with { type: "json" };

const copySuccessMessage = local.ui.copySuccess;
const toneInformal = local.tones.informal;
const domainEnergy = local.domains.Energy;

const glossaryTerm = local.ui.glossaryTerm;
const glossaryDescription = local.ui.glossaryDescription;

// Language detection test constants
const autoDetectText = local.languages.auto;

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

test("Text should be translated", async ({ page, context }) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(500); // wait for translation to finish
    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "Das ist ein Test.",
    );
});

test("Switch to plain text view", async ({ page, context }) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(500); // wait for translation to finish
    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "Das ist ein Test.",
    );

    await page.getByTestId("toggleMarkdownButton").click();
    await expect(page.getByTestId("targetTextInput")).toHaveValue(
        "Das ist ein Test.",
    );
});

test("Copy rich translated text", async ({ page, context }) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(1000); // wait for translation to finish
    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "Das ist ein Test.",
    );

    await page.getByTestId("copyToClipboardButton").click();
    await expect(page.getByText(copySuccessMessage).first()).toBeVisible();

    const clipboard = await page.evaluate(async () => {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            if (item.types.includes("text/html")) {
                const blob = await item.getType("text/html");
                const htmlContent = await blob.text();
                return htmlContent;
            }
        }
    });

    expect(clipboard).toMatch(/<p(.*?)>Das ist ein Test.<\/p>/);
});

test("Copy plain translated text", async ({ page, context }) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(4000); // wait for translation to finish

    await page.getByTestId("toggleMarkdownButton").click();

    await page.getByTestId("copyToClipboardButton").click();
    await expect(page.getByText(copySuccessMessage).first()).toBeVisible();

    const clipboard = await page.evaluate(async () => {
        return navigator.clipboard.readText();
    });

    expect(clipboard).toBe("Das ist ein Test.");
});

test("Api call is correct when tone is set", async ({ page, context }) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("tone-button").click();
    await page.getByText(toneInformal).click();

    // Wait for the specific request that happens after filling the text
    const responsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/translate/text") &&
            response.request().method() === "POST",
    );

    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");

    // Wait for the response and extract request body
    const response = await responsePromise;
    const requestBody = await response.request().postDataJSON();

    expect(requestBody).not.toBeNull();
    expect(requestBody.config.tone).toBe("informal");
});

test("Api call is correct when domain is set", async ({ page, context }) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("domain-button").click();
    await page.getByText(domainEnergy).click();

    // Wait for the specific request that happens after filling the text
    const responsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/translate/text") &&
            response.request().method() === "POST",
    );

    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");

    // Wait for the response and extract request body
    const response = await responsePromise;
    const requestBody = await response.request().postDataJSON();

    expect(requestBody).not.toBeNull();
    expect(requestBody.config.domain).toBe("Energy");
});

test("Api call is correct when glossary is set", async ({ page, context }) => {
    // Skip tour for this test
    await skipTour(context);

    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("glossary-button").click();

    await page.getByPlaceholder(glossaryTerm).fill("X");
    await page.getByPlaceholder(glossaryDescription).fill("Y");

    // Wait for the first request that happens after filling the text
    const firstResponsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/translate/text") &&
            response.request().method() === "POST",
    );

    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");

    // Wait for the first response and extract request body
    const firstResponse = await firstResponsePromise;
    const firstRequestBody = await firstResponse.request().postDataJSON();

    expect(firstRequestBody).not.toBeNull();
    expect(firstRequestBody.config.glossary).toEqual("X: Y");

    await page.getByTestId("glossary-button").click();

    await page.getByPlaceholder(glossaryTerm).last().fill("XX");
    await page.getByPlaceholder(glossaryDescription).last().fill("YY");

    // Wait for the second request that happens after closing the popup
    const secondResponsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/translate/text") &&
            response.request().method() === "POST",
    );

    await page.keyboard.press("Escape"); // close glossary popup

    // Wait for the second response and extract request body
    const secondResponse = await secondResponsePromise;
    const secondRequestBody = await secondResponse.request().postDataJSON();

    expect(secondRequestBody).not.toBeNull();
    expect(secondRequestBody.config.glossary).toEqual("X: Y; XX: YY");
});

test("Language detection is called only once per translation", async ({
    page,
    context,
}) => {
    // Skip tour for this test
    await skipTour(context);

    // Track how many times the detect-language API is called
    let detectLanguageCallCount = 0;

    await page.route("**/api/detect-language", (route) => {
        detectLanguageCallCount++;
        // Mock the response with German detected
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ language: "de", confidence: 0.95 }),
        });
    });

    // Also mock the translation endpoint to complete the flow
    await page.route("**/api/translate/text", (route) => {
        route.fulfill({
            status: 200,
            contentType: "text/plain",
            body: "This is a test.",
        });
    });

    await page.goto("/");

    // Accept disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    // Ensure source language is set to auto detect (should be default)
    // Use .first() to target specifically the source language selector (there are two selectors on the page)
    const sourceLanguageSelector = page
        .locator('[data-tour="language-selector"]')
        .first();
    await expect(sourceLanguageSelector).toContainText(autoDetectText);

    // Enter text to translate
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");

    // Wait for translation to complete (debounce is 3s)
    await page.waitForTimeout(4000);

    // Verify detect-language was called exactly once
    expect(detectLanguageCallCount).toBe(1);

    // Verify the detected language is displayed in the UI
    await expect(sourceLanguageSelector).toContainText("(detected)");
});

test("Language detection shows detected language in selector", async ({
    page,
    context,
}) => {
    // Skip tour for this test
    await skipTour(context);

    await page.route("**/api/detect-language", (route) => {
        // Mock the response with German detected
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ language: "de", confidence: 0.95 }),
        });
    });

    // Mock the translation endpoint
    await page.route("**/api/translate/text", (route) => {
        route.fulfill({
            status: 200,
            contentType: "text/plain",
            body: "This is a test.",
        });
    });

    await page.goto("/");

    // Accept disclaimer
    await page.getByText("Ich habe die Hinweise gelesen").click();

    // Enter text to translate
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");

    // Wait for translation to complete
    await page.waitForTimeout(4000);

    // Verify the detected language (German) is shown in the selector
    // Use .first() to target specifically the source language selector (there are two selectors on the page)
    const sourceLanguageSelector = page
        .locator('[data-tour="language-selector"]')
        .first();
    await expect(sourceLanguageSelector).toContainText("German (detected)");
});
