<script lang="ts" setup>
import type { Language } from "~/models/languages";
import ToolBar from "~/components/conversation/ToolBar.vue";
import { type Conversation, type ConversationMessage, createEmptyConversation, type UserConversation } from "~/models/conversation";
import ChatView from "~/components/conversation/ChatView.vue";
import { TranslationService } from "~/services/translationService";

definePageMeta({ layout: "conversation" });

const { t } = useI18n();

const translationService = useService(TranslationService);
const logger = useLogger();

const isUserA = ref<boolean>(true);

const currentLanguage = ref<Language>(getLanguage("auto"));
const otherLanguage = ref<Language>(getLanguage("auto"));
const chatBg = computed(() => isUserA.value ? "bg-primary-300" : "bg-secondary-300");

const queuedTranslations = ref({
    a: [] as { text: string, message: ConversationMessage }[],
    b: [] as { text: string, message: ConversationMessage }[],
});

const conversation = ref<Conversation>(createEmptyConversation());
const currentUserMessages = computed<UserConversation>(() => {
    return isUserA.value ? conversation.value.userA : conversation.value.userB;
});

const otherUserMessages = computed<UserConversation>(() => {
    return isUserA.value ? conversation.value.userB : conversation.value.userA;
});

watch(currentLanguage, async (newLang, oldLang) => {
    if (oldLang.code === "auto" && newLang.code !== "auto") {
        const textsToTranslate = isUserA.value ? queuedTranslations.value.a : queuedTranslations.value.b;
        await processQueue(textsToTranslate, otherLanguage.value, currentLanguage.value);
    }
});

function onSwitch() {
    isUserA.value = !isUserA.value;

    // switch language
    const temp = currentLanguage.value;
    currentLanguage.value = otherLanguage.value;
    otherLanguage.value = temp;
}

async function onTranscription(text: string) {
    currentUserMessages.value.messages.push({ id: createUUID(), content: text, role: "original" });

    if (currentLanguage.value.code === "auto") {
        const result = await translationService.detectLanguage(text);
        currentLanguage.value = getLanguage(result.language);
    }

    if (otherLanguage.value.code === "auto") {
        const message = addEmptyTranslation();
        const queue = isUserA.value ? queuedTranslations.value.b : queuedTranslations.value.a;

        queue.push({ text, message });
        return;
    }

    translateAndShow(text, currentLanguage.value, otherLanguage.value, addEmptyTranslation());
}

function addEmptyTranslation(): ConversationMessage {
    otherUserMessages.value.messages.push({ id: createUUID(), content: "", role: "translated" });
    return otherUserMessages.value.messages[otherUserMessages.value.messages.length - 1] as ConversationMessage;
}

async function translateAndShow(text: string, sourceLang: Language, targetLang: Language, userMessages: ConversationMessage) {
    for await (const chunk of translationService.translate(text, { source_language: sourceLang.code, target_language: targetLang.code })) {
        userMessages.content += chunk;
    }
}

async function processQueue(texts: { text: string, message: ConversationMessage }[], sourceLang: Language, targetLang: Language) {
    logger.debug({ texts }, "Processing translation queue:");

    for (const { text, message } of texts) {
        await translateAndShow(text, sourceLang, targetLang, message);
    }
}

</script>

<template>
    <div class="bg-gray-400 h-dvh">
        <div class="grid grid-rows-[1fr_auto] h-full max-w-[900px] min-w-[calc(min(100vw,900px))] mx-auto shadow-md"
            :class="chatBg">
            <div class="p-2 overflow-y-auto">
                <ChatView class="p-2" :user-message="currentUserMessages" :current-language="currentLanguage"
                    :other-language="otherLanguage" />
            </div>

            <div class="flex flex-col items-center mx-auto bg-black/20 w-full">
                <LanguageSelectionView :include-auto-detect="false" :detected-language-code="currentLanguage.code" />
                <ToolBar :current-language="currentLanguage" :others-language="otherLanguage" @switch-click="onSwitch"
                    @transcription="onTranscription" />
            </div>
        </div>
    </div>
</template>
