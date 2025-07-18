<script lang="ts" setup>
import type { Domain } from '~/models/domain';
import type { Tone } from '~/models/tone';


const sourceText = ref("");
const translatedText = ref("");

const sourceLanguage = ref("en");
const targetLanguage = ref("de");

const selectedTone = ref<Tone>("default"); // Default tone
const selectedDomain = ref<Domain>("None"); // Default domain

</script>

<template>

  <ToneSelectionView v-model:selectedTone="selectedTone" />
  <DomainSelectionView v-model:selectedDomain="selectedDomain" />

  <div class="flex flex-row gap-4 p-4">
    <div>
      <LanguageSelectionView v-model:selectedLanguage="sourceLanguage" />
      <UTextarea v-model="sourceText" class="w-full h-full" placeholder="Enter text to translate..." />
    </div>
    <div>
      <LanguageSelectionView v-model:selectedLanguage="targetLanguage" />
      <UTextarea v-model="translatedText" class="w-full h-full" placeholder="Translation will appear here..." />
    </div>
  </div>
  <div>

  </div>
</template>



<style></style>