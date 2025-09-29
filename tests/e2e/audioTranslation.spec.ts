import { expect, test } from "@playwright/test";

import local from "../../i18n/locales/en.json" with { type: "json" };

import audioLocal from "../../node_modules/@dcc-bs/audio-recorder.bs.js/dist/runtime/lang/en.json" with {
    type: "json",
};

const startRecording = audioLocal["audio-recorder"].audio.startRecording;
const stopRecording = audioLocal["audio-recorder"].audio.stopRecording;

const copySuccessMessage = local.ui.copySuccess;
const toneInformal = local.tones.informal;
const domainEnergy = local.domains.Energy;

const glossaryTerm = local.ui.glossaryTerm;
const glossaryDescription = local.ui.glossaryDescription;

test("Text should be translated", async ({ page }) => {
    await page.goto("/");

    await page.getByText("Ich habe die Hinweise gelesen").click();
    await page.getByTestId("microphoneButton").click();
    await page.waitForTimeout(500); // wait for recording to finish
    await page.getByText(startRecording).click({ force: true });
    await page.waitForTimeout(500); // wait for recording to finish
    await page.getByText(stopRecording).click();

    await page.waitForTimeout(1000); // wait for translation to finish

    expect(page.getByTestId("sourceTextInput")).toContainText(
        "This is a dummy streaming response",
    );
});
