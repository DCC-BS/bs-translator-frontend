import { expect, test } from "@playwright/test";

import { skipTour } from "./helpers";

const testInput = "Das ist ein Test.";
const dummyTranslation = `This is a dummy translation response for: "${testInput}"`;

test("Text should be translated", async ({ page, context }) => {
    // Skip tour and disclaimer for this test
    await skipTour(context);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const ta = page.getByPlaceholder(
        "Enter text to translate or drop a file here...",
    );
    await ta.fill("Das ist ein Test.");

    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "Das ist ein Test.",
        { timeout: 15000 },
    );
});

test("Switch to plain text view", async ({ page, context }) => {
    // Skip tour and disclaimer for this test
    await skipTour(context);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const ta = page.getByPlaceholder(
        "Enter text to translate or drop a file here...",
    );
    await ta.fill("Das ist ein Test.");

    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "Das ist ein Test.",
        { timeout: 15000 },
    );

    await page.getByTestId("toggleMarkdownButton").click();
    await expect(page.getByTestId("targetTextInput")).toHaveValue(
        dummyTranslation,
        { timeout: 15000 },
    );
});

test("Copy rich translated text", async ({ page, context }) => {
    // Skip tour and disclaimer for this test
    await skipTour(context);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const ta = page.getByPlaceholder(
        "Enter text to translate or drop a file here...",
    );
    await ta.fill("Das ist ein Test.");

    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "Das ist ein Test.",
        { timeout: 15000 },
    );

    await page.getByTestId("copyToClipboardButton").click();
    await page.waitForTimeout(500);

    const clipboard = await page.evaluate(async () => {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                if (item.types.includes("text/plain")) {
                    const blob = await item.getType("text/plain");
                    return await blob.text();
                }
            }
        } catch {
            // fallback
        }
        return await navigator.clipboard.readText();
    });

    expect(clipboard).toBe(dummyTranslation);
});

test("Copy plain translated text", async ({ page, context }) => {
    // Skip tour and disclaimer for this test
    await skipTour(context);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const ta = page.getByPlaceholder(
        "Enter text to translate or drop a file here...",
    );
    await ta.fill("Das ist ein Test.");

    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "Das ist ein Test.",
        { timeout: 15000 },
    );

    await page.getByTestId("toggleMarkdownButton").click();
    await page.getByTestId("copyToClipboardButton").click();

    const clipboard = await page.evaluate(async () => {
        return navigator.clipboard.readText();
    });

    expect(clipboard).toBe(dummyTranslation);
});

test("Api call is correct when tone is set", async ({ page, context }) => {
    // Skip tour and disclaimer for this test
    await skipTour(context);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("tone-button").click();
    await page.getByRole("radio", { name: /Informal|Informell/i }).click();

    // Wait for the specific request that happens after filling the text
    const responsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/translate/text") &&
            response.request().method() === "POST",
    );

    const ta = page.getByPlaceholder(
        "Enter text to translate or drop a file here...",
    );
    await ta.fill("Das ist ein Test.");

    // Wait for the response and extract request body
    const response = await responsePromise;
    const requestBody = await response.request().postDataJSON();

    expect(requestBody).not.toBeNull();
    expect(requestBody.config.tone).toBe("informal");
});

test("Api call is correct when domain is set", async ({ page, context }) => {
    // Skip tour and disclaimer for this test
    await skipTour(context);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("domain-button").click();
    await page.getByRole("radio", { name: /Energy|Energie/i }).click();

    // Wait for the specific request that happens after filling the text
    const responsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/translate/text") &&
            response.request().method() === "POST",
    );

    const ta = page.getByPlaceholder(
        "Enter text to translate or drop a file here...",
    );
    await ta.fill("Das ist ein Test.");

    // Wait for the response and extract request body
    const response = await responsePromise;
    const requestBody = await response.request().postDataJSON();

    expect(requestBody).not.toBeNull();
    expect(requestBody.config.domain).toBe("Energy");
});

test("Api call is correct when glossary is set", async ({ page, context }) => {
    // Skip tour and disclaimer for this test
    await skipTour(context);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("glossary-button").click();

    const dialog = page.getByRole("dialog");
    await dialog
        .getByPlaceholder(/Term|Begriff/i)
        .first()
        .fill("X");
    await dialog
        .getByPlaceholder(/Description|Beschreibung/i)
        .first()
        .fill("Y");

    // Wait for the first request that happens after filling the text
    const firstResponsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/translate/text") &&
            response.request().method() === "POST",
    );

    const ta = page.getByPlaceholder(
        "Enter text to translate or drop a file here...",
    );
    await ta.fill("Das ist ein Test.");

    // Wait for the first response and extract request body
    const firstResponse = await firstResponsePromise;
    const firstRequestBody = await firstResponse.request().postDataJSON();

    expect(firstRequestBody).not.toBeNull();
    expect(firstRequestBody.config.glossary).toEqual("X: Y");

    await page.getByTestId("glossary-button").click();

    await dialog
        .getByPlaceholder(/Term|Begriff/i)
        .last()
        .fill("XX");
    await dialog
        .getByPlaceholder(/Description|Beschreibung/i)
        .last()
        .fill("YY");

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
    // Skip tour and disclaimer for this test
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
    await page.waitForLoadState("networkidle");

    // Ensure source language is set to auto detect (should be default)
    const sourceLanguageSelector = page
        .locator('[data-tour="language-selector"]')
        .first();
    await expect(sourceLanguageSelector).toContainText(/auto|Automatisch/i);

    // Enter text to translate
    const ta = page.getByPlaceholder(
        "Enter text to translate or drop a file here...",
    );
    await ta.fill("Das ist ein Test.");

    // Wait for translation to complete
    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "This is a test.",
        { timeout: 15000 },
    );

    // Verify detect-language was called exactly once
    expect(detectLanguageCallCount).toBe(1);

    // Verify the detected language is displayed in the UI
    await expect(sourceLanguageSelector).toContainText(/erkannt|detected/i);
});

test("Language detection shows detected language in selector", async ({
    page,
    context,
}) => {
    // Skip tour and disclaimer for this test
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
    await page.waitForLoadState("networkidle");

    // Enter text to translate
    const ta = page.getByPlaceholder(
        "Enter text to translate or drop a file here...",
    );
    await ta.fill("Das ist ein Test.");

    // Wait for translation to complete
    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "This is a test.",
        { timeout: 15000 },
    );

    // Verify the detected language (German/Deutsch) is shown in the selector
    const sourceLanguageSelector = page
        .locator('[data-tour="language-selector"]')
        .first();
    await expect(sourceLanguageSelector).toContainText(/Deutsch|German/i);
    await expect(sourceLanguageSelector).toContainText(/erkannt|detected/i);
});
