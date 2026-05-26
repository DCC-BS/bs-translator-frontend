import type { MaybeRefOrGetter } from "vue";
import type { Language } from "~/models/languages";

export function useTTS(language: MaybeRefOrGetter<Language>) {
    const isSupported = ref(false);
    const isSpeaking = ref(false);
    const voices = ref<SpeechSynthesisVoice[]>([]);
    const voiceMap: Record<string, SpeechSynthesisVoice> = {};

    function getLanguage(): Language {
        return toValue(language);
    }

    function loadVoices() {
        if (!import.meta.client) return;

        voices.value = window.speechSynthesis.getVoices();
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
        const bcp47 = toBCP47Code(lang.code);
        isSupported.value = voices.value.some((v) => v.lang === bcp47);
    }

    function onVoicesChanged() {
        loadVoices();
    }

    onMounted(() => {
        if (!import.meta.client) return;

        loadVoices();
        window.speechSynthesis.addEventListener(
            "voiceschanged",
            onVoicesChanged,
        );
    });

    onUnmounted(() => {
        if (!import.meta.client) return;

        stop();
        window.speechSynthesis.removeEventListener(
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
        if (!import.meta.client) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const lang = options?.language ?? getLanguage();
        const bcp47 = toBCP47Code(lang.code);

        utterance.voice = options?.voice ?? voiceMap[bcp47] ?? null;

        utterance.onstart = () => {
            isSpeaking.value = true;
        };
        utterance.onend = () => {
            isSpeaking.value = false;
        };
        utterance.onerror = () => {
            isSpeaking.value = false;
        };

        window.speechSynthesis.speak(utterance);
    }

    function stop() {
        if (!import.meta.client) return;

        window.speechSynthesis.cancel();
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
