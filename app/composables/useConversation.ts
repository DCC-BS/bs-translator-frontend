import {
    type ConversationMessage,
    type UserConversation,
} from "~/models/conversation";
import { languageMap, type Language } from "~/models/languages";
import { TranslationService } from "~/services/translationService";

type Phase = "setup" | "transition" | "conversation";

type UserContext = {
    name: "a" | "b";
    language: Language;
    conversation: UserConversation;
    queuedTranslations: { text: string; message: ConversationMessage }[];
    backgroundColor: string;
};

function newContext(bgColor: string, name: "a" | "b"): UserContext {
    return {
        name,
        language: languageMap.auto as Language,
        conversation: { language: undefined, messages: [] },
        queuedTranslations: [],
        backgroundColor: bgColor,
    } as UserContext;
}

export function useConversation() {
    const translationSerivce = useService(TranslationService);
    const phase = ref<Phase>("setup");

    const userA = reactive<UserContext>(newContext("bg-primary-200", "a"));
    const userB = reactive<UserContext>(newContext("bg-secondary-200", "b"));

    const current = ref(userA);
    const other = ref(userB);

    let intervalId: number | undefined | NodeJS.Timeout = undefined;

    onMounted(() => {
        intervalId = setInterval(() => processQueue(), 1000);
    });

    onUnmounted(() => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    });

    function changeCurrentLanguage(language: FuzzyLanguage) {
        current.value.language = getLanguage(language);
    }

    function switchUser() {
        current.value = current.value === userA ? userB : userA;
        other.value = other.value === userA ? userB : userA;
    }

    function addMessage(text: string) {
        const messageA: ConversationMessage = {
            id: crypto.randomUUID(),
            role: "original",
            content: text,
        };

        const messageB: ConversationMessage = {
            ...messageA,
            content: "",
            role: "translated",
        };

        current.value.conversation.messages.push(messageA);
        other.value.conversation.messages.push(messageB);
        other.value.queuedTranslations.push({ text, message: messageB });
    }

    function removeLastMessage() {
        const lastMessage = current.value.conversation.messages.pop();
        if (lastMessage) {
            // find and remove from other user's conversation
            if (
                other.value.conversation.messages.find(
                    (msg) => msg.id === lastMessage.id,
                )
            ) {
                other.value.conversation.messages =
                    other.value.conversation.messages.filter(
                        (msg) => msg.id !== lastMessage.id,
                    );
            }
            // remove from queued translations
            else {
                const index = other.value.queuedTranslations.findIndex(
                    (entry) => entry.message.id === lastMessage.id,
                );
                if (index !== -1) {
                    other.value.queuedTranslations.splice(index, 1);
                }
            }
        }
    }

    async function processQueue() {
        for (const { queue, sourceLang, targetLang } of [
            {
                queue: userA.queuedTranslations,
                sourceLang: userB.language,
                targetLang: userA.language,
            },
            {
                queue: userB.queuedTranslations,
                sourceLang: userA.language,
                targetLang: userB.language,
            },
        ]) {
            if (sourceLang.code === "auto" || targetLang.code === "auto") {
                console.warn(
                    "Skipping translation due to auto-detect language. Source:",
                    sourceLang,
                    "Target:",
                    targetLang,
                );
                continue; // Skip translation if either language is set to auto-detect
            }

            console.log(
                `Processing translation queue for user ${sourceLang.code} -> ${targetLang.code}. Queue length: ${queue.length}`,
            );

            for (const { text, message } of queue) {
                translateAndAddMessage(text, sourceLang, targetLang, message);
            }
            queue.length = 0;
        }
    }

    async function translateAndAddMessage(
        text: string,
        sourceLang: FuzzyLanguage,
        targetLang: FuzzyLanguage,
        message: ConversationMessage,
    ) {
        for await (const chunk of translationSerivce.translate(text, {
            source_language: getLanguage(sourceLang).code,
            target_language: getLanguage(targetLang).code,
        })) {
            message.content += chunk;
        }
    }

    return {
        phase,
        current,
        other,
        changeCurrentLanguage,
        switchUser,
        addMessage,
        removeLastMessage,
    };
}
