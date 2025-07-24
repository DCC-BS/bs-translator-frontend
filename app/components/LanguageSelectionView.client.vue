<script lang="ts" setup>
import { type Language, languages } from "~/models/languages";

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
            code: "auto",
            name: t("languages.auto"),
            icon: "i-heroicons-magnifying-glass-circle",
        });
    }

    return values;
});

const selectedCode = defineModel<string>();
const selectedLanguage = ref<Language & { name: string }>(
    items.value[0] ?? {
        code: "auto",
        name: t("languages.auto"),
        icon: "i-heroicons-magnifying-glass-circle",
    },
);

watch(selectedLanguage, (newValue) => {
    if (newValue) {
        selectedCode.value = newValue.code;
    }
});

watch(
    selectedCode,
    () => {
        if (
            selectedCode.value &&
            selectedCode.value !== selectedLanguage.value.code
        ) {
            const found = items.value.find(
                (lang) => lang.code === selectedCode.value,
            );

            if (found) {
                selectedLanguage.value = found;
            }
        }
    },
    { immediate: true },
);
</script>

<template>
    <USelectMenu class="min-w-[250px]" v-model="selectedLanguage" :items="items">
        <div class="flex items-center">
            <UIcon :name="selectedLanguage.icon" class="mr-2" />
            <span>{{ selectedLanguage.name }}</span>
        </div>
        <template #item="{ item }">
            <UIcon :name="item.icon" class="mr-2" />
            <span>{{ item.name }}</span>
        </template>
    </USelectMenu>
</template>