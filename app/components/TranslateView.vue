<script lang="ts" setup>

const { tone, domain, sourceLanguage, targetLanguage, sourceText, translatedText, translate } = useTranslate();



</script>

<template>
    <ToneSelectionView v-model:selectedTone="tone" />
    <DomainSelectionView v-model:selectedDomain="domain" />

    <div class="flex flex-row gap-4 p-4 w-full justify-stretch items-stretch">
        <div class="flex-1">
            <LanguageSelectionView v-model="sourceLanguage" />
            <UTextarea :rows="5" v-model="sourceText" class="w-full h-full" placeholder="Enter text to translate..." />
        </div>
        <div class="flex-1">
            <LanguageSelectionView v-model="targetLanguage" />
            <UTextarea :rows="5" v-model="translatedText" class="w-full h-full"
                placeholder="Translation will appear here..." />
        </div>
    </div>
    <div>

        <UButton @click="translate" class="w-full" :disabled="!sourceText || !targetLanguage">
            Translate
        </UButton>

    </div>
</template>



<style></style>