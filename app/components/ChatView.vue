<script lang="ts" setup>
import { v7 as uuid } from "uuid";
import type { UIMessage, ChatStatus, UIDataTypes, UITools } from "ai";
import type { ButtonProps } from "@nuxt/ui";

type UserMessage = {
    role: "leftUser" | "rightUser";
    text: string;
    state?: "streaming" | "done";
};

const props = defineProps<{
    status: ChatStatus;
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

const messages = ref<UIMessage[]>([]);

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

function appendMessage(message: UserMessage) {
    const l = messages.value.push({
        id: uuid(),
        role: message.role === "leftUser" ? "user" : "assistant",
        parts: [
            {
                type: "text",
                text: message.text,
                state: message.state,
            },
        ],
    });

    function updateMessage(updates: Partial<UIMessage>) {
        if (!messages.value[l - 1]) {
            throw new Error("Message not found");
        }

        // @ts-expect-error: value is not undefined
        messages.value[l - 1] = {
            ...messages.value[l - 1],
            ...updates,
        };
    }

    function updateText(newText: string) {
        updateMessage({
            parts: [
                {
                    type: "text",
                    text: newText,
                    state: "streaming",
                },
            ],
        });
    }

    function updateState(newState: "streaming" | "done") {
        if (!messages.value[l - 1]) {
            throw new Error("Message not found");
        }

        updateMessage({
            parts: [
                {
                    type: "text",
                    // @ts-expect-error: value is not undefined
                    text: messages.value[l - 1].parts[0].text,
                    state: newState,
                },
            ],
        });
    }

    return { updateText, updateState };
}

const statusText = computed(() => {
    switch (props.status) {
        case "submitted":
            return "Translating...";
        case "error":
            return "An error occurred.";
        default:
            return "";
    }
});

defineExpose({
    appendMessage,
});
</script>

<template>
    <div class="h-full min-h-0">
        <UChatMessages class="h-full"
        should-auto-scroll
        shouldScrollToBottom
        :user="{
            side: 'right',
            variant: 'soft',
            icon: 'i-lucide-circle-user',
            actions: actions,
            ui: { content: 'bg-primary-200' }
        }" :assistant="{
            side: 'left',
            variant: 'soft',
            icon: 'i-lucide-languages',
            actions: actions,
            ui: {
                content: 'bg-secondary-200'
            }
        }" :messages="messages" :status="props.status"
        :auto-scroll="{
            color: 'primary',
        }">
    <template #indicator>
        <div>
            <UChatShimmer :text="statusText" class="text-black" />
        </div>
       </template>

        </UChatMessages>
    </div>
</template>
