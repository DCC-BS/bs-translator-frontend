<script lang="ts" setup>

const { tone, domain, glossary, sourceLanguage, targetLanguage, sourceText, translatedText, translate } = useTranslate();

function swap<T>(a: Ref<T>, b: Ref<T>) {
    const temp = a.value;
    a.value = b.value;
    b.value = temp;
}

function swapLanguages() {
    if (sourceLanguage.value === targetLanguage.value || sourceLanguage.value === 'auto') {
        return; // No need to swap if both languages are the same
    }

    swap(sourceLanguage, targetLanguage);
    swap(sourceText, translatedText);
}

</script>

<template>
    <UContainer>
        <div class="flex gap-2 flex-wrap justify-center">
            <UFormField label="Tonalität" description="Wählen Sie den gewünschten Schreibstil für die Übersetzung.">
                <ToneSelectionView v-model="tone" class="w-full" />
            </UFormField>

            <UFormField label="Domäne" description="Wählen Sie das passende Fachgebiet für Ihre Übersetzung.">
                <DomainSelectionView v-model="domain" class="w-full" />
            </UFormField>

            <UFormField label="Glossar" description="Geben Sie ein benutzerdefiniertes Glossar an">
                <UInput v-model="glossary" placeholder="Begriff1: Beschreibung1;Begriff2: Beschreibung2"
                    class="w-full" />
            </UFormField>
        </div>

        <div class="flex gap-1 px-2">
            <div class="flex-1 m-auto">
                <LanguageSelectionView v-model="sourceLanguage" include-auto-detect />
            </div>
            <div>
                <UButton :active="sourceLanguage !== 'auto'" variant="ghost" icon="i-lucide-arrow-left-right"
                    @click="swapLanguages">
                </UButton>
            </div>
            <div class="flex-1 m-auto">
                <LanguageSelectionView v-model="targetLanguage" />
            </div>
        </div>

        <div class="flex flex-row gap-2 p-2 w-full justify-stretch items-stretch">
            <div class="flex-1">
                <UTextarea :rows="5" v-model="sourceText" class="w-full h-full"
                    placeholder="Enter text to translate..." />
            </div>
            <div class="flex-1">
                <UTextarea :rows="5" v-model="translatedText" class="w-full h-full"
                    placeholder="Translation will appear here..." />
            </div>
        </div>
        <div class="p-2">
            <UButton @click="translate" class="w-full" :disabled="!sourceText || !targetLanguage">
                Translate
            </UButton>
        </div>
    </UContainer>
</template>



<style></style>