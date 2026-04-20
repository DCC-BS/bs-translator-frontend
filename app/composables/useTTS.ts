import type { Language } from "~/models/languages";

export function useTTS(language: Language) {
    const isSupported = ref(false);
    const voices = ref<SpeechSynthesisVoice[]>([]);
    const voiceMap: Record<string, SpeechSynthesisVoice> = {};

    function loadVoices() {
        voices.value = window.speechSynthesis.getVoices();
    }

    onMounted(async () => {
        loadVoices();

        window.speechSynthesis.onvoiceschanged = () => {
            loadVoices();
        };

        for (const voice of voices.value) {
            voiceMap[voice.lang] = voice;
            if (voice.lang === toBCP47Code(language.code)) {
                isSupported.value = true;
                break;
            }
        }
    });

    onUnmounted(() => {
        window.speechSynthesis.onvoiceschanged = null;
    });

    function speak(
        text: string,
        options?: { language?: Language; voice?: SpeechSynthesisVoice },
    ) {
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.voice =
            options?.voice ??
            (voiceMap[toBCP47Code(options?.language?.code ?? language.code)] ||
                null);
        window.speechSynthesis.speak(utterance);
    }

    return {
        isSupported,
        voices,
        voiceMap,
        speak,
    };
}
