import type {
    ConversationMessage,
    UserConversation,
} from "~/models/conversation";
import { type Language, languageMap } from "~/models/languages";
import { TranslationService } from "~/services/translationService";
import { v7 as uuidv7 } from "uuid";

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

function createHistoryContext(history: ConversationMessage[]) {
    function roleToUser(role: "translated" | "original") {
        return role === "original" ? "UserA" : "UserB";
    }

    let context = "";

    for (const message of history.toReversed()) {
        if (context.length > 500) {
            break;
        }

        if (!message.content) {
            continue;
        }

        const newMessage = `${roleToUser(message.role)}: ${message.content} \n`;
        context = newMessage + context;
    }

    return context;
}

export function useConversation() {
    const translationService = useService(TranslationService);
    const phase = ref<Phase>("setup");

    const userA = reactive<UserContext>(newContext("bg-blue-200", "a"));
    const userB = reactive<UserContext>(newContext("bg-orange-200", "b"));

    const current = ref(userA);
    const other = ref(userB);

    let intervalId: number | undefined | NodeJS.Timeout;

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

    async function addMessage(text: string) {
        const messageA: ConversationMessage = {
            id: uuidv7(),
            role: "original",
            content: text,
        };

        if (current.value.language.code === "auto") {
            const result = await translationService.detectLanguage(text);
            current.value.language = getLanguage(result.language);
        }

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

    let processing = false;

    async function processQueue() {
        if (processing) return;
        processing = true;

        try {
            for (const { queue, sourceLang, targetLang, history } of [
                {
                    queue: userA.queuedTranslations,
                    sourceLang: userB.language,
                    targetLang: userA.language,
                    history: userA.conversation.messages,
                },
                {
                    queue: userB.queuedTranslations,
                    sourceLang: userA.language,
                    targetLang: userB.language,
                    history: userB.conversation.messages,
                },
            ]) {
                if (sourceLang.code === "auto" || targetLang.code === "auto") {
                    continue;
                }

                for (const { text, message } of queue) {
                    await translateMessage(
                        text,
                        sourceLang,
                        targetLang,
                        message,
                        history,
                    );
                }
                queue.length = 0;
            }
        } finally {
            processing = false;
        }
    }

    async function translateMessage(
        text: string,
        sourceLang: FuzzyLanguage,
        targetLang: FuzzyLanguage,
        message: ConversationMessage,
        history: ConversationMessage[],
    ) {
        const context = createHistoryContext(history);

        for await (const chunk of translationService.translate(text, {
            source_language: getLanguage(sourceLang).code,
            target_language: getLanguage(targetLang).code,
            context: context,
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
