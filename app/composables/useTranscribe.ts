import { isApiError } from "@dcc-bs/communication.bs.js";
import type { LanguageCode } from "~/models/languages";

/**
 * Composable for handling audio transcription via streaming API
 */
export function useTranscribe() {
    const error = ref<string>();
    const { t } = useI18n();
    const { showError } = useUserFeedback();
    const { apiStreamFetch } = useApi();

    /**
     * Transcribes audio blob to text using streaming response
     * @param blob Audio blob to transcribe
     * @param language Language code for transcription
     * @yields Transcribed text chunks
     */
    async function* transcribe(blob: Blob, language: LanguageCode) {
        const formData = new FormData();
        formData.append("audio_file", blob, "audio.webm");
        // Ensure language is never undefined, default to "auto"
        formData.append("language", language || "auto");

        const response = await apiStreamFetch("/api/transcribe/audio", {
            method: "POST",
            body: formData,
        });

        if (isApiError(response)) {
            error.value = response.message;
            showError(new Error(t(`api_error.transcribe.${response.errorId}`)));

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
