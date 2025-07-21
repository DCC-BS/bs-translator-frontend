import type { TranslationConfig } from "~/models/translationConfig";
import type { TranslationInput } from "~/models/translationInput";

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

        const response = (await $fetch("/api/translate", {
            responseType: "stream",
            method: "POST",
            body: body,
            signal,
        })) as ReadableStream<Uint8Array>;

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
