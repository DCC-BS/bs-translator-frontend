<script lang="ts" setup>
import type { LanguageCode } from "~/models/languages";

const props = defineProps<{
    isTranslating?: boolean;
    languageCode: LanguageCode;
}>();

const translatedText = defineModel<string>();
const { t } = useI18n();
const toast = useToast();
const { direction } = useLanguageDirection(toRef(props, "languageCode"));

const showMarkdown = ref(true);
const copySuccess = ref(false);

/**
 * Icon for markdown toggle button
 */
const markdownIcon = computed(() =>
    showMarkdown.value ? "i-lucide-file-text" : "i-lucide-file-code",
);

/**
 * Toggles between markdown and plain text view
 */
function toggleMarkdown(): void {
    showMarkdown.value = !showMarkdown.value;
}

/**
 * Copies translated text to clipboard
 * When in markdown view, copies as rich text for better formatting in Word documents
 * Falls back to plain text when rich text is not supported
 */
async function copyToClipboard(): Promise<void> {
    // Don't attempt to copy if no text is available
    if (!translatedText.value) {
        return;
    }

    // Only run in client context
    if (import.meta.client) {
        try {
            if (
                navigator.clipboard &&
                typeof navigator.clipboard.write === "function" &&
                showMarkdown.value
            ) {
                // Convert markdown to HTML for rich text copying
                const html = await markdownToHtml(translatedText.value);

                console.log(html);

                const clipboardItem = new ClipboardItem({
                    "text/html": new Blob([html], { type: "text/html" }),
                    "text/plain": new Blob([translatedText.value], {
                        type: "text/plain",
                    }),
                });

                await navigator.clipboard.write([clipboardItem]);

                copySuccess.value = true;
                setTimeout(() => {
                    copySuccess.value = false;
                }, 2000);

                // Show success toast
                toast.add({
                    title: t("ui.copySuccess"),
                    color: "success",
                    icon: "i-lucide-check-circle",
                    duration: 2000,
                });

                return;
            }

            if (
                navigator.clipboard &&
                typeof navigator.clipboard.writeText === "function"
            ) {
                // Fallback to plain text copying
                await navigator.clipboard.writeText(translatedText.value);

                copySuccess.value = true;
                setTimeout(() => {
                    copySuccess.value = false;
                }, 2000);

                // Show success toast
                toast.add({
                    title: t("ui.copySuccess"),
                    color: "success",
                    icon: "i-lucide-check-circle",
                    duration: 2000,
                });

                return;
            }
            return;
        } catch (err) {
            console.error("Copy failed:", err);
            // Show error toast
            toast.add({
                title: t("ui.copyFailed"),
                color: "error",
                icon: "i-lucide-alert-circle",
                duration: 3000,
            });
            return;
        }
    }
}

async function downloadWord(): Promise<void> {
    if (!translatedText.value) {
        return;
    }

    // Only run in client context
    if (import.meta.client) {
        try {
            const markdown = translatedText.value;
            const filename = `translated-${new Date().toISOString().slice(0, 10)}.docx`;

            // Convert markdown to DOCX and download
            const blob = await markdownToDocx(markdown);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            // Show success toast
            toast.add({
                title: t("ui.downloadSuccess"),
                description: filename,
                color: "success",
                icon: "i-lucide-check-circle",
                duration: 3000,
            });
        } catch (err) {
            console.error("Download failed:", err);
            // Show error toast
            toast.add({
                title: t("ui.downloadFailed"),
                color: "error",
                icon: "i-lucide-alert-circle",
                duration: 3000,
            });
        }
    }
}
</script>

<template>
    <div class="relative flex-1 bg-gray-50 p-[5px] dark:bg-gray-900 rounded-md max-h-[300px]"
        :class="{ 'translating-border': props.isTranslating }">
        <div v-if="showMarkdown && translatedText" :dir="direction"
            class="w-full h-full pb-12 overflow-auto prose dark:prose-invert max-w-none">
            <MDC :value="translatedText" />
        </div>
        <UTextarea v-else v-model="translatedText" class="w-full h-full" variant="none"
            :ui="{ base: 'pb-12 transition-all duration-300 flex-1 bg-gray-50 dark:bg-gray-900 h-full' }"
            :placeholder="t('ui.translationPlaceholder')" :dir="direction" autoresize readonly />
        <div class="absolute bottom-4 right-4 flex gap-2" data-test="copy-button-container">
            <UButton v-if="translatedText" :icon="markdownIcon" variant="soft" size="sm" class="mr-2"
                :color="showMarkdown ? 'primary' : 'neutral'" @click="toggleMarkdown"
                data-test="toggle-markdown-button">
                {{ showMarkdown ? t('ui.viewPlainText') : t('ui.viewAsMarkdown') }}
            </UButton>
            <UButton v-if="translatedText" :icon="copySuccess ? 'i-lucide-check' : 'i-lucide-clipboard'" variant="soft"
                :color="copySuccess ? 'success' : 'neutral'" size="sm" data-test="copy-to-clipboard-button"
                @click="copyToClipboard">
                {{ copySuccess ? t('ui.copied') : (showMarkdown ? t('ui.copyAsRichText') : t('ui.copyToClipboard')) }}
            </UButton>
            <UButton v-if="translatedText" icon="i-lucide-download" variant="soft" size="sm" color="primary"
                @click="downloadWord" data-test="download-translated-text-button">
                {{ t('ui.downloadTranslatedText') }}
            </UButton>
        </div>
    </div>
</template>

<style scoped>
/**
 * Smooth rainbow animated border for translation state
 * Adapted from rainbow border technique with theme-appropriate colors
 */
.translating-border {
    position: relative;
    z-index: 0;
    overflow: hidden;
}

.translating-border::before {
    content: '';
    position: absolute;
    z-index: -2;
    left: -450%;
    top: -450%;
    width: 1000%;
    height: 1000%;
    background-repeat: no-repeat;
    background-image: repeating-conic-gradient(#3b82f6 10%, #6bbda2 20%, #8b5cf6 30%);
    animation: rotate-border 4s linear infinite;
}

.translating-border::after {
    content: '';
    position: absolute;
    z-index: -1;
    left: 3px;
    top: 3px;
    width: calc(100% - 6px);
    height: calc(100% - 6px);
    background: white;
    border-radius: calc(0.5rem - 3px);
}

.dark .translating-border::after {
    background: rgb(17 24 39);
}

/**
 * Rainbow rotation animation
 */
@keyframes rotate-border {
    100% {
        transform: rotate(1turn);
    }
}
</style>