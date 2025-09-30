<script setup lang="ts">
import type { TableColumn, TableRow } from "@nuxt/ui";

type GlossaryEntry = {
    term: string;
    description: string;
};

const selectedGlossary = defineModel<string>({
    default: "",
});

const { t } = useI18n();

const glossary = ref<GlossaryEntry[]>([]);
const filter = ref("");

const UButton = resolveComponent("UButton");

// Template refs for focusing on inputs
const termInputRefs = ref<(HTMLElement | { $el: HTMLElement })[]>([]);
const descriptionInputRefs = ref<(HTMLElement | { $el: HTMLElement })[]>([]);

const columns = computed<TableColumn<GlossaryEntry>[]>(() => [
    { accessorKey: "term", header: t("ui.glossaryTerm") },
    { accessorKey: "description", header: t("ui.glossaryDescription") },
    {
        id: "actions",
        cell: ({ row }) => {
            return h(UButton, {
                icon: "i-lucide-trash-2",
                color: "error",
                variant: "link",
                size: "sm",
                tabindex: -1,
                disabled: row.index === glossary.value.length - 1,
                onClick: () => {
                    glossary.value.splice(row.index, 1);
                    selectedGlossary.value = convertToString(glossary.value);
                },
            });
        },
    },
]);

watch(
    selectedGlossary,
    (newVal) => {
        const current = convertToString(glossary.value);

        if (newVal !== current) {
            glossary.value = fromString(newVal);
        }

        ensureEmptyEntry();
    },
    { immediate: true },
);

// Focus on the last entry when component is mounted
onMounted(() => {
    nextTick(() => {
        focusLastEntry();
    });
});

function onBlur() {
    ensureEmptyEntry();

    selectedGlossary.value = convertToString(glossary.value);
}

function ensureEmptyEntry() {
    const last = glossary.value[glossary.value.length - 1];

    if (!last || last.term.trim() !== "" || last.description.trim() !== "") {
        glossary.value.push({ term: "", description: "" });

        // Focus on the new empty entry after DOM update
        nextTick(() => {
            focusLastEntry();
        });
    }
}

/**
 * Focus on the term input of the last glossary entry
 */
function focusLastEntry(): void {
    const lastIndex = glossary.value.length - 1;
    if (lastIndex >= 0 && termInputRefs.value[lastIndex]) {
        const inputRef = termInputRefs.value[lastIndex];
        // Handle both direct HTML element and component with $el property
        const inputElement =
            "$el" in inputRef
                ? inputRef.$el?.querySelector("input")
                : inputRef instanceof HTMLInputElement
                    ? inputRef
                    : (inputRef as HTMLElement)?.querySelector("input");
        inputElement?.focus();
    }
}

function convertToString(glossary: GlossaryEntry[]): string {
    const glossaryStr = glossary
        .filter(
            ({ term, description }) =>
                term.trim().length > 0 && description.trim().length > 0,
        )
        .map(({ term, description }) => `${term}: ${description}`)
        .join("; ");
    return glossaryStr;
}

function fromString(glossaryStr: string): GlossaryEntry[] {
    // Begriff1: Beschreibung1; Begriff2: Beschreibung2

    const glossary: GlossaryEntry[] = [];
    const entries = glossaryStr
        .split(";")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    for (const entry of entries) {
        const [term, description] = entry.split(":").map((part) => part.trim());
        if (term && description) {
            glossary.push({ term, description });
        }
    }
    return glossary;
}

function filterEntry(row: TableRow<GlossaryEntry>): boolean {
    if (
        row.original.term.trim() === "" ||
        row.original.description.trim() === ""
    ) {
        return true;
    }

    if (row.original.term.toLowerCase().includes(filter.value.toLowerCase())) {
        return true;
    }

    if (
        row.original.description
            .toLowerCase()
            .includes(filter.value.toLowerCase())
    ) {
        return true;
    }

    return false;
}
</script>

<template>
    <div class="p-2">
        <div class="w-full">
            <UInput v-model="filter" :placeholder="$t('ui.glossaryFilter')" size="sm" clearable class="w-full" />
        </div>
        <UTable class="h-[95%]" :data="glossary" :columns="columns" v-model:global-filter="filter"
            :global-filter-options="{ globalFilterFn: filterEntry }" :ui="{ td: 'p-0 m-0' }">
            <template #term-cell="{ row }">
                <UInput :ref="(el) => { if (el) termInputRefs[row.index] = el as any; }" v-model="row.original.term"
                    :placeholder="$t('ui.glossaryTerm')" variant="ghost" :ui="{ root: 'm-0 p-0', base: 'rounded-none' }"
                    @blur="onBlur" />
            </template>

            <template #description-cell="{ row }">
                <UInput :ref="(el) => { if (el) descriptionInputRefs[row.index] = el as any; }"
                    v-model="row.original.description" :placeholder="$t('ui.glossaryDescription')" variant="ghost"
                    :ui="{ root: 'm-0 p-0', base: 'rounded-none' }" @blur="onBlur" />
            </template>
        </UTable>
    </div>
</template>