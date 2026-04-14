<script lang="ts" setup>
import type { LanguageCode } from "~/models/languages";

const props = defineProps<{
    language: LanguageCode;
}>();

const emit = defineEmits<{
    transcribed: [text: string];
}>();

const isProcessing = ref(false);
const audioVisualization = ref<number[]>([]);

const { transcribe } = useTranscribe();
const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    isRecording: isAudioRecording,
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
        emit("transcribed", transcribedText);
    }
}

async function toggleRecording() {
    if (isAudioRecording.value) {
        await stopAudioRecording();
    } else {
        await startAudioRecording();
    }
}
</script>

<template>
    <div class="flex flex-col items-center gap-3">
        <div
            v-if="isAudioRecording"
            class="flex items-center gap-[2px] w-64 h-10 px-3 rounded-full bg-primary-100"
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
            class="flex items-center justify-center w-64 h-10 px-4 rounded-full bg-[var(--ui-bg-elevated)]"
        >
            <UIcon
                name="i-lucide-loader-2"
                class="w-5 h-5 animate-spin text-muted"
            />
        </div>

        <CircleButton
            :class="[
                'rounded-full w-16 h-16 flex items-center justify-center',
                isAudioRecording ? 'bg-error animate-pulse' : '',
            ]"
            :disabled="isProcessing || isAudioProcessing"
            @click="toggleRecording"
        >
            <UIcon
                :name="isAudioRecording ? 'i-lucide-square' : 'i-lucide-mic'"
                class="w-7 h-7"
            />
        </CircleButton>
        <!-- <UButton
            size="xl"
            :class="[
                'rounded-full w-16 h-16 flex items-center justify-center',
                isAudioRecording ? 'bg-error animate-pulse' : '',
            ]"
            :disabled="isProcessing || isAudioProcessing"
            @click="toggleRecording"
        >
            <UIcon
                :name="isAudioRecording ? 'i-lucide-square' : 'i-lucide-mic'"
                class="w-7 h-7"
            />
        </UButton> -->
    </div>
</template>
