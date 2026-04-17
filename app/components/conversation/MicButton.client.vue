<script lang="ts" setup>
import type { Language } from "~/models/languages";
import CircleButton from "./CircleButton.vue";

const props = defineProps<{
    language?: Language;
}>();

const emit = defineEmits<{
    transcribed: [text: string];
}>();

const logger = useLogger();

const isProcessing = ref(false);
const audioVisualization = ref<number[]>([]);
const currentLanguage = ref(getLanguage(props.language?.code));
const guessedText = ref("");
const transcribeAbortController = ref<AbortController>();

const { transcribe } = useTranscribe();

const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    isRecording: isAudioRecording,
    isProcessing: isAudioProcessing,
} = useAudioRecording({
    storeToDbInterval: 1,
    logger: (msg) => logger.debug("[AudioRecording]", msg),
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
    onStore: onInterval,
});

const iconName = computed(() => {
    return isAudioProcessing.value || isProcessing.value
        ? "i-lucide-loader-2"
        : isAudioRecording.value
            ? "i-lucide-square"
            : "i-lucide-mic";
});

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let frequencyData: Uint8Array<ArrayBuffer> | null = null;
let visualizationInterval: ReturnType<typeof setInterval> | null = null;
let transcribeQueue: AsyncGenerator<string, unknown, unknown>[] = [];

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
    transcribeAbortController.value?.abort();
    transcribeAbortController.value = new AbortController();
    transcribeQueue = [];

    let transcribedText = "";

    try {
        for await (const chunk of transcribe(blob, props.language?.code)) {
            transcribedText += chunk;

            if (transcribeAbortController.value?.signal.aborted) {
                break;
            }
        }
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError"
        ) {
            logger.info("Transcription aborted by user");
        } else {
            logger.error("Transcription error:", String(error));
        }
    } finally {
        isProcessing.value = false;
    }

    if (transcribedText.trim()) {
        emit("transcribed", transcribedText);
    }
}

async function runTranscription() {
    transcribeAbortController.value?.abort();
    transcribeAbortController.value = new AbortController();
    const signal = transcribeAbortController.value.signal;

    while (true) {
        if (signal.aborted) {
            break;
        }

        if (transcribeQueue.length === 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            continue;
        }

        const currentTranscription = transcribeQueue.shift();
        if (!currentTranscription) continue;

        for await (const chunk of currentTranscription) {
            guessedText.value += chunk;
            if (signal.aborted) {
                break;
            }
        }
    }
}

async function onInterval(mp3: Blob) {
    transcribeQueue.push(transcribe(mp3, currentLanguage.value?.code));
}

async function toggleRecording() {
    if (isAudioRecording.value) {
        transcribeAbortController.value?.abort();
        await stopAudioRecording();
        guessedText.value = "";
    } else {
        await startAudioRecording();
        runTranscription();
    }
}

onUnmounted(() => {
    cleanupVisualization();
    transcribeAbortController.value?.abort();
    transcribeAbortController.value = new AbortController();
});
</script>

<template>
    <UPopover :open="isAudioRecording" :dismissible="false" :ui="{ content: 'ring-0 shadow-none' }">
        <template #content>
            <div v-if="isAudioRecording" class="flex flex-col justify-center items-center max-w-[80vw]">
                <div class="text-wrap wrap-break-word text-center">{{ guessedText }}</div>

                <div v-if="isAudioRecording"
                    class="flex items-center gap-[2px] w-64 h-10 px-3 rounded-full bg-primary-100">
                    <div v-for="(value, index) in audioVisualization" :key="index"
                        :style="{ height: Math.max(value * 0.36, 2) + 'px' }"
                        class="grow min-w-0 bg-primary rounded-full transition-[height] duration-100" />
                </div>
            </div>
            <div v-else-if="isProcessing || isAudioProcessing"
                class="flex items-center justify-center w-64 h-10 px-4 rounded-full bg-[var(--ui-bg-elevated)]">
                <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-muted" />
            </div>
        </template>
        <CircleButton @click="toggleRecording" color="error" :disabled="isProcessing || isAudioProcessing">
            <UIcon :name="iconName" size="24" :class="{ 'animate-spin': isProcessing || isAudioProcessing }" />
        </CircleButton>
    </UPopover>
</template>
