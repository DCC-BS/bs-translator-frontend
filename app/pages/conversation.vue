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

async function onTranscribedA(text: string) {
    chatView.value?.appendMessage({
        role: "leftUser",
        text: text,
        state: "done",
    });

    phase.value = "translatingA";
    isDetecting.value = true;

    const abortCtrl = new AbortController();

    const { updateText, updateState } = chatView.value!.appendMessage({
        role: "rightUser",
        text: "",
        state: "streaming",
    });

    try {
        const result = await translationService.detectLanguage(
            text,
            abortCtrl.signal,
        );
        if (!abortCtrl.signal.aborted && result.language) {
            detectedLanguageA.value = result.language as LanguageCode;
            languageA.value = result.language as LanguageCode;
        }
    } catch {
        // fallback: keep default languageA
    } finally {
        isDetecting.value = false;
    }

    sourceLanguage.value = detectedLanguageA.value ?? languageA.value;
    targetLanguage.value = languageB.value;

    let translated = "";
    try {
        translated = await translateText(text, (chunk) => {
            translated += chunk;
            updateText(translated);
        });
    } finally {
        updateState("done");
    }

    phase.value = "switchPrompt";
}

async function onTranscribedB(text: string) {
    chatView.value?.appendMessage({
        role: "rightUser",
        text: text,
        state: "done",
    });

    phase.value = "translatingB";

    sourceLanguage.value = languageB.value;
    targetLanguage.value = detectedLanguageA.value ?? languageA.value;

    const { updateText, updateState } = chatView.value!.appendMessage({
        role: "leftUser",
        text: "",
        state: "streaming",
    });

    let translated = "";
    try {
        translated = await translateText(text, (chunk) => {
            translated += chunk;
            updateText(translated);
        });
    } finally {
        updateState("done");
    }

    phase.value = "switchBack";
}

function switchToB() {
    phase.value = "recordingB";
}

function switchToA() {
    phase.value = "recordingA";
}

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
