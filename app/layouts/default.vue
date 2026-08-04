<script lang="ts" setup>
const onboardingBuilder = useOnboardingTour();
</script>


<template>
    <FirstRunOrchestrator :onboarding-builder="onboardingBuilder" :disclaimer="{ appName: 'BS Übersetzer' }" />
    <div class="flex flex-col h-dvh">
        <NavigationMenu />
        <div class="flex-1 min-h-0">
            <slot />
        </div>
        <!-- Footer section with branding and feedback -->
        <div class="flex items-center justify-between px-2 py-1">
            <DataBsFooter />
            <FeedbackControl inline />
        </div>
    </div>
</template>
