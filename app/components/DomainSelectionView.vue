<script lang="ts" setup>
import { domains, type Domain } from '~/models/domain';

const { t } = useI18n();

const items = computed(() => domains.map((domain) => ({
  value: domain,
  name: t(`domains.${domain}`),
})));

const selectedDomain = defineModel<Domain>({
  default: domains[0], // Default to the first domain
});

</script>

<template>
  <USelectMenu v-model="selectedDomain" :items="items" :value-key="'value'">
    <span>{{ t(`domains.${selectedDomain}`) }}</span>
    <template #item="{ item }">
      <span>{{ item.name }}</span>
    </template>
  </USelectMenu>
</template>