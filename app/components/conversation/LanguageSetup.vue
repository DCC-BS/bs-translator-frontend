<script lang="ts" setup>
import type { Language } from "~/models/languages";
import MicButtonClient from "./MicButton.client.vue";

const props = defineProps<{
    language: Language;
    title: string;
    subtitle?: string;
    showOtherLanguage?: boolean;
    otherLanguage?: Language;
    otherLanguageLabel?: string;
    continueLabel?: string;
}>();

const emit = defineEmits<{
    "update:language": [language: Language];
    "update:otherLanguage": [language: Language];
    continue: [];
    transcription: [text: string];
    detectedLanguage: [code: string];
}>();

const languageCode = computed({
    get: () => props.language.code,
    set: (code: string) => emit("update:language", getLanguage(code)),
});

const otherLanguageCode = computed({
    get: () => props.otherLanguage?.code ?? "auto",
    set: (code: string) => emit("update:otherLanguage", getLanguage(code)),
});

const languageReady = computed(() => props.language.code !== "auto");
</script>

<template>
    <div class="flex flex-col items-center justify-center h-full p-6 gap-8">
        <div class="text-center">
            <h1 class="text-2xl font-bold mb-2">{{ title }}</h1>
            <p v-if="subtitle" class="text-lg opacity-70">{{ subtitle }}</p>
        </div>

        <div class="flex flex-col items-center gap-6 w-full max-w-sm">
            <LanguageSelectionView v-model="languageCode" :include-auto-detect="true" />

            <ClientOnly>
                <MicButtonClient :language="language" @transcribed="(t: string) => emit('transcription', t)"
                    @detected-language="(c: string) => emit('detectedLanguage', c)" />
            </ClientOnly>
        </div>

        <div v-if="showOtherLanguage">
            <p class="text-sm opacity-60 mb-2">{{ otherLanguageLabel }}</p>
            <LanguageSelectionView v-model="otherLanguageCode" :include-auto-detect="false" />
        </div>

        <UButton v-if="languageReady" size="xl" @click="emit('continue')">
            {{ continueLabel }}
        </UButton>
    </div>
</template>
