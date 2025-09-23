<script lang="ts" setup>
import { Disclaimer } from "@dcc-bs/common-ui.bs.js";
</script>

<template>
    <UApp>
        <button class="button is-link">
            <icon-symbol-add aria-hidden="true"></icon-symbol-add>
            Click me!
        </button>
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>