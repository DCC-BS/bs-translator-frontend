<script lang="ts" setup>
import { watchDebounced } from '@vueuse/core';

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
    abort
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
    clearError
} = useFileConvert((text) => {
    sourceText.value = text;
});

const charCount = computed(() => sourceText.value?.length || 0);
const fileInputRef = ref<HTMLInputElement | null>(null);

/**
 * Swaps values between two refs
 * @param a First ref value
 * @param b Second ref value
 */
function swap<T>(a: Ref<T>, b: Ref<T>): void {
    const temp = a.value;
    a.value = b.value;
    b.value = temp;
}

/**
 * Swaps languages and text content between source and target
 */
function swapLanguages(): void {
    if (sourceLanguage.value === targetLanguage.value || sourceLanguage.value === 'auto') {
        return; // No need to swap if both languages are the same
    }

    swap(sourceLanguage, targetLanguage);
    swap(sourceText, translatedText);
}

/**
 * Handles the translation process with loading state
 */
async function handleTranslate(): Promise<void> {
    if (!sourceText.value || !targetLanguage.value) return;

    abort(); // Cancel any ongoing translation

    await translate();
}

watchDebounced(sourceText, () => {
    if (sourceText.value && targetLanguage.value) {
        handleTranslate();
    }
}, { debounce: 1000 })

/**
 * Triggers the file input click event
 */
function triggerFileUpload(): void {
    if (fileInputRef.value) {
        fileInputRef.value.click();
    }
}

/**
 * Handles file selection and emits the event
 * @param event File input change event
 */
function onFileSelect(event: Event): void {
    handleFileSelect(event);
    // Reset the input so the same file can be selected again
    if (fileInputRef.value) {
        fileInputRef.value.value = '';
    }
}
</script>

<template>
    <div class="p-4 mx-auto">
        <!-- Translation settings panel -->
        <UCard class="mb-6 bg-gray-50 dark:bg-gray-900 shadow-sm">
            <template #header>
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-medium">Translation Settings</h3>
                </div>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <UFormField label="Tonalität" help="Wählen Sie den gewünschten Schreibstil für die Übersetzung.">
                    <ToneSelectionView v-model="tone" class="w-full" />
                </UFormField>

                <UFormField label="Domäne" help="Wählen Sie das passende Fachgebiet für Ihre Übersetzung.">
                    <DomainSelectionView v-model="domain" class="w-full" />
                </UFormField>

                <UFormField label="Glossar" help="Geben Sie ein benutzerdefiniertes Glossar an">
                    <UInput v-model="glossary" placeholder="Begriff1: Beschreibung1;Begriff2: Beschreibung2"
                        class="w-full" />
                </UFormField>
            </div>
        </UCard>

        <!-- Language selection area -->
        <div class="flex items-center gap-4 mb-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div class="flex-1">
                <UFormGroup label="Source Language" class="mb-0">
                    <LanguageSelectionView v-model="sourceLanguage" include-auto-detect />
                </UFormGroup>
            </div>

            <div class="flex flex-col items-center">
                <UButton :active="sourceLanguage !== 'auto'" variant="soft" color="primary"
                    icon="i-lucide-arrow-left-right" size="lg"
                    class="rounded-full p-2 transition-transform hover:scale-110" @click="swapLanguages">
                </UButton>
            </div>

            <div class="flex-1">
                <UFormGroup label="Target Language" class="mb-0">
                    <LanguageSelectionView v-model="targetLanguage" />
                </UFormGroup>
            </div>
        </div>

        <div class="flex justify-between gap-2">
            <div class="flex flex-1 justify-between mb-2">
                <div class="flex items-center gap-2">
                    <UBadge color="neutral" variant="soft">Source Text</UBadge>
                    <UButton size="xs" color="primary" @click="triggerFileUpload" :loading="isConverting"
                        :disabled="isConverting" icon="i-lucide-file-up" variant="soft">
                        {{ isConverting ? 'Uploading...' : 'Upload File' }}
                    </UButton>
                    <input type="file" ref="fileInputRef" class="hidden" @change="onFileSelect"
                        accept=".txt,.doc,.docx,.pdf,.md,.html,.rtf" />
                </div>

                <UBadge v-if="charCount > 0" color="primary" variant="soft">{{ charCount }} characters</UBadge>
            </div>
            <div class="flex justify-between mb-2 flex-1">
                <UBadge color="neutral" variant="soft">Translation</UBadge>
                <UBadge v-if="translatedText && !isTranslating" color="success" variant="soft">Completed</UBadge>
                <UBadge v-else-if="translatedText" color="info" variant="soft">In Progress</UBadge>
            </div>
        </div>

        <!-- Text editor area -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[300px]">
            <SourceTextView v-model="sourceText" :is-over-drop-zone="isOverDropZone" :is-converting="isConverting"
                :error="conversionError" :fileName="fileName" class="h-full" ref="dropZoneRef"
                @clear-error="clearError" />
            <TargetTextView v-model="translatedText" :is-translating="isTranslating" class="h-full" />
        </div>
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