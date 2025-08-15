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
    <div class="flex items-start sm:items-center sm:gap-4 bg-white rounded-lg p-4 shadow-sm">
        <div class="flex-1 flex justify-end">
            <UFormField :label="t('ui.sourceLanguage')" class="mb-0">
                <LanguageSelectionView v-model="sourceLanguage" include-auto-detect />
            </UFormField>
        </div>

        <UButton :active="sourceLanguage !== 'auto'" variant="soft" color="primary" icon="i-lucide-arrow-left-right"
            size="md" class="invisible w-0 sm:w-fit sm:visible rounded-full p-2 transition-transform hover:scale-110"
            @click="swapLanguages">
        </UButton>

        <div class="flex-1">
            <UFormField :label="t('ui.targetLanguage')" class="mb-0">
                <LanguageSelectionView v-model="targetLanguage" />
            </UFormField>
        </div>
    </div>
</template>