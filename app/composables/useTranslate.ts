import { isApiError } from "@dcc-bs/communication.bs.js";
import { watchDebounced } from "@vueuse/core";
import type { Domain } from "~/models/domain";
import type { LanguageCode } from "~/models/languages";
import type { Tone } from "~/models/tone";
import type { TranslationConfig } from "~/models/translationConfig";
import { TranslationService } from "~/services/translationService";

/**
 * Composable for handling text translation with streaming support
 */
export function useTranslate() {
    const translationService = useService(TranslationService);
    const { showError } = useUserFeedback();
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
    const isTranslating = ref<boolean>(false);
    const abortController = ref<AbortController | undefined>(undefined);

    onUnmounted(() => {
        abortController.value?.abort();
    });

    /**
     * Translates the source text using the configured settings
     * Can be aborted with the abort() function
     */
    async function translate(): Promise<void> {
        if (sourceText.value.trim() === "") {
            return;
        }

        translatedText.value = ""; // Clear previous translation
        isTranslating.value = true;

        abortController.value?.abort();
        abortController.value = new AbortController();

        const signal = abortController.value.signal;

        try {
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
     * Translates a specific text string and returns the result
     * @param text Text to translate
     * @returns Translated text
     */
    async function translateText(text: string): Promise<string> {
        if (!abortController.value) {
            abortController.value = new AbortController();
        }

        const signal = abortController.value.signal;
        let translated = "";

        try {
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
            source_language: sourceLanguage.value,
            target_language: targetLanguage.value,
            domain: domain.value,
            tone: tone.value,
            glossary: glossary.value,
        };

        try {
            yield* translationService.translate(text, config, signal);
        } catch (error: unknown) {
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

    watchDebounced(
        [targetLanguage, sourceLanguage, tone, domain, glossary],
        () => {
            translate();
        },
        {
            debounce: 1000,
            maxWait: 5000,
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
        isTranslating,
        translate,
        translateText,
        abort,
    };
}
