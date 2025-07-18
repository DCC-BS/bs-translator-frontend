<script lang="ts" setup>
import { type Language, languages } from '~/models/languages';

const { t } = useI18n();

const items = computed(() => languages.map((lang) => ({
    ...lang,
    name: t(`languages.${lang.code}`),
})));

const selectedLanguage = defineModel<string>();
const selected = ref<Language & { name: string }>();

onMounted(() => {
    selected.value = items.value.find(lang => lang.code === 'en') || items.value[0];
});

watch(selected, (newValue) => {
    if (newValue) {
        selectedLanguage.value = newValue.code;
    }
});

</script>

<template>
    <USelectMenu class="min-w-[200px]" v-model="selected" :filter-fields="['name']" :icon="selected?.icon"
        :items="items">
        <span>{{ selected?.name }}</span>
        <template #item="{ item }">
            <UIcon :name="item.icon" class="mr-2" />
            <span>{{ item.name }}</span>
        </template>
    </USelectMenu>
</template>