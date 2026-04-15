import {
    languageMap,
    type Language,
    type LanguageCode,
} from "~/models/languages";

export function getLanguage(code: LanguageCode | undefined): Language {
    if (!code) {
        return languageMap.auto as Language; // Return auto-detect language if code is undefined
    }

    if (!languageMap[code]) {
        console.warn(
            `Language code "${code}" not found in languageMap. Defaulting to auto-detect.`,
        );
        return languageMap.auto as Language; // Default to auto-detect if code is not found
    }

    return languageMap[code] as Language;
}
