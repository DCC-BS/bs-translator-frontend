<script lang="ts" setup>
import type { AudioRecorder } from "#components";

const recorder = ref<InstanceType<typeof AudioRecorder>>();

useLeavePageGuard(
    () => !!recorder.value?.isRecording || !!recorder.value?.isProcessing,
);
</script>

<template>
  <ClientOnly>
    <AudioRecorder ref="recorder" />

    <AudioSessionExplorer></AudioSessionExplorer>
  </ClientOnly>
</template>