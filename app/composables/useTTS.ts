import type { MaybeRefOrGetter } from "vue";
import type { Language, LanguageCode } from "~/models/languages";

/**
 * The Web Speech synthesis API, or undefined on the server and in browsers
 * and WebViews that don't provide it.
 */
function getSpeechSynthesis(): SpeechSynthesis | undefined {
    if (
        !import.meta.client ||
        !("speechSynthesis" in window) ||
        typeof SpeechSynthesisUtterance === "undefined"
    ) {
        return undefined;
    }
    return window.speechSynthesis;
}

export function useTTS(language: MaybeRefOrGetter<Language>) {
    const isSupported = ref(false);
    const isSpeaking = ref(false);
    const voices = ref<SpeechSynthesisVoice[]>([]);
    const voiceMap: Record<string, SpeechSynthesisVoice> = {};
    /** Utterance started by this instance, so we never cancel someone else's speech */
    let ownUtterance: SpeechSynthesisUtterance | undefined;

    function getLanguage(): Language {
        return toValue(language);
    }

    function loadVoices() {
        const synth = getSpeechSynthesis();
        if (!synth) return;

        voices.value = synth.getVoices();
        for (const voice of voices.value) {
            voiceMap[voice.lang] = voice;
        }
        recheckSupport();
    }

    function recheckSupport() {
        const lang = getLanguage();
        if (lang.code === "auto") {
            isSupported.value = false;
            return;
        }
        const bcp47 = toBCP47Code(lang.code as LanguageCode);
        isSupported.value = voices.value.some((v) => v.lang === bcp47);
    }

    function onVoicesChanged() {
        loadVoices();
    }

    onMounted(() => {
        loadVoices();
        getSpeechSynthesis()?.addEventListener(
            "voiceschanged",
            onVoicesChanged,
        );
    });

    onUnmounted(() => {
        stop();
        getSpeechSynthesis()?.removeEventListener(
            "voiceschanged",
            onVoicesChanged,
        );
    });

    watch(
        () => toValue(language),
        () => {
            if (import.meta.client) {
                recheckSupport();
            }
        },
    );

    function speak(
        text: string,
        options?: { language?: Language; voice?: SpeechSynthesisVoice },
    ) {
        const synth = getSpeechSynthesis();
        if (!synth) return;

        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const lang = options?.language ?? getLanguage();
        const bcp47 = toBCP47Code(lang.code as LanguageCode);

        utterance.voice = options?.voice ?? voiceMap[bcp47] ?? null;

        function onFinished() {
            if (ownUtterance === utterance) {
                ownUtterance = undefined;
                isSpeaking.value = false;
            }
        }

        utterance.onstart = () => {
            isSpeaking.value = true;
        };
        utterance.onend = onFinished;
        utterance.onerror = onFinished;

        ownUtterance = utterance;
        synth.speak(utterance);
    }

    function stop() {
        const synth = getSpeechSynthesis();
        if (!synth || !ownUtterance) return;

        ownUtterance = undefined;
        synth.cancel();
        isSpeaking.value = false;
    }

    return {
        isSupported,
        isSpeaking,
        voices,
        voiceMap,
        speak,
        stop,
    };
}
