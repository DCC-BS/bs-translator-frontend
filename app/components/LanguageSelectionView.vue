<script lang="ts" setup>
import { type Language, languages } from "~/models/languages";

const props = defineProps<{
    includeAutoDetect?: boolean;
    detectedLanguageCode?: string;
    isDetectingLanguage?: boolean;
}>();

const { t } = useI18n();

const autoOption = computed(() => {
    const detectedName = props.detectedLanguageCode
        ? t(`languages.${props.detectedLanguageCode}`)
        : undefined;

    if (props.isDetectingLanguage) {
        return {
            code: "auto",
            name: t("languages.auto_detecting"),
            icon: "i-lucide-loader-2",
        };
    }

    if (detectedName) {
        return {
            code: "auto",
            name: t("languages.auto_detected", [detectedName]),
            icon: "i-lucide-scan-search",
        };
    }

    return {
        code: "auto",
        name: t("languages.auto"),
        icon: "i-lucide-scan-search",
    };
});

const items = computed(() => {
    const x = languages.map((lang) => ({
        ...lang,
        name: t(`languages.${lang.code}`),
    }));

    const head = x.slice(0, 5);
    const tail = x.slice(5).sort((a, b) => a.name.localeCompare(b.name));

    const values = [...head, ...tail];

    if (props.includeAutoDetect) {
        values.unshift(autoOption.value);
    }

    return values;
});

const selectedCode = defineModel<string>();

const selectedLanguage = computed(() => {
    const found = items.value.find((lang) => lang.code === selectedCode.value);
    if (found) return found;

    return (
        items.value[0] ?? {
            code: "auto",
            name: t("languages.auto"),
            icon: "i-lucide-scan-search",
        }
    );
});
</script>

<template>
    <USelectMenu class="md:min-w-[250px]" v-model="selectedCode" value-key="code" :filter-fields="['name', 'code']"
        :items="items" variant="none">
        <div v-if="selectedLanguage" class="flex items-center">
            <UIcon :name="selectedLanguage.icon"
                :class="{ 'animate-spin': props.isDetectingLanguage && selectedLanguage.code === 'auto' }"
                class="mr-1 md:mr-2" size="sm" />
            <span class="text-sm">{{ selectedLanguage.name }}</span>
        </div>
        <template #item="{ item }">
            <UIcon :name="item.icon" class="mr-1 md:mr-2" />
            <span>{{ item.name }}</span>
        </template>
    </USelectMenu>
</template>