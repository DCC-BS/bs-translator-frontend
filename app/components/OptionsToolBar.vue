<script lang="ts" setup>
import type { TabsItem } from "@nuxt/ui";
import type { Domain } from "~/models/domain";
import type { Tone } from "~/models/tone";

const { t } = useI18n();

const tone = defineModel<Tone>("tone");
const domain = defineModel<Domain>("domain");
const glossary = defineModel<string>("glossary");

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
        <UButton class="md:hidden" icon="i-lucide-menu" color="neutral" variant="ghost">
        </UButton>

        <template #content>
            <UTabs :items="tabs" :ui="{ content: 'h-[75dvh]' }" class="my-2">
                <template #tone>
                    <ToneSelectionView v-model="tone" />
                </template>
                <template #domain>
                    <DomainSelectionView v-model="domain" />
                </template>
                <template #glossary>
                    <GlossarySelectionView v-model="glossary" class="max-w-md h-full" />
                </template>
            </UTabs>
        </template>
    </UDrawer>

    <div class="hidden md:flex flex-1 justify-end mb-2">
        <UPopover :ui="{ content: 'bg-none ring-0 shadow-none' }">
            <UButton variant="link" color="neutral" trailing-icon="i-lucide-chevron-down" data-testid="tone-button">{{
                t('ui.tone') }}</UButton>
            <template #content>
                <ToneSelectionView v-model="tone" />
            </template>
        </UPopover>
        <UPopover :ui="{ content: 'bg-none ring-0 shadow-none' }">
            <UButton variant="link" color="neutral" trailing-icon="i-lucide-chevron-down" data-testid="domain-button">{{
                t('ui.domain') }}</UButton>

            <template #content>
                <DomainSelectionView v-model="domain" />
            </template>
        </UPopover>
        <UPopover>
            <UButton variant="link" color="neutral" leading-icon="i-lucide-book-text"
                trailing-icon="i-lucide-chevron-down" data-testid="glossary-button">
                {{
                    t('ui.glossary') }}</UButton>
            <template #content>
                <GlossarySelectionView v-model="glossary" class="max-w-md max-h-[calc(100vh-140px)] overflow-auto" />
            </template>
        </UPopover>
    </div>
</template>