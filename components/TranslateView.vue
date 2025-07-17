<script lang="ts" setup>

const sourceText = ref("");
const translatedText = ref("");

const sourceLanguage = ref("en");
const targetLanguage = ref("de");

</script>

<template>
  <split-view :is-horizontal="true">
    <template #a>
      <UTextarea v-model="sourceText" class="w-full h-full" placeholder="Enter text to translate..." />
    </template>
    <template #b>
      <UTextarea v-model="translatedText" class="w-full h-full" placeholder="Translation will appear here..." />
    </template>
  </split-view>



  <div>

  </div>
</template>



<style></style>