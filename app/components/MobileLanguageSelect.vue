<script lang="ts" setup>
import { languages } from "~/models/languages";

const props = defineProps<{
    includeAutoDetect?: boolean;
    detectedLanguageCode?: string;
    isDetectingLanguage?: boolean;
}>();

const { t } = useI18n();

const search = ref("");
const isOpen = ref(false);

const autoOption = computed(() => {
    const detectedName =
        props.detectedLanguageCode && props.detectedLanguageCode !== "auto"
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

const selectedCode = defineModel<string>();

const selectedLanguage = computed(() => {
    const found = items.value.find((lang) => lang.code === selectedCode.value);
    if (found) return found;
    return autoOption.value;
});

const allItems = computed(() => {
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

const items = computed(() => {
    const q = search.value.toLowerCase().trim();
    if (!q) return allItems.value;
    return allItems.value.filter(
        (lang) =>
            lang.name.toLowerCase().includes(q) ||
            lang.code.toLowerCase().includes(q),
    );
});

function select(code: string) {
    selectedCode.value = code;
    search.value = "";
    isOpen.value = false;
}
</script>

<template>
    <UDrawer v-model:open="isOpen">
        <UButton variant="ghost" size="sm">
            <div v-if="selectedLanguage" class="flex items-center gap-1.5">
                <UIcon :name="selectedLanguage.icon" :class="{
                    'animate-spin':
                        isDetectingLanguage &&
                        selectedLanguage.code === 'auto',
                }" size="sm" />
                <span class="text-sm">{{ selectedLanguage.name }}</span>
                <UIcon name="i-lucide-chevron-down" size="xs" class="opacity-50" />
            </div>
        </UButton>
        <template #content>
            <div class="grid grid-rows-[1fr_auto] max-h-[80vh]">
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 overflow-y-auto px-2 pb-4">
                    <UButton v-for="(item, index) in items" :key="item.code" class="flex flex-col items-center gap-3"
                        @click="select(item.code)">
                        <UIcon :name="item.icon" size="xl" />
                        <span class="text-base">{{ item.name }}</span>
                    </UButton>
                    <p v-if="items.length === 0" class="text-center py-8 opacity-50">
                        {{ t("conversation.noLanguageFound") }}
                    </p>
                </div>
                <div class="px-4 pb-3 w-full">
                    <UInput v-model="search" icon="i-lucide-search" :placeholder="t('conversation.searchLanguage')"
                        size="lg" class="w-full" />
                </div>
            </div>
        </template>
    </UDrawer>
</template>
