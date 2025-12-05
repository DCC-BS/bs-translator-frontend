<script lang="ts" setup>
const sourceLanguage = defineModel<string>("sourceLanguage");
const targetLanguage = defineModel<string>("targetLanguage");

const emit = defineEmits<(e: "swap-languages") => void>();

const { t } = useI18n();

function swapLanguages(): void {
    if (
        sourceLanguage.value === targetLanguage.value ||
        sourceLanguage.value === "auto"
    ) {
        return; // No need to swap if both languages are the same
    }

    swapRef(sourceLanguage, targetLanguage);
    emit("swap-languages");
}
</script>

<template>
    <!-- Language selection area -->
    <div class="flex items-start sm:items-center" data-tour="language-selector">
        <div class="flex-1 flex justify-end">
            <LanguageSelectionView v-model="sourceLanguage" include-auto-detect />
        </div>

        <UButton :active="sourceLanguage !== 'auto'" variant="soft" color="primary" icon="i-lucide-arrow-left-right"
            size="md" class="invisible w-0 sm:w-fit sm:visible rounded-lg p-2 transition-transform hover:scale-110"
            @click="swapLanguages">
        </UButton>

        <div class="flex-1">
            <LanguageSelectionView v-model="targetLanguage" />
        </div>
    </div>
</template>
