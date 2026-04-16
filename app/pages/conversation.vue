<script lang="ts" setup>
import { AnimatePresence, motion } from "motion-v";
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
const switchDirection = ref(1);

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

const transitionEnter = computed(() => ({
    x: switchDirection.value * 100,
    opacity: 0,
}));

const transitionExit = computed(() => ({
    x: switchDirection.value * -100,
    opacity: 0,
}));

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
    switchDirection.value = isUserA.value ? 1 : -1;
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
    switchDirection.value = isUserA.value ? 1 : -1;
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
        <div
            class="h-full max-w-[900px] min-w-[calc(min(100vw,900px))] mx-auto shadow-md overflow-hidden relative"
        >
            <AnimatePresence mode="wait">
                <!-- Setup Phase: User A selects language -->
                <motion.div
                    v-if="phase === 'setup-a'"
                    key="setup"
                    :initial="{ opacity: 0, y: 30 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :exit="{ opacity: 0, y: -20 }"
                    :transition="{ duration: 0.3, ease: 'easeInOut' }"
                    class="h-full"
                    :class="chatBg"
                >
                    <LanguageSetup
                        :language="userALanguage"
                        :other-language="userBLanguage"
                        :title="t('conversation.selectYourLanguage')"
                        :subtitle="t('conversation.orStartTalking')"
                        :show-other-language="true"
                        :other-language-label="
                            t('conversation.otherPersonLanguage')
                        "
                        :continue-label="t('conversation.continue')"
                        @update:language="
                            (l: Language) => (userALanguage = l)
                        "
                        @update:other-language="
                            (l: Language) => (userBLanguage = l)
                        "
                        @continue="onSetupAContinue"
                        @transcription="onSetupATranscription"
                        @detected-language="onSetupADetectedLanguage"
                    />
                </motion.div>

                <!-- Transition Phase: Auto handoff between users -->
                <motion.div
                    v-else-if="phase === 'transition'"
                    key="transition"
                    :initial="transitionEnter"
                    :animate="{ x: 0, opacity: 1 }"
                    :exit="transitionExit"
                    :transition="{ duration: 0.35, ease: 'easeInOut' }"
                    class="absolute inset-0 flex flex-col items-center justify-center p-6 gap-6"
                    :class="chatBg"
                >
                    <motion.div
                        :initial="{ scale: 0.5, opacity: 0 }"
                        :animate="{
                            scale: 1,
                            opacity: 1,
                            transition: { delay: 0.1, type: 'spring', stiffness: 200 },
                        }"
                    >
                        <UIcon
                            :name="otherLanguage.icon"
                            size="4xl"
                            class="mb-2"
                        />
                    </motion.div>

                    <motion.h1
                        class="text-2xl font-bold text-center"
                        :initial="{ opacity: 0, y: 10 }"
                        :animate="{
                            opacity: 1,
                            y: 0,
                            transition: { delay: 0.15, duration: 0.3 },
                        }"
                    >
                        {{
                            t("conversation.handToPerson", [
                                transitionPersonName,
                            ])
                        }}
                    </motion.h1>

                    <div class="flex items-center gap-1.5 mt-4">
                        <motion.div
                            v-for="i in 3"
                            :key="i"
                            class="w-2 h-2 rounded-full bg-current opacity-50"
                            :animate="{
                                y: [0, -8, 0],
                                transition: {
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: (i - 1) * 0.15,
                                    ease: 'easeInOut',
                                },
                            }"
                        />
                    </div>
                </motion.div>

                <!-- Conversation Phase -->
                <motion.div
                    v-else
                    key="conversation"
                    :initial="{ opacity: 0 }"
                    :animate="{ opacity: 1 }"
                    :exit="{ opacity: 0 }"
                    :transition="{ duration: 0.25, ease: 'easeInOut' }"
                    class="grid grid-rows-[1fr_auto] h-full"
                    :class="chatBg"
                >
                    <div class="p-2 overflow-y-auto">
                        <ChatView
                            class="p-2"
                            :user-message="currentUserMessages"
                            :current-language="currentLanguage"
                            :other-language="otherLanguage"
                        />
                    </div>

                    <div
                        class="flex flex-col items-center mx-auto bg-black/10 w-full"
                    >
                        <MobileLanguageSelect
                            v-model="currentLanguageCode"
                            :include-auto-detect="false"
                            :detected-language-code="currentLanguage.code"
                        />

                        <AnimatePresence mode="wait">
                            <!-- Pending message confirmation (toolbar hidden) -->
                            <motion.div
                                v-if="pendingText"
                                key="pending"
                                :initial="{ opacity: 0, y: 20, scale: 0.95 }"
                                :animate="{
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                        type: 'spring',
                                        stiffness: 300,
                                        damping: 25,
                                    },
                                }"
                                :exit="{
                                    opacity: 0,
                                    y: 10,
                                    scale: 0.95,
                                    transition: { duration: 0.15 },
                                }"
                                class="w-full px-4 pb-4 flex flex-col gap-3"
                            >
                                <div
                                    class="rounded-xl bg-white/20 p-3 text-base text-center break-words"
                                >
                                    {{ pendingText }}
                                </div>
                                <div class="flex justify-center gap-4">
                                    <motion.div
                                        :initial="{
                                            opacity: 0,
                                            scale: 0,
                                        }"
                                        :animate="{
                                            opacity: 1,
                                            scale: 1,
                                            transition: {
                                                delay: 0.1,
                                                type: 'spring',
                                                stiffness: 400,
                                            },
                                        }"
                                    >
                                        <UButton
                                            size="xl"
                                            color="info"
                                            variant="ghost"
                                            icon="i-lucide-rotate-ccw"
                                            @click="onRetryMessage"
                                        />
                                    </motion.div>
                                    <motion.div
                                        :initial="{
                                            opacity: 0,
                                            scale: 0,
                                        }"
                                        :animate="{
                                            opacity: 1,
                                            scale: 1,
                                            transition: {
                                                delay: 0.2,
                                                type: 'spring',
                                                stiffness: 400,
                                            },
                                        }"
                                    >
                                        <UButton
                                            size="xl"
                                            color="info"
                                            variant="ghost"
                                            icon="i-lucide-list-plus"
                                            @click="onAddNewMessage"
                                        />
                                    </motion.div>
                                    <motion.div
                                        :initial="{
                                            opacity: 0,
                                            scale: 0,
                                        }"
                                        :animate="{
                                            opacity: 1,
                                            scale: 1,
                                            transition: {
                                                delay: 0.3,
                                                type: 'spring',
                                                stiffness: 400,
                                            },
                                        }"
                                    >
                                        <UButton
                                            size="xl"
                                            color="primary"
                                            variant="ghost"
                                            icon="i-lucide-check"
                                            @click="onConfirmMessage"
                                        />
                                    </motion.div>
                                </div>
                            </motion.div>

                            <!-- Toolbar (hidden while confirming) -->
                            <motion.div
                                v-else
                                key="toolbar"
                                :initial="{ opacity: 0 }"
                                :animate="{ opacity: 1, transition: { duration: 0.2 } }"
                                :exit="{ opacity: 0, transition: { duration: 0.1 } }"
                                class="w-full"
                            >
                                <ToolBar
                                    :current-language="currentLanguage"
                                    :others-language="otherLanguage"
                                    @switch-click="onSwitch"
                                    @transcription="onConversationTranscription"
                                    @undo="onUndo"
                                    @detected-language="onDetectedLanguage"
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
</template>
