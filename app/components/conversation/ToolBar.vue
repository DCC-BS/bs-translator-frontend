<script lang="ts" setup>
import { motion } from "motion-v";
import type { Language } from "~/models/languages";
import CircleButton from "./CircleButton.vue";
import MicButtonClient from "./MicButton.client.vue";
import VoiceList from "./VoiceList.vue";

interface InputProps {
    currentLanguage: Language;
    othersLanguage: Language;
}

const props = defineProps<InputProps>();

const emit = defineEmits<{
    "switch-click": [];
    transcription: [text: string];
    undo: [];
}>();
</script>

<template>
    <div class="grid grid-cols-3 gap-4 p-4 justify-center items-center">
        <div class="flex justify-end items-center">
            <UPopover>
                <motion.div
                    :whilePress="{ scale: 0.85 }"
                    :transition="{
                        type: 'spring',
                        stiffness: 400,
                        damping: 17,
                    }"
                >
                    <CircleButton class="w-12 h-12">
                        <UIcon name="i-lucide-ellipsis" />
                    </CircleButton>
                </motion.div>

                <template #content>
                    <div class="p-2 gap-2 flex flex-col">
                        <!-- <UDrawer>
                            <CircleButton>
                                <UIcon name="i-lucide-megaphone" />
                            </CircleButton>
                            <template #content>
                                <VoiceList />
                            </template>
                        </UDrawer> -->

                        <CircleButton @click="() => emit('undo')">
                            <UIcon name="i-lucide-undo" />
                        </CircleButton>
                    </div>
                </template>
            </UPopover>
        </div>
        <div class="m-auto">
            <ClientOnly>
                <MicButtonClient
                    :language="props.currentLanguage"
                    @transcribed="(t: string) => emit('transcription', t)"
                />
            </ClientOnly>
        </div>
        <div class="m-auto">
            <UChip size="2xl" inset color="secondary">
                <template #content>
                    <UIcon :name="props.othersLanguage.icon" />
                </template>
                <CircleButton @click="() => emit('switch-click')">
                    <UIcon name="i-lucide-arrow-left-right" size="24" />
                </CircleButton>
            </UChip>
        </div>
    </div>
</template>
