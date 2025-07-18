<script lang="ts" setup>
import { type Language, languages } from '~/models/languages';

const { t } = useI18n();

const items = computed(() => languages.map((lang) => ({
    ...lang,
    name: t(`languages.${lang.code}`),
})));

const selectedLanguage = defineModel<Language & { name: string }>({
    default: {
        ...languages[0], // Default to the first language
        name: 'bla',
    }
});
</script>

<template>
    <USelectMenu class="min-w-[200px]" v-model="selectedLanguage" :filter-fields="['name']"
        :icon="selectedLanguage?.icon" :items="items">
        <span>{{ selectedLanguage.name }}</span>
        <template #item="{ item }">
            <UIcon :name="item.icon" class="mr-2" />
            <span>{{ item.name }}</span>
        </template>
    </USelectMenu>
</template>