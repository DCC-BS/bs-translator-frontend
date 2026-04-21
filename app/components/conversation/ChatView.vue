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
const { isSupported, voices, speak } = useTTS(props.language);
const { t } = useI18n();

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

const actions = ref<MessageAction[]>([
    {
        label: t("ui.copyToClipboard"),
        icon: "i-lucide-copy",
        onClick: (_e, msg) => {
            const content = msg.parts
                .map((part) => ("text" in part ? part.text : ""))
                .join(" ");
            navigator.clipboard.writeText(content);
            showToast(t("ui.copySuccess"), "success");
        },
    },
]);

function onSpeak(text: string) {
    speak(text);
}
</script>

<template>
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
</template>
