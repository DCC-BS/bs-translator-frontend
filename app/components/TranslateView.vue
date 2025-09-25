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
    <div class="h-full w-full p-4">
        <!-- Translation settings panel -->
        <!-- <MotionUCard layout class="mb-6 shadow-sm transition-all duration-300 ease-in-out overflow-hidden" :class="[
            settingsExpanded
                ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800'
        ]">
            <div class=" flex justify-between items-center">
                <h3 class="text-lg font-medium">{{ t('ui.translationSettings') }}</h3>
                <UButton :icon="settingsExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" variant="ghost"
                    size="sm" class="transition-transform duration-200"
                    @click="() => { settingsExpanded = !settingsExpanded }">
                    {{ settingsExpanded ? t('ui.hideSettings') : t('ui.showSettings') }}
                </UButton>
            </div>

            <motion.div :animate="{
                height: settingsExpanded ? 'auto' : 0,
                opacity: settingsExpanded ? 1 : 0,
                marginTop: settingsExpanded ? 16 : 0
            }" :transition="{
                duration: 0.4,
                ease: 'easeInOut',
                height: { duration: 0.4 },
                opacity: { duration: 0.3, delay: settingsExpanded ? 0.1 : 0 },
                marginTop: { duration: 0.4 }
            }" style="overflow: hidden;">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <UFormField :label="t('ui.tone')" :help="t('ui.toneHelp')">
                        <ToneSelectionView v-model="tone" class="w-full" />
                    </UFormField>

                    <UFormField :label="t('ui.domain')" :help="t('ui.domainHelp')">
                        <DomainSelectionView v-model="domain" class="w-full" />
                    </UFormField>

                    <UFormField :label="t('ui.glossary')" :help="t('ui.glossaryHelp')">
                        <UInput v-model="glossary" :placeholder="t('ui.glossaryPlaceholder')" class="w-full" />
                    </UFormField>
                </div>
            </motion.div>
        </MotionUCard> -->

        <SplitContainer class="h-full">
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

                        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-camera"
                            @click="onCapturePhoto">
                            <span class="hidden md:inline">
                                {{ t('ui.takePhoto') }}
                            </span>
                        </UButton>
                    </div>

                    <!-- Language selection area -->
                    <LanguageSelectionBar v-model:source-language="sourceLanguage"
                        v-model:target-language="targetLanguage" @swap-languages="swapLanguages" />

                    <div class="flex flex-1 justify-end mb-2">
                        <UPopover :ui="{ content: 'bg-none ring-0 shadow-none' }">
                            <UButton variant="link" color="neutral" trailing-icon="i-lucide-chevron-down">{{
                                t('ui.tone') }}</UButton>
                            <template #content>
                                <ToneSelectionView v-model="tone" />
                            </template>
                        </UPopover>
                        <UPopover :ui="{ content: 'bg-none ring-0 shadow-none' }">
                            <UButton variant="link" color="neutral" trailing-icon="i-lucide-chevron-down">{{
                                t('ui.domain') }}</UButton>

                            <template #content>
                                <DomainSelectionView v-model="domain" />
                            </template>
                        </UPopover>
                        <UPopover>
                            <UButton variant="link" color="neutral" leading-icon="i-lucide-book-text"
                                trailing-icon="i-lucide-chevron-down">{{
                                    t('ui.glossary') }}</UButton>
                            <template #content>
                                <GlossarySelectionView v-model="glossary" class="max-w-md" />
                            </template>
                        </UPopover>
                    </div>
                </div>
            </template>

            <template #left>
                <div class="h-full w-full relative">
                    <SourceTextView v-model="sourceText" :is-over-drop-zone="isOverDropZone"
                        :is-converting="isConverting" :error="conversionError" :fileName="fileName"
                        :language-code="sourceLanguage" class="h-full" ref="dropZoneRef" @clear-error="clearError" />

                    <div class="absolute bottom-0 right-0">
                        <div v-if="charCount > 0">{{ charCount }} {{
                            t('ui.characters') }}
                        </div>
                    </div>
                </div>
            </template>

            <template #right>
                <div class="h-full w-full relative">
                    <TargetTextView v-model="translatedText" :is-translating="isTranslating"
                        :languageCode="targetLanguage" class="h-full" />

                    <div class="absolute bottom-0 right-0">
                        <UBadge v-if="translatedText && !isTranslating" color="success" variant="soft">{{
                            t('ui.completed')
                            }}
                        </UBadge>
                        <UBadge v-else-if="translatedText" color="info" variant="soft">{{ t('ui.inProgress') }}</UBadge>
                    </div>
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