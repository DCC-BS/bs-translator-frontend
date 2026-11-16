import type { LanguageCode } from "./languages";

/**
 * Progress of a translated message. Original messages have no status.
 */
export type TranslationStatus = "pending" | "translating" | "done" | "failed";

export type ConversationMessage = {
    id: string;
    role: "original" | "translated";
    content: string;
    status?: TranslationStatus;
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
