<script lang="ts" setup>
import CircleButton from "./CircleButton.vue";
import { languages } from "~/models/languages";

const languageIcon = ref(languages[0]!.icon);

const currentLanguage = ref(languages[1]!.icon);

onMounted(() => {});
</script>

<template>
    <div class="grid grid-cols-3 gap-4 p-4 justify-center aling-items-center">
        <!-- Additional settings -->
        <div>
            <UPopover>
                <CircleButton>
                    <UIcon name="i-lucide-ellipsis" />
                </CircleButton>

            <template #content>
                <div>
                    <CircleButton>
                        <UIcon name="i-lucide-undo" />
                    </CircleButton>
                </div>
            </template>

            </UPopover>
        </div>
        <!-- Mic button -->
        <div class="m-auto">
            <UChip size="2xl" inset color="secondary">
                <template #content>
                    <UIcon :name="currentLanguage" />
                </template>
                <CircleButton @click="() => $emit('mic-click')" color="error">
                <UIcon name="i-lucide-mic" size="24" />
            </CircleButton>
            </UChip>
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
