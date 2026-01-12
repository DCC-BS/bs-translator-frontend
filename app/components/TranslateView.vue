<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";
import { TRANSLATION_DEBOUNCE_MS } from "~/utils/constants";

const router = useRouter();

// Get translation states and functions from the translate composable
const {
    tone,
    domain,
    glossary,
    sourceLanguage,
    targetLanguage,
    sourceText,
    translatedText,
    detectedSourceLanguage,
    isTranslating,
    isDetectingLanguage,
    translate,
    abort,
} = useTranslate();

// Register handler for setting example text during onboarding
const { registerSetExampleTextHandler, unregisterSetExampleTextHandler } =
    useTourController();

onMounted(() => {
    registerSetExampleTextHandler((text: string) => {
        sourceText.value = text;
    });
});

onUnmounted(() => {
    unregisterSetExampleTextHandler();
});

/**
 * Initialize file conversion with callback for processed text
 */
const {
    dropZoneRef,
    isOverDropZone,
    isConverting,
    error: conversionError,
    fileName,
    handleFileSelect,
    clearError,
} = useFileConvert(sourceLanguage, (text) => {
    sourceText.value = text;
});

const fileInputRef = ref<HTMLInputElement | null>(null);

function swapLanguages(): void {
    swapRef(sourceText, translatedText);
}

async function handleTranslate(): Promise<void> {
    if (!sourceText.value || !targetLanguage.value) return;

    abort(); // Cancel any ongoing translation

    await translate();
}

watchDebounced(
    sourceText,
    () => {
        if (sourceText.value && targetLanguage.value) {
            handleTranslate();
        }
    },
    { debounce: TRANSLATION_DEBOUNCE_MS },
);

function triggerFileUpload(): void {
    if (fileInputRef.value) {
        fileInputRef.value.click();
    }
}

function onFileSelect(event: Event): void {
    handleFileSelect(event);
    // Reset the input so the same file can be selected again
    if (fileInputRef.value) {
        fileInputRef.value.value = "";
    }
}

function onCapturePhoto() {
    router.push({ path: "/photo" });
}
</script>

<template>
    <div class="h-full w-full p-4 flex flex-col">
        <SplitContainer class="flex-1 min-h-0">
            <template #header>
                <div class="flex items-center w-full">
                    <div class="flex gap-2 flex-1">
                        <input type="file" ref="fileInputRef" class="hidden" @change="onFileSelect"
                            accept=".txt,.doc,.docx,.pdf,.md,.html,.rtf" />

                        <!-- <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-camera"
                            @click="onCapturePhoto">
                            <span class="hidden md:inline">
                                {{ t('ui.takePhoto') }}
                            </span>
                        </UButton> -->
                    </div>

                    <!-- Language selection area -->
                    <div class="hidden xl:inline">
                        <LanguageSelectionBar v-model:source-language="sourceLanguage"
                            v-model:target-language="targetLanguage" :detected-source-language="detectedSourceLanguage"
                            @swap-languages="swapLanguages" />
                    </div>

                    <OptionsToolBar v-model:tone="tone" v-model:domain="domain" v-model:glossary="glossary" />
                </div>
                <div class="flex justify-center xl:hidden">
                    <LanguageSelectionBar v-model:source-language="sourceLanguage"
                        v-model:target-language="targetLanguage" :detected-source-language="detectedSourceLanguage"
                        @swap-languages="swapLanguages" />
                </div>
            </template>

            <template #left>
                <div class="h-full w-full relative">
                    <SourceTextView v-model="sourceText" :is-over-drop-zone="isOverDropZone"
                        :is-converting="isConverting" :error="conversionError" :fileName="fileName"
                        :language-code="sourceLanguage" ref="dropZoneRef" @clear-error="clearError"
                        @trigger-file-upload="triggerFileUpload" />
                </div>
            </template>

            <template #right>
                <div class="h-full w-full">
                    <TargetTextView v-model="translatedText" :is-translating="isTranslating"
                        :languageCode="targetLanguage" />
                </div>
            </template>
        </SplitContainer>
    </div>
</template>



<style>
/* Animation for transition effects */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Custom scrollbar for textareas */
textarea::-webkit-scrollbar {
    width: 8px;
}

textarea::-webkit-scrollbar-track {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
}

/* Dark mode scrollbar */
.dark textarea::-webkit-scrollbar-track {
    background-color: rgba(255, 255, 255, 0.05);
}

.dark textarea::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
}

.dark textarea::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
}
</style>