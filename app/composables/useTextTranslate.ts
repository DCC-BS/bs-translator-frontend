import type { LanguageCode } from "~/models/languages";
import { TranslationService } from "~/services/translationService";

type TranslationResult = string | undefined;

// key1 is the lanuage code, key2 is the text key
const languageCache = new Map<string, Map<string, string>>();

export function useTextTranslate<const T extends string[]>(
    targetLanguage: Ref<FuzzyLanguage>,
    textToTranslate: T,
): { tMap: Record<T[number], Ref<string>> } {
    const translationService = useService(TranslationService);
    const { t, locales, loadLocaleMessages } = useI18n({ locale: "en" });

    const tMap: Record<T[number], Ref<string>> = {} as Record<
        T[number],
        Ref<string>
    >;

    for (const key of textToTranslate) {
        tMap[key as T[number]] = ref(fallback(key));
    }

    watch(
        () => targetLanguage.value,
        async () => {
            await translateAll();
        },
        { immediate: true },
    );

    async function translateAll() {
        const lang = getLanguage(targetLanguage.value);

        for (const key of textToTranslate) {
            tMap[key as T[number]].value = await translateText(key, lang.code);
        }
    }

    async function translateText(
        key: T[number],
        lang: LanguageCode,
    ): Promise<string> {
        return await pipe(
            getFromCache,
            localizeTranslateText,
            llmTranslateText,
        )(key, lang);
    }

    /**
     * Take the functions and build a pipeline.
     * Each function will be called in order until one returns a non-undefined result.
     * If all functions return undefined, the fallback will be used.
     * When a function is successful, the result will be saved to the cache before being returned.
     * @param fns functions to pipe
     * @returns a function that takes a key and language and returns the translated text
     */
    function pipe(
        ...fns: Array<
            (
                key: T[number],
                lang: LanguageCode,
            ) => TranslationResult | Promise<TranslationResult>
        >
    ) {
        return async (key: T[number], lang: LanguageCode): Promise<string> => {
            for (const fn of fns) {
                const result = await fn(key, lang);
                if (result) {
                    saveToCache(key, lang, result);
                    return result;
                }
            }
            return fallback(key);
        };
    }

    function getFromCache(key: string, lang: LanguageCode): TranslationResult {
        if (languageCache.has(lang)) {
            const map = languageCache.get(lang);

            if (map?.has(key)) {
                return map.get(key);
            }
        }
        return undefined;
    }

    function saveToCache(key: string, lang: LanguageCode, translation: string) {
        if (!languageCache.has(lang)) {
            languageCache.set(lang, new Map<string, string>());
        }

        const map = languageCache.get(lang);
        map?.set(key, translation);
    }

    async function llmTranslateText(
        key: string,
        lang: LanguageCode,
    ): Promise<TranslationResult> {
        try {
            const text = t(key);
            let translatedText = "";

            const chunks = translationService.translate(text, {
                source_language: "en-us",
                target_language: lang,
            });

            for await (const chunk of chunks) {
                translatedText += chunk;
            }

            return translatedText.trim();
        } catch {
            return undefined;
        }
    }

    async function localizeTranslateText(
        key: string,
        lang: LanguageCode,
    ): Promise<TranslationResult> {
        const normalizedLangCode = lang.replace("_uk", "").replace("_us", "");

        if (lang === "auto") {
            return t(key);
        }
        if (locales.value.some((x) => x.code === normalizedLangCode)) {
            await loadLocaleMessages(normalizedLangCode as any);
            // biome-ignore lint/suspicious/noExplicitAny: auto generate type
            return t(key, {}, { locale: normalizedLangCode as any });
        }

        return undefined;
    }

    function fallback(key: string): string {
        return t(key);
    }

    return {
        tMap,
    };
}
