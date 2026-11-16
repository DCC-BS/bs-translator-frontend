<script lang="ts" setup>
import { isApiError } from "@dcc-bs/communication.bs.js";
import { useResizeObserver } from "@vueuse/core";
import type { TranslationConfig } from "~/models/translationConfig";
import { TranslationService } from "~/services/translationService";
import type { OcrBlock } from "~~/shared/models/conversionResult";

interface InputProps {
    /** The photo, already normalized by `prepareImageForOcr` (orientation, size). */
    image: Blob;
}

const props = defineProps<InputProps>();
const emit = defineEmits<(e: "retake") => void>();

type Phase = "ocr" | "translating" | "done" | "empty" | "error";

const { t, te } = useI18n();
const logger = useLogger();
const toast = useToast();
const translationService = useService(TranslationService);
const { sourceLanguage, targetLanguage, tone, domain, glossary } =
    useTranslate();

const phase = ref<Phase>("ocr");
const errorMessage = ref<string>();
const blocks = ref<OcrBlock[]>([]);
const translations = ref<Record<string, string>>({});
const selectedIds = ref<Set<string>>(new Set());
const showOriginal = ref(false);
const showTextView = ref(false);

const translatedCount = computed(() => Object.keys(translations.value).length);
const isWorking = computed(
    () => phase.value === "ocr" || phase.value === "translating",
);

useLeavePageGuard(isWorking);

// Declared before the image watcher below, which starts the OCR immediately.
let ocrController: AbortController | undefined;
let translationController: AbortController | undefined;

// ── Image ─────────────────────────────────────────────────────────────────

const imageUrl = ref<string>();
const naturalSize = ref({ width: 0, height: 0 });

watch(
    () => props.image,
    (image, _old, onCleanup) => {
        const url = URL.createObjectURL(image);
        imageUrl.value = url;
        onCleanup(() => URL.revokeObjectURL(url));
        runOcr();
    },
    { immediate: true },
);

function onImageLoaded(event: Event): void {
    const img = event.target as HTMLImageElement;
    naturalSize.value = { width: img.naturalWidth, height: img.naturalHeight };
    zoomToFit();
}

// ── OCR and translation ───────────────────────────────────────────────────

onBeforeUnmount(() => {
    ocrController?.abort();
    translationController?.abort();
});

function describeError(error: unknown): string {
    if (isApiError(error)) {
        const key = `photo.errors.${error.errorId}`;
        if (te(key)) {
            return t(key);
        }
    }
    return t("photo.errors.generic");
}

function isAbort(error: unknown, controller: AbortController): boolean {
    return (
        controller.signal.aborted ||
        (isApiError(error) && error.errorId === "request_aborted")
    );
}

async function runOcr(): Promise<void> {
    ocrController?.abort();
    translationController?.abort();
    const controller = new AbortController();
    ocrController = controller;

    phase.value = "ocr";
    errorMessage.value = undefined;
    blocks.value = [];
    translations.value = {};
    selectedIds.value = new Set();

    try {
        const result = await translationService.ocrImage(
            props.image,
            sourceLanguage.value || "auto",
            controller.signal,
        );
        if (controller.signal.aborted) {
            return;
        }
        blocks.value = result.blocks;
        if (result.blocks.length === 0) {
            phase.value = "empty";
            return;
        }
    } catch (error) {
        if (isAbort(error, controller)) {
            return;
        }
        logger.error(error, "Photo OCR failed");
        errorMessage.value = describeError(error);
        phase.value = "error";
        return;
    }

    await runTranslation();
}

async function runTranslation(): Promise<void> {
    if (blocks.value.length === 0) {
        return;
    }
    translationController?.abort();
    const controller = new AbortController();
    translationController = controller;

    phase.value = "translating";
    errorMessage.value = undefined;
    translations.value = {};

    const config: TranslationConfig = {
        source_language: sourceLanguage.value || "auto",
        target_language: targetLanguage.value,
        domain: domain.value,
        tone: tone.value,
        glossary: glossary.value,
    };

    try {
        for await (const event of translationService.translateBlocks(
            blocks.value,
            config,
            controller.signal,
        )) {
            if (controller.signal.aborted) {
                return;
            }
            translations.value = {
                ...translations.value,
                [event.id]: event.translated,
            };
        }
        if (!controller.signal.aborted) {
            phase.value = "done";
        }
    } catch (error) {
        if (isAbort(error, controller)) {
            return;
        }
        logger.error(error, "Photo block translation failed");
        errorMessage.value = describeError(error);
        phase.value = "error";
    }
}

function retry(): void {
    if (blocks.value.length > 0) {
        runTranslation();
    } else {
        runOcr();
    }
}

// Changing a language or a translation option re-translates the blocks; the OCR
// result is kept, so the photo is not sent to OCR again.
watch([sourceLanguage, targetLanguage, tone, domain, glossary], () => {
    if (blocks.value.length > 0 && phase.value !== "ocr") {
        runTranslation();
    }
});

// ── Text of a block ───────────────────────────────────────────────────────

function displayText(block: OcrBlock): string {
    if (showOriginal.value) {
        return block.text;
    }
    return translations.value[block.id] ?? block.text;
}

function isPending(block: OcrBlock): boolean {
    return !showOriginal.value && translations.value[block.id] === undefined;
}

// ── Viewer: fit, zoom and pan ─────────────────────────────────────────────

const viewer = ref<HTMLDivElement>();
const viewerSize = ref({ width: 0, height: 0 });
const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const MIN_ZOOM_FACTOR = 0.5;
const MAX_ZOOM_FACTOR = 8;

useResizeObserver(viewer, (entries) => {
    const rect = entries[0]?.contentRect;
    if (!rect) {
        return;
    }
    viewerSize.value = { width: rect.width, height: rect.height };
    zoomToFit();
});

/** Scale at which the whole photo fits into the viewer. */
const fitScale = computed(() => {
    const { width, height } = naturalSize.value;
    if (!width || !height || !viewerSize.value.width) {
        return 1;
    }
    return Math.min(
        viewerSize.value.width / width,
        viewerSize.value.height / height,
    );
});

function zoomToFit(): void {
    const { width, height } = naturalSize.value;
    scale.value = fitScale.value;
    offset.value = {
        x: (viewerSize.value.width - width * scale.value) / 2,
        y: (viewerSize.value.height - height * scale.value) / 2,
    };
}

function zoomAt(factor: number, clientX: number, clientY: number): void {
    const rect = viewer.value?.getBoundingClientRect();
    if (!rect) {
        return;
    }
    const newScale = Math.min(
        fitScale.value * MAX_ZOOM_FACTOR,
        Math.max(fitScale.value * MIN_ZOOM_FACTOR, scale.value * factor),
    );
    const pointX = clientX - rect.left;
    const pointY = clientY - rect.top;
    const ratio = newScale / scale.value;
    offset.value = {
        x: pointX - (pointX - offset.value.x) * ratio,
        y: pointY - (pointY - offset.value.y) * ratio,
    };
    scale.value = newScale;
}

function onWheel(event: WheelEvent): void {
    zoomAt(event.deltaY > 0 ? 0.9 : 1.1, event.clientX, event.clientY);
}

const pointers = new Map<number, { x: number; y: number }>();
let lastPinchDistance = 0;
let dragDistance = 0;

// No pointer capture: it would retarget the click of a tap to the viewer, and the
// tapped block would never see it.
function onPointerDown(event: PointerEvent): void {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
        dragDistance = 0;
    }
    lastPinchDistance = 0;
}

function onPointerMove(event: PointerEvent): void {
    const previous = pointers.get(event.pointerId);
    if (!previous) {
        return;
    }
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);

    if (pointers.size === 1) {
        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        dragDistance += Math.abs(dx) + Math.abs(dy);
        offset.value = { x: offset.value.x + dx, y: offset.value.y + dy };
        return;
    }

    const [a, b] = [...pointers.values()];
    if (!a || !b) {
        return;
    }
    dragDistance = Number.POSITIVE_INFINITY;
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (lastPinchDistance > 0) {
        zoomAt(distance / lastPinchDistance, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    lastPinchDistance = distance;
}

function onPointerUp(event: PointerEvent): void {
    pointers.delete(event.pointerId);
    lastPinchDistance = 0;
}

const AVERAGE_GLYPH_WIDTH_EM = 0.6;
const LINE_HEIGHT_EM = 1.2;

/** Whether `text` wrapped at `size` px fits into a box of `width` x `height` px. */
function textFits(
    text: string,
    size: number,
    width: number,
    height: number,
): boolean {
    const charsPerLine = Math.max(
        1,
        Math.floor(width / (size * AVERAGE_GLYPH_WIDTH_EM)),
    );
    const longestWord = Math.max(...text.split(/\s+/).map((w) => w.length));
    if (longestWord > charsPerLine) {
        return false;
    }
    let lines = 0;
    for (const paragraph of text.split("\n")) {
        lines += Math.max(1, Math.ceil(paragraph.length / charsPerLine));
    }
    return lines * size * LINE_HEIGHT_EM <= height;
}

/** Largest font size (in image pixels) at which the text fits its box. */
function fontSizeFor(block: OcrBlock): number {
    const { width, height } = naturalSize.value;
    const boxWidth = (block.bbox.right - block.bbox.left) * width * 0.95;
    const boxHeight = (block.bbox.bottom - block.bbox.top) * height;
    const text = displayText(block);
    const minSize = 6;
    let size = boxHeight / LINE_HEIGHT_EM;
    if (!text || boxWidth <= 0 || size <= minSize) {
        return minSize;
    }
    while (size > minSize && !textFits(text, size, boxWidth, boxHeight)) {
        size *= 0.92;
    }
    return Math.max(minSize, size);
}

// ── Selection and copy ────────────────────────────────────────────────────

/** Click on a block in the photo: a drag or pinch that ends on a block is not a tap. */
function onBlockTapped(block: OcrBlock): void {
    if (dragDistance <= 8) {
        toggleSelection(block);
    }
}

function toggleSelection(block: OcrBlock): void {
    const next = new Set(selectedIds.value);
    if (next.has(block.id)) {
        next.delete(block.id);
    } else {
        next.add(block.id);
    }
    selectedIds.value = next;
}

function selectAll(): void {
    selectedIds.value = new Set(blocks.value.map((block) => block.id));
}

function clearSelection(): void {
    selectedIds.value = new Set();
}

async function copyText(): Promise<void> {
    const chosen =
        selectedIds.value.size > 0
            ? blocks.value.filter((block) => selectedIds.value.has(block.id))
            : blocks.value;
    const text = chosen.map(displayText).join("\n\n").trim();
    if (!text) {
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        toast.add({
            title: t("photo.copied"),
            color: "success",
            icon: "i-lucide-check",
        });
    } catch (error) {
        logger.error(error, "Failed to copy text");
        toast.add({
            title: t("photo.copyFailed"),
            color: "error",
            icon: "i-lucide-circle-x",
        });
    }
}

const isTouchDevice = ref(false);
onMounted(() => {
    isTouchDevice.value = window.matchMedia("(pointer: coarse)").matches;
});
</script>

<template>
    <div class="relative w-full h-full flex flex-col bg-neutral-900">
        <!-- Image with the translated text laid over it -->
        <div v-show="!showTextView" ref="viewer" class="relative flex-1 overflow-hidden touch-none select-none cursor-grab"
            @wheel.prevent="onWheel" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp"
            @pointercancel="onPointerUp" @pointerleave="onPointerUp">
            <div class="absolute top-0 left-0 origin-top-left" :style="{
                width: `${naturalSize.width}px`,
                height: `${naturalSize.height}px`,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }">
                <img v-if="imageUrl" :src="imageUrl" alt="" draggable="false" class="block w-full h-full"
                    @load="onImageLoaded">
                <button v-for="block in blocks" :key="block.id" type="button"
                    class="absolute overflow-hidden rounded-sm text-left leading-[1.2] text-black wrap-break-word transition-colors"
                    :class="[
                        selectedIds.has(block.id) ? 'bg-sky-200/90 outline-2 outline-sky-600' : 'bg-white/85',
                        isPending(block) ? 'animate-pulse text-neutral-500' : '',
                    ]" :style="{
                        left: `${block.bbox.left * 100}%`,
                        top: `${block.bbox.top * 100}%`,
                        width: `${(block.bbox.right - block.bbox.left) * 100}%`,
                        height: `${(block.bbox.bottom - block.bbox.top) * 100}%`,
                        fontSize: `${fontSizeFor(block)}px`,
                    }" @click="onBlockTapped(block)">
                    {{ displayText(block) }}
                </button>
            </div>

            <div v-if="phase === 'ocr'"
                class="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-black/40 text-white pointer-events-none">
                <UIcon name="i-lucide-scan-text" class="size-10 animate-pulse" />
                <span>{{ t('photo.recognizing') }}</span>
            </div>
        </div>

        <!-- The same blocks as plain text, for reading and copying on small screens -->
        <div v-if="showTextView" class="flex-1 overflow-y-auto bg-white p-4 pt-16 space-y-3">
            <div v-for="block in blocks" :key="block.id" class="rounded-md border border-neutral-200 p-3"
                :class="{ 'bg-sky-50 border-sky-400': selectedIds.has(block.id) }" @click="toggleSelection(block)">
                <p class="text-xs text-neutral-500">{{ block.text }}</p>
                <p :class="{ 'animate-pulse text-neutral-400': isPending(block) }">{{ displayText(block) }}</p>
            </div>
        </div>

        <!-- Top bar -->
        <div class="absolute top-0 left-0 right-0 p-3 flex justify-between pointer-events-none">
            <UButton icon="i-lucide-camera" color="neutral" size="xl" class="rounded-full pointer-events-auto"
                :title="t('photo.retake')" :aria-label="t('photo.retake')" @click="emit('retake')" />
            <div class="flex gap-2 pointer-events-auto">
                <UButton :icon="showOriginal ? 'i-lucide-eye-off' : 'i-lucide-eye'" color="neutral" size="xl"
                    class="rounded-full" :disabled="blocks.length === 0"
                    :title="showOriginal ? t('photo.showTranslation') : t('photo.showOriginal')"
                    :aria-label="showOriginal ? t('photo.showTranslation') : t('photo.showOriginal')"
                    @click="showOriginal = !showOriginal" />
                <UButton :icon="showTextView ? 'i-lucide-image' : 'i-lucide-list'" color="neutral" size="xl"
                    class="rounded-full" :disabled="blocks.length === 0"
                    :title="showTextView ? t('photo.imageView') : t('photo.textView')"
                    :aria-label="showTextView ? t('photo.imageView') : t('photo.textView')"
                    @click="showTextView = !showTextView" />
                <UButton v-if="!showTextView" icon="i-lucide-expand" color="neutral" size="xl" class="rounded-full"
                    :title="t('photo.fit')" :aria-label="t('photo.fit')" @click="zoomToFit" />
            </div>
        </div>

        <!-- Status, selection and language -->
        <div class="flex flex-col items-center gap-1 bg-neutral-100 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div class="flex items-center gap-2 text-sm text-neutral-700 min-h-6" aria-live="polite">
                <template v-if="phase === 'ocr'">
                    <UIcon name="i-lucide-loader-2" class="animate-spin" />
                    {{ t('photo.recognizing') }}
                </template>
                <template v-else-if="phase === 'translating'">
                    <UIcon name="i-lucide-loader-2" class="animate-spin" />
                    {{ t('photo.translating', { done: translatedCount, total: blocks.length }) }}
                </template>
                <template v-else-if="phase === 'empty'">
                    <UIcon name="i-lucide-scan-text" />
                    {{ t('photo.noText') }}
                </template>
                <template v-else-if="phase === 'error'">
                    <UIcon name="i-lucide-circle-alert" class="text-error" />
                    <span class="text-error">{{ errorMessage }}</span>
                    <UButton size="xs" icon="i-lucide-rotate-ccw" variant="soft" @click="retry">
                        {{ t('photo.retry') }}
                    </UButton>
                </template>
                <template v-else>
                    {{ isTouchDevice ? t('photo.hintTouch') : t('photo.hintMouse') }}
                </template>
            </div>

            <div class="flex flex-wrap gap-1 md:gap-3 justify-center">
                <UButton size="sm" variant="soft" :disabled="blocks.length === 0" @click="selectAll">
                    {{ t('photo.selectAll') }}
                </UButton>
                <UButton size="sm" variant="soft" :disabled="selectedIds.size === 0" @click="clearSelection">
                    {{ t('photo.clearSelection') }}
                </UButton>
                <UButton size="sm" icon="i-lucide-copy" :disabled="blocks.length === 0" @click="copyText">
                    {{ selectedIds.size > 0 ? t('photo.copySelected') : t('photo.copy') }}
                </UButton>
            </div>

            <LanguageSelectionBar v-model:source-language="sourceLanguage" v-model:target-language="targetLanguage"
                :can-switch="false" />
        </div>
    </div>
</template>
