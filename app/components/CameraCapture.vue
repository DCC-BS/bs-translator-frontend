<script lang="ts" setup>
import { motion } from "motion-v";
import { UButton } from "#components";
import { captureVideoFrame, prepareImageForOcr } from "~/utils/photoImage";

const MotionUButton = motion.create(UButton);

const { t } = useI18n();
const logger = useLogger();
const toast = useToast();

const emit = defineEmits<{
    (e: "photo-captured", data: Blob): void;
    (e: "photo-canceled"): void;
}>();

interface CameraCapabilities extends MediaTrackCapabilities {
    torch?: boolean;
}

interface TorchConstraints extends MediaTrackConstraintSet {
    torch?: boolean;
}

type CameraState = "starting" | "live" | "error";

const state = ref<CameraState>("starting");
const cameraError = ref<string>();
/** The video shows frames; only then can a photo be taken. */
const isVideoReady = ref(false);
const isCapturing = ref(false);

const cameraPreviewElement = ref<HTMLVideoElement>();
const fileInput = ref<HTMLInputElement>();
let currentStream: MediaStream | undefined;
/** Bumped on every start/stop, so a late getUserMedia result of an old start is dropped. */
let streamGeneration = 0;

const flashSupported = ref(false);
const torchEnabled = ref(false);

onMounted(() => {
    startCamera();
});

onBeforeUnmount(() => {
    stopCameraStream();
});

function errorMessageFor(error: unknown): string {
    const name = error instanceof DOMException ? error.name : "";
    switch (name) {
        case "NotAllowedError":
        case "SecurityError":
            return t("camera.permissionsError");
        case "NotFoundError":
        case "OverconstrainedError":
            return t("camera.noCameraFound");
        default:
            return t("camera.failed");
    }
}

async function startCamera(): Promise<void> {
    stopCameraStream();
    const generation = streamGeneration;

    state.value = "starting";
    cameraError.value = undefined;
    isVideoReady.value = false;

    if (!navigator.mediaDevices?.getUserMedia) {
        state.value = "error";
        cameraError.value = t("camera.notSupported");
        return;
    }

    try {
        // One request only: opening the camera twice in a row fails on some Android
        // devices because the first stream has not released the hardware yet.
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 2560 },
                height: { ideal: 1440 },
            },
            audio: false,
        });

        if (generation !== streamGeneration) {
            // Unmounted or restarted while the permission prompt was open.
            for (const track of stream.getTracks()) {
                track.stop();
            }
            return;
        }

        currentStream = stream;
        checkFlashCapabilities(stream);
        state.value = "live";

        await nextTick();
        const video = cameraPreviewElement.value;
        if (!video) {
            stopCameraStream();
            return;
        }
        video.srcObject = stream;
        await video.play().catch((error: unknown) => {
            logger.error(error, "Error playing video stream");
        });
    } catch (error) {
        if (generation !== streamGeneration) {
            return;
        }
        logger.error(error, "Error accessing camera");
        state.value = "error";
        cameraError.value = errorMessageFor(error);
    }
}

function onVideoReady(): void {
    const video = cameraPreviewElement.value;
    isVideoReady.value = !!video && video.videoWidth > 0;
}

function checkFlashCapabilities(stream: MediaStream): void {
    try {
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack?.getCapabilities?.() as
            | CameraCapabilities
            | undefined;
        flashSupported.value = !!capabilities?.torch;
    } catch (error) {
        logger.error(error, "Error checking flash capabilities");
        flashSupported.value = false;
    }
}

async function toggleTorch(): Promise<void> {
    const videoTrack = currentStream?.getVideoTracks()[0];
    if (!videoTrack || !flashSupported.value) {
        return;
    }

    const newTorchState = !torchEnabled.value;
    try {
        await videoTrack.applyConstraints({
            advanced: [{ torch: newTorchState } as TorchConstraints],
        });
        torchEnabled.value = newTorchState;
    } catch (error) {
        logger.error(error, "Error toggling torch");
        torchEnabled.value = false;
    }
}

async function takePhoto(): Promise<void> {
    const video = cameraPreviewElement.value;
    if (!video || !isVideoReady.value || isCapturing.value) {
        return;
    }

    isCapturing.value = true;
    try {
        const frame = await captureVideoFrame(video);
        const photo = await prepareImageForOcr(frame);
        stopCameraStream();
        emit("photo-captured", photo);
    } catch (error) {
        logger.error(error, "Error taking photo");
        toast.add({
            title: t("photo.captureFailed"),
            color: "error",
            icon: "i-lucide-circle-x",
        });
    } finally {
        isCapturing.value = false;
    }
}

function chooseFromDevice(): void {
    fileInput.value?.click();
}

async function onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
        return;
    }

    isCapturing.value = true;
    try {
        const photo = await prepareImageForOcr(file);
        stopCameraStream();
        emit("photo-captured", photo);
    } catch (error) {
        logger.error(error, "Error reading the chosen image");
        toast.add({
            title: t("photo.imageLoadFailed"),
            color: "error",
            icon: "i-lucide-circle-x",
        });
    } finally {
        isCapturing.value = false;
    }
}

function stopCameraStream(): void {
    streamGeneration++;

    if (currentStream) {
        for (const track of currentStream.getTracks()) {
            track.stop();
        }
        currentStream = undefined;
    }

    if (cameraPreviewElement.value?.srcObject) {
        cameraPreviewElement.value.srcObject = null;
    }

    isVideoReady.value = false;
    flashSupported.value = false;
    torchEnabled.value = false;
}

function cancelPhoto(): void {
    stopCameraStream();
    emit("photo-canceled");
}
</script>

<template>
    <div class="fixed inset-0 bg-black">
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChosen">

        <div v-if="state === 'error'"
            class="w-full h-full flex flex-col gap-3 justify-center items-center p-6 text-center bg-white">
            <p class="text-error">{{ cameraError }}</p>
            <div class="flex flex-wrap gap-2 justify-center">
                <UButton icon="i-lucide-image-up" :loading="isCapturing" @click="chooseFromDevice">
                    {{ t('camera.uploadFromDevice') }}
                </UButton>
                <UButton icon="i-lucide-rotate-ccw" variant="soft" @click="startCamera">
                    {{ t('photo.retry') }}
                </UButton>
                <UButton icon="i-lucide-circle-x" color="error" variant="soft" @click="cancelPhoto">
                    {{ t('camera.abort') }}
                </UButton>
            </div>
        </div>

        <template v-else>
            <video ref="cameraPreviewElement" autoplay playsinline muted class="w-full h-full fixed object-cover"
                @loadeddata="onVideoReady" @resize="onVideoReady" />

            <div v-if="state === 'starting' || !isVideoReady"
                class="fixed inset-0 flex justify-center items-center pointer-events-none">
                <UIcon name="i-lucide-loader-2" class="animate-spin size-8 text-white" />
            </div>

            <div class="fixed bottom-8 left-0 right-0 flex justify-center items-center gap-8">
                <UButton icon="i-lucide-image-up" color="neutral" size="xl" class="rounded-full"
                    :title="t('camera.uploadFromDevice')" :aria-label="t('camera.uploadFromDevice')"
                    :disabled="isCapturing" @click="chooseFromDevice" />
                <button type="button" :aria-label="t('camera.takePhoto')" :title="t('camera.takePhoto')"
                    :disabled="!isVideoReady || isCapturing"
                    class="ring-4 ring-white rounded-full w-[84px] h-[84px] bg-red-600 disabled:opacity-50 active:scale-95 transition-transform"
                    @click="takePhoto" />
                <!-- keeps the shutter centred -->
                <div class="w-11" />
            </div>
        </template>

        <div class="fixed top-0 left-0 p-3">
            <UButton icon="i-lucide-arrow-left" variant="link" color="neutral" size="xl"
                class="bg-gray-800 text-white rounded-full" :aria-label="t('camera.abort')" @click="cancelPhoto" />
        </div>

        <div v-if="flashSupported && state === 'live'" class="fixed top-0 right-0 p-3">
            <MotionUButton :icon="torchEnabled ? 'i-lucide-flashlight' : 'i-lucide-flashlight-off'" @click="toggleTorch"
                :initial="{ scale: 0.9 }" :animate="{ scale: 1 }" :transition="{ duration: 0.2 }"
                :title="torchEnabled ? t('camera.flashOn') : t('camera.flashOff')" :aria-label="t('camera.toggleFlash')"
                class="p-3 rounded-full shadow-lg"
                :class="torchEnabled ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-800 text-white'" />
        </div>
    </div>
</template>
