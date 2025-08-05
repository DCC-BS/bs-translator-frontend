<script lang="ts" setup>
import { Disclaimer } from "@dcc-bs/common-ui.bs.js";
</script>

<template>
  <Disclaimer app-name="BS Überseter" />
  <FeedbackControl />
  <UApp>
    <NavigationMenu />
    <slot />
  </UApp>
</template>