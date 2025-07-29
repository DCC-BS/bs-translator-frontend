import type { LanguageCode } from "~/models/languages";

function detectDirection(code: LanguageCode): "ltr" | "rtl" {
    switch (code) {
        // Right-to-left languages
        case "ar": // Arabic
        case "fa": // Persian/Farsi
        case "he": // Hebrew
        case "ur": // Urdu
            return "rtl";
        default:
            return "ltr";
    }
}

export function useLanguageDirection(language: Ref<LanguageCode>) {
    const direction = ref<"ltr" | "rtl">("ltr");

    watch(
        language,
        (newLanguage) => {
            if (!newLanguage) {
                direction.value = "ltr"; // Default to LTR if text is empty
                return;
            }
            direction.value = detectDirection(newLanguage);
        },
        { immediate: true },
    );

    return {
        direction,
    };
}
