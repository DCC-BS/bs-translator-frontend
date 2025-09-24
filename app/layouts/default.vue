<script lang="ts" setup>


</script>

<template>
    <Disclaimer app-name="BS Übersetzer" />
    <FeedbackControl />
    <UApp>
        <NavigationBar />
        <div class="h-[calc(100vh-56px)] flex flex-col justify-stretch">
            <slot />
            <DataBsFooter />
        </div>
    </UApp>
</template>