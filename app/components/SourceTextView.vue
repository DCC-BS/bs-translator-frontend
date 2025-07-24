<script lang="ts" setup>
const props = defineProps<{
    isOverDropZone?: boolean;
    isConverting?: boolean;
    error?: string;
    fileName?: string;
}>();

const emit = defineEmits<{
    "clear-error": [];
}>();

const toast = useToast();
const { t } = useI18n();
const sourceText = defineModel<string>();

/**
 * Clears the text input field
 */
function clearText(): void {
    sourceText.value = "";
}

/**
 * Watch for error changes to show error toast
 */
watch(
    () => props.error,
    (newError) => {
        if (newError) {
            toast.add({
                title: t("ui.error"),
                description: `${newError}. ${t("ui.errorDescription")}`,
                color: "error",
                icon: "i-lucide-alert-circle",
                duration: 5000,
                actions: [
                    {
                        label: t("ui.dismiss"),
                        onClick: () => emit("clear-error"),
                    },
                ],
            });
        }
    },
);

/**
 * Watch for fileName changes to show success toast
 */
watch(
    () => props.fileName,
    (newFileName, oldFileName) => {
        if (
            newFileName &&
            !props.error &&
            !props.isConverting &&
            newFileName !== oldFileName
        ) {
            toast.add({
                title: t("ui.fileConvertedSuccess"),
                description: newFileName,
                color: "success",
                icon: "i-lucide-check-circle",
                duration: 3000,
            });
        }
    },
);
</script>

<template>
    <div class="relative flex-1 overflow-auto max-h-[500px]" ref="dropZoneRef">
        <!-- Drop zone overlay -->
        <div v-if="props.isOverDropZone" class="absolute inset-0 bg-gray-100/80 dark:bg-gray-800/80 border-2 border-dashed border-primary-500 rounded-lg 
                flex flex-col items-center justify-center z-10 transition-all duration-200 backdrop-blur-sm">
            <div class="text-5xl text-primary-500 mb-2">
                <div class="i-lucide-file-down animate-bounce"></div>
            </div>
            <span class="text-lg font-medium text-primary-600 dark:text-primary-400">
                {{ t('ui.dropFileToConvert') }}
            </span>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('ui.supportedFormats') }}</span>
        </div>

        <!-- Loading overlay -->
        <div v-if="isConverting"
            class="absolute inset-0 bg-gray-50/90 dark:bg-gray-900/90 rounded-lg flex flex-col items-center justify-center z-10">
            <!-- Loading spinner -->
            <div class="text-4xl text-primary-500 mb-4">
                <UIcon name="i-lucide-loader-circle" class="animate-spin-slow" />
            </div>
            <span class="text-gray-600 dark:text-gray-300">{{ t('ui.convertingFile') }}</span>
        </div>

        <UTextarea v-model="sourceText" class="w-full h-full min-h-[200px]"
            :ui="{ base: 'relative transition-all duration-300 flex-1 h-full' }"
            :placeholder="t('ui.enterTextPlaceholder')" autoresize autofocus />

        <UButton v-if="sourceText" icon="i-lucide-x" variant="link" color="neutral" size="xs"
            class="absolute top-1 right-1 opacity-50 hover:opacity-100" @click="clearText" />
    </div>
</template>

<style scoped>
/* Slower spinning animation for loading spinner */
.animate-spin-slow {
    animation: spin 2s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>