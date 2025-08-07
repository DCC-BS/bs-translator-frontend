<script lang="ts" setup>
import { motion } from "motion-v";

const { t } = useI18n();

const emit = defineEmits<(e: "photo-captured", data: Blob) => void>();

// State variables

const isLoading = ref(true);
const capturedImage = ref<string | undefined>(undefined);
const capturedBlob = ref<Blob | null>(null);

const currentStream = ref<MediaStream | null>(null);
const cameraAvailable = ref(true);
const cameraError = ref<string | undefined>(undefined);

const cameraPreviewElement = ref<HTMLVideoElement>();
const fileInput = ref<HTMLInputElement>();

onMounted(() => {
    capturePhoto();
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
            return false;
        }

        // Try to enumerate devices to check if any camera exists
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');

        if (videoInputs.length === 0) {
            cameraAvailable.value = false;
            cameraError.value = t("camera.notAvailable");
            return false;
        }

        // Try to access the camera briefly to check permissions
        try {
            const testStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" }
            });            // Stop the test stream immediately
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
        return; // Error message is already set in cameraError
    }

    startCamera();
}

function startCamera(): void {
    const facingMode = "environment"; // Always use back camera

    if (currentStream.value) {
        const tracks = currentStream.value.getTracks();

        for (const track of tracks) {
            track.stop();
        }

        currentStream.value = null;
    }

    // Clear video source before requesting new stream
    if (cameraPreviewElement.value?.srcObject) {
        cameraPreviewElement.value.srcObject = null;
    }

    navigator.mediaDevices
        .getUserMedia({
            video: {
                facingMode: facingMode,
            },
        })
        .then((stream) => {
            currentStream.value = stream;

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

            isLoading.value = false;
        })
        .catch((err) => {
            console.error("Error accessing camera:", err);
            // Show error message to user
            alert(t("camera.permissionsError"));
        });
}

function handleFileUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files?.[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!target.files?.[0]) {
                return;
            }

            capturedBlob.value = target.files[0];
            capturedImage.value = e.target?.result as string;
        };
        reader.readAsDataURL(target.files[0]);
    }
}

/**
 * Take photo from video stream on mobile
 */
function takePhoto(): void {
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

        currentStream.value = null;
    }

    if (cameraPreviewElement.value?.srcObject) {
        cameraPreviewElement.value.srcObject = null;
    }

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
</script>

<template>
    <div class="absolute top-0 left-0 right-0 bottom-0">
        <div v-if="isLoading" class="w-full h-full flex justify-center items-center">
            <motion.div class="w-16 h-16" :animate="{ rotate: 360 }"
                :transition="{ duration: 1.5, repeat: Infinity, ease: 'linear' }">
                <UIcon name="i-lucide-loader" class="w-full h-full" />
            </motion.div>
        </div>
        <!-- Show error message if camera is not available -->
        <div v-else-if="!cameraAvailable && cameraError" class="camera-error">
            <p>{{ cameraError }}</p>
        </div>

        <div v-else-if="!capturedImage">
            <video autoplay playsinline ref="cameraPreviewElement" class="w-full h-full absolute object-contain" />
            <div class="absolute bottom-5 left-0 right-0 flex justify-center items-center">
                <button @click="takePhoto"
                    class="absolute ring-1 border-gray-50 rounded-full w-[100px] h-[100px] bg-white bottom-0">
                </button>
            </div>
        </div>

        <div v-else>
            <img :src="capturedImage" :alt="t('camera.capturedImageAlt')" class="w-full h-full absolute object-contain">

            <div class="absolute bottom-5 left-0 right-0 flex justify-center items-center">
                <UButton @click="retakePhoto">
                    {{ t('camera.retake') }}
                </UButton>
                <UButton @click="submitPhoto">
                    {{ t('camera.submit') }}
                </UButton>
            </div>
        </div>

        <!-- File input for fallback -->
        <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="handleFileUpload">
    </div>
</template>
