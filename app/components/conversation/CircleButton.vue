<script lang="ts" setup>
const props = defineProps<{
    onClick: (e: MouseEvent) => void;
}>();
</script>

<template>
    <UButton
        size="xl"
        class="rounded-full w-16 h-16 flex items-center justify-center"
        @click="onClick"
    >
        <slot />
    </UButton>
</template>
