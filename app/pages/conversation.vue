<script lang="ts" setup>
import type { Language } from "~/models/languages";
import ToolBar from "~/components/conversation/ToolBar.vue";
import {
    type Conversation,
    type ConversationMessage,
    createEmptyConversation,
    type UserConversation,
} from "~/models/conversation";
import ChatView from "~/components/conversation/ChatView.vue";
import LanguageSetup from "~/components/conversation/LanguageSetup.vue";
import { TranslationService } from "~/services/translationService";

definePageMeta({ layout: "conversation" });

const { t } = useI18n();

type Phase = "setup-a" | "transition" | "conversation";

const translationService = useService(TranslationService);
const logger = useLogger();

const phase = ref<Phase>("setup-a");
const isUserA = ref(true);

const userALanguage = ref<Language>(getLanguage("auto"));
const userBLanguage = ref<Language>(getLanguage("auto"));

const conversation = ref<Conversation>(createEmptyConversation());

const pendingText = ref<string | null>(null);

const queuedTranslations = ref({
    a: [] as { text: string; message: ConversationMessage }[],
    b: [] as { text: string; message: ConversationMessage }[],
});

const currentLanguage = computed(() =>
    isUserA.value ? userALanguage.value : userBLanguage.value,
);
const otherLanguage = computed(() =>
    isUserA.value ? userBLanguage.value : userALanguage.value,
);

const currentUserMessages = computed<UserConversation>(() =>
    isUserA.value ? conversation.value.userA : conversation.value.userB,
);
const otherUserMessages = computed<UserConversation>(() =>
    isUserA.value ? conversation.value.userB : conversation.value.userA,
);

const chatBg = computed(() =>
    isUserA.value ? "bg-primary-300" : "bg-secondary-300",
);

const currentLanguageCode = computed({
    get: () => currentLanguage.value.code,
    set: (code: string) => {
        if (isUserA.value) {
            userALanguage.value = getLanguage(code);
        } else {
            userBLanguage.value = getLanguage(code);
        }
    },
});

const transitionPersonName = computed(() =>
    isUserA.value ? t("conversation.personA") : t("conversation.personB"),
);

watch(
    [userALanguage, userBLanguage],
    async () => {
        if (
            userALanguage.value.code !== "auto" &&
            userBLanguage.value.code !== "auto"
        ) {
            if (queuedTranslations.value.b.length > 0) {
                await processQueue(
                    queuedTranslations.value.b,
                    userALanguage.value,
                    userBLanguage.value,
                );
                queuedTranslations.value.b = [];
            }
            if (queuedTranslations.value.a.length > 0) {
                await processQueue(
                    queuedTranslations.value.a,
                    userBLanguage.value,
                    userALanguage.value,
                );
                queuedTranslations.value.a = [];
            }
        }
    },
    { deep: true },
);

function onSetupADetectedLanguage(code: string) {
    userALanguage.value = getLanguage(code);
}

const transitionTimer = ref<ReturnType<typeof setTimeout>>();

function startTransition() {
    phase.value = "transition";
    transitionTimer.value = setTimeout(() => {
        phase.value = "conversation";
    }, 2000);
}

function onSetupAContinue() {
    phase.value = "conversation";
}

function onSetupATranscription(text: string) {
    addMessage(text);
    phase.value = "conversation";
}

function onDetectedLanguage(code: string) {
    if (isUserA.value) {
        userALanguage.value = getLanguage(code);
    } else {
        userBLanguage.value = getLanguage(code);
    }
}

function onSwitch() {
    isUserA.value = !isUserA.value;
    startTransition();
}

function onConversationTranscription(text: string) {
    pendingText.value = text;
}

function onConfirmMessage() {
    if (!pendingText.value) return;
    const text = pendingText.value;
    pendingText.value = null;
    addMessage(text);
    isUserA.value = !isUserA.value;
    startTransition();
}

function onAddNewMessage() {
    if (!pendingText.value) return;
    const text = pendingText.value;
    pendingText.value = null;
    addMessage(text);
}

function onRetryMessage() {
    pendingText.value = null;
}

onUnmounted(() => {
    if (transitionTimer.value) clearTimeout(transitionTimer.value);
});

function onUndo() {
    const msgs = currentUserMessages.value.messages;
    const otherMsgs = otherUserMessages.value.messages;

    for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i]?.role === "original") {
            msgs.splice(i, 1);
            break;
        }
    }
    for (let i = otherMsgs.length - 1; i >= 0; i--) {
        if (otherMsgs[i]?.role === "translated") {
            otherMsgs.splice(i, 1);
            break;
        }
    }
}

async function addMessage(text: string) {
    if (currentLanguage.value.code === "auto") {
        const result = await translationService.detectLanguage(text);
        if (isUserA.value) {
            userALanguage.value = getLanguage(result.language);
        } else {
            userBLanguage.value = getLanguage(result.language);
        }
    }

    currentUserMessages.value.messages.push({
        id: createUUID(),
        content: text,
        role: "original",
    });

    if (otherLanguage.value.code === "auto") {
        const msg: ConversationMessage = {
            id: createUUID(),
            content: "",
            role: "translated",
        };
        otherUserMessages.value.messages.push(msg);
        const queue = isUserA.value
            ? queuedTranslations.value.b
            : queuedTranslations.value.a;
        queue.push({ text, message: msg });
        return;
    }

    const msg: ConversationMessage = {
        id: createUUID(),
        content: "",
        role: "translated",
    };
    otherUserMessages.value.messages.push(msg);
    translateAndShow(text, currentLanguage.value, otherLanguage.value, msg);
}

async function translateAndShow(
    text: string,
    sourceLang: Language,
    targetLang: Language,
    message: ConversationMessage,
) {
    for await (const chunk of translationService.translate(text, {
        source_language: sourceLang.code,
        target_language: targetLang.code,
    })) {
        message.content += chunk;
    }
}

async function processQueue(
    texts: { text: string; message: ConversationMessage }[],
    sourceLang: Language,
    targetLang: Language,
) {
    logger.debug({ texts }, "Processing translation queue:");

    for (const { text, message } of texts) {
        await translateAndShow(text, sourceLang, targetLang, message);
    }
}
</script>

<template>
    <div class="bg-gray-400 h-dvh">
        <div class="h-full max-w-[900px] min-w-[calc(min(100vw,900px))] mx-auto shadow-md">
            <!-- Setup Phase: User A selects language -->
            <div v-if="phase === 'setup-a'" class="h-full" :class="chatBg">
                <LanguageSetup :language="userALanguage" :other-language="userBLanguage"
                    :title="t('conversation.selectYourLanguage')" :subtitle="t('conversation.orStartTalking')"
                    :show-other-language="true" :other-language-label="t('conversation.otherPersonLanguage')"
                    :continue-label="t('conversation.continue')" @update:language="(l: Language) => (userALanguage = l)"
                    @update:other-language="(l: Language) => (userBLanguage = l)" @continue="onSetupAContinue"
                    @transcription="onSetupATranscription" @detected-language="onSetupADetectedLanguage" />
            </div>

            <!-- Transition Phase: Auto handoff between users -->
            <div v-else-if="phase === 'transition'" class="flex flex-col items-center justify-center h-full p-6 gap-6"
                :class="chatBg">
                <UIcon :name="otherLanguage.icon" size="4xl" class="mb-2" />
                <h1 class="text-2xl font-bold text-center">
                    {{
                        t("conversation.handToPerson", [
                            transitionPersonName,
                        ])
                    }}
                </h1>
                <div class="flex items-center gap-1 mt-4">
                    <div v-for="i in 3" :key="i" class="w-2 h-2 rounded-full bg-current opacity-50 animate-bounce"
                        :style="{ animationDelay: `${(i - 1) * 0.15}s` }" />
                </div>
            </div>

            <!-- Conversation Phase -->
            <div v-else class="grid grid-rows-[1fr_auto] h-full" :class="chatBg">
                <div class="p-2 overflow-y-auto">
                    <ChatView class="p-2" :user-message="currentUserMessages" :current-language="currentLanguage"
                        :other-language="otherLanguage" />
                </div>

                <div class="flex flex-col items-center mx-auto bg-black/10 w-full">
                    <LanguageSelectionView v-model="currentLanguageCode" :include-auto-detect="false"
                        :detected-language-code="currentLanguage.code" />

                    <!-- Pending message confirmation (toolbar hidden) -->
                    <div v-if="pendingText" class="w-full px-4 pb-4 flex flex-col gap-3">
                        <div class="rounded-xl bg-white/20 p-3 text-base text-center break-words">
                            {{ pendingText }}
                        </div>
                        <div class="flex justify-center gap-4">
                            <UButton size="xl" color="info" variant="ghost" icon="i-lucide-rotate-ccw"
                                @click="onRetryMessage" />
                            <UButton size="xl" color="info" variant="ghost" icon="i-lucide-list-plus"
                                @click="onAddNewMessage" />
                            <UButton size="xl" color="primary" variant="ghost" icon="i-lucide-check"
                                @click="onConfirmMessage" />
                        </div>
                    </div>

                    <!-- Toolbar (hidden while confirming) -->
                    <ToolBar v-else :current-language="currentLanguage" :others-language="otherLanguage"
                        @switch-click="onSwitch" @transcription="onConversationTranscription" @undo="onUndo"
                        @detected-language="onDetectedLanguage" />
                </div>
            </div>
        </div>
    </div>
</template>
