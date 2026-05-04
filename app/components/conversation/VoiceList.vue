<script lang="ts" setup>
import { TranslationService } from "~/services/translationService";

const { voices, speak } = useTTS({ code: "en-US", icon: "i-lucide-flag-usa" });
const translationService = useService(TranslationService);
const exampleTextMap = ref<Record<string, string>>({});
const { t } = useI18n();

watch(
    voices,
    async (newVoices) => {
        exampleTextMap.value = {};

        for (const voice of newVoices) {
            if (!exampleTextMap.value[voice.name]) {
                let text = "";
                const code = fromBCP47Code(voice.lang)?.code ?? "en";

                try {
                    for await (const chunk of translationService.translate(
                        `Hello, this is a test of the ${voice.name} voice.`,
                        { source_language: "en", target_language: code },
                    )) {
                        text += chunk;
                    }
                    exampleTextMap.value[voice.name] = text;
                } catch {
                    exampleTextMap.value[voice.name] = "";
                }
            }
        }
    },
    { immediate: true },
);
</script>
<template>
    <div class="p-4 overflow-auto max-h-[80vh]">
        <div class="mx-auto max-w-md">
            <h2 class="text-xl">{{ t("conversation.availableVoices") }}</h2>
            <div class="flex flex-col gap-2">
                <div
                    v-for="voice in voices"
                    :key="voice.name"
                    class="flex items-center gap-3"
                >
                    <div class="flex-1">
                        <p class="font-medium">{{ voice.name }}</p>
                        <p class="text-sm opacity-70">{{ voice.lang }}</p>
                    </div>
                    <UButton
                        size="sm"
                        variant="outline"
                        @click="
                            speak(
                                exampleTextMap[voice.name] ??
                                    t('conversation.cannotTranslateText'),
                                { voice: voice },
                            )
                        "
                    >
                        {{ t("conversation.test") }}
                    </UButton>
                </div>
            </div>
        </div>
    </div>
</template>
