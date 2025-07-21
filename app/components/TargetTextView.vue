<script lang="ts" setup>

const props = defineProps<{
    isTranslating?: boolean;
}>();

const translatedText = defineModel<string>();


const showMarkdown = ref(false);
const copySuccess = ref(false);

/**
 * Icon for markdown toggle button
 */
const markdownIcon = computed(() => showMarkdown.value ? 'i-lucide-file-text' : 'i-lucide-file-code');

/**
 * Toggles between markdown and plain text view
 */
function toggleMarkdown(): void {
    showMarkdown.value = !showMarkdown.value;
}

/**
 * Copies translated text to clipboard
 * Uses clipboard API when available, falls back to document.execCommand
 */
function copyToClipboard(): void {
    // Don't attempt to copy if no text is available
    if (!translatedText.value) {
        return;
    }

    // Only run in client context
    if (import.meta.client) {
        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(translatedText.value)
                    .then(() => {
                        copySuccess.value = true;
                        setTimeout(() => {
                            copySuccess.value = false;
                        }, 2000);
                    })
                    .catch((err) => {
                        console.error('Failed to copy text: ', err);
                    });

                return;
            }
            return;
        } catch (err) {
            console.error('Copy failed:', err);
            return;
        }
    }
}
</script>

<template>
    <div class="relative flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div v-if="showMarkdown && translatedText"
            class="w-full h-full mb-6 min-h-[200px] p-4 overflow-auto prose dark:prose-invert max-w-none">
            <MDC :value="translatedText" />
        </div>
        <UTextarea v-else v-model="translatedText" class="w-full h-full"
            :ui="{ base: 'pb-12 transition-all duration-300 flex-1 bg-gray-50 dark:bg-gray-900 h-full' }"
            placeholder="Translation will appear here..." autoresize readonly />
        <div v-if="props.isTranslating" class="absolute inset-0 flex items-center justify-center">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-primary-500" />
        </div>
        <div class="absolute bottom-4 right-4 flex gap-2" data-test="copy-button-container">
            <UButton v-if="translatedText" :icon="markdownIcon" variant="soft" size="sm" class="mr-2"
                :color="showMarkdown ? 'primary' : 'neutral'" @click="toggleMarkdown"
                data-test="toggle-markdown-button">
                {{ showMarkdown ? 'View Plain Text' : 'View as Markdown' }}
            </UButton>
            <UButton v-if="translatedText" :icon="copySuccess ? 'i-lucide-check' : 'i-lucide-clipboard'" variant="soft"
                :color="copySuccess ? 'success' : 'neutral'" size="sm" data-test="copy-to-clipboard-button"
                @click="copyToClipboard">
                Copy to Clipboard
            </UButton>
        </div>
    </div>
</template>