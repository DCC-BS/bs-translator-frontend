<script lang="ts" setup>
definePageMeta({
    layout: false,
});

const router = useRouter();

function onPhotoCanceled() {
    router.push({ path: "/" });
}
</script>

<template>
    <div>
        <CameraCapture @photo-canceled="onPhotoCanceled" class="bg-gray-200" />
    </div>
</template>