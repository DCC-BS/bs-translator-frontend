<script lang="ts" setup>
import { type Language, languages } from '~/models/languages';

const props = defineProps<{
    includeAutoDetect?: boolean;
}>();

const { t } = useI18n();

const items = computed(() => {
    const values = languages.map((lang) => ({
        ...lang,
        name: t(`languages.${lang.code}`),
    }));

    if (props.includeAutoDetect) {
        values.unshift({
            code: 'auto',
            name: t('languages.auto'),
            icon: 'i-heroicons-magnifying-glass-circle',
        });
    }

    return values;
});

const selectedLanguage = defineModel<string>();
const selected = ref<Language & { name: string }>();

onMounted(() => {
    selected.value = items.value.find(lang => lang.code === selectedLanguage.value) || items.value[0];
});

watch(selected, (newValue) => {
    if (newValue) {
        selectedLanguage.value = newValue.code;
    }
});

watch(selectedLanguage, () => {
    if (selectedLanguage.value && selectedLanguage.value !== (selected.value?.code ?? '')) {
        selected.value = items.value.find(lang => lang.code === selectedLanguage.value) || items.value[0]
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