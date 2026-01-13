<script lang="ts" setup>
import { type Language, languages } from "~/models/languages";

const props = defineProps<{
    includeAutoDetect?: boolean;
    detectedLanguageCode?: string;
}>();

const { t } = useI18n();

const items = computed(() => {
    const x = languages.map((lang) => ({
        ...lang,
        name: t(`languages.${lang.code}`),
    }));

    const head = x.slice(0, 5);
    const tail = x.slice(5).sort((a, b) => a.name.localeCompare(b.name));

    const values = [...head, ...tail];

    if (props.includeAutoDetect) {
        let name = t("languages.auto");
        if (props.detectedLanguageCode) {
            const detectedName = t(`languages.${props.detectedLanguageCode}`);
            name = t("languages.auto_detected", [detectedName]);
        }
        values.unshift({
            code: "auto",
            name: name,
            icon: "i-lucide-scan-search",
        });
    }

    return values;
});

const selectedCode = defineModel<string>();

/**
 * Writable computed to handle the selection object for USelectMenu.
 * This ensures that when the items array re-calculates (e.g. after detection),
 * the displayed item is always the fresh object from the items array.
 */
const selectedLanguage = computed({
    get: () => {
        const found = items.value.find((lang) => lang.code === selectedCode.value);
        if (found) return found;

        // Fallback to the first item, or a safe default if items is empty (unlikely)
        return (
            items.value[0] ?? {
                code: "auto",
                name: t("languages.auto"),
                icon: "i-lucide-scan-search",
            }
        );
    },
    set: (newValue) => {
        if (newValue) {
            selectedCode.value = newValue.code;
        }
    },
});
</script>

<template>
    <USelectMenu class="md:min-w-[250px]" v-model="selectedLanguage" :filter-fields="['name', 'code']" :items="items"
        variant="none">
        <div v-if="selectedLanguage" class="flex items-center">
            <UIcon :name="selectedLanguage.icon" class="mr-1 md:mr-2" size="sm" />
            <span class="text-sm">{{ selectedLanguage.name }}</span>
        </div>
        <template #item="{ item }">
            <UIcon :name="item.icon" class="mr-1 md:mr-2" />
            <span>{{ item.name }}</span>
        </template>
    </USelectMenu>
</template>