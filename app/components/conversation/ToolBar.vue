<script lang="ts" setup>
import CircleButton from "./CircleButton.vue";
import { type Language } from "~/models/languages";
import MicButtonClient from "./MicButton.client.vue";

interface InputProps {
    currentLanguage: Language;
    othersLanguage: Language;
}

const props = defineProps<InputProps>();

const emit = defineEmits<{
    "switch-click": [];
    transcription: [text: string];
    undo: [];
    "detected-language": [code: string];
}>();
</script>

<template>
    <div class="grid grid-cols-3 gap-4 p-4 justify-center items-center">
        <div class="flex justify-end items-center">
            <UPopover>
                <CircleButton class="w-12 h-12">
                    <UIcon name="i-lucide-ellipsis" />
                </CircleButton>

                <template #content>
                    <div class="p-2">
                        <CircleButton @click="() => emit('undo')">
                            <UIcon name="i-lucide-undo" />
                        </CircleButton>
                    </div>
                </template>
            </UPopover>
        </div>
        <div class="m-auto">
            <ClientOnly>
                <MicButtonClient :language="props.currentLanguage"
                    @transcribed="(t: string) => emit('transcription', t)"
                    @detected-language="(c: string) => emit('detected-language', c)" />
            </ClientOnly>
        </div>
        <div class="m-auto">
            <CircleButton @click="() => emit('switch-click')">
                <UIcon name="i-lucide-arrow-left-right" size="24" />
            </CircleButton>
        </div>
    </div>
</template>
