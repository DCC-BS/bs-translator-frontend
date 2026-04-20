import {
    languageMap,
    type Language,
    type LanguageCode,
    toBCP47,
} from "~/models/languages";

export type FuzzyLanguage = Language | LanguageCode | undefined;

function toLanguageCode(lang: FuzzyLanguage): LanguageCode {
    if (!lang) {
        return "auto" as LanguageCode; // Return auto-detect code if lang is undefined
    }

    if (typeof lang === "string") {
        return lang as LanguageCode;
    }

    return lang.code as LanguageCode;
}

export function getLanguage(lang: FuzzyLanguage): Language {
    if (!lang) {
        return languageMap.auto as Language; // Return auto-detect language if code is undefined
    }

    const code = toLanguageCode(lang);

    if (!languageMap[code]) {
        console.warn(
            `Language code "${code}" not found in languageMap. Defaulting to auto-detect.`,
        );
        return languageMap.auto as Language; // Default to auto-detect if code is not found
    }

    return languageMap[code] as Language;
}

export function toBCP47Code(lang: FuzzyLanguage): string {
    const code = toLanguageCode(lang);

    if (!code) {
        return toBCP47.auto as string; // Return auto-detect code if code is undefined
    }

    if (!toBCP47[code]) {
        console.warn(
            `Language code "${code}" not found in toBCP47 mapping. Defaulting to auto-detect.`,
        );
        return toBCP47.auto as string; // Default to auto-detect if code is not found
    }

    return toBCP47[code] as string;
}
