export const tones = [
    "default",
    "informal",
    "formal",
    "technical",
    "concise",
] as const;

export type Tone = (typeof tones)[number];
