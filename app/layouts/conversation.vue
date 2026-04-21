<script lang="ts" setup>
</script>


<template>
    <Changelogs />
    <Disclaimer app-name="BS Übersetzer" />
    <div>
        <div class="fixed z-999 w-full">
            <div class="m-auto w-full max-w-[900px]">
                <NavigationMenu :showTour="false" />
            </div>
        </div>
        <slot />
    </div>
</template>
