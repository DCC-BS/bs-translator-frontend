<script lang="ts" setup>
</script>

<template>
    <!-- No onboarding builder: the tour targets elements of the default layout. -->
    <FirstRunOrchestrator :disclaimer="{ appName: 'BS Übersetzer' }" />
    <div>
        <div class="fixed z-999 w-full">
            <div class="m-auto w-full max-w-[900px]">
                <NavigationMenu :inConversation="true" />
            </div>
        </div>
        <slot />
    </div>
</template>
