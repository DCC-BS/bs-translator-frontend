import {
    type ApiClient,
    ApiError,
    isApiError,
} from "@dcc-bs/communication.bs.js";
import type { LanguageCode } from "~/models/languages";
import type { TranslationConfig } from "~/models/translationConfig";
import type { TranslationInput } from "~/models/translationInput";
import {
    type BlockTranslationEvent,
    blockTranslationEventSchema,
    type ImageOcrResult,
    imageOcrResultSchema,
    type OcrBlock,
} from "~~/shared/models/conversionResult";

/**
 * Marks the end of a text translation stream that failed after it had started:
 * the backend sends U+001E followed by `{"errorId", "status"}` and closes.
 */
const STREAM_ERROR_SEPARATOR = "\u001e";

/**
 * Turns anything a fetch can throw into an ApiError (aborts become `request_aborted`).
 */
function toApiError(error: unknown): ApiError {
    if (isApiError(error)) {
        return error;
    }
    if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")
    ) {
        return new ApiError("request_aborted", 499);
    }
    return new ApiError(
        "fetch_failed",
        500,
        error instanceof Error ? error.message : String(error),
    );
}

function parseStreamError(payload: string): ApiError {
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

/**
 * Reads a response body as text chunks. Stopping early (consumer breaks or throws)
 * cancels the body, so the server stops working on a result nobody reads.
 */
async function* readTextStream(
    stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let finished = false;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                finished = true;
                const rest = decoder.decode();
                if (rest) {
                    yield rest;
                }
                return;
            }
            const text = decoder.decode(value, { stream: true });
            if (text) {
                yield text;
            }
        }
    } catch (error) {
        throw toApiError(error);
    } finally {
        if (!finished) {
            await reader.cancel().catch(() => undefined);
        }
        reader.releaseLock();
    }
}

/**
 * Splits a text stream into lines (NDJSON), handling lines split across chunks.
 */
async function* readLines(
    stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, void> {
    let buffer = "";
    for await (const chunk of readTextStream(stream)) {
        buffer += chunk;
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (line) {
                yield line;
            }
            newline = buffer.indexOf("\n");
        }
    }
    if (buffer.trim()) {
        yield buffer.trim();
    }
}

export class TranslationService {
    static readonly $injectKey = "TranslationService";
    static readonly $inject = ["logger", "apiClient"];

    constructor(
        private readonly logger: BaseLogger,
        private readonly apiClient: ApiClient,
    ) {}

    private async openStream(
        url: string,
        body: unknown,
        signal?: AbortSignal,
    ): Promise<ReadableStream<Uint8Array>> {
        let response: Awaited<ReturnType<ApiClient["apiStreamFetch"]>>;
        try {
            response = await this.apiClient.apiStreamFetch(url, {
                method: "POST",
                body: body as never,
                signal,
            });
        } catch (error) {
            throw toApiError(error);
        }
        if (isApiError(response)) {
            throw response;
        }
        return response;
    }

    /**
     * Translates text using a streaming response.
     *
     * @throws ApiError for HTTP errors, network errors (`fetch_failed`), aborts
     *   (`request_aborted`) and for a backend failure in the middle of the stream.
     */
    async *translate(
        text: string,
        config: TranslationConfig,
        signal?: AbortSignal,
    ): AsyncIterable<string> {
        const body: TranslationInput = { text, config };
        const stream = await this.openStream(
            "/api/translate/text",
            body,
            signal,
        );

        let errorPayload: string | undefined;
        for await (const chunk of readTextStream(stream)) {
            if (errorPayload !== undefined) {
                errorPayload += chunk;
                continue;
            }
            const separator = chunk.indexOf(STREAM_ERROR_SEPARATOR);
            if (separator < 0) {
                yield chunk;
                continue;
            }
            if (separator > 0) {
                yield chunk.slice(0, separator);
            }
            errorPayload = chunk.slice(separator + 1);
        }

        if (errorPayload !== undefined) {
            throw parseStreamError(errorPayload);
        }
    }

    /**
     * Recognises the text blocks of a photo (OCR with GLM-OCR on the backend).
     *
     * @throws ApiError
     */
    async ocrImage(
        image: Blob,
        sourceLanguage: LanguageCode,
        signal?: AbortSignal,
    ): Promise<ImageOcrResult> {
        const form = new FormData();
        const extension = image.type === "image/png" ? "png" : "jpg";
        form.append("image_file", image, `photo.${extension}`);
        form.append("source_language", sourceLanguage);

        let response: unknown;
        try {
            response = await this.apiClient.apiFetch(
                "/api/translate/image-ocr",
                {
                    method: "POST",
                    body: form,
                    signal,
                },
            );
        } catch (error) {
            throw toApiError(error);
        }
        if (isApiError(response)) {
            throw response;
        }

        const parsed = imageOcrResultSchema.safeParse(response);
        if (!parsed.success) {
            this.logger.error(`Invalid OCR response: ${parsed.error.message}`);
            throw new ApiError(
                "invalid_json_response",
                500,
                parsed.error.message,
            );
        }
        return parsed.data;
    }

    /**
     * Translates OCR blocks; yields one event per block as soon as it is done
     * (not in input order).
     *
     * @throws ApiError, also when the backend reports an error mid-stream
     */
    async *translateBlocks(
        blocks: OcrBlock[],
        config: TranslationConfig,
        signal?: AbortSignal,
    ): AsyncIterable<Extract<BlockTranslationEvent, { type: "translation" }>> {
        const stream = await this.openStream(
            "/api/translate/image-blocks",
            {
                blocks: blocks.map((block) => ({
                    id: block.id,
                    text: block.text,
                })),
                config,
            },
            signal,
        );

        for await (const line of readLines(stream)) {
            let json: unknown;
            try {
                json = JSON.parse(line);
            } catch {
                this.logger.error(`Invalid block translation line: ${line}`);
                continue;
            }
            const parsed = blockTranslationEventSchema.safeParse(json);
            if (!parsed.success) {
                this.logger.error(
                    `Invalid block translation event: ${parsed.error.message}`,
                );
                continue;
            }
            const event = parsed.data;
            if (event.type === "error") {
                throw new ApiError(event.errorId, event.status);
            }
            if (event.type === "done") {
                return;
            }
            yield event;
        }
    }

    /**
     * Detects the language of a given text
     * @param text - The text to detect the language of
     * @param signal - Optional AbortSignal to cancel the detection
     * @returns The detected language code and confidence score
     */
    async detectLanguage(
        text: string,
        signal?: AbortSignal,
    ): Promise<{ language: LanguageCode; confidence: number }> {
        const response = await this.apiClient.apiFetch<{
            language: LanguageCode;
            confidence: number;
        }>("/api/detect-language", {
            method: "POST",
            body: { text: text },
            signal,
        });

        if (isApiError(response)) {
            throw response;
        }

        return response;
    }
}
