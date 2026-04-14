<script lang="ts" setup>
import CircleButton from "./CircleButton.vue";

onMounted(() => {});
</script>

<template>
    <div class="grid grid-cols-3 gap-4 p-4 justify-center aling-items-center">
        <!-- Additional settings -->
        <div></div>
        <!-- Mic button -->
        <div class="m-auto">
            <CircleButton @click="() => $emit('mic-click')">
                <UIcon name="i-lucide-mic" size="24" />
            </CircleButton>
        </div>
        <!-- Switch button  -->
        <div class="m-auto">
            <CircleButton @click="() => $emit('switch-click')">
                <UIcon name="i-lucide-arrow-left-right" size="24" />
            </CircleButton>
        </div>
    </div>
</template>
