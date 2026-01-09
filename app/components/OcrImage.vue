<script lang="ts" setup>
import { TranslationService } from "~/services/translationService";

interface InputProps {
    image: Blob;
}

interface TranslatedTextBox {
    x: number;
    y: number;
    width: number;
    height: number;
    originalText: string;
    translatedText: string;
    isSelected: boolean;
    paragraphId: string; // Unique identifier for paragraph grouping
}

const props = defineProps<InputProps>();

const { sourceLanguage, targetLanguage, abort } = useTranslate();

const logger = useLogger();
const translationService = useService(TranslationService);

// State management
const translatedBoxes = ref<TranslatedTextBox[]>([]);
const isLoading = ref(true);
const isMobile = ref(false);

const isTranslatingOcr = ref(false);

// Konva stage references
const stageContainer = ref<HTMLDivElement>();
const stageRef = ref();

// Image properties
const imgUrl = computed(() => URL.createObjectURL(props.image));
const imageWidth = ref(0);
const imageHeight = ref(0);
const imgRatio = ref(1);
const imageElement = ref<HTMLImageElement>();

const abortController = ref(new AbortController());

// Stage dimensions
const stageWidth = ref(1200); // Default width
const stageHeight = ref(800); // Default height

// Zoom and pan state
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const isDragging = ref(false);

// Touch/mobile interaction state
const lastCenter = ref({ x: 0, y: 0 });
const lastDist = ref(0);
const dragStartPos = ref({ x: 0, y: 0 });
const wasPinching = ref(false);

// Zoom constraints
const minZoom = ref(0.1);
const maxZoom = ref(5);

// Text selection state
const selectedTextBoxes = computed(() =>
    translatedBoxes.value.filter((box) => box.isSelected),
);

// Lifecycle hooks
onMounted(async () => {
    // Detect mobile devices
    isMobile.value =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
        );

    await init();
    window.addEventListener("resize", handleWindowResize);
});

watch(stageContainer, (newVal) => {
    if (newVal) {
        setupEventListeners();
    }
});

onUnmounted(() => {
    console.log("Unmounting OcrImage component");

    abortController.value.abort();
    window.removeEventListener("resize", handleWindowResize);
    cleanupEventListeners();
});

watch(
    () => props.image,
    async () => {
        await init();
    },
    { immediate: true },
);

watch([sourceLanguage, targetLanguage], async () => {
    abortController.value.abort();
    abortController.value = new AbortController();
    abort();
    await preprocess();
});

// Event listener management
function setupEventListeners(): void {
    if (!stageContainer.value) return;

    // Desktop events
    stageContainer.value.addEventListener("wheel", handleWheel, {
        passive: false,
    });
    stageContainer.value.addEventListener("mousedown", handleMouseDown);
    stageContainer.value.addEventListener("mousemove", handleMouseMove);
    stageContainer.value.addEventListener("mouseup", handleMouseUp);
    stageContainer.value.addEventListener("mouseleave", handleMouseUp);

    // Mobile events
    stageContainer.value.addEventListener("touchstart", handleTouchStart, {
        passive: false,
    });
    stageContainer.value.addEventListener("touchmove", handleTouchMove, {
        passive: false,
    });
    stageContainer.value.addEventListener("touchend", handleTouchEnd);
}

function cleanupEventListeners(): void {
    if (!stageContainer.value) return;

    stageContainer.value.removeEventListener("wheel", handleWheel);
    stageContainer.value.removeEventListener("mousedown", handleMouseDown);
    stageContainer.value.removeEventListener("mousemove", handleMouseMove);
    stageContainer.value.removeEventListener("mouseup", handleMouseUp);
    stageContainer.value.removeEventListener("mouseleave", handleMouseUp);
    stageContainer.value.removeEventListener("touchstart", handleTouchStart);
    stageContainer.value.removeEventListener("touchmove", handleTouchMove);
    stageContainer.value.removeEventListener("touchend", handleTouchEnd);
}

/**
 * Handle window resize to update canvas size
 */
function handleWindowResize(): void {
    if (!stageContainer.value) return;

    // Recalculate stage dimensions
    const maxWidth = window.innerWidth - 32; // Full width minus margins (16px on each side)
    const maxHeight = Math.min(window.innerHeight * 0.7, 1000);

    stageWidth.value = maxWidth;
    stageHeight.value = maxHeight;

    // Refit the image if needed
    if (imageElement.value) {
        const aspectW = stageWidth.value / imageWidth.value;
        const aspectH = stageHeight.value / imageHeight.value;
        const aspectMin = argMin([aspectW, aspectH]);

        imgRatio.value = [aspectW, aspectH][aspectMin] as number;

        if (aspectMin === 0) {
            stageHeight.value = imageHeight.value * imgRatio.value;
        } else {
            stageWidth.value = imageWidth.value * imgRatio.value;
        }
    }
}

// Core initialization functions
async function init(): Promise<void> {
    if (!props.image) {
        return;
    }

    isLoading.value = true;

    // Reset zoom and translation state
    resetZoom();
    translatedBoxes.value = [];

    if (!stageContainer.value) {
        return;
    }

    // Calculate maximum available space using full viewport dimensions
    const maxWidth = window.innerWidth;
    const maxHeight = Math.min(window.innerHeight * 0.7, 1000); // Use 70% of viewport height, max 1000px

    // Set stage dimensions to maximize available space
    stageWidth.value = stageContainer.value.clientWidth || maxWidth;
    stageHeight.value = stageContainer.value.clientHeight || maxHeight;

    // Load image to get dimensions
    await loadImage();
    zoomToFit();

    // Process OCR
    await preprocess();
}

// Utility functions
function argMin(arr: number[]): number {
    return arr.reduce((minIndex, current, index) => {
        return current < (arr[minIndex] as number) ? index : minIndex;
    }, 0);
}

/**
 * Calculate optimal font size based on text length and box dimensions
 * @param text - The text to be displayed
 * @param boxWidth - Available width for the text
 * @param boxHeight - Available height for the text
 * @param maxFontSize - Maximum allowed font size (default: 18)
 * @param minFontSize - Minimum allowed font size (default: 8)
 * @returns Calculated font size in pixels
 */
function calculateOptimalFontSize(
    text: string,
    boxWidth: number,
    boxHeight: number,
    maxFontSize = 18,
    minFontSize = 8,
): number {
    if (!text || boxWidth <= 0 || boxHeight <= 0) {
        return minFontSize;
    }

    // Estimate average character width based on font size
    // Arial font typically has a character width of ~0.5-0.6 times the font size
    const avgCharWidthRatio = 0.55;

    // Estimate line height (typically 1.2 times font size for good readability)
    const lineHeightRatio = 1.2;

    // Calculate font size based on width constraint
    const availableWidth = boxWidth - 4; // Account for padding
    const estimatedCharsPerLine = Math.floor(
        availableWidth / (maxFontSize * avgCharWidthRatio),
    );
    const estimatedLines = Math.ceil(
        text.length / Math.max(estimatedCharsPerLine, 1),
    );

    // Font size based on height constraint
    const availableHeight = boxHeight - 4; // Account for padding
    const fontSizeByHeight =
        availableHeight / (estimatedLines * lineHeightRatio);

    // Font size based on width constraint
    const fontSizeByWidth = availableWidth / (text.length * avgCharWidthRatio);

    // Use the more restrictive constraint
    const calculatedSize = Math.min(fontSizeByHeight, fontSizeByWidth);

    // Apply min/max constraints
    return Math.max(
        minFontSize,
        Math.min(maxFontSize, Math.floor(calculatedSize)),
    );
}

/**
 * Load the image and calculate scaling ratio
 */
async function loadImage(): Promise<void> {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imgUrl.value;
        img.onload = () => {
            imageWidth.value = img.width;
            imageHeight.value = img.height;
            imageElement.value = img;

            const aspectW = stageWidth.value / img.width;
            const aspectH = stageHeight.value / img.height;
            const aspectMin = argMin([aspectW, aspectH]);

            // Calculate ratio to fit image in stage
            imgRatio.value = [aspectW, aspectH][aspectMin] as number;

            resolve();
        };
    });
}

// OCR and translation functions
async function preprocess(): Promise<void> {
    const entries = translationService.translateImage(
        props.image,
        {
            source_language: sourceLanguage.value,
            target_language: targetLanguage.value,
        },
        abortController.value.signal,
    );

    translatedBoxes.value = [];

    isTranslatingOcr.value = true;

    try {
        for await (const entry of entries) {
            isLoading.value = false;

            const h = imageHeight.value;

            translatedBoxes.value.push({
                x: entry.bbox.left * imgRatio.value,
                y: (h - entry.bbox.top) * imgRatio.value,
                width: (entry.bbox.right - entry.bbox.left) * imgRatio.value,
                height: (entry.bbox.top - entry.bbox.bottom) * imgRatio.value,
                originalText: entry.original || "",
                translatedText: entry.translated || "",
                isSelected: false,
                paragraphId: `block - ${translatedBoxes.value.length}`,
            });
        }
    } finally {
        isTranslatingOcr.value = false;
    }
}

// Text selection and clipboard functions
function handleTextBoxClick(index: number): void {
    const box = translatedBoxes.value[index];
    if (box) {
        box.isSelected = !box.isSelected;
    }
}

function clearAllTextSelections(): void {
    translatedBoxes.value.forEach((box) => {
        box.isSelected = false;
    });
}

function selectAllTextBoxes(): void {
    translatedBoxes.value.forEach((box) => {
        if (box.translatedText) {
            box.isSelected = true;
        }
    });
}

/**
 * Copy selected or all translated text to clipboard
 */
async function copyTextToClipboard(): Promise<void> {
    const textToCopy =
        selectedTextBoxes.value.length > 0
            ? selectedTextBoxes.value
                  .map((box) => box.translatedText)
                  .join("\n\n") // Separate paragraphs with double newlines
            : translatedBoxes.value.map((x) => x.translatedText).join("\n\n"); // Format all text as paragraphs

    if (textToCopy.trim()) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            // You could add a toast notification here
        } catch (error) {
            logger.error(error, "Failed to copy text");
        }
    }
}

// Touch helper functions
function getDistance(p1: Touch, p2: Touch): number {
    return Math.sqrt(
        (p2.clientX - p1.clientX) ** 2 + (p2.clientY - p1.clientY) ** 2,
    );
}

function getCenter(p1: Touch, p2: Touch): { x: number; y: number } {
    return {
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2,
    };
}

/**
 * Handle wheel zoom for desktop
 */
function handleWheel(e: WheelEvent): void {
    e.preventDefault();

    if (!stageRef.value) return;

    const stage = stageRef.value.getNode();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(
        minZoom.value,
        Math.min(maxZoom.value, oldScale * (1 + direction * 0.1)),
    );

    scale.value = newScale;

    const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
    };

    position.value = newPos;
}

/**
 * Handle touch start for pinch zoom
 */
function handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
        const p1 = e.touches[0];
        const p2 = e.touches[1];

        if (!p1 || !p2) return;

        // Reset dragging state when starting pinch
        isDragging.value = false;
        wasPinching.value = true;
        lastCenter.value = getCenter(p1, p2);
        lastDist.value = getDistance(p1, p2);
    } else if (e.touches.length === 1 && !wasPinching.value) {
        // Only start single finger drag if we're not in or just finishing a pinch
        const touch = e.touches[0];
        if (!touch) return;

        isDragging.value = true;
        dragStartPos.value = {
            x: touch.clientX - position.value.x,
            y: touch.clientY - position.value.y,
        };
    }
}

/**
 * Handle touch move for pinch zoom and pan
 */
function handleTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 2) {
        // We're in a pinch gesture
        wasPinching.value = true;

        const p1 = e.touches[0];
        const p2 = e.touches[1];

        if (!p1 || !p2 || !stageRef.value) return;

        const newCenter = getCenter(p1, p2);
        const newDist = getDistance(p1, p2);

        if (lastDist.value > 0) {
            const scaleChange = newDist / lastDist.value;
            const oldScale = scale.value;
            const newScale = Math.max(
                minZoom.value,
                Math.min(maxZoom.value, oldScale * scaleChange),
            );

            // Calculate zoom origin relative to the stage container
            const stageContainer = stageRef.value.getNode().container();
            const rect = stageContainer.getBoundingClientRect();

            // Convert touch center to stage coordinates
            const stagePointer = {
                x: newCenter.x - rect.left,
                y: newCenter.y - rect.top,
            };

            // Calculate the point in image coordinates that should remain fixed
            const mousePointTo = {
                x: (stagePointer.x - position.value.x) / oldScale,
                y: (stagePointer.y - position.value.y) / oldScale,
            };

            // Update scale
            scale.value = newScale;

            // Calculate new position to keep the zoom point fixed
            const newPos = {
                x: stagePointer.x - mousePointTo.x * newScale,
                y: stagePointer.y - mousePointTo.y * newScale,
            };

            position.value = newPos;
        }

        lastCenter.value = newCenter;
        lastDist.value = newDist;
    } else if (
        e.touches.length === 1 &&
        isDragging.value &&
        !wasPinching.value
    ) {
        // Only allow single finger pan if we weren't just pinching
        const touch = e.touches[0];
        if (!touch) return;

        position.value = {
            x: touch.clientX - dragStartPos.value.x,
            y: touch.clientY - dragStartPos.value.y,
        };
    }
} /**
 * Handle touch end
 */
function handleTouchEnd(e: TouchEvent): void {
    if (e.touches.length < 2) {
        lastDist.value = 0;
    }

    if (e.touches.length === 0) {
        // All fingers lifted - reset all states
        isDragging.value = false;
        wasPinching.value = false;
    } else if (e.touches.length === 1 && wasPinching.value) {
        // Going from pinch to single finger - disable dragging
        isDragging.value = false;
    }
}

/**
 * Handle mouse drag for desktop pan
 */
function handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
        // Left mouse button
        isDragging.value = true;
        dragStartPos.value = {
            x: e.clientX - position.value.x,
            y: e.clientY - position.value.y,
        };
    }
}

/**
 * Handle mouse move for desktop pan
 */
function handleMouseMove(e: MouseEvent): void {
    if (isDragging.value) {
        position.value = {
            x: e.clientX - dragStartPos.value.x,
            y: e.clientY - dragStartPos.value.y,
        };
    }
}

/**
 * Handle mouse up for desktop pan
 */
function handleMouseUp(): void {
    isDragging.value = false;
}

/**
 * Reset zoom and position
 */
function resetZoom(): void {
    scale.value = 1;
    position.value = { x: 0, y: 0 };
}

/**
 * Zoom to fit the entire image
 */
function zoomToFit(): void {
    if (!stageContainer.value || !imageElement.value) return;

    // Use actual stage dimensions
    const containerWidth = stageWidth.value;
    const containerHeight = stageHeight.value;

    const scaleX = containerWidth / (imageWidth.value * imgRatio.value);
    const scaleY = containerHeight / (imageHeight.value * imgRatio.value);
    const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom beyond 100% for clarity

    scale.value = newScale;
    position.value = {
        x: (containerWidth - imageWidth.value * imgRatio.value * newScale) / 2,
        y:
            (containerHeight - imageHeight.value * imgRatio.value * newScale) /
            2,
    };
}
</script>

<template>
    <div class="w-full h-screen">
        <!-- Konva stage container for image with OCR overlay -->
        <div ref="stageContainer" class="w-full h-full bg-white">
            <!-- Zoom controls -->
            <div class="fixed top-5 right-4 z-1">
                <div class="flex flex-col gap-2 items-end">
                    <UButton @click="zoomToFit" icon="i-lucide-expand" color="secondary" title="Zoom to fit">
                    </UButton>
                    <div class="z-10 bg-white border border-white rounded-lg px-3 py-1 text-sm shadow-md">
                        {{ Math.round(scale * 100) }}%
                    </div>
                </div>
            </div>

            <v-stage v-if="!isLoading" ref="stageRef" :config="{
                width: stageWidth,
                height: stageHeight,
                scaleX: scale,
                scaleY: scale,
                x: position.x,
                y: position.y,
                draggable: false
            }" class="bg-white cursor-grab" :class="{ 'cursor-grabbing': isDragging }">
                <v-layer>
                    <!-- Background image -->
                    <v-image :config="{
                        image: imageElement,
                        width: imageWidth * imgRatio,
                        height: imageHeight * imgRatio,
                        x: 0,
                        y: 0
                    }" />
                </v-layer>
                <v-layer>
                    <!-- Translated text overlays (no bounding boxes) -->
                    <template v-for="(box, index) in translatedBoxes" :key="`translated-box-${index}`">
                        <!-- Background for better text readability -->
                        <v-rect :config="{
                            x: box.x,
                            y: box.y,
                            width: box.width,
                            height: box.height,
                            fill: box.isSelected ? 'rgba(0, 123, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)',
                            stroke: box.isSelected ? '#007bff' : 'transparent',
                            strokeWidth: box.isSelected ? 2 : 0,
                            cornerRadius: 2
                        }" @click="() => handleTextBoxClick(index)" @tap="() => handleTextBoxClick(index)" />

                        <!-- Translated text overlay -->
                        <v-text :config="{
                            x: box.x + 2,
                            y: box.y + 2,
                            text: (box.translatedText ?? box.originalText),
                            fontSize: calculateOptimalFontSize(
                                box.translatedText ?? box.originalText,
                                box.width,
                                box.height
                            ),
                            fontFamily: 'Arial',
                            fill: '#000000',
                            width: box.width - 4,
                            height: box.height - 4,
                            ellipsis: true,
                            wrap: 'word',
                            verticalAlign: 'middle',
                            listening: true
                        }" @click="() => handleTextBoxClick(index)" @tap="() => handleTextBoxClick(index)" />
                    </template>
                </v-layer>
            </v-stage>

            <!-- Loading overlay -->
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                </div>
            </div>
        </div>

        <div class="fixed bottom-0 left-0 right-0 flex flex-col items-center bg-gray-100/90 m-1 rounded-md">
            <!-- Translation status and controls -->
            <div v-if="isTranslatingOcr" class="w-full p-2">
                <div class="flex items-center justify-center">
                    <UIcon name="i-lucide-loader-2" class="animate-spin mr-2 inline-block" />
                    <span class="text-gray-600">Translating...</span>
                </div>
            </div>

            <!-- Instructions for zoom and text selection -->
            <div class="m-1 md:m-3 text-base text-gray-600 text-center max-w-2xl mx-auto px-4">
                <p v-if="isMobile">
                    Use pinch to zoom and single finger to pan. Tap paragraphs to select them for copying.
                </p>
                <p v-else>
                    Use mouse wheel to zoom and drag to pan. Click paragraphs to select them for copying.
                </p>
            </div>

            <!-- Text selection and copy controls -->
            <div class="flex gap-1 m-1 md:m-2 md:gap-3 justify-center px-1 md:px-4">
                <UButton @click="selectAllTextBoxes" :size="isMobile ? 'xs' : 'md'">
                    Select All Paragraphs
                </UButton>
                <UButton @click="clearAllTextSelections" :disabled="selectedTextBoxes.length === 0"
                    :size="isMobile ? 'xs' : 'md'">
                    Clear Selection
                </UButton>
                <UButton @click="copyTextToClipboard" F :size="isMobile ? 'xs' : 'md'">
                    📋 Copy Paragraphs
                </UButton>
            </div>

            <LanguageSelectionBar class="mb-1" v-model:source-language="sourceLanguage"
                v-model:target-language="targetLanguage" />
        </div>
    </div>
</template>

<style></style>