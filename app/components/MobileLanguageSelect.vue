<script lang="ts" setup>
import { AnimatePresence, motion } from "motion-v";
import { type Language, languages } from "~/models/languages";

const props = defineProps<{
    includeAutoDetect?: boolean;
    detectedLanguageCode?: string;
    isDetectingLanguage?: boolean;
}>();

const { t } = useI18n();

const isOpen = ref(false);
const search = ref("");

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
    isOpen.value = false;
    search.value = "";
}

watch(isOpen, (open) => {
    if (!open) search.value = "";
});
</script>

<template>
    <UButton variant="ghost" size="sm" @click="isOpen = true">
        <div v-if="selectedLanguage" class="flex items-center gap-1.5">
            <UIcon
                :name="selectedLanguage.icon"
                :class="{
                    'animate-spin':
                        isDetectingLanguage &&
                        selectedLanguage.code === 'auto',
                }"
                size="sm"
            />
            <span class="text-sm">{{ selectedLanguage.name }}</span>
            <UIcon name="i-lucide-chevron-down" size="xs" class="opacity-50" />
        </div>
    </UButton>

    <UDrawer v-model:open="isOpen" :title="t('conversation.selectLanguage')" handle>
        <template #body>
            <div class="flex flex-col h-full">
                <div class="px-4 pb-3">
                    <UInput
                        v-model="search"
                        icon="i-lucide-search"
                        :placeholder="t('conversation.searchLanguage')"
                        size="lg"
                    />
                </div>
                <div class="flex-1 overflow-y-auto px-2 pb-4">
                    <motion.button
                        v-for="(item, index) in items"
                        :key="item.code"
                        class="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left active:bg-primary-100 transition-colors"
                        :class="{
                            'bg-primary-100': item.code === selectedCode,
                        }"
                        :initial="{ opacity: 0, x: -20 }"
                        :animate="{
                            opacity: 1,
                            x: 0,
                            transition: {
                                delay: Math.min(index * 0.03, 0.6),
                                duration: 0.25,
                                ease: 'easeOut',
                            },
                        }"
                        @click="select(item.code)"
                    >
                        <UIcon :name="item.icon" size="lg" />
                        <span class="text-base">{{ item.name }}</span>
                        <AnimatePresence>
                            <motion.div
                                v-if="item.code === selectedCode"
                                :initial="{ scale: 0 }"
                                :animate="{
                                    scale: [0, 1.3, 1],
                                    transition: { duration: 0.3, type: 'spring', stiffness: 400 },
                                }"
                                :exit="{ scale: 0, transition: { duration: 0.15 } }"
                                class="ml-auto"
                            >
                                <UIcon name="i-lucide-check" class="text-primary" />
                            </motion.div>
                        </AnimatePresence>
                    </motion.button>
                    <p
                        v-if="items.length === 0"
                        class="text-center py-8 opacity-50"
                    >
                        {{ t("conversation.noLanguageFound") }}
                    </p>
                </div>
            </div>
        </template>
    </UDrawer>
</template>
