import { expect, test } from "@playwright/test";

import local from "../../i18n/locales/en.json" with { type: "json" };

const copySuccessMessage = local.ui.copySuccess;
const toneInformal = local.tones.informal;
const domainEnergy = local.domains.Energy;

const glossaryTerm = local.ui.glossaryTerm;
const glossaryDescription = local.ui.glossaryDescription;

test("Text should be translated", async ({ page, context }) => {
    // Skip tour for this test
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
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(500); // wait for translation to finish
    await expect(page.getByTestId("targetMarkdown")).toContainText(
        "Das ist ein Test.",
    );
});

test("Switch to plain text view", async ({ page, context }) => {
    // Skip tour for this test
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
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(2000); // wait for translation to finish

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
    await context.addCookies([
        {
            name: "tourCompleted",
            value: "true",
            domain: "localhost",
            path: "/",
        },
    ]);

    let requestBody: { config: { tone: string } } = { config: { tone: "" } };

    await page.route("**/api/translate/text", (route) => {
        const request = route.request();
        requestBody = request.postDataJSON();
        route.continue();
    });
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("tone-button").click();
    await page.getByText(toneInformal).click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(2000); // wait for translation to finish

    expect(requestBody).not.toBeNull();
    expect(requestBody.config.tone).toBe("informal");
});

test("Api call is correct when domain is set", async ({ page, context }) => {
    // Skip tour for this test
    await context.addCookies([
        {
            name: "tourCompleted",
            value: "true",
            domain: "localhost",
            path: "/",
        },
    ]);

    let requestBody: { config: { domain: string } } = {
        config: { domain: "" },
    };

    await page.route("**/api/translate/text", (route) => {
        const request = route.request();
        requestBody = request.postDataJSON();
        route.continue();
    });
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("sourceTextInput").click();
    await page.getByTestId("domain-button").click();
    await page.getByText(domainEnergy).click();
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(2000); // wait for translation to finish

    expect(requestBody).not.toBeNull();
    expect(requestBody.config.domain).toBe("Energy");
});

test("Api call is correct when glossary is set", async ({ page, context }) => {
    // Skip tour for this test
    await context.addCookies([
        {
            name: "tourCompleted",
            value: "true",
            domain: "localhost",
            path: "/",
        },
    ]);

    let requestBody: { config: { glossary: string } } = {
        config: { glossary: "" },
    };

    await page.route("**/api/translate/text", (route) => {
        const request = route.request();
        requestBody = request.postDataJSON();
        route.continue();
    });
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("glossary-button").click();

    await page.getByPlaceholder(glossaryTerm).fill("X");
    await page.getByPlaceholder(glossaryDescription).fill("Y");
    await page.getByTestId("sourceTextInput").fill("Das ist ein Test.");
    await page.waitForTimeout(2000); // wait for translation to finish

    expect(requestBody).not.toBeNull();
    expect(requestBody.config.glossary).toEqual("X: Y");

    await page.getByTestId("glossary-button").click();

    await page.getByPlaceholder(glossaryTerm).last().fill("XX");
    await page.getByPlaceholder(glossaryDescription).last().fill("YY");
    await page.keyboard.press("Escape"); // close glossary popup
    await page.waitForTimeout(2000); // wait for translation to finish

    expect(requestBody).not.toBeNull();
    expect(requestBody.config.glossary).toEqual("X: Y; XX: YY");
});
