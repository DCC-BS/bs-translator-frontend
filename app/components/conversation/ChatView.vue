<script lang="ts" setup>
import type { UIMessage, UIDataTypes, UITools } from "ai";
import type { ButtonProps } from "@nuxt/ui";
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

function onSpeak(text: string) {
    speak(text);
}

</script>

<template>
    <UDrawer>
        <UButton variant="outline">Available Voices</UButton>
        <template #content>
            <div class="p-4 overflow-auto max-h-[80vh]">
                <h2 class="text-xl">Available voices</h2>
                <div class="flex flex-col gap-2 mt-4">
                    <div v-for="voice in voices" :key="voice.name" class="flex items-center gap-3">
                        <div class="flex-1">
                            <p class="font-medium">{{ voice.name }}</p>
                            <p class="text-sm opacity-70">{{ voice.lang }}</p>
                        </div>
                        <UButton size="sm" variant="outline"
                            @click="speak('Hello, this is a voice test.', { voice: voice })">
                            Test
                        </UButton>
                    </div>
                </div>
            </div>
        </template>
    </UDrawer>


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
        <template #content="{ message }">
            <div>
                <div>{{message.parts.filter(part => 'text' in part).map(part => part.text).join(' ')}}</div>
                <div class="flex justify-end">
                    <UButton icon="i-lucide-volume-2" :active="isSupported" variant="ghost" size="sm"
                        @click="onSpeak(message.parts.filter(part => 'text' in part).map(part => part.text).join(' '))">
                    </UButton>
                </div>
            </div>
        </template>

    </UChatMessages>
</template>
