<script lang="ts" setup>
import { type Domain, domains } from "~/models/domain";

const { t } = useI18n();

const items = computed(() =>
    domains.map((domain) => ({
        value: domain,
        label: t(`domains.${domain}`),
    })),
);

const selectedDomain = defineModel<Domain>({
    default: domains[0], // Default to the first domain
});
</script>

<template>
    <div class="overflow-auto max-h-[500px]">
        <URadioGroup v-model="selectedDomain" color="primary" variant="table" :items="items" />
    </div>
</template>