import type { Conversation, ConversationMessage } from "~/models/conversation";

export function useConversation() {
    const { translateText } = useTranslate();

    const status = ref<"idle" | "translating">("idle");
    const conversation = ref<Conversation>({
        userA: {
            messages: [],
            language: undefined,
        },
        userB: {
            messages: [],
            language: undefined,
        },
    });

    async function appendMessage(user: "userA" | "userB", content: string) {
        status.value = "translating";

        try {
            conversation.value[user].messages.push({
                id: createUUID(),
                role: "original",
                content,
            });

            const otherUser = user === "userA" ? "userB" : "userA";
            const translatedMessage = {
                role: "translated",
                content: "",
            } as ConversationMessage;

            conversation.value[otherUser].messages.push(translatedMessage);

            await translateText(content, (chunk) => {
                translatedMessage.content += chunk;
            });
        } finally {
            status.value = "idle";
        }
    }

    return { conversation };
}
