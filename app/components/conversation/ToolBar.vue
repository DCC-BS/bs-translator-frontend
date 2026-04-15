<script lang="ts" setup>
import CircleButton from "./CircleButton.vue";
import { languageMap, languages, type Language } from "~/models/languages";
import MicButtonClient from "./MicButton.client.vue";

const languageIcon = ref(getLanguage("en-gb").icon);
const currentLanguage = ref<Language>();

async function onTranscription(text: string) {

}

</script>

<template>
    <div class="grid grid-cols-3 gap-4 p-4 justify-center aling-items-center">
        <!-- Additional settings -->
        <div class="flex justify-end items-center">
            <UPopover>
                <CircleButton class="w-12 h-12">
                    <UIcon name="i-lucide-ellipsis" />
                </CircleButton>

                <template #content>
                    <div class="p-2">
                        <CircleButton>
                            <UIcon name="i-lucide-undo" />
                        </CircleButton>
                    </div>
                </template>

            </UPopover>
        </div>
        <!-- Mic button -->
        <div class="m-auto">
            <ClientOnly>
                <MicButtonClient :language="currentLanguage" @transcribed="onTranscription" />
            </ClientOnly>
        </div>
        <!-- Switch button  -->
        <div class="m-auto">
            <UChip size="2xl" inset color="secondary">
                <template #content>
                    <UIcon :name="languageIcon" />
                </template>
                <CircleButton @click="() => $emit('switch-click')">
                    <UIcon name="i-lucide-arrow-left-right" size="24" />
                </CircleButton>
            </UChip>
        </div>
    </div>
</template>
