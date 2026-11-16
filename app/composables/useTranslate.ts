import { isApiError } from "@dcc-bs/communication.bs.js";
import { useLocalStorage, watchDebounced } from "@vueuse/core";
import type { Domain } from "~/models/domain";
import { type LanguageCode, languageMap } from "~/models/languages";
import type { Tone } from "~/models/tone";
import type { TranslationConfig } from "~/models/translationConfig";
import { TranslationService } from "~/services/translationService";
import { apiErrorMessage } from "~/utils/apiErrorMessage";
import {
    GLOSSARY_STORAGE_KEY,
    PREFERENCE_COOKIE_MAX_AGE_SECONDS,
    TRANSLATION_DEBOUNCE_MS,
} from "~/utils/constants";
import { parseLegacyGlossary, serializeGlossary } from "~/utils/glossary";
import { isConcreteLanguage } from "~/utils/language";
import { swapRef } from "~/utils/swap";

/**
 * Composable for handling text translation with streaming support
 */
export function useTranslate() {
    const translationService = useService(TranslationService);
    const { t, te } = useI18n();
    const { showError } = useUserFeedback();
    const logger = useLogger();

    const tone = useCookie<Tone>("tone", {
        default: () => "default",
        maxAge: PREFERENCE_COOKIE_MAX_AGE_SECONDS,
    });
    const domain = useCookie<Domain>("domain", {
        default: () => "None",
        maxAge: PREFERENCE_COOKIE_MAX_AGE_SECONDS,
    });
    // The glossary can grow beyond the ~4 KB a cookie holds (the browser then
    // silently drops it), so it lives in localStorage. Read it on mount only:
    // the server has no localStorage and must render the same initial state.
    const glossary = useLocalStorage<string>(GLOSSARY_STORAGE_KEY, "", {
        initOnMounted: true,
    });
    const legacyGlossaryCookie = useCookie<string | null>("glossary");

    // One-time migration of the glossary from its old cookie (and its old
    // "term: description; ..." format) into localStorage.
    onMounted(async () => {
        if (!legacyGlossaryCookie.value) {
            return;
        }
        if (!glossary.value) {
            glossary.value = serializeGlossary(
                parseLegacyGlossary(String(legacyGlossaryCookie.value)),
            );
            // useLocalStorage writes on the next flush.
            await nextTick();
        }
        // useLocalStorage swallows failed writes (e.g. quota exceeded): keep
        // the cookie until the value is really stored.
        if (isGlossaryStored()) {
            legacyGlossaryCookie.value = null;
        }
    });

    function isGlossaryStored(): boolean {
        try {
            return (
                localStorage.getItem(GLOSSARY_STORAGE_KEY) === glossary.value
            );
        } catch {
            return false;
        }
    }

    const sourceLanguage = useCookie<LanguageCode>("sourceLanguage", {
        default: () => "auto",
        maxAge: PREFERENCE_COOKIE_MAX_AGE_SECONDS,
    });
    const targetLanguage = useCookie<LanguageCode>("targetLanguage", {
        default: () => "en-us",
        maxAge: PREFERENCE_COOKIE_MAX_AGE_SECONDS,
    });

    // A code from a previous languageMap (e.g. the plain "en" that existed before the
    // en-us/en-gb split) can still be sitting in a returning user's cookie. Left as-is,
    // the selector can't find it among its items and silently falls back to showing
    // "Auto Detect" - a flag/label that matches neither the stored code nor the
    // language the user actually picked. Reset it here instead of letting that surface
    // in the UI.
    if (!(sourceLanguage.value in languageMap)) {
        sourceLanguage.value = "auto";
    }
    // The target must be a concrete language: "auto" is only valid as source
    // (an older swap could store it here, and every request then fails).
    if (!isConcreteLanguage(targetLanguage.value)) {
        targetLanguage.value = "en-us";
    }

    const sourceText = ref<string>("");
    const translatedText = ref<string>("");
    // The source text translatedText is the complete translation of; used to
    // tell a finished translation apart from a stale or partial one.
    const translatedSourceText = ref<string | undefined>(undefined);
    // The language pair of that finished translation.
    const translatedLanguages = ref<
        { source: string; target: string } | undefined
    >(undefined);

    // Shared state for language detection across the app
    const detectedSourceLanguage = useState<LanguageCode | undefined>(
        "detectedSourceLanguage",
        () => undefined,
    );
    const isDetectingLanguage = useState<boolean>(
        "isDetectingLanguage",
        () => false,
    );

    const isTranslating = ref<boolean>(false);
    const abortController = ref<AbortController | undefined>(undefined);

    onUnmounted(() => {
        abortController.value?.abort();
    });

    /**
     * Detects the language of the given text.
     * @param text - Text to detect the language of
     * @param signal - AbortSignal for cancellation
     * @returns The detected language code or "auto" string if detection fails
     */
    async function detectLanguage(
        text: string,
        signal: AbortSignal,
    ): Promise<LanguageCode | "auto"> {
        // If source language is not set to auto, always return "auto"
        if (sourceLanguage.value !== "auto") {
            return "auto";
        }

        // If text is empty, clear detected language and return "auto"
        if (text.trim() === "") {
            clearDetectedLanguage();
            return "auto";
        }

        isDetectingLanguage.value = true;

        try {
            const result = await translationService.detectLanguage(
                text,
                signal,
            );

            if (signal.aborted) {
                return "auto";
            }

            // The backend's detector answers "auto" when it is unsure, and can
            // return a code this app's languageMap does not have (e.g. the plain
            // "en" fast-langdetect emits, distinct from the en-us/en-gb this UI
            // offers). Letting that through would let an unmapped code reach
            // targetLanguage via the swap button, where it can't be matched back
            // to a flag or label. Either way: nothing was detected.
            if (!isConcreteLanguage(result.language)) {
                detectedSourceLanguage.value = undefined;
                return "auto";
            }

            const detected = result.language as LanguageCode;
            detectedSourceLanguage.value = detected;
            return detected;
        } catch {
            if (!signal.aborted) {
                isDetectingLanguage.value = false;
            }
            return "auto";
        } finally {
            if (!signal.aborted) {
                isDetectingLanguage.value = false;
            }
        }
    }

    /**
     * Clears the detected language state when source language is changed from auto
     * or when source text is cleared.
     */
    function clearDetectedLanguage(): void {
        detectedSourceLanguage.value = undefined;
        isDetectingLanguage.value = false;
    }

    /**
     * Translates the source text using the configured settings.
     * Handles language detection if source language is set to 'auto'.
     * Can be aborted with the abort() function.
     */
    async function translate(): Promise<void> {
        const text = sourceText.value;
        if (text.trim() === "") {
            clearDetectedLanguage();
            return;
        }

        translatedText.value = "";
        translatedSourceText.value = undefined;
        translatedLanguages.value = undefined;
        isTranslating.value = true;

        abortController.value?.abort();
        abortController.value = new AbortController();

        const signal = abortController.value.signal;

        try {
            await detectLanguage(text, signal);

            const languages = {
                source: resolveSourceLanguage(),
                target: targetLanguage.value,
            };

            for await (const chunk of translateBatched(text, signal)) {
                if (signal.aborted) {
                    break;
                }
                translatedText.value += chunk;
            }

            if (!signal.aborted) {
                translatedSourceText.value = text;
                translatedLanguages.value = languages;
            }
        } catch (error: unknown) {
            // Aborts (new input, swap, unmount) are intentional, not errors.
            if (!signal.aborted) {
                logger.info(error, "Error while translating");
                showError(new Error(translationErrorMessage(error)));
            }
        } finally {
            // Only the active invocation may clear the state: an aborted run
            // finishes after its successor already set isTranslating = true.
            if (abortController.value?.signal === signal) {
                isTranslating.value = false;
            }
        }
    }

    /**
     * Translates a specific text string and returns the result.
     * Handles language detection if source language is set to 'auto'.
     * @param text - Text to translate
     * @returns Translated text
     */
    async function translateText(
        text: string,
        onChunk?: (chunk: string) => void,
    ): Promise<string> {
        // Return empty string if input is empty or only whitespace
        if (text.trim() === "") {
            return "";
        }

        if (!abortController.value || abortController.value.signal.aborted) {
            abortController.value = new AbortController();
        }

        const signal = abortController.value.signal;
        let translated = "";

        try {
            await detectLanguage(text, signal);

            const batches = translateBatched(text, signal);

            for await (const chunk of batches) {
                if (signal.aborted) {
                    break;
                }
                translated += chunk;
                if (onChunk) {
                    onChunk(chunk);
                }
            }
        } catch (error) {
            if (signal.aborted) {
                showError(new Error(t("api_error.translation.aborted")));
            } else {
                showError(new Error(translationErrorMessage(error)));
            }
        } finally {
            if (abortController.value?.signal === signal) {
                isTranslating.value = false;
            }
        }

        return translated;
    }

    /**
     * Maps an error thrown while translating to a translated user message.
     */
    function translationErrorMessage(error: unknown): string {
        return isApiError(error)
            ? apiErrorMessage({ t, te }, "translation", error.errorId)
            : t("api_error.unexpected_error");
    }

    /**
     * The source language to send: the detected one while on "auto".
     */
    function resolveSourceLanguage(): string {
        // Ensure source_language is never undefined, default to "auto"
        return sourceLanguage.value === "auto"
            ? (detectedSourceLanguage.value ?? "auto")
            : sourceLanguage.value || "auto";
    }

    /**
     * Internal function to handle batched translation with streaming.
     * Errors (including aborts) propagate to the caller.
     * @param text Text to translate
     * @param signal Abort signal for cancellation
     * @returns Translated text chunks
     */
    function translateBatched(
        text: string,
        signal: AbortSignal,
    ): AsyncIterable<string> {
        const config: TranslationConfig = {
            source_language: resolveSourceLanguage(),
            target_language: targetLanguage.value,
            domain: domain.value,
            tone: tone.value,
            glossary: glossary.value,
        };

        return translationService.translate(text, config, signal);
    }

    /**
     * Aborts the current translation process if one is in progress
     */
    function abort(): void {
        if (abortController.value && isTranslating.value) {
            abortController.value.abort();
            isTranslating.value = false;
        }
    }

    /**
     * Swaps the texts along with a language swap. A running translation is
     * stopped first so it cannot keep streaming into the swapped field. The
     * texts are only exchanged when the output is the finished translation of
     * the current input between the swapped languages (the languages are
     * already swapped when this runs); otherwise (translation pending,
     * streaming, failed or for another language pair) the user's input stays
     * the source text and is translated again.
     */
    function swapTexts(): void {
        const hasFinishedTranslation =
            !isTranslating.value &&
            translatedText.value !== "" &&
            translatedSourceText.value === sourceText.value &&
            translatedLanguages.value?.source === targetLanguage.value &&
            translatedLanguages.value?.target === sourceLanguage.value;

        abort();

        if (hasFinishedTranslation) {
            swapRef(sourceText, translatedText);
            translatedSourceText.value = sourceText.value;
            translatedLanguages.value = {
                source: sourceLanguage.value,
                target: targetLanguage.value,
            };
        } else {
            translatedText.value = "";
        }
    }

    // Clear detected language when source language is changed from auto
    watch(sourceLanguage, (newLang) => {
        if (newLang !== "auto") {
            clearDetectedLanguage();
        }
    });

    // Trigger translation when the text or the config changes (debounced).
    // Keep this the single trigger: a second debounced watcher on the same
    // flow fires in the same tick and sends duplicate backend requests.
    // No maxWait: translation must not fire while the user is still typing.
    watchDebounced(
        [sourceText, targetLanguage, sourceLanguage, tone, domain, glossary],
        () => {
            if (sourceText.value.trim() === "") {
                // Stop any in-flight stream so it cannot keep appending output
                // after the input was cleared.
                abort();
                translatedText.value = "";
                clearDetectedLanguage();
                return;
            }
            if (targetLanguage.value) {
                translate();
            }
        },
        {
            debounce: TRANSLATION_DEBOUNCE_MS,
        },
    );

    return {
        tone,
        domain,
        glossary,
        sourceLanguage,
        targetLanguage,
        sourceText,
        translatedText,
        detectedSourceLanguage,
        isTranslating,
        isDetectingLanguage,
        translate,
        translateText,
        abort,
        swapTexts,
    };
}
