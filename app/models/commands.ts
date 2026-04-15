import type { ICommand } from "#build/types/commands";

export const Cmds = {
    TranscribeAudioCommand: "TranscribeAudioCommand",
    AppendConversationMessageCommand: "AppendConversationMessageCommand",
    SetConversationLanguageCommand: "SetConversationLanguageCommand",
};

export class TranscribeAudioCommand implements ICommand {
    readonly $type = "TranscribeAudioCommand";

    constructor(
        public readonly audioBlob: Blob,
        public readonly languageCode: string,
    ) {}
}

export class AppendConversationMessageCommand implements ICommand {
    readonly $type = "AppendConversationMessageCommand";

    constructor(
        public readonly conversationId: string,
        public readonly message: {
            id: string;
            role: "original" | "translated";
            content: string;
        },
        public readonly user: "userA" | "userB",
    ) {}
}

export class SetConversationLanguageCommand implements ICommand {
    readonly $type = "SetConversationLanguageCommand";

    constructor(
        public readonly conversationId: string,
        public readonly language: string,
        public readonly user: "userA" | "userB",
    ) {}
}
