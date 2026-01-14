import { isApiError } from "@dcc-bs/communication.bs.js";
import { watchDebounced } from "@vueuse/core";
import type { Domain } from "~/models/domain";
import type { LanguageCode } from "~/models/languages";
import type { Tone } from "~/models/tone";
import type { TranslationConfig } from "~/models/translationConfig";
import { TranslationService } from "~/services/translationService";
import {
    TRANSLATION_DEBOUNCE_MS,
    TRANSLATION_MAX_WAIT_MS,
} from "~/utils/constants";

/**
 * Composable for handling text translation with streaming support
 */
export function useTranslate() {
    const translationService = useService(TranslationService);
    const { t } = useI18n();

    const tone = useCookie<Tone>("tone", { default: () => "default" });
    const domain = useCookie<Domain>("domain", { default: () => "None" });
    const glossary = useCookie<string>("glossary", { default: () => "" });

    const sourceLanguage = useCookie<LanguageCode>("sourceLanguage", {
        default: () => "auto",
    });
    const targetLanguage = useCookie<LanguageCode>("targetLanguage", {
        default: () => "en-us",
    });

    const sourceText = ref<string>("");
    const translatedText = ref<string>("");

    // Shared state for language detection across the app
    const detectedSourceLanguage = useState<LanguageCode | undefined>(
        "detectedSourceLanguage",
        () => undefined,
    );
    const isDetectingLanguage = useState<boolean>(
        "isDetectingLanguage",
        () => false,
    );

    const isTranslating = ref<boolean>(false);
    const abortController = ref<AbortController | undefined>(undefined);

    onUnmounted(() => {
        abortController.value?.abort();
    });

    /**
     * Detects the language of the given text.
     * @param text - Text to detect the language of
     * @param signal - AbortSignal for cancellation
     * @returns The detected language code or "auto" string if detection fails
     */
    async function detectLanguage(
        text: string,
        signal: AbortSignal,
    ): Promise<LanguageCode | "auto"> {
        // If source language is not set to auto, always return "auto"
        if (sourceLanguage.value !== "auto") {
            return "auto";
        }

        // If text is empty, clear detected language and return "auto"
        if (text.trim() === "") {
            clearDetectedLanguage();
            return "auto";
        }

        isDetectingLanguage.value = true;

        try {
            const result = await translationService.detectLanguage(
                text,
                signal,
            );

            if (signal.aborted) {
                return "auto";
            }

            detectedSourceLanguage.value = result.language as LanguageCode;
            return result.language as LanguageCode;
        } catch (error) {
            // Only log errors if not aborted
            if (!signal.aborted) {
                console.error("Language detection failed:", error);
            }
            return "auto";
        } finally {
            if (!signal.aborted) {
                isDetectingLanguage.value = false;
            }
        }
    }

    /**
     * Clears the detected language state when source language is changed from auto
     * or when source text is cleared.
     */
    function clearDetectedLanguage(): void {
        detectedSourceLanguage.value = undefined;
        isDetectingLanguage.value = false;
    }

    /**
     * Translates the source text using the configured settings.
     * Handles language detection if source language is set to 'auto'.
     * Can be aborted with the abort() function.
     */
    async function translate(): Promise<void> {
        if (sourceText.value.trim() === "") {
            clearDetectedLanguage();
            return;
        }

        translatedText.value = "";
        isTranslating.value = true;

        abortController.value?.abort();
        abortController.value = new AbortController();

        const signal = abortController.value.signal;

        try {
            await detectLanguage(sourceText.value, signal);

            const batches = translateBatched(sourceText.value, signal);
            try {
                for await (const chunk of batches) {
                    if (signal.aborted) {
                        break;
                    }
                    translatedText.value += chunk;
                }
            } catch (_error) {
                if (!signal.aborted) {
                    showError(new Error(t("api_error.unexpected_error")));
                }
            }
        } finally {
            isTranslating.value = false;
        }
    }

    /**
     * Translates a specific text string and returns the result.
     * Handles language detection if source language is set to 'auto'.
     * @param text - Text to translate
     * @returns Translated text
     */
    async function translateText(text: string): Promise<string> {
        // Return empty string if input is empty or only whitespace
        if (text.trim() === "") {
            return "";
        }

        if (!abortController.value) {
            abortController.value = new AbortController();
        }

        const signal = abortController.value.signal;
        let translated = "";

        try {
            await detectLanguage(text, signal);

            const batches = translateBatched(text, signal);

            for await (const chunk of batches) {
                if (signal.aborted) {
                    break;
                }
                translated += chunk;
            }
        } catch (error) {
            if (signal.aborted) {
                showError(new Error(t("api_error.translation.aborted")));
            } else if (isApiError(error)) {
                showError(
                    new Error(t(`api_error.translation.${error.errorId}`)),
                );
            } else {
                showError(
                    error instanceof Error
                        ? error
                        : new Error(t("api_error.unexpected_error")),
                );
            }
        } finally {
            isTranslating.value = false;
        }

        return translated;
    }

    /**
     * Internal function to handle batched translation with streaming
     * @param text Text to translate
     * @param signal Abort signal for cancellation
     * @yields Translated text chunks
     */
    async function* translateBatched(
        text: string,
        signal: AbortSignal,
    ): AsyncIterable<string> {
        const config: TranslationConfig = {
            source_language:
                sourceLanguage.value === "auto"
                    ? (detectedSourceLanguage.value ?? "auto")
                    : sourceLanguage.value,
            target_language: targetLanguage.value,
            domain: domain.value,
            tone: tone.value,
            glossary: glossary.value,
        };

        try {
            yield* translationService.translate(text, config, signal);
        } catch (error: unknown) {
            // Silently ignore abort errors
            if (signal.aborted) {
                return;
            }

            if (isApiError(error)) {
                showError(
                    new Error(t(`api_error.translation.${error.errorId}`)),
                );
            } else {
                showError(new Error(t("api_error.unexpected_error")));
            }

            return;
        }
    }

    /**
     * Aborts the current translation process if one is in progress
     */
    function abort(): void {
        if (abortController.value && isTranslating.value) {
            abortController.value.abort();
            isTranslating.value = false;
        }
    }

    // Clear detected language when source language is changed from auto
    watch(sourceLanguage, (newLang) => {
        if (newLang !== "auto") {
            clearDetectedLanguage();
        }
    });

    // Trigger translation when config changes (debounced)
    watchDebounced(
        [targetLanguage, sourceLanguage, tone, domain, glossary],
        () => {
            // Only translate if source text is not empty
            if (sourceText.value.trim() !== "") {
                translate();
            }
        },
        {
            debounce: TRANSLATION_DEBOUNCE_MS,
            maxWait: TRANSLATION_MAX_WAIT_MS,
        },
    );

    return {
        tone,
        domain,
        glossary,
        sourceLanguage,
        targetLanguage,
        sourceText,
        translatedText,
        detectedSourceLanguage,
        isTranslating,
        isDetectingLanguage,
        translate,
        translateText,
        abort,
    };
}
