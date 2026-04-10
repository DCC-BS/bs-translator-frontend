<script lang="ts" setup>
import type { ChatStatus } from "ai";

interface InputProps {
    align: "start" | "end",
    status: ChatStatus
}

const props = defineProps<InputProps>();

// Emit event to pass submit action to parent component
const emit = defineEmits<{
    submit: [text: string]
}>();

const container = shallowRef<HTMLElement>();

onMounted(() => {
    const el = container.value;

    if(el && props.align === "end") {
        el.replaceChildren(
            ...Array.from(el.children).reverse()
        );
    }
});

const text = ref("");

function onSubmit() {
    // Emit the submit event with the current text value
    emit('submit', text.value);
    text.value = "";
}

// const status = ref<ChatStatus>("ready");
</script>


<template>
    <div class="flex justify-stretch gap-2" ref="container">
        <UButton  class="aspect-square w-15 flex items-center justify-center" @click="onSubmit">
            <UIcon name="i-lucide-mic" class="w-5 h-5" />
        </UButton>

        <UChatPrompt class="grow w-full" v-model="text" @submit="onSubmit">
            <UChatPromptSubmit :status="props.status" />
        </UChatPrompt>
    </div>
</template>
