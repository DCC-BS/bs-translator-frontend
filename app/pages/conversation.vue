<script lang="ts" setup>
import { AnimatePresence, motion } from "motion-v";
import ChatView from "~/components/conversation/ChatView.vue";
import LanguageSetup from "~/components/conversation/LanguageSetup.vue";
import ToolBar from "~/components/conversation/ToolBar.vue";
import type { Language, LanguageCode } from "~/models/languages";

definePageMeta({ layout: "conversation" });

const {
    addMessage,
    removeLastMessage,
    retryMessage,
    changeCurrentLanguage,
    changeOtherLanguage,
    current,
    phase,
    other,
    switchUser,
    isTranslating,
} = useConversation();

const currentLanguage = computed(() => current.value.language);
const transitionLanguage = ref<Language>(currentLanguage.value);

// The handoff text is shown in the language of the person handing over, so
// keep it in sync with the current user outside of the transition itself.
watch(
    [currentLanguage, phase],
    () => {
        if (phase.value !== "transition") {
            transitionLanguage.value = currentLanguage.value;
        }
    },
    { immediate: true },
);

const { tMap } = useTextTranslate(transitionLanguage, [
    "conversation.handToPerson",
]);

const switchDirection = ref(1);
const pendingText = ref<string | null>(null);
const isSubmitting = ref(false);
const isMicBusy = ref(false);

useLeavePageGuard(
    () =>
        isMicBusy.value ||
        isSubmitting.value ||
        isTranslating.value ||
        !!pendingText.value,
);

const transitionEnter = computed(() => ({
    x: switchDirection.value * 100,
    opacity: 0,
}));

const transitionExit = computed(() => ({
    x: switchDirection.value * -100,
    opacity: 0,
}));

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

function onSwitch() {
    switchDirection.value = current.value.name === "a" ? 1 : -1;
    switchUser();
    startTransition();
}

function onConversationTranscription(text: string) {
    pendingText.value = text;
}

/**
 * Adds the pending text as a message. It is only cleared once the message
 * was added, so nothing is lost while the language is being detected.
 */
async function submitPendingText(): Promise<boolean> {
    if (!pendingText.value || isSubmitting.value) return false;

    isSubmitting.value = true;
    try {
        await addMessage(pendingText.value);
        pendingText.value = null;
        return true;
    } finally {
        isSubmitting.value = false;
    }
}

async function onConfirmMessage() {
    if (await submitPendingText()) {
        onSwitch();
    }
}

async function onAddNewMessage() {
    await submitPendingText();
}

function onRetryMessage() {
    pendingText.value = null;
}

onUnmounted(() => {
    if (transitionTimer.value) clearTimeout(transitionTimer.value);
});

function onUndo() {
    removeLastMessage();
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
                    v-if="phase === 'setup'"
                    key="setup"
                    :initial="{ opacity: 0, y: 30 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :exit="{ opacity: 0, y: -20 }"
                    :transition="{ duration: 0.3, ease: 'easeInOut' }"
                    class="h-full"
                    :class="current.backgroundColor"
                >
                    <LanguageSetup
                        :language="current.language"
                        :other-language="other.language"
                        :show-other-language="true"
                        @update:language="changeCurrentLanguage"
                        @update:other-language="changeOtherLanguage"
                        @continue="onSetupAContinue"
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
                    :class="current.backgroundColor"
                >
                    <motion.div
                        :initial="{ scale: 0.5, opacity: 0 }"
                        :animate="{
                            scale: 1,
                            opacity: 1,
                            transition: {
                                delay: 0.1,
                                type: 'spring',
                                stiffness: 200,
                            },
                        }"
                    >
                        <UIcon
                            :name="currentLanguage.icon"
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
                        {{ tMap["conversation.handToPerson"] }}
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
                    :class="current.backgroundColor"
                >
                    <div class="p-2 pt-10 overflow-y-auto">
                        <ChatView
                            class="p-2"
                            :user-message="current.conversation"
                            :language="current.language"
                            @retry="retryMessage"
                        />
                    </div>

                    <div
                        class="flex flex-col items-center mx-auto bg-black/10 w-full"
                    >
                        <MobileLanguageSelect
                            :model-value="current.language.code"
                            @update:model-value="
                                (code?: string) =>
                                    changeCurrentLanguage(code as LanguageCode)
                            "
                            :include-auto-detect="false"
                            :detected-language-code="current.language.code"
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
                                            :disabled="isSubmitting"
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
                                            :loading="isSubmitting"
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
                                            :loading="isSubmitting"
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
                                :animate="{
                                    opacity: 1,
                                    transition: { duration: 0.2 },
                                }"
                                :exit="{
                                    opacity: 0,
                                    transition: { duration: 0.1 },
                                }"
                                class="w-full"
                            >
                                <ToolBar
                                    v-model:busy="isMicBusy"
                                    :current-language="current.language"
                                    :others-language="other.language"
                                    @switch-click="onSwitch"
                                    @transcription="onConversationTranscription"
                                    @undo="onUndo"
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
</template>
