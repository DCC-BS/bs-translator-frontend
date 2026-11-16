<script lang="ts" setup>
import type { AudioRecorder } from "#components";

const recorder = ref<InstanceType<typeof AudioRecorder>>();

// starting (permission prompt), recording or finishing
useLeavePageGuard(() => !!recorder.value?.isBusy);
</script>

<template>
  <ClientOnly>
    <AudioRecorder ref="recorder" />

    <AudioSessionExplorer></AudioSessionExplorer>
  </ClientOnly>
</template>