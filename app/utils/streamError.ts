import { ApiError } from "@dcc-bs/communication.bs.js";

/**
 * Marks the end of a text stream (translation, transcription) that failed after it
 * had started: the backend sends U+001E followed by `{"errorId", "status"}` and closes.
 */
export const STREAM_ERROR_SEPARATOR = "\u001e";

/** Builds the ApiError described by the JSON that follows the separator. */
export function parseStreamError(payload: string): ApiError {
    try {
        const parsed = JSON.parse(payload) as {
            errorId?: string;
            status?: number;
        };
        return new ApiError(
            parsed.errorId ?? "unexpected_error",
            parsed.status ?? 500,
        );
    } catch {
        return new ApiError("unexpected_error", 500, payload);
    }
}
