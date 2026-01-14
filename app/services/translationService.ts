import { type ApiClient, isApiError } from "@dcc-bs/communication.bs.js";
import type { TranslationConfig } from "~/models/translationConfig";
import type { TranslationInput } from "~/models/translationInput";
import type { LanguageCode } from "~/models/languages";
import {
    type ConversionImageTextEntry,
    conversionImageTextEntrySchema,
} from "~~/shared/models/conversionResult";

export class TranslationService {
    static readonly $injectKey = "TranslationService";
    static readonly $inject = ["logger", "apiClient"];

    constructor(
        private readonly logger: BaseLogger,
        private readonly apiClient: ApiClient,
    ) {}

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

        const response = await this.apiClient.apiStreamFetch(
            "/api/translate/text",
            {
                method: "POST",
                body: body,
                signal,
            },
        );

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

        const response = await this.apiClient.apiStreamFetch(
            "/api/translate/image",
            {
                method: "POST",
                body: form,
                signal,
            },
        );

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
                const result = conversionImageTextEntrySchema.safeParse(
                    JSON.parse(chunk),
                );

                if (!result.success) {
                    this.logger.error(
                        `Failed to parse translation image text entry: ${result.error.message}`,
                    );
                } else {
                    yield result.data;
                }
            }
        } finally {
            reader.releaseLock();
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
