<script lang="ts" setup>
// Import i18n composable
const { t } = useI18n();

// Define emits
const emit = defineEmits<(e: "photo-captured", data: Blob) => void>();

// State variables
const showCamera = ref(false);
const capturedImage = ref<string | undefined>(undefined);
const capturedBlob = ref<Blob | null>(null);

// Track which camera is active (true = front camera, false = back camera)
const usingFrontCamera = ref(false);
// Store the current camera stream to easily switch cameras
const currentStream = ref<MediaStream | null>(null);
// Add loading state to prevent multiple camera switches at once
const isSwitchingCamera = ref(false);

const cameraPreviewElement = ref<HTMLVideoElement>();

// Detect if the device is mobile
onMounted(() => {
    capturePhoto();
});

/**
 * Open camera or file dialog based on device type
 */
function capturePhoto(): void {
    showCamera.value = true;
    // Access camera on mobile devices with specific camera preference
    startCamera();
}

/**
 * Start camera with current camera settings
 */
function startCamera(): void {
    // Set the camera facing mode based on the selected camera
    const facingMode = usingFrontCamera.value ? "user" : "environment";

    // Set loading state to prevent multiple attempts
    isSwitchingCamera.value = true;

    // Properly stop any existing stream before starting a new one
    if (currentStream.value) {
        const tracks = currentStream.value.getTracks();

        for (const track of tracks) {
            track.stop();
        }

        currentStream.value = null;
    }

    // Clear video source before requesting new stream
    const videoElement = document.getElementById(
        "camera-preview",
    ) as HTMLVideoElement;
    if (videoElement?.srcObject) {
        videoElement.srcObject = null;
    }

    // Access camera with specified constraints
    navigator.mediaDevices
        .getUserMedia({
            video: {
                facingMode: facingMode,
            },
        })
        .then((stream) => {
            currentStream.value = stream;

            // Make sure the video element still exists (user might have navigated away)
            const videoElement = document.getElementById(
                "camera-preview",
            ) as HTMLVideoElement;
            if (videoElement) {
                videoElement.srcObject = stream;
                videoElement
                    .play()
                    .then(() => {
                        // Camera started successfully
                        isSwitchingCamera.value = false;
                    })
                    .catch((err) => {
                        console.error("Error playing video stream:", err);
                        isSwitchingCamera.value = false;
                    });
            } else {
                // Clean up if video element is gone
                stopCameraStream();
                isSwitchingCamera.value = false;
            }
        })
        .catch((err) => {
            console.error("Error accessing camera:", err);
            // If back camera fails, try falling back to any available camera
            if (!usingFrontCamera.value) {
                console.log("Falling back to front camera");
                usingFrontCamera.value = true;
                isSwitchingCamera.value = false;
                startCamera();
            } else {
                // Use translated alert message
                alert(t("camera.permissionsError"));
                isSwitchingCamera.value = false;
                showCamera.value = false;
            }
        });
}

/**
 * Toggle between front and back cameras
 */
function toggleCamera(): void {
    // Prevent multiple simultaneous camera switches
    if (isSwitchingCamera.value) return;

    // Switch the camera preference
    usingFrontCamera.value = !usingFrontCamera.value;

    // Restart camera with new setting
    startCamera();
}

/**
 * Handle file upload for desktop
 * @param event - File input change event
 */
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
    const video = document.getElementById("camera-preview") as HTMLVideoElement;
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

/**
 * Stop camera stream
 */
function stopCameraStream(): void {
    // Only attempt to stop if there's an active stream
    if (currentStream.value) {
        const tracks = currentStream.value.getTracks();

        for (const track of tracks) {
            track.stop();
        }

        currentStream.value = null;
    }

    // Also clear the video element source
    const video = document.getElementById("camera-preview") as HTMLVideoElement;
    if (video?.srcObject) {
        video.srcObject = null;
    }

    showCamera.value = false;
}

/**
 * Retake photo function
 */
function retakePhoto(): void {
    capturedImage.value = undefined;
    capturePhoto();
}

/**
 * Submit photo to parent component
 */
function submitPhoto(): void {
    if (capturedBlob.value) {
        // Emit event with captured image to parent component
        emit("photo-captured", capturedBlob.value);
    }
    capturedImage.value = undefined;
}
</script>

<template>
    <div class="camera-capture-container">
        <!-- Show camera view or upload button based on state -->
        <div v-if="!capturedImage" class="capture-section">
            <!-- Camera view on mobile devices -->
            <div v-if="showCamera" class="camera-view">
                <video autoplay playsinline ref="cameraPreviewElement" />
                <button class="capture-button" @click="takePhoto">
                    {{ t('camera.takePhoto') }}
                </button>
                <!-- Add camera toggle button with loading state -->
                <button class="switch-camera-button" :disabled="isSwitchingCamera" @click="toggleCamera">
                    {{
                        isSwitchingCamera
                            ? t('camera.switching')
                            : t('camera.switchCamera', [t(usingFrontCamera ? 'camera.front' : 'camera.back')])
                    }}
                </button>
                <!-- Add loading indicator when switching cameras -->
                <div v-if="isSwitchingCamera" class="camera-loading">
                    {{ t('camera.switchingCamera') }}
                </div>
            </div>

            <!-- Capture/upload button when no camera is shown -->
            <button v-else class="start-button" @click="capturePhoto">
                {{ t('camera.takeAPhoto') }}
            </button>

            <!-- Hidden file input for desktop -->
            <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="handleFileUpload">
        </div>

        <!-- Preview captured image -->
        <div v-else class="preview-section">
            <img :src="capturedImage" :alt="t('camera.capturedImageAlt')" class="preview-image">

            <div class="action-buttons">
                <button class="retake-button" @click="retakePhoto">
                    {{ t('camera.retake') }}
                </button>
                <button class="submit-button" @click="submitPhoto">
                    {{ t('camera.submit') }}
                </button>
            </div>
        </div>
    </div>
</template>