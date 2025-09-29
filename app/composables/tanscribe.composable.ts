export function useTranscribe() {
    const error = ref<string>();
    const logger = useLogger();
    const toast = useToast();

    async function* transcribe(blob: Blob) {
        const formData = new FormData();
        formData.append("file", blob, "audio.webm");

        const response = await apiStreamfetch("/api/transcribe", {
            method: "POST",
            body: formData,
        });

        if (isApiError(response)) {
            error.value = response.message;
            logger.error(response);
            toast.add({
                title: "Transcription Error",
                description: response.message,
                icon: "i-lucide-circle-alert",
                color: "error",
            });

            yield "";
        } else {
            const reader = response.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    const chunk = decoder.decode(value, { stream: true });
                    yield chunk;
                }
            } finally {
                reader.releaseLock();
            }
        }
    }

    return {
        transcribe,
        error,
    };
}
