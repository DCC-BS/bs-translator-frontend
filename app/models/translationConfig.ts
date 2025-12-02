import type { Domain } from "./domain";
import type { Tone } from "./tone";

/**
 * Configuration interface for translation parameters
 * Based on the Python Pydantic TranslationConfig model
 */
export interface TranslationConfig {
    /** Target language for translation */
    target_language: string;

    /** Source language (auto-detected if undefined) */
    source_language?: string;

    /** Domain or subject area for translation */
    domain?: Domain;

    /** Tone or style for translation */
    tone?: Tone;

    /** Custom glossary or terminology */
    glossary?: string;

    /** Additional context for translation */
    context?: string;
}

/**
 * Default translation configuration
 */
export const defaultTranslationConfig: TranslationConfig = {
    target_language: "en-us",
    source_language: undefined,
    domain: undefined,
    tone: undefined,
    glossary: undefined,
    context: undefined,
};
