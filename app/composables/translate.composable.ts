import type { Domain } from "~/models/domain";
import type { LanguageCode } from "~/models/languages";
import type { Tone } from "~/models/tone";
import type { TranslationConfig } from "~/models/translationConfig";
import { TranslationService } from "~/services/tanslationService";

export const useTranslate = () => {
    const translationService = useService(TranslationService);
    const toast = useToast();
    const { t } = useI18n();

    const tone = useCookie<Tone>("tone", { default: () => "default" });
    const domain = useCookie<Domain>("domain", { default: () => "None" });
    const glossary = useCookie<string>("glossary", { default: () => "" });

    const sourceLanguage = useCookie<LanguageCode>("sourceLanguage", {
        default: () => "auto",
    });
    const targetLanguage = useCookie<LanguageCode>("targetLanguage", {
        default: () => "en",
    });

    const sourceText = ref<string>("");
    const translatedText = ref<string>("");
    const isTranslating = ref<boolean>(false);
    const abortController = ref<AbortController | undefined>(undefined);

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

        if (!abortController.value) {
            abortController.value = new AbortController();
        }

        const signal = abortController.value.signal;

        try {
            const batches = await _translateBatched(sourceText.value, signal);

            for await (const chunk of batches) {
                if (signal.aborted) {
                    break;
                }
                translatedText.value += chunk;
            }
        } catch (error) {
            if (!signal.aborted) {
                console.error("Translation error:", error);
                toast.add({
                    title: t("translation.error"),
                    description: t("translation.errorDescription"),
                    color: "error",
                    icon: "i-lucide-circle-alert",
                });
            }
        } finally {
            isTranslating.value = false;
        }
    }

    async function translateText(text: string): Promise<string> {
        if (!abortController.value) {
            abortController.value = new AbortController();
        }

        const signal = abortController.value.signal;

        const config: TranslationConfig = {
            source_language: sourceLanguage.value,
            target_language: targetLanguage.value,
            domain: domain.value,
            tone: tone.value,
            glossary: glossary.value,
        };
        let translated = "";

        try {
            const batches = translationService.translate(text, config, signal);

            for await (const chunk of batches) {
                if (signal.aborted) {
                    break;
                }
                translated += chunk;
            }
        } catch (error) {
            if (!signal.aborted) {
                console.error("Translation error:", error);
            }
            toast.add({
                title: t("translation.error"),
                description: t("translation.errorDescription"),
                color: "error",
                icon: "i-lucide-circle-alert",
            });
        } finally {
            isTranslating.value = false;
        }

        return translated;
    }

    async function _translateBatched(
        text: string,
        signal: AbortSignal,
    ): Promise<AsyncIterable<string>> {
        const config: TranslationConfig = {
            source_language: sourceLanguage.value,
            target_language: targetLanguage.value,
            domain: domain.value,
            tone: tone.value,
            glossary: glossary.value,
        };

        return translationService.translate(text, config, signal);
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

    watch([targetLanguage, sourceLanguage, tone, domain, glossary], () => {
        translate();
    });

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
