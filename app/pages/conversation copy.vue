<script lang="ts" setup>
import type { ChatStatus } from "ai";
import type { LanguageCode } from "~/models/languages";
import { TranslationService } from "~/services/translationService";
import ChatView from "~/components/conversation/ChatView.vue";

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
    <div class="flex flex-col h-dvh">
        <div class="grow min-h-0 p-2">
            <ChatView ref="chatView" :status="status" />
        </div>

        <div class="shrink-0 flex flex-col items-center gap-3 p-4 pb-6">
            <div
                v-if="phase === 'recordingA'"
                class="flex flex-col items-center gap-3"
            >
                <p class="text-sm text-muted">{{ personALabel }}</p>
                <MicButton
                    :language="micLanguage"
                    @transcribed="onTranscribedA"
                />
                <p class="text-xs text-muted">
                    {{ t("conversation.tapToSpeak") }}
                </p>
            </div>

            <div
                v-else-if="phase === 'translatingA'"
                class="flex flex-col items-center gap-3"
            >
                <UIcon
                    name="i-lucide-loader-2"
                    class="w-8 h-8 animate-spin text-primary"
                />
                <p class="text-sm text-muted">
                    {{ t("conversation.translating") }}
                </p>
            </div>

            <div
                v-else-if="phase === 'switchPrompt'"
                class="flex flex-col items-center gap-4"
            >
                <p class="text-sm text-muted">
                    {{ t("conversation.selectLanguageB") }}
                </p>
                <LanguageSelectionView v-model="languageB" />
                <UButton
                    size="xl"
                    icon="i-lucide-arrow-left-right"
                    class="rounded-full w-16 h-16 flex items-center justify-center"
                    @click="switchToB"
                />
                <p class="text-xs text-muted">
                    {{
                        detectedLanguageA
                            ? t(`languages.${detectedLanguageA}`)
                            : ""
                    }}
                    → {{ t(`languages.${languageB}`) }}
                </p>
            </div>

            <div
                v-else-if="phase === 'recordingB'"
                class="flex flex-col items-center gap-3"
            >
                <p class="text-sm text-muted">{{ personBLabel }}</p>
                <MicButton
                    :language="languageB"
                    @transcribed="onTranscribedB"
                />
                <p class="text-xs text-muted">
                    {{ t("conversation.tapToSpeak") }}
                </p>
            </div>

            <div
                v-else-if="phase === 'translatingB'"
                class="flex flex-col items-center gap-3"
            >
                <UIcon
                    name="i-lucide-loader-2"
                    class="w-8 h-8 animate-spin text-primary"
                />
                <p class="text-sm text-muted">
                    {{ t("conversation.translating") }}
                </p>
            </div>

            <div
                v-else-if="phase === 'switchBack'"
                class="flex flex-col items-center gap-3"
            >
                <p class="text-sm text-muted">
                    {{ t("conversation.switchToA") }}
                </p>
                <UButton
                    size="xl"
                    icon="i-lucide-arrow-left-right"
                    class="rounded-full w-16 h-16 flex items-center justify-center"
                    @click="switchToA"
                />
                <p class="text-xs text-muted">
                    {{ t(`languages.${languageB}`) }} →
                    {{
                        detectedLanguageA
                            ? t(`languages.${detectedLanguageA}`)
                            : ""
                    }}
                </p>
            </div>
        </div>
    </div>
</template>
