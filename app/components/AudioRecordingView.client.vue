<script lang="ts" setup>
import type { AudioRecorder } from "#components";

const emit = defineEmits<(e: "onRecordingComplete", file: Blob) => void>();

const { t } = useI18n();

const logger = useLogger();

const { isReady, abandonedRecording, deleteAbandonedRecording, getMp3Blob } =
    useAudioSessions({
        deleteOldSessionsDaysInterval: 30,
        maxSessionsToKeep: 1,
        logger: (msg) => logger.debug("[AudioSessions]", msg),
    });

const audioRecorder = ref<InstanceType<typeof AudioRecorder>>();
const toast = useToast();
const isRecordingDrawerOpen = ref(false);
const isRecording = ref(false);
/** True while the recorder waits for microphone access */
const isStartingRecorder = ref(false);
let isUnmounted = false;

/** Closing the drawer now would unmount the recorder and lose the recording */
const isRecorderBusy = computed(
    () =>
        isStartingRecorder.value ||
        !!audioRecorder.value?.isRecording ||
        !!audioRecorder.value?.isProcessing,
);

useLeavePageGuard(isRecorderBusy);

/**
 * Starts the recorder ourselves instead of using its auto-start, so the wait
 * for microphone access counts as busy. The start cannot be cancelled: if the
 * recorder was unmounted meanwhile, stop the recording it started afterwards.
 */
async function startRecorder(recorder: InstanceType<typeof AudioRecorder>) {
    isStartingRecorder.value = true;
    try {
        await recorder.startRecording();
    } finally {
        isStartingRecorder.value = false;
    }

    if (
        (isUnmounted || audioRecorder.value !== recorder) &&
        recorder.isRecording
    ) {
        try {
            await recorder.stopRecording();
        } catch (e) {
            logger.error(e, "Failed to stop orphaned recording");
        }
    }
}

watch(audioRecorder, (recorder) => {
    if (recorder && abandonedRecording.value?.length === 0) {
        void startRecorder(recorder);
    }
});

onUnmounted(() => {
    isUnmounted = true;
});

const lastAbandonedRecording = computed(() => {
    if (abandonedRecording.value && abandonedRecording.value.length > 0) {
        return abandonedRecording.value[abandonedRecording.value.length - 1];
    }
    return null;
});

const lastAbandonedRecordingLocalDate = computed(() => {
    if (lastAbandonedRecording.value) {
        const last = lastAbandonedRecording.value;

        if (last) {
            return new Date(last.createdAt).toLocaleString();
        }
    }

    return null;
});

function onRecordingStopped(file: Blob, _: string) {
    isRecording.value = false;
    isRecordingDrawerOpen.value = false;
    emit("onRecordingComplete", file);
}

async function recover() {
    if (!abandonedRecording.value) return;

    if (lastAbandonedRecording.value) {
        try {
            const blob = await getMp3Blob(lastAbandonedRecording.value.id);
            deleteAbandonedRecording(lastAbandonedRecording.value.id);
            isRecordingDrawerOpen.value = false;
            emit("onRecordingComplete", blob);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);

            toast.add({
                title: message,
                color: "error",
                icon: "i-lucide-alert-circle",
            });
        }
    }
}
</script>

<template>
    <!-- Not dismissible while recording: stop it with the recorder's button. -->
    <UDrawer
        v-model:open="isRecordingDrawerOpen"
        :dismissible="!isRecorderBusy"
    >
        <UTooltip :text="t('ui.recordAudio')" :delay-duration="0">
            <UButton
                icon="i-lucide-mic"
                variant="link"
                color="neutral"
                data-testid="microphoneButton"
                data-tour="record-audio"
            />
        </UTooltip>
        <template #content>
            <div class="w-full">
                <div class="p-2 max-w-[800px] m-auto">
                    <div v-if="!isReady">
                        <USkeleton class="w-full h-[400px]" />
                    </div>
                    <div v-else>
                        <div
                            class="flex flex-col justify-center items-center"
                            v-if="
                                !isRecording &&
                                abandonedRecording &&
                                abandonedRecording.length > 0
                            "
                        >
                            <p class="mb-2 text-sm text-gray-500">
                                {{
                                    t("audio.abandonedRecording", {
                                        date: lastAbandonedRecordingLocalDate,
                                    })
                                }}
                            </p>

                            <UButton
                                icon="i-lucide-history"
                                variant="ghost"
                                color="secondary"
                                @click="recover"
                                >{{ t("audio.recover") }}
                            </UButton>
                        </div>

                        <AudioRecorder
                            ref="audioRecorder"
                            :logger="(msg: string) => logger.debug('[AudioRecorder]', msg)"
                            :show-result="false"
                            @recording-started="isRecording = true"
                            @recording-stopped="onRecordingStopped"
                        />
                    </div>
                </div>
            </div>
        </template>
    </UDrawer>
</template>
