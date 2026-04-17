<script lang="ts" setup>
import type { UIMessage, UIDataTypes, UITools } from "ai";
import type { ButtonProps } from "@nuxt/ui";
import type { UserConversation } from "~/models/conversation";
import { useSpeechSynthesis } from "@vueuse/core";
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
const isSupported = ref(false);
const voices = ref<SpeechSynthesisVoice[]>([]);

const voiceMap: Record<string, SpeechSynthesisVoice> = {};

onMounted(async () => {

    await nextTick(); // Wait for the next tick to ensure the voices are loaded

    voices.value = window.speechSynthesis.getVoices();

    console.debug("Available voices:", voices);

    for (const voice of voices.value) {
        voiceMap[voice.lang] = voice;
        if (voice.lang === props.language.code) {
            isSupported.value = true;
            break;
        }
    }
});

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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = window.speechSynthesis
        .getVoices()
        .find((voice) => voice.lang === props.language.code) || null;

    window.speechSynthesis.speak(utterance);
}

</script>

<template>
    <div>VOICES:</div>
    <div v-for="voice in voices" :key="voice.name">
        <div>{{ voice.name }} ({{ voice.lang }})</div>
    </div>

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
                    <UButton icon="i-lucide-volume-2"
                        @click="onSpeak(message.parts.filter(part => 'text' in part).map(part => part.text).join(' '))">
                    </UButton>
                </div>
            </div>
        </template>

    </UChatMessages>
</template>
