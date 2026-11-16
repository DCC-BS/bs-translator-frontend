<script lang="ts" setup>
definePageMeta({
    layout: "photo",
});

const router = useRouter();

/** The photo being translated; `undefined` while the camera is shown. */
const photo = shallowRef<Blob>();

function onPhotoCaptured(image: Blob): void {
    photo.value = image;
}

function onPhotoCanceled(): void {
    router.push({ path: "/" });
}

function onRetake(): void {
    photo.value = undefined;
}
</script>

<template>
    <div class="w-full h-full">
        <OcrImage v-if="photo" :image="photo" @retake="onRetake" />
        <CameraCapture v-else @photo-captured="onPhotoCaptured" @photo-canceled="onPhotoCanceled" />
    </div>
</template>
