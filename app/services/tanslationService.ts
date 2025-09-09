import {
    conversionImageTextEntrySchema,
    type ConversionImageTextEntry,
} from "~/models/convertionResult";
import type { TranslationConfig } from "~/models/translationConfig";
import type { TranslationInput } from "~/models/translationInput";
import { apiStreamfetch, isApiError } from "~/utils/apiFetch";

export class TranslationService {
    static readonly $injectKey = "TranslationService";
    static readonly $inject = [];

    /**
     * Translates text using streaming response
     * @param text - The text to translate
     * @param config - Translation configuration
     * @param signal - Optional AbortSignal to cancel the translation
     * @returns An async iterable of translated text chunks
     */
    async *translate(
        text: string,
        config: TranslationConfig,
        signal?: AbortSignal,
    ): AsyncIterable<string> {
        const body: TranslationInput = {
            text,
            config,
        };

        const response = await apiStreamfetch("/api/translate", {
            method: "POST",
            body: body,
            signal,
        });

        if (isApiError(response)) {
            throw response;
        }

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

    async *translateImage(
        image: Blob,
        config: TranslationConfig,
        signal?: AbortSignal,
    ): AsyncIterable<ConversionImageTextEntry> {
        const form = new FormData();
        form.append("image_file", image, "image.png");
        form.append("translation_config", JSON.stringify(config));

        const response = await apiStreamfetch("/api/translate/image", {
            method: "POST",
            body: form,
            signal,
        });

        if (isApiError(response)) {
            throw response;
        }

        const reader = response.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                yield conversionImageTextEntrySchema.parse(JSON.parse(chunk));
            }
        } finally {
            reader.releaseLock();
        }
    }
}
