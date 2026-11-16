<script lang="ts" setup>
</script>

<template>
    <!-- No onboarding builder: the tour targets elements of the default layout. -->
    <FirstRunOrchestrator :disclaimer="{ appName: 'BS Übersetzer' }" />
    <div class="flex flex-col h-dvh">
        <NavigationMenu :in-conversation="true" />
        <div class="flex-1 min-h-0 relative">
            <slot />
        </div>
    </div>
</template>
