import type { LanguageCode } from "~/models/languages";
import { TranslationService } from "~/services/translationService";

type TranslationResult = string | undefined;

/** The language the i18n keys are translated from by the LLM. */
const SOURCE_LOCALE = "en";

// key1 is the language code, key2 is the text key
const languageCache = new Map<string, Map<string, string>>();

export function useTextTranslate<const T extends string[]>(
    targetLanguage: Ref<FuzzyLanguage>,
    textToTranslate: T,
): { tMap: Record<T[number], Ref<string>> } {
    const translationService = useService(TranslationService);
    // The global composer: a local `useI18n({ locale })` scope inherits the
    // global locale, so it would not return the English source strings.
    const { t, locales, loadLocaleMessages } = useI18n();
    // Per instance: conversation.vue and ChatView translate independently and
    // must not cancel each other's runs.
    let translationRound = 0;

    const tMap: Record<T[number], Ref<string>> = {} as Record<
        T[number],
        Ref<string>
    >;

    for (const key of textToTranslate) {
        tMap[key as T[number]] = ref("");
    }

    watch(
        () => targetLanguage.value,
        async () => {
            // en messages are lazy-loaded; ensure they exist before t(key)
            await loadLocaleMessages(SOURCE_LOCALE);
            for (const key of textToTranslate) {
                if (!tMap[key as T[number]].value) {
                    tMap[key as T[number]].value = fallback(key);
                }
            }
            await translateAll();
        },
        { immediate: true },
    );

    async function translateAll() {
        const runId = ++translationRound;
        const lang = getLanguage(targetLanguage.value);

        for (const key of textToTranslate) {
            const translated = await translateText(
                key,
                lang.code as LanguageCode,
            );

            if (runId !== translationRound) {
                return;
            }

            tMap[key as T[number]].value = translated;
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
            const text = sourceText(key);
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
        if (lang === "auto") {
            return t(key);
        }

        // App languages are region-specific (en-us, en-gb), UI locales are not.
        const baseLanguage = lang.split("-")[0];
        const locale = locales.value.find((x) => x.code === baseLanguage)?.code;
        if (locale) {
            await loadLocaleMessages(locale);
            return t(key, {}, { locale });
        }

        return undefined;
    }

    /** The English source string of an i18n key. */
    function sourceText(key: string): string {
        return t(key, {}, { locale: SOURCE_LOCALE });
    }

    function fallback(key: string): string {
        return sourceText(key);
    }

    return {
        tMap,
    };
}
