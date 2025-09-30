<script lang="ts" setup>
import type { AudioRecorder } from '#components';

const emit = defineEmits<(e: "onRecodingComplete", file: Blob) => void>();

const { t } = useI18n();

const {
    isReady,
    abandonedRecording,
    deleteAbandonedRecording,
    getMp3Blob
} = useAudioSessions({ deleteOldSessionsDaysInterval: 30, maxSessionsToKeep: 1, logger: console.log });

const audioRecorder = ref<typeof AudioRecorder>();
const toast = useToast();
const isRecordingDrawerOpen = ref(false);
const isRecording = ref(false);

const lastAbandonedRecordingLocalDate = computed(() => {
    if (abandonedRecording.value && abandonedRecording.value.length > 0) {
        const last = abandonedRecording.value[abandonedRecording.value.length - 1];

        if (last) {
            return new Date(last.createdAt).toLocaleString();
        }
    }

    return null;
});

function onRecordingStopped(file: Blob, _: string) {
    isRecording.value = false;
    isRecordingDrawerOpen.value = false;
    emit("onRecodingComplete", file);
}

function stopRecording() {
    audioRecorder.value?.stopRecording();
}

async function recover() {
    if (!abandonedRecording.value) return;

    const last = abandonedRecording.value[abandonedRecording.value.length - 1];
    if (last) {
        try {
            const blob = await getMp3Blob(last.id);
            deleteAbandonedRecording(last.id);
            isRecordingDrawerOpen.value = false;
            emit("onRecodingComplete", blob);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);

            toast.add({
                title: message,
                color: 'error',
                icon: 'i-lucide-alert-circle',
            });
        }
    }
}
</script>

<template>
    <UDrawer v-model:open="isRecordingDrawerOpen" @close="stopRecording">
        <UButton icon="i-lucide-mic" variant="link" color="neutral" data-testid="microphoneButton" />
        <template #content>
            <div class="w-full">
                <div class="p-2 max-w-[800px] m-auto">
                    <div v-if="!isReady">
                        <USkeleton class="w-full h-[400px]" />
                    </div>
                    <div v-else>
                        <div class="flex flex-col justify-center items-center"
                            v-if="!isRecording && abandonedRecording && abandonedRecording.length > 0">
                            <p class="mb-2 text-sm text-gray-500">
                                {{ t("audio.abandonedRecording", { date: lastAbandonedRecordingLocalDate }) }}
                            </p>

                            <UButton icon="i-lucide-history" variant="ghost" color="secondary" @click="recover">{{
                                t("audio.recover") }}
                            </UButton>
                        </div>

                        <AudioRecorder ref="audioRecorder" :logger="console.log"
                            :auto-start="abandonedRecording && abandonedRecording.length === 0" :show-result="false"
                            @recording-started="isRecording = true" @recording-stopped="onRecordingStopped" />
                    </div>
                </div>
            </div>
        </template>
    </UDrawer>
</template>