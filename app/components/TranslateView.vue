<script lang="ts" setup>
import {
    breakpointsTailwind,
    useBreakpoints,
    watchDebounced,
} from "@vueuse/core";
import { motion } from "motion-v";
import { UCard } from "#components";

const MotionUCard = motion.create(UCard);

// Get i18n translation function
const { t } = useI18n();

const { query, path } = useRoute();
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
    isTranslating,
    translate,
    abort,
} = useTranslate();

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

const charCount = computed(() => sourceText.value?.length || 0);
const fileInputRef = ref<HTMLInputElement | null>(null);
const breakpoints = useBreakpoints(breakpointsTailwind);
const settingsExpanded = ref(true);

onMounted(() => {
    settingsExpanded.value = breakpoints.greater("md").value;

    if (query.source) {
        sourceLanguage.value = query.source as string;
    }

    if (query.destination) {
        targetLanguage.value = query.destination as string;
    }

    if (query.text) {
        const guid = localStorage.getItem("sourceTextGuid");
        const txt = localStorage.getItem("sourceText");
        if (txt && guid?.trim() === (query.text as string).trim()) {
            sourceText.value = txt;
        }
    }
});

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

            const guid = crypto.randomUUID();
            localStorage.setItem("sourceText", sourceText.value);
            localStorage.setItem("sourceTextGuid", guid);

            router.replace({
                path: path,
                query: {
                    text: guid,
                    source: sourceLanguage.value,
                    destination: targetLanguage.value,
                },
            });
        }
    },
    { debounce: 1000 },
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
                        <UButton size="xs" color="neutral" @click="triggerFileUpload" :loading="isConverting"
                            :disabled="isConverting" icon="i-lucide-file-up" variant="ghost">
                            <span class="hidden md:inline">
                                {{ isConverting ? t('ui.uploading') : t('ui.uploadFile') }}
                            </span>
                        </UButton>
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
                            v-model:target-language="targetLanguage" @swap-languages="swapLanguages" />
                    </div>

                    <OptionsToolBar v-model:tone="tone" v-model:domain="domain" v-model:glossary="glossary" />
                </div>
                <div class="flex justify-center xl:hidden">
                    <LanguageSelectionBar v-model:source-language="sourceLanguage"
                        v-model:target-language="targetLanguage" @swap-languages="swapLanguages" />
                </div>
            </template>

            <template #left>
                <div class="h-full w-full relative">
                    <SourceTextView v-model="sourceText" :is-over-drop-zone="isOverDropZone"
                        :is-converting="isConverting" :error="conversionError" :fileName="fileName"
                        :language-code="sourceLanguage" ref="dropZoneRef" @clear-error="clearError" />
                    <div class="text-gray-300 absolute bottom-0 right-4">
                        <div v-if="charCount > 0">{{ charCount }} {{
                            t('ui.characters') }}
                        </div>
                    </div>
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