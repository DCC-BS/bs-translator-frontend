<script lang="ts" setup>
import { type Driver, driver } from "driver.js";
import "driver.js/dist/driver.css";

const { t } = useI18n();
const { registerRestartHandler, unregisterRestartHandler, setExampleText } =
    useTourController();

const exampleText = "Schreibe hier deinen text.";
const tourCompleted = useCookie("tourCompleted", { default: () => false });
const driverObj = ref<Driver>();

function createDriver() {
    return driver({
        showProgress: true,
        nextBtnText: t("tour.next"),
        prevBtnText: t("tour.prev"),
        doneBtnText: t("tour.finish"),
        progressText: t("tour.progress", { current: "{{current}}", total: "{{total}}" }),
        onDestroyStarted: () => {
            if (!driverObj.value) return;
            tourCompleted.value = true;
            setExampleText("");
            driverObj.value.destroy();
        },
        steps: [
            {
                element: '[data-tour="main-content"]',
                popover: {
                    title: t("tour.welcome.title"),
                    description: t("tour.welcome.content"),
                    side: "bottom" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="language-selector"]',
                popover: {
                    title: t("tour.language-selector.title"),
                    description: t("tour.language-selector.content"),
                    side: "bottom" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="input-options"]',
                popover: {
                    title: t("tour.input-options.title"),
                    description: t("tour.input-options.content"),
                    side: "bottom" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="text-input"]',
                popover: {
                    title: t("tour.text-input.title"),
                    description: t("tour.text-input.content"),
                    side: "bottom" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="text-output"]',
                popover: {
                    title: t("tour.text-output.title"),
                    description: t("tour.text-output.content"),
                    side: "top" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="record-audio"]',
                popover: {
                    title: t("tour.record-audio.title"),
                    description: t("tour.record-audio.content"),
                    side: "top" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="upload-file"]',
                popover: {
                    title: t("tour.upload-file.title"),
                    description: t("tour.upload-file.content"),
                    side: "top" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="view-plain-text"]',
                popover: {
                    title: t("tour.view-plain-text.title"),
                    description: t("tour.view-plain-text.content"),
                    side: "top" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="copy-to-clipboard"]',
                popover: {
                    title: t("tour.copy-to-clipboard.title"),
                    description: t("tour.copy-to-clipboard.content"),
                    side: "top" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="download-as-word"]',
                popover: {
                    title: t("tour.download-as-word.title"),
                    description: t("tour.download-as-word.content"),
                    side: "top" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="conversation-mode"]',
                popover: {
                    title: t("tour.conversation-mode.title"),
                    description: t("tour.conversation-mode.content"),
                    side: "bottom" as const,
                    align: "center" as const,
                },
            },
            {
                element: '[data-tour="start-tour"]',
                popover: {
                    title: t("tour.finished.title"),
                    description: t("tour.finished.content"),
                    side: "bottom" as const,
                    align: "center" as const,
                },
            },
        ],
    });
}

function start(): void {
    driverObj.value = createDriver();
    setExampleText(exampleText);
    driverObj.value.drive();
}

async function restartTour(): Promise<void> {
    if (driverObj.value) {
        driverObj.value.destroy();
        await nextTick();
    }

    tourCompleted.value = false;
    start();
}

function isCompleted(): boolean {
    return tourCompleted.value === true;
}

function reset(): void {
    tourCompleted.value = false;
}

defineExpose({
    start,
    isCompleted,
    reset,
});

onMounted(async () => {
    registerRestartHandler(restartTour);

    await nextTick();
    if (!tourCompleted.value) {
        start();
    }
});

onUnmounted(() => {
    if (driverObj.value) {
        driverObj.value.destroy();
    }
    unregisterRestartHandler();
});
</script>

<template></template>

<style scoped>
:deep(.driver-popover) {
    max-width: 450px;
}

:deep(.driver-popover-next-btn) {
    background-color: var(--color-primary);
    color: white;
}

:deep(.driver-popover-prev-btn) {
    background-color: var(--color-primary);
    color: white;
}

:deep(.driver-popover-done-btn) {
    background-color: var(--color-success);
    color: white;
}
</style>
