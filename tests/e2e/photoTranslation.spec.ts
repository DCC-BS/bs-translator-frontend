import { expect, type Page, test } from "@playwright/test";
import local from "../../i18n/locales/de.json" with { type: "json" };
import localEn from "../../i18n/locales/en.json" with { type: "json" };
import { anyLocale, skipTour, toastTitle } from "./helpers";

// A 4x4 red PNG; the dummy OCR endpoint ignores the content.
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGP4z8AARwzEcQCukw/x0F8jngAAAABJRU5ErkJggg==",
    "base64",
);

/** The dummy OCR returns these two blocks; the dummy translation prefixes them. */
const DUMMY_TRANSLATION = "[dummy] Dummy-Überschrift";

function countRequests(page: Page, path: string): { count: number } {
    const counter = { count: 0 };
    page.on("request", (request) => {
        if (request.url().includes(path)) {
            counter.count++;
        }
    });
    return counter;
}

/**
 * Opens the photo page and chooses `PNG` from the device. Waits for the camera
 * to be live first: that only happens after hydration, before which the file
 * input has no change handler yet.
 */
async function uploadPhoto(page: Page): Promise<void> {
    await page.goto("/photo");
    await expect(
        page.getByRole("button", {
            name: anyLocale(local.camera.takePhoto, localEn.camera.takePhoto),
        }),
    ).toBeEnabled();
    await page.locator('input[type="file"]').setInputFiles({
        name: "sign.png",
        mimeType: "image/png",
        buffer: PNG,
    });
}

test.beforeEach(async ({ context }) => {
    await skipTour(context);
});

test("Taking a photo with the camera shows the translated text blocks", async ({
    page,
}) => {
    await page.goto("/photo");

    // Chromium's fake camera delivers frames, so the shutter becomes enabled.
    const shutter = page.getByRole("button", {
        name: anyLocale(local.camera.takePhoto, localEn.camera.takePhoto),
    });
    await expect(shutter).toBeEnabled();
    await shutter.click();

    await expect(page.getByText(DUMMY_TRANSLATION)).toBeVisible();
    await expect(
        page.getByText(
            anyLocale(local.photo.hintMouse, localEn.photo.hintMouse),
        ),
    ).toBeVisible();
});

test("A photo chosen from the device is translated", async ({ page }) => {
    await uploadPhoto(page);

    await expect(page.getByText(DUMMY_TRANSLATION)).toBeVisible();

    // The text view lists original and translation of every block.
    await page
        .getByRole("button", {
            name: anyLocale(local.photo.textView, localEn.photo.textView),
        })
        .click();
    await expect(
        page.getByText("Dummy-Überschrift", { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText(DUMMY_TRANSLATION).filter({ visible: true }),
    ).toBeVisible();

    await page
        .getByRole("button", {
            name: anyLocale(local.photo.copy, localEn.photo.copy),
        })
        .click();
    await expect(
        toastTitle(page, anyLocale(local.photo.copied, localEn.photo.copied)),
    ).toBeVisible();
});

test("Changing the target language re-translates without running OCR again", async ({
    page,
}) => {
    const ocrRequests = countRequests(page, "/api/translate/image-ocr");
    const blockRequests = countRequests(page, "/api/translate/image-blocks");

    await uploadPhoto(page);
    await expect(page.getByText(DUMMY_TRANSLATION)).toBeVisible();
    expect(ocrRequests.count).toBe(1);
    expect(blockRequests.count).toBe(1);

    // The target language selector shows the current target, English (USA).
    await page
        .getByRole("button", {
            name: anyLocale("Englisch (USA)", "English (USA)"),
        })
        .click();
    await page
        .getByRole("option", { name: anyLocale("Französisch", "French") })
        .first()
        .click();

    await expect.poll(() => blockRequests.count).toBe(2);
    expect(ocrRequests.count).toBe(1);
});

test("Retake returns to the camera", async ({ page }) => {
    await uploadPhoto(page);
    await expect(page.getByText(DUMMY_TRANSLATION)).toBeVisible();

    await page
        .getByRole("button", {
            name: anyLocale(local.photo.retake, localEn.photo.retake),
        })
        .click();
    await expect(
        page.getByRole("button", {
            name: anyLocale(local.camera.takePhoto, localEn.camera.takePhoto),
        }),
    ).toBeVisible();
});
