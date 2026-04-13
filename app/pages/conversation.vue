<script lang="ts" setup>
import { ChatView } from "#components";
import ChatInputView from "~/components/ChatInputView.vue";
import type { ChatStatus } from "ai";

definePageMeta({ layout: "conversation" });

const { sourceLanguage, targetLanguage, translateText } = useTranslate();

const chatViewA = shallowRef<InstanceType<typeof ChatView>>();
const chatViewB = shallowRef<InstanceType<typeof ChatView>>();

const languageA = ref("de");
const langaugeB = ref("en-gb");

const status = ref<ChatStatus>("ready");

onMounted(() => {
    appendUserMessage("this is a test", "a");
    appendUserMessage("And this is an answer", "b");
});

function appendUserMessage(text: string, user: "a" | "b") {
    chatViewA.value?.appendMessage({
        role: user === "a" ? "leftUser" : "rightUser",
        text: text,
        state: "done",
    });

    chatViewB.value?.appendMessage({
        role: user === "a" ? "rightUser" : "leftUser",
        text: text,
        state: "done",
    });
}

async function onSubmitA(text: string) {
    if (!chatViewA.value || !chatViewB.value) {
        return;
    }

    // status.value = "submitted";

    chatViewA.value.appendMessage({
        role: "leftUser",
        text: text,
        state: "done",
    });

    const { updateText, updateState } = chatViewB.value.appendMessage({
        role: "rightUser",
        text: "",
        state: "streaming",
    });

    sourceLanguage.value = languageA.value;
    targetLanguage.value = langaugeB.value;

    let translatedText = "";

    await translateText(text, (chunk) => {
        console.log(chunk);
        translatedText += chunk;
        updateText(translatedText);
    });

    updateState("done");
    // status.value = "ready";
}

function onSubmitB(text: string) {
    if (!chatViewA.value || !chatViewB.value) {
        return;
    }

    chatViewB.value.appendMessage({
        role: "leftUser",
        text: text,
        state: "done",
    });

    const { updateText, updateState } = chatViewA.value.appendMessage({
        role: "rightUser",
        text: "",
        state: "streaming",
    });

    sourceLanguage.value = langaugeB.value;
    targetLanguage.value = languageA.value;

    let translatedText = "";

    translateText(text, (chunk) => {
        console.log(chunk);

        translatedText += chunk;
        updateText(translatedText);
    }).then(() => {
        updateState("done");
    });
}
</script>

<template>
    <div class="hidden md:flex flex-col p-2 h-screen gap-2">
        <div class="grid grid-cols-[1fr_auto_1fr] gap-2 grow min-h-0">
            <div class="min-h-0 overflow-y-auto">
                <ChatView ref="chatViewA" :status="status" />
            </div>
            <USeparator orientation="vertical" />
            <div class="min-h-0 overflow-y-auto">
                <ChatView ref="chatViewB" :status="status" />
            </div>
        </div>

        <div class="input-bar">
            <div>
                <ChatInputView
                    align="start"
                    @submit="onSubmitA"
                    :status="status"
                />
            </div>

            <LanguageSelectionBar
                :sourceLanguage="languageA"
                :targetLanguage="langaugeB"
                :includeAutoDetect="false"
                :canSwitch="false"
            />

            <div>
                <ChatInputView
                    align="end"
                    @submit="onSubmitB"
                    :status="status"
                />
            </div>
        </div>
    </div>
    <!-- <div class="md:hidden h-screen p-2">
        <div class="h-full grid grid-rows-[1fr_auto_1fr] content-stretch gap-2">
            <div class="rotate-180 flex flex-col">
                <ChatView ref="chatViewA" class="grow" />
                <ChatInputView align="end" />
            </div>
            <USeparator color="primary" />
            <div class="flex flex-col">
                <ChatView ref="chatViewB" class="grow" />
                <ChatInputView align="end" />
            </div>
        </div>
    </div> -->
</template>

<style scoped>
.input-bar {
    display: grid;
    gap: 2rem;
    grid-template-columns: 1fr auto 1fr;
    justify-content: space-between;
}
</style>
