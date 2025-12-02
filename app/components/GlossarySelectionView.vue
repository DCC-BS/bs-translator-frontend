<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";

type GlossaryEntry = {
    id: string;
    term: string;
    description: string;
};

const selectedGlossary = defineModel<string>({
    default: "",
});

const { t } = useI18n();

const glossary = ref<GlossaryEntry[]>([]);
const filter = ref("");

const termInputRefs = ref<(HTMLElement | { $el: HTMLElement })[]>([]);

function updateSelectedGlossaryFromState(): void {
    selectedGlossary.value = convertToString(glossary.value);
}

function getInnerInputFromRef(
    refCandidate: HTMLElement | { $el: HTMLElement } | undefined,
): HTMLInputElement | null {
    if (!refCandidate) return null;
    const root: HTMLElement =
        "$el" in refCandidate ? refCandidate.$el : refCandidate;
    const el =
        root instanceof HTMLInputElement ? root : root.querySelector("input");
    return (el as HTMLInputElement | null) ?? null;
}

function addEmptyRowAndFocus(): void {
    const newId = uuidv4();
    glossary.value.push({ id: newId, term: "", description: "" });
    updateSelectedGlossaryFromState();
    nextTick(() => {
        setTimeout(() => {
            focusLastEntry();
        }, 0);
    });
}

const visibleEntries = computed(() => {
    const q = (filter.value ?? "").toString().toLowerCase();
    return glossary.value
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => {
            // Always show rows with empty fields (like the trailing empty row)
            if (entry.term.trim() === "" || entry.description.trim() === "") {
                return true;
            }
            if (!q) {
                return true;
            }
            return (
                entry.term.toLowerCase().includes(q) ||
                entry.description.toLowerCase().includes(q)
            );
        });
});

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

    const stringValue = convertToString(glossary.value);
    selectedGlossary.value = stringValue;
}

function ensureEmptyEntry() {
    const last = glossary.value[glossary.value.length - 1];

    const lastHasTerm = last && last.term.trim() !== "";
    const lastHasDescription = last && last.description.trim() !== "";
    const shouldAddEmpty = !last || (lastHasTerm && lastHasDescription);

    if (shouldAddEmpty) {
        addEmptyRowAndFocus();
    }
}

/**
 * Focus on the term input of the last glossary entry
 * Retries if the ref isn't available yet (for timing issues with DOM updates)
 */
function focusLastEntry(retryCount = 0): void {
    const lastIndex = glossary.value.length - 1;
    if (lastIndex < 0) return;

    const refInput = getInnerInputFromRef(termInputRefs.value[lastIndex]);

    const id = glossary.value[lastIndex]?.id;
    const fallbackInput = id
        ? (document.querySelector(
              `#term-${id} input`,
          ) as HTMLInputElement | null)
        : null;

    const input = (refInput as HTMLInputElement | null) ?? fallbackInput;
    if (input) {
        input.focus();
        return;
    }

    // Retry a few times to allow DOM to render
    if (retryCount < 8) {
        nextTick(() => setTimeout(() => focusLastEntry(retryCount + 1), 0));
    }
}

function deleteRowAt(index: number): void {
    glossary.value.splice(index, 1);
    updateSelectedGlossaryFromState();
}

function convertToString(glossary: GlossaryEntry[]): string {
    const filteredGlossary = glossary.filter(
        ({ term, description }) =>
            term.trim().length > 0 && description.trim().length > 0,
    );

    const glossaryStr = filteredGlossary
        .map(({ term, description }) => `${term}: ${description}`)
        .join("; ");

    return glossaryStr;
}

function fromString(glossaryStr: string): GlossaryEntry[] {
    const glossary: GlossaryEntry[] = [];
    const entries = glossaryStr
        .split(";")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    for (const entry of entries) {
        const [term, description] = entry.split(":").map((part) => part.trim());

        if (term && description) {
            const newId = uuidv4();
            glossary.push({ id: newId, term, description });
        }
    }

    return glossary;
}

// Filtering is handled by visibleEntries
</script>

<template>
    <div class="p-2">
        <div class="w-full">
            <UInput v-model="filter" :placeholder="$t('ui.glossaryFilter')" size="sm" clearable class="w-full" />
        </div>
        <div class="h-[95%]">
            <div class="grid grid-cols-12 items-center px-1 py-2">
                <div class="col-span-5 text-sm font-semibold">
                    {{ $t('ui.glossaryTerm') }}
                </div>
                <div class="col-span-6 text-sm font-semibold">
                    {{ $t('ui.glossaryDescription') }}
                </div>
                <div class="col-span-1" />
            </div>
            <USeparator />
            <div v-for="(row, vIndex) in visibleEntries" :key="row.entry.id"
                class="grid grid-cols-12 items-center py-1">
                <div class="col-span-5">
                    <UInput :id="`term-${row.entry.id}`"
                        :ref="(el: unknown) => { if (el) termInputRefs[row.index] = el as any; }"
                        v-model="row.entry.term" :placeholder="$t('ui.glossaryTerm')" variant="ghost"
                        :ui="{ root: 'm-0 p-0', base: 'rounded-none' }" @blur="onBlur" />
                </div>
                <div class="col-span-6">
                    <UInput v-model="row.entry.description" :placeholder="$t('ui.glossaryDescription')" variant="ghost"
                        :ui="{ root: 'm-0 p-0', base: 'rounded-none' }" @blur="onBlur" />
                </div>
                <div class="col-span-1 flex justify-end">
                    <UButton icon="i-lucide-trash-2" color="error" variant="link" size="sm" tabindex="-1"
                        :disabled="row.index === glossary.length - 1" @click="deleteRowAt(row.index)" />
                </div>
            </div>
        </div>
    </div>
</template>