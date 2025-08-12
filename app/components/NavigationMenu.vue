<script lang="ts" setup>
import { DisclaimerButton } from "@dcc-bs/common-ui.bs.js";
import type { NavigationMenuItem } from "#ui/components/NavigationMenu.vue";

const { t, locale, locales, setLocale } = useI18n();

const availableLocales = computed(() => {
    return locales.value.filter((i) => i.code !== locale.value);
});

// Navigation menu items
const items = computed<NavigationMenuItem[][]>(() => [
    [
        {
            slot: "disclaimer",
        },
    ],
    [
        {
            label: t("navigation.app"),
            class: "text-md md:text-4xl font-bold bg-gradient-to-r text-cyan-600 hover:text-cyan-600",
        },
    ],
    [
        {
            label: t("navigation.languages"),
            icon: "i-heroicons-language",
            children: availableLocales.value.map((locale) => ({
                label: locale.name,
                onSelect: async () => setLocale(locale.code),
            })),
        },
    ],
]);
</script>

<template>
    <div>
        <UNavigationMenu content-orientation="vertical" variant="link" :items="items"
            class="w-full justify-between align-top z-50">
            <template #disclaimer>
                <DisclaimerButton variant="ghost" />
            </template>
        </UNavigationMenu>
    </div>
</template>