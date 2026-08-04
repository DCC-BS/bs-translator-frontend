const EXAMPLE_TEXT = "Schreibe hier deinen text.";

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
                element: '[data-tour="main-content"]',
                popover: {
                    title: () => t("tour.welcome.title"),
                    description: () => t("tour.welcome.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: '[data-tour="language-selector"]',
                popover: {
                    title: () => t("tour.language-selector.title"),
                    description: () => t("tour.language-selector.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: '[data-tour="input-options"]',
                popover: {
                    title: () => t("tour.input-options.title"),
                    description: () => t("tour.input-options.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: '[data-tour="text-input"]',
                popover: {
                    title: () => t("tour.text-input.title"),
                    description: () => t("tour.text-input.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: '[data-tour="text-output"]',
                popover: {
                    title: () => t("tour.text-output.title"),
                    description: () => t("tour.text-output.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: '[data-tour="record-audio"]',
                popover: {
                    title: () => t("tour.record-audio.title"),
                    description: () => t("tour.record-audio.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: '[data-tour="upload-file"]',
                popover: {
                    title: () => t("tour.upload-file.title"),
                    description: () => t("tour.upload-file.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: '[data-tour="view-plain-text"]',
                popover: {
                    title: () => t("tour.view-plain-text.title"),
                    description: () => t("tour.view-plain-text.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: '[data-tour="copy-to-clipboard"]',
                popover: {
                    title: () => t("tour.copy-to-clipboard.title"),
                    description: () => t("tour.copy-to-clipboard.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: '[data-tour="download-as-word"]',
                popover: {
                    title: () => t("tour.download-as-word.title"),
                    description: () => t("tour.download-as-word.content"),
                    side: "top",
                    align: "center",
                },
            },
            {
                element: '[data-tour="conversation-mode"]',
                popover: {
                    title: () => t("tour.conversation-mode.title"),
                    description: () => t("tour.conversation-mode.content"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: '[data-tour="main-content"]',
                popover: {
                    title: () => t("tour.finished.title"),
                    description: () => t("tour.finished.content"),
                    side: "bottom",
                    align: "center",
                },
            },
        ]);
}
