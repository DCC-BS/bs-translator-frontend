<script lang="ts" setup>
import { motion } from "motion-v";
import { UButton } from "#components";

const MotionUButton = motion.create(UButton);

const { t } = useI18n();

const emit = defineEmits<{
    (e: "photo-captured", data: Blob): void;
    (e: "photo-canceled"): void;
}>();

// Type definitions for camera capabilities
interface CameraCapabilities extends MediaTrackCapabilities {
    torch?: boolean;
}

interface TorchConstraints extends MediaTrackConstraintSet {
    torch?: boolean;
}

// State variables

const isLoading = ref(true);
const capturedImage = ref<string>();
const capturedBlob = ref<Blob>();

const currentStream = ref<MediaStream>();
const cameraAvailable = ref(true);
const cameraError = ref<string>();

// Flash control state
const flashSupported = ref(false);
const torchEnabled = ref(false);

const cameraPreviewElement = ref<HTMLVideoElement>();

onMounted(() => {
    capturePhoto();
});

onUnmounted(() => {
    capturedImage.value = undefined;
    capturedBlob.value = undefined;
    stopCameraStream();
});

/**
 * Check if camera is available on the device
 */
async function checkCameraAvailability(): Promise<boolean> {
    try {
        // Check if mediaDevices API is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            cameraAvailable.value = false;
            cameraError.value = t("camera.notSupported");
            isLoading.value = false;
            return false;
        }

        // Try to enumerate devices to check if any camera exists
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(
            (device) => device.kind === "videoinput",
        );

        if (videoInputs.length === 0) {
            cameraAvailable.value = false;
            cameraError.value = t("camera.noCameraFound");
            isLoading.value = false;
            return false;
        }

        // Try to access the camera briefly to check permissions
        try {
            const testStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            }); // Stop the test stream immediately
            const tracks = testStream.getTracks();
            for (const track of tracks) {
                track.stop();
            }

            cameraAvailable.value = true;
            cameraError.value = undefined;
            return true;
        } catch (permissionError) {
            // Camera exists but permission denied or other error
            cameraAvailable.value = false;
            cameraError.value = t("camera.permissionsError");
            return false;
        }
    } catch (error) {
        console.error("Error checking camera availability:", error);
        cameraAvailable.value = false;
        cameraError.value = t("camera.failed");
        return false;
    }
}

async function capturePhoto(): Promise<void> {
    // First check if camera is available
    const available = await checkCameraAvailability();

    if (!available) {
        if (import.meta.dev) {
            dummyCameraFeed();
        }

        return; // Error message is already set in cameraError
    }

    startCamera();
}

/**
 * Check if flash/torch is supported on the current camera
 */
function checkFlashCapabilities(stream: MediaStream): void {
    try {
        const videoTrack = stream.getVideoTracks()[0];

        if (!videoTrack) {
            flashSupported.value = false;
            return;
        }

        // Check for torch capability
        const capabilities = videoTrack.getCapabilities() as CameraCapabilities;
        flashSupported.value = !!capabilities.torch;

        if (!flashSupported.value && import.meta.dev) {
            console.info("Flash/torch not supported on this device");
        }
    } catch (error) {
        console.error("Error checking flash capabilities:", error);
        flashSupported.value = false;
    }
}

async function toggleTorch(): Promise<void> {
    if (!currentStream.value || !flashSupported.value) {
        return;
    }

    try {
        const videoTrack = currentStream.value.getVideoTracks()[0];
        if (!videoTrack) {
            return;
        }

        const newTorchState = !torchEnabled.value;

        await videoTrack.applyConstraints({
            advanced: [{ torch: newTorchState } as TorchConstraints],
        });

        torchEnabled.value = newTorchState;
    } catch (error) {
        console.error("Error toggling torch:", error);
        // Reset torch state if there was an error
        torchEnabled.value = false;
    }
}

async function dummyCameraFeed() {
    isLoading.value = false;
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Create a dummy video stream for development
    cameraAvailable.value = true;

    const canvas = document.createElement("canvas");
    canvas.width = 640; // Set desired width
    canvas.height = 480; // Set desired height
    const context = canvas.getContext("2d");
    if (!context) {
        console.error("Failed to get canvas context");
        return;
    }

    // Draw a simple pattern on the canvas
    context.fillStyle = "red";
    context.strokeStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const stream = canvas.captureStream(30); // 30 FPS
    currentStream.value = stream;

    watch(
        cameraPreviewElement,
        () => {
            if (!cameraPreviewElement.value) {
                return; // Element not yet available
            }

            // Set the video element's source to the dummy stream
            cameraPreviewElement.value.srcObject = stream;
            cameraPreviewElement.value.play();
        },
        { immediate: true },
    );
}

function startCamera(): void {
    const facingMode = "environment"; // Always use back camera

    if (currentStream.value) {
        const tracks = currentStream.value.getTracks();

        for (const track of tracks) {
            track.stop();
        }

        currentStream.value = undefined;
    }

    // Clear video source before requesting new stream
    if (cameraPreviewElement.value?.srcObject) {
        cameraPreviewElement.value.srcObject = null;
    }

    isLoading.value = false;

    navigator.mediaDevices
        .getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 }, // Set ideal width
                height: { ideal: 1080 }, // Set ideal height
            },
        })
        .then((stream) => {
            currentStream.value = stream;

            // Check flash capabilities after stream is established
            checkFlashCapabilities(stream);

            // Make sure the video element still exists (user might have navigated away)
            if (cameraPreviewElement.value) {
                cameraPreviewElement.value.srcObject = stream;
                cameraPreviewElement.value
                    .play()
                    .then(() => {
                        // Camera started successfully
                    })
                    .catch((err) => {
                        console.error("Error playing video stream:", err);
                    });
            } else {
                // Clean up if video element is gone
                stopCameraStream();
            }
        })
        .catch((err) => {
            console.error("Error accessing camera:", err);
            cameraError.value = t("camera.permissionsError");
        });
}

/**
 * Take photo from video stream on mobile
 */
async function takePhoto(): Promise<void> {
    if (!cameraPreviewElement.value || !currentStream.value) {
        console.error("Camera preview element or stream is not available.");
        return;
    }

    const video = cameraPreviewElement.value;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas
        .getContext("2d")
        ?.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    canvas.toBlob((blob) => {
        if (blob) {
            capturedBlob.value = blob;
        }
    }, "image/jpeg");
    capturedImage.value = canvas.toDataURL("image/jpeg");

    // Stop camera stream
    stopCameraStream();
}

function stopCameraStream(): void {
    if (currentStream.value) {
        const tracks = currentStream.value.getTracks();

        for (const track of tracks) {
            track.stop();
        }

        currentStream.value = undefined;
    }

    if (cameraPreviewElement.value?.srcObject) {
        cameraPreviewElement.value.srcObject = null;
    }

    // Reset flash state
    flashSupported.value = false;
    torchEnabled.value = false;
}

async function retakePhoto(): Promise<void> {
    capturedImage.value = undefined;
    await capturePhoto();
}

function submitPhoto(): void {
    if (capturedBlob.value) {
        emit("photo-captured", capturedBlob.value);
    }
    capturedImage.value = undefined;
}

function cancelPhoto() {
    capturedImage.value = undefined;
    capturedBlob.value = undefined;
    stopCameraStream();
    emit("photo-canceled");
}
</script>

<template>
    <div class="fixed inset-0">
        <div v-if="isLoading" class="w-full h-full flex justify-center items-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        </div>
        <!-- Show error message if camera is not available -->
        <div v-else-if="cameraError" class="w-full h-full flex flex-col gap-2 justify-center items-center">
            <p class="text-error">{{ cameraError }}</p>
            <UButton @click="cancelPhoto" icon="i-lucide-circle-x" color="error" variant="soft">
                {{ t('camera.abort') }}
            </UButton>
        </div>

        <div v-else-if="!capturedImage">
            <video autoplay playsinline ref="cameraPreviewElement" class="w-full h-full fixed object-cover" />

            <div class="fixed bottom-8 left-0 right-0 flex justify-center items-center">
                <button @click="takePhoto"
                    class="ring-1 ring-white rounded-full w-[100px] h-[100px] bg-red-600 bottom-0">
                </button>
            </div>
        </div>

        <div v-else class="fixed inset-0">
            <OcrImage v-if="capturedBlob" :image="capturedBlob" class="w-full h-full" />
        </div>
        <div class="fixed top-0 left-0 p-3">
            <UButton @click="cancelPhoto" icon="i-lucide-arrow-left" variant="link" color="neutral" size="xl"
                class="bg-gray-800 text-white rounded-full"></UButton>
        </div>
        <!-- Flash toggle button -->
        <div v-if="flashSupported && !capturedImage" class="fixed top-0 right-0 p-3">
            <MotionUButton :icon="torchEnabled ? 'i-lucide-flashlight' : 'i-lucide-flashlight-off'" @click="toggleTorch"
                :initial="{ scale: 0.9 }" :animate="{ scale: 1 }" :transition="{ duration: 0.2 }"
                :title="torchEnabled ? t('camera.flashOn') : t('camera.flashOff')" :aria-label="t('camera.toggleFlash')"
                class="p-3 rounded-full shadow-lg"
                :class="torchEnabled ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-800 text-white'">
            </MotionUButton>
        </div>
    </div>
</template>
