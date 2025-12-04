<script lang="ts" setup>
import type { VTour } from "#components";
import type { ButtonProp, TourStep } from "#nuxt-tour/props";


const { t } = useI18n();
const { registerRestartHandler, unregisterRestartHandler, setExampleText } = useTourController();

const exampleText = "Schreibe hier deinen text.";
const tour = ref<InstanceType<typeof VTour>>();

// Tour state
const tourCompleted = useCookie("tourCompleted", { default: () => false });
const showTour = ref(false);
const tourIsActive = ref(false);
const trapFocus = ref(false);

// Tour control functions
function startTour(): void {
  showTour.value = true;
  setExampleText(exampleText);
  tour.value?.startTour();
}

/**
 * Ensures the guided tour can be restarted from other components.
 */
async function restartTour(): Promise<void> {
  if (tourIsActive.value) {
    tour.value?.endTour();
    await nextTick();
  }

  tourCompleted.value = false;
  showTour.value = true;
  setExampleText(exampleText);
  tour.value?.resetTour();
}

function onTourStart(): void {
  tourIsActive.value = true;
  window.addEventListener("keydown", handleKeyboardNavigation);
}

async function onTourComplete(): Promise<void> {
  tourCompleted.value = true;
  tourIsActive.value = false;
  window.removeEventListener("keydown", handleKeyboardNavigation);
  setExampleText(""); // Clear the example text
}

function handleKeyboardNavigation(event: KeyboardEvent): void {
  if (!tourIsActive.value) return;

  // Check if user is typing in an input field
  const target = event.target as HTMLElement;
  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  ) {
    return;
  }

  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      event.preventDefault();
      tour.value?.nextStep();
      break;
    case "ArrowLeft":
    case "ArrowUp":
      event.preventDefault();
      tour.value?.prevStep();
      break;
    case "Escape":
      event.preventDefault();
      tour.value?.endTour();
      break;
  }
}

const steps = [
  {
    title: t("tour.welcome.title"),
    body: t("tour.welcome.content"),
  },
  {
    target: '[data-tour="language-selector"]',
    title: t("tour.language-selector.title"),
    body: t("tour.language-selector.content"),
  },
  {
    target: '[data-tour="input-options"]',
    title: t("tour.input-options.title"),
    body: t("tour.input-options.content"),
  },
  {
    target: '[data-tour="text-input"]',
    title: t("tour.text-input.title"),
    body: t("tour.text-input.content"),
  },
  {
    target: '[data-tour="text-output"]',
    title: t("tour.text-output.title"),
    body: t("tour.text-output.content"),
  },
  {
    target: '[data-tour="record-audio"]',
    title: t("tour.record-audio.title"),
    body: t("tour.record-audio.content"),
  },
  {
    target: '[data-tour="upload-file"]',
    title: t("tour.upload-file.title"),
    body: t("tour.upload-file.content"),
  },
  {
    target: '[data-tour="view-plain-text"]',
    title: t("tour.view-plain-text.title"),
    body: t("tour.view-plain-text.content"),
  },
  {
    target: '[data-tour="copy-to-clipboard"]',
    title: t("tour.copy-to-clipboard.title"),
    body: t("tour.copy-to-clipboard.content"),
  },
  {
    target: '[data-tour="download-as-word"]',
    title: t("tour.download-as-word.title"),
    body: t("tour.download-as-word.content"),
  },
  {
    title: t("tour.finished.title"),
    body: t("tour.finished.content"),
  }
] as TourStep[];

// life cycle hooks
onMounted(async () => {
  registerRestartHandler(restartTour);

  await nextTick();
  // Auto-start tour for first-time users (delay to ensure UI is ready)
  if (!tourCompleted.value) {
    startTour();
  }
});

// Clean up keyboard listener on unmount
onUnmounted(() => {
  if (tourIsActive.value) {
    window.removeEventListener("keydown", handleKeyboardNavigation);
  }

  unregisterRestartHandler();
});

const skipBtn: ButtonProp = {
  label: t("tour.skip"),
  leftIcon: "lucide:chevron-last",
};
const nextBtn: ButtonProp = {
  label: t("tour.next"),
  rightIcon: "lucide:arrow-big-right",
};
const prevButton: ButtonProp = {
  label: t("tour.prev"),
  leftIcon: "lucide:arrow-big-left",
};
const finishButton: ButtonProp = {
  label: t("tour.finish"),
  rightIcon: "lucide:check",
};
</script>


<template>
  <VTour ref="tour" :steps="steps" @onTourStart="onTourStart" @onTourEnd="onTourComplete"
    @skip="() => { onTourComplete() }" :highlight="true" :jumpOptions="{ duration: 10 }" :skip-button="skipBtn"
    :next-button="nextBtn" :prev-button="prevButton" :finish-button="finishButton" :trap-focus="trapFocus" />

  <div class="absolute bg-gray-500 z-99 inset-0 opacity-30" v-if="tourIsActive"></div>
</template>

<style scoped>
@reference "../assets/css/main.css";

:deep(#nt-tooltip) {
  max-width: 450px;
}

:deep(#nt-action-next) {
  @apply bg-primary text-white;
}

:deep(#nt-action-prev) {
  @apply bg-primary text-white;
}

:deep(#nt-action-skip) {}

:deep(#nt-action-finish) {
  @apply bg-success text-white;
}
</style>