import type { MaybeRefOrGetter } from "vue";
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
        case "fa-af": // Dari (Afghan Persian)
        case "he": // Hebrew
        case "ps": // Pashto
        case "ur": // Urdu
            return "rtl";
        default:
            return "ltr";
    }
}

/**
 * Composable for determining language text direction (LTR/RTL)
 * @param language Reactive language code (ref, computed or getter)
 * @returns Object containing the reactive direction
 */
export function useLanguageDirection(
    language: MaybeRefOrGetter<LanguageCode | undefined>,
) {
    const direction = computed<"ltr" | "rtl">(() => {
        const code = toValue(language);
        // Default to LTR if no language is known
        return code ? detectDirection(code) : "ltr";
    });

    return {
        direction,
    };
}
