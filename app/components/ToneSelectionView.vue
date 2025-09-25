<script lang="ts" setup>
import { type Tone, tones } from "~/models/tone";

const { t } = useI18n();

const items = computed(() =>
    tones.map((tone) => ({
        value: tone,
        label: t(`tones.${tone}`),
    })),
);

const selectedTone = defineModel<Tone>({
    default: tones[0], // Default to the first tone
});
</script>

<template>
    <URadioGroup v-model="selectedTone" color="primary" variant="table" :items="items" />
</template>