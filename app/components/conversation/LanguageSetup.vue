<script lang="ts" setup>
import { AnimatePresence, motion } from "motion-v";
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
        <motion.div
            :initial="{ opacity: 0, y: -20 }"
            :animate="{ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }"
            class="text-center"
        >
            <h1 class="text-2xl font-bold mb-2">{{ title }}</h1>
            <p v-if="subtitle" class="text-lg opacity-70">{{ subtitle }}</p>
        </motion.div>

        <motion.div
            :initial="{ opacity: 0, y: 20 }"
            :animate="{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.15, ease: 'easeOut' } }"
            class="flex flex-col items-center gap-6 w-full max-w-sm"
        >
            <MobileLanguageSelect v-model="languageCode" :include-auto-detect="true" />

            <motion.div
                :initial="{ scale: 0 }"
                :animate="{ scale: 1, transition: { delay: 0.3, type: 'spring', stiffness: 200, damping: 15 } }"
            >
                <ClientOnly>
                    <MicButtonClient :language="language" @transcribed="(t: string) => emit('transcription', t)"
                        @detected-language="(c: string) => emit('detectedLanguage', c)" />
                </ClientOnly>
            </motion.div>
        </motion.div>

        <motion.div
            v-if="showOtherLanguage"
            :initial="{ opacity: 0, y: 20 }"
            :animate="{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.4, ease: 'easeOut' } }"
        >
            <p class="text-sm opacity-60 mb-2">{{ otherLanguageLabel }}</p>
            <MobileLanguageSelect v-model="otherLanguageCode" :include-auto-detect="false" />
        </motion.div>

        <AnimatePresence>
            <motion.div
                v-if="languageReady"
                key="continue-btn"
                :initial="{ opacity: 0, scale: 0.8 }"
                :animate="{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } }"
                :exit="{ opacity: 0, scale: 0.8 }"
            >
                <UButton size="xl" @click="emit('continue')">
                    {{ continueLabel }}
                </UButton>
            </motion.div>
        </AnimatePresence>
    </div>
</template>
