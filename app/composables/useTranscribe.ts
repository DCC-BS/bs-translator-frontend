import { isApiError } from "@dcc-bs/communication.bs.js";
import type { LanguageCode } from "~/models/languages";
import { parseStreamError, STREAM_ERROR_SEPARATOR } from "~/utils/streamError";

/**
 * Composable for handling audio transcription via streaming API
 */
export function useTranscribe() {
    const error = ref<string>();
    const i18n = useI18n();
    const { showError } = useUserFeedback();
    const { apiStreamFetch } = useApi();

    function errorMessage(errorId: string): string {
        return apiErrorMessage(i18n, "transcribe", errorId);
    }

    /**
     * Transcribes audio blob to text using streaming response
     * @param blob Audio blob to transcribe
     * @param language Language code for transcription
     * @yields Transcribed text chunks
     */
    async function* transcribe(
        blob: Blob,
        language?: LanguageCode,
        signal?: AbortSignal,
    ): AsyncGenerator<string> {
        const formData = new FormData();
        formData.append("audio_file", blob, "audio.webm");
        // Ensure language is never undefined, default to "auto"
        formData.append("language", language || "auto");

        const response = await apiStreamFetch("/api/transcribe/audio", {
            method: "POST",
            body: formData,
            signal,
        });

        if (isApiError(response)) {
            error.value = response.message;

            if (response.errorId !== "request_aborted") {
                showError(new Error(errorMessage(response.errorId)));
            }

            return;
        }
        const reader = response.getReader();
        const decoder = new TextDecoder();
        // Set once the backend reported a failure in the middle of the stream.
        let errorPayload: string | undefined;

        function* textBeforeError(chunk: string): Generator<string> {
            if (errorPayload !== undefined) {
                errorPayload += chunk;
                return;
            }
            const separator = chunk.indexOf(STREAM_ERROR_SEPARATOR);
            if (separator < 0) {
                if (chunk) yield chunk;
                return;
            }
            if (separator > 0) yield chunk.slice(0, separator);
            errorPayload = chunk.slice(separator + 1);
        }

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                yield* textBeforeError(decoder.decode(value, { stream: true }));
            }
            yield* textBeforeError(decoder.decode());

            if (errorPayload !== undefined) {
                // The text so far stays; the user is told it is incomplete.
                const streamError = parseStreamError(errorPayload);
                error.value = streamError.message;
                showError(new Error(errorMessage(streamError.errorId)));
            }
        } catch (e) {
            // Aborted by the caller: stop silently.
            if (signal?.aborted) return;

            error.value = String(e);
            showError(
                new Error(
                    errorMessage(isApiError(e) ? e.errorId : "fetch_failed"),
                ),
            );
        } finally {
            reader.releaseLock();
        }
    }

    return {
        transcribe,
        error,
    };
}
