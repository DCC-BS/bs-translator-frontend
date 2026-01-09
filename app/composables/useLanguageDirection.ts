import type { LanguageCode } from "~/models/languages";

/**
 * Detects the text direction for a given language code
 * @param code The language code to check
 * @returns "rtl" for right-to-left languages, "ltr" otherwise
 */
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

/**
 * Composable for determining language text direction (LTR/RTL)
 * @param language Reactive reference to the language code
 * @returns Object containing the reactive direction
 */
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
