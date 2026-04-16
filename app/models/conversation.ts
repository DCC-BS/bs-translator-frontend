import type { LanguageCode } from "./languages";

export type ConversationMessage = {
    id: string;
    role: "original" | "translated";
    content: string;
};

export type UserConversation = {
    messages: ConversationMessage[];
    language: LanguageCode | undefined;
};

export type Conversation = {
    userA: UserConversation;
    userB: UserConversation;
};

export function createEmptyConversation(): Conversation {
    return {
        userA: {
            messages: [],
            language: undefined,
        },
        userB: {
            messages: [],
            language: undefined,
        },
    };
}
