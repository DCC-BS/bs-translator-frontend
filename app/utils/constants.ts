/**
 * Constants for translation behavior configuration
 */

/**
 * Debounce time in milliseconds before sending a translation request after user input
 */
export const TRANSLATION_DEBOUNCE_MS = 2000;

/**
 * Max-Age (seconds) for cookies that store a user preference (language, tone, domain,
 * glossary). Without this, useCookie defaults to a session cookie, so the browser
 * silently drops the preference - and the UI falls back to its hardcoded default
 * (e.g. target language back to "en-us") - as soon as the tab/browser is closed.
 */
export const PREFERENCE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
