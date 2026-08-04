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
        <DataBsFooter size="sm" class="p-2">
            <template #right>
                <div class="flex justify-end">
                    <FeedbackControl inline />
                </div>
            </template>
        </DataBsFooter>
    </div>
</template>
