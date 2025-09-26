<script lang="ts" setup>
import type { DropdownMenuItem, TabsItem } from "@nuxt/ui";
import type { Domain } from "~/models/domain";
import type { Tone } from "~/models/tone";

const { t } = useI18n();

const tone = defineModel<Tone>("tone");
const domain = defineModel<Domain>("domain");
const glossary = defineModel<string>("glossary");

const items = computed<DropdownMenuItem[]>(() => [
    {
        label: t("ui.tone"),
        value: "new",
        children: [
            {
                slot: "tone",
            },
        ],
    },
    {
        label: t("ui.domain"),
        value: "load",
        children: [
            {
                slot: "domain",
            },
        ],
    },
    {
        label: t("ui.glossary"),
        value: "save",
        children: [
            {
                slot: "glossary",
            },
        ],
    },
]);

const isOpen = ref(false);

const tabs = ref<TabsItem[]>([
    {
        label: t("ui.tone"),
        slot: "tone",
    },
    {
        label: t("ui.domain"),
        slot: "domain",
    },
    {
        label: t("ui.glossary"),
        slot: "glossary",
    },
]);
</script>

<template>
    <UDrawer>
        <UButton class="md:hidden" icon="i-lucide-menu" color="neutral" variant="ghost" @click="isOpen = !isOpen">
        </UButton>

        <template #content>
            <UTabs :items="tabs">
                <template #tone>
                    <ToneSelectionView v-model="tone" />
                </template>
                <template #domain>
                    <DomainSelectionView v-model="domain" />
                </template>
                <template #glossary>
                    <GlossarySelectionView v-model="glossary" class="max-w-md" />
                </template>
            </UTabs>
        </template>
    </UDrawer>

    <div class="hidden md:flex flex-1 justify-end mb-2">
        <UPopover :ui="{ content: 'bg-none ring-0 shadow-none' }">
            <UButton variant="link" color="neutral" trailing-icon="i-lucide-chevron-down">{{
                t('ui.tone') }}</UButton>
            <template #content>
                <ToneSelectionView v-model="tone" />
            </template>
        </UPopover>
        <UPopover :ui="{ content: 'bg-none ring-0 shadow-none' }">
            <UButton variant="link" color="neutral" trailing-icon="i-lucide-chevron-down">{{
                t('ui.domain') }}</UButton>

            <template #content>
                <DomainSelectionView v-model="domain" />
            </template>
        </UPopover>
        <UPopover>
            <UButton variant="link" color="neutral" leading-icon="i-lucide-book-text"
                trailing-icon="i-lucide-chevron-down">
                {{
                    t('ui.glossary') }}</UButton>
            <template #content>
                <GlossarySelectionView v-model="glossary" class="max-w-md" />
            </template>
        </UPopover>
    </div>
</template>