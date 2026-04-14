<script lang="ts" setup>
import type { ChatStatus } from "ai";
import type { LanguageCode } from "~/models/languages";

interface InputProps {
    align: "start" | "end";
    status: ChatStatus;
    language: LanguageCode;
}

const props = defineProps<InputProps>();

const emit = defineEmits<{
    submit: [text: string];
}>();

const container = shallowRef<HTMLElement>();

watch(
    container,
    () => {
        const el = container.value;

        if (el && props.align === "start") {
            el.replaceChildren(...Array.from(el.children).reverse());
        }
    },
    { immediate: true },
);

onMounted(() => {});

const text = ref("");
const isProcessing = ref(false);
const audioVisualization = ref<number[]>([]);

const { transcribe } = useTranscribe();
const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    isRecording,
    isProcessing: isAudioProcessing,
} = useAudioRecording({
    storeToDbInterval: 30,
    logger: console.log,
    onRecordingStarted: (stream: MediaStream) => {
        initializeVisualization(stream);
    },
    onRecordingStopped: async (audioBlob: Blob) => {
        cleanupVisualization();
        isProcessing.value = true;
        await handleTranscription(audioBlob);
    },
    onError: () => {
        cleanupVisualization();
    },
});

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let frequencyData: Uint8Array<ArrayBuffer> | null = null;
let visualizationInterval: ReturnType<typeof setInterval> | null = null;

onUnmounted(() => {
    cleanupVisualization();
});

function onSubmit() {
    emit("submit", text.value);
    text.value = "";
}

async function toggleRecording() {
    if (isRecording.value) {
        await stopAudioRecording();
    } else {
        await startAudioRecording();
    }
}

function initializeVisualization(stream: MediaStream) {
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    visualizationInterval = setInterval(updateVisualization, 50);
}

function cleanupVisualization() {
    if (visualizationInterval) {
        clearInterval(visualizationInterval);
        visualizationInterval = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    analyser = null;
    frequencyData = null;
    audioVisualization.value = [];
}

function updateVisualization() {
    if (!analyser || !frequencyData) return;

    analyser.getByteFrequencyData(frequencyData);
    const barCount = 15;
    const freqData = Array.from(frequencyData);
    const freqPerBar = Math.floor(freqData.length / barCount);
    const averagedData: number[] = [];

    for (let i = 0; i < barCount; i++) {
        const start = i * freqPerBar;
        const end = start + freqPerBar;
        const slice = freqData.slice(start, end);
        const avg =
            slice.reduce((sum, val) => sum + val, 0) / slice.length || 0;
        averagedData.push((avg / 255) * 100);
    }

    audioVisualization.value = [...averagedData.toReversed(), ...averagedData];
}

async function handleTranscription(blob: Blob) {
    let transcribedText = "";

    try {
        for await (const chunk of transcribe(blob, props.language)) {
            transcribedText += chunk;
        }
    } finally {
        isProcessing.value = false;
    }

    if (transcribedText.trim()) {
        emit("submit", transcribedText);
    }
}
</script>

<template>
    <div
        class="flex items-stretch gap-2"
        :class="`justify-${props.align}`"
        ref="container"
    >
        <div
            v-if="isRecording"
            class="flex items-center gap-[2px] grow h-10 px-3 rounded-md bg-[var(--ui-bg-elevated)]"
        >
            <div
                v-for="(value, index) in audioVisualization"
                :key="index"
                :style="{ height: Math.max(value * 0.36, 2) + 'px' }"
                class="grow min-w-0 bg-primary rounded-full transition-[height] duration-100"
            />
        </div>

        <div
            v-else-if="isProcessing || isAudioProcessing"
            class="flex items-center justify-center grow h-full px-4 rounded-md bg-[var(--ui-bg-elevated)]"
        >
            <UIcon
                name="i-lucide-loader-2"
                class="w-5 h-5 animate-spin text-muted"
            />
        </div>

        <UChatPrompt
            v-else
            class="hidden md:inline grow w-full"
            v-model="text"
            @submit="onSubmit"
        >
            <UChatPromptSubmit :status="props.status" />
        </UChatPrompt>

        <UButton
            class="aspect-square w-15 flex items-center justify-center shrink-0"
            :disabled="isProcessing || isAudioProcessing"
            @click="toggleRecording"
        >
            <UIcon
                :name="isRecording ? 'i-lucide-square' : 'i-lucide-mic'"
                class="w-5 h-5"
            />
        </UButton>
    </div>
</template>
