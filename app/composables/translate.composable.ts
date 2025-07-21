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

    async function translate(): Promise<void> {
        translatedText.value = ""; // Clear previous translation

        const config: TranslationConfig = {
            source_language: sourceLanguage.value,
            target_language: targetLanguage.value,
            domain: domain.value,
            tone: tone.value,
            glossary: glossary.value,
        };

        const batches = translationService.translate(sourceText.value, config);

        for await (const chunk of batches) {
            translatedText.value += chunk;
        }
    }

    return {
        tone,
        domain,
        glossary,
        sourceLanguage,
        targetLanguage,
        sourceText,
        translatedText,
        translate,
    };
};
