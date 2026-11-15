import { isApiError } from "@dcc-bs/communication.bs.js";
import { v7 as uuidv7 } from "uuid";
import type {
    ConversationMessage,
    UserConversation,
} from "~/models/conversation";
import { type Language, languageMap } from "~/models/languages";
import { TranslationService } from "~/services/translationService";

type Phase = "setup" | "transition" | "conversation";

type QueuedTranslation = {
    text: string;
    /** Language the text was spoken in ("auto" lets the backend detect it) */
    sourceLanguage: string;
    message: ConversationMessage;
};

type UserContext = {
    name: "a" | "b";
    /** Own copy, never a shared `languageMap` entry. Replace it via `setLanguage`. */
    language: Readonly<Language>;
    /** Incremented on every language change, to detect stale async results */
    languageRevision: number;
    conversation: UserConversation;
    /** Translations into this user's language that are not done yet */
    queuedTranslations: QueuedTranslation[];
    backgroundColor: string;
};

function newContext(bgColor: string, name: "a" | "b"): UserContext {
    return {
        name,
        language: { ...languageMap.auto },
        languageRevision: 0,
        conversation: { language: undefined, messages: [] },
        queuedTranslations: [],
        backgroundColor: bgColor,
    };
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
    const logger = useLogger();
    const i18n = useI18n();
    const { showToast } = useUserFeedback();
    const phase = ref<Phase>("setup");

    const userA = reactive<UserContext>(newContext("bg-blue-200", "a"));
    const userB = reactive<UserContext>(newContext("bg-orange-200", "b"));

    const current = ref(userA);
    const other = ref(userB);

    /** True while translations are queued or running */
    const isTranslating = computed(() =>
        [userA, userB].some((user) =>
            user.queuedTranslations.some(
                (entry) => entry.message.status !== "failed",
            ),
        ),
    );

    let activeTranslation:
        | { id: string; target: UserContext; controller: AbortController }
        | undefined;
    let disposed = false;

    onUnmounted(() => {
        disposed = true;
        activeTranslation?.controller.abort();
    });

    function setLanguage(user: UserContext, language: FuzzyLanguage) {
        const resolved = getLanguage(language);
        if (user.language.code === resolved.code) return;

        user.language = { ...resolved };
        user.languageRevision++;

        // A running translation into the old language is stale: translateEntry requeues it.
        if (activeTranslation?.target === user) {
            activeTranslation.controller.abort();
        }
        void processQueue();
    }

    function changeCurrentLanguage(language: FuzzyLanguage) {
        setLanguage(current.value, language);
    }

    function changeOtherLanguage(language: FuzzyLanguage) {
        setLanguage(other.value, language);
    }

    function switchUser() {
        current.value = current.value === userA ? userB : userA;
        other.value = other.value === userA ? userB : userA;
    }

    async function addMessage(text: string) {
        const speaker = current.value;
        const listener = other.value;

        if (speaker.language.code === "auto") {
            const revision = speaker.languageRevision;
            try {
                const result = await translationService.detectLanguage(text);
                // Do not override a language picked while detection was running.
                if (
                    speaker.languageRevision === revision &&
                    speaker.language.code === "auto"
                ) {
                    setLanguage(speaker, result.language);
                }
            } catch (error) {
                // Keep "auto": the backend detects the source language while translating.
                logger.warn(error, "Language detection failed");
            }
        }

        const messageA: ConversationMessage = {
            id: uuidv7(),
            role: "original",
            content: text,
        };

        const messageB: ConversationMessage = {
            ...messageA,
            content: "",
            role: "translated",
            status: "pending",
        };

        speaker.conversation.messages.push(messageA);
        listener.conversation.messages.push(messageB);
        listener.queuedTranslations.push({
            text,
            sourceLanguage: speaker.language.code,
            message: messageB,
        });
        void processQueue();
    }

    function removeLastMessage() {
        const lastMessage = current.value.conversation.messages.pop();
        if (!lastMessage) return;

        if (activeTranslation?.id === lastMessage.id) {
            activeTranslation.controller.abort();
        }

        for (const user of [userA, userB]) {
            user.conversation.messages = user.conversation.messages.filter(
                (msg) => msg.id !== lastMessage.id,
            );
            user.queuedTranslations = user.queuedTranslations.filter(
                (entry) => entry.message.id !== lastMessage.id,
            );
        }
    }

    /**
     * Puts a failed translation back into the queue.
     */
    function retryMessage(id: string) {
        for (const user of [userA, userB]) {
            const entry = user.queuedTranslations.find(
                (e) => e.message.id === id && e.message.status === "failed",
            );
            if (entry) {
                entry.message.status = "pending";
                entry.message.content = "";
            }
        }
        void processQueue();
    }

    /**
     * Next pending translation whose target language is known. Messages for a
     * user whose language is still "auto" wait in the queue until it is set.
     */
    function nextPendingTranslation() {
        for (const target of [userA, userB]) {
            if (target.language.code === "auto") continue;

            const entry = target.queuedTranslations.find(
                (e) => e.message.status === "pending",
            );
            if (entry) return { target, entry };
        }
        return undefined;
    }

    let processing = false;

    async function processQueue() {
        if (processing) return;
        processing = true;

        try {
            while (!disposed) {
                const next = nextPendingTranslation();
                if (!next) break;
                await translateEntry(next.target, next.entry);
            }
        } finally {
            processing = false;
        }
    }

    async function translateEntry(
        target: UserContext,
        entry: QueuedTranslation,
    ) {
        const { message } = entry;
        const controller = new AbortController();
        const revision = target.languageRevision;
        activeTranslation = { id: message.id, target, controller };

        /** The target language changed: translate again into the new one */
        function requeueIfStale() {
            if (target.languageRevision === revision) return false;
            message.status = "pending";
            message.content = "";
            return true;
        }

        message.status = "translating";
        message.content = "";

        try {
            for await (const chunk of translationService.translate(
                entry.text,
                {
                    source_language: entry.sourceLanguage,
                    target_language: target.language.code,
                    context: createHistoryContext(target.conversation.messages),
                },
                controller.signal,
            )) {
                message.content += chunk;
            }

            if (requeueIfStale()) return;

            message.status = "done";
            target.queuedTranslations = target.queuedTranslations.filter(
                (e) => e !== entry,
            );
        } catch (error) {
            if (requeueIfStale()) return;
            // Aborted by undo or by leaving the page: nothing to report.
            if (controller.signal.aborted) return;

            logger.error(error, "Conversation translation failed");
            message.status = "failed";
            showToast(
                isApiError(error)
                    ? apiErrorMessage(i18n, "translation", error.errorId)
                    : i18n.t("api_error.unexpected_error"),
            );
        } finally {
            if (activeTranslation?.controller === controller) {
                activeTranslation = undefined;
            }
        }
    }

    return {
        phase,
        current,
        other,
        isTranslating,
        changeCurrentLanguage,
        changeOtherLanguage,
        switchUser,
        addMessage,
        removeLastMessage,
        retryMessage,
    };
}
