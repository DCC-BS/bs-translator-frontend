<script lang="ts" setup>
defineProps<{
    disabled?: boolean;
    color?:
        | "error"
        | "primary"
        | "secondary"
        | "success"
        | "info"
        | "warning"
        | "neutral";
}>();

const emit = defineEmits<{
    click: [event: MouseEvent];
}>();
</script>

<template>
    <UButton
        size="xl"
        :color="color"
        :disabled="disabled"
        class="rounded-full w-16 h-16 flex items-center justify-center"
        @click="emit('click', $event)"
    >
        <slot />
    </UButton>
</template>
