<script lang="ts" setup>
import { DisclaimerButton } from "@dcc-bs/common-ui.bs.js";
import type { NavigationMenuItem } from "#ui/components/NavigationMenu.vue";

const { t, locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();

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
            class: "text-4xl font-bold bg-gradient-to-r text-cyan-600 hover:text-cyan-600",
        },
    ],
    [
        {
            label: t("navigation.languages"),
            icon: "i-heroicons-language",
            children: availableLocales.value.map((locale) => ({
                label: locale.name,
                to: switchLocalePath(locale.code),
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