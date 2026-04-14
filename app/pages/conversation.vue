<script lang="ts" setup>
import ChatView from "~/components/conversation/ChatView.vue";
import type { ChatStatus } from "ai";
import type { LanguageCode } from "~/models/languages";
import { TranslationService } from "~/services/translationService";
import ToolBar from "~/components/conversation/ToolBar.vue";

definePageMeta({ layout: "conversation" });

const { sourceLanguage, targetLanguage, translateText } = useTranslate();
const translationService = useService(TranslationService);
const { t } = useI18n();

const chatView = shallowRef<InstanceType<typeof ChatView>>();

const languageA = ref<LanguageCode>("de");
const languageB = ref<LanguageCode>("en-gb");
const detectedLanguageA = ref<LanguageCode | undefined>(undefined);

const status = ref<ChatStatus>("ready");

type ConversationPhase =
    | "recordingA"
    | "translatingA"
    | "switchPrompt"
    | "recordingB"
    | "translatingB"
    | "switchBack";
const phase = ref<ConversationPhase>("recordingA");

const isDetecting = ref(false);

const personALabel = computed(() => {
    if (detectedLanguageA.value) {
        return t(`languages.${detectedLanguageA.value}`);
    }
    return t("conversation.personA");
});

const personBLabel = computed(() => {
    return t(`languages.${languageB.value}`);
});

const micLanguage = computed(() => {
    if (phase.value === "recordingB" || phase.value === "translatingB") {
        return languageB.value;
    }
    return "auto";
});
</script>

<template>
    <div class="grid grid-rows-[1fr_auto] h-dvh">
        <div></div>

        <div class="mx-auto">
            <ToolBar />
        </div>
    </div>
</template>
