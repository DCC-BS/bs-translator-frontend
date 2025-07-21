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

// Track character count for source text
const charCount = computed(() => sourceText.value?.length || 0);

// Track copy success state
const copySuccess = ref(false);

// For test purposes - allows testing the copyToClipboard function
const testCopyResult = ref<{ success: boolean; text: string | null }>({ success: false, text: null });

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

/**
 * Clears both source and translated text
 */
function clearText(): void {
    sourceText.value = '';
    translatedText.value = '';
}

/**
 * Copies translated text to clipboard
 * Uses clipboard API when available, falls back to document.execCommand
 */
function copyToClipboard(): void {
    // Don't attempt to copy if no text is available
    if (!translatedText.value) {
        testCopyResult.value = { success: false, text: null };
        return;
    }

    // Only run in client context
    if (import.meta.client) {
        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(translatedText.value)
                    .then(() => {
                        copySuccess.value = true;
                        testCopyResult.value = { success: true, text: translatedText.value };
                        setTimeout(() => {
                            copySuccess.value = false;
                        }, 2000);
                    })
                    .catch((err) => {
                        console.error('Failed to copy text: ', err);
                        testCopyResult.value = { success: false, text: null };
                    });

                return;
            }
            return;
        } catch (err) {
            console.error('Copy failed:', err);
            testCopyResult.value = { success: false, text: null };
            return;
        }
    }

    // Handle non-client context
    testCopyResult.value = { success: false, text: null };
}

watchDebounced(sourceText, () => {
    if (sourceText.value && targetLanguage.value) {
        handleTranslate();
    }
}, { debounce: 1000 })
</script>

<template>
    <UContainer class="p-4 max-w-6xl mx-auto">
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

        <!-- Text editor area -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Source text area -->
            <div class="flex flex-col h-full">
                <div class="flex justify-between">
                    <UBadge color="neutral" variant="soft">Source Text</UBadge>
                    <UBadge v-if="charCount > 0" color="primary" variant="soft">{{ charCount }} characters</UBadge>
                </div>
                <div class="relative flex-1">
                    <UTextarea v-model="sourceText" class="w-full h-full min-h-[200px]"
                        :ui="{ base: 'relative transition-all duration-300 flex-1' }"
                        placeholder="Enter text to translate..." :rows="8" autofocus />
                    <UButton v-if="sourceText" icon="i-lucide-x" variant="link" color="neutral" size="xs"
                        class="absolute top-3 right-1 opacity-50 hover:opacity-100" @click="clearText" />
                </div>
            </div>

            <!-- Translation result area -->
            <div class="flex flex-col h-full">
                <div class="flex justify-between">
                    <UBadge color="neutral" variant="soft">Translation</UBadge>
                    <UBadge v-if="translatedText" color="success" variant="soft">Completed</UBadge>
                </div>
                <div class="relative flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <UTextarea v-model="translatedText" class="w-full h-full min-h-[200px]"
                        :ui="{ base: 'relative transition-all duration-300 flex-1 bg-gray-50 dark:bg-gray-900' }"
                        placeholder="Translation will appear here..." :rows="8" readonly />
                    <div v-if="isTranslating"
                        class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-primary-500" />
                    </div>
                    <div class="absolute bottom-4 right-4 flex gap-2" data-test="copy-button-container">
                        <UButton v-if="translatedText" :icon="copySuccess ? 'i-lucide-check' : 'i-lucide-clipboard'"
                            variant="soft" :color="copySuccess ? 'success' : 'neutral'" size="sm"
                            data-test="copy-to-clipboard-button" @click="copyToClipboard">
                            Copy to Clipboard
                        </UButton>
                    </div>
                </div>
            </div>
        </div>
    </UContainer>
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