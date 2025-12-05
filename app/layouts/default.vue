<script lang="ts" setup>


</script>

<template>
    <Changelogs />
    <Onboarding />
    <Disclaimer app-name="BS Übersetzer" />
    <FeedbackControl />
    <UApp>
        <NavigationMenu />
        <div class="h-[600px] md:h-[calc(100vh-100px)] flex flex-col">
            <div class="grow">
                <slot />
            </div>
            <DataBsFooter />
        </div>
    </UApp>
</template>