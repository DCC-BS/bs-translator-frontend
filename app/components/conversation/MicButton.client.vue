<script lang="ts" setup>
import type { Language, LanguageCode } from "~/models/languages";
import CircleButton from "./CircleButton.vue";

const props = defineProps<{
    language?: Language;
}>();

const emit = defineEmits<{
    transcribed: [text: string];
}>();

/** True while starting, recording, processing or transcribing */
const busy = defineModel<boolean>("busy", { default: false });

const logger = useLogger();
const { t } = useI18n();
const { showToast } = useUserFeedback();

const isProcessing = ref(false);
const isStarting = ref(false);
const { audioVisualization, initializeVisualization, cleanupVisualization } =
    useAudioVisualization();
const transcribeAbortController = ref<AbortController>();
/** Kept to release the microphone if the recorder fails to stop */
let recordingStream: MediaStream | undefined;

const { transcribe } = useTranscribe();

const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    isRecording: isAudioRecording,
    isProcessing: isAudioProcessing,
    error: recorderError,
} = useAudioRecording({
    logger: (msg) => logger.debug("[AudioRecording]", msg),
    onRecordingStarted: (stream: MediaStream) => {
        recordingStream = stream;
        initializeVisualization(stream);
    },
    onRecordingStopped: async (audioBlob: Blob) => {
        try {
            cleanupVisualization();
            isProcessing.value = true;
            await handleTranscription(audioBlob);
        } catch (e) {
            logger.error(String(e));
        }
    },
});

const isBusy = computed(
    () =>
        isStarting.value ||
        isAudioRecording.value ||
        isAudioProcessing.value ||
        isProcessing.value,
);

watch(
    isBusy,
    (value) => {
        busy.value = value;
    },
    { immediate: true },
);

/**
 * The recorder only exposes English error strings, map them to our own messages.
 */
function micErrorMessage(message: string): string {
    if (/denied|permission/i.test(message)) {
        return t("conversation.micErrors.permissionDenied");
    }
    if (/no microphone|not found|not compatible/i.test(message)) {
        return t("conversation.micErrors.noMicrophone");
    }
    return t("conversation.micErrors.generic");
}

const iconName = computed(() => {
    return isStarting.value || isAudioProcessing.value || isProcessing.value
        ? "i-lucide-loader-2"
        : isAudioRecording.value
          ? "i-lucide-square"
          : "i-lucide-mic";
});

let transcribeQueue: AsyncGenerator<string, unknown, unknown>[] = [];

async function handleTranscription(blob: Blob) {
    transcribeAbortController.value?.abort();
    transcribeAbortController.value = new AbortController();
    transcribeQueue = [];

    let transcribedText = "";

    try {
        for await (const chunk of transcribe(
            blob,
            props.language?.code as LanguageCode,
            transcribeAbortController.value?.signal,
        )) {
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

async function toggleRecording() {
    if (isStarting.value || isAudioProcessing.value || isProcessing.value) {
        return;
    }

    if (isAudioRecording.value) {
        await stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    isStarting.value = true;
    recorderError.value = undefined;

    try {
        await startAudioRecording();
    } catch (e) {
        logger.error(e, "Failed to start recording");
        recorderError.value = String(e);
    } finally {
        isStarting.value = false;
    }

    // startRecording reports failures through the error ref, not by throwing.
    if (recorderError.value) {
        cleanupVisualization();
        showToast(micErrorMessage(recorderError.value));
    }
}

async function stopRecording() {
    try {
        await stopAudioRecording();
    } catch (e) {
        logger.error(e, "Failed to stop recording");
        // useAudioRecording does not expose abortRecording() and only releases
        // the stream after a successful conversion, so stop the tracks here.
        for (const track of recordingStream?.getTracks() ?? []) {
            track.stop();
        }
        recordingStream = undefined;
        cleanupVisualization();
        isAudioProcessing.value = false;
        isProcessing.value = false;
        showToast(t("conversation.micErrors.stopFailed"));
    }
}

onBeforeUnmount(() => {
    busy.value = false;
});

onUnmounted(() => {
    cleanupVisualization();
    transcribeAbortController.value?.abort();
    transcribeAbortController.value = new AbortController();
});
</script>

<template>
    <UPopover
        :open="isAudioRecording"
        :dismissible="false"
        :ui="{ content: 'ring-0 shadow-none bg-transparent' }"
    >
        <template #content>
            <div
                v-if="isAudioRecording"
                class="flex flex-col justify-center items-center max-w-[80vw]"
            >
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
        </template>
        <CircleButton
            @click="toggleRecording"
            color="error"
            :disabled="isStarting || isProcessing || isAudioProcessing"
        >
            <UIcon
                :name="iconName"
                size="24"
                :class="{
                    'animate-spin':
                        isStarting || isProcessing || isAudioProcessing,
                }"
            />
        </CircleButton>
    </UPopover>
</template>
