import type { Domain } from "~/models/domain";
import type { Tone } from "~/models/tone";
import type { TranslationConfig } from "~/models/translationConfig";
import { TranslationService } from "~/services/tanslationService";

export const useTranslate = () => {
    const translationService = useService(TranslationService);

    const tone = ref<Tone>("default");
    const domain = ref<Domain>("None");
    const sourceLanguage = ref<string>("de");
    const targetLanguage = ref<string>("en");

    const sourceText = ref<string>("");
    const translatedText = ref<string>("");

    async function translate(): Promise<void> {
        translatedText.value = ""; // Clear previous translation

        const config: TranslationConfig = {
            source_language: sourceLanguage.value,
            target_language: targetLanguage.value,
            domain: domain.value,
            tone: tone.value,
        };

        const batches = translationService.translate(sourceText.value, config);

        for await (const chunk of batches) {
            translatedText.value += chunk;
        }
    }

    return {
        tone,
        domain,
        sourceLanguage,
        targetLanguage,
        sourceText,
        translatedText,
        translate,
    };
};
