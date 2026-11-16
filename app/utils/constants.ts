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

/**
 * File types the backend's /convert endpoint accepts (documents via docling,
 * images via OCR). Used as the `accept` list of the file picker.
 */
export const CONVERTIBLE_FILE_ACCEPT = [
    ".pdf",
    ".docx",
    ".pptx",
    ".xlsx",
    ".html",
    ".md",
    ".adoc",
    ".csv",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".bmp",
    ".webp",
].join(",");

/**
 * Largest upload the reverse proxy lets through (nginx `client_max_body_size`).
 * Checked before uploading so the user gets a clear message instead of a 413.
 */
export const MAX_UPLOAD_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** localStorage key of the glossary (too large for a cookie). */
export const GLOSSARY_STORAGE_KEY = "glossary";
