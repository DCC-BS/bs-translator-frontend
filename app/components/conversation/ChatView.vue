<script lang="ts" setup>
import type { ButtonProps } from "@nuxt/ui";
import type { UIDataTypes, UIMessage, UITools } from "ai";
import type { UserConversation } from "~/models/conversation";
import type { Language } from "~/models/languages";

const props = defineProps<{
    userMessage: UserConversation;
    language: Language;
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
const { isSupported, speak } = useTTS(props.language);
const { tMap } = useTextTranslate(
    toRef(() => props.language),
    [
        "ui.copyToClipboard",
        "ui.copySuccess",
        "conversation.startRecordingMessage1",
        "conversation.startRecordingMessage2",
    ],
);

const { direction } = useLanguageDirection(toRef(() => props.language.code));

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

const isEmpty = computed(
    () =>
        messages.value.filter((x) => x.role === "user").length === 0 ||
        props.userMessage.messages.every((msg) => msg.content.trim() === ""),
);

const actions = computed<MessageAction[]>(() => [
    {
        label: tMap["ui.copyToClipboard"].value,
        icon: "i-lucide-copy",
        onClick: (_e, msg) => {
            const content = msg.parts
                .map((part) => ("text" in part ? part.text : ""))
                .join(" ");
            navigator.clipboard.writeText(content);
            showToast(tMap["ui.copySuccess"].value, "success");
        },
    },
]);

function onSpeak(text: string) {
    speak(text);
}
</script>

<template>
    <div :dir="direction" class="relative h-full w-full">
        <UChatMessages class="h-full" should-auto-scroll shouldScrollToBottom :user="{
            side: 'right',
            variant: 'soft',
            icon: 'i-lucide-circle-user',
            actions: actions,
            ui: { content: 'bg-primary-300' },
        }" :assistant="{
            side: 'left',
            variant: 'soft',
            icon: 'i-lucide-languages',
            actions: actions,
            ui: {
                content: 'bg-secondary-300',
            },
        }" :messages="messages" :auto-scroll="{
            color: 'primary',
        }">
            <template #content="{ message }">
                <div>
                    <div>{{message.parts.filter(part => 'text' in part).map(part => part.text).join(' ')}}</div>
                    <div class="flex justify-end">
                        <UButton icon="i-lucide-volume-2" v-if="isSupported" variant="ghost" size="sm"
                            @click="onSpeak(message.parts.filter(part => 'text' in part).map(part => part.text).join(' '))">
                        </UButton>
                    </div>
                </div>
            </template>
        </UChatMessages>

        <div v-if="isEmpty"
            class="absolute bottom-0 w-full text-2xl font-semibold text-neutral-500 text-center p-6 pointer-events-none">
            <div class="flex flex-col justify-center items-center">
                <div>
                    <span>{{ tMap["conversation.startRecordingMessage1"] }}</span>
                    <UIcon name="i-lucide-mic" />
                    <span>{{ tMap["conversation.startRecordingMessage2"] }}</span>
                </div>

                <UIcon name="i-lucide-arrow-down" class="w-10 h-10 m-2 text-muted" />
            </div>
        </div>
    </div>
</template>
