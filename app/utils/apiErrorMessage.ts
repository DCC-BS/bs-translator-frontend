type ErrorTranslator = {
    t: (key: string) => string;
    te: (key: string) => boolean;
};

/**
 * Resolves the user-facing message for an API error id.
 * Looks up `api_error.<scope>.<errorId>`, then `api_error.<errorId>`, and falls
 * back to the generic unexpected-error message, so a missing key never shows
 * up as a raw i18n key in the UI.
 * @param i18n - `t` and `te` from `useI18n()`
 * @param scope - Feature scope of the error, e.g. "translation" or "conversion"
 * @param errorId - The `errorId` of the ApiError
 */
export function apiErrorMessage(
    { t, te }: ErrorTranslator,
    scope: string,
    errorId: string,
): string {
    for (const key of [
        `api_error.${scope}.${errorId}`,
        `api_error.${errorId}`,
    ]) {
        if (te(key)) {
            return t(key);
        }
    }
    return t("api_error.unexpected_error");
}
