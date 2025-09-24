<script lang="ts" setup>


</script>

<template>
    <Disclaimer app-name="BS Übersetzer" />
    <FeedbackControl />
    <UApp>
        <NavigationBar />
        <div class="h-[calc(100vh-70px)] flex flex-col justify-stretch">
            <div class="h-full flex-grow">
                <slot />
            </div>
            <DataBsFooter />
        </div>
    </UApp>
</template>