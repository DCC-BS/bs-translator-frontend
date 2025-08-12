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

const props = defineProps<InputProps>();
const isLoading = ref(true);

// Konva stage and layer refs
const stageContainer = ref<HTMLDivElement>();
const stageRef = ref();

// Image and stage dimensions
const imgUrl = computed(() => URL.createObjectURL(props.image));
const stageWidth = ref(800);
const stageHeight = ref(600);
const imageWidth = ref(0);
const imageHeight = ref(0);
const imgRatio = ref(1);
const imageElement = ref<HTMLImageElement>();

// OCR data for rendering overlays
const ocrBlocks = ref<OcrBlock[]>([]);
const boundingBoxes = ref<
    Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
    }>
>([]);
const rotationRadian = ref(0);
const reverseRotationDegree = computed(
    () => 360 - rotationRadian.value * (180 / Math.PI),
);

// Hover state for text overlays
const hoveredBoxIndex = ref<number | null>(null);

// Mobile detection
const isMobile = ref(false);

// Selection state for text lines
const selectedBoxIndices = ref<Set<number>>(new Set());

// Computed property for concatenated selected text
const selectedText = computed(() => {
    const selectedTexts: string[] = [];

    // Sort selected indices to maintain reading order
    const sortedIndices = Array.from(selectedBoxIndices.value).sort((a, b) => {
        const boxA = boundingBoxes.value[a];
        const boxB = boundingBoxes.value[b];

        if (!boxA || !boxB) return 0;

        // Sort by Y position first (top to bottom), then by X position (left to right)
        if (Math.abs(boxA.y - boxB.y) < 10) {
            // Same line (within 10px)
            return boxA.x - boxB.x;
        }
        return boxA.y - boxB.y;
    });

    for (const index of sortedIndices) {
        const box = boundingBoxes.value[index];
        if (box) {
            selectedTexts.push(`${box.text.trim()}\n`);
        }
    }

    return selectedTexts.join(" ");
});

// Check if device is mobile
onMounted(async () => {
    isMobile.value =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
        );

    await init();
});

watch(
    () => props.image,
    async () => {
        await init();
    },
    { immediate: true },
);

async function init(): Promise<void> {
    if (!props.image) {
        return;
    }

    isLoading.value = true;

    if (!stageContainer.value) {
        return;
    }

    // Set stage dimensions based on container
    stageWidth.value = stageContainer.value.clientWidth;
    stageHeight.value = stageContainer.value.clientHeight;

    // Load image to get dimensions
    await loadImage();

    // Process OCR
    await preprocess();

    isLoading.value = false;
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

            // Calculate ratio to fit image in stage
            imgRatio.value = Math.min(
                stageWidth.value / img.width,
                stageHeight.value / img.height,
            );

            resolve();
        };
    });
}

/**
 * Process OCR and prepare bounding box data
 */
async function preprocess(): Promise<void> {
    const worker = await createWorker("deu");

    await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT_OSD,
    });

    // const { data: detectData } = await worker.detect(props.image);

    // console.log('Detected script:', detectData.script);

    const { data } = await worker.recognize(
        props.image,
        { rotateAuto: true },
        { blocks: true },
    );

    console.log("OCR Data:", data);

    // Store OCR blocks for rendering
    ocrBlocks.value = data.blocks ?? [];

    rotationRadian.value = data.rotateRadians ?? 0;

    // Prepare bounding boxes for Konva rendering
    prepareBoundingBoxes();

    await worker.terminate();
}

/**
 * Convert OCR data to Konva-compatible bounding box format
 */
function prepareBoundingBoxes(): void {
    const boxes: typeof boundingBoxes.value = [];

    for (const block of ocrBlocks.value) {
        for (const paragraph of block.paragraphs) {
            for (const line of paragraph.lines) {
                const { x0, y0, x1, y1 } = line.bbox;

                // Get the text content for this line
                const lineText = line.words
                    .map((word) => word.text)
                    .join(" ")
                    .trim();

                if (lineText) {
                    boxes.push({
                        x: x0 * imgRatio.value,
                        y: y0 * imgRatio.value,
                        width: (x1 - x0) * imgRatio.value,
                        height: (y1 - y0) * imgRatio.value,
                        text: lineText,
                    });
                }
            }
        }
    }

    boundingBoxes.value = boxes;
}

/**
 * Handle bounding box click to toggle selection
 */
function handleBoundingBoxClick(index: number): void {
    if (selectedBoxIndices.value.has(index)) {
        // Deselect the box
        selectedBoxIndices.value.delete(index);
    } else {
        // Select the box
        selectedBoxIndices.value.add(index);
    }

    console.log("Selected text:", selectedText.value);
}

/**
 * Clear all selections
 */
function clearAllSelections(): void {
    selectedBoxIndices.value.clear();
}

/**
 * Select all text boxes
 */
function selectAllBoxes(): void {
    selectedBoxIndices.value.clear();
    for (let i = 0; i < boundingBoxes.value.length; i++) {
        selectedBoxIndices.value.add(i);
    }
}

/**
 * Handle mouse enter on bounding box
 */
function handleBoxMouseEnter(target: unknown, index: number): void {
    const rect = target as {
        stroke: (color: string) => void;
        getLayer: () => { draw: () => void };
    };
    rect.stroke("#00FF00");
    hoveredBoxIndex.value = index;
    rect.getLayer().draw();
}

/**
 * Handle mouse leave on bounding box
 */
function handleBoxMouseLeave(target: unknown): void {
    const rect = target as {
        stroke: (color: string) => void;
        getLayer: () => { draw: () => void };
    };
    rect.stroke("#FF0000");
    hoveredBoxIndex.value = null;
    rect.getLayer().draw();
}

/**
 * Handle touch start on mobile (simulate hover)
 */
function handleBoxTouchStart(target: unknown, index: number): void {
    if (isMobile.value) {
        hoveredBoxIndex.value = index;
        const rect = target as { getLayer: () => { draw: () => void } };
        rect.getLayer().draw();
    }
}

/**
 * Handle touch end on mobile
 */
function handleBoxTouchEnd(): void {
    if (isMobile.value) {
        // Keep hover state for a moment on mobile to show text
        setTimeout(() => {
            hoveredBoxIndex.value = null;
        }, 2000); // Show text for 2 seconds after touch
    }
}
</script>

<template>
    <div class="flex flex-col">
        <!-- Konva stage container for image with OCR overlay -->
        <div ref="stageContainer" class="flex-1 relative border border-gray-300 rounded">
            <v-stage v-if="!isLoading" ref="stageRef" :config="{
                width: stageWidth,
                height: stageHeight,
            }" class="bg-white">
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
                    <!-- OCR Bounding boxes and text overlays -->
                    <template v-for="(box, index) in boundingBoxes" :key="`box-${index}`">
                        <!-- Bounding box rectangle -->
                        <v-rect :config="{
                            x: box.x,
                            y: box.y,
                            width: box.width,
                            height: box.height,
                            stroke: selectedBoxIndices.has(index) ? '#00FF00' : '#FF0000',
                            strokeWidth: selectedBoxIndices.has(index) ? 2 : 1,
                            fill: selectedBoxIndices.has(index) ? 'rgba(0, 255, 0, 0.1)' : 'transparent',
                            opacity: 0.8
                        }" @click="() => handleBoundingBoxClick(index)" @tap="() => handleBoundingBoxClick(index)"
                            @touchstart="(e: { target: unknown }) => handleBoxTouchStart(e.target, index)"
                            @touchend="() => handleBoxTouchEnd()"
                            @mouseenter="(e: { target: unknown }) => handleBoxMouseEnter(e.target, index)"
                            @mouseleave="(e: { target: unknown }) => handleBoxMouseLeave(e.target)" />

                        <!-- Text background for better readability - only show on hover -->
                        <v-rect v-if="hoveredBoxIndex === index" :config="{
                            x: box.x,
                            y: Math.max(0, box.y - 16),
                            width: Math.min(box.text.length * 8, box.width),
                            height: 14,
                            fill: 'rgba(255, 255, 255, 0.9)',
                            cornerRadius: 2
                        }" />

                        <!-- Recognized text - only show on hover -->
                        <v-text v-if="hoveredBoxIndex === index" :config="{
                            x: box.x + 2,
                            y: Math.max(1, box.y - 15),
                            text: box.text,
                            fontSize: 12,
                            fontFamily: 'Arial',
                            fill: '#000000',
                            width: box.width - 4,
                            ellipsis: true
                        }" @click="() => handleBoundingBoxClick(index)" @tap="() => handleBoundingBoxClick(index)"
                            @touchend="() => handleBoundingBoxClick(index)" />
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

        <!-- Selected text controls and display -->
        <div v-if="!isLoading" class="mt-4 space-y-3">
            <!-- Control buttons -->
            <div class="flex gap-2">
                <button @click="selectAllBoxes"
                    class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    :disabled="boundingBoxes.length === 0">
                    Select All
                </button>
                <button @click="clearAllSelections"
                    class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                    :disabled="selectedBoxIndices.size === 0">
                    Clear Selection
                </button>
                <span class="text-sm text-gray-600 flex items-center">
                    {{ selectedBoxIndices.size }} of {{ boundingBoxes.length }} lines selected
                </span>
            </div>

            <!-- Selected text display -->
            <div v-if="selectedText.trim()" class="p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 class="text-lg font-semibold mb-2 text-blue-800">Selected Text:</h3>
                <div
                    class="whitespace-pre-wrap text-sm bg-white p-3 border border-blue-300 rounded max-h-30 overflow-y-auto">
                    {{ selectedText }}
                </div>
            </div>

            <!-- Instructions when no text is selected -->
            <div v-else-if="boundingBoxes.length > 0" class="p-4 bg-gray-50 border border-gray-200 rounded">
                <p class="text-gray-600 text-sm">
                    <span class="font-medium">Instructions:</span>
                    <span v-if="isMobile">
                        Tap on the red bounding boxes to select text lines. Selected boxes will turn green.
                        Tap and hold to preview the recognized text.
                    </span>
                    <span v-else>
                        Click on the red bounding boxes to select text lines. Selected boxes will turn green.
                        Hover over boxes to see the recognized text.
                    </span>
                </p>
            </div>
        </div>
    </div>
</template>

<style></style>