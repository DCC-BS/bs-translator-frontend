const EXAMPLE_TEXT = "Schreibe hier deinen text.";

/**
 * How long the output step waits for the example translation to appear
 * before it is skipped.
 */
const TRANSLATION_OUTPUT_WAIT_MS = 5000;

/**
 * Resolves a tour target lazily to its first *visible* match. Several targets
 * exist twice (e.g. the language selector for wide and narrow layouts) with
 * one copy hidden, and the output controls only exist once a translation is
 * shown. With `skipMissingElement`, a step whose target is not visible is
 * skipped instead of pointing at nothing.
 */
function visibleTourTarget(name: string): () => Element {
    return () =>
        Array.from(document.querySelectorAll(`[data-tour="${name}"]`)).find(
            (element) => element.getClientRects().length > 0,
        ) as Element; // driver.js treats an undefined result as "missing"
}

/**
 * Builds the guided tour for the translator. The orchestrator owns when the
 * tour is mounted; this composable only describes the steps.
 */
export function useOnboardingTour() {
    const { t } = useI18n();
    const { setExampleText } = useTourController();

    return useOnboardingBuilder({
        // Finishing and skipping both end in a destroy, so clean up here.
        onDestroyed: () => setExampleText(""),
        skipMissingElement: true,
    })
        .addPhases([
            {
                name: "translate",
                onEnter: async () => setExampleText(EXAMPLE_TEXT),
                onExit: async () => setExampleText(""),
            },
        ])
        .switchPhase("translate")
        .addSteps([
            {
                element: visibleTourTarget("main-content"),
                popover: {
                    title: () => t("tour.welcome.title"),
                    description: () => t("tour.welcome.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("language-selector"),
                popover: {
                    title: () => t("tour.language-selector.title"),
                    description: () => t("tour.language-selector.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("input-options"),
                popover: {
                    title: () => t("tour.input-options.title"),
                    description: () => t("tour.input-options.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("text-input"),
                popover: {
                    title: () => t("tour.text-input.title"),
                    description: () => t("tour.text-input.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("text-output"),
                waitForElement: TRANSLATION_OUTPUT_WAIT_MS,
                popover: {
                    title: () => t("tour.text-output.title"),
                    description: () => t("tour.text-output.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("record-audio"),
                popover: {
                    title: () => t("tour.record-audio.title"),
                    description: () => t("tour.record-audio.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("upload-file"),
                popover: {
                    title: () => t("tour.upload-file.title"),
                    description: () => t("tour.upload-file.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("view-plain-text"),
                popover: {
                    title: () => t("tour.view-plain-text.title"),
                    description: () => t("tour.view-plain-text.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("copy-to-clipboard"),
                popover: {
                    title: () => t("tour.copy-to-clipboard.title"),
                    description: () => t("tour.copy-to-clipboard.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("download-as-word"),
                popover: {
                    title: () => t("tour.download-as-word.title"),
                    description: () => t("tour.download-as-word.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("conversation-mode"),
                popover: {
                    title: () => t("tour.conversation-mode.title"),
                    description: () => t("tour.conversation-mode.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("photo-mode"),
                popover: {
                    title: () => t("tour.photo-mode.title"),
                    description: () => t("tour.photo-mode.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: visibleTourTarget("main-content"),
                popover: {
                    title: () => t("tour.finished.title"),
                    description: () => t("tour.finished.content"),
                    side: "bottom",
                    align: "center",
                },
            },
        ]);
}
