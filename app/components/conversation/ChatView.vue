<script lang="ts" setup>
import type { UIMessage, UIDataTypes, UITools } from "ai";
import type { ButtonProps } from "@nuxt/ui";
import type { UserConversation } from "~/models/conversation";

const props = defineProps<{
    userMessage: UserConversation;
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
        label: "Copy to clipboard",
        icon: "i-lucide-copy",
        onClick: (e, msg) => {
            const content = msg.parts
                .map((part) => ("text" in part ? part.text : ""))
                .join(" ");
            navigator.clipboard.writeText(content);
            showToast("Text copied to clipboard", "success");
        },
    },
]);
</script>

<template>
    <UChatMessages class="h-full" should-auto-scroll shouldScrollToBottom :user="{
        side: 'right',
        variant: 'soft',
        icon: 'i-lucide-circle-user',
        actions: actions,
        ui: { content: 'bg-primary-200' },
    }" :assistant="{
        side: 'left',
        variant: 'soft',
        icon: 'i-lucide-languages',
        actions: actions,
        ui: {
            content: 'bg-secondary-200',
        },
    }" :messages="messages" :auto-scroll="{
        color: 'primary',
    }">
    </UChatMessages>
</template>
