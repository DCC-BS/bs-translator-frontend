import type { TranslationConfig } from "./translationConfig";

export type TranslationInput = {
    /** Text to be translated */
    text: string;
    /** Optional translation configuration parameters */
    config?: TranslationConfig;
};
