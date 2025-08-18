<script lang="ts" setup>
import { DisclaimerButton } from "@dcc-bs/common-ui.bs.js";
import type { DropdownMenuItem } from "@nuxt/ui";

const { t, locale, locales, setLocale } = useI18n();

const availableLocales = computed(() => {
    return locales.value.filter((i) => i.code !== locale.value);
});

// Navigation menu items
const items = computed<DropdownMenuItem[]>(() =>
    availableLocales.value.map((locale) => ({
        label: locale.name,
        onSelect: async () => setLocale(locale.code),
    })),
);
</script>

<template>
    <div class="flex justify-between gap-2 p-2 w-full z-50">
        <DisclaimerButton variant="ghost" />
        <div class="text-md md:text-4xl font-bold bg-gradient-to-r text-cyan-600 hover:text-cyan-600">
            {{ t("navigation.app") }}
        </div>
        <UDropdownMenu :items="items">
            <UButton variant="ghost" :label="t('navigation.languages')" icon="i-lucide-languages">
            </UButton>
        </UDropdownMenu>
    </div>
</template>