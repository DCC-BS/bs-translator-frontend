<script lang="ts" setup>
const sourceLanguage = defineModel<string>("sourceLanguage");
const targetLanguage = defineModel<string>("targetLanguage");

interface InputProps {
    detectedSourceLanguage?: string;
    isDetectingLanguage?: boolean;
    canSwitch?: boolean;
    includeAutoDetect?: boolean;
}

const props = withDefaults(defineProps<InputProps>(), {
    isDetectingLanguage: false,
    canSwitch: true,
    includeAutoDetect: true,
});

const emit = defineEmits<(e: "swap-languages") => void>();
const showSwitchButton = computed(() => props.canSwitch ?? true);

/**
 * The language that becomes the target on a swap. Only a concrete language
 * qualifies: with source "auto" that is the detected language, and nothing
 * while detection is pending or unsure ("auto" must never become the target).
 */
const swapTargetLanguage = computed(() =>
    sourceLanguage.value === "auto"
        ? props.detectedSourceLanguage
        : sourceLanguage.value,
);

const canSwap = computed(
    () =>
        isConcreteLanguage(swapTargetLanguage.value) &&
        swapTargetLanguage.value !== targetLanguage.value,
);

function swapLanguages(): void {
    if (!canSwap.value) {
        return;
    }

    const newTarget = swapTargetLanguage.value;
    sourceLanguage.value = targetLanguage.value;
    targetLanguage.value = newTarget;

    emit("swap-languages");
}
</script>

<template>
    <!-- Language selection area -->
    <div class="flex items-start sm:items-center" data-tour="language-selector">
        <div class="flex-1 flex justify-end">
            <LanguageSelectionView v-model="sourceLanguage" :detected-language-code="detectedSourceLanguage"
                :is-detecting-language="isDetectingLanguage" :include-auto-detect="props.includeAutoDetect" />
        </div>

        <UButton v-if="showSwitchButton" :active="canSwap" :disabled="!canSwap" variant="soft"
            color="primary" icon="i-lucide-arrow-left-right" size="md"
            class="invisible w-0 sm:w-fit sm:visible rounded-lg p-2 transition-transform hover:scale-110"
            @click="swapLanguages">
        </UButton>

        <div class="flex-1">
            <LanguageSelectionView v-model="targetLanguage" />
        </div>
    </div>
</template>
