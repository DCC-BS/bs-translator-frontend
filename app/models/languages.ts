/**
 * Language interface defining the structure for language objects
 */
export interface Language {
    code: string;
    icon: string;
}

export const languageMap: Record<string, Language> = {
    auto: { code: "auto", icon: "i-lucide-globe-2" }, // Auto-detect language
    de: { code: "de", icon: "flag:de-4x3" }, // German - Germany
    "en-us": { code: "en-us", icon: "flag:us-4x3" }, // English - United States
    "en-gb": { code: "en-gb", icon: "flag:gb-4x3" }, // English - United Kingdom
    fr: { code: "fr", icon: "flag:fr-4x3" }, // French - France
    it: { code: "it", icon: "flag:it-4x3" }, // Italian - Italy
    af: { code: "af", icon: "flag:za-4x3" }, // Afrikaans - South Africa
    ar: { code: "ar", icon: "flag:sa-4x3" }, // Arabic - Saudi Arabia
    bg: { code: "bg", icon: "flag:bg-4x3" }, // Bulgarian - Bulgaria
    bn: { code: "bn", icon: "flag:bd-4x3" }, // Bengali - Bangladesh
    ca: { code: "ca", icon: "flag:es-ct-4x3" }, // Catalan - Catalonia
    cs: { code: "cs", icon: "flag:cz-4x3" }, // Czech - Czech Republic
    cy: { code: "cy", icon: "flag:gb-wls-4x3" }, // Welsh - Wales
    da: { code: "da", icon: "flag:dk-4x3" }, // Danish - Denmark
    el: { code: "el", icon: "flag:gr-4x3" }, // Greek - Greece
    es: { code: "es", icon: "flag:es-4x3" }, // Spanish - Spain
    et: { code: "et", icon: "flag:ee-4x3" }, // Estonian - Estonia
    fa: { code: "fa", icon: "flag:ir-4x3" }, // Persian - Iran
    fi: { code: "fi", icon: "flag:fi-4x3" }, // Finnish - Finland
    gu: { code: "gu", icon: "flag:in-4x3" }, // Gujarati - India
    he: { code: "he", icon: "flag:il-4x3" }, // Hebrew - Israel
    hi: { code: "hi", icon: "flag:in-4x3" }, // Hindi - India
    hr: { code: "hr", icon: "flag:hr-4x3" }, // Croatian - Croatia
    hu: { code: "hu", icon: "flag:hu-4x3" }, // Hungarian - Hungary
    id: { code: "id", icon: "flag:id-4x3" }, // Indonesian - Indonesia
    ja: { code: "ja", icon: "flag:jp-4x3" }, // Japanese - Japan
    kn: { code: "kn", icon: "flag:in-4x3" }, // Kannada - India
    ko: { code: "ko", icon: "flag:kr-4x3" }, // Korean - South Korea
    lt: { code: "lt", icon: "flag:lt-4x3" }, // Lithuanian - Lithuania
    lv: { code: "lv", icon: "flag:lv-4x3" }, // Latvian - Latvia
    mk: { code: "mk", icon: "flag:mk-4x3" }, // Macedonian - North Macedonia
    ml: { code: "ml", icon: "flag:in-4x3" }, // Malayalam - India
    mr: { code: "mr", icon: "flag:in-4x3" }, // Marathi - India
    ne: { code: "ne", icon: "flag:np-4x3" }, // Nepali - Nepal
    nl: { code: "nl", icon: "flag:nl-4x3" }, // Dutch - Netherlands
    no: { code: "no", icon: "flag:no-4x3" }, // Norwegian - Norway
    pa: { code: "pa", icon: "flag:in-4x3" }, // Punjabi - India
    pl: { code: "pl", icon: "flag:pl-4x3" }, // Polish - Poland
    pt: { code: "pt", icon: "flag:pt-4x3" }, // Portuguese - Portugal
    ro: { code: "ro", icon: "flag:ro-4x3" }, // Romanian - Romania
    ru: { code: "ru", icon: "flag:ru-4x3" }, // Russian - Russia
    sk: { code: "sk", icon: "flag:sk-4x3" }, // Slovak - Slovakia
    sl: { code: "sl", icon: "flag:si-4x3" }, // Slovenian - Slovenia
    so: { code: "so", icon: "flag:so-4x3" }, // Somali - Somalia
    sq: { code: "sq", icon: "flag:al-4x3" }, // Albanian - Albania
    sv: { code: "sv", icon: "flag:se-4x3" }, // Swedish - Sweden
    sw: { code: "sw", icon: "flag:tz-4x3" }, // Swahili - Tanzania
    ta: { code: "ta", icon: "flag:in-4x3" }, // Tamil - India
    te: { code: "te", icon: "flag:in-4x3" }, // Telugu - India
    th: { code: "th", icon: "flag:th-4x3" }, // Thai - Thailand
    tl: { code: "tl", icon: "flag:ph-4x3" }, // Filipino - Philippines
    tr: { code: "tr", icon: "flag:tr-4x3" }, // Turkish - Turkey
    uk: { code: "uk", icon: "flag:ua-4x3" }, // Ukrainian - Ukraine
    ur: { code: "ur", icon: "flag:pk-4x3" }, // Urdu - Pakistan
    vi: { code: "vi", icon: "flag:vn-4x3" }, // Vietnamese - Vietnam
    "zh-cn": { code: "zh-cn", icon: "flag:cn-4x3" }, // Chinese (Simplified) - China
    "zh-hk": { code: "zh-hk", icon: "flag:hk-4x3" }, // Chinese (Cantonese) - Hong Kong
    "zh-tw": { code: "zh-tw", icon: "flag:tw-4x3" }, // Chinese (Traditional) - Taiwan
};

export const languages: Language[] = Object.values(languageMap).filter(
    (lang) => lang.code !== "auto",
);
export const languagesAndAuto: Language[] = Object.values(languageMap);
export type LanguageCode = keyof typeof languageMap;

export const toBCP47: Record<string, string> = {
    auto: "auto",
    de: "de-DE",
    "en-us": "en-US",
    "en-gb": "en-GB",
    fr: "fr-FR",
    it: "it-IT",
    af: "af-ZA",
    ar: "ar-SA",
    bg: "bg-BG",
    bn: "bn-BD",
    ca: "ca-ES",
    cs: "cs-CZ",
    cy: "cy-GB",
    da: "da-DK",
    el: "el-GR",
    es: "es-ES",
    et: "et-EE",
    fa: "fa-IR",
    fi: "fi-FI",
    gu: "gu-IN",
    he: "he-IL",
    hi: "hi-IN",
    hr: "hr-HR",
    hu: "hu-HU",
    id: "id-ID",
    ja: "ja-JP",
    kn: "kn-IN",
    ko: "ko-KR",
    lt: "lt-LT",
    lv: "lv-LV",
    mk: "mk-MK",
    ml: "ml-IN",
    mr: "mr-IN",
    ne: "ne-NP",
    nl: "nl-NL",
    no: "no-NO",
    pa: "pa-IN",
    pl: "pl-PL",
    pt: "pt-PT",
    ro: "ro-RO",
    ru: "ru-RU",
    sk: "sk-SK",
    sl: "sl-SI",
    so: "so-SO",
    sq: "sq-AL",
    sv: "sv-SE",
    sw: "sw-TZ",
    ta: "ta-IN",
    te: "te-IN",
    th: "th-TH",
    tl: "tl-PH",
    tr: "tr-TR",
    uk: "uk-UA",
    ur: "ur-PK",
    vi: "vi-VN",
    "zh-hk": "zh-HK",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
};
