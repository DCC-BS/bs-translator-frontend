<script lang="ts" setup>
import type { ButtonProps } from "@nuxt/ui";
import type { UIDataTypes, UIMessage, UITools } from "ai";
import type {
    TranslationStatus,
    UserConversation,
} from "~/models/conversation";
import type { Language, LanguageCode } from "~/models/languages";

const props = defineProps<{
    userMessage: UserConversation;
    language: Language;
}>();

const emit = defineEmits<{
    retry: [id: string];
}>();

type MessageAction = Omit<ButtonProps, "onClick"> & {
    onClick?:
        | ((
              e: MouseEvent,
              message: UIMessage<unknown, UIDataTypes, UITools>,
          ) => void)
        | undefined;
};

const { showToast } = useUserFeedback();
const { isSupported, speak } = useTTS(() => props.language);
const { tMap } = useTextTranslate(
    toRef(() => props.language),
    [
        "ui.copyToClipboard",
        "ui.copySuccess",
        "ui.copyFailed",
        "conversation.startRecordingMessage1",
        "conversation.startRecordingMessage2",
        "conversation.waitingForLanguage",
        "conversation.translationFailed",
        "conversation.retry",
    ],
);

const { direction } = useLanguageDirection(
    toRef(() => props.language.code as LanguageCode),
);

const messages = computed<UIMessage[]>(() => {
    return props.userMessage.messages.map((msg) => ({
        id: msg.id,
        role: msg.role === "original" ? "user" : "assistant",
        parts: [
            {
                type: "text",
                text: msg.content,
            },
        ],
    }));
});

// Only for a view without any message, otherwise the hint covers the bubbles.
const isEmpty = computed(() => props.userMessage.messages.length === 0);

const statusById = computed(
    () =>
        new Map(props.userMessage.messages.map((msg) => [msg.id, msg.status])),
);

function statusOf(id: string): TranslationStatus | undefined {
    return statusById.value.get(id);
}

function isWaiting(id: string): boolean {
    const status = statusOf(id);
    return status === "pending" || status === "translating";
}

const actions = computed<MessageAction[]>(() => [
    {
        label: tMap["ui.copyToClipboard"].value,
        icon: "i-lucide-copy",
        onClick: async (_e, msg) => {
            const content = msg.parts
                .map((part) => ("text" in part ? part.text : ""))
                .join(" ");
            try {
                await navigator.clipboard.writeText(content);
                showToast(tMap["ui.copySuccess"].value, "success");
            } catch {
                showToast(tMap["ui.copyFailed"].value, "error");
            }
        },
    },
]);

function onSpeak(text: string) {
    speak(text);
}
</script>

<template>
    <div :dir="direction" class="relative h-full w-full">
        <!-- UChatMessages only follows new content while status is "streaming". -->
        <UChatMessages
            class="h-full"
            status="streaming"
            should-auto-scroll
            shouldScrollToBottom
            :user="{
                side: 'right',
                variant: 'soft',
                icon: 'i-lucide-circle-user',
                actions: actions,
                ui: { content: 'bg-primary-300' },
            }"
            :assistant="{
                side: 'left',
                variant: 'soft',
                icon: 'i-lucide-languages',
                actions: actions,
                ui: {
                    content: 'bg-secondary-300',
                },
            }"
            :messages="messages"
            :auto-scroll="{
                color: 'primary',
            }"
        >
            <template #content="{ message }">
                <div>
                    <div>
                        {{
                            message.parts
                                .filter((part) => "text" in part)
                                .map((part) => part.text)
                                .join(" ")
                        }}
                    </div>
                    <div
                        v-if="isWaiting(message.id) && language.code === 'auto'"
                        class="flex items-center gap-2 text-sm opacity-80"
                    >
                        <UIcon name="i-lucide-languages" class="shrink-0" />
                        <span>{{ tMap["conversation.waitingForLanguage"] }}</span>
                    </div>
                    <UIcon
                        v-else-if="isWaiting(message.id)"
                        name="i-lucide-loader-2"
                        class="animate-spin"
                    />
                    <div
                        v-if="statusOf(message.id) === 'failed'"
                        class="flex flex-wrap items-center gap-2 text-sm text-error"
                    >
                        <UIcon name="i-lucide-circle-alert" class="shrink-0" />
                        <span>{{ tMap["conversation.translationFailed"] }}</span>
                        <UButton
                            icon="i-lucide-rotate-ccw"
                            variant="ghost"
                            size="sm"
                            :label="tMap['conversation.retry'].value"
                            @click="emit('retry', message.id)"
                        />
                    </div>
                    <div class="flex justify-end">
                        <UButton
                            icon="i-lucide-volume-2"
                            v-if="isSupported && !isWaiting(message.id)"
                            variant="ghost"
                            size="sm"
                            @click="
                                onSpeak(
                                    message.parts
                                        .filter((part) => 'text' in part)
                                        .map((part) => part.text)
                                        .join(' '),
                                )
                            "
                        >
                        </UButton>
                    </div>
                </div>
            </template>
        </UChatMessages>

        <div
            v-if="isEmpty"
            class="absolute bottom-0 w-full text-2xl font-semibold text-neutral-500 text-center p-6 pointer-events-none"
        >
            <div class="flex flex-col justify-center items-center">
                <div>
                    <span>{{
                        tMap["conversation.startRecordingMessage1"]
                    }}</span>
                    <UIcon name="i-lucide-mic" />
                    <span>{{
                        tMap["conversation.startRecordingMessage2"]
                    }}</span>
                </div>

                <UIcon
                    name="i-lucide-arrow-down"
                    class="w-10 h-10 m-2 text-muted"
                />
            </div>
        </div>
    </div>
</template>
