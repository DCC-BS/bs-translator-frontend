<script lang="ts" setup>
import { AnimatePresence, motion } from "motion-v";
import type { Language } from "~/models/languages";

const props = defineProps<{
    language: Language;
    showOtherLanguage?: boolean;
    otherLanguage?: Language;
}>();

const emit = defineEmits<{
    "update:language": [language: Language];
    "update:otherLanguage": [language: Language];
    continue: [];
}>();

const { t } = useI18n();

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
            :animate="{
                opacity: 1,
                y: 0,
                transition: { duration: 0.4, ease: 'easeOut' },
            }"
            class="text-center"
        >
            <h1 class="text-2xl font-bold mb-2">
                {{ t("conversation.selectYourLanguage") }}
            </h1>
            <p class="text-lg opacity-70">
                {{ t("conversation.orStartTalking") }}
            </p>
        </motion.div>

        <motion.div
            :initial="{ opacity: 0, y: 20 }"
            :animate="{
                opacity: 1,
                y: 0,
                transition: { duration: 0.4, delay: 0.15, ease: 'easeOut' },
            }"
            class="flex flex-col items-center gap-6 w-full max-w-sm"
        >
            <MobileLanguageSelect
                v-model="languageCode"
                :include-auto-detect="true"
            />

            <p class="text-sm opacity-60 mb-2">
                {{ t("conversation.otherPersonLanguage") }}
            </p>
            <motion.div
                v-if="showOtherLanguage"
                :initial="{ opacity: 0, y: 20 }"
                :animate="{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.4, delay: 0.4, ease: 'easeOut' },
                }"
            >
                <MobileLanguageSelect
                    v-model="otherLanguageCode"
                    :include-auto-detect="false"
                />
            </motion.div>
        </motion.div>

        <AnimatePresence>
            <motion.div
                v-if="languageReady"
                key="continue-btn"
                :initial="{ opacity: 0, scale: 0.8 }"
                :animate="{
                    opacity: 1,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 300, damping: 20 },
                }"
                :exit="{ opacity: 0, scale: 0.8 }"
            >
                <UButton size="xl" @click="emit('continue')">
                    {{ t("conversation.continue") }}
                </UButton>
            </motion.div>
        </AnimatePresence>
    </div>
</template>
