<script lang="ts" setup>
import { Disclaimer } from "@dcc-bs/common-ui.bs.js";
</script>

<template>
    <Disclaimer app-name="BS Übersetzer" />
    <FeedbackControl />
    <UApp>
        <ClientOnly>
            <NavigationMenu />
        </ClientOnly>
        <slot />
    </UApp>
</template>