import { watchDebounced } from "@vueuse/core";
import type { Domain } from "~/models/domain";
import type { LanguageCode } from "~/models/languages";
import type { Tone } from "~/models/tone";
import type { TranslationConfig } from "~/models/translationConfig";
import { TranslationService } from "~/services/translationService";
import { isApiError } from "~/utils/apiFetch";

export const useTranslate = () => {
    const translationService = useService(TranslationService);
    const { showError } = useUserFeedback();
    const { t } = useI18n();
    const logger = useLogger();

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

        const logger = useLogger();

        translatedText.value = ""; // Clear previous translation
        isTranslating.value = true;

        abortController.value?.abort();
        abortController.value = new AbortController();

        const signal = abortController.value.signal;

        try {
            const batches = _translateBatched(sourceText.value, signal);
            try {
                for await (const chunk of batches) {
                    if (signal.aborted) {
                        break;
                    }
                    translatedText.value += chunk;
                }
            } catch (error) {
                logger.error("Translation error:", error);

                if (!signal.aborted) {
                    showError(
                        t("translation.errorTitle"),
                        t("translation.errorTimeout"),
                    );
                }
            }
        } catch (error) {
            logger.error("Translation error:", error);

            if (error instanceof TypeError) {
                logger.error("cauuse", error.cause);
                logger.error("message", error.message);
                logger.error("stack", error.stack);
                logger.error("name", error.name);
            }

            showError(
                t("translation.errorTitle"),
                t("translation.errorDescription"),
            );
        } finally {
            isTranslating.value = false;
        }
    }

    async function translateText(text: string): Promise<string> {
        if (!abortController.value) {
            abortController.value = new AbortController();
        }

        const signal = abortController.value.signal;
        let translated = "";

        try {
            const batches = _translateBatched(text, signal);

            for await (const chunk of batches) {
                if (signal.aborted) {
                    break;
                }
                translated += chunk;
            }
        } catch (error) {
            if (!signal.aborted) {
                logger.error("Translation error:", error);
            }

            showError(
                t("translation.errorTitle"),
                t("translation.errorDescription"),
            );
        } finally {
            isTranslating.value = false;
        }

        return translated;
    }

    async function* _translateBatched(
        text: string,
        signal: AbortSignal,
    ): AsyncIterable<string> {
        const logger = useLogger();
        const toast = useToast();

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
            logger.error("Translation error:", { extra: error });

            if (isApiError(error)) {
                toast.add({
                    title: t("translation.errorTitle"),
                    description: t(`translation.error.${error.errorId}`),
                    color: "error",
                    icon: "i-lucide-circle-alert",
                });
            } else {
                toast.add({
                    title: t("translation.errorTitle"),
                    description: t("translation.errorDescription"),
                    color: "error",
                    icon: "i-lucide-circle-alert",
                });
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
};
