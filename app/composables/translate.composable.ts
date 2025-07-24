import type { Domain } from "~/models/domain";
import type { Tone } from "~/models/tone";
import type { TranslationConfig } from "~/models/translationConfig";
import { TranslationService } from "~/services/tanslationService";
import { useStorage } from "@vueuse/core";

export const useTranslate = () => {
    const translationService = useService(TranslationService);

    const tone = useStorage<Tone>("tone", "default");
    const domain = useStorage<Domain>("domain", "None");
    const glossary = useStorage<string>("glossary", "");
    const sourceLanguage = useStorage<string>("sourceLanguage", "auto");
    const targetLanguage = useStorage<string>("targetLanguage", "en");

    const sourceText = ref<string>("");
    const translatedText = ref<string>("");
    const isTranslating = ref<boolean>(false);
    const abortController = ref<AbortController | undefined>(undefined);

    /**
     * Translates the source text using the configured settings
     * Can be aborted with the abort() function
     */
    async function translate(): Promise<void> {
        translatedText.value = ""; // Clear previous translation
        isTranslating.value = true;

        abortController.value?.abort(); // Abort any previous translation if in progress

        // Create a new AbortController for this translation operation
        abortController.value = new AbortController();
        const signal = abortController.value.signal;

        const config: TranslationConfig = {
            source_language: sourceLanguage.value,
            target_language: targetLanguage.value,
            domain: domain.value,
            tone: tone.value,
            glossary: glossary.value,
        };

        try {
            const batches = translationService.translate(
                sourceText.value,
                config,
                signal,
            );

            for await (const chunk of batches) {
                if (signal.aborted) {
                    break;
                }
                translatedText.value += chunk;
            }
        } catch (error) {
            if (!signal.aborted) {
                console.error("Translation error:", error);
            }
        } finally {
            isTranslating.value = false;
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
        abort,
    };
};
