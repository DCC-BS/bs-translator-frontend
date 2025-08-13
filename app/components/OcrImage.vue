<script lang="ts" setup>
import { createWorker, PSM } from "tesseract.js";

interface InputProps {
    image: Blob;
}

interface BoundingBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

interface OcrLine {
    bbox: BoundingBox;
    words: Array<{ text: string }>;
}

interface OcrBlock {
    paragraphs: Array<{
        lines: OcrLine[];
    }>;
}

interface TranslatedTextBox {
    x: number;
    y: number;
    width: number;
    height: number;
    originalText: string;
    translatedText: string;
    isTranslating: boolean;
    isSelected: boolean;
    paragraphId: string; // Unique identifier for paragraph grouping
    lines: string[]; // Store all text lines in this paragraph
}

const props = defineProps<InputProps>();

const {
    tone,
    domain,
    glossary,
    sourceLanguage,
    targetLanguage,
    sourceText,
    translatedText,
    isTranslating,
    translateText,
    abort,
} = useTranslate();

// State management
const translatedBoxes = ref<TranslatedTextBox[]>([]);
const isLoading = ref(true);
const isMobile = ref(false);

// Konva stage references
const stageContainer = ref<HTMLDivElement>();
const stageRef = ref();

// Image properties
const imgUrl = computed(() => URL.createObjectURL(props.image));
const imageWidth = ref(0);
const imageHeight = ref(0);
const imgRatio = ref(1);
const imageElement = ref<HTMLImageElement>();

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

// Zoom constraints
const minZoom = ref(0.1);
const maxZoom = ref(5);

// OCR data for rendering overlays
const ocrBlocks = ref<OcrBlock[]>([]);
const rotationRadian = ref(0);
const reverseRotationDegree = computed(
    () => 360 - rotationRadian.value * (180 / Math.PI),
);

// Text selection state
const selectedTextBoxes = computed(() =>
    translatedBoxes.value.filter(box => box.isSelected)
);

const allTranslatedText = computed(() => {
    return translatedBoxes.value
        .filter(box => !box.isTranslating && box.translatedText)
        .map(box => box.translatedText)
        .join('\n\n'); // Join paragraphs with double newlines
});

// Lifecycle hooks
onMounted(async () => {
    // Detect mobile devices
    isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
    );

    await init();
    setupEventListeners();
    window.addEventListener('resize', handleWindowResize);
});

onUnmounted(() => {
    cleanupEventListeners();
    window.removeEventListener('resize', handleWindowResize);
});

watch(
    () => props.image,
    async () => {
        await init();
    },
    { immediate: true },
);

// Event listener management
function setupEventListeners(): void {
    if (!stageContainer.value) return;

    // Desktop events
    stageContainer.value.addEventListener('wheel', handleWheel, { passive: false });
    stageContainer.value.addEventListener('mousedown', handleMouseDown);
    stageContainer.value.addEventListener('mousemove', handleMouseMove);
    stageContainer.value.addEventListener('mouseup', handleMouseUp);
    stageContainer.value.addEventListener('mouseleave', handleMouseUp);

    // Mobile events
    stageContainer.value.addEventListener('touchstart', handleTouchStart, { passive: false });
    stageContainer.value.addEventListener('touchmove', handleTouchMove, { passive: false });
    stageContainer.value.addEventListener('touchend', handleTouchEnd);
}

function cleanupEventListeners(): void {
    if (!stageContainer.value) return;

    stageContainer.value.removeEventListener('wheel', handleWheel);
    stageContainer.value.removeEventListener('mousedown', handleMouseDown);
    stageContainer.value.removeEventListener('mousemove', handleMouseMove);
    stageContainer.value.removeEventListener('mouseup', handleMouseUp);
    stageContainer.value.removeEventListener('mouseleave', handleMouseUp);
    stageContainer.value.removeEventListener('touchstart', handleTouchStart);
    stageContainer.value.removeEventListener('touchmove', handleTouchMove);
    stageContainer.value.removeEventListener('touchend', handleTouchEnd);
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
    const maxWidth = window.innerWidth - 32; // Full width minus margins (16px on each side)
    const maxHeight = Math.min(window.innerHeight * 0.7, 1000); // Use 70% of viewport height, max 1000px

    // Set stage dimensions to maximize available space
    stageWidth.value = maxWidth;
    stageHeight.value = maxHeight;

    // Load image to get dimensions
    await loadImage();

    // Process OCR
    await preprocess();

    isLoading.value = false;
}

// Utility functions
function argMin(arr: number[]): number {
    return arr.reduce((minIndex, current, index) => {
        return current < (arr[minIndex] as number) ? index : minIndex;
    }, 0);
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
    const worker = await createWorker("deu");

    await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT_OSD,
    });

    const { data } = await worker.recognize(
        props.image,
        { rotateAuto: true },
        { blocks: true },
    );

    // Store OCR blocks for rendering
    ocrBlocks.value = data.blocks ?? [];

    rotationRadian.value = data.rotateRadians ?? 0;

    // Prepare translated text boxes for Konva rendering
    await prepareTranslatedBoxes();

    await worker.terminate();
}

/**
 * Convert OCR data to translated text boxes and start translation (grouped by paragraphs)
 */
async function prepareTranslatedBoxes(): Promise<void> {
    const boxes: TranslatedTextBox[] = [];

    for (const block of ocrBlocks.value) {
        for (const paragraph of block.paragraphs) {
            // Group all lines in this paragraph
            const paragraphLines: string[] = [];
            let minX = Number.POSITIVE_INFINITY;
            let minY = Number.POSITIVE_INFINITY;
            let maxX = Number.NEGATIVE_INFINITY;
            let maxY = Number.NEGATIVE_INFINITY;

            // Calculate bounding box for the entire paragraph
            for (const line of paragraph.lines) {
                const { x0, y0, x1, y1 } = line.bbox;
                const lineText = line.words
                    .map((word) => word.text)
                    .join(" ")
                    .trim();

                if (lineText) {
                    paragraphLines.push(lineText);

                    // Update paragraph bounding box
                    minX = Math.min(minX, x0);
                    minY = Math.min(minY, y0);
                    maxX = Math.max(maxX, x1);
                    maxY = Math.max(maxY, y1);
                }
            }

            // Only create a text box if the paragraph has content
            if (paragraphLines.length > 0) {
                const paragraphText = paragraphLines.join(" ");
                const paragraphId = `paragraph-${block.paragraphs.indexOf(paragraph)}`;

                const textBox: TranslatedTextBox = {
                    x: minX * imgRatio.value,
                    y: minY * imgRatio.value,
                    width: (maxX - minX) * imgRatio.value,
                    height: (maxY - minY) * imgRatio.value,
                    originalText: paragraphText,
                    translatedText: "",
                    isTranslating: true,
                    isSelected: false,
                    paragraphId: paragraphId,
                    lines: paragraphLines,
                };

                boxes.push(textBox);
            }
        }
    }

    translatedBoxes.value = boxes;

    // Start translating each text box individually
    await translateAllBoxes();
}

/**
 * Translate all text boxes individually
 */
async function translateAllBoxes(): Promise<void> {
    for (let i = 0; i < translatedBoxes.value.length; i++) {
        const box = translatedBoxes.value[i];
        if (box?.originalText.trim()) {
            box.isTranslating = true;

            try {
                // Create a reactive ref for this box's translation
                const translatedText = ref<string>("");

                // Translate this specific text
                await translateText(box.originalText, translatedText);

                // Update the box with the translated text
                box.translatedText = translatedText.value;
            } catch (error) {
                console.error(`Translation error for text "${box.originalText}":`, error);
                box.translatedText = box.originalText; // Fallback to original text
            } finally {
                box.isTranslating = false;
            }
        }
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
    translatedBoxes.value.forEach(box => {
        box.isSelected = false;
    });
}

function selectAllTextBoxes(): void {
    translatedBoxes.value.forEach(box => {
        if (!box.isTranslating && box.translatedText) {
            box.isSelected = true;
        }
    });
}

/**
 * Copy selected or all translated text to clipboard
 */
async function copyTextToClipboard(): Promise<void> {
    const textToCopy = selectedTextBoxes.value.length > 0
        ? selectedTextBoxes.value.map(box => box.translatedText).join('\n\n') // Separate paragraphs with double newlines
        : allTranslatedText.value.replace(/ /g, '\n\n'); // Format all text as paragraphs

    if (textToCopy.trim()) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            // You could add a toast notification here
        } catch (error) {
            console.error('Failed to copy text:', error);
        }
    }
}

// Touch helper functions
function getDistance(p1: Touch, p2: Touch): number {
    return Math.sqrt(Math.pow((p2.clientX - p1.clientX), 2) + Math.pow((p2.clientY - p1.clientY), 2));
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
        Math.min(maxZoom.value, oldScale * (1 + direction * 0.1))
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

        lastCenter.value = getCenter(p1, p2);
        lastDist.value = getDistance(p1, p2);
    } else if (e.touches.length === 1) {
        // Single finger drag
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
        const p1 = e.touches[0];
        const p2 = e.touches[1];

        if (!p1 || !p2) return;

        const newCenter = getCenter(p1, p2);
        const newDist = getDistance(p1, p2);

        if (lastDist.value > 0) {
            const scaleChange = newDist / lastDist.value;
            const newScale = Math.max(
                minZoom.value,
                Math.min(maxZoom.value, scale.value * scaleChange)
            );

            scale.value = newScale;
        }

        lastCenter.value = newCenter;
        lastDist.value = newDist;
    } else if (e.touches.length === 1 && isDragging.value) {
        // Single finger pan
        const touch = e.touches[0];
        if (!touch) return;

        position.value = {
            x: touch.clientX - dragStartPos.value.x,
            y: touch.clientY - dragStartPos.value.y,
        };
    }
}

/**
 * Handle touch end
 */
function handleTouchEnd(e: TouchEvent): void {
    if (e.touches.length < 2) {
        lastDist.value = 0;
    }

    if (e.touches.length === 0) {
        isDragging.value = false;
    }
}

/**
 * Handle mouse drag for desktop pan
 */
function handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) { // Left mouse button
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
        y: (containerHeight - imageHeight.value * imgRatio.value * newScale) / 2,
    };
}
</script>

<template>
    <div class="w-full min-h-screen flex flex-col items-center bg-gray-50">
        <!-- Konva stage container for image with OCR overlay -->
        <div ref="stageContainer"
            class="w-full flex-1 flex items-center justify-center relative bg-white shadow-lg rounded-lg mx-2 my-4"
            style="min-height: 70vh; max-height: 85vh;">
            <!-- Zoom controls -->
            <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button @click="resetZoom"
                    class="bg-white hover:bg-gray-100 border border-gray-300 rounded-lg p-2 shadow-md transition-colors"
                    title="Reset zoom">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
                <button @click="zoomToFit"
                    class="bg-white hover:bg-gray-100 border border-gray-300 rounded-lg p-2 shadow-md transition-colors"
                    title="Zoom to fit">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                </button>
            </div>

            <!-- Zoom level indicator -->
            <div
                class="absolute bottom-4 right-4 z-10 bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm shadow-md">
                {{ Math.round(scale * 100) }}%
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
                <v-layer :config="{ rotation: reverseRotationDegree }">
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
                            text: box.isTranslating ? 'Translating...' : (box.translatedText || box.originalText),
                            fontSize: Math.max(12, Math.min(20, box.height * 0.8)), // Increased font size range
                            fontFamily: 'Arial',
                            fill: box.isTranslating ? '#666666' : '#000000',
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
                    <p class="text-gray-600">Processing OCR...</p>
                </div>
            </div>
        </div>

        <!-- Translation status and controls -->
        <div class="mt-6 mb-4 flex flex-wrap gap-3 justify-center px-4">
            <div class="bg-blue-100 text-blue-800 px-6 py-3 rounded-lg text-lg">
                <span v-if="translatedBoxes.some(box => box.isTranslating)">
                    Translating text...
                </span>
                <span v-else>
                    Translation complete
                </span>
            </div>
        </div>

        <!-- Text selection and copy controls -->
        <div class="mt-4 mb-6 flex flex-wrap gap-3 justify-center px-4">
            <button @click="selectAllTextBoxes"
                class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors text-lg font-medium">
                Select All Paragraphs
            </button>
            <button @click="clearAllTextSelections"
                class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors text-lg font-medium"
                :disabled="selectedTextBoxes.length === 0"
                :class="{ 'opacity-50 cursor-not-allowed': selectedTextBoxes.length === 0 }">
                Clear Selection
            </button>
            <button @click="copyTextToClipboard"
                class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors text-lg font-medium"
                :disabled="allTranslatedText.trim() === ''"
                :class="{ 'opacity-50 cursor-not-allowed': allTranslatedText.trim() === '' }">
                📋 Copy Paragraphs
            </button>
        </div>

        <!-- Selected text info -->
        <div v-if="selectedTextBoxes.length > 0" class="mt-4 mb-4 text-center text-base text-gray-600">
            <p>{{ selectedTextBoxes.length }} {{ selectedTextBoxes.length === 1 ? 'paragraph' : 'paragraphs' }} selected
            </p>
        </div>

        <!-- Detected text count -->
        <div v-if="translatedBoxes.length > 0" class="mt-4 mb-6 text-center text-base text-gray-600">
            <p>Detected {{ translatedBoxes.length }} {{ translatedBoxes.length === 1 ? 'paragraph' : 'paragraphs' }}</p>
        </div>

        <!-- Instructions for zoom and text selection -->
        <div class="mt-4 mb-6 text-base text-gray-600 text-center max-w-2xl mx-auto px-4">
            <p v-if="isMobile">
                Use pinch to zoom and single finger to pan. Tap paragraphs to select them for copying.
            </p>
            <p v-else>
                Use mouse wheel to zoom and drag to pan. Click paragraphs to select them for copying.
            </p>
        </div>

        <LanguageSelectionBar v-model:source-language="sourceLanguage" v-bind:target-language="targetLanguage" />
    </div>
</template>

<style></style>