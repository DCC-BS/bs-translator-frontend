<script lang="ts" setup>
import { type Tone, tones } from "~/models/tone";

const { t } = useI18n();

const items = computed(() =>
    tones.map((tone) => ({
        value: tone,
        name: t(`tones.${tone}`),
    })),
);

const selectedTone = defineModel<Tone>({
    default: tones[0], // Default to the first tone
});
</script>

<template>
  <USelectMenu v-model="selectedTone" :items="items" :value-key="'value'">
    <span>{{ t(`tones.${selectedTone}`) }}</span>
    <template #item="{ item }">
      <span>{{ item.name }}</span>
    </template>
  </USelectMenu>
</template>



<style></style>