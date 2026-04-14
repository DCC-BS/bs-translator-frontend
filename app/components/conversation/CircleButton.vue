<script lang="ts" setup>
const props = defineProps<{
    onClick?: (e: MouseEvent) => void;
    color?:
        | "error"
        | "primary"
        | "secondary"
        | "success"
        | "info"
        | "warning"
        | "neutral";
}>();
</script>

<template>
    <UButton
        size="xl"
        :color="color"
        class="rounded-full w-16 h-16 flex items-center justify-center"
        @click="onClick"
    >
        <slot />
    </UButton>
</template>
